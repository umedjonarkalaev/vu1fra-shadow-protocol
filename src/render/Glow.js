/**
 * @fileoverview Pre-rendered radial-gradient glow sprites and 1/4-res bilinear bloom buffer.
 * Zero ctx.filter, zero shadowBlur, and zero per-frame gradient allocations.
 */

export class GlowSystem {
  constructor() {
    /** @type {Map<string, HTMLCanvasElement>} */
    this.sprites = new Map();
    this.bloomCanvas = document.createElement('canvas');
    this.bloomCtx = this.bloomCanvas.getContext('2d');
    this.prebakeSprites();
  }

  prebakeSprites() {
    const definitions = [
      { key: 'cyan', r: 61, g: 242, b: 255 },
      { key: 'amber', r: 255, g: 177, b: 74 },
      { key: 'crimson', r: 255, g: 59, b: 78 },
      { key: 'moon', r: 232, g: 226, b: 207 }
    ];

    const size = 128;
    const half = size / 2;

    for (const def of definitions) {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');
      if (ctx) {
        const grad = ctx.createRadialGradient(half, half, 2, half, half, half);
        grad.addColorStop(0, `rgba(${def.r}, ${def.g}, ${def.b}, 0.85)`);
        grad.addColorStop(0.35, `rgba(${def.r}, ${def.g}, ${def.b}, 0.32)`);
        grad.addColorStop(1, `rgba(${def.r}, ${def.g}, ${def.b}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
      }
      this.sprites.set(def.key, c);
    }
  }

  /**
   * Draw an additive radial glow sprite centered at (x, y) with radius.
   * @param {CanvasRenderingContext2D} ctx
   * @param {'cyan'|'amber'|'crimson'|'moon'} colorKey
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @param {number} [alpha=1]
   */
  drawGlow(ctx, colorKey, x, y, radius, alpha = 1) {
    const sprite = this.sprites.get(colorKey);
    if (!sprite || radius <= 0 || alpha <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  /**
   * Perform cheap 1/4-resolution downsample/upsample bloom composite.
   * @param {CanvasRenderingContext2D} mainCtx
   * @param {HTMLCanvasElement} mainCanvas
   * @param {number} intensity
   */
  applyQuarterResBloom(mainCtx, mainCanvas, intensity = 0.22) {
    if (!this.bloomCtx || mainCanvas.width < 16 || mainCanvas.height < 16) return;
    const bw = Math.max(4, Math.floor(mainCanvas.width * 0.25));
    const bh = Math.max(4, Math.floor(mainCanvas.height * 0.25));
    if (this.bloomCanvas.width !== bw || this.bloomCanvas.height !== bh) {
      this.bloomCanvas.width = bw;
      this.bloomCanvas.height = bh;
    }

    this.bloomCtx.clearRect(0, 0, bw, bh);
    this.bloomCtx.imageSmoothingEnabled = true;
    this.bloomCtx.drawImage(mainCanvas, 0, 0, bw, bh);

    mainCtx.save();
    mainCtx.globalCompositeOperation = 'lighter';
    mainCtx.globalAlpha = intensity;
    mainCtx.imageSmoothingEnabled = true;
    mainCtx.drawImage(this.bloomCanvas, 0, 0, mainCanvas.width, mainCanvas.height);
    mainCtx.restore();
  }
}
