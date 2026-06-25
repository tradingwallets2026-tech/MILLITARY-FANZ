/**
 * Military Pass — WebRTC Utilities
 * ==================================
 * Manages peer connections for optional live streaming output.
 * Used in Phase 4B to send the transformed stream to a viewer.
 *
 * Phase 4A: Only local virtual camera output (captureStream).
 * Phase 4B: Peer-to-peer streaming via ICE/STUN/TURN.
 */

export type RTCConfig = {
  iceServers?: RTCIceServer[];
  onConnectionState?: (state: RTCPeerConnectionState) => void;
  onError?: (err: Error) => void;
};

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // Add TURN server here for production (Twilio, Metered.ca, etc.)
];

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private config: RTCConfig;

  constructor(config: RTCConfig = {}) {
    this.config = config;
  }

  /** Initialize a peer connection and add the transformed media stream */
  async initSender(stream: MediaStream): Promise<RTCPeerConnection> {
    this.pc = new RTCPeerConnection({
      iceServers: this.config.iceServers ?? DEFAULT_ICE_SERVERS,
    });

    // Add all tracks from the transformed output stream
    stream.getTracks().forEach((track) => {
      this.pc!.addTrack(track, stream);
    });

    this.pc.onconnectionstatechange = () => {
      this.config.onConnectionState?.(this.pc!.connectionState);
    };

    this.pc.onicecandidateerror = (e) => {
      console.warn("[WebRTC] ICE candidate error:", e);
    };

    return this.pc;
  }

  /** Create an SDP offer for the sender */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error("RTCPeerConnection not initialized");
    const offer = await this.pc.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    });
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  /** Accept remote SDP answer */
  async setAnswer(answer: RTCSessionDescriptionInit) {
    await this.pc?.setRemoteDescription(new RTCSessionDescription(answer));
  }

  /** Add ICE candidate from signaling server */
  async addIceCandidate(candidate: RTCIceCandidateInit) {
    await this.pc?.addIceCandidate(new RTCIceCandidate(candidate));
  }

  /** Get ICE candidates as they arrive */
  onIceCandidate(handler: (candidate: RTCIceCandidate | null) => void) {
    if (this.pc) this.pc.onicecandidate = (e) => handler(e.candidate);
  }

  /** Gracefully close the peer connection */
  close() {
    this.pc?.close();
    this.pc = null;
  }

  get connectionState(): RTCPeerConnectionState | null {
    return this.pc?.connectionState ?? null;
  }
}

/** Capture a canvas stream for virtual camera output */
export function captureCanvasStream(
  canvas: HTMLCanvasElement,
  fps: number = 30
): MediaStream {
  return canvas.captureStream(fps);
}

/** Merge video and audio streams into one */
export function mergeStreams(
  videoStream: MediaStream,
  audioStream: MediaStream | null
): MediaStream {
  const combined = new MediaStream();
  videoStream.getVideoTracks().forEach((t) => combined.addTrack(t));
  audioStream?.getAudioTracks().forEach((t) => combined.addTrack(t));
  return combined;
}
