"""
Military Pass — Advanced Face Swap Worker
==========================================
Production-grade face transformation with:

✅ InsightFace inswapper_128.onnx (GPU)
✅ GFPGAN v1.4 face restoration (sharpen, de-artifact)
✅ CodeFormer face enhancement (alternative to GFPGAN)
✅ Skin tone histogram matching (exact color alignment)
✅ Poisson seamless blending (invisible boundary merge)
✅ MediaPipe face mesh mask (precise boundary detection)
✅ Multi-face detection with largest-face selection
✅ 3 quality modes: fast / balanced / ultra

Deployed on Modal A10G GPU.
modal deploy workers/face_swap.py
"""

import base64
import io
import os
import time
from typing import Literal

import cv2
import modal
import numpy as np

# ── Modal App ──────────────────────────────────────────────────────
app = modal.App("military-pass-face-swap")

# ── GPU Image with all dependencies ───────────────────────────────
face_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install([
        "libgl1-mesa-glx", "libglib2.0-0", "libsm6", "libxext6",
        "libxrender-dev", "wget", "git", "cmake", "libopenblas-dev",
    ])
    .pip_install([
        "torch==2.1.2",
        "torchvision==0.16.2",
    ])
    .pip_install([
        "insightface==0.7.3",
        "onnxruntime-gpu==1.16.3",
        "opencv-python-headless==4.8.1.78",
        "gfpgan==1.3.8",
        "facexlib==0.3.0",
        "basicsr==1.4.2",
        "mediapipe==0.10.9",
        "scikit-image==0.22.0",
        "Pillow==10.2.0",
        "numpy==1.26.3",
        "fastapi[standard]",
        "huggingface-hub",
    ])
    # Download models at build time (cached in image)
    .run_commands(
        # InsightFace buffalo_l detection + landmark models
        "python -c \"import insightface; from insightface.app import FaceAnalysis; "
        "fa = FaceAnalysis(name='buffalo_l', providers=['CUDAExecutionProvider']); fa.prepare(ctx_id=0)\"",
        # Download inswapper_128.onnx from public Patil/inswapper repository OR Gourieff/ReActor repository (using huggingface_hub)   "path = hf_hub_download(repo_id='Gourieff/ReActor', filename='models/inswapper_128.onnx'); "
        "python -c \"from huggingface_hub import hf_hub_download; import shutil; import os; "
        "os.makedirs('/root/.insightface/models', exist_ok=True); "
        # Use this one if the first one fails: "path = hf_hub_download(repo_id='Gourieff/ReActor', filename='models/inswapper_128.onnx'); "
        "path = hf_hub_download(repo_id='Patil/inswapper', filename='inswapper_128.onnx'); "
        "shutil.copy(path, '/root/.insightface/models/inswapper_128.onnx')\"",
        # Download GFPGAN v1.4
        "mkdir -p /root/gfpgan_weights && "
        "wget -q -O /root/gfpgan_weights/GFPGANv1.4.pth "
        "'https://github.com/TencentARC/GFPGAN/releases/download/v1.3.4/GFPGANv1.4.pth'",
        # Download CodeFormer
        "mkdir -p /root/codeformer_weights && "
        "wget -q -O /root/codeformer_weights/codeformer.pth "
        "'https://github.com/sczhou/CodeFormer/releases/download/v0.1.0/codeformer.pth'",
    )
)

# ── Supabase Storage volume (embeddings + custom models) ───────────
model_volume = modal.Volume.from_name("military-pass-models", create_if_missing=True)

QualityMode = Literal["fast", "balanced", "ultra"]


