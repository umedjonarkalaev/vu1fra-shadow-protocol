/**
 * @fileoverview PuzzleRegistry managing puzzle type modules and schema validation,
 * plus a safe DOM builder (`el`) that strictly uses `textContent` (never `innerHTML` or `eval`).
 */

/**
 * Safe DOM element builder using only `document.createElement` and `textContent`.
 * @param {string} tag
 * @param {{
 *   className?: string,
 *   text?: string,
 *   attrs?: Record<string, string>,
 *   onClick?: (e: MouseEvent) => void
 * }} [opts]
 * @param {Array<HTMLElement | null | undefined>} [children]
 * @returns {HTMLElement}
 */
export function el(tag, opts = {}, children = []) {
  const node = document.createElement(tag);
  if (opts.className) node.className = opts.className;
  if (opts.text !== undefined) node.textContent = String(opts.text);
  if (opts.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) {
      node.setAttribute(k, String(v));
    }
  }
  if (opts.onClick) {
    node.addEventListener('click', opts.onClick);
  }
  for (const child of children) {
    if (child) node.appendChild(child);
  }
  return node;
}

export class PuzzleRegistry {
  constructor() {
    /** @type {Map<string, any>} */
    this.types = new Map();
  }

  /**
   * Register a puzzle type handler `{ id, schema, createController(data, ctx) }`.
   * @param {any} typeModule
   */
  register(typeModule) {
    if (!typeModule || !typeModule.id) {
      throw new Error('Puzzle type module must have an id');
    }
    this.types.set(typeModule.id, typeModule);
  }

  get(typeId) {
    return this.types.get(typeId) || null;
  }

  /**
   * Validate a puzzle instance data object against its type schema.
   * @param {any} puzzleData
   * @returns {{valid: boolean, errors: string[]}}
   */
  validateInstance(puzzleData) {
    const errors = [];
    if (!puzzleData || typeof puzzleData !== 'object') {
      return { valid: false, errors: ['Puzzle data is not an object'] };
    }
    if (!puzzleData.id) errors.push('Missing puzzle id');
    if (!puzzleData.type) errors.push('Missing puzzle type');
    if (!puzzleData.explanationRu) errors.push(`Puzzle "${puzzleData.id}" missing explanationRu`);
    if (!puzzleData.lifeTipRu) errors.push(`Puzzle "${puzzleData.id}" missing lifeTipRu`);

    const typeMod = this.get(puzzleData.type);
    if (!typeMod) {
      errors.push(`Unknown puzzle type "${puzzleData.type}"`);
    } else if (typeMod.schema && Array.isArray(typeMod.schema.requiredPayloadFields)) {
      const payload = puzzleData.payload || {};
      for (const field of typeMod.schema.requiredPayloadFields) {
        if (payload[field] === undefined || payload[field] === null) {
          errors.push(`Puzzle "${puzzleData.id}" missing payload.${field}`);
        }
      }
      if (typeof typeMod.validatePayload === 'function') {
        const extraErrors = typeMod.validatePayload(payload);
        if (Array.isArray(extraErrors)) errors.push(...extraErrors);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

export const puzzleRegistry = new PuzzleRegistry();
