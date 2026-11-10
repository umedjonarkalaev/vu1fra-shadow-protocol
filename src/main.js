/**
 * @fileoverview Framework-agnostic bootstrapper for VU1FRA // SHADOW PROTOCOL.
 * Mounts the game engine into a DOM container and manages Service Worker registration safely.
 */

import './ui/styles.css';
import { Game } from './core/Game.js';

let activeGameInstance = null;

/**
 * Mount the game into `container` (idempotent).
 * @param {HTMLElement} container
 * @returns {Game}
 */
export function mountGame(container) {
  if (activeGameInstance) {
    return activeGameInstance;
  }

  // Manage Service Worker safely in try/catch
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && !navigator.webdriver) {
      const inIframe = (() => {
        try {
          return window.self !== window.top;
        } catch {
          return true;
        }
      })();

      if (inIframe) {
        // Inside preview iframe: unregister any stale SW that could block cross-origin iframe navigation
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => {
            for (const r of regs) r.unregister().catch(() => {});
          })
          .catch(() => {});
        if (typeof caches !== 'undefined' && caches.keys) {
          caches
            .keys()
            .then((keys) => keys.forEach((k) => caches.delete(k).catch(() => {})))
            .catch(() => {});
        }
      } else {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').catch(() => {});
        });
      }
    }
  } catch {
    // Ignore if unavailable
  }

  activeGameInstance = new Game(container);
  if (typeof window !== 'undefined') {
    window.__VU1FRA_GAME__ = activeGameInstance;
  }
  activeGameInstance.init();
  return activeGameInstance;
}