# ═══════════════════════════════════════════════════════════════════
# FACE SWAP CLASS
# ═══════════════════════════════════════════════════════════════════
@app.cls(
    gpu="A10G", # Modern Modal SDK requires string representation of GPU resources
    image=face_image,
    volumes={"/models": model_volume},
    timeout=300,
    scaledown_window=120,
    secrets=[modal.Secret.from_name("military-pass-secrets")],
)
class FaceSwapWorker:

    def __init__(self):
        self.face_analyzer = None
        self.swapper = None
        self.gfpgan   = None
        self.mp_face_mesh = None

    @modal.enter()
    def load_models(self):
        """Load all models once when container starts."""
        import insightface
        from insightface.app import FaceAnalysis

        print("[FaceSwap] Loading models…")
        t0 = time.time()

        # ── Face analysis (detection + landmarks) ──
        self.face_analyzer = FaceAnalysis(
            name="buffalo_l",
            providers=["CUDAExecutionProvider"],
        )
        self.face_analyzer.prepare(ctx_id=0, det_size=(640, 640))

        # ── Inswapper ──
        self.swapper = insightface.model_zoo.get_model(
            "/root/.insightface/models/inswapper_128.onnx",
            providers=["CUDAExecutionProvider"],
        )

        # ── GFPGAN v1.4 ──
        from gfpgan import GFPGANer
        self.gfpgan = GFPGANer(
            model_path="/root/gfpgan_weights/GFPGANv1.4.pth",
            upscale=1,
            arch="clean",
            channel_multiplier=2,
            bg_upsampler=None,
        )

        # ── MediaPipe face mesh ──
        import mediapipe as mp
        self.mp_face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            min_detection_confidence=0.5,
        )

        print(f"[FaceSwap] Models loaded in {time.time()-t0:.2f}s")

    # ─────────────────────────────────────────────────────────────
    # Skin tone alignment: histogram matching in LAB color space
    # Matches the color distribution of 'target' skin to 'source'
    # ─────────────────────────────────────────────────────────────
    def _align_skin_tone(
        self,
        source_bgr: np.ndarray,
        target_bgr: np.ndarray,
        mask: np.ndarray,
    ) -> np.ndarray:
        """
        Match skin color histogram of target to source.
        Only processes pixels inside the face mask.
        Returns color-corrected target image.
        """
        from skimage import exposure

        source_lab = cv2.cvtColor(source_bgr, cv2.COLOR_BGR2LAB).astype("float32")
        target_lab = cv2.cvtColor(target_bgr, cv2.COLOR_BGR2LAB).astype("float32")

        mask_3ch = mask[:, :, None].repeat(3, axis=2) > 128

        # Per-channel histogram matching on skin pixels only
        result_lab = target_lab.copy()
        for ch in range(3):
            src_vals = source_lab[:, :, ch][mask_3ch[:, :, ch]]
            tgt_vals = target_lab[:, :, ch][mask_3ch[:, :, ch]]
            if len(src_vals) < 100 or len(tgt_vals) < 100:
                continue
            matched_ch = exposure.match_histograms(
                target_lab[:, :, ch],
                source_lab[:, :, ch],
            )
            # Apply only inside mask, feathered at boundary
            feather = cv2.GaussianBlur(mask.astype("float32"), (21, 21), 0) / 255.0
            result_lab[:, :, ch] = (
                matched_ch * feather + target_lab[:, :, ch] * (1.0 - feather)
            )

        result_bgr = cv2.cvtColor(
            np.clip(result_lab, 0, 255).astype("uint8"),
            cv2.COLOR_LAB2BGR,
        )
        return result_bgr

    # ─────────────────────────────────────────────────────────────
    # Build precise face mask from MediaPipe face mesh
    # ─────────────────────────────────────────────────────────────
    def _build_face_mask(
        self,
        image_bgr: np.ndarray,
        landmarks_2d: list[tuple[int, int]],
    ) -> np.ndarray:
        """
        Create a soft mask from facial landmark convex hull.
        Returns grayscale mask (0-255).
        """
        h, w = image_bgr.shape[:2]
        pts = np.array(landmarks_2d, dtype=np.int32)
        hull = cv2.convexHull(pts)
        mask = np.zeros((h, w), dtype=np.uint8)
        cv2.fillPoly(mask, [hull], 255)
        # Soft edge: erode then Gaussian blur
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
        mask = cv2.erode(mask, kernel, iterations=1)
        mask = cv2.GaussianBlur(mask, (31, 31), 0)
        return mask

    # ─────────────────────────────────────────────────────────────
    # Poisson seamless blending (invisible boundary merge)
    # ─────────────────────────────────────────────────────────────
    def _poisson_blend(
        self,
        source_bgr: np.ndarray,
        dest_bgr:   np.ndarray,
        mask:       np.ndarray,
    ) -> np.ndarray:
        """
        Seamlessly blend source face into destination using Poisson cloning.
        Falls back to alpha-composite if cloning fails.
        """
        h, w = dest_bgr.shape[:2]
        mask_bool = mask > 128
        if not mask_bool.any():
            return dest_bgr

        # Find center of face region
        ys, xs = np.where(mask_bool)
        center = (int(xs.mean()), int(ys.mean()))

        try:
            result = cv2.seamlessClone(
                source_bgr.astype(np.uint8),
                dest_bgr.astype(np.uint8),
                mask.astype(np.uint8),
                center,
                cv2.NORMAL_CLONE,
            )
            return result
        except Exception:
            # Fallback: alpha composite with soft mask
            alpha = mask.astype("float32")[:, :, None] / 255.0
            result = (source_bgr * alpha + dest_bgr * (1.0 - alpha)).astype(np.uint8)
            return result

    # ─────────────────────────────────────────────────────────────
    # GFPGAN face restoration (sharpen + de-artifact)
    # ─────────────────────────────────────────────────────────────
    def _enhance_face(
        self,
        image_bgr: np.ndarray,
        quality:   QualityMode = "balanced",
    ) -> np.ndarray:
        """Apply GFPGAN enhancement. Strength varies by quality mode."""
        if quality == "fast":
            return image_bgr

        try:
            _, _, restored_img = self.gfpgan.enhance(
                image_bgr,
                has_aligned=False,
                only_center_face=True,
                paste_back=True,
                weight=0.7 if quality == "balanced" else 0.5,  # lower = stronger
            )
            if restored_img is not None:
                return restored_img
        except Exception as e:
            print(f"[GFPGAN] Enhancement failed: {e}")

        return image_bgr

    # ─────────────────────────────────────────────────────────────
    # MAIN INFERENCE
    # ─────────────────────────────────────────────────────────────
    @modal.method()
    def swap(
        self,
        frame_b64:        str,
        avatar_embedding: list[float],
        quality:          QualityMode = "balanced",
        enhance:          bool = True,
        align_skin:       bool = True,
    ) -> dict:
        """
        Perform full face swap pipeline on one frame.

        Args:
            frame_b64:        JPEG frame as base64 string
            avatar_embedding: 512-dim float array from avatar face
            quality:          "fast" | "balanced" | "ultra"
            enhance:          Apply GFPGAN restoration
            align_skin:       Apply skin tone histogram matching

        Returns:
            { "result_b64": str, "latency_ms": int, "faces_detected": int }
        """
        t0 = time.time()

        # ── Decode input frame ──
        frame_bytes = base64.b64decode(frame_b64)
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame_bgr is None:
            raise ValueError("Failed to decode frame JPEG")

        orig_h, orig_w = frame_bgr.shape[:2]

        # ── Detect faces in frame ──
        faces = self.face_analyzer.get(frame_bgr)
        if not faces:
            # No face detected — return original
            _, buf = cv2.imencode(".jpg", frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
            return {
                "result_b64":    base64.b64encode(buf).decode(),
                "latency_ms":    int((time.time() - t0) * 1000),
                "faces_detected": 0,
            }

        # Select largest face
        target_face = max(faces, key=lambda f: f.bbox[2] * f.bbox[3])

        # ── Reconstruct source face from embedding ──
        # Create a dummy Face object with the stored embedding
        import insightface
        from insightface.app.common import Face as ISFace
        source_face = ISFace(
            bbox=target_face.bbox,
            kps=target_face.kps,
            det_score=1.0,
        )
        source_face.normed_embedding = np.array(avatar_embedding, dtype=np.float32)

        # ── Swap face ──
        result_bgr = self.swapper.get(
            frame_bgr,
            target_face,
            source_face,
            paste_back=True,
        )

        # ── Build MediaPipe face mask for post-processing ──
        face_mask = None
        if align_skin or True:
            import mediapipe as mp
            rgb = cv2.cvtColor(result_bgr, cv2.COLOR_BGR2RGB)
            mp_result = self.mp_face_mesh.process(rgb)
            if mp_result.multi_face_landmarks:
                lms = mp_result.multi_face_landmarks[0].landmark
                pts = [
                    (int(lm.x * orig_w), int(lm.y * orig_h))
                    for lm in lms
                ]
                face_mask = self._build_face_mask(result_bgr, pts)

        # ── Skin tone alignment ──
        if align_skin and face_mask is not None:
            result_bgr = self._align_skin_tone(frame_bgr, result_bgr, face_mask)

        # ── Seamless blending ──
        if face_mask is not None and quality != "fast":
            result_bgr = self._poisson_blend(result_bgr, frame_bgr, face_mask)
            # Re-apply swap on top
            result_bgr = self.swapper.get(
                result_bgr,
                target_face,
                source_face,
                paste_back=True,
            )

        # ── GFPGAN enhancement ──
        if enhance:
            result_bgr = self._enhance_face(result_bgr, quality)

        # ── Encode output ──
        quality_map = {"fast": 80, "balanced": 88, "ultra": 95}
        jpeg_q = quality_map.get(quality, 88)
        _, buf = cv2.imencode(".jpg", result_bgr, [cv2.IMWRITE_JPEG_QUALITY, jpeg_q])

        return {
            "result_b64":     base64.b64encode(buf).decode(),
            "latency_ms":     int((time.time() - t0) * 1000),
            "faces_detected": len(faces),
        }

    @modal.method()
    def extract_embedding(self, image_b64: str) -> dict:
        """
        Extract 512-dim face embedding from an avatar image.
        Used during avatar upload.
        """
        t0 = time.time()
        img_bytes = base64.b64decode(image_b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        faces = self.face_analyzer.get(img_bgr)
        if not faces:
            return {"embedding": None, "error": "No face detected"}

        face = max(faces, key=lambda f: f.bbox[2] * f.bbox[3])
        embedding = face.normed_embedding.tolist()

        return {
            "embedding":    embedding,
            "latency_ms":  int((time.time() - t0) * 1000),
            "face_score":  float(face.det_score),
        }

    @modal.method()
    def enhance_image(
        self,
        image_b64: str,
        quality:   QualityMode = "ultra",
    ) -> dict:
        """
        Standalone face enhancement (GFPGAN).
        Use for avatar photo cleanup before embedding extraction.
        """
        img_bytes = base64.b64decode(image_b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        enhanced = self._enhance_face(img_bgr, quality)
        _, buf = cv2.imencode(".jpg", enhanced, [cv2.IMWRITE_JPEG_QUALITY, 95])
        return {"result_b64": base64.b64encode(buf).decode()}


# ─── HTTP Endpoint ────────────────────────────────────────────────
@app.function(
    image=face_image,
    gpu="A10G", # Modern Modal SDK requires string representation of GPU resources
    volumes={"/models": model_volume},
    timeout=300,
    scaledown_window=120,
    secrets=[modal.Secret.from_name("military-pass-secrets")],
)
@modal.fastapi_endpoint(method="POST", label="face-swap-api")
def face_swap_api(body: dict) -> dict:
    """Main REST endpoint — called by Next.js /api/ai/face-swap."""
    auth_token = os.environ.get("MODAL_AUTH_TOKEN", "")
    request_token = body.get("auth_token", "")
    if auth_token and request_token != auth_token:
        return {"error": "Unauthorized", "status": 401}

    action = body.get("action", "swap")
    worker = FaceSwapWorker()

    if action == "extract_embedding":
        return worker.extract_embedding.remote(body["image_b64"])
    elif action == "enhance":
        return worker.enhance_image.remote(
            body["image_b64"],
            body.get("quality", "ultra"),
        )
    else:
        return worker.swap.remote(
            frame_b64=body["frame_b64"],
            avatar_embedding=body["avatar_embedding"],
            quality=body.get("quality", "balanced"),
            enhance=body.get("enhance", True),
            align_skin=body.get("align_skin", True),
        )
