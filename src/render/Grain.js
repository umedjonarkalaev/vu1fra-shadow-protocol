/**
 * @fileoverview Pre-rendered film grain (shifted at 12 fps), cached soft vignette,
 * letterbox bars, and alert crimson pulse / chromatic split (respecting reduceMotion).
 */

export class GrainSystem {
  constructor() {
    this.tileSize = 128;
    this.noiseCanvas = this.createNoiseTile(this.tileSize);
    this.vignetteCanvas = document.createElement('canvas');
    this.lastShiftStep = -1;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  createNoiseTile(size) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    if (ctx) {
      const img = ctx.createImageData(size, size);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() > 0.5 ? 255 : 0;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
        d[i + 3] = 9; // Subtle film grain alpha
      }
      ctx.putImageData(img, 0, 0);
    }
    return c;
  }

  ensureVignette() {
    const vw = 256;
    const vh = 144;
    if (this.vignetteCanvas.width === vw && this.vignetteCanvas.height === vh) return;
    this.vignetteCanvas.width = vw;
    this.vignetteCanvas.height = vh;
    const ctx = this.vignetteCanvas.getContext('2d');
    if (!ctx) return;

    const cx = vw * 0.5;
    const cy = vh * 0.5;
    const rOuter = Math.hypot(cx, cy);
    const grad = ctx.createRadialGradient(cx, cy, rOuter * 0.45, cx, cy, rOuter);
    grad.addColorStop(0, 'rgba(5, 7, 13, 0)');
    grad.addColorStop(0.75, 'rgba(5, 7, 13, 0.28)');
    grad.addColorStop(1, 'rgba(5, 7, 13, 0.72)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vw, vh);
  }

  /**
   * Draw film grain, soft vignette, and optional alert crimson pulse.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} w
   * @param {number} h
   * @param {number} clockSec
   * @param {boolean} enableGrain
   * @param {number} alertPulse in [0, 1]
   * @param {boolean} reduceMotion
   */
  draw(ctx, w, h, clockSec, enableGrain = true, alertPulse = 0, reduceMotion = false) {
    this.ensureVignette();

    ctx.save();
    // 1. Soft vignette
    ctx.drawImage(this.vignetteCanvas, 0, 0, w, h);

    // 2. Cheap film grain shifted at 12 fps using a single repeated CanvasPattern
    if (enableGrain && !reduceMotion) {
      const step = Math.floor(clockSec * 12);
      if (step !== this.lastShiftStep) {
        this.lastShiftStep = step;
        this.offsetX = (step * 37) % this.tileSize;
        this.offsetY = (step * 59) % this.tileSize;
      }
      if (!this.noisePattern) {
        this.noisePattern = ctx.createPattern(this.noiseCanvas, 'repeat');
      }
      if (this.noisePattern) {
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.fillStyle = this.noisePattern;
        ctx.fillRect(-this.offsetX, -this.offsetY, w, h);
        ctx.restore();
      }
    }

    // 3. Alert crimson vignette & edge pulse
    if (alertPulse > 0.01) {
      const alpha = Math.min(0.48, alertPulse * 0.45);
      ctx.strokeStyle = `rgba(255, 59, 78, ${alpha})`;
      ctx.lineWidth = Math.max(8, w * 0.025);
      ctx.strokeRect(0, 0, w, h);

      if (!reduceMotion && alertPulse > 0.25) {
        // Subtle horizontal chromatic-split scanline accent
        ctx.fillStyle = `rgba(61, 242, 255, ${alertPulse * 0.12})`;
        ctx.fillRect(0, (clockSec * 240) % h, w, 3);
      }
    }

    ctx.restore();
  }
}
