/**
 * @fileoverview Wall/ceiling security camera sweeping between minAngleDeg and maxAngleDeg.
 */

import { STEALTH } from '../../config.js';

export class SecurityCamera {
  /**
   * @param {{
   *   id: string,
   *   x: number,
   *   y: number,
   *   minAngleDeg?: number,
   *   maxAngleDeg?: number,
   *   sweepSpeed?: number
   * }} def
   */
  constructor(def) {
    this.id = def.id;
    this.x = def.x;
    this.y = def.y;
    this.minAngleRad = ((def.minAngleDeg ?? 35) * Math.PI) / 180;
    this.maxAngleRad = ((def.maxAngleDeg ?? 145) * Math.PI) / 180;
    this.sweepSpeed = def.sweepSpeed || 0.75;
    this.aimAngleRad = (this.minAngleRad + this.maxAngleRad) * 0.5;
    this.state = 'CALM';
    this.suspicion = 0;
  }

  reset() {
    this.state = 'CALM';
    this.suspicion = 0;
  }

  update(dt, clockSec) {
    if (this.suspicion >= STEALTH.alertThreshold) {
      this.state = 'ALERTED';
    } else if (this.suspicion >= STEALTH.curiousThreshold) {
      this.state = 'SEARCHING';
    } else {
      this.state = 'CALM';
    }

    const mid = (this.minAngleRad + this.maxAngleRad) * 0.5;
    const halfSpan = (this.maxAngleRad - this.minAngleRad) * 0.5;
    this.aimAngleRad = mid + Math.sin(clockSec * this.sweepSpeed) * halfSpan;
  }

  getLightConeEmitter() {
    return {
      x: this.x,
      y: this.y,
      angleRad: this.aimAngleRad,
      fovDeg: STEALTH.cameraFovDeg,
      range: STEALTH.cameraRangeTiles,
      color: this.state === 'ALERTED' ? 'crimson' : 'cyan'
    };
  }
}
