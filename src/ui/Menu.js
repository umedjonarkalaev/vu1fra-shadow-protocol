/**
 * @fileoverview Boot Splash ("Коснись экрана"), Main Menu ("VU1FRA // SHADOW PROTOCOL"),
 * Chapter Select modal (Ch1 playable + Ch2-Ch6 stubs), and Codex modal.
 * Zero keyboard hints anywhere. 5 taps on version label opens Gallery.
 */

import { el } from '../puzzles/PuzzleRegistry.js';
import { i18n } from '../i18n/I18n.js';
import { GAME_CONFIG } from '../config.js';
import { CHAPTER_REGISTRY } from '../content/registry.js';
import { Codex } from '../progression/Codex.js';
import { RotateScreen } from './RotateScreen.js';
import { pwaInstall } from './PWAInstall.js';

export class MenuUI {
  /**
   * @param {HTMLElement} parent
   * @param {{
   *   onUnlockSplash: () => void,
   *   onStartGame: (chapterId: string, levelIndex: number) => void,
   *   onOpenSettings: () => void,
   *   onOpenGallery: () => void
   * }} callbacks
   */
  constructor(parent, callbacks) {
    this.parent = parent;
    this.callbacks = callbacks;
    this.splashEl = null;
    this.menuEl = null;
    this.modalEl = null;
    this.versionTapCount = 0;
    this.versionTapClock = 0;
  }

  showSplash() {
    this.hideAll();
    this.splashEl = el(
      'div',
      {
        className: 'vu-splash-overlay',
        attrs: { 'data-testid': 'splash-screen', role: 'button', tabindex: '0' },
        onClick: () => {
          RotateScreen.requestLandscapeFullscreen();
          this.callbacks.onUnlockSplash();
        }
      },
      [
        el('div', { className: 'vu-splash-prompt', text: i18n.t('splash.prompt') }),
        el('div', { className: 'vu-splash-sub', text: i18n.t('splash.sub') })
      ]
    );
    this.parent.appendChild(this.splashEl);
  }

  /**
   * Render the landscape Main Menu over the live Neo-Edo rooftop canvas.
   * @param {import('../progression/Save.js').SaveManager} saveManager
   */
  showMainMenu(saveManager) {
    this.hideAll();
    const hasProgress = saveManager.state.hasStarted;
    const primaryLabel = hasProgress ? i18n.t('menu.continue') : i18n.t('menu.start');

    const wrap = el('div', { className: 'vu-menu-overlay', attrs: { 'data-testid': 'main-menu' } });
    const left = el('div', { className: 'vu-menu-left' });

    // Decorative vertical kanji "影" (Shadow)
    const kanji = el('div', {
      className: 'vu-menu-kanji-decor',
      text: '影',
      attrs: { 'aria-hidden': 'true' }
    });
    left.appendChild(kanji);

    // Custom inline SVG Title Lockup ("VU1FRA // SHADOW PROTOCOL")
    left.appendChild(this.createTitleSvg());
    left.appendChild(el('div', { className: 'vu-brush-divider' }));

    const nav = el('nav', { className: 'vu-menu-nav', attrs: { 'aria-label': 'Главное меню' } });

    const startBtn = el(
      'button',
      {
        className: 'vu-menu-btn vu-menu-btn-primary',
        attrs: { 'data-start': 'true', 'data-testid': 'menu-start' },
        onClick: (e) => {
          if (e.currentTarget instanceof HTMLElement) e.currentTarget.blur();
          const chId = saveManager.state.currentChapterId || 'ch01_roofs';
          const lvlIdx = hasProgress ? saveManager.state.currentLevelIndex || 0 : 0;
          this.callbacks.onStartGame(chId, lvlIdx);
        }
      },
      [
        el('span', { text: primaryLabel }),
        el('span', { className: 'vu-hanko-stamp', text: '影', attrs: { 'aria-hidden': 'true' } })
      ]
    );

    const chaptersBtn = el(
      'button',
      {
        className: 'vu-menu-btn',
        attrs: { 'data-testid': 'menu-chapters-btn' },
        onClick: () => this.openChaptersModal(saveManager)
      },
      [el('span', { text: i18n.t('menu.chapters') })]
    );

    const settingsBtn = el(
      'button',
      {
        className: 'vu-menu-btn',
        attrs: { 'data-testid': 'menu-settings-btn' },
        onClick: () => this.callbacks.onOpenSettings()
      },
      [el('span', { text: i18n.t('menu.settings') })]
    );

    nav.appendChild(startBtn);
    nav.appendChild(chaptersBtn);
    nav.appendChild(settingsBtn);

    if (pwaInstall.canInstall()) {
      const installBtn = el(
        'button',
        {
          className: 'vu-menu-btn',
          onClick: async () => {
            await pwaInstall.promptInstall();
            this.showMainMenu(saveManager);
          }
        },
        [el('span', { text: i18n.t('menu.installApp') })]
      );
      nav.appendChild(installBtn);
    }

    left.appendChild(nav);
    wrap.appendChild(left);

    // Version button (5 taps opens Gallery)
    const verBtn = el('button', {
      className: 'vu-version-tag',
      text: `v${GAME_CONFIG.version} · НЕО-ЭДО`,
      attrs: { 'aria-label': `Версия ${GAME_CONFIG.version}` },
      onClick: () => {
        const now = performance.now();
        if (now - this.versionTapClock > 2500) {
          this.versionTapCount = 0;
        }
        this.versionTapClock = now;
        this.versionTapCount++;
        if (this.versionTapCount >= 5) {
          this.versionTapCount = 0;
          this.callbacks.onOpenGallery();
        }
      }
    });
    wrap.appendChild(verBtn);

    this.menuEl = wrap;
    this.parent.appendChild(wrap);
  }

