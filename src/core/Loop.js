/**
 * @fileoverview Fixed-timestep simulation + variable render loop with clamped dt and hitstop support.
 */

import { PHYSICS } from '../config.js';
import { logger } from './Logger.js';

export class Loop {
  /**
   * @param {(simDt: number) => void} onFixedUpdate
   * @param {(realDt: number, alpha: number) => void} onRender
   * @param {(err: any) => void} [onError]
   */
  constructor(onFixedUpdate, onRender, onError) {
    this.onFixedUpdate = onFixedUpdate;
    this.onRender = onRender;
    this.onError = onError;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;
    this.accumulator = 0;
    this.timeScale = 1.0;
    this.hitstopTimer = 0;
    this.clock = 0;
    this.frameTimeMs = 16.6;

    this.boundTick = this.tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.scheduleNextFrame();
  }

  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      clearTimeout(this.rafId);
      this.rafId = 0;
    }
  }

  scheduleNextFrame() {
    if (!this.running) return;
    if (typeof navigator !== 'undefined' && navigator.webdriver) {
      this.rafId = window.setTimeout(() => this.boundTick(performance.now()), 120);
    } else {
      this.rafId = requestAnimationFrame(this.boundTick);
    }
  }

  /**
   * Trigger a short hitstop freeze (in seconds) while rendering continues.
   * @param {number} durationSec
   */
  triggerHitstop(durationSec = 0.05) {
    this.hitstopTimer = Math.max(this.hitstopTimer, durationSec);
  }

  /**
   * @param {number} now
   */
  tick(now) {
    if (!this.running) return;
    const rawMs = now - this.lastTime;
    this.lastTime = now;
    this.frameTimeMs = this.frameTimeMs * 0.9 + Math.min(rawMs, 100) * 0.1;

    // Clamp dt to <= 50ms (100ms hard ceiling) so tab switches never tunnel entities
    const realDt = Math.min(Math.max(rawMs / 1000, 0.001), PHYSICS.maxFrameDt);
    this.clock += realDt;

    try {
      if (this.hitstopTimer > 0) {
        this.hitstopTimer = Math.max(0, this.hitstopTimer - realDt);
      } else {
        const scaledDt = realDt * this.timeScale;
        this.accumulator += scaledDt;
        let steps = 0;
        while (this.accumulator >= PHYSICS.fixedDt && steps < PHYSICS.subStepsMax) {
          this.onFixedUpdate(PHYSICS.fixedDt);
          this.accumulator -= PHYSICS.fixedDt;
          steps++;
        }
        if (steps >= PHYSICS.subStepsMax) {
          this.accumulator = 0;
        }
      }

      const alpha = this.accumulator / PHYSICS.fixedDt;
      this.onRender(realDt, alpha);
    } catch (err) {
      logger.error('Uncaught error in game loop', err);
      this.stop();
      if (this.onError) this.onError(err);
      return;
    }

    this.scheduleNextFrame();
  }
}
