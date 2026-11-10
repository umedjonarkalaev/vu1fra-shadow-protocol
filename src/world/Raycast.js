/**
 * @fileoverview Grid raycasting for line-of-sight checks and visibility polygon generation.
 */

export class Raycast {
  /**
   * Cast a ray from (x0, y0) in direction `angleRad` up to `maxDist` tiles.
   * Returns hit point `{x, y, dist, hit}`.
   * @param {import('./Level.js').Level} level
   * @param {number} x0
   * @param {number} y0
   * @param {number} angleRad
   * @param {number} maxDist
   */
  static castRay(level, x0, y0, angleRad, maxDist) {
    const dx = Math.cos(angleRad);
    const dy = Math.sin(angleRad);
    const stepSize = 0.18;
    let d = 0;

    while (d < maxDist) {
      d = Math.min(maxDist, d + stepSize);
      const px = x0 + dx * d;
      const py = y0 + dy * d;
      if (level && level.isSolidAt(Math.floor(px), Math.floor(py))) {
        return { x: px, y: py, dist: d, hit: true };
      }
    }

    return {
      x: x0 + dx * maxDist,
      y: y0 + dy * maxDist,
      dist: maxDist,
      hit: false
    };
  }

  /**
   * Returns true if the line segment from (x0, y0) to (x1, y1) is not blocked by any solid tile.
   * @param {import('./Level.js').Level} level
   * @param {number} x0
   * @param {number} y0
   * @param {number} x1
   * @param {number} y1
   * @returns {boolean}
   */
  static hasLineOfSight(level, x0, y0, x1, y1) {
    if (!level) return true;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.05) return true;
    const steps = Math.ceil(dist / 0.2);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = x0 + dx * t;
      const py = y0 + dy * t;
      if (level.isSolidAt(Math.floor(px), Math.floor(py))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Compute a visibility cone polygon (array of `{x, y}` vertices in world tiles).
   * @param {import('./Level.js').Level} level
   * @param {number} x0
   * @param {number} y0
   * @param {number} centerAngleRad
   * @param {number} fovRad
   * @param {number} rangeTiles
   * @param {number} [rayCount=32]
   */
  static computeVisibilityCone(level, x0, y0, centerAngleRad, fovRad, rangeTiles, rayCount = 32) {
    const count = Math.min(40, Math.max(8, rayCount));
    const isFullCircle = fovRad >= Math.PI * 1.99;
    /** @type {Array<{x: number, y: number}>} */
    const points = [];

    if (!isFullCircle) {
      points.push({ x: x0, y: y0 });
    }

    const startAngle = centerAngleRad - fovRad * 0.5;
    const divisor = isFullCircle ? count : count - 1;

    for (let i = 0; i < count; i++) {
      const ang = startAngle + (fovRad * i) / divisor;
      const hit = Raycast.castRay(level, x0, y0, ang, rangeTiles);
      points.push({ x: hit.x, y: hit.y });
    }

    return points;
  }
}
