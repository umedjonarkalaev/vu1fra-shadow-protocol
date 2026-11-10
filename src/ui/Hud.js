/**
 * @fileoverview Minimal, cinematic HUD:
 * - Mission objectives at top-center (auto-fade after ~5s, reappear when updated or tapped).
 * - Contextual toast / tutorial hint banner.
 * - Top-right compact pause button.
 * - Pause modal with Resume, Restart Level, Settings, Codex, and Exit to Menu.
 */

import { el } from '../puzzles/PuzzleRegistry.js';
import { i18n } from '../i18n/I18n.js';

export class HudUI {
  /**
   * @param {HTMLElement} parent
   * @param {{
   *   onPauseToggle: () => void,
   *   onRestartLevel: () => void,
   *   onOpenSettings: () => void,
   *   onOpenCodex: () => void,
   *   onExitToMenu: () => void
   * }} callbacks
   */
  constructor(parent, callbacks) {
    this.parent = parent;
    this.callbacks = callbacks;
    this.lastObjectiveText = '';
    this.objectiveFadeTimer = 5.0;
    this.toastTimer = 0;
    this.pauseModalEl = null;

    this.root = this.buildDOM();
    this.parent.appendChild(this.root);
  }

  buildDOM() {
    const layer = el('div', { className: 'vu-hud-layer hidden' });

    this.objectiveEl = el('div', {
      className: 'vu-hud-objective',
      attrs: { 'data-testid': 'hud-objective' },
      onClick: () => {
        this.objectiveFadeTimer = 5.0;
        this.objectiveEl.classList.remove('faded');
      }
    });

    this.toastEl = el('div', { className: 'vu-hud-toast hidden' });

    this.pauseBtn = el(
      'button',
      {
        className: 'vu-hud-pause-btn',
        attrs: {
          type: 'button',
          'aria-label': i18n.t('hud.pause'),
          'data-testid': 'hud-pause-btn'
        },
        onClick: (e) => {
          if (e.currentTarget instanceof HTMLElement) e.currentTarget.blur();
          this.callbacks.onPauseToggle();
        }
      },
      [el('span', { text: '❚❚' })]
    );

    layer.appendChild(this.objectiveEl);
    layer.appendChild(this.toastEl);
    layer.appendChild(this.pauseBtn);
    return layer;
  }

  show() {
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
    this.closePauseModal();
  }

  /**
   * Update objective banner and fade timer using the game clock dt (never setTimeout).
   * @param {string} objectiveText
   * @param {number} dt
   */
  update(objectiveText, dt) {
    if (objectiveText !== this.lastObjectiveText) {
      this.lastObjectiveText = objectiveText;
      this.objectiveEl.textContent = objectiveText;
      this.objectiveFadeTimer = 5.2;
      this.objectiveEl.classList.remove('faded');
    } else if (this.objectiveFadeTimer > 0) {
      this.objectiveFadeTimer -= dt;
      if (this.objectiveFadeTimer <= 0) {
        this.objectiveEl.classList.add('faded');
      }
    }

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) {
        this.toastEl.classList.add('hidden');
      }
    }
  }

  showToast(text, durationSec = 3.2) {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('hidden');
    this.toastTimer = durationSec;
  }

  openPauseModal() {
    this.closePauseModal();
    const backdrop = el('div', {
      className: 'vu-modal-backdrop',
      attrs: { 'data-testid': 'pause-modal' }
    });
    const card = el('div', {
      className: 'vu-modal-card',
      attrs: { role: 'dialog', 'aria-label': i18n.t('pause.title') }
    });

    const header = el('div', { className: 'vu-modal-header' }, [
      el('h2', { className: 'vu-modal-title', text: i18n.t('pause.title') })
    ]);

    const body = el('div', { className: 'vu-modal-body' });
    const list = el('div', { className: 'vu-chip-list' }, [
      el('button', {
        className: 'vu-btn vu-btn-primary',
        text: i18n.t('pause.resume'),
        attrs: { 'data-testid': 'pause-resume-btn' },
        onClick: () => this.callbacks.onPauseToggle()
      }),
      el('button', {
        className: 'vu-btn',
        text: i18n.t('pause.restartLevel'),
        onClick: () => this.callbacks.onRestartLevel()
      }),
      el('button', {
        className: 'vu-btn',
        text: i18n.t('pause.settings'),
        onClick: () => this.callbacks.onOpenSettings()
      }),
      el('button', {
        className: 'vu-btn',
        text: i18n.t('pause.codex'),
        onClick: () => this.callbacks.onOpenCodex()
      }),
      el('button', {
        className: 'vu-btn vu-btn-outline',
        text: i18n.t('pause.exitToMenu'),
        onClick: () => this.callbacks.onExitToMenu()
      })
    ]);

    body.appendChild(list);
    card.appendChild(header);
    card.appendChild(body);
    backdrop.appendChild(card);
    this.pauseModalEl = backdrop;
    this.parent.appendChild(backdrop);
  }

  closePauseModal() {
    if (this.pauseModalEl) {
      this.pauseModalEl.remove();
      this.pauseModalEl = null;
    }
  }
}
