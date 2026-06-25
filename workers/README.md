# Military Pass — Workers Deployment Guide
# ==========================================
# All workers run on Modal A10G GPU.
# Deploy once, call via REST from Next.js.

## Prerequisites

```bash
pip install modal
modal token new      # authenticate with your Modal account
modal secret create military-pass-secrets \
  MODAL_AUTH_TOKEN=your-secret-token-here \
  SUPABASE_URL=https://xxx.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=eyJxxx
```

## Deploy Workers

```bash
# 1. Deploy face swap (includes GFPGAN + skin alignment)
modal deploy workers/face_swap.py
# → Copy the printed URL: https://YOUR_WORKSPACE--military-pass-face-swap-face-swap-api.modal.run

# 2. Deploy voice transformer + trainer
modal deploy workers/voice_transform.py
# → Real-time endpoint: https://YOUR_WORKSPACE--military-pass-voice-voice-api.modal.run
# → Training endpoint:  https://YOUR_WORKSPACE--military-pass-voice-voice-train-api.modal.run
```

## Add URLs to .env.local

```env
MODAL_AUTH_TOKEN=your-secret-token-here
MODAL_FACE_SWAP_URL=https://YOUR_WORKSPACE--military-pass-face-swap-face-swap-api.modal.run
MODAL_VOICE_URL=https://YOUR_WORKSPACE--military-pass-voice-voice-api.modal.run
MODAL_VOICE_TRAIN_URL=https://YOUR_WORKSPACE--military-pass-voice-voice-train-api.modal.run
```

## Test Workers

```bash
# Test face swap
curl -X POST $MODAL_FACE_SWAP_URL \
  -H "Content-Type: application/json" \
  -d '{"auth_token":"your-token","action":"extract_embedding","image_b64":"..."}'

# Check AI worker status
curl https://your-app.vercel.app/api/ai/status
```

## Face Swap Pipeline (Technical)

```
JPEG frame (b64)
  → InsightFace detection (buffalo_l, 640×640)
  → Select largest face
  → inswapper_128.onnx (CUDA) → face swap
  → MediaPipe face mesh → 468-point mask
  → LAB histogram matching → skin tone alignment
  → Poisson seamless clone → invisible boundary
  → GFPGAN v1.4 → face restoration
  → JPEG encode (quality=80/88/95 by mode)
```

### Quality Modes

| Mode | Latency | Operations |
|------|---------|-----------|
| fast | ~30ms | Face swap only |
| balanced | ~80ms | Swap + skin align + GFPGAN (weight=0.7) |
| ultra | ~160ms | Swap + skin align + Poisson + GFPGAN (weight=0.5) |

## Voice Training Pipeline (Technical)

```
Audio files (WAV/MP3, up to 10 × 50MB)
  → torchaudio.load() + resample to 16kHz mono
  → HuBERT base (facebook/hubert-base-ls960)
  → 768-dim feature vectors per 20ms frame
  → FAISS L2 flat index (or IVF256 for >10k vectors)
  → Save: /models/{model_id}/index.faiss + embeddings.npy
  → Update voice_models DB record: status=ready
```

### Training Time on A10G

| Audio Length | Approximate Time |
|-------------|-----------------|
| 1 minute | ~2 minutes |
| 5 minutes | ~5 minutes |
| 30 minutes | ~15 minutes |

## Voice Inference (RVC) Pipeline

```
PCM float32 (200ms @ 16kHz)
  → WORLD vocoder: pitch/formant/speed shift
  → HuBERT features (optional, for custom model)
  → FAISS k-NN retrieval (k=8 training frames)
  → Inverse-distance weighted blend
  → Re-synthesize with shifted WORLD params
  → Float32 PCM out
```

## Volume Management

```bash
# List stored voice models
modal volume ls military-pass-voice-models

# Inspect a specific model
modal volume ls military-pass-voice-models /model-uuid/

# Delete a model (free storage)
modal volume rm military-pass-voice-models /model-uuid/
```
