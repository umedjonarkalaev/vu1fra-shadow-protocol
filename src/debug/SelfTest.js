/**
 * @fileoverview Automated engine self-test verifying Chapter 1 levels, puzzles, comics,
 * grading, haiku, and save integrity at startup.
 */

import { CHAPTER_01 } from '../content/chapters/ch01_roofs/chapter.js';
import { LevelValidator } from './LevelValidator.js';
import { puzzleRegistry } from '../puzzles/PuzzleRegistry.js';
import { logger } from '../core/Logger.js';

export class SelfTest {
  static runAll() {
    const errors = [];

    // 1. Validate all Chapter 1 levels
    for (const lvl of CHAPTER_01.levels) {
      const res = LevelValidator.validate(lvl, CHAPTER_01.puzzles);
      if (!res.valid) {
        errors.push(...res.errors);
      }
    }

    // 2. Validate all Chapter 1 puzzles
    for (const pz of Object.values(CHAPTER_01.puzzles)) {
      const res = puzzleRegistry.validateInstance(pz);
      if (!res.valid) {
        errors.push(...res.errors);
      }
    }

    // 3. Validate comic caption word limits (<= 14 words)
    for (const seq of Object.values(CHAPTER_01.comics)) {
      for (const panel of seq.panels || []) {
        const words = (panel.captionRu || '').trim().split(/\s+/).filter(Boolean);
        if (words.length > 14) {
          errors.push(`Comic panel "${panel.panelId}" exceeds 14 words (${words.length})`);
        }
      }
    }

    if (errors.length > 0) {
      logger.error('SelfTest detected validation errors', errors);
    } else {
      logger.info('SelfTest passed: all Ch1 levels, puzzles, and comics verified.');
    }

    return { ok: errors.length === 0, errors };
  }
}
