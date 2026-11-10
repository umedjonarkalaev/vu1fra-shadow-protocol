/**
 * @fileoverview Optional external image loader with 3s timeout and automatic procedural fallback.
 */

import { ASSET_MANIFEST } from '../config.js';
import { logger } from '../core/Logger.js';

export class AssetLoader {
  constructor() {
    /** @type {Map<string, HTMLImageElement | null>} */
    this.images = new Map();
  }

  /**
   * Load all configured optional asset slots in parallel; never blocks or fails if none exist.
   */
  async loadAll() {
    const entries = Object.entries(ASSET_MANIFEST.slots || {});
    const tasks = entries.map(async ([slot, url]) => {
      if (!url) {
        this.images.set(slot, null);
        return;
      }
      const img = await this.loadImageWithTimeout(url, ASSET_MANIFEST.timeoutMs || 3000);
      this.images.set(slot, img);
    });
    await Promise.all(tasks);
  }

  /**
   * @param {string} url
   * @param {number} timeoutMs
   * @returns {Promise<HTMLImageElement | null>}
   */
  loadImageWithTimeout(url, timeoutMs) {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        let settled = false;
        const finish = (result) => {
          if (settled) return;
          settled = true;
          resolve(result);
        };
        const timer = window.setTimeout(() => {
          finish(null);
        }, timeoutMs);
        img.onload = () => {
          window.clearTimeout(timer);
          finish(img);
        };
        img.onerror = () => {
          window.clearTimeout(timer);
          finish(null);
        };
        img.src = url;
      } catch (err) {
        logger.warn(`Optional asset "${url}" fell back to procedural art`, err);
        resolve(null);
      }
    });
  }

  get(slot) {
    return this.images.get(slot) || null;
  }
}

export const assets = new AssetLoader();
