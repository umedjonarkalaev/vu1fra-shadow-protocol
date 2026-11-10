/**
 * @fileoverview Central Content Registry. Adding a chapter requires only importing its folder
 * and adding ONE line in CHAPTER_REGISTRY below—zero engine changes.
 */

import { CHAPTER_01 } from './chapters/ch01_roofs/chapter.js';
import { CHAPTER_02 } from './chapters/ch02_docks/chapter.js';
import { CHAPTER_03 } from './chapters/ch03_metro/chapter.js';
import { CHAPTER_04 } from './chapters/ch04_exchange/chapter.js';
import { CHAPTER_05 } from './chapters/ch05_sanctum/chapter.js';
import { CHAPTER_06 } from './chapters/ch06_eclipse/chapter.js';
import { puzzleRegistry } from '../puzzles/PuzzleRegistry.js';
import { PhishingPuzzleType } from '../puzzles/types/PhishingPuzzle.js';
import { PasswordPuzzleType } from '../puzzles/types/PasswordPuzzle.js';
import { LogPuzzleType } from '../puzzles/types/LogPuzzle.js';
import { TerminalPuzzleType } from '../puzzles/types/TerminalPuzzle.js';
import { OsintScamPuzzleType } from '../puzzles/types/OsintScamPuzzle.js';
import { i18n } from '../i18n/I18n.js';

// Register all puzzle types once
puzzleRegistry.register(PhishingPuzzleType);
puzzleRegistry.register(PasswordPuzzleType);
puzzleRegistry.register(LogPuzzleType);
puzzleRegistry.register(TerminalPuzzleType);
puzzleRegistry.register(OsintScamPuzzleType);

export const CHAPTER_REGISTRY = [
  CHAPTER_01,
  CHAPTER_02,
  CHAPTER_03,
  CHAPTER_04,
  CHAPTER_05,
  CHAPTER_06
];

// Merge chapter localized strings into i18n
for (const ch of CHAPTER_REGISTRY) {
  if (ch.stringsRu) {
    i18n.extend('ru', ch.stringsRu);
  }
}

export function getChapterById(id) {
  return CHAPTER_REGISTRY.find((c) => c.id === id) || CHAPTER_01;
}

export function getPuzzleById(chapterId, puzzleId) {
  const ch = getChapterById(chapterId);
  return ch?.puzzles?.[puzzleId] || null;
}
