/**
 * @fileoverview Master Canvas2D renderer orchestrating pre-baked parallax planes, baked tile chunks,
 * half-res lighting, hero/enemy Bezier silhouettes, foreground cover, fog, glow, bloom, and grain.
 */

import { PALETTE } from '../theme.js';
import { Camera } from './Camera.js';
import { ParallaxLayers } from './Layers.js';
import { FogSystem } from './Fog.js';
import { GlowSystem } from './Glow.js';
import { LightingSystem } from './Lighting.js';
import { ParticleSystem } from './Particles.js';
import { GrainSystem } from './Grain.js';
import { QualityManager } from './QualityManager.js';
import { HeroRig } from '../art/HeroRig.js';
import { EnemyArt } from '../art/EnemyArt.js';
import { SceneArt } from '../art/SceneArt.js';

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    const ctxOpts =
      typeof navigator !== 'undefined' && navigator.webdriver
        ? { willReadFrequently: true }
        : undefined;
    this.ctx = canvas.getContext('2d', ctxOpts);
    this.quality = new QualityManager();
    this.camera = new Camera();
    this.layers = new ParallaxLayers();
    this.fog = new FogSystem();
    this.glow = new GlowSystem();
    this.lighting = new LightingSystem();
    this.particles = new ParticleSystem();
    this.grain = new GrainSystem();
    this.menuHeroRig = new HeroRig(15);

    this.width = 960;
    this.height = 540;
    this.fogMultiplier = 1.0;
    this.glowMultiplier = 1.0;
    this.alertPulse = 0;

    this.bakedLevelId = null;
  }

  /**
   * Resize the canvas to match viewport CSS dimensions and adaptive render scale.
   */
  resize(cssWidth, cssHeight) {
    const dpr = this.quality.getEffectiveDpr();
    const targetW = Math.max(320, Math.round(cssWidth * dpr));
    const targetH = Math.max(180, Math.round(cssHeight * dpr));
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }
    this.width = targetW;
    this.height = targetH;
    this.camera.resize(targetW, targetH);
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = true;
    }
  }

  /**
   * Prepare static lighting for the loaded level and draw frustum-culled vector tiles at native resolution.
   * @param {import('../world/Level.js').Level} level
   */
  bakeLevelTiles(level) {
    if (!level) return;
    this.bakedLevelId = level.id;
    this.lighting.bakeStaticLights(level, this.quality.getRayCount());
  }

  /**
   * Draw only the visible tiles and static props in the camera viewport at native vector resolution.
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../world/Level.js').Level} level
   */
  drawVisibleTiles(ctx, level) {
    const cam = this.camera;
    const S = cam.tileScale;
    const startTx = Math.max(0, Math.floor(cam.x - 1));
    const endTx = Math.min(level.width - 1, Math.ceil(cam.x + cam.viewWidthTiles + 1));

    // 1. Visible shadow zones
    ctx.fillStyle = 'rgba(5, 7, 13, 0.45)';
    for (const sz of level.shadowZones) {
      if (sz.x + sz.w >= startTx && sz.x <= endTx) {
        const sx = cam.worldToScreenX(sz.x);
        const sy = cam.worldToScreenY(sz.y);
        ctx.fillRect(sx, sy, sz.w * S, sz.h * S);
      }
    }

    // 2. Visible tiles
    for (let ty = 0; ty < level.height; ty++) {
      const py = cam.worldToScreenY(ty);
      for (let tx = startTx; tx <= endTx; tx++) {
        const ch = level.getTileAt(tx, ty);
        if (ch === '.') continue;
        const px = cam.worldToScreenX(tx);

        if (ch === '#' || ch === 'W') {
          ctx.fillStyle = PALETTE.ink;
          ctx.fillRect(px, py, S + 0.75, S + 0.75);

          if (!level.isSolidAt(tx, ty - 1)) {
            ctx.fillStyle = 'rgba(143, 163, 199, 0.42)';
            ctx.fillRect(px, py, S + 0.5, Math.max(2, S * 0.06));
          }

          if (ch === 'W') {
            const leftAir = !level.isSolidAt(tx - 1, ty);
            const rightAir = !level.isSolidAt(tx + 1, ty);
            const stripW = Math.max(2.5, S * 0.08);
            ctx.fillStyle = 'rgba(61, 242, 255, 0.38)';
            if (leftAir) ctx.fillRect(px, py + 2, stripW, S - 4);
            if (rightAir) ctx.fillRect(px + S - stripW, py + 2, stripW, S - 4);
          }
        } else if (ch === '-') {
          ctx.fillStyle = '#0c1326';
          ctx.fillRect(px, py, S, Math.max(6, S * 0.22));
          ctx.fillStyle = 'rgba(143, 163, 199, 0.48)';
          ctx.fillRect(px, py, S, 2);
        }
      }
    }

    // 3. Static props (torii gates)
    for (const prop of level.props || []) {
      if (prop.type === 'torii' && prop.x >= startTx - 3 && prop.x <= endTx + 3) {
        SceneArt.drawTorii(ctx, cam.worldToScreenX(prop.x), cam.worldToScreenY(prop.y), S);
      }
    }
  }

  /**
   * Render the living foggy night city Main Menu scene:
   * - Slow parallax camera drift
   * - Sweeping searchlight & distant hovering drone
   * - Flickering neon kanji signs
   * - Hero VU1FRA standing on a rooftop edge at the right third (back mostly turned, scarf in the wind, idle breathing, occasional look over city)
   */
  renderMenuScene(clockSec, reduceMotion = false) {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = this.width;
    const h = this.height;
    const S = this.camera.tileScale;

    const driftCamX = reduceMotion ? 1.5 : clockSec * 0.22;
    this.layers.drawBackground(ctx, w, h, driftCamX);

    // Sweeping distant searchlight beam across the foggy sky
    ctx.save();
    const sweepAngle = -Math.PI * 0.58 + Math.sin(clockSec * 0.42) * 0.36;
    const beamX = w * 0.36;
    const beamY = h * 0.92;
    ctx.translate(beamX, beamY);
    ctx.rotate(sweepAngle);
    const beamGrad = ctx.createLinearGradient(0, 0, S * 11, 0);
    beamGrad.addColorStop(0, 'rgba(232, 226, 207, 0.20)');
    beamGrad.addColorStop(1, 'rgba(232, 226, 207, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(0, -S * 0.12);
    ctx.lineTo(S * 11, -S * 1.4);
    ctx.lineTo(S * 11, S * 1.4);
    ctx.lineTo(0, S * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Distant slow surveillance drone patrolling mid-skyline
    const droneX = (((clockSec * 34) % (w * 0.85)) + w * 0.1);
    const droneY = h * 0.34 + Math.sin(clockSec * 1.6) * 8;
    EnemyArt.drawDrone(ctx, {
      screenX: droneX,
      screenY: droneY,
      tileScale: S * 0.55,
      clock: clockSec,
      suspicion: 0,
      state: 'CALM'
    });
    this.glow.drawGlow(ctx, 'amber', droneX, droneY, S * 0.65, 0.45 * this.glowMultiplier);

    // Flickering distant neon sign accent
    const flicker = Math.sin(clockSec * 19) > -0.82 ? 0.65 : 0.15;
    this.glow.drawGlow(ctx, 'crimson', w * 0.48, h * 0.54, S * 1.2, flicker * 0.45 * this.glowMultiplier);

    // Drifting fog behind rooftop ledge
    this.fog.draw(ctx, w, h, driftCamX, clockSec, this.fogMultiplier);

    // Foreground rooftop ledge on the right half where VU1FRA stands
    const roofTopY = h * 0.78;
    const roofEdgeX = w * 0.56;
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.moveTo(roofEdgeX - S * 0.6, h);
    ctx.lineTo(roofEdgeX, roofTopY);
    ctx.lineTo(w, roofTopY);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Rim highlight on rooftop edge + traditional Torii & swaying paper lantern
    ctx.strokeStyle = 'rgba(143, 163, 199, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(roofEdgeX, roofTopY);
    ctx.lineTo(w, roofTopY);
    ctx.stroke();

    SceneArt.drawTorii(ctx, w * 0.86, roofTopY, S * 0.85);
    SceneArt.drawLantern(ctx, w * 0.80, roofTopY - S * 1.85, S * 0.85, clockSec);
    this.glow.drawGlow(ctx, 'amber', w * 0.80, roofTopY - S * 1.85, S * 1.5, 0.55 * this.glowMultiplier);

    // Hero VU1FRA standing at the right third (x = 0.68w), facing left over the city
    const heroScreenX = w * 0.68;
    const heroScreenY = roofTopY;
    this.menuHeroRig.draw(ctx, {
      screenX: heroScreenX,
      screenY: heroScreenY,
      tileScale: S * 1.15,
      facing: -1,
      anim: 'idle',
      animTime: clockSec,
      gaitPhase: 0,
      worldX: 12,
      worldY: 8,
      vx: 1.8, // Wind velocity for streaming Verlet scarf
      vy: 0,
      clock: clockSec,
      lightAngleRad: -Math.PI * 0.75,
      lightIntensity: 0.85,
      shadowEnergy: 0
    });
    this.glow.drawGlow(ctx, 'cyan', heroScreenX - S * 0.08, heroScreenY - S * 1.75, S * 0.55, 0.55 * this.glowMultiplier);

    // Weather particles (thin rain + drifting sakura petals)
    this.particles.draw(ctx, this.camera, w, h, clockSec);

    if (this.quality.enableBloom()) {
      this.glow.applyQuarterResBloom(ctx, this.canvas, 0.18 * this.glowMultiplier);
    }

    this.grain.draw(ctx, w, h, clockSec, this.quality.enableGrain(), 0, reduceMotion);
  }

  /**
   * Render the active gameplay world.
   * @param {import('../world/Level.js').Level} level
   * @param {number} clockSec
   * @param {boolean} reduceMotion
   */
  renderWorld(level, clockSec, reduceMotion = false) {
    const ctx = this.ctx;
    if (!ctx || !level) return;

    if (this.bakedLevelId !== level.id) {
      this.bakeLevelTiles(level);
    }

    const w = this.width;
    const h = this.height;
    const cam = this.camera;
    const S = cam.tileScale;

    // 1. Pre-baked parallax sky & skylines
    this.layers.drawBackground(ctx, w, h, cam.x);

    // 2. Mid-depth drifting fog
    this.fog.draw(ctx, w, h, cam.x * 0.5, clockSec, this.fogMultiplier * 0.65);

    // 3. Frustum-culled native vector level tiles & static props
    this.drawVisibleTiles(ctx, level);

    // 4. Static lanterns & checkpoints
    for (const l of level.lights) {
      const lx = cam.worldToScreenX(l.x);
      const ly = cam.worldToScreenY(l.y);
      if (lx > -S * 2 && lx < w + S * 2) {
        if (l.color === 'amber') {
          SceneArt.drawLantern(ctx, lx, ly, S, clockSec);
        }
        this.glow.drawGlow(ctx, l.color || 'amber', lx, ly, S * (l.radius * 0.45), 0.45 * this.glowMultiplier);
      }
    }

    for (const cp of level.checkpoints) {
      const cx = cam.worldToScreenX(cp.x);
      const cy = cam.worldToScreenY(cp.y);
      if (cx > -S && cx < w + S) {
        cp.draw(ctx, cx, cy, S, clockSec);
        if (cp.active) {
          this.glow.drawGlow(ctx, 'cyan', cx, cy - S * 0.6, S * 0.9, 0.45 * this.glowMultiplier);
        }
      }
    }

    // 5. Interactive Terminals
    for (const term of level.terminals) {
      const tx = cam.worldToScreenX(term.x);
      const ty = cam.worldToScreenY(term.y);
      if (tx > -S * 2 && tx < w + S * 2) {
        SceneArt.drawTerminal(ctx, tx, ty, S, term.solved, clockSec);
        if (!term.solved) {
          this.glow.drawGlow(ctx, 'cyan', tx, ty - S * 1.25, S * 1.1, 0.55 * this.glowMultiplier);
        }
      }
    }

    // 6. Hero when HIDDEN inside foreground cover (drawn behind the cover prop)
    const hero = level.hero;
    const heroLight = this.lighting.evaluatePointLight(level, hero.x, hero.y - 0.8);
    if (hero.inCover) {
      this.drawHeroEntity(ctx, hero, heroLight, clockSec);
    }

    // 7. Foreground Cover Spots (banners, pipes, alcoves)
    for (const cov of level.coverSpots) {
      const cx = cam.worldToScreenX(cov.x);
      const cy = cam.worldToScreenY(cov.y);
      if (cx > -S * 2 && cx < w + S * 2) {
        SceneArt.drawCoverSpot(ctx, cx, cy, S, cov.kind, hero.inCover && hero.activeCover === cov, clockSec);
      }
    }

    // 8. Enemies (Guards, Drones, Security Cameras)
    for (const g of level.guards) {
      const gx = cam.worldToScreenX(g.x);
      const gy = cam.worldToScreenY(g.y);
      if (gx > -S * 3 && gx < w + S * 3) {
        EnemyArt.drawGuard(ctx, {
          screenX: gx,
          screenY: gy,
          tileScale: S,
          facing: g.facing,
          walkCycle: g.walkCycle,
          state: g.state,
          suspicion: g.suspicion,
          aimAngleRad: g.aimAngleRad
        });
      }
    }

    for (const d of level.drones) {
      const dx = cam.worldToScreenX(d.x);
      const dy = cam.worldToScreenY(d.y);
      if (dx > -S * 3 && dx < w + S * 3) {
        EnemyArt.drawDrone(ctx, {
          screenX: dx,
          screenY: dy,
          tileScale: S,
          clock: clockSec,
          suspicion: d.suspicion,
          state: d.state
        });
      }
    }

    for (const sc of level.cameras) {
      const cx = cam.worldToScreenX(sc.x);
      const cy = cam.worldToScreenY(sc.y);
      if (cx > -S * 3 && cx < w + S * 3) {
        EnemyArt.drawCamera(ctx, {
          screenX: cx,
          screenY: cy,
          tileScale: S,
          aimAngleRad: sc.aimAngleRad,
          suspicion: sc.suspicion,
          state: sc.state
        });
      }
    }

    // 9. Hero when NOT in cover (drawn in main plane)
    if (!hero.inCover) {
      this.drawHeroEntity(ctx, hero, heroLight, clockSec);
    }

    // 10. Level Exit Gate / Marker
    if (level.exit) {
      const ex = cam.worldToScreenX(level.exit.x);
      const ey = cam.worldToScreenY(level.exit.y);
      SceneArt.drawTorii(ctx, ex, ey, S * 0.9);
      this.glow.drawGlow(ctx, 'cyan', ex, ey - S * 1.4, S * 1.4, 0.55 * this.glowMultiplier);
    }

    // 11. Half-res Dynamic & Static Light-Map + Vision Cones
    this.lighting.renderLightmap(ctx, w, h, cam);

    // 12. Ground fog, weather & particles, and foreground silhouette cables
    this.fog.draw(ctx, w, h, cam.x, clockSec, this.fogMultiplier);
    this.particles.draw(ctx, cam, w, h, clockSec);
    this.layers.drawForeground(ctx, w, h, cam.x);

    // 13. Quarter-res Bloom + Film Grain + Vignette + Alert Pulse
    if (this.quality.enableBloom()) {
      this.glow.applyQuarterResBloom(ctx, this.canvas, 0.2 * this.glowMultiplier);
    }
    this.grain.draw(ctx, w, h, clockSec, this.quality.enableGrain(), this.alertPulse, reduceMotion);
  }

  drawHeroEntity(ctx, hero, heroLight, clockSec) {
    const cam = this.camera;
    const S = cam.tileScale;
    const hx = cam.worldToScreenX(hero.x);
    const hy = cam.worldToScreenY(hero.y);

    hero.rig.draw(ctx, {
      screenX: hx,
      screenY: hy,
      tileScale: S,
      facing: hero.facing,
      anim: hero.animState,
      animTime: hero.animTime,
      gaitPhase: hero.gaitPhase,
      worldX: hero.x,
      worldY: hero.y,
      vx: hero.vx,
      vy: hero.vy,
      clock: clockSec,
      lightAngleRad: heroLight.nearestLightAngle,
      lightIntensity: heroLight.lightIntensity,
      shadowEnergy: hero.shadowEnergy,
      scaleX: hero.scaleX,
      scaleY: hero.scaleY
    });

    this.glow.drawGlow(
      ctx,
      'cyan',
      hx + hero.facing * S * 0.08,
      hy - S * 1.35,
      S * 0.45,
      (hero.shadowDissolved ? 0.65 : 0.35) * this.glowMultiplier
    );
  }
}
