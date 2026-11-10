/**
 * @fileoverview Analytical physics capability queries used by gameplay and LevelValidator.
 */

import { PHYSICS } from '../config.js';

export class PhysicsCapabilities {
  /**
   * Maximum vertical rise achievable from a standard jump + ledge auto-mantle.
   */
  static getMaxSingleJumpRise() {
    return PHYSICS.jumpHeight + PHYSICS.mantleTolerance;
  }

  /**
   * Maximum vertical rise achievable via a wall-run + wall-jump + mantle sequence.
   */
  static getMaxWallRunClimbRise() {
    return PHYSICS.jumpHeight + PHYSICS.wallRunMaxHeightTiles + PHYSICS.jumpHeight + PHYSICS.mantleTolerance;
  }

  /**
   * Maximum horizontal gap crossable via a sprint jump across a drop `dy` (positive if landing lower).
   * @param {number} dy
   */
  static getMaxSprintJumpHorizontalDistance(dy = 0) {
    const tUp = PHYSICS.jumpVelocity / PHYSICS.gravity;
    const peakDrop = Math.max(0.1, PHYSICS.jumpHeight + Math.max(0, dy));
    const tDown = Math.sqrt((2 * peakDrop) / PHYSICS.gravity);
    const airtime = tUp + tDown + PHYSICS.coyoteTime;
    return PHYSICS.sprintSpeed * airtime + 1.2; // Includes body width & ledge mantle margin
  }

  /**
   * Analytically verify whether a transition from node A to node B on a level's critical path
   * is physically feasible with VU1FRA's real movement constants.
   * @param {{x: number, y: number, mode?: string}} a
   * @param {{x: number, y: number, mode?: string}} b
   * @returns {{feasible: boolean, reason?: string}}
   */
  static canTraverseSegment(a, b) {
    const dx = Math.abs(b.x - a.x);
    const dy = b.y - a.y; // Negative dy means climbing UP (since y increases downward)
    const rise = -dy;
    const mode = b.mode || 'walk';

    if (mode === 'wall_run' || mode === 'wall_jump') {
      const maxClimb = PhysicsCapabilities.getMaxWallRunClimbRise();
      if (rise > maxClimb) {
        return {
          feasible: false,
          reason: `Rise ${rise.toFixed(2)} exceeds max wall-run climb ${maxClimb.toFixed(2)}`
        };
      }
      if (dx > 16) {
        return {
          feasible: false,
          reason: `Horizontal span ${dx.toFixed(2)} too wide for wall shaft segment`
        };
      }
      return { feasible: true };
    }

    // Standard walk/jump/sprint-jump segment
    const maxJumpRise = PhysicsCapabilities.getMaxSingleJumpRise();
    if (rise > maxJumpRise) {
      return {
        feasible: false,
        reason: `Rise ${rise.toFixed(2)} exceeds single jump + mantle limit ${maxJumpRise.toFixed(2)}`
      };
    }

    if (mode === 'jump') {
      const maxHoriz = PhysicsCapabilities.getMaxSprintJumpHorizontalDistance(dy);
      if (dx > maxHoriz) {
        return {
          feasible: false,
          reason: `Jump gap ${dx.toFixed(2)} exceeds max sprint jump reach ${maxHoriz.toFixed(2)}`
        };
      }
    }

    return { feasible: true };
  }
}
