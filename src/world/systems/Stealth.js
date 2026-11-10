/**
 * @fileoverview Contextual stealth actions (takedown, terminal hack, cover enter/exit, level exit)
 * and checkpoint / alarm respawn management.
 */

import { STEALTH } from '../../config.js';

export class StealthSystem {
  /**
   * Determine the highest-priority contextual action currently available to VU1FRA.
   * @param {import('../Level.js').Level} level
   * @param {boolean} anySeeingHero
   * @returns {{
   *   type: 'NONE'|'TAKEDOWN'|'HACK'|'COVER_ENTER'|'COVER_EXIT'|'EXIT',
   *   target: any,
   *   labelKey: string,
   *   blockedReasonKey?: string
   * }}
   */
  static findContextualAction(level, anySeeingHero) {
    if (!level || !level.hero) {
      return { type: 'NONE', target: null, labelKey: '' };
    }
    const hero = level.hero;

    if (hero.shadowDissolved || hero.takedownTimer > 0 || hero.caught) {
      return { type: 'NONE', target: null, labelKey: '' };
    }

    if (hero.inCover) {
      return {
        type: 'COVER_EXIT',
        target: hero.activeCover,
        labelKey: 'hud.actionCoverExit'
      };
    }

    // 1. Silent non-lethal takedown from behind an unalerted guard within ~1.35 tiles
    for (const g of level.guards) {
      if (g.state === 'DOWNED' || g.state === 'ALERTED') continue;
      const dx = g.x - hero.x;
      const dy = Math.abs(g.y - hero.y);
      const dist = Math.abs(dx);
      // Hero is behind the guard (or within close ambush range while guard isn't looking at hero)
      const isBehind = Math.sign(hero.x - g.x) === -g.facing || g.suspicion < 0.45;
      if (dist <= STEALTH.takedownRangeTiles && dy <= 1.2 && isBehind) {
        return {
          type: 'TAKEDOWN',
          target: g,
          labelKey: 'hud.actionTakedown'
        };
      }
    }

    // 2. Hacking terminal within 1.4 tiles
    for (const term of level.terminals) {
      if (term.solved) continue;
      const d = Math.hypot(term.x - hero.x, term.y - hero.y);
      if (d <= 1.45) {
        return {
          type: 'HACK',
          target: term,
          labelKey: 'hud.actionHack',
          blockedReasonKey: anySeeingHero ? 'hud.tooDangerous' : undefined
        };
      }
    }

    // 3. Level Exit gate when all required terminals are solved
    if (level.exit) {
      const dExit = Math.hypot(level.exit.x - hero.x, level.exit.y - hero.y);
      if (dExit <= 1.65 && level.areAllTerminalsSolved()) {
        return {
          type: 'EXIT',
          target: level.exit,
          labelKey: 'hud.actionExit'
        };
      }
    }

    // 4. Foreground Cover Spot within 1.15 tiles
    for (const cov of level.coverSpots) {
      const d = Math.hypot(cov.x - hero.x, cov.y - hero.y);
      if (d <= 1.15) {
        return {
          type: 'COVER_ENTER',
          target: cov,
          labelKey: 'hud.actionCoverEnter'
        };
      }
    }

    return { type: 'NONE', target: null, labelKey: '' };
  }

  /**
   * Check and activate nearby checkpoints automatically as VU1FRA passes them.
   * @param {import('../Level.js').Level} level
   * @param {import('../../core/EventBus.js').EventBus} events
   */
  static updateCheckpoints(level, events) {
    const hero = level.hero;
    for (const cp of level.checkpoints) {
      if (!cp.active && Math.hypot(cp.x - hero.x, cp.y - hero.y) <= 1.6) {
        for (const other of level.checkpoints) other.active = false;
        cp.active = true;
        level.activeCheckpoint = { x: cp.x, y: cp.y };
        events.emit('level:checkpoint', { id: cp.id, x: cp.x, y: cp.y });
      }
    }
  }
}
