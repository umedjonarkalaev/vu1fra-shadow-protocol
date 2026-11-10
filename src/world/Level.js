/**
 * @fileoverview Data-driven Level representation instantiated from pure level data definitions.
 * Legend:
 *   '.' = empty air
 *   '#' = solid rooftop/building tile (wall-clingable)
 *   'W' = runnable vertical shaft wall tile (wall-run + wall-jump)
 *   '-' = one-way platform ledge
 */

import { Hero } from './entities/Hero.js';
import { Guard } from './entities/Guard.js';
import { Drone } from './entities/Drone.js';
import { SecurityCamera } from './entities/SecurityCamera.js';
import { Terminal } from './entities/Terminal.js';
import { CoverSpot } from './entities/CoverSpot.js';
import { Checkpoint } from './entities/Checkpoint.js';
import { logger } from '../core/Logger.js';

export class Level {
  /**
   * @param {any} data
   */
  constructor(data) {
    this.id = data.id;
    this.titleRu = data.titleRu || data.id;
    this.subtitleRu = data.subtitleRu || '';
    this.objectiveTextRu = data.objectiveTextRu || '';
    this.exitObjectiveTextRu = data.exitObjectiveTextRu || '';
    this.rows = data.rows || [];
    this.height = this.rows.length;
    this.width = this.rows[0] ? this.rows[0].length : 0;

    this.spawn = { x: data.spawn?.x ?? 3, y: data.spawn?.y ?? 9 };
    this.exit = data.exit ? { x: data.exit.x, y: data.exit.y } : null;
    this.activeCheckpoint = { x: this.spawn.x, y: this.spawn.y };

    this.lights = (data.lights || []).map((l) => ({ ...l }));
    this.shadowZones = (data.shadowZones || []).map((sz) => ({ ...sz }));
    this.props = (data.props || []).map((p) => ({ ...p }));
    this.tutorialHints = (data.tutorialHints || []).map((h) => ({ ...h }));
    this.criticalPath = (data.criticalPath || []).map((n) => ({ ...n }));
    this.midComicAfterTerminalId = data.midComicAfterTerminalId || null;

    this.hero = new Hero(this.spawn.x, this.spawn.y);

    // Filter out any malformed entities safely in production
    this.guards = [];
    for (const gDef of data.guards || []) {
      if (this.isValidEntityPos(gDef.x, gDef.y)) {
        this.guards.push(new Guard(gDef));
      } else {
        logger.warn(`[Level:${this.id}] Skipping guard "${gDef.id}" inside solid or out of bounds`);
      }
    }

    this.drones = [];
    for (const dDef of data.drones || []) {
      if (this.isValidEntityPos(dDef.x, dDef.y)) {
        this.drones.push(new Drone(dDef));
      } else {
        logger.warn(`[Level:${this.id}] Skipping drone "${dDef.id}" inside solid or out of bounds`);
      }
    }

    this.cameras = [];
    for (const cDef of data.cameras || []) {
      if (this.isInBounds(cDef.x, cDef.y)) {
        this.cameras.push(new SecurityCamera(cDef));
      }
    }

    this.terminals = (data.terminals || []).map((tDef) => new Terminal(tDef));
    this.coverSpots = (data.coverSpots || []).map((cDef) => new CoverSpot(cDef));
    this.checkpoints = (data.checkpoints || []).map((cpDef) => new Checkpoint(cpDef));
  }

  isInBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  isValidEntityPos(x, y) {
    if (!this.isInBounds(x, y - 0.5)) return false;
    return !this.isSolidAt(Math.floor(x), Math.floor(y - 0.5));
  }

  /**
   * @param {number} tx
   * @param {number} ty
   * @returns {string}
   */
  getTileAt(tx, ty) {
    if (ty < 0) return '.';
    if (ty >= this.height || tx < 0 || tx >= this.width) return '#';
    return this.rows[ty][tx] || '.';
  }

  /**
   * @param {number} tx
   * @param {number} ty
   * @returns {boolean}
   */
  isSolidAt(tx, ty) {
    const ch = this.getTileAt(tx, ty);
    return ch === '#' || ch === 'W';
  }

  /**
   * @param {number} tx
   * @param {number} ty
   * @returns {boolean}
   */
  isOneWayAt(tx, ty) {
    return this.getTileAt(tx, ty) === '-';
  }

  /**
   * @param {number} wx
   * @param {number} wy
   * @returns {boolean}
   */
  isInShadowZone(wx, wy) {
    for (const sz of this.shadowZones) {
      if (wx >= sz.x && wx <= sz.x + sz.w && wy >= sz.y && wy <= sz.y + sz.h) {
        return true;
      }
    }
    return false;
  }

  areAllTerminalsSolved() {
    return this.terminals.every((t) => t.solved);
  }

  /**
   * Respawn VU1FRA and reset enemy patrols to calm at the last active checkpoint.
   */
  respawnAtCheckpoint() {
    this.hero.resetAt(this.activeCheckpoint.x, this.activeCheckpoint.y);
    for (const g of this.guards) {
      if (g.state !== 'DOWNED') {
        g.reset();
      }
    }
    for (const d of this.drones) d.reset();
    for (const c of this.cameras) c.reset();
  }

  /**
   * Gather active dynamic light emitters from guards, drones, and cameras.
   */
  getDynamicLightEmitters() {
    const list = [];
    for (const g of this.guards) {
      const em = g.getLightConeEmitter();
      if (em) list.push(em);
    }
    for (const d of this.drones) {
      const em = d.getLightConeEmitter();
      if (em) list.push(em);
    }
    for (const c of this.cameras) {
      const em = c.getLightConeEmitter();
      if (em) list.push(em);
    }
    return list;
  }
}
