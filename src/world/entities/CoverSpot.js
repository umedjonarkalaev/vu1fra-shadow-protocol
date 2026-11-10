/**
 * @fileoverview Foreground cover hiding spot (hanging Neo-Edo banner or shadow pipe alcove).
 */

export class CoverSpot {
  /**
   * @param {{
   *   id: string,
   *   x: number,
   *   y: number,
   *   kind?: 'banner'|'alcove'
   * }} def
   */
  constructor(def) {
    this.id = def.id;
    this.x = def.x;
    this.y = def.y;
    this.kind = def.kind || 'banner';
  }
}
