/**
 * @fileoverview Enemy vision cone and perception system implementing the exact detection formula:
 * rate = base * lightFactor * distanceFactor * postureFactor * coverFactor.
 * Also handles guards spotting downed guards and acoustic noise events.
 */

import { STEALTH } from '../../config.js';
import { Raycast } from '../Raycast.js';

export class PerceptionSystem {
  /**
   * Update suspicion for all guards, drones, and cameras in the level.
   * @param {import('../Level.js').Level} level
   * @param {boolean} isHeroLit
   * @param {number} dt
   * @param {boolean} godMode
   * @returns {{anySeeingHero: boolean, maxSuspicion: number, triggeredAlarm: boolean}}
   */
  static update(level, isHeroLit, dt, godMode = false) {
    if (godMode) {
      for (const g of level.guards) g.suspicion = 0;
      for (const d of level.drones) d.suspicion = 0;
      for (const c of level.cameras) c.suspicion = 0;
      return { anySeeingHero: false, maxSuspicion: 0, triggeredAlarm: false };
    }

    const hero = level.hero;
    const heroTargetX = hero.x;
    const heroTargetY = hero.y - hero.height * 0.55;

    let anySeeingHero = false;
    let maxSuspicion = 0;
    let triggeredAlarm = false;

    // 1. Guards
    for (const guard of level.guards) {
      if (guard.state === 'DOWNED') continue;

      const emitter = guard.getLightConeEmitter();
      const rate = emitter
        ? PerceptionSystem.computeDetectionRate(level, emitter, hero, heroTargetX, heroTargetY, isHeroLit)
        : 0;

      if (rate > 0) {
        anySeeingHero = true;
        guard.suspicion = Math.min(1.0, guard.suspicion + rate * dt);
        guard.investigateX = hero.x;
      } else {
        guard.suspicion = Math.max(0, guard.suspicion - STEALTH.suspicionDecayRate * dt);
      }

      // Check if this guard sees any downed guard
      for (const other of level.guards) {
        if (
          other !== guard &&
          other.state === 'DOWNED' &&
          !guard.noticedDownedGuardIds.has(other.id)
        ) {
          const dist = Math.hypot(other.x - guard.x, other.y - guard.y);
          const dirOk = Math.sign(other.x - guard.x) === guard.facing;
          if (
            dist <= STEALTH.guardRangeTiles * 0.85 &&
            dirOk &&
            Raycast.hasLineOfSight(level, guard.x, guard.y - 1.1, other.x, other.y - 0.3)
          ) {
            guard.noticedDownedGuardIds.add(other.id);
            guard.state = 'SEARCHING';
            guard.stateTimer = STEALTH.searchDurationSec;
            guard.investigateX = other.x;
            guard.suspicion = Math.max(guard.suspicion, STEALTH.searchingThreshold);
          }
        }
      }

      maxSuspicion = Math.max(maxSuspicion, guard.suspicion);
      if (guard.suspicion >= STEALTH.alertThreshold) {
        triggeredAlarm = true;
      }
    }

    // 2. Drones
    for (const drone of level.drones) {
      const emitter = drone.getLightConeEmitter();
      const rate = PerceptionSystem.computeDetectionRate(
        level,
        emitter,
        hero,
        heroTargetX,
        heroTargetY,
        isHeroLit
      );

      if (rate > 0) {
        anySeeingHero = true;
        drone.suspicion = Math.min(1.0, drone.suspicion + rate * dt);
      } else {
        drone.suspicion = Math.max(0, drone.suspicion - STEALTH.suspicionDecayRate * dt);
      }
      maxSuspicion = Math.max(maxSuspicion, drone.suspicion);
      if (drone.suspicion >= STEALTH.alertThreshold) {
        triggeredAlarm = true;
      }
    }

    // 3. Security Cameras
    for (const cam of level.cameras) {
      const emitter = cam.getLightConeEmitter();
      const rate = PerceptionSystem.computeDetectionRate(
        level,
        emitter,
        hero,
        heroTargetX,
        heroTargetY,
        isHeroLit
      );

      if (rate > 0) {
        anySeeingHero = true;
        cam.suspicion = Math.min(1.0, cam.suspicion + rate * dt);
      } else {
        cam.suspicion = Math.max(0, cam.suspicion - STEALTH.suspicionDecayRate * dt);
      }
      maxSuspicion = Math.max(maxSuspicion, cam.suspicion);
      if (cam.suspicion >= STEALTH.alertThreshold) {
        triggeredAlarm = true;
      }
    }

    return { anySeeingHero, maxSuspicion, triggeredAlarm };
  }

  /**
   * Compute detection rate for a single sensor cone against VU1FRA.
   */
  static computeDetectionRate(level, emitter, hero, hx, hy, isHeroLit) {
    const dx = hx - emitter.x;
    const dy = hy - emitter.y;
    const dist = Math.hypot(dx, dy);
    if (dist > emitter.range || dist < 0.01) return 0;

    // Check vision cone angle
    const angleToHero = Math.atan2(dy, dx);
    const angleDiff = Math.atan2(
      Math.sin(angleToHero - emitter.angleRad),
      Math.cos(angleToHero - emitter.angleRad)
    );
    const halfFovRad = ((emitter.fovDeg * Math.PI) / 180) * 0.5;
    if (Math.abs(angleDiff) > halfFovRad) return 0;

    // Check line of sight blocked by solid tiles
    if (!Raycast.hasLineOfSight(level, emitter.x, emitter.y, hx, hy)) {
      return 0;
    }

    // 1. coverFactor: hidden 0.0 beyond 1 tile
    let coverFactor = 1.0;
    if (hero.inCover) {
      if (dist > STEALTH.coverFactors.hiddenCloseDist) return 0;
      coverFactor = 0.65;
    }

    // 2. lightFactor: lit 1.0, shadow 0.15, dissolved 0.0 unless within 1 tile
    let lightFactor = isHeroLit ? STEALTH.lightFactors.lit : STEALTH.lightFactors.shadow;
    if (hero.shadowDissolved) {
      if (dist > STEALTH.lightFactors.dissolvedCloseDist) return 0;
      lightFactor = 0.5;
    }

    // 3. distanceFactor: closer = faster detection (ranges from 2.2 at point-blank to 0.45 at max range)
    const distanceFactor = Math.max(0.42, 2.15 - (dist / emitter.range) * 1.65);

    // 4. postureFactor: sneak/crouch 0.6, walk 1.0, sprint 1.3
    let postureFactor = STEALTH.postureFactors.walk;
    if (hero.animState === 'sprint') {
      postureFactor = STEALTH.postureFactors.sprint;
    } else if (hero.animState === 'sneak') {
      postureFactor = STEALTH.postureFactors.sneak;
    }

    return STEALTH.baseDetectionRate * lightFactor * distanceFactor * postureFactor * coverFactor;
  }

  /**
   * Propagate an acoustic noise event to all guards within radius.
   * @param {import('../Level.js').Level} level
   * @param {number} wx
   * @param {number} wy
   * @param {number} radiusTiles
   */
  static emitNoise(level, wx, wy, radiusTiles) {
    if (!level || radiusTiles <= 0.6) return;
    for (const guard of level.guards) {
      if (guard.state === 'DOWNED') continue;
      const d = Math.hypot(guard.x - wx, guard.y - wy);
      if (d <= radiusTiles) {
        guard.investigatePoint(wx);
      }
    }
  }
}
