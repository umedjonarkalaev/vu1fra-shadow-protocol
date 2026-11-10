/**
 * @fileoverview Localization dictionary lookup with fallback chain (active locale -> ru -> key).
 */

import { RU_STRINGS } from './ru.js';

export class I18n {
  constructor(defaultLocale = 'ru') {
    this.locale = defaultLocale;
    this.dictionaries = {
      ru: structuredClone ? structuredClone(RU_STRINGS) : JSON.parse(JSON.stringify(RU_STRINGS))
    };
  }

  /**
   * Merge chapter or plugin strings into a locale dictionary.
   * @param {string} locale
   * @param {Record<string, any>} bundle
   */
  extend(locale, bundle) {
    if (!this.dictionaries[locale]) {
      this.dictionaries[locale] = {};
    }
    this.deepMerge(this.dictionaries[locale], bundle);
  }

  deepMerge(target, source) {
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  /**
   * Resolve a dot-separated key with optional template replacements.
   * @param {string} key
   * @param {Record<string, string|number>} [params]
   * @returns {string}
   */
  t(key, params) {
    const val = this.lookup(this.locale, key) ?? this.lookup('ru', key) ?? key;
    if (!params) return String(val);
    return String(val).replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? String(params[k]) : `{${k}}`));
  }

  /**
   * Check whether a string key exists in the dictionary.
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return (this.lookup(this.locale, key) ?? this.lookup('ru', key)) !== undefined;
  }

  lookup(locale, path) {
    const dict = this.dictionaries[locale];
    if (!dict) return undefined;
    const parts = path.split('.');
    let cur = dict;
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in cur) {
        cur = cur[p];
      } else {
        return undefined;
      }
    }
    return cur;
  }
}

export const i18n = new I18n('ru');
