/**
 * @fileoverview Zero-GC pooled particle system for sparse Neo-Edo rain, drifting petals,
 * ink-dissolve wisps, landing dust, and acoustic sound-wave rings.
 */

import { Pool } from '../core/Pool.js';
import { PALETTE } from '../theme.js';

export class ParticleSystem {
  constructor() {
    this.pool = new Pool(
      () => ({
        kind: 'dust', // 'dust' | 'ink' | 'spark' | 'ring'
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 0.1,
        color: PALETTE.cyan
      }),
      (p) => {
        p.life = 0;
      },
      180
    );

    // Fixed ambient weather arrays (never reallocated)
    this.rainDrops = Array.from({ length: 28 }, (_, i) => ({
      x: (i * 37) % 100,
      y: (i * 19) % 100,
      speed: 14 + (i % 5) * 2
    }));

    this.petals = Array.from({ length: 14 }, (_, i) => ({
      x: (i * 53) % 100,
      y: (i * 29) % 100,
      phase: i * 1.1,
      speedX: -1.4 - (i % 3) * 0.4,
      speedY: 0.7 + (i % 4) * 0.2
    }));
  }

  /**
   * Spawn a burst of ink or dust particles at world coordinates (wx, wy).
   */
  spawnBurst(wx, wy, count = 12, kind = 'ink', color = PALETTE.cyan) {
    for (let i = 0; i < count; i++) {
      const p = this.pool.acquire();
      const ang = (i / count) * Math.PI * 2 + (Math.random() * 0.5 - 0.25);
      const spd = 0.8 + Math.random() * 2.6;
      p.kind = kind;
      p.x = wx;
      p.y = wy;
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd - 0.6;
      p.life = 0;
      p.maxLife = 0.35 + Math.random() * 0.35;
      p.size = 0.05 + Math.random() * 0.06;
      p.color = color;
    }
  }

  /**
   * Spawn an expanding acoustic ripple ring when noise is emitted.
   */
  spawnSoundRing(wx, wy, radiusTiles) {
    const p = this.pool.acquire();
    p.kind = 'ring';
    p.x = wx;
    p.y = wy;
    p.vx = 0;
    p.vy = 0;
    p.life = 0;
    p.maxLife = 0.55;
    p.size = radiusTiles;
    p.color = 'rgba(61, 242, 255, 0.38)';
  }

  update(dt) {
    for (let i = this.pool.activeCount - 1; i >= 0; i--) {
      const p = this.pool.items[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.pool.releaseAt(i);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx, camera, screenW, screenH, clockSec) {
    const S = camera.tileScale;
    ctx.save();

    // 1. Rare thin diagonal rain lines
    ctx.strokeStyle = 'rgba(143, 163, 199, 0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < this.rainDrops.length; i++) {
      const r = this.rainDrops[i];
      const rx = (((r.x * 18 - clockSec * 65 - camera.x * 22) % screenW) + screenW) % screenW;
      const ry = ((r.y * 12 + clockSec * r.speed * 28) % screenH);
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 6, ry + 22);
    }
    ctx.stroke();

    // 2. Sparse drifting sakura petals
    ctx.fillStyle = 'rgba(232, 226, 207, 0.42)';
    for (let i = 0; i < this.petals.length; i++) {
      const pt = this.petals[i];
      const px = (((pt.x * 16 + clockSec * pt.speedX * 18 - camera.x * 28) % screenW) + screenW) % screenW;
      const py = (((pt.y * 10 + clockSec * pt.speedY * 22 + Math.sin(clockSec * 2 + pt.phase) * 14) % screenH) + screenH) % screenH;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(clockSec * 1.5 + pt.phase);
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.quadraticCurveTo(0, -3, 4, 0);
      ctx.quadraticCurveTo(0, 3, -4, 0);
      ctx.fill();
      ctx.restore();
    }

    // 3. Active pooled gameplay particles & acoustic sound rings
    for (let i = 0; i < this.pool.activeCount; i++) {
      const p = this.pool.items[i];
      const t = p.life / p.maxLife;
      const sx = camera.worldToScreenX(p.x);
      const sy = camera.worldToScreenY(p.y);

      if (p.kind === 'ring') {
        ctx.globalAlpha = 1;
        const curR = p.size * S * (0.15 + t * 0.85);
        ctx.strokeStyle = `rgba(61, 242, 255, ${(1 - t) * 0.35})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, curR, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.globalAlpha = (1 - t) * (p.kind === 'dust' ? 0.38 : 0.78);
        ctx.fillStyle = p.color;
        const r = p.size * S * (1 - t * 0.5);
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1.2, r * 0.65), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
