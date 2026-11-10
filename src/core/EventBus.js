/**
 * @fileoverview Lightweight pub/sub EventBus to decouple game systems.
 */

export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event topic.
   * @param {string} event
   * @param {Function} handler
   * @returns {() => void} Unsubscribe callback
   */
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event);
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  /**
   * Subscribe once to an event topic.
   * @param {string} event
   * @param {Function} handler
   * @returns {() => void}
   */
  once(event, handler) {
    const off = this.on(event, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  /**
   * Emit an event with payload.
   * @param {string} event
   * @param {any} [payload]
   */
  emit(event, payload) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }
    }
  }

  /**
   * Remove all listeners for cleanup.
   */
  clear() {
    this.listeners.clear();
  }
}
