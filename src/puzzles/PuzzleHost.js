/**
 * @fileoverview Landscape DOM overlay host for hacking terminals ("Shadow Focus").
 * Renders header, hint system, puzzle container, verification feedback, and the mandatory
 * "Как защититься в жизни" real-world infosec card upon completion.
 * Zero innerHTML, zero OS keyboard requirement, instant close button always accessible.
 */

import { el, puzzleRegistry } from './PuzzleRegistry.js';
import { i18n } from '../i18n/I18n.js';

export class PuzzleHost {
  /**
   * @param {HTMLElement} rootOverlay
   * @param {{
   *   onSolve: (puzzleData: any, hintsUsed: number) => void,
   *   onClose: () => void,
   *   onSound: (kind: string) => void
   * }} callbacks
   */
  constructor(rootOverlay, callbacks) {
    this.root = rootOverlay;
    this.callbacks = callbacks;
    this.activeController = null;
    this.activeData = null;
    this.hintsUsed = 0;
    this.solved = false;
  }

  /**
   * Open a puzzle instance inside the landscape overlay.
   * @param {any} puzzleData
   */
  open(puzzleData) {
    this.close();
    const typeMod = puzzleRegistry.get(puzzleData.type);
    if (!typeMod) return;

    this.activeData = puzzleData;
    this.hintsUsed = 0;
    this.solved = false;

    this.root.textContent = '';
    this.root.classList.remove('hidden');

    const modal = el('div', {
      className: 'vu-puzzle-modal',
      attrs: { role: 'dialog', 'aria-label': puzzleData.titleRu || 'Терминал взлома' }
    });

    // Top bar: Title + Hint button + Close button (always closable!)
    const titleBox = el('div', { className: 'vu-puzzle-title-box' }, [
      el('span', { className: 'vu-puzzle-kicker', text: i18n.t('hud.shadowFocus') + ' · ' + (puzzleData.topicRu || 'УЗЕЛ') }),
      el('h2', { className: 'vu-puzzle-title', text: puzzleData.titleRu })
    ]);

    const hintBtn = el('button', {
      className: 'vu-btn vu-btn-subtle',
      text: i18n.t('puzzle.hintBtn'),
      onClick: () => this.showHint()
    });

    const closeBtn = el('button', {
      className: 'vu-btn vu-btn-outline',
      text: i18n.t('puzzle.closeBtn'),
      attrs: { 'data-testid': 'puzzle-close-btn' },
      onClick: () => {
        this.callbacks.onSound('blip');
        this.close();
        this.callbacks.onClose();
      }
    });

    const header = el('div', { className: 'vu-puzzle-header' }, [
      titleBox,
      el('div', { className: 'vu-puzzle-actions' }, [hintBtn, closeBtn])
    ]);

    this.bodyContainer = el('div', { className: 'vu-puzzle-body' });
    this.feedbackBanner = el('div', { className: 'vu-puzzle-feedback hidden' });

    const verifyBtn = el('button', {
      className: 'vu-btn vu-btn-primary',
      text: i18n.t('puzzle.verifyBtn'),
      attrs: { 'data-testid': 'puzzle-verify-btn' },
      onClick: () => this.evaluateCurrent()
    });
    this.footerBar = el('div', { className: 'vu-puzzle-footer' }, [
      el('span', { className: 'vu-puzzle-prompt', text: puzzleData.promptRu || '' }),
      verifyBtn
    ]);

    modal.appendChild(header);
    modal.appendChild(this.feedbackBanner);
    modal.appendChild(this.bodyContainer);
    modal.appendChild(this.footerBar);
    this.root.appendChild(modal);

    // Mount type-specific interactive controller
    this.activeController = typeMod.createController(puzzleData, {
      onBlip: () => this.callbacks.onSound('blip'),
      triggerEvaluate: () => this.evaluateCurrent()
    });
    this.activeController.mount(this.bodyContainer);
  }

  showHint() {
    if (!this.activeController || !this.activeData) return;
    this.hintsUsed++;
    this.callbacks.onSound('blip');
    const hintText = this.activeController.hint();
    this.feedbackBanner.textContent = `Подсказка: ${hintText}`;
    this.feedbackBanner.className = 'vu-puzzle-feedback vu-feedback-hint';
  }

  evaluateCurrent() {
    if (!this.activeController || !this.activeData || this.solved) return;
    const res = this.activeController.evaluate();
    if (res && res.ok) {
      this.solved = true;
      this.callbacks.onSound('success');
      this.renderSuccessScreen();
    } else {
      this.callbacks.onSound('blip');
      this.feedbackBanner.textContent = (res && res.messageRu) || i18n.t('puzzle.wrongAttempt');
      this.feedbackBanner.className = 'vu-puzzle-feedback vu-feedback-error';
    }
  }

  /**
   * Render explanation and the mandatory "Как защититься в жизни" card after solving.
   */
  renderSuccessScreen() {
    if (!this.bodyContainer || !this.activeData) return;
    this.bodyContainer.textContent = '';
    this.feedbackBanner.className = 'vu-puzzle-feedback hidden';
    this.footerBar.textContent = '';

    const explainText = this.activeController.explain() || this.activeData.explanationRu;

    const card = el('div', { className: 'vu-puzzle-solved-card' }, [
      el('div', { className: 'vu-solved-badge', text: i18n.t('puzzle.solvedTitle') }),
      el('p', { className: 'vu-solved-explain', text: explainText }),
      el('div', { className: 'vu-life-tip-box' }, [
        el('div', { className: 'vu-life-tip-header', text: i18n.t('puzzle.lifeTipHeader') }),
        el('p', { className: 'vu-life-tip-body', text: this.activeData.lifeTipRu })
      ])
    ]);

    this.bodyContainer.appendChild(card);

    const finishBtn = el('button', {
      className: 'vu-btn vu-btn-primary',
      text: i18n.t('puzzle.completeBtn'),
      attrs: { 'data-testid': 'puzzle-complete-btn' },
      onClick: () => {
        const solvedData = this.activeData;
        const hints = this.hintsUsed;
        this.close();
        this.callbacks.onSolve(solvedData, hints);
      }
    });
    this.footerBar.appendChild(finishBtn);
  }

  close() {
    this.activeController = null;
    this.activeData = null;
    if (this.root) {
      this.root.textContent = '';
      this.root.classList.add('hidden');
    }
  }
}
