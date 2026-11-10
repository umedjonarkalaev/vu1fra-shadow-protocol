/**
 * @fileoverview Hand-authored Bezier vector silhouettes for enemies and suspicion eye-arcs:
 * 1. Security Guards in long armored trench coats with glowing visor sensors and flashlights.
 * 2. Hovering Patrol Drones with twin rotors and searchlight housings.
 * 3. Wall-mounted Security Cameras with sweeping optical lenses.
 * 4. Elegant suspicion eye-arc over enemies filling white -> amber -> crimson.
 */

import { PALETTE } from '../theme.js';

export class EnemyArt {
  /**
   * Draw a corporate security guard in a long coat.
   * @param {CanvasRenderingContext2D} ctx
   * @param {{
   *   screenX: number,
   *   screenY: number,
   *   tileScale: number,
   *   facing: number,
   *   walkCycle: number,
   *   state: 'CALM'|'CURIOUS'|'SEARCHING'|'ALERTED'|'RETURN'|'DOWNED',
   *   suspicion: number,
   *   aimAngleRad: number
   * }} p
   */
  static drawGuard(ctx, p) {
    const { screenX, screenY, tileScale: S, facing = 1, walkCycle = 0, state, suspicion = 0 } = p;
    ctx.save();
    ctx.translate(screenX, screenY);

    if (state === 'DOWNED') {
      // Non-lethal unconscious guard lying on the ground with soft "Zzz" stun pulse
      ctx.fillStyle = PALETTE.ink;
      ctx.strokeStyle = 'rgba(143, 163, 199, 0.35)';
      ctx.lineWidth = Math.max(1.2, S * 0.025);
      ctx.beginPath();
      ctx.moveTo(-S * 0.75, -S * 0.12);
      ctx.bezierCurveTo(-S * 0.35, -S * 0.38, S * 0.35, -S * 0.34, S * 0.72, -S * 0.06);
      ctx.lineTo(S * 0.65, 0);
      ctx.lineTo(-S * 0.75, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dimmed visor
      ctx.fillStyle = 'rgba(61, 242, 255, 0.35)';
      ctx.fillRect(S * 0.42 * facing, -S * 0.24, S * 0.12, S * 0.04);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.scale(facing, 1);

    const stride = Math.sin(walkCycle) * S * 0.18;
    const bob = Math.abs(Math.cos(walkCycle)) * S * 0.03;

    ctx.fillStyle = PALETTE.ink;
    ctx.strokeStyle = 'rgba(143, 163, 199, 0.42)';
    ctx.lineWidth = Math.max(1.3, S * 0.028);

    // Boots / Legs
    ctx.beginPath();
    ctx.moveTo(-S * 0.12 + stride, -S * 0.45);
    ctx.lineTo(-S * 0.16 + stride, 0);
    ctx.lineTo(-S * 0.02 + stride, 0);
    ctx.lineTo(S * 0.02 + stride, -S * 0.45);
    ctx.moveTo(S * 0.08 - stride, -S * 0.45);
    ctx.lineTo(S * 0.06 - stride, 0);
    ctx.lineTo(S * 0.22 - stride, 0);
    ctx.lineTo(S * 0.16 - stride, -S * 0.45);
    ctx.fill();
    ctx.stroke();

    // Long armored trench coat silhouette (Bezier curves)
    ctx.beginPath();
    ctx.moveTo(-S * 0.26, -S * 1.42 + bob); // High collar back
    ctx.lineTo(S * 0.20, -S * 1.46 + bob); // Collar front
    ctx.bezierCurveTo(
      S * 0.30,
      -S * 1.15 + bob,
      S * 0.26,
      -S * 0.68 + bob,
      S * 0.32,
      -S * 0.28 + bob // Front coat hem
    );
    ctx.lineTo(-S * 0.36, -S * 0.24 + bob); // Rear coat hem flare
    ctx.bezierCurveTo(
      -S * 0.32,
      -S * 0.72 + bob,
      -S * 0.34,
      -S * 1.12 + bob,
      -S * 0.26,
      -S * 1.42 + bob
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Helmet & Visor Sensor
    ctx.beginPath();
    ctx.moveTo(-S * 0.16, -S * 1.44 + bob);
    ctx.bezierCurveTo(
      -S * 0.18,
      -S * 1.76 + bob,
      S * 0.18,
      -S * 1.78 + bob,
      S * 0.22,
      -S * 1.52 + bob
    );
    ctx.lineTo(S * 0.16, -S * 1.40 + bob);
    ctx.lineTo(-S * 0.14, -S * 1.40 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing Visor Strip (color shifts with alert state)
    const visorColor =
      state === 'ALERTED'
        ? PALETTE.crimson
        : state === 'SEARCHING' || state === 'CURIOUS'
        ? PALETTE.amber
        : PALETTE.amber;
    ctx.fillStyle = visorColor;
    ctx.beginPath();
    ctx.moveTo(S * 0.04, -S * 1.58 + bob);
    ctx.lineTo(S * 0.22, -S * 1.55 + bob);
    ctx.lineTo(S * 0.19, -S * 1.49 + bob);
    ctx.lineTo(S * 0.03, -S * 1.51 + bob);
    ctx.closePath();
    ctx.fill();

    // Flashlight emitter held at chest level
    ctx.fillStyle = '#e8e2cf';
    ctx.fillRect(S * 0.22, -S * 1.06 + bob, S * 0.14, S * 0.07);

    ctx.restore();

    // Draw elegant suspicion eye-arc above the guard
    if (suspicion > 0.02 || state === 'CURIOUS' || state === 'SEARCHING' || state === 'ALERTED') {
      EnemyArt.drawSuspicionArc(ctx, 0, -S * 2.05, S, suspicion, state);
    }

    ctx.restore();
  }

  /**
   * Draw an autonomous hovering surveillance drone.
   */
  static drawDrone(ctx, p) {
    const { screenX, screenY, tileScale: S, clock = 0, suspicion = 0, state = 'CALM' } = p;
    const hoverY = Math.sin(clock * 3.8) * S * 0.08;

    ctx.save();
    ctx.translate(screenX, screenY + hoverY);

    ctx.fillStyle = PALETTE.ink;
    ctx.strokeStyle = 'rgba(143, 163, 199, 0.5)';
    ctx.lineWidth = Math.max(1.3, S * 0.028);

    // Angular stealth drone chassis
    ctx.beginPath();
    ctx.moveTo(-S * 0.48, -S * 0.06);
    ctx.lineTo(-S * 0.22, -S * 0.24);
    ctx.lineTo(S * 0.22, -S * 0.24);
    ctx.lineTo(S * 0.48, -S * 0.06);
    ctx.lineTo(S * 0.28, S * 0.14);
    ctx.lineTo(-S * 0.28, S * 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central optical eye
    ctx.fillStyle = suspicion > 0.6 ? PALETTE.crimson : PALETTE.amber;
    ctx.beginPath();
    ctx.arc(0, 0.02 * S, S * 0.09, 0, Math.PI * 2);
    ctx.fill();

    if (suspicion > 0.02 || state !== 'CALM') {
      EnemyArt.drawSuspicionArc(ctx, 0, -S * 0.55, S, suspicion, state);
    }

    ctx.restore();
  }

  /**
   * Draw a wall/ceiling security camera.
   */
  static drawCamera(ctx, p) {
    const { screenX, screenY, tileScale: S, aimAngleRad = 0, suspicion = 0, state = 'CALM' } = p;
    ctx.save();
    ctx.translate(screenX, screenY);

    // Mounting bracket
    ctx.strokeStyle = PALETTE.fog;
    ctx.lineWidth = Math.max(1.5, S * 0.04);
    ctx.beginPath();
    ctx.moveTo(0, -S * 0.25);
    ctx.lineTo(0, 0);
    ctx.stroke();

    ctx.save();
    ctx.rotate(aimAngleRad);
    ctx.fillStyle = PALETTE.ink;
    ctx.strokeStyle = 'rgba(143, 163, 199, 0.5)';
    ctx.lineWidth = Math.max(1.2, S * 0.025);
    ctx.beginPath();
    ctx.moveTo(-S * 0.18, -S * 0.12);
    ctx.lineTo(S * 0.26, -S * 0.15);
    ctx.lineTo(S * 0.32, S * 0.12);
    ctx.lineTo(-S * 0.18, S * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Camera lens LED
    ctx.fillStyle = suspicion > 0.5 ? PALETTE.crimson : PALETTE.amber;
    ctx.beginPath();
    ctx.arc(S * 0.26, 0, S * 0.055, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (suspicion > 0.02 || state !== 'CALM') {
      EnemyArt.drawSuspicionArc(ctx, 0, -S * 0.55, S, suspicion, state);
    }

    ctx.restore();
  }

  /**
   * Thin, elegant suspicion eye-arc over enemies filling white -> amber -> crimson.
   */
  static drawSuspicionArc(ctx, x, y, S, suspicion, state) {
    const clamped = Math.max(0, Math.min(1, suspicion));
    const color =
      state === 'ALERTED' || clamped >= 0.85
        ? PALETTE.crimson
        : clamped >= 0.32 || state === 'SEARCHING'
        ? PALETTE.amber
        : PALETTE.moon;

    ctx.save();
    ctx.translate(x, y);

    // Outer muted crescent arc
    const r = S * 0.28;
    ctx.strokeStyle = 'rgba(143, 163, 199, 0.28)';
    ctx.lineWidth = Math.max(1.4, S * 0.035);
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // Active fill arc expanding from center outward
    const halfSpan = Math.PI * 0.35 * Math.max(0.08, clamped);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2.0, S * 0.052);
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI * 1.5 - halfSpan, Math.PI * 1.5 + halfSpan);
    ctx.stroke();

    // Central pupil dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -r * 0.65, S * 0.04, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
