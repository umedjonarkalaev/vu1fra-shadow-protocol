/**
 * @fileoverview Deterministic seedable PRNG (Mulberry32) for procedural visuals, rain, petals, and haiku.
 */

export class Rng {
  /**
   * @param {number} [seed=1337]
   */
  constructor(seed = 1337) {
    this.seed = seed >>> 0;
  }

  /**
   * Returns a float in [0, 1).
   * @returns {number}
   */
  next() {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a float in [min, max).
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  range(min, max) {
    return min + this.next() * (max - min);
  }

  /**
   * Returns an integer in [min, max].
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Picks a random element from a non-empty array.
   * @template T
   * @param {readonly T[]} list
   * @returns {T}
   */
  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }
}
