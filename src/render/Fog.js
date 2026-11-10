/**
 * @fileoverview Pre-baked drifting fog layers (alpha 0.08 - 0.25, denser near the ground) and faint light shafts.
 */

export class FogSystem {
  constructor() {
    this.fogSprite = this.createFogSprite(512, 256);
    this.shaftSprite = this.createLightShaftSprite(160, 380);
    this.bands = [
      { speed: 14, yRatio: 0.56, heightRatio: 0.44, alpha: 0.09, offset: 0 },
      { speed: 26, yRatio: 0.68, heightRatio: 0.36, alpha: 0.15, offset: 180 },
      { speed: 42, yRatio: 0.78, heightRatio: 0.26, alpha: 0.22, offset: 340 }
    ];
  }

  createFogSprite(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (ctx) {
      // Seamless horizontal soft cloud puffs denser near bottom
      const vGrad = ctx.createLinearGradient(0, 0, 0, h);
      vGrad.addColorStop(0, 'rgba(143, 163, 199, 0)');
      vGrad.addColorStop(0.55, 'rgba(143, 163, 199, 0.48)');
      vGrad.addColorStop(0.88, 'rgba(143, 163, 199, 0.85)');
      vGrad.addColorStop(1, 'rgba(143, 163, 199, 0.25)');
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, w, h);

      // Soften with radial puffs
      ctx.globalCompositeOperation = 'destination-in';
      const puffs = [
        { x: w * 0.25, y: h * 0.65, r: w * 0.32 },
        { x: w * 0.55, y: h * 0.60, r: w * 0.36 },
        { x: w * 0.82, y: h * 0.68, r: w * 0.28 },
        { x: 0, y: h * 0.65, r: w * 0.26 },
        { x: w, y: h * 0.65, r: w * 0.26 }
      ];
      const mask = document.createElement('canvas');
      mask.width = w;
      mask.height = h;
      const mCtx = mask.getContext('2d');
      if (mCtx) {
        for (const p of puffs) {
          const rg = mCtx.createRadialGradient(p.x, p.y, 4, p.x, p.y, p.r);
          rg.addColorStop(0, 'rgba(255,255,255,1)');
          rg.addColorStop(1, 'rgba(255,255,255,0.25)');
          mCtx.fillStyle = rg;
          mCtx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(mask, 0, 0);
      }
    }
    return c;
  }

  createLightShaftSprite(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, w * 0.4, h);
      grad.addColorStop(0, 'rgba(143, 163, 199, 0.14)');
      grad.addColorStop(0.6, 'rgba(143, 163, 199, 0.05)');
      grad.addColorStop(1, 'rgba(143, 163, 199, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(w * 0.2, 0);
      ctx.lineTo(w * 0.7, 0);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
    }
    return c;
  }

  /**
   * Draw drifting fog layers and faint diagonal light shafts.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} screenW
   * @param {number} screenH
   * @param {number} cameraX
   * @param {number} clockSec
   * @param {number} [densityMultiplier=1]
   */
  draw(ctx, screenW, screenH, cameraX, clockSec, densityMultiplier = 1) {
    if (densityMultiplier <= 0.01) return;

    ctx.save();
    // Faint atmospheric light shafts
    ctx.globalAlpha = 0.45 * densityMultiplier;
    for (let i = 0; i < 3; i++) {
      const sx = ((i * 420 - cameraX * 18) % (screenW + 300)) - 100;
      ctx.drawImage(this.shaftSprite, sx, 0, screenW * 0.18, screenH * 0.85);
    }

    // Drifting ground fog bands
    const tileW = Math.max(480, screenW * 0.65);
    for (const band of this.bands) {
      const scroll = ((clockSec * band.speed + cameraX * band.speed * 1.4 + band.offset) % tileW + tileW) % tileW;
      const y = screenH * band.yRatio;
      const h = screenH * band.heightRatio;
      ctx.globalAlpha = Math.min(0.35, band.alpha * densityMultiplier);

      for (let x = -scroll; x < screenW + tileW; x += tileW) {
        ctx.drawImage(this.fogSprite, x, y, tileW, h);
      }
    }
    ctx.restore();
  }
}
