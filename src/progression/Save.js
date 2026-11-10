/**
 * @fileoverview Versioned save system with schema migration, settings persistence, and corruption recovery.
 */

import { Storage } from '../core/Storage.js';
import { logger } from '../core/Logger.js';

const SAVE_KEY = 'save_state';
const CURRENT_VERSION = 2;

export function createDefaultSave() {
  return {
    version: CURRENT_VERSION,
    hasStarted: false,
    currentChapterId: 'ch01_roofs',
    currentLevelIndex: 0,
    unlockedChapters: ['ch01_roofs'],
    unlockedLevels: {
      ch01_roofs: 0
    },
    completedPuzzles: [],
    unlockedCodexIds: [],
    chapterStats: {
      ch01_roofs: {
        alarms: 0,
        takedowns: 0,
        hintsUsed: 0,
        elapsedSec: 0,
        bestRank: null
      }
    },
    settings: {
      masterVolume: 0.8,
      musicVolume: 0.7,
      sfxVolume: 0.85,
      muted: false,
      qualityTier: 'AUTO', // AUTO | HIGH | MED | LOW
      controlSize: 'M', // S | M | L
      controlOpacity: 0.4,
      leftHanded: false,
      joystickMode: 'DYNAMIC', // DYNAMIC | FIXED
      sprintMode: 'HOLD', // HOLD | TOGGLE
      haptics: true,
      puzzleFullPause: false,
      reduceMotion: false
    }
  };
}

export class SaveManager {
  constructor(storage = new Storage()) {
    this.storage = storage;
    this.state = this.load();
  }

  load() {
    const rawObj = this.storage.getJSON(SAVE_KEY);
    if (!rawObj || typeof rawObj !== 'object') {
      const fresh = createDefaultSave();
      this.storage.setJSON(SAVE_KEY, fresh);
      return fresh;
    }

    try {
      const migrated = this.migrate(rawObj);
      this.storage.setJSON(SAVE_KEY, migrated);
      return migrated;
    } catch (err) {
      logger.warn('Save migration failed; backing up and creating fresh save', err);
      this.storage.setJSON(`${SAVE_KEY}_migration_backup`, rawObj);
      const fresh = createDefaultSave();
      this.storage.setJSON(SAVE_KEY, fresh);
      return fresh;
    }
  }

  /**
   * Migrate older save structures up to CURRENT_VERSION.
   * @param {any} data
   */
  migrate(data) {
    const defaults = createDefaultSave();
    let v = typeof data.version === 'number' ? data.version : 1;

    if (v < 2) {
      // Migrate v1 -> v2
      data.version = 2;
      if (!Array.isArray(data.unlockedCodexIds)) {
        data.unlockedCodexIds = [];
      }
      if (!data.chapterStats || typeof data.chapterStats !== 'object') {
        data.chapterStats = defaults.chapterStats;
      }
    }

    // Merge safely with defaults so missing keys never crash
    return {
      ...defaults,
      ...data,
      version: CURRENT_VERSION,
      unlockedLevels: {
        ...defaults.unlockedLevels,
        ...(data.unlockedLevels || {})
      },
      chapterStats: {
        ...defaults.chapterStats,
        ...(data.chapterStats || {})
      },
      settings: {
        ...defaults.settings,
        ...(data.settings || {})
      }
    };
  }

  save() {
    this.storage.setJSON(SAVE_KEY, this.state);
  }

  updateSettings(partial) {
    this.state.settings = {
      ...this.state.settings,
      ...partial
    };
    this.save();
  }

  recordLevelProgress(chapterId, levelIndex) {
    this.state.hasStarted = true;
    this.state.currentChapterId = chapterId;
    this.state.currentLevelIndex = levelIndex;
    const prevUnlocked = this.state.unlockedLevels[chapterId] ?? 0;
    if (levelIndex > prevUnlocked) {
      this.state.unlockedLevels[chapterId] = levelIndex;
    }
    this.save();
  }

  recordPuzzleSolved(puzzleId, codexId, hintsUsed = 0) {
    if (!this.state.completedPuzzles.includes(puzzleId)) {
      this.state.completedPuzzles.push(puzzleId);
    }
    if (codexId && !this.state.unlockedCodexIds.includes(codexId)) {
      this.state.unlockedCodexIds.push(codexId);
    }
    const ch = this.state.currentChapterId;
    if (this.state.chapterStats[ch]) {
      this.state.chapterStats[ch].hintsUsed += hintsUsed;
    }
    this.save();
  }

  resetAll() {
    this.state = createDefaultSave();
    this.save();
    return this.state;
  }
}
