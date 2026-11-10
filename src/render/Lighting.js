/**
 * @fileoverview Half-res light-map canvas and unified visibility/shadow evaluator.
 * Combines ambient darkness, static lights (visibility polygons baked at level load),
 * and dynamic lights (guard flashlights, drone searchlights, security cameras; max 4 active, <= 40 rays).
 * Gameplay "lit vs shadow" queries the EXACT same light sources so what the player sees is what guards see.
 */

import { Raycast } from '../world/Raycast.js';

export class LightingSystem {
  constructor() {
    this.lightCanvas = document.createElement('canvas');
    this.lightCtx = this.lightCanvas.getContext('2d');
    /** @type {Array<{x: number, y: number, radius: number, color: string, intensity: number, polygon: Array<{x: number, y: number}>}>} */
    this.staticLights = [];
    /** @type {Array<{x: number, y: number, angleRad: number, fovRad: number, range: number, color: string, polygon: Array<{x: number, y: number}>}>} */
    this.dynamicLights = [];
  }

  /**
   * Bake static point lights and visibility polygons once when a level loads.
   * @param {import('../world/Level.js').Level} level
   * @param {number} rayCount
   */
  bakeStaticLights(level, rayCount = 36) {
    this.staticLights = [];
    if (!level || !Array.isArray(level.lights)) return;

    for (const l of level.lights) {
      const poly = Raycast.computeVisibilityCone(
        level,
        l.x,
        l.y,
        0,
        Math.PI * 2,
        l.radius || 5.0,
        rayCount
      );
      this.staticLights.push({
        x: l.x,
        y: l.y,
        radius: l.radius || 5.0,
        color: l.color || 'amber',
        intensity: l.intensity ?? 0.85,
        polygon: poly
      });
    }
  }

  /**
   * Recompute dynamic light cones (max 4 closest active cones to the camera, <= 40 rays each).
   * @param {import('../world/Level.js').Level} level
   * @param {Array<{x: number, y: number, angleRad: number, fovDeg: number, range: number, color: string}>} emitters
   * @param {number} camCenterX
   * @param {number} rayCount
   */
  updateDynamicLights(level, emitters, camCenterX, rayCount = 32) {
    this.dynamicLights = [];
    if (!level || !emitters || emitters.length === 0) return;

    // Sort by distance to camera center and take top 4
    const sorted = emitters
      .slice()
      .sort((a, b) => Math.abs(a.x - camCenterX) - Math.abs(b.x - camCenterX))
      .slice(0, 4);

    const cappedRays = Math.min(40, Math.max(12, rayCount));

    for (const em of sorted) {
      const fovRad = (em.fovDeg * Math.PI) / 180;
      const poly = Raycast.computeVisibilityCone(
        level,
        em.x,
        em.y,
        em.angleRad,
        fovRad,
        em.range,
        cappedRays
      );
      this.dynamicLights.push({
        x: em.x,
        y: em.y,
        angleRad: em.angleRad,
        fovRad,
        range: em.range,
        color: em.color || 'amber',
        polygon: poly
      });
    }
  }

