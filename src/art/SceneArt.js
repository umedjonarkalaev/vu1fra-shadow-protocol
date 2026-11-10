/**
 * @fileoverview Procedural Neo-Edo architectural elements (torii gates, paper lanterns,
 * hanging banners, corporate server racks, holographic terminals, foreground cables).
 */

import { PALETTE } from '../theme.js';

export class SceneArt {
  /**
   * Draw a traditional rooftop Torii gate silhouette with rim light.
   */
  static drawTorii(ctx, x, y, S) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = PALETTE.ink;
    ctx.strokeStyle = 'rgba(196, 22, 28, 0.48)';
    ctx.lineWidth = Math.max(1.5, S * 0.03);

    // Two pillars
    ctx.fillRect(-S * 1.1, -S * 3.1, S * 0.22, S * 3.1);
    ctx.fillRect(S * 0.88, -S * 3.1, S * 0.22, S * 3.1);

    // Top curved kasagi lintel
    ctx.beginPath();
    ctx.moveTo(-S * 1.65, -S * 3.25);
    ctx.quadraticCurveTo(0, -S * 3.02, S * 1.65, -S * 3.25);
    ctx.lineTo(S * 1.52, -S * 2.95);
    ctx.quadraticCurveTo(0, -S * 2.82, -S * 1.52, -S * 2.95);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Lower貫 (nuki) crossbeam
    ctx.fillRect(-S * 1.35, -S * 2.45, S * 2.7, S * 0.18);
    ctx.restore();
  }

  /**
   * Draw a warm glowing paper lantern (chochin).
   */
  static drawLantern(ctx, x, y, S, clock = 0) {
    const sway = Math.sin(clock * 1.8 + x * 0.02) * S * 0.04;
    ctx.save();
    ctx.translate(x + sway, y);

    // Cord
    ctx.strokeStyle = PALETTE.fog;
    ctx.lineWidth = Math.max(1, S * 0.02);
    ctx.beginPath();
    ctx.moveTo(-sway, -S * 0.45);
    ctx.lineTo(0, -S * 0.18);
    ctx.stroke();

    // Warm lantern body
    ctx.fillStyle = PALETTE.amber;
    ctx.beginPath();
    ctx.moveTo(-S * 0.14, -S * 0.18);
    ctx.bezierCurveTo(-S * 0.24, -S * 0.05, -S * 0.24, S * 0.18, -S * 0.14, S * 0.28);
    ctx.lineTo(S * 0.14, S * 0.28);
    ctx.bezierCurveTo(S * 0.24, S * 0.18, S * 0.24, -S * 0.05, S * 0.14, -S * 0.18);
    ctx.closePath();
    ctx.fill();

    // Caps
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(-S * 0.15, -S * 0.21, S * 0.30, S * 0.05);
    ctx.fillRect(-S * 0.13, S * 0.26, S * 0.26, S * 0.05);
    ctx.restore();
  }

  /**
   * Draw an interactive hacking terminal with glowing cyan holo-screen.
   */
  static drawTerminal(ctx, x, y, S, solved = false, clock = 0) {
    ctx.save();
    ctx.translate(x, y);

    // Pedestal base
    ctx.fillStyle = PALETTE.ink;
    ctx.strokeStyle = solved ? 'rgba(143, 163, 199, 0.35)' : PALETTE.cyan;
    ctx.lineWidth = Math.max(1.4, S * 0.03);

    ctx.beginPath();
    ctx.moveTo(-S * 0.34, 0);
    ctx.lineTo(-S * 0.24, -S * 1.15);
    ctx.lineTo(S * 0.26, -S * 1.25);
    ctx.lineTo(S * 0.34, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Floating holographic monitor panel
    const pulse = 0.65 + Math.sin(clock * 4.2) * 0.2;
    ctx.fillStyle = solved ? 'rgba(20, 26, 51, 0.7)' : `rgba(61, 242, 255, ${0.18 * pulse})`;
    ctx.strokeStyle = solved ? PALETTE.fog : PALETTE.cyan;
    ctx.strokeRect(-S * 0.32, -S * 1.55, S * 0.64, S * 0.42);
    ctx.fillRect(-S * 0.32, -S * 1.55, S * 0.64, S * 0.42);

    // Terminal scan bars
    ctx.fillStyle = solved ? PALETTE.fog : PALETTE.cyan;
    ctx.fillRect(-S * 0.22, -S * 1.44, S * 0.42, S * 0.04);
    ctx.fillRect(-S * 0.22, -S * 1.34, S * 0.28, S * 0.04);
    if (!solved) {
      ctx.fillRect(-S * 0.22, -S * 1.24, S * 0.36, S * 0.04);
    }

    ctx.restore();
  }

  /**
   * Draw foreground cover spot (hanging Neo-Edo banner, industrial pipe cluster, or shadow alcove).
   */
  static drawCoverSpot(ctx, x, y, S, kind = 'banner', isOccupied = false, clock = 0) {
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = isOccupied ? 'rgba(5, 7, 13, 0.78)' : 'rgba(8, 12, 24, 0.92)';
    ctx.strokeStyle = isOccupied ? PALETTE.cyan : 'rgba(143, 163, 199, 0.36)';
    ctx.lineWidth = Math.max(1.2, S * 0.025);

    if (kind === 'banner') {
      const sway = Math.sin(clock * 1.5 + x * 0.05) * S * 0.04;
      ctx.beginPath();
      ctx.moveTo(-S * 0.48, -S * 2.1);
      ctx.lineTo(S * 0.48, -S * 2.1);
      ctx.lineTo(S * 0.44 + sway, -S * 0.12);
      ctx.lineTo(sway, -S * 0.32);
      ctx.lineTo(-S * 0.44 + sway, -S * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Decorative vertical hanko stripe (no essential info in kanji)
      ctx.fillStyle = 'rgba(196, 22, 28, 0.55)';
      ctx.fillRect(-S * 0.08 + sway * 0.5, -S * 1.85, S * 0.16, S * 1.25);
    } else {
      // Industrial server/pipe shadow alcove
      ctx.fillRect(-S * 0.52, -S * 1.95, S * 1.04, S * 1.95);
      ctx.strokeRect(-S * 0.52, -S * 1.95, S * 1.04, S * 1.95);
      // Horizontal vent slits
      ctx.fillStyle = 'rgba(61, 242, 255, 0.16)';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(-S * 0.36, -S * 1.65 + i * S * 0.24, S * 0.72, S * 0.06);
      }
    }

    ctx.restore();
  }
}
