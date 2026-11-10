/**
 * @fileoverview Zero-GC pre-allocated object pool for particles and sound ripples.
 */

export class Pool {
  /**
   * @template T
   * @param {() => T} factory
   * @param {(item: T) => void} reset
   * @param {number} capacity
   */
  constructor(factory, reset, capacity = 256) {
    this.factory = factory;
    this.reset = reset;
    this.capacity = capacity;
    this.items = new Array(capacity);
    this.activeCount = 0;

    for (let i = 0; i < capacity; i++) {
      this.items[i] = factory();
    }
  }

  /**
   * Acquire an object from the pool, recycling the oldest if at capacity.
   * @returns {any}
   */
  acquire() {
    if (this.activeCount < this.capacity) {
      const item = this.items[this.activeCount++];
      this.reset(item);
      return item;
    }
    // Recycle index 0 by swapping with the end
    const recycled = this.items[0];
    this.reset(recycled);
    return recycled;
  }

  /**
   * Release an active item at index i by swapping with the last active element.
   * @param {number} index
   */
  releaseAt(index) {
    if (index < 0 || index >= this.activeCount) return;
    this.activeCount--;
    const temp = this.items[this.activeCount];
    this.items[this.activeCount] = this.items[index];
    this.items[index] = temp;
  }

  /**
   * Clear all active items without reallocating.
   */
  clear() {
    this.activeCount = 0;
  }
}
