/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import './ui/styles.css';
import { Game } from './core/Game.js';

let activeGameInstance: Game | null = null;

export function mountGame(container: HTMLElement): Game {
  if (activeGameInstance) {
    return activeGameInstance;
  }

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
    (window as unknown as Record<string, unknown>).__VU1FRA_GAME__ = activeGameInstance;
  }
  activeGameInstance.init();
  return activeGameInstance;
}

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      mountGame(containerRef.current);
    }
  }, []);

  return <div ref={containerRef} className="vu-shell" />;
}
