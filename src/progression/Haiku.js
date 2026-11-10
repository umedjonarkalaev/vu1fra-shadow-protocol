/**
 * @fileoverview Auto-generates short Russian haiku reflecting the player's stealth run.
 */

export class HaikuGenerator {
  /**
   * @param {{alarms: number, takedowns: number, hintsUsed: number, rank: string}} stats
   * @returns {string[]} Three lines of Russian haiku
   */
  static generate(stats) {
    const alarms = stats.alarms || 0;
    const takedowns = stats.takedowns || 0;

    if (alarms === 0 && takedowns === 0) {
      return [
        'Туман над крышей —',
        'Ни единый страж не знал,',
        'Что тень прошла здесь.'
      ];
    }

    if (alarms === 0 && takedowns > 0) {
      return [
        'Гаснет свет фонаря,',
        'Спят дозорные в ночи —',
        'Паутина рвётся.'
      ];
    }

    if (alarms <= 2) {
      return [
        'Луч прожектора',
        'Резнул синюю мглу крыш,',
        'Но правда спасена.'
      ];
    }

    return [
      'Гром сирен в ночи,',
      'Сквозь холодный дождь и сталь',
      'Путь к рассвету взят.'
    ];
  }
}
