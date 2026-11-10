/**
 * @fileoverview Procedural ink-silhouette comic panel renderer (pre-rendered at load).
 * Draws halftone shading, brush-stroke borders, hanko accents, and dramatic silhouettes
 * for all 9 Chapter 1 panels (Intro 1-4, Mid 1-2, Ending 1-3).
 */

import { PALETTE } from '../theme.js';

export class ComicPanels {
  constructor() {
    this.sharedCanvas = null;
    this.renderedPanelId = null;
  }

  /**
   * Get or render a comic panel canvas for a given panelId using a single shared surface.
   * @param {string} panelId
   * @returns {HTMLCanvasElement}
   */
  getPanelCanvas(panelId) {
    if (!this.sharedCanvas) {
      this.sharedCanvas = document.createElement('canvas');
      this.sharedCanvas.width = 640;
      this.sharedCanvas.height = 360;
    }
    if (this.renderedPanelId !== panelId) {
      const ctx = this.sharedCanvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.clearRect(0, 0, 640, 360);
        ctx.scale(640 / 960, 360 / 540);
        this.renderPanel(ctx, panelId, 960, 540);
        ctx.restore();
      }
      this.renderedPanelId = panelId;
    }
    return this.sharedCanvas;
  }

  /**
   * Render panel into shared canvas and return a data URL for zero-extra-canvas DOM display.
   * @param {string} panelId
   * @returns {string}
   */
  getPanelDataUrl(panelId) {
    const c = this.getPanelCanvas(panelId);
    try {
      return c.toDataURL('image/png');
    } catch {
      return '';
    }
  }

  /**
   * Lazy-ready hook (avoids allocating 9 full-screen GPU surfaces at boot).
   * @param {string[]} _panelIds
   */
  prebakeAll(_panelIds) {
    // Lazily rendered into the single shared 640x360 canvas on demand
  }

  renderPanel(ctx, panelId, w, h) {
    // Base ink & indigo gradient
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, PALETTE.ink);
    bg.addColorStop(0.6, PALETTE.night);
    bg.addColorStop(1, PALETTE.indigo);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle halftone dot matrix in upper sky/corners
    ctx.fillStyle = 'rgba(143, 163, 199, 0.06)';
    for (let y = 24; y < h - 24; y += 16) {
      for (let x = 24; x < w - 24; x += 16) {
        if ((x + y) % 32 === 0) {
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Scene-specific ink-silhouette artwork
    switch (panelId) {
      case 'ch1_intro_1':
        this.drawIntro1KitchenPhone(ctx, w, h);
        break;
      case 'ch1_intro_2':
        this.drawIntro2PhishingVoice(ctx, w, h);
        break;
      case 'ch1_intro_3':
        this.drawIntro3ZeroBalance(ctx, w, h);
        break;
      case 'ch1_intro_4':
        this.drawIntro4Vu1fraVow(ctx, w, h);
        break;
      case 'ch1_mid_1':
        this.drawMid1CallScript(ctx, w, h);
        break;
      case 'ch1_mid_2':
        this.drawMid2SpiderBoss(ctx, w, h);
        break;
      case 'ch1_end_1':
        this.drawEnd1UploadEvidence(ctx, w, h);
        break;
      case 'ch1_end_2':
        this.drawEnd2DawnRestore(ctx, w, h);
        break;
      case 'ch1_end_3':
        this.drawEnd3SilentHorizon(ctx, w, h);
        break;
      default:
        this.drawIntro4Vu1fraVow(ctx, w, h);
        break;
    }

    // Ink-brush border frame + red hanko seal stamp
    ctx.strokeStyle = 'rgba(232, 226, 207, 0.35)';
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, w - 36, h - 36);

    ctx.strokeStyle = PALETTE.hanko;
    ctx.lineWidth = 2;
    ctx.strokeRect(w - 68, 34, 34, 34);
    ctx.fillStyle = PALETTE.hanko;
    ctx.fillRect(w - 58, 44, 14, 14);
  }

  drawIntro1KitchenPhone(ctx, w, h) {
    // Warm amber pendant lamp over a quiet kitchen table; glowing smartphone ringing
    const glow = ctx.createRadialGradient(w * 0.45, h * 0.32, 10, w * 0.45, h * 0.45, 280);
    glow.addColorStop(0, 'rgba(255, 177, 74, 0.35)');
    glow.addColorStop(1, 'rgba(5, 7, 13, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Window rain bars
    ctx.strokeStyle = 'rgba(143, 163, 199, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(110, 70, 240, 260);

    // Elderly woman silhouette at table
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.arc(w * 0.36, h * 0.52, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w * 0.26, h * 0.88);
    ctx.quadraticCurveTo(w * 0.34, h * 0.56, w * 0.45, h * 0.72);
    ctx.lineTo(w * 0.45, h * 0.88);
    ctx.closePath();
    ctx.fill();

    // Table & ringing phone with crimson alert rings
    ctx.fillRect(w * 0.35, h * 0.74, w * 0.45, 24);
    ctx.fillStyle = PALETTE.cyan;
    ctx.fillRect(w * 0.58, h * 0.70, 48, 12);

    ctx.strokeStyle = PALETTE.crimson;
    ctx.lineWidth = 2.5;
    for (let r = 24; r <= 72; r += 24) {
      ctx.beginPath();
      ctx.arc(w * 0.60, h * 0.70, r, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  }

  drawIntro2PhishingVoice(ctx, w, h) {
    // Looming shadow web & fake bank link waveform
    ctx.strokeStyle = 'rgba(255, 59, 78, 0.28)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.42);
      ctx.lineTo(w * 0.5 + Math.cos(ang) * 420, h * 0.42 + Math.sin(ang) * 280);
      ctx.stroke();
    }

    // Holographic hook & fake lock icon
    ctx.strokeStyle = PALETTE.crimson;
    ctx.lineWidth = 4;
    ctx.strokeRect(w * 0.38, h * 0.28, w * 0.24, h * 0.28);
    ctx.fillStyle = PALETTE.amber;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.42, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  drawIntro3ZeroBalance(ctx, w, h) {
    // Shattered golden coins dissolving into crimson digital lines
    ctx.strokeStyle = PALETTE.crimson;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h * 0.35);
    ctx.lineTo(w * 0.45, h * 0.35);
    ctx.lineTo(w * 0.55, h * 0.68);
    ctx.lineTo(w * 0.8, h * 0.68);
    ctx.stroke();

    ctx.fillStyle = PALETTE.moon;
    ctx.font = 'bold 64px monospace';
    ctx.fillText('0.00 ₽', w * 0.38, h * 0.52);
  }

  drawIntro4Vu1fraVow(ctx, w, h) {
    // Full moon, Kurogane Tower in distance, VU1FRA silhouette on rooftop edge
    ctx.fillStyle = 'rgba(232, 226, 207, 0.16)';
    ctx.beginPath();
    ctx.arc(w * 0.28, h * 0.32, 95, 0, Math.PI * 2);
    ctx.fill();

    // Distant Kurogane Tower monolith
    ctx.fillStyle = '#090e1d';
    ctx.fillRect(w * 0.22, h * 0.18, 110, h * 0.72);
    ctx.fillStyle = PALETTE.crimson;
    ctx.fillRect(w * 0.25, h * 0.24, 50, 8);

    // Foreground rooftop & VU1FRA silhouette with cyan eye-slit and streaming scarf
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.moveTo(w * 0.52, h);
    ctx.lineTo(w * 0.62, h * 0.68);
    ctx.lineTo(w, h * 0.68);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Hero silhouette
    ctx.beginPath();
    ctx.moveTo(w * 0.72, h * 0.68);
    ctx.lineTo(w * 0.74, h * 0.36);
    ctx.lineTo(w * 0.79, h * 0.32);
    ctx.lineTo(w * 0.82, h * 0.68);
    ctx.closePath();
    ctx.fill();

    // Cyan eye-slit
    ctx.fillStyle = PALETTE.cyan;
    ctx.fillRect(w * 0.735, h * 0.36, 18, 4);
  }

  drawMid1CallScript(ctx, w, h) {
    // Cyan holographic terminal matrices revealing scam script trees
    ctx.strokeStyle = PALETTE.cyan;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      ctx.strokeRect(180 + i * 120, 140 + (i % 2) * 80, 96, 64);
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(180 + (i - 1) * 120 + 96, 172 + ((i - 1) % 2) * 80);
        ctx.lineTo(180 + i * 120, 172 + (i % 2) * 80);
        ctx.stroke();
      }
    }
  }

  drawMid2SpiderBoss(ctx, w, h) {
    // High-floor penthouse silhouette of "Паук" overlooking stolen database streams
    ctx.strokeStyle = PALETTE.crimson;
    ctx.lineWidth = 2;
    for (let r = 60; r <= 220; r += 50) {
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.45, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.moveTo(w * 0.42, h * 0.85);
    ctx.lineTo(w * 0.46, h * 0.42);
    ctx.lineTo(w * 0.54, h * 0.42);
    ctx.lineTo(w * 0.58, h * 0.85);
    ctx.closePath();
    ctx.fill();
  }

  drawEnd1UploadEvidence(ctx, w, h) {
    // Cyan light beam shooting from the 41st floor into the night sky
    const beam = ctx.createLinearGradient(w * 0.5, h, w * 0.5, 0);
    beam.addColorStop(0, 'rgba(61, 242, 255, 0.65)');
    beam.addColorStop(1, 'rgba(61, 242, 255, 0)');
    ctx.fillStyle = beam;
    ctx.fillRect(w * 0.46, 0, w * 0.08, h);
  }

  drawEnd2DawnRestore(ctx, w, h) {
    // Warm golden sunrise over Neo-Edo rooftops
    const sun = ctx.createRadialGradient(w * 0.5, h * 0.72, 20, w * 0.5, h * 0.72, 360);
    sun.addColorStop(0, 'rgba(255, 177, 74, 0.55)');
    sun.addColorStop(1, 'rgba(20, 26, 51, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(0, h * 0.72, w, h * 0.28);
  }

  drawEnd3SilentHorizon(ctx, w, h) {
    // Torii gate against pale moon & drifting petals
    ctx.fillStyle = 'rgba(232, 226, 207, 0.22)';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.42, 110, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(w * 0.38, h * 0.28, 22, h * 0.55);
    ctx.fillRect(w * 0.60, h * 0.28, 22, h * 0.55);
    ctx.fillRect(w * 0.32, h * 0.26, w * 0.36, 20);
    ctx.fillRect(w * 0.35, h * 0.36, w * 0.30, 14);
  }
}

export const comicPanels = new ComicPanels();