  /**
   * Evaluate whether a world point (wx, wy) is illuminated by any static or dynamic light.
   * Returns 1.0 when in direct light, or 0.15 when in shadow (matching STEALTH.lightFactors).
   * @param {import('../world/Level.js').Level} level
   * @param {number} wx
   * @param {number} wy
   * @returns {{isLit: boolean, nearestLightAngle: number, lightIntensity: number}}
   */
  evaluatePointLight(level, wx, wy) {
    let isLit = false;
    let nearestDist = 999;
    let nearestAngle = -Math.PI * 0.4;
    let maxIntensity = 0.2;

    // Check explicit shadow zones first (deep architectural shadows)
    if (level && level.isInShadowZone(wx, wy)) {
      // Only direct dynamic flashlight beam can illuminate inside a shadow zone
    } else {
      for (const sl of this.staticLights) {
        const dx = wx - sl.x;
        const dy = wy - sl.y;
        const d = Math.hypot(dx, dy);
        if (d < nearestDist) {
          nearestDist = d;
          nearestAngle = Math.atan2(-dy, -dx);
        }
        if (d <= sl.radius * 0.88 && Raycast.hasLineOfSight(level, sl.x, sl.y, wx, wy)) {
          isLit = true;
          maxIntensity = Math.max(maxIntensity, (1 - d / sl.radius) * sl.intensity);
        }
      }
    }

    for (const dl of this.dynamicLights) {
      const dx = wx - dl.x;
      const dy = wy - dl.y;
      const d = Math.hypot(dx, dy);
      if (d <= dl.range) {
        const ang = Math.atan2(dy, dx);
        const diff = Math.atan2(Math.sin(ang - dl.angleRad), Math.cos(ang - dl.angleRad));
        if (Math.abs(diff) <= dl.fovRad * 0.5 && Raycast.hasLineOfSight(level, dl.x, dl.y, wx, wy)) {
          isLit = true;
          maxIntensity = Math.max(maxIntensity, 0.95);
          nearestAngle = Math.atan2(-dy, -dx);
        }
      }
    }

    return {
      isLit,
      nearestLightAngle: nearestAngle,
      lightIntensity: maxIntensity
    };
  }

  /**
   * Render half-resolution lightmap and composite over the main scene.
   * @param {CanvasRenderingContext2D} mainCtx
   * @param {number} screenW
   * @param {number} screenH
   * @param {import('./Camera.js').Camera} camera
   */
  renderLightmap(mainCtx, screenW, screenH, camera) {
    if (!this.lightCtx) return;
    const lw = Math.max(16, Math.floor(screenW * 0.5));
    const lh = Math.max(16, Math.floor(screenH * 0.5));
    if (this.lightCanvas.width !== lw || this.lightCanvas.height !== lh) {
      this.lightCanvas.width = lw;
      this.lightCanvas.height = lh;
    }

    const ctx = this.lightCtx;
    const scale = 0.5;
    ctx.save();
    ctx.clearRect(0, 0, lw, lh);

    // Base ambient darkness veil
    ctx.fillStyle = 'rgba(5, 7, 13, 0.52)';
    ctx.fillRect(0, 0, lw, lh);

    // Punch out lit areas and add warm/cyan tint
    ctx.globalCompositeOperation = 'destination-out';
    for (const sl of this.staticLights) {
      this.fillPolygonScreen(ctx, sl.polygon, camera, scale, 'rgba(255, 255, 255, 0.72)');
    }
    for (const dl of this.dynamicLights) {
      this.fillPolygonScreen(ctx, dl.polygon, camera, scale, 'rgba(255, 255, 255, 0.88)');
    }
    ctx.restore();

    // Composite ambient darkness map
    mainCtx.save();
    mainCtx.drawImage(this.lightCanvas, 0, 0, screenW, screenH);

    // Draw visible volumetric light cones on top with additive blending
    mainCtx.globalCompositeOperation = 'lighter';
    for (const sl of this.staticLights) {
      const fill =
        sl.color === 'cyan'
          ? 'rgba(61, 242, 255, 0.08)'
          : sl.color === 'crimson'
          ? 'rgba(255, 59, 78, 0.09)'
          : 'rgba(255, 177, 74, 0.09)';
      this.fillPolygonScreen(mainCtx, sl.polygon, camera, 1.0, fill);
    }

    for (const dl of this.dynamicLights) {
      const fill =
        dl.color === 'crimson'
          ? 'rgba(255, 59, 78, 0.20)'
          : dl.color === 'cyan'
          ? 'rgba(61, 242, 255, 0.16)'
          : 'rgba(255, 177, 74, 0.18)';
      this.fillPolygonScreen(mainCtx, dl.polygon, camera, 1.0, fill);
    }
    mainCtx.restore();
  }

  fillPolygonScreen(ctx, polygon, camera, scale, fillStyle) {
    if (!polygon || polygon.length < 3) return;
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    for (let i = 0; i < polygon.length; i++) {
      const sx = camera.worldToScreenX(polygon[i].x) * scale;
      const sy = camera.worldToScreenY(polygon[i].y) * scale;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fill();
  }
}
