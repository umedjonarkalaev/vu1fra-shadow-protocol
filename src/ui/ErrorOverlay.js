/**
 * @fileoverview Global error boundary overlay (window.onerror + unhandledrejection).
 * Never shows a black screen: provides "Copy debug report", "Restart level", and "Menu".
 */

import { el } from '../puzzles/PuzzleRegistry.js';
import { logger } from '../core/Logger.js';
import { i18n } from '../i18n/I18n.js';

export class ErrorOverlay {
  /**
   * @param {HTMLElement} parent
   * @param {{
   *   getSnapshot: () => any,
   *   onRestartLevel: () => void,
   *   onExitToMenu: () => void
   * }} callbacks
   */
  constructor(parent, callbacks) {
    this.parent = parent;
    this.callbacks = callbacks;
    this.modalEl = null;
  }

  show(errorObj) {
    this.close();
    const errMsg = errorObj instanceof Error ? `${errorObj.message}\n${errorObj.stack || ''}` : String(errorObj);

    const backdrop = el('div', {
      className: 'vu-modal-backdrop',
      attrs: { 'data-testid': 'error-overlay', role: 'alertdialog' }
    });
    const card = el('div', { className: 'vu-modal-card' });

    const header = el('div', { className: 'vu-modal-header' }, [
      el('div', {}, [
        el('span', { className: 'vu-puzzle-kicker', text: i18n.t('error.subtitle') }),
        el('h2', { className: 'vu-modal-title', text: i18n.t('error.title') })
      ])
    ]);

    const reportText = this.buildReport(errMsg);
    const pre = el('pre', {
      className: 'vu-term-screen',
      text: reportText
    });

    const copyBtn = el('button', {
      className: 'vu-btn vu-btn-subtle',
      text: i18n.t('error.copyReport'),
      onClick: async () => {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(reportText);
            copyBtn.textContent = i18n.t('error.copied');
          }
        } catch {
          copyBtn.textContent = i18n.t('error.copied');
        }
      }
    });

    const restartBtn = el('button', {
      className: 'vu-btn vu-btn-primary',
      text: i18n.t('error.restartLevel'),
      onClick: () => {
        this.close();
        this.callbacks.onRestartLevel();
      }
    });

    const menuBtn = el('button', {
      className: 'vu-btn vu-btn-outline',
      text: i18n.t('error.toMenu'),
      onClick: () => {
        this.close();
        this.callbacks.onExitToMenu();
      }
    });

    const body = el('div', { className: 'vu-modal-body' }, [pre]);
    const footer = el('div', { className: 'vu-modal-footer' }, [
      copyBtn,
      el('div', { className: 'vu-puzzle-actions' }, [restartBtn, menuBtn])
    ]);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    backdrop.appendChild(card);
    this.modalEl = backdrop;
    this.parent.appendChild(backdrop);
  }

  buildReport(errMsg) {
    const snap = this.callbacks.getSnapshot ? this.callbacks.getSnapshot() : {};
    const lines = [
      '=== VU1FRA // SHADOW PROTOCOL DEBUG REPORT ===',
      `UserAgent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'node'}`,
      `Snapshot: ${JSON.stringify(snap)}`,
      `Error: ${errMsg}`,
      '--- Recent Logs (Last 100) ---',
      ...logger.getRecentLines()
    ];
    return lines.join('\n');
  }

  close() {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
  }
}
