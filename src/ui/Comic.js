/**
 * @fileoverview Static ink-silhouette comic sequence overlay with Russian captions (<= 14 words),
 * tap to advance, and hold/button to skip. Renders artwork directly onto the main game canvas.
 */

import { el } from '../puzzles/PuzzleRegistry.js';
import { comicPanels } from '../art/ComicPanels.js';
import { i18n } from '../i18n/I18n.js';
import { PALETTE } from '../theme.js';

export class ComicUI {
  /**
   * @param {HTMLElement} parent
   */
  constructor(parent) {
    this.parent = parent;
    this.overlayEl = null;
    this.panels = [];
    this.index = 0;
    this.onComplete = null;
    this.holdTime = 0;
    this.isHolding = false;
    this.panelTime = 0;
  }

  /**
   * Play a comic sequence `{ id, panels: [{ panelId, kickerRu, captionRu }] }`.
   * @param {any} sequence
   * @param {() => void} onComplete
   */
  play(sequence, onComplete) {
    this.close();
    if (!sequence || !Array.isArray(sequence.panels) || sequence.panels.length === 0) {
      onComplete();
      return;
    }

    this.panels = sequence.panels;
    this.index = 0;
    this.onComplete = onComplete;
    this.holdTime = 0;
    this.isHolding = false;
    this.panelTime = 0;

    const wrap = el('div', {
      className: 'vu-comic-overlay',
      attrs: { 'data-testid': 'comic-overlay' }
    });

    this.stage = el('div', {
      className: 'vu-comic-stage',
      onClick: () => this.nextPanel()
    });

    this.kickerEl = el('div', { className: 'vu-comic-kicker' });
    this.captionEl = el('div', { className: 'vu-comic-caption' });
    const capBar = el('div', { className: 'vu-comic-caption-bar' }, [this.kickerEl, this.captionEl]);

    this.stage.appendChild(capBar);

    const skipBtn = el('button', {
      className: 'vu-btn vu-btn-outline',
      text: i18n.t('comic.skipBtn'),
      attrs: { 'data-testid': 'comic-skip' },
      onClick: (e) => {
        e.stopPropagation();
        this.finish();
      }
    });

    const controls = el('div', { className: 'vu-comic-controls' }, [
      el('span', { text: i18n.t('comic.tapNext') }),
      skipBtn
    ]);

    wrap.addEventListener('pointerdown', () => {
      this.isHolding = true;
    });
    wrap.addEventListener('pointerup', () => {
      this.isHolding = false;
      this.holdTime = 0;
    });

    wrap.appendChild(this.stage);
    wrap.appendChild(controls);
    this.overlayEl = wrap;
    this.parent.appendChild(wrap);

    this.syncCaption();
  }

  update(dt) {
    if (!this.overlayEl) return;
    this.panelTime += dt;
    if (!this.isHolding) return;
    this.holdTime += dt;
    if (this.holdTime >= 0.85) {
      this.finish();
    }
  }

  /**
   * Render current comic panel directly onto the main game Canvas2D context.
   * @param {CanvasRenderingContext2D | null} ctx
   * @param {number} w
   * @param {number} h
   * @param {boolean} [reduceMotion=false]
   */
  renderToCanvas(ctx, w, h, reduceMotion = false) {
    if (!ctx) return;
    ctx.save();
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(0, 0, w, h);

    const p = this.panels[this.index];
    if (p) {
      const prog = reduceMotion ? 0 : Math.min(1, this.panelTime / 5.5);
      const zoom = 1.0 + prog * 0.04;
      ctx.translate(w * 0.5, h * 0.5);
      ctx.scale((w / 960) * zoom, (h / 540) * zoom);
      ctx.translate(-480 - prog * 6, -270 - prog * 3);
      comicPanels.renderPanel(ctx, p.panelId, 960, 540);
    }
    ctx.restore();
  }

  syncCaption() {
    const p = this.panels[this.index];
    if (!p) {
      this.finish();
      return;
    }
    this.panelTime = 0;
    if (this.kickerEl) {
      this.kickerEl.textContent = `${p.kickerRu || ''} · КАДР ${this.index + 1}/${this.panels.length}`;
    }
    if (this.captionEl) {
      this.captionEl.textContent = p.captionRu;
    }
  }

  nextPanel() {
    this.index++;
    if (this.index >= this.panels.length) {
      this.finish();
    } else {
      this.syncCaption();
    }
  }

  finish() {
    const cb = this.onComplete;
    this.close();
    if (cb) cb();
  }

  close() {
    this.isHolding = false;
    this.holdTime = 0;
    if (this.overlayEl) {
      this.overlayEl.remove();
      this.overlayEl = null;
    }
  }
}
