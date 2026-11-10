/**
 * @fileoverview Hand-authored Bezier path silhouette rig for VU1FRA (~1.8 tiles tall).
 * Features:
 * - 12-bone skeleton + analytical 2-bone IK for legs against terrain
 * - Angular shinobi hood with pointed tail & glowing cyan eye-slit
 * - Forward-leaning torso, hakama trousers, tabi boots, sheathed katana with edge glint
 * - 15-segment wind-driven Verlet cloth scarf simulation
 * - Rim light along edges facing the nearest light source
 * - NEVER uses ellipses/capsules for the body.
 */

import { PALETTE } from '../theme.js';
import { sampleHeroPose } from './HeroAnimations.js';

export class HeroRig {
  constructor(segmentCount = 15) {
    this.segmentCount = segmentCount;
    this.scarfNodes = [];
    for (let i = 0; i < segmentCount; i++) {
      this.scarfNodes.push({
        x: -i * 0.08,
        y: -1.35,
        oldX: -i * 0.08,
        oldY: -1.35
      });
    }
    this.lastWorldX = 0;
    this.lastWorldY = 0;
    this.initializedScarf = false;
  }

  /**
   * Solve 2-bone IK in local space from hip to foot with a knee bend direction.
   * @param {number} hx Hip X
   * @param {number} hy Hip Y
   * @param {number} fx Foot X
   * @param {number} fy Foot Y
   * @param {number} l1 Thigh length
   * @param {number} l2 Calf length
   * @param {number} bendDir +1 for forward knee bend, -1 for reverse
   */
  solveTwoBoneIK(hx, hy, fx, fy, l1, l2, bendDir = 1) {
    const dx = fx - hx;
    const dy = fy - hy;
    const dist = Math.max(0.05, Math.min(l1 + l2 - 0.005, Math.hypot(dx, dy)));
    const baseAngle = Math.atan2(dy, dx);
    const cosAngle = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);
    const clampedCos = Math.max(-1, Math.min(1, cosAngle));
    const kneeAngle = baseAngle - bendDir * Math.acos(clampedCos);
    return {
      kx: hx + Math.cos(kneeAngle) * l1,
      ky: hy + Math.sin(kneeAngle) * l1
    };
  }

  /**
   * Step the Verlet scarf simulation in world-tile units.
   * @param {number} anchorX Neck world X (in tiles)
   * @param {number} anchorY Neck world Y (in tiles)
   * @param {number} facing +1 right, -1 left
   * @param {number} vx Hero velocity X
   * @param {number} vy Hero velocity Y
   * @param {number} clockSec Game clock for wind gusts
   */
  updateScarf(anchorX, anchorY, facing, vx, vy, clockSec) {
    const segLen = 0.11;
    if (!this.initializedScarf || Math.hypot(anchorX - this.lastWorldX, anchorY - this.lastWorldY) > 3.0) {
      for (let i = 0; i < this.segmentCount; i++) {
        this.scarfNodes[i].x = anchorX - facing * i * segLen;
        this.scarfNodes[i].y = anchorY + i * 0.02;
        this.scarfNodes[i].oldX = this.scarfNodes[i].x;
        this.scarfNodes[i].oldY = this.scarfNodes[i].y;
      }
      this.initializedScarf = true;
    }
    this.lastWorldX = anchorX;
    this.lastWorldY = anchorY;

    // Pin root node to neck
    this.scarfNodes[0].x = anchorX;
    this.scarfNodes[0].y = anchorY;

    const windX = -facing * (0.012 + Math.abs(vx) * 0.004) + Math.sin(clockSec * 2.6) * 0.006;
    const windY = 0.003 + Math.cos(clockSec * 3.4) * 0.004 - vy * 0.001;

    for (let i = 1; i < this.segmentCount; i++) {
      const n = this.scarfNodes[i];
      const velX = (n.x - n.oldX) * 0.86;
      const velY = (n.y - n.oldY) * 0.86;
      n.oldX = n.x;
      n.oldY = n.y;
      const wave = Math.sin(clockSec * 6.5 - i * 0.55) * 0.0045;
      n.x += velX + windX;
      n.y += velY + windY + wave;
    }

    // Distance constraints (3 relaxation iterations)
    for (let iter = 0; iter < 3; iter++) {
      this.scarfNodes[0].x = anchorX;
      this.scarfNodes[0].y = anchorY;
      for (let i = 1; i < this.segmentCount; i++) {
        const prev = this.scarfNodes[i - 1];
        const cur = this.scarfNodes[i];
        const dx = cur.x - prev.x;
        const dy = cur.y - prev.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const diff = (d - segLen) / d;
        if (i === 1) {
          cur.x -= dx * diff;
          cur.y -= dy * diff;
        } else {
          prev.x += dx * diff * 0.35;
          prev.y += dy * diff * 0.35;
          cur.x -= dx * diff * 0.65;
          cur.y -= dy * diff * 0.65;
        }
      }
    }
  }

  /**
   * Draw VU1FRA onto a 2D canvas context.
   * @param {CanvasRenderingContext2D} ctx
   * @param {{
   *   screenX: number,
   *   screenY: number,
   *   tileScale: number,
   *   facing: number,
   *   anim: string,
   *   animTime: number,
   *   gaitPhase: number,
   *   worldX: number,
   *   worldY: number,
   *   vx: number,
   *   vy: number,
   *   clock: number,
   *   lightAngleRad?: number,
   *   lightIntensity?: number,
   *   shadowEnergy?: number,
   *   scaleX?: number,
   *   scaleY?: number
   * }} params
   */
  draw(ctx, params) {
    const {
      screenX,
      screenY,
      tileScale,
      facing = 1,
      anim = 'idle',
      animTime = 0,
      gaitPhase = 0,
      worldX = 0,
      worldY = 0,
      vx = 0,
      vy = 0,
      clock = 0,
      lightAngleRad = -0.8,
      lightIntensity = 0.7,
      shadowEnergy = 100,
      scaleX = 1,
      scaleY = 1
    } = params;

    const pose = sampleHeroPose(anim, animTime, gaitPhase);
    const S = tileScale;

    // Compute key bone joints in local rig space (feet at y = 0, up is negative Y)
    const pelvisX = 0;
    const pelvisY = pose.pelvisY;
    const torsoLen = 0.56;
    const neckX = pelvisX + Math.sin(pose.torsoLean) * torsoLen;
    const neckY = pelvisY - Math.cos(pose.torsoLean) * torsoLen;
    const headX = neckX + Math.sin(pose.torsoLean + pose.headTilt) * 0.22;
    const headY = neckY - Math.cos(pose.torsoLean + pose.headTilt) * 0.22;

    // Update Verlet scarf in world space
    const neckWorldX = worldX + facing * neckX;
    const neckWorldY = worldY + neckY;
    this.updateScarf(neckWorldX, neckWorldY, facing, vx, vy, clock);

    // Solve 2-bone IK for both legs (thigh = 0.44, calf = 0.44)
    const legL = this.solveTwoBoneIK(
      pelvisX - 0.05,
      pelvisY,
      pose.footL.x,
      pose.footL.y,
      0.44,
      0.44,
      1
    );
    const legR = this.solveTwoBoneIK(
      pelvisX + 0.05,
      pelvisY,
      pose.footR.x,
      pose.footR.y,
      0.44,
      0.44,
      1
    );

    // Solve 2-bone IK for both arms (upper = 0.30, forearm = 0.28)
    const shoulderX = neckX - 0.03;
    const shoulderY = neckY + 0.08;
    const armL = this.solveTwoBoneIK(shoulderX, shoulderY, pose.handL.x, pose.handL.y, 0.30, 0.28, -1);
    const armR = this.solveTwoBoneIK(shoulderX, shoulderY, pose.handR.x, pose.handR.y, 0.30, 0.28, -1);

    ctx.save();
    ctx.translate(screenX, screenY);

    // Subtle shadow-energy ring around the hero's waist/chest (no bar!)
    if (shadowEnergy > 5) {
      const ringRadius = S * 0.54;
      const ringCenterY = pelvisY * S;
      const frac = Math.max(0, Math.min(1, shadowEnergy / 100));
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, ringCenterY, ringRadius, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * frac);
      ctx.strokeStyle = pose.dissolveAmount > 0.2 ? 'rgba(61, 242, 255, 0.55)' : 'rgba(61, 242, 255, 0.22)';
      ctx.lineWidth = Math.max(1.5, S * 0.032);
      ctx.stroke();
      ctx.restore();
    }

    // Draw wind-driven Verlet scarf in world-relative offsets before flipping horizontally
    this.drawScarf(ctx, worldX, worldY, S, pose.dissolveAmount, pose.coverDim);

    ctx.scale(facing * scaleX, scaleY);

    if (pose.coverDim > 0) {
      ctx.globalAlpha = 1 - pose.coverDim * 0.55;
    }

    const isDissolved = pose.dissolveAmount > 0.3;
    const bodyFill = isDissolved ? 'rgba(5, 7, 13, 0.28)' : PALETTE.ink;
    const backLimbFill = isDissolved ? 'rgba(11, 16, 32, 0.22)' : '#090d1a';
    const rimDirX = Math.cos(lightAngleRad) * facing;
    const rimAlpha = isDissolved ? 0.85 : Math.min(0.75, 0.22 + lightIntensity * 0.45);
    const rimStroke = isDissolved
      ? `rgba(61, 242, 255, ${rimAlpha})`
      : `rgba(143, 163, 199, ${rimAlpha})`;

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // 1. SHEATHED KATANA ON BACK (diagonal angular scabbard + hilt + cyan/silver edge glint)
    this.drawKatana(ctx, neckX * S, neckY * S, pelvisX * S, pelvisY * S, S, pose.katanaDraw, isDissolved);

    // 2. BACK LEG (Left leg in hakama trousers + tabi boot)
    this.drawHakamaLeg(
      ctx,
      (pelvisX - 0.05) * S,
      pelvisY * S,
      legL.kx * S,
      legL.ky * S,
      pose.footL.x * S,
      pose.footL.y * S,
      S,
      backLimbFill,
      rimStroke,
      false
    );

    // 3. BACK ARM (Left sleeve & forearm wrap)
    this.drawShinobiArm(
      ctx,
      shoulderX * S,
      shoulderY * S,
      armL.kx * S,
      armL.ky * S,
      pose.handL.x * S,
      pose.handL.y * S,
      S,
      backLimbFill,
      rimStroke
    );

    // 4. TORSO & LAYERED SHINOBI COAT TAILS (authored Bezier silhouette)
    this.drawTorso(ctx, pelvisX * S, pelvisY * S, neckX * S, neckY * S, S, bodyFill, rimStroke, rimDirX);

    // 5. FRONT LEG (Right leg in hakama trousers + tabi boot)
    this.drawHakamaLeg(
      ctx,
      (pelvisX + 0.05) * S,
      pelvisY * S,
      legR.kx * S,
      legR.ky * S,
      pose.footR.x * S,
      pose.footR.y * S,
      S,
      bodyFill,
      rimStroke,
      true
    );

    // 6. ANGULAR HOOD WITH POINTED TAIL & NARROW CYAN EYE-SLIT
    this.drawHoodAndHead(
      ctx,
      neckX * S,
      neckY * S,
      headX * S,
      headY * S,
      S,
      bodyFill,
      rimStroke,
      pose.lookBack
    );

    // 7. FRONT ARM (Right sleeve & forearm wrap)
    this.drawShinobiArm(
      ctx,
      shoulderX * S,
      shoulderY * S,
      armR.kx * S,
      armR.ky * S,
      pose.handR.x * S,
      pose.handR.y * S,
      S,
      bodyFill,
      rimStroke
    );

    // 8. HOLO-GLYPHS AROUND HANDS WHEN HACKING
    if (pose.holoGlyphs) {
      this.drawHackGlyphs(ctx, pose.handR.x * S, pose.handR.y * S, S, clock);
    }

    // 9. INK-PARTICLE DISSOLVE WISP WHEN IN SHADOW-DISSOLVE
    if (isDissolved) {
      this.drawDissolveWisps(ctx, pelvisY * S, S, clock);
    }

    ctx.restore();
  }

  drawScarf(ctx, worldX, worldY, S, dissolveAmount, coverDim) {
    if (this.scarfNodes.length < 2) return;
    ctx.save();
    const alpha = dissolveAmount > 0.3 ? 0.35 : coverDim > 0 ? 0.45 : 0.92;
    ctx.fillStyle = `rgba(14, 21, 42, ${alpha})`;
    ctx.strokeStyle = dissolveAmount > 0.3 ? 'rgba(61, 242, 255, 0.55)' : 'rgba(143, 163, 199, 0.32)';
    ctx.lineWidth = Math.max(1, S * 0.025);

    // Build tapered Bezier ribbon from Verlet nodes
    ctx.beginPath();
    for (let i = 0; i < this.scarfNodes.length; i++) {
      const n = this.scarfNodes[i];
      const lx = (n.x - worldX) * S;
      const ly = (n.y - worldY) * S;
      const width = (1 - i / this.scarfNodes.length) * S * 0.11 + S * 0.02;
      if (i === 0) {
        ctx.moveTo(lx, ly - width * 0.5);
      } else {
        ctx.lineTo(lx, ly - width * 0.5);
      }
    }
    for (let i = this.scarfNodes.length - 1; i >= 0; i--) {
      const n = this.scarfNodes[i];
      const lx = (n.x - worldX) * S;
      const ly = (n.y - worldY) * S;
      const width = (1 - i / this.scarfNodes.length) * S * 0.11 + S * 0.02;
      ctx.lineTo(lx, ly + width * 0.5);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawKatana(ctx, nx, ny, px, py, S, drawAmount, isDissolved) {
    ctx.save();
    const hiltX = nx - S * 0.24 + drawAmount * S * 0.12;
    const hiltY = ny - S * 0.26;
    const tipX = px - S * 0.58;
    const tipY = py + S * 0.32;

    // Scabbard (saya)
    ctx.strokeStyle = isDissolved ? 'rgba(61, 242, 255, 0.45)' : '#12192e';
    ctx.lineWidth = S * 0.055;
    ctx.beginPath();
    ctx.moveTo(hiltX, hiltY);
    ctx.quadraticCurveTo((hiltX + tipX) * 0.5 - S * 0.04, (hiltY + tipY) * 0.5, tipX, tipY);
    ctx.stroke();

    // Tsuba guard & faint cyan/moon blade edge glint
    ctx.strokeStyle = PALETTE.cyan;
    ctx.lineWidth = Math.max(1.2, S * 0.022);
    ctx.beginPath();
    ctx.moveTo(hiltX + S * 0.04, hiltY - S * 0.05);
    ctx.lineTo(tipX + S * 0.08, tipY - S * 0.04);
    ctx.stroke();
    ctx.restore();
  }

  drawTorso(ctx, px, py, nx, ny, S, fill, rimStroke, rimDirX) {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = rimStroke;
    ctx.lineWidth = Math.max(1.3, S * 0.028);

    // Angular chest, tapered waist, and flared shinobi haori coat tail
    ctx.beginPath();
    ctx.moveTo(nx - S * 0.14, ny + S * 0.02); // Back shoulder
    ctx.bezierCurveTo(
      nx + S * 0.06,
      ny - S * 0.04,
      nx + S * 0.18,
      ny + S * 0.05,
      nx + S * 0.16,
      ny + S * 0.18 // Front chest breastplate edge
    );
    ctx.bezierCurveTo(
      px + S * 0.14,
      (ny + py) * 0.55,
      px + S * 0.11,
      py - S * 0.05,
      px + S * 0.13,
      py + S * 0.08 // Front sash / obi
    );
    // Coat tail sweeping back behind pelvis
    ctx.lineTo(px - S * 0.04, py + S * 0.14);
    ctx.bezierCurveTo(
      px - S * 0.18,
      py + S * 0.24,
      px - S * 0.28,
      py + S * 0.18,
      px - S * 0.32,
      py + S * 0.04 // Pointed coat tail
    );
    ctx.bezierCurveTo(
      px - S * 0.18,
      (ny + py) * 0.52,
      nx - S * 0.16,
      ny + S * 0.18,
      nx - S * 0.14,
      ny + S * 0.02
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Subtle crimson/hanko sash knot accent at waist
    ctx.fillStyle = PALETTE.hanko;
    ctx.beginPath();
    ctx.moveTo(px - S * 0.06, py - S * 0.01);
    ctx.lineTo(px + S * 0.11, py - S * 0.02);
    ctx.lineTo(px + S * 0.09, py + S * 0.03);
    ctx.lineTo(px - S * 0.08, py + S * 0.03);
    ctx.closePath();
    ctx.fill();

    // Extra directional rim highlight on the lit side
    if (rimDirX > 0) {
      ctx.strokeStyle = 'rgba(232, 226, 207, 0.35)';
      ctx.beginPath();
      ctx.moveTo(nx + S * 0.15, ny + S * 0.08);
      ctx.lineTo(px + S * 0.12, py + S * 0.04);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawHoodAndHead(ctx, nx, ny, hx, hy, S, fill, rimStroke, lookBack) {
    ctx.save();
    if (lookBack) {
      ctx.translate(hx, hy);
      ctx.scale(-1, 1);
      ctx.translate(-hx, -hy);
    }

    ctx.fillStyle = fill;
    ctx.strokeStyle = rimStroke;
    ctx.lineWidth = Math.max(1.3, S * 0.028);

    // Angular shinobi cowl/hood with pointed rear tail and sharp brow peak
    ctx.beginPath();
    ctx.moveTo(nx - S * 0.12, ny + S * 0.04); // Base of nape
    ctx.bezierCurveTo(
      hx - S * 0.24,
      hy - S * 0.02,
      hx - S * 0.32,
      hy - S * 0.14,
      hx - S * 0.38,
      hy - S * 0.10 // Pointed hood tail
    );
    ctx.bezierCurveTo(
      hx - S * 0.22,
      hy - S * 0.24,
      hx - S * 0.04,
      hy - S * 0.28,
      hx + S * 0.18,
      hy - S * 0.15 // Sharp forward hood peak
    );
    ctx.lineTo(hx + S * 0.15, hy - S * 0.02); // Mask bridge
    ctx.lineTo(hx + S * 0.12, hy + S * 0.09); // Angular jaw mask
    ctx.lineTo(nx + S * 0.06, ny + S * 0.06); // Front collar
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Narrow glowing cyan eye-slit (signature VU1FRA detail)
    ctx.fillStyle = PALETTE.cyan;
    ctx.beginPath();
    ctx.moveTo(hx + S * 0.02, hy - S * 0.07);
    ctx.lineTo(hx + S * 0.14, hy - S * 0.09);
    ctx.lineTo(hx + S * 0.11, hy - S * 0.04);
    ctx.lineTo(hx + S * 0.01, hy - S * 0.045);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawHakamaLeg(ctx, hx, hy, kx, ky, fx, fy, S, fill, rimStroke, isFront) {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = rimStroke;
    ctx.lineWidth = Math.max(1.1, S * 0.024);

    // Wide pleated hakama upper leg tapering sharply at the shin wrap (kyahan)
    const perpX = -(ky - hy);
    const perpY = kx - hx;
    const len = Math.hypot(perpX, perpY) || 1;
    const nx = (perpX / len) * S * 0.13;
    const ny = (perpY / len) * S * 0.13;

    ctx.beginPath();
    ctx.moveTo(hx - nx * 0.8, hy - ny * 0.8);
    ctx.quadraticCurveTo(
      (hx + kx) * 0.5 - nx * 1.35,
      (hy + ky) * 0.5 - ny * 1.35,
      kx - nx * 0.55,
      ky - ny * 0.55
    );
    // Tapered shin guard down to ankle
    ctx.lineTo(fx - S * 0.04, fy - S * 0.05);
    // Tabi boot with split-toe profile
    ctx.lineTo(fx + S * 0.14, fy - S * 0.02);
    ctx.lineTo(fx + S * 0.16, fy);
    ctx.lineTo(fx - S * 0.06, fy);
    ctx.lineTo(kx + nx * 0.75, ky + ny * 0.75);
    ctx.quadraticCurveTo(
      (hx + kx) * 0.5 + nx * 1.25,
      (hy + ky) * 0.5 + ny * 1.25,
      hx + nx * 0.8,
      hy + ny * 0.8
    );
    ctx.closePath();
    ctx.fill();
    if (isFront) ctx.stroke();
    ctx.restore();
  }

  drawShinobiArm(ctx, sx, sy, ex, ey, hx, hy, S, fill, rimStroke) {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = rimStroke;
    ctx.lineWidth = Math.max(1.1, S * 0.022);

    ctx.beginPath();
    ctx.moveTo(sx - S * 0.05, sy);
    ctx.quadraticCurveTo(ex - S * 0.07, ey, hx - S * 0.03, hy);
    ctx.lineTo(hx + S * 0.04, hy + S * 0.03);
    ctx.quadraticCurveTo(ex + S * 0.06, ey + S * 0.03, sx + S * 0.06, sy + S * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawHackGlyphs(ctx, hx, hy, S, clock) {
    ctx.save();
    ctx.strokeStyle = PALETTE.cyan;
    ctx.lineWidth = Math.max(1.2, S * 0.022);
    for (let i = 0; i < 3; i++) {
      const ang = clock * 3.2 + i * 2.1;
      const gx = hx + Math.cos(ang) * S * 0.16;
      const gy = hy + Math.sin(ang) * S * 0.11 - S * 0.08;
      ctx.strokeRect(gx - S * 0.04, gy - S * 0.04, S * 0.08, S * 0.08);
    }
    ctx.restore();
  }

  drawDissolveWisps(ctx, py, S, clock) {
    ctx.save();
    ctx.fillStyle = 'rgba(61, 242, 255, 0.45)';
    for (let i = 0; i < 6; i++) {
      const phase = (clock * 1.8 + i * 0.37) % 1;
      const wx = Math.sin(clock * 2.3 + i * 1.7) * S * 0.25;
      const wy = py + (0.5 - phase) * S * 1.1;
      const rad = (1 - phase) * S * 0.045;
      ctx.beginPath();
      ctx.arc(wx, wy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
