/**
 * Live Camera Stream Controller
 * Wraps getUserMedia lifecycle and frame capture for the in-app camera scanner.
 */

export class CameraController {
  constructor(videoElement) {
    this.videoElement = videoElement;
    this.stream = null;
  }

  get isActive() {
    return !!this.stream;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    if (this.videoElement) {
      this.videoElement.srcObject = this.stream;
    }
    return this.stream;
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  captureFrame() {
    if (!this.videoElement) return null;

    const canvas = document.createElement('canvas');
    const width = this.videoElement.videoWidth > 0 ? this.videoElement.videoWidth : (this.videoElement.clientWidth || 1280);
    const height = this.videoElement.videoHeight > 0 ? this.videoElement.videoHeight : (this.videoElement.clientHeight || 720);
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(this.videoElement, 0, 0, width, height);
    return canvas;
  }
}
