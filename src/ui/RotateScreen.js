/**
 * @fileoverview Portrait-mode blocker ("Поверни телефон").
 * When window.innerWidth < window.innerHeight, hides the entire game and displays an animated
 * rotating phone over Neo-Edo fog plus a "На весь экран" button that requests fullscreen
 * and attempts `screen.orientation.lock('landscape')` safely inside try/catch.
 */

import { el } from '../puzzles/PuzzleRegistry.js';
import { i18n } from '../i18n/I18n.js';

export class RotateScreen {
  /**
   * @param {HTMLElement} parent
   * @param {(isPortrait: boolean) => void} onOrientationStateChange
   */
  constructor(parent, onOrientationStateChange) {
    this.parent = parent;
    this.onOrientationStateChange = onOrientationStateChange;
    this.isPortrait = false;
    this.container = this.buildDOM();
    this.parent.appendChild(this.container);

    this.boundCheck = this.checkOrientation.bind(this);
  }

  buildDOM() {
    const wrap = el('div', {
      className: 'vu-rotate-screen hidden',
      attrs: { 'data-testid': 'rotate-screen', role: 'alert' }
    });

    const iconWrap = el('div', { className: 'vu-rotate-icon-wrap' });
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 64 64');
    svg.setAttribute('width', '68');
    svg.setAttribute('height', '68');
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', '18');
    rect.setAttribute('y', '8');
    rect.setAttribute('width', '28');
    rect.setAttribute('height', '48');
    rect.setAttribute('rx', '4');
    rect.setAttribute('fill', 'none');
    rect.setAttribute('stroke', '#3df2ff');
    rect.setAttribute('stroke-width', '2.5');
    svg.appendChild(rect);
    iconWrap.appendChild(svg);

    const title = el('h1', { className: 'vu-rotate-title', text: i18n.t('rotate.title') });
    const sub = el('p', { className: 'vu-rotate-sub', text: i18n.t('rotate.subtitle') });
    const fsBtn = el('button', {
      className: 'vu-btn vu-btn-primary',
      text: i18n.t('rotate.fullscreenBtn'),
      onClick: () => RotateScreen.requestLandscapeFullscreen()
    });

    wrap.appendChild(iconWrap);
    wrap.appendChild(title);
    wrap.appendChild(sub);
    wrap.appendChild(fsBtn);
    return wrap;
  }

  attach() {
    window.addEventListener('resize', this.boundCheck);
    window.addEventListener('orientationchange', this.boundCheck);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this.boundCheck);
    }
    this.checkOrientation();
  }

  detach() {
    window.removeEventListener('resize', this.boundCheck);
    window.removeEventListener('orientationchange', this.boundCheck);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.boundCheck);
    }
  }

  checkOrientation() {
    const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const nowPortrait = vw < vh;
    if (nowPortrait !== this.isPortrait) {
      this.isPortrait = nowPortrait;
      if (nowPortrait) {
        this.container.classList.remove('hidden');
      } else {
        this.container.classList.add('hidden');
      }
      this.onOrientationStateChange(nowPortrait);
    }
  }

  static async requestLandscapeFullscreen() {
    if (typeof navigator !== 'undefined' && navigator.webdriver) {
      return;
    }
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen && !document.fullscreenElement) {
        await docEl.requestFullscreen();
      }
    } catch {
      // Ignore if blocked by browser/iframe permissions
    }
    try {
      if (screen.orientation && typeof screen.orientation.lock === 'function') {
        await screen.orientation.lock('landscape');
      }
    } catch {
      // Feature-detected & silent-safe
    }
  }
}
