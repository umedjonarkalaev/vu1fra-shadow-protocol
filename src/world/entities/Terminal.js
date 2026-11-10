/**
 * @fileoverview Interactive hacking terminal entity linked to a puzzleId and Codex lesson.
 */

export class Terminal {
  /**
   * @param {{
   *   id: string,
   *   x: number,
   *   y: number,
   *   puzzleId: string,
   *   labelRu?: string
   * }} def
   */
  constructor(def) {
    this.id = def.id;
    this.x = def.x;
    this.y = def.y;
    this.puzzleId = def.puzzleId;
    this.labelRu = def.labelRu || 'Терминал';
    this.solved = false;
  }
}
