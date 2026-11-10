/**
 * @fileoverview Viewport-adaptive 2D camera showing ~10.5 vertical tiles and extending horizontally
 * across 16:9 to 21:9 aspect ratios with zero black bars. Includes breathing drift and trauma shake.
 */

import { GAME_CONFIG } from '../config.js';

export class Camera {
  constructor() {
    this.x = 0; // Left edge in world tiles
    this.y = 0; // Top edge in world tiles
    this.viewWidthTiles = 18.6;
    this.viewHeightTiles = GAME_CONFIG.visibleVerticalTiles;
    this.tileScale = 48; // Pixels per world tile
    this.trauma = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this.driftTime = 0;
  }

  /**
   * Update viewport dimensions in pixels.
   * @param {number} canvasWidthPx
   * @param {number} canvasHeightPx
   */
  resize(canvasWidthPx, canvasHeightPx) {
    const safeH = Math.max(120, canvasHeightPx);
    const safeW = Math.max(160, canvasWidthPx);
    this.viewHeightTiles = GAME_CONFIG.visibleVerticalTiles;
    this.tileScale = safeH / this.viewHeightTiles;
    this.viewWidthTiles = safeW / this.tileScale;
  }

  addTrauma(amount) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  /**
   * Smoothly follow a target position in world tiles, clamped to level bounds.
   * @param {number} targetX
   * @param {number} targetY
   * @param {number} facing
   * @param {number} levelWidth
   * @param {number} levelHeight
   * @param {number} dt
   * @param {boolean} reduceMotion
   */
  follow(targetX, targetY, facing, levelWidth, levelHeight, dt, reduceMotion = false) {
    this.driftTime += dt;
    const lookAheadX = facing * 1.4;
    const breathX = reduceMotion ? 0 : Math.sin(this.driftTime * 0.9) * 0.08;
    const breathY = reduceMotion ? 0 : Math.cos(this.driftTime * 1.1) * 0.06;

    const desiredX = targetX + lookAheadX - this.viewWidthTiles * 0.5 + breathX;
    const desiredY = targetY - 1.2 - this.viewHeightTiles * 0.5 + breathY;

    const smooth = 1 - Math.exp(-7.5 * dt);
    this.x += (desiredX - this.x) * smooth;
    this.y += (desiredY - this.y) * smooth;

    const maxX = Math.max(0, levelWidth - this.viewWidthTiles);
    const maxY = Math.max(0, levelHeight - this.viewHeightTiles);
    this.x = Math.max(0, Math.min(maxX, this.x));
    this.y = Math.max(0, Math.min(maxY, this.y));

    if (this.trauma > 0 && !reduceMotion) {
      const shake = this.trauma * this.trauma * 0.28;
      this.shakeOffsetX = (Math.random() * 2 - 1) * shake;
      this.shakeOffsetY = (Math.random() * 2 - 1) * shake;
      this.trauma = Math.max(0, this.trauma - dt * 1.8);
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      this.trauma = 0;
    }
  }

  /**
   * Convert world tile X to screen pixels.
   * @param {number} wx
   */
  worldToScreenX(wx) {
    return (wx - (this.x + this.shakeOffsetX)) * this.tileScale;
  }

  /**
   * Convert world tile Y to screen pixels.
   * @param {number} wy
   */
  worldToScreenY(wy) {
    return (wy - (this.y + this.shakeOffsetY)) * this.tileScale;
  }
}
