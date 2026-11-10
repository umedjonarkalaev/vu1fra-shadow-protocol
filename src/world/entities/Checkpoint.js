/**
 * @fileoverview Level checkpoint marker (Shadow Shrine lantern/seal) saving respawn position.
 */

import { PALETTE } from '../../theme.js';

export class Checkpoint {
  /**
   * @param {{
   *   id: string,
   *   x: number,
   *   y: number
   * }} def
   */
  constructor(def) {
    this.id = def.id;
    this.x = def.x;
    this.y = def.y;
    this.active = false;
  }

  draw(ctx, screenX, screenY, S, clockSec = 0) {
    ctx.save();
    ctx.translate(screenX, screenY);

    // Stone pillar shrine silhouette
    ctx.fillStyle = PALETTE.ink;
    ctx.strokeStyle = this.active ? PALETTE.cyan : 'rgba(143, 163, 199, 0.35)';
    ctx.lineWidth = Math.max(1.2, S * 0.025);

    ctx.fillRect(-S * 0.16, -S * 1.05, S * 0.32, S * 1.05);
    ctx.strokeRect(-S * 0.16, -S * 1.05, S * 0.32, S * 1.05);

    // Roof cap
    ctx.beginPath();
    ctx.moveTo(-S * 0.28, -S * 1.05);
    ctx.lineTo(0, -S * 1.28);
    ctx.lineTo(S * 0.28, -S * 1.05);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing core seal
    const pulse = 0.6 + Math.sin(clockSec * 3.5) * 0.25;
    ctx.fillStyle = this.active
      ? `rgba(61, 242, 255, ${pulse})`
      : 'rgba(143, 163, 199, 0.25)';
    ctx.fillRect(-S * 0.06, -S * 0.82, S * 0.12, S * 0.32);

    ctx.restore();
  }
}
