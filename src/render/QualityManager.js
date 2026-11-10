/**
 * @fileoverview Adaptive quality manager (HIGH / MED / LOW) and render scale controller (0.6 - 1.0).
 */

import { GAME_CONFIG } from '../config.js';

export class QualityManager {
  constructor() {
    this.mode = 'AUTO'; // 'AUTO' | 'HIGH' | 'MED' | 'LOW'
    this.activeTier = 'HIGH';
    this.renderScale = 1.0;
    this.slowFrames = 0;
    this.fastFrames = 0;
  }

  setMode(mode) {
    this.mode = mode;
    if (mode !== 'AUTO') {
      this.activeTier = mode;
      this.renderScale = mode === 'HIGH' ? 1.0 : mode === 'MED' ? 0.85 : 0.68;
    }
  }

  /**
   * Update quality tier and render scale from smoothed frame time (in ms).
   * @param {number} avgFrameMs
   */
  update(avgFrameMs) {
    if (this.mode !== 'AUTO') return;

    if (avgFrameMs > 22.0) {
      this.slowFrames++;
      this.fastFrames = 0;
      if (this.slowFrames > 45) {
        this.slowFrames = 0;
        if (this.activeTier === 'HIGH') {
          this.activeTier = 'MED';
          this.renderScale = 0.85;
        } else if (this.activeTier === 'MED') {
          this.activeTier = 'LOW';
          this.renderScale = Math.max(GAME_CONFIG.minRenderScale, 0.68);
        }
      }
    } else if (avgFrameMs < 15.0) {
      this.fastFrames++;
      this.slowFrames = 0;
      if (this.fastFrames > 180) {
        this.fastFrames = 0;
        if (this.activeTier === 'LOW') {
          this.activeTier = 'MED';
          this.renderScale = 0.85;
        } else if (this.activeTier === 'MED') {
          this.activeTier = 'HIGH';
          this.renderScale = GAME_CONFIG.maxRenderScale;
        }
      }
    }
  }

  getEffectiveDpr() {
    const rawDpr = Math.min(window.devicePixelRatio || 1, GAME_CONFIG.maxDpr);
    return Math.max(0.6, rawDpr * this.renderScale);
  }

  enableBloom() {
    return this.activeTier === 'HIGH';
  }

  enableGrain() {
    return this.activeTier !== 'LOW';
  }

  getRayCount() {
    return this.activeTier === 'HIGH' ? 36 : this.activeTier === 'MED' ? 24 : 16;
  }
}
