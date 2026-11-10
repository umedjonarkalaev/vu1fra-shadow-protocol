/**
 * @fileoverview Corporate security guard entity with 5-state AI machine:
 * CALM -> CURIOUS -> SEARCHING -> ALERTED -> RETURN (plus non-lethal DOWNED state).
 */

import { STEALTH } from '../../config.js';

export class Guard {
  /**
   * @param {{
   *   id: string,
   *   x: number,
   *   y: number,
   *   patrol: Array<{x: number, y?: number}>,
   *   facing?: number,
   *   speed?: number
   * }} def
   */
  constructor(def) {
    this.id = def.id;
    this.spawnX = def.x;
    this.spawnY = def.y;
    this.x = def.x;
    this.y = def.y;
    this.patrol = def.patrol && def.patrol.length > 0 ? def.patrol : [{ x: def.x }];
    this.patrolIndex = 0;
    this.facing = def.facing || 1;
    this.baseSpeed = def.speed || 1.65;

    /** @type {'CALM'|'CURIOUS'|'SEARCHING'|'ALERTED'|'RETURN'|'DOWNED'} */
    this.state = 'CALM';
    this.suspicion = 0;
    this.stateTimer = 0;
    this.investigateX = def.x;
    this.walkCycle = 0;
    this.aimAngleRad = this.facing > 0 ? 0 : Math.PI;
    this.noticedDownedGuardIds = new Set();
  }

  reset() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.patrolIndex = 0;
    this.state = 'CALM';
    this.suspicion = 0;
    this.stateTimer = 0;
    this.walkCycle = 0;
    this.noticedDownedGuardIds.clear();
  }

  /**
   * Trigger investigation of a sound or visual anomaly at world X.
   * @param {number} targetX
   */
  investigatePoint(targetX) {
    if (this.state === 'DOWNED' || this.state === 'ALERTED') return;
    this.investigateX = targetX;
    this.facing = targetX >= this.x ? 1 : -1;
    if (this.state === 'CALM' || this.state === 'RETURN') {
      this.state = 'CURIOUS';
      this.stateTimer = STEALTH.curiousPauseSec;
      this.suspicion = Math.max(this.suspicion, STEALTH.curiousThreshold + 0.05);
    } else if (this.state === 'CURIOUS') {
      this.state = 'SEARCHING';
      this.stateTimer = STEALTH.searchDurationSec;
      this.suspicion = Math.max(this.suspicion, STEALTH.searchingThreshold);
    }
  }

  /**
   * Perform non-lethal silent takedown from behind.
   */
  knockOut() {
    this.state = 'DOWNED';
    this.suspicion = 0;
  }

  /**
   * Advance guard patrol & state machine.
   * @param {number} dt
   * @param {import('../Level.js').Level} level
   */
  update(dt, level) {
    if (this.state === 'DOWNED') return;

    this.aimAngleRad = this.facing > 0 ? 0 : Math.PI;

    // State transitions driven by suspicion level
    if (this.suspicion >= STEALTH.alertThreshold) {
      this.state = 'ALERTED';
    } else if (this.suspicion >= STEALTH.searchingThreshold && this.state === 'CALM') {
      this.state = 'SEARCHING';
      this.stateTimer = STEALTH.searchDurationSec;
      this.investigateX = level.hero.x;
    } else if (this.suspicion >= STEALTH.curiousThreshold && this.state === 'CALM') {
      this.state = 'CURIOUS';
      this.stateTimer = STEALTH.curiousPauseSec;
      this.investigateX = level.hero.x;
    }

    switch (this.state) {
      case 'CALM': {
        if (this.patrol.length <= 1) {
          // Stationary lookout that glances back and forth slowly
          this.stateTimer += dt;
          if (this.stateTimer > 4.2) {
            this.stateTimer = 0;
            this.facing *= -1;
          }
        } else {
          const target = this.patrol[this.patrolIndex];
          const moved = this.moveTowardX(target.x, this.baseSpeed, dt, level);
          if (!moved) {
            this.stateTimer += dt;
            if (this.stateTimer >= 1.1) {
              this.stateTimer = 0;
              this.patrolIndex = (this.patrolIndex + 1) % this.patrol.length;
            }
          }
        }
        break;
      }

      case 'CURIOUS': {
        this.facing = this.investigateX >= this.x ? 1 : -1;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          if (this.suspicion >= STEALTH.searchingThreshold) {
            this.state = 'SEARCHING';
            this.stateTimer = STEALTH.searchDurationSec;
          } else {
            this.state = 'RETURN';
          }
        }
        break;
      }

      case 'SEARCHING': {
        const reached = !this.moveTowardX(this.investigateX, this.baseSpeed * 1.35, dt, level);
        if (reached) {
          this.stateTimer -= dt;
          // Look left and right while searching
          if (Math.floor(this.stateTimer * 1.5) % 2 === 0) {
            this.facing = 1;
          } else {
            this.facing = -1;
          }
          if (this.stateTimer <= 0 && this.suspicion < STEALTH.searchingThreshold) {
            this.state = 'RETURN';
          }
        }
        break;
      }

      case 'RETURN': {
        const home = this.patrol[this.patrolIndex] || { x: this.spawnX };
        const moving = this.moveTowardX(home.x, this.baseSpeed, dt, level);
        if (!moving) {
          this.state = 'CALM';
          this.stateTimer = 0;
        }
        break;
      }

      case 'ALERTED': {
        this.facing = level.hero.x >= this.x ? 1 : -1;
        break;
      }
    }
  }

  /**
   * Move horizontally toward targetX while staying on standable floor tiles (never walks into walls or off cliffs).
   */
  moveTowardX(targetX, speed, dt, level) {
    const dx = targetX - this.x;
    if (Math.abs(dx) <= 0.14) {
      return false;
    }
    const dir = Math.sign(dx);
    this.facing = dir;
    const nextX = this.x + dir * speed * dt;

    // Ensure next position does not walk into a solid wall or off an unguarded ledge
    const probeWallTx = Math.floor(nextX + dir * 0.35);
    const bodyTy = Math.floor(this.y - 0.8);
    const floorTy = Math.floor(this.y + 0.1);

    if (level.isSolidAt(probeWallTx, bodyTy)) {
      return false;
    }
    const hasFloor =
      level.isSolidAt(Math.floor(nextX), floorTy) ||
      level.isOneWayAt(Math.floor(nextX), floorTy);
    if (!hasFloor) {
      return false;
    }

    this.x = nextX;
    this.walkCycle += speed * dt * 4.2;
    return true;
  }

  getLightConeEmitter() {
    if (this.state === 'DOWNED') return null;
    return {
      x: this.x + this.facing * 0.25,
      y: this.y - 1.15,
      angleRad: this.facing > 0 ? 0 : Math.PI,
      fovDeg: STEALTH.guardFovDeg,
      range: STEALTH.guardRangeTiles,
      color: this.state === 'ALERTED' ? 'crimson' : 'amber'
    };
  }
}
