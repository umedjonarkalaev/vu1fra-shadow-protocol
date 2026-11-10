/**
 * @fileoverview Safe localStorage wrapper with in-memory fallback and corrupted-save backup support.
 */

import { logger } from './Logger.js';

export class Storage {
  constructor(prefix = 'vu1fra_') {
    this.prefix = prefix;
    /** @type {Map<string, string>} */
    this.memory = new Map();
  }

  /**
   * @param {string} key
   * @returns {string | null}
   */
  getRaw(key) {
    const fullKey = this.prefix + key;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(fullKey);
        if (val !== null) return val;
      }
    } catch {
      // Fallback to in-memory
    }
    return this.memory.get(fullKey) ?? null;
  }

  /**
   * @param {string} key
   * @param {string} value
   */
  setRaw(key, value) {
    const fullKey = this.prefix + key;
    this.memory.set(fullKey, value);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(fullKey, value);
      }
    } catch (err) {
      logger.warn('localStorage write failed; using in-memory fallback', err);
    }
  }

  /**
   * @param {string} key
   */
  remove(key) {
    const fullKey = this.prefix + key;
    this.memory.delete(fullKey);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(fullKey);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Read JSON safely; if corrupted, backs up the raw string under `<key>_corrupt_backup` and returns null.
   * @param {string} key
   * @returns {any | null}
   */
  getJSON(key) {
    const raw = this.getRaw(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      logger.warn(`Corrupted JSON in storage key "${key}"; backing up and resetting`, err);
      this.setRaw(`${key}_corrupt_backup`, raw);
      return null;
    }
  }

  /**
   * @param {string} key
   * @param {any} data
   */
  setJSON(key, data) {
    try {
      this.setRaw(key, JSON.stringify(data));
    } catch (err) {
      logger.error(`Failed to serialize JSON for key "${key}"`, err);
    }
  }
}
