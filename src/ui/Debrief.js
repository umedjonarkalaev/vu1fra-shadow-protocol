/**
 * @fileoverview Chapter Debrief screen displaying:
 * - Grade S / A / B / C in a red hanko seal
 * - Operation metrics (Alarms, Takedowns, Hints used, Time)
 * - Auto-generated 3-line Russian Haiku card
 * - Codex cards for every cybersecurity concept learned
 */

import { el } from '../puzzles/PuzzleRegistry.js';
import { i18n } from '../i18n/I18n.js';
import { Grading } from '../progression/Grading.js';
import { HaikuGenerator } from '../progression/Haiku.js';
import { Codex } from '../progression/Codex.js';

export class DebriefUI {
  /**
   * @param {HTMLElement} parent
   * @param {{
   *   onReplay: () => void,
   *   onExitToMenu: () => void
   * }} callbacks
   */
  constructor(parent, callbacks) {
    this.parent = parent;
    this.callbacks = callbacks;
    this.modalEl = null;
  }

  /**
   * Open the chapter debrief screen.
   * @param {{alarms: number, takedowns: number, hintsUsed: number, elapsedSec: number}} stats
   * @param {string[]} unlockedCodexIds
   */
  open(stats, unlockedCodexIds) {
    this.close();
    const grade = Grading.evaluate(stats);
    const haikuLines = HaikuGenerator.generate({ ...stats, rank: grade.rank });
    const mins = Math.floor((stats.elapsedSec || 0) / 60);
    const secs = Math.round((stats.elapsedSec || 0) % 60);
    const timeFormatted = `${mins} мин ${secs.toString().padStart(2, '0')} сек`;

    const backdrop = el('div', {
      className: 'vu-modal-backdrop',
      attrs: { 'data-testid': 'debrief-modal' }
    });
    const card = el('div', {
      className: 'vu-modal-card',
      attrs: { role: 'dialog', 'aria-label': i18n.t('debrief.title') }
    });

    const header = el('div', { className: 'vu-modal-header' }, [
      el('div', {}, [
        el('span', { className: 'vu-puzzle-kicker', text: i18n.t('debrief.title') }),
        el('h2', { className: 'vu-modal-title', text: i18n.t('debrief.chapterComplete') })
      ])
    ]);

    const body = el('div', { className: 'vu-modal-body' });
    const grid = el('div', { className: 'vu-debrief-grid' });

    // Left column: Rank Seal + Stats + Haiku
    const leftCol = el('div', { className: 'vu-pz-pane' }, [
      el('div', { className: 'vu-pz-subhead', text: `${i18n.t('debrief.rankLabel')}: ${grade.titleRu}` }),
      el('div', { className: 'vu-rank-seal', text: grade.rank }),
      el('div', { className: 'vu-mail-meta' }, [
        el('div', { text: `${i18n.t('debrief.alarms')}: ${stats.alarms || 0}` }),
        el('div', { text: `${i18n.t('debrief.takedowns')}: ${stats.takedowns || 0}` }),
        el('div', { text: `${i18n.t('debrief.hints')}: ${stats.hintsUsed || 0}` }),
        el('div', { text: `${i18n.t('debrief.time')}: ${timeFormatted}` })
      ]),
      el('div', { className: 'vu-pz-subhead', text: i18n.t('debrief.haikuTitle') }),
      el(
        'div',
        { className: 'vu-haiku-box' },
        haikuLines.map((line) => el('div', { text: line }))
      )
    ]);

    // Right column: Codex cards per learned concept
    const rightCol = el('div', { className: 'vu-pz-pane' }, [
      el('div', { className: 'vu-pz-subhead', text: i18n.t('debrief.codexTitle') })
    ]);

    const codexList = el('div', { className: 'vu-chip-list' });
    const allCards = Codex.getCards(unlockedCodexIds);
    for (const c of allCards) {
      codexList.appendChild(
        el('div', { className: 'vu-life-tip-box' }, [
          el('div', { className: 'vu-life-tip-header', text: `${c.topic} · ${c.title}` }),
          el('p', { className: 'vu-life-tip-body', text: c.lifeTip })
        ])
      );
    }
    rightCol.appendChild(codexList);

    grid.appendChild(leftCol);
    grid.appendChild(rightCol);
    body.appendChild(grid);

    const footer = el('div', { className: 'vu-modal-footer' }, [
      el('button', {
        className: 'vu-btn vu-btn-outline',
        text: i18n.t('debrief.replayBtn'),
        attrs: { 'data-start': 'true' },
        onClick: () => {
          this.close();
          this.callbacks.onReplay();
        }
      }),
      el('button', {
        className: 'vu-btn vu-btn-primary',
        text: i18n.t('debrief.menuBtn'),
        attrs: { 'data-testid': 'debrief-menu-btn' },
        onClick: () => {
          this.close();
          this.callbacks.onExitToMenu();
        }
      })
    ]);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    backdrop.appendChild(card);
    this.modalEl = backdrop;
    this.parent.appendChild(backdrop);
  }

  close() {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
  }
}
