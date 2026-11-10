/**
 * @fileoverview Mission objective tracker for each level.
 */

export class ObjectivesSystem {
  /**
   * Compute the active objective string (in Russian) for the current level state.
   * @param {import('../Level.js').Level} level
   * @returns {{textRu: string, completedCount: number, totalCount: number}}
   */
  static getStatus(level) {
    if (!level) {
      return { textRu: '', completedCount: 0, totalCount: 0 };
    }

    const totalTerms = level.terminals.length;
    const solvedTerms = level.terminals.filter((t) => t.solved).length;

    if (totalTerms > 0 && solvedTerms < totalTerms) {
      const nextTerm = level.terminals.find((t) => !t.solved);
      const label = nextTerm ? nextTerm.labelRu : 'терминал';
      return {
        textRu: `${level.objectiveTextRu || 'Взломать узлы защиты'} (${solvedTerms}/${totalTerms} · ${label})`,
        completedCount: solvedTerms,
        totalCount: totalTerms
      };
    }

    return {
      textRu: level.exitObjectiveTextRu || 'Добраться до врат перехода к следующему сектору',
      completedCount: totalTerms,
      totalCount: totalTerms
    };
  }
}
