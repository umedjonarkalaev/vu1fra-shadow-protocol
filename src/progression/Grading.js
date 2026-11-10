/**
 * @fileoverview Shinobi operation grading (S / A / B / C) based on alarms, takedowns, hints, and time.
 */

export class Grading {
  /**
   * @param {{alarms: number, takedowns: number, hintsUsed: number, elapsedSec: number}} stats
   * @returns {{rank: 'S'|'A'|'B'|'C', score: number, titleRu: string}}
   */
  static evaluate(stats) {
    const alarms = stats.alarms || 0;
    const takedowns = stats.takedowns || 0;
    const hints = stats.hintsUsed || 0;
    const elapsed = stats.elapsedSec || 0;

    let score = 1000;
    score -= alarms * 240;
    score -= hints * 100;
    // Non-lethal takedowns are allowed, but pure ghosting earns a slight edge
    score -= Math.max(0, takedowns - 2) * 30;
    if (elapsed > 600) {
      score -= Math.min(200, Math.floor((elapsed - 600) / 10) * 10);
    }
    score = Math.max(100, score);

    if (alarms === 0 && hints === 0 && score >= 900) {
      return { rank: 'S', score, titleRu: 'Призрак Нео-Эдо' };
    }
    if (alarms <= 1 && score >= 720) {
      return { rank: 'A', score, titleRu: 'Мастер Тени' };
    }
    if (score >= 480) {
      return { rank: 'B', score, titleRu: 'Ночной страж' };
    }
    return { rank: 'C', score, titleRu: 'Ученик тумана' };
  }
}
