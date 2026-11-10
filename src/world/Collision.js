/**
 * @fileoverview Axis-separated AABB tile collision with sub-stepping, one-way platform support,
 * wall contact reporting, and touch-friendly ledge auto-mantle.
 */

import { PHYSICS } from '../config.js';

export class Collision {
  /**
   * Move an entity AABB (where x is center X and y is bottom/feet Y) by (dx, dy)
   * using sub-stepping so it can never tunnel or end up inside solids.
   * @param {import('./Level.js').Level} level
   * @param {{x: number, y: number, vx: number, vy: number, width: number, height: number, dropThroughTimer?: number}} body
   * @param {number} dt
   * @returns {{
   *   grounded: boolean,
   *   hitCeiling: boolean,
   *   wallDir: -1 | 0 | 1,
   *   wallRunnable: boolean,
   *   mantled: boolean
   * }}
   */
  static moveAndSlide(level, body, dt) {
    const totalDx = body.vx * dt;
    const totalDy = body.vy * dt;
    const maxDisp = Math.max(Math.abs(totalDx), Math.abs(totalDy));
    const steps = Math.max(1, Math.min(8, Math.ceil(maxDisp / 0.22)));
    const stepDx = totalDx / steps;
    const stepDy = totalDy / steps;

    let grounded = false;
    let hitCeiling = false;
    /** @type {-1 | 0 | 1} */
    let wallDir = 0;
    let wallRunnable = false;
    let mantled = false;

    for (let s = 0; s < steps; s++) {
      // 1. Horizontal axis resolution
      body.x += stepDx;
      const hHit = Collision.resolveHorizontal(level, body);
      if (hHit.dir !== 0) {
        wallDir = hHit.dir;
        wallRunnable = hHit.runnable;

        // Check touch-forgiveness auto-mantle for small ledges near feet
        if (
          !mantled &&
          Collision.tryAutoMantle(level, body, hHit.dir, PHYSICS.mantleTolerance)
        ) {
          mantled = true;
          wallDir = 0;
          grounded = true;
          body.vy = 0;
        } else {
          body.vx = 0;
        }
      }

      // 2. Vertical axis resolution
      const prevBottom = body.y;
      body.y += stepDy;
      const vHit = Collision.resolveVertical(level, body, prevBottom);
      if (vHit.grounded) {
        grounded = true;
        body.vy = 0;
      }
      if (vHit.hitCeiling) {
        hitCeiling = true;
        if (body.vy < 0) body.vy = 0;
      }
    }

    // Clamp to level horizontal bounds
    const halfW = body.width * 0.5;
    if (body.x < halfW) {
      body.x = halfW;
      body.vx = 0;
    } else if (body.x > level.width - halfW) {
      body.x = level.width - halfW;
      body.vx = 0;
    }

    // Depenetration safety pass so body is guaranteed never inside a solid tile
    Collision.depenetrateIfStuck(level, body);

    return { grounded, hitCeiling, wallDir, wallRunnable, mantled };
  }

  static resolveHorizontal(level, body) {
    const halfW = body.width * 0.5;
    const left = body.x - halfW;
    const right = body.x + halfW;
    const top = body.y - body.height + 0.04;
    const bottom = body.y - 0.04;

    const minTy = Math.floor(top);
    const maxTy = Math.floor(bottom);

    /** @type {-1 | 0 | 1} */
    let dir = 0;
    let runnable = false;

    if (body.vx > 0) {
      const tx = Math.floor(right);
      for (let ty = minTy; ty <= maxTy; ty++) {
        if (level.isSolidAt(tx, ty)) {
          body.x = tx - halfW - 0.0001;
          dir = 1;
          if (level.getTileAt(tx, ty) === 'W') runnable = true;
        }
      }
    } else if (body.vx < 0) {
      const tx = Math.floor(left);
      for (let ty = minTy; ty <= maxTy; ty++) {
        if (level.isSolidAt(tx, ty)) {
          body.x = tx + 1 + halfW + 0.0001;
          dir = -1;
          if (level.getTileAt(tx, ty) === 'W') runnable = true;
        }
      }
    }

    return { dir, runnable };
  }

  static resolveVertical(level, body, prevBottom) {
    const halfW = body.width * 0.5 - 0.02;
    const minTx = Math.floor(body.x - halfW);
    const maxTx = Math.floor(body.x + halfW);

    let grounded = false;
    let hitCeiling = false;

    if (body.vy >= 0) {
      const ty = Math.floor(body.y);
      for (let tx = minTx; tx <= maxTx; tx++) {
        const solid = level.isSolidAt(tx, ty);
        const oneWay =
          level.isOneWayAt(tx, ty) &&
          (body.dropThroughTimer || 0) <= 0 &&
          prevBottom <= ty + 0.12;
        if (solid || oneWay) {
          body.y = ty;
          grounded = true;
          break;
        }
      }
    } else if (body.vy < 0) {
      const top = body.y - body.height;
      const ty = Math.floor(top);
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (level.isSolidAt(tx, ty)) {
          body.y = ty + 1 + body.height + 0.0001;
          hitCeiling = true;
          break;
        }
      }
    }

    return { grounded, hitCeiling };
  }

  /**
   * If the hero's feet catch the top corner of a ledge within `tolerance` tiles,
   * smoothly step up onto the ledge.
   */
  static tryAutoMantle(level, body, dir, tolerance) {
    const halfW = body.width * 0.5;
    const probeX = body.x + dir * (halfW + 0.08);
    const tx = Math.floor(probeX);
    const feetTy = Math.floor(body.y - 0.04);

    if (!level.isSolidAt(tx, feetTy)) return false;

    const ledgeTopY = feetTy;
    const stepUpHeight = body.y - ledgeTopY;
    if (stepUpHeight <= 0 || stepUpHeight > tolerance) return false;

    // Verify space above the ledge is clear for the body's height
    const topNeededTy = Math.floor(ledgeTopY - body.height + 0.05);
    for (let ty = topNeededTy; ty < feetTy; ty++) {
      if (level.isSolidAt(tx, ty)) return false;
    }

    body.y = ledgeTopY;
    body.x += dir * 0.12;
    return true;
  }

  /**
   * Check whether a wall tile is directly adjacent to the body on either side.
   * @param {import('./Level.js').Level} level
   * @param {{x: number, y: number, width: number, height: number}} body
   * @returns {{dir: -1 | 0 | 1, runnable: boolean}}
   */
  static checkAdjacentWall(level, body) {
    const halfW = body.width * 0.5;
    const midY = Math.floor(body.y - body.height * 0.5);
    const rightTx = Math.floor(body.x + halfW + 0.08);
    const leftTx = Math.floor(body.x - halfW - 0.08);

    if (level.isSolidAt(rightTx, midY)) {
      return { dir: 1, runnable: level.getTileAt(rightTx, midY) === 'W' };
    }
    if (level.isSolidAt(leftTx, midY)) {
      return { dir: -1, runnable: level.getTileAt(leftTx, midY) === 'W' };
    }
    return { dir: 0, runnable: false };
  }

  /**
   * Emergency depenetration if an entity ever overlaps a solid tile.
   */
  static depenetrateIfStuck(level, body) {
    const tx = Math.floor(body.x);
    const ty = Math.floor(body.y - 0.1);
    if (!level.isSolidAt(tx, ty)) return;
    for (let offset = 1; offset <= 4; offset++) {
      if (!level.isSolidAt(tx, ty - offset)) {
        body.y = ty - offset + 1;
        return;
      }
    }
  }
}