  createTitleSvg() {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 420 86');
    svg.setAttribute('class', 'vu-menu-title-svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', GAME_CONFIG.title);

    const titleText = document.createElementNS(svgNS, 'text');
    titleText.setAttribute('x', '0');
    titleText.setAttribute('y', '48');
    titleText.setAttribute('fill', '#e8e2cf');
    titleText.setAttribute('font-size', '46');
    titleText.setAttribute('font-weight', '300');
    titleText.setAttribute('letter-spacing', '10');
    titleText.textContent = GAME_CONFIG.heroCallsign;

    const slashLine = document.createElementNS(svgNS, 'line');
    slashLine.setAttribute('x1', '0');
    slashLine.setAttribute('y1', '58');
    slashLine.setAttribute('x2', '310');
    slashLine.setAttribute('y2', '58');
    slashLine.setAttribute('stroke', '#3df2ff');
    slashLine.setAttribute('stroke-width', '1.5');
    slashLine.setAttribute('stroke-opacity', '0.65');

    const subText = document.createElementNS(svgNS, 'text');
    subText.setAttribute('x', '2');
    subText.setAttribute('y', '78');
    subText.setAttribute('fill', '#8fa3c7');
    subText.setAttribute('font-size', '13');
    subText.setAttribute('font-weight', '400');
    subText.setAttribute('letter-spacing', '3.5');
    subText.textContent = `${GAME_CONFIG.subtitle} · ЗАКОН ТЕНИ`;

    svg.appendChild(titleText);
    svg.appendChild(slashLine);
    svg.appendChild(subText);
    return svg;
  }

  openChaptersModal(saveManager) {
    this.closeModal();
    const backdrop = el('div', { className: 'vu-modal-backdrop' });
    const card = el('div', { className: 'vu-modal-card', attrs: { role: 'dialog', 'aria-label': i18n.t('menu.chapters') } });

    const header = el('div', { className: 'vu-modal-header' }, [
      el('h2', { className: 'vu-modal-title', text: i18n.t('menu.chapters') }),
      el('div', { className: 'vu-puzzle-actions' }, [
        el('button', {
          className: 'vu-btn vu-btn-subtle',
          text: i18n.t('menu.codex'),
          onClick: () => this.openCodexModal(saveManager)
        }),
        el('button', {
          className: 'vu-btn vu-btn-outline',
          text: i18n.t('common.close'),
          onClick: () => this.closeModal()
        })
      ])
    ]);

    const body = el('div', { className: 'vu-modal-body' });
    const list = el('div', { className: 'vu-chapter-list' });

    for (const ch of CHAPTER_REGISTRY) {
      const chCard = el('div', {
        className: `vu-chapter-card ${ch.locked ? 'locked' : ''}`
      });
      chCard.appendChild(el('div', { className: 'vu-puzzle-kicker', text: ch.subtitleRu }));
      chCard.appendChild(el('h3', { className: 'vu-modal-title', text: ch.titleRu }));
      chCard.appendChild(el('p', { className: 'vu-puzzle-prompt', text: ch.teaserRu }));

      if (!ch.locked) {
        const lvlBar = el('div', { className: 'vu-chip-grid' });
        ch.levels.forEach((lvl, idx) => {
          const btn = el('button', {
            className: 'vu-btn vu-btn-primary',
            text: lvl.titleRu,
            onClick: () => {
              this.closeModal();
              this.callbacks.onStartGame(ch.id, idx);
            }
          });
          lvlBar.appendChild(btn);
        });
        chCard.appendChild(lvlBar);
      } else {
        chCard.appendChild(
          el('div', { className: 'vu-puzzle-kicker', text: i18n.t('menu.chapterLocked') })
        );
      }

      list.appendChild(chCard);
    }

    body.appendChild(list);
    card.appendChild(header);
    card.appendChild(body);
    backdrop.appendChild(card);
    this.modalEl = backdrop;
    this.parent.appendChild(backdrop);
  }

  openCodexModal(saveManager) {
    this.closeModal();
    const backdrop = el('div', { className: 'vu-modal-backdrop' });
    const card = el('div', { className: 'vu-modal-card', attrs: { role: 'dialog', 'aria-label': i18n.t('menu.codex') } });

    const header = el('div', { className: 'vu-modal-header' }, [
      el('h2', { className: 'vu-modal-title', text: i18n.t('debrief.codexTitle') }),
      el('button', {
        className: 'vu-btn vu-btn-outline',
        text: i18n.t('common.close'),
        onClick: () => this.closeModal()
      })
    ]);

    const body = el('div', { className: 'vu-modal-body' });
    const list = el('div', { className: 'vu-chip-list' });
    const cards = Codex.getCards(saveManager.state.unlockedCodexIds);

    for (const c of cards) {
      const box = el('div', { className: 'vu-life-tip-box' }, [
        el('div', { className: 'vu-life-tip-header', text: `${c.topic} · ${c.title}` }),
        el('p', { className: 'vu-puzzle-prompt', text: c.summary }),
        el('p', { className: 'vu-life-tip-body', text: `${i18n.t('puzzle.lifeTipHeader')}: ${c.lifeTip}` })
      ]);
      list.appendChild(box);
    }

    body.appendChild(list);
    card.appendChild(header);
    card.appendChild(body);
    backdrop.appendChild(card);
    this.modalEl = backdrop;
    this.parent.appendChild(backdrop);
  }

  closeModal() {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
  }

  hideAll() {
    this.closeModal();
    if (this.splashEl) {
      this.splashEl.remove();
      this.splashEl = null;
    }
    if (this.menuEl) {
      this.menuEl.remove();
      this.menuEl = null;
    }
  }
}
