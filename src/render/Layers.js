/**
 * @fileoverview Pre-baked parallax background & foreground silhouette canvases cached at load:
 * 1. Sky gradient + pale moon haze
 * 2. Far skyline (low-contrast blue-violet towers)
 * 3. Mid skyline with sparse lit windows & neon kanji signs
 * 4. Near rooftop buildings & water tanks
 * 5. Foreground silhouettes (cables, antennas, hanging banners)
 */

import { PALETTE } from '../theme.js';
import { Rng } from '../core/Rng.js';

export class ParallaxLayers {
  constructor() {
    this.skyCanvas = document.createElement('canvas');
    this.farCanvas = document.createElement('canvas');
    this.midCanvas = document.createElement('canvas');
    this.nearCanvas = document.createElement('canvas');
    this.fgCanvas = document.createElement('canvas');
    this.baked = false;
  }

  bakeAll() {
    if (this.baked) return;
    this.bakeSky(640, 360);
    this.bakeFarSkyline(640, 360);
    this.bakeMidSkyline(640, 360);
    this.bakeNearBuildings(640, 360);
    this.bakeForegroundCables(640, 360);
    this.baked = true;
  }

  bakeSky(w, h) {
    this.skyCanvas.width = w;
    this.skyCanvas.height = h;
    const ctx = this.skyCanvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, PALETTE.ink);
    grad.addColorStop(0.52, PALETTE.night);
    grad.addColorStop(1, PALETTE.indigo);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Moon haze
    const mx = w * 0.72;
    const my = h * 0.24;
    const haze = ctx.createRadialGradient(mx, my, 18, mx, my, 190);
    haze.addColorStop(0, 'rgba(232, 226, 207, 0.35)');
    haze.addColorStop(0.35, 'rgba(143, 163, 199, 0.12)');
    haze.addColorStop(1, 'rgba(20, 26, 51, 0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, w, h);

    // Pale moon disc
    ctx.fillStyle = PALETTE.moon;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(mx, my, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  bakeFarSkyline(w, h) {
    this.farCanvas.width = w;
    this.farCanvas.height = h;
    const ctx = this.farCanvas.getContext('2d');
    if (!ctx) return;

    const rng = new Rng(101);
    ctx.fillStyle = '#0d1428';
    let x = 0;
    while (x < w) {
      const bw = rng.int(48, 110);
      const bh = rng.int(140, 340);
      ctx.fillRect(x, h - bh, bw - 4, bh);
      // Spire
      if (rng.next() > 0.55) {
        ctx.fillRect(x + bw * 0.45, h - bh - 38, 3, 38);
      }
      x += bw;
    }
  }

  bakeMidSkyline(w, h) {
    this.midCanvas.width = w;
    this.midCanvas.height = h;
    const ctx = this.midCanvas.getContext('2d');
    if (!ctx) return;

    const rng = new Rng(202);
    let x = 0;
    while (x < w) {
      const bw = rng.int(64, 130);
      const bh = rng.int(110, 260);
      const topY = h - bh;

      ctx.fillStyle = '#080c19';
      ctx.fillRect(x, topY, bw - 8, bh);

      // Thin rim highlight on top roof edge
      ctx.fillStyle = 'rgba(143, 163, 199, 0.22)';
      ctx.fillRect(x, topY, bw - 8, 2);

      // Sparse warm/cyan lit windows
      for (let wy = topY + 18; wy < h - 24; wy += 18) {
        for (let wx = x + 10; wx < x + bw - 22; wx += 16) {
          const r = rng.next();
          if (r < 0.12) {
            ctx.fillStyle = r < 0.03 ? 'rgba(61, 242, 255, 0.38)' : 'rgba(255, 177, 74, 0.35)';
            ctx.fillRect(wx, wy, 7, 4);
          }
        }
      }
      x += bw;
    }
  }

  bakeNearBuildings(w, h) {
    this.nearCanvas.width = w;
    this.nearCanvas.height = h;
    const ctx = this.nearCanvas.getContext('2d');
    if (!ctx) return;

    const rng = new Rng(303);
    let x = 0;
    while (x < w) {
      const bw = rng.int(90, 170);
      const bh = rng.int(70, 165);
      const topY = h - bh;
      ctx.fillStyle = '#060913';
      ctx.fillRect(x, topY, bw - 14, bh);

      // Rooftop water tank or AC unit silhouette
      if (rng.next() > 0.45) {
        ctx.fillRect(x + 16, topY - 24, 28, 20);
        ctx.fillRect(x + 20, topY - 4, 3, 4);
        ctx.fillRect(x + 38, topY - 4, 3, 4);
      }
      x += bw;
    }
  }

  bakeForegroundCables(w, h) {
    this.fgCanvas.width = w;
    this.fgCanvas.height = h;
    const ctx = this.fgCanvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = 'rgba(5, 7, 13, 0.85)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 35 + i * 24);
      ctx.quadraticCurveTo(w * 0.5, 95 + i * 32, w, 28 + i * 22);
      ctx.stroke();
    }
  }

  /**
   * Draw the background parallax stack (Sky, Far, Mid, Near).
   */
  drawBackground(ctx, screenW, screenH, cameraX) {
    if (!this.baked) this.bakeAll();

    // 1. Sky + Moon (static / very slow)
    ctx.drawImage(this.skyCanvas, 0, 0, screenW, screenH);

    // 2. Far skyline (speed 0.12)
    this.drawTiledLayer(ctx, this.farCanvas, screenW, screenH, cameraX * 14);

    // 3. Mid skyline (speed 0.28)
    this.drawTiledLayer(ctx, this.midCanvas, screenW, screenH, cameraX * 32);

    // 4. Near buildings (speed 0.50)
    this.drawTiledLayer(ctx, this.nearCanvas, screenW, screenH, cameraX * 56);
  }

  /**
   * Draw foreground silhouette cables (speed 1.25).
   */
  drawForeground(ctx, screenW, screenH, cameraX) {
    if (!this.baked) this.bakeAll();
    this.drawTiledLayer(ctx, this.fgCanvas, screenW, screenH, cameraX * 115);
  }

  drawTiledLayer(ctx, layerCanvas, screenW, screenH, scrollPx) {
    const lw = layerCanvas.width;
    const offset = ((scrollPx % lw) + lw) % lw;
    for (let x = -offset; x < screenW + lw; x += lw) {
      ctx.drawImage(layerCanvas, x, 0, lw, screenH);
    }
  }
}
