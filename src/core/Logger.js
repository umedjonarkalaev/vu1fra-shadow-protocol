/**
 * @fileoverview Ring-buffer logger keeping the last 100 entries for diagnostics and ErrorOverlay reports.
 */

export class Logger {
  constructor(capacity = 100) {
    this.capacity = capacity;
    /** @type {Array<{time: number, level: string, msg: string, data?: any}>} */
    this.entries = [];
  }

  /**
   * @param {'INFO'|'WARN'|'ERROR'} level
   * @param {string} msg
   * @param {any} [data]
   */
  log(level, msg, data) {
    const entry = {
      time: Math.round(performance.now()),
      level,
      msg: String(msg),
      data: data !== undefined ? this.safeSerialize(data) : undefined
    };
    this.entries.push(entry);
    if (this.entries.length > this.capacity) {
      this.entries.shift();
    }
    if (level === 'ERROR') {
      console.error(`[VU1FRA:${level}] ${msg}`, data || '');
    } else if (level === 'WARN') {
      console.warn(`[VU1FRA:${level}] ${msg}`, data || '');
    }
  }

  info(msg, data) {
    this.log('INFO', msg, data);
  }

  warn(msg, data) {
    this.log('WARN', msg, data);
  }

  error(msg, data) {
    this.log('ERROR', msg, data);
  }

  safeSerialize(val) {
    if (val instanceof Error) {
      return { message: val.message, stack: val.stack };
    }
    try {
      return JSON.parse(JSON.stringify(val));
    } catch {
      return String(val);
    }
  }

  getRecentLines() {
    return this.entries.map(
      (e) => `[${(e.time / 1000).toFixed(2)}s] ${e.level}: ${e.msg}${e.data ? ' ' + JSON.stringify(e.data) : ''}`
    );
  }
}

export const logger = new Logger(100);
