/**
 * @fileoverview Autonomous hovering surveillance drone patrolling between 2D waypoints with a searchlight cone.
 */

import { STEALTH } from '../../config.js';

export class Drone {
  /**
   * @param {{
   *   id: string,
   *   x: number,
   *   y: number,
   *   patrol: Array<{x: number, y: number}>,
   *   speed?: number,
   *   aimAngleDeg?: number
   * }} def
   */
  constructor(def) {
    this.id = def.id;
    this.spawnX = def.x;
    this.spawnY = def.y;
    this.x = def.x;
    this.y = def.y;
    this.patrol = def.patrol && def.patrol.length > 0 ? def.patrol : [{ x: def.x, y: def.y }];
    this.patrolIndex = 0;
    this.speed = def.speed || 2.1;
    this.baseAimRad = ((def.aimAngleDeg ?? 90) * Math.PI) / 180;
    this.aimAngleRad = this.baseAimRad;

    this.state = 'CALM';
    this.suspicion = 0;
    this.pauseTimer = 0;
  }

  reset() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.patrolIndex = 0;
    this.state = 'CALM';
    this.suspicion = 0;
    this.pauseTimer = 0;
  }

  update(dt, clockSec) {
    if (this.suspicion >= STEALTH.alertThreshold) {
      this.state = 'ALERTED';
    } else if (this.suspicion >= STEALTH.curiousThreshold) {
      this.state = 'SEARCHING';
    } else {
      this.state = 'CALM';
    }

    // Gently sweep searchlight cone downward
    this.aimAngleRad = this.baseAimRad + Math.sin(clockSec * 1.4) * 0.32;

    if (this.patrol.length <= 1) return;
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      return;
    }

    const target = this.patrol[this.patrolIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= 0.12) {
      this.pauseTimer = 0.8;
      this.patrolIndex = (this.patrolIndex + 1) % this.patrol.length;
      return;
    }

    const step = Math.min(dist, this.speed * dt);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }

  getLightConeEmitter() {
    return {
      x: this.x,
      y: this.y + 0.1,
      angleRad: this.aimAngleRad,
      fovDeg: STEALTH.droneFovDeg,
      range: STEALTH.droneRangeTiles,
      color: this.state === 'ALERTED' ? 'crimson' : 'amber'
    };
  }
}
