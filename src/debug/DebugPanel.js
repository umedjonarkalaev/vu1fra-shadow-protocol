/**
 * @fileoverview Developer Debug Panel (`?debug=1` only — never visible in normal user sessions).
 * Provides FPS readout, state name, hitboxes/cones toggle, god mode, skip puzzle, and teleport to exit.
 */

import { el } from '../puzzles/PuzzleRegistry.js';

export class DebugPanel {
  /**
   * @param {HTMLElement} parent
   * @param {import('../core/Game.js').Game} game
   */
  constructor(parent, game) {
    this.parent = parent;
    this.game = game;
    this.enabled = false;
    this.showHitboxes = false;
    this.godMode = false;
    this.panelEl = null;
    this.fpsSpan = null;
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;

    const bar = el('div', {
      className: 'vu-hud-toast',
      attrs: { 'data-testid': 'debug-panel' }
    });
    bar.style.top = 'auto';
    bar.style.bottom = '8px';
    bar.style.left = '12px';
    bar.style.transform = 'none';
    bar.style.zIndex = '90';
    bar.style.pointerEvents = 'auto';
    bar.style.display = 'flex';
    bar.style.gap = '6px';
    bar.style.alignItems = 'center';

    this.fpsSpan = el('span', { text: '60 FPS' });

    const godBtn = el('button', {
      className: 'vu-btn',
      text: 'God: OFF',
      onClick: () => {
        this.godMode = !this.godMode;
        godBtn.textContent = `God: ${this.godMode ? 'ON' : 'OFF'}`;
      }
    });

    const boxBtn = el('button', {
      className: 'vu-btn',
      text: 'Boxes',
      onClick: () => {
        this.showHitboxes = !this.showHitboxes;
      }
    });

    const skipPzBtn = el('button', {
      className: 'vu-btn',
      text: 'Skip Puzzle',
      onClick: () => this.game.debugSkipActivePuzzle()
    });

    const tpExitBtn = el('button', {
      className: 'vu-btn',
      text: 'TP Exit',
      onClick: () => this.game.debugTeleportToExit()
    });

    bar.appendChild(this.fpsSpan);
    bar.appendChild(godBtn);
    bar.appendChild(boxBtn);
    bar.appendChild(skipPzBtn);
    bar.appendChild(tpExitBtn);

    this.panelEl = bar;
    this.parent.appendChild(bar);
  }

  update(frameTimeMs, stateName) {
    if (!this.enabled || !this.fpsSpan) return;
    const fps = Math.min(60, Math.round(1000 / Math.max(1, frameTimeMs)));
    this.fpsSpan.textContent = `${fps} FPS · ${stateName}`;
  }

  drawDebugOverlay(ctx, level, camera) {
    if (!this.enabled || !this.showHitboxes || !level) return;
    const S = camera.tileScale;
    ctx.save();
    ctx.strokeStyle = '#3df2ff';
    ctx.lineWidth = 1.5;

    const h = level.hero;
    ctx.strokeRect(
      camera.worldToScreenX(h.x - h.width * 0.5),
      camera.worldToScreenY(h.y - h.height),
      h.width * S,
      h.height * S
    );

    // Critical path line
    ctx.strokeStyle = '#ffb14a';
    ctx.beginPath();
    level.criticalPath.forEach((pt, idx) => {
      const sx = camera.worldToScreenX(pt.x);
      const sy = camera.worldToScreenY(pt.y);
      if (idx === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();
    ctx.restore();
  }
}
