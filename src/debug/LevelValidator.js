/**
 * @fileoverview Analytical LevelValidator (runs in dev + prod).
 * Checks:
 * - Spawn, exit, and terminals exist and are in bounds
 * - No entity is inside solid tiles
 * - Guard patrol waypoints sit on standable floor tiles
 * - Referenced puzzleIds exist and pass schema validation
 * - Critical path segments are physically feasible against VU1FRA's real physics constants
 */

import { PhysicsCapabilities } from '../world/Physics.js';
import { puzzleRegistry } from '../puzzles/PuzzleRegistry.js';

export class LevelValidator {
  /**
   * Validate a raw level definition against chapter puzzles.
   * @param {any} levelDef
   * @param {Record<string, any>} [chapterPuzzles={}]
   * @returns {{valid: boolean, errors: string[], warnings: string[]}}
   */
  static validate(levelDef, chapterPuzzles = {}) {
    const errors = [];
    const warnings = [];

    if (!levelDef || typeof levelDef !== 'object') {
      return { valid: false, errors: ['Level definition is missing'], warnings };
    }

    const rows = levelDef.rows || [];
    const H = rows.length;
    const W = rows[0] ? rows[0].length : 0;

    if (W < 20 || H < 8) {
      errors.push(`Level "${levelDef.id}" has invalid dimensions ${W}x${H}`);
      return { valid: false, errors, warnings };
    }

    for (let y = 0; y < H; y++) {
      if (rows[y].length !== W) {
        errors.push(`Row ${y} in "${levelDef.id}" has length ${rows[y].length} != ${W}`);
      }
    }

    const getTile = (tx, ty) => {
      if (ty < 0 || ty >= H || tx < 0 || tx >= W) return '#';
      return rows[ty][tx] || '.';
    };
    const isSolid = (tx, ty) => {
      const ch = getTile(tx, ty);
      return ch === '#' || ch === 'W';
    };
    const isStandableFloor = (tx, ty) => {
      const ch = getTile(tx, ty);
      return ch === '#' || ch === 'W' || ch === '-';
    };

    const checkPointNotInSolid = (label, pt) => {
      if (!pt || typeof pt.x !== 'number' || typeof pt.y !== 'number') {
        errors.push(`${label} is missing coordinates`);
        return;
      }
      if (pt.x <= 0 || pt.x >= W - 1 || pt.y <= 0 || pt.y >= H) {
        errors.push(`${label} (${pt.x}, ${pt.y}) is out of bounds`);
        return;
      }
      if (isSolid(Math.floor(pt.x), Math.floor(pt.y - 0.5))) {
        errors.push(`${label} (${pt.x}, ${pt.y}) is inside a solid tile`);
      }
    };

    // 1. Spawn & Exit
    checkPointNotInSolid('spawn', levelDef.spawn);
    checkPointNotInSolid('exit', levelDef.exit);

    // 2. Guards & patrol waypoints
    for (const g of levelDef.guards || []) {
      checkPointNotInSolid(`guard:${g.id}`, g);
      for (const wp of g.patrol || []) {
        const wx = wp.x;
        const wy = wp.y ?? g.y;
        if (isSolid(Math.floor(wx), Math.floor(wy - 0.5))) {
          errors.push(`guard:${g.id} waypoint (${wx}, ${wy}) is inside solid`);
        }
        if (!isStandableFloor(Math.floor(wx), Math.floor(wy + 0.1))) {
          errors.push(`guard:${g.id} waypoint (${wx}, ${wy}) is not on a standable tile`);
        }
      }
    }

    // 3. Drones
    for (const d of levelDef.drones || []) {
      checkPointNotInSolid(`drone:${d.id}`, d);
    }

    // 4. Terminals & referenced puzzle IDs
    for (const t of levelDef.terminals || []) {
      checkPointNotInSolid(`terminal:${t.id}`, t);
      if (!t.puzzleId) {
        errors.push(`terminal:${t.id} missing puzzleId`);
      } else if (chapterPuzzles && Object.keys(chapterPuzzles).length > 0) {
        const pz = chapterPuzzles[t.puzzleId];
        if (!pz) {
          errors.push(`terminal:${t.id} references unknown puzzleId "${t.puzzleId}"`);
        } else {
          const pzRes = puzzleRegistry.validateInstance(pz);
          if (!pzRes.valid) {
            errors.push(...pzRes.errors);
          }
        }
      }
    }

    // 5. Critical path analytical physics verification
    const path = levelDef.criticalPath || [];
    if (path.length < 2) {
      warnings.push(`Level "${levelDef.id}" has fewer than 2 criticalPath nodes`);
    } else {
      for (let i = 1; i < path.length; i++) {
        const prev = path[i - 1];
        const cur = path[i];
        const check = PhysicsCapabilities.canTraverseSegment(prev, cur);
        if (!check.feasible) {
          errors.push(
            `Critical path segment ${i - 1}->${i} in "${levelDef.id}" infeasible: ${check.reason}`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
