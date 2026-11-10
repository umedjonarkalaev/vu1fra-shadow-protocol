/**
 * @fileoverview Landscape Touch Controls:
 * - LEFT (or RIGHT in left-handed mode): dynamic or fixed analog joystick (left 40% of screen, deadzone 12%).
 * - RIGHT thumb arc (min 56px targets, >= 12px gaps): JUMP (72px), SPRINT (60px), ACTION (62px contextual), SHADOW (56px).
 * - Multi-touch via Pointer Events with `pointerId` tracking and `setPointerCapture`.
 */

import { el } from '../puzzles/PuzzleRegistry.js';
import { i18n } from '../i18n/I18n.js';

export class TouchControls {
  /**
   * @param {HTMLElement} parent
   * @param {import('../input/InputManager.js').InputManager} input
   */
  constructor(parent, input) {
    this.parent = parent;
    this.input = input;
    this.joystickPointerId = null;
    this.joyOriginX = 110;
    this.joyOriginY = 0;
    this.joyMaxRadius = 52;
    this.joystickMode = 'DYNAMIC';
    this.baseOpacity = 0.4;

    this.root = this.buildDOM();
    this.parent.appendChild(this.root);
  }

  buildDOM() {
    const layer = el('div', {
      className: 'vu-touch-layer hidden',
      attrs: { 'data-testid': 'touch-controls' }
    });

    // Left thumb joystick zone
    this.joyZone = el('div', { className: 'vu-joystick-zone' });
    this.joyBase = el('div', { className: 'vu-joystick-base' });
    this.joyStick = el('div', { className: 'vu-joystick-stick' });
    this.joyBase.appendChild(this.joyStick);
    this.joyZone.appendChild(this.joyBase);

    this.joyZone.addEventListener('pointerdown', (e) => this.onJoyDown(e));
    this.joyZone.addEventListener('pointermove', (e) => this.onJoyMove(e));
    this.joyZone.addEventListener('pointerup', (e) => this.onJoyUp(e));
    this.joyZone.addEventListener('pointercancel', (e) => this.onJoyUp(e));

    // Right thumb arc button cluster
    this.cluster = el('div', { className: 'vu-action-cluster' });

    this.jumpBtn = this.createArcButton('jump', 'vu-touch-jump', 'ПРЫЖОК');
    this.sprintBtn = this.createArcButton('sprint', 'vu-touch-sprint', 'РЫВОК');
    this.actionLabelSpan = el('span', { text: 'ДЕЙСТВИЕ' });
    this.actionBtn = this.createArcButton('action', 'vu-touch-action', '', this.actionLabelSpan);
    this.shadowBtn = this.createArcButton('shadow', 'vu-touch-shadow', 'ТЕНЬ');

    this.cluster.appendChild(this.jumpBtn);
    this.cluster.appendChild(this.sprintBtn);
    this.cluster.appendChild(this.actionBtn);
    this.cluster.appendChild(this.shadowBtn);

    layer.appendChild(this.joyZone);
    layer.appendChild(this.cluster);
    return layer;
  }

  createArcButton(btnKey, cls, text, customChild = null) {
    const btn = el(
      'button',
      {
        className: `vu-touch-btn ${cls}`,
        attrs: {
          type: 'button',
          'data-touch-btn': btnKey,
          'aria-label': text || btnKey
        }
      },
      customChild ? [customChild] : [el('span', { text })]
    );

    /** @type {Set<number>} */
    const activePointers = new Set();

    const releasePointer = (e) => {
      activePointers.delete(e.pointerId);
      if (activePointers.size === 0) {
        btn.classList.remove('pressed');
        this.input.setTouchButton(btnKey, false);
      }
    };

    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try {
        btn.setPointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      activePointers.add(e.pointerId);
      btn.classList.add('pressed');
      this.input.setTouchButton(btnKey, true);
    });

    btn.addEventListener('pointerup', releasePointer);
    btn.addEventListener('pointercancel', releasePointer);
    btn.addEventListener('lostpointercapture', releasePointer);

    return btn;
  }

  onJoyDown(e) {
    if (this.joystickPointerId !== null) return;
    e.preventDefault();
    this.joystickPointerId = e.pointerId;
    try {
      this.joyZone.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const rect = this.joyZone.getBoundingClientRect();
    if (this.joystickMode === 'DYNAMIC') {
      this.joyOriginX = e.clientX - rect.left;
      this.joyOriginY = e.clientY - rect.top;
      this.joyBase.style.left = `${this.joyOriginX}px`;
      this.joyBase.style.top = `${this.joyOriginY}px`;
    } else {
      const baseRect = this.joyBase.getBoundingClientRect();
      this.joyOriginX = baseRect.left - rect.left + baseRect.width * 0.5;
      this.joyOriginY = baseRect.top - rect.top + baseRect.height * 0.5;
    }

    this.joyBase.style.opacity = '0.92';
    this.updateJoystickFromEvent(e, rect);
  }

  onJoyMove(e) {
    if (e.pointerId !== this.joystickPointerId) return;
    const rect = this.joyZone.getBoundingClientRect();
    this.updateJoystickFromEvent(e, rect);
  }

  onJoyUp(e) {
    if (e.pointerId !== this.joystickPointerId) return;
    this.joystickPointerId = null;
    this.joyStick.style.transform = 'translate(0px, 0px)';
    this.joyBase.style.opacity = String(this.baseOpacity);
    this.input.setTouchJoystick(0, 0);
  }

  updateJoystickFromEvent(e, zoneRect) {
    const dx = e.clientX - zoneRect.left - this.joyOriginX;
    const dy = e.clientY - zoneRect.top - this.joyOriginY;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, this.joyMaxRadius);
    const angle = Math.atan2(dy, dx);
    const ox = Math.cos(angle) * clampedDist;
    const oy = Math.sin(angle) * clampedDist;

    this.joyStick.style.transform = `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px)`;
    this.input.setTouchJoystick(ox / this.joyMaxRadius, oy / this.joyMaxRadius);
  }

  /**
   * Apply user settings (size S/M/L, opacity, left-handed, dynamic/fixed joystick).
   */
  applySettings(settings) {
    if (!settings) return;
    this.joystickMode = settings.joystickMode || 'DYNAMIC';
    this.baseOpacity = settings.controlOpacity ?? 0.4;

    this.root.classList.toggle('left-handed', Boolean(settings.leftHanded));

    const scale = settings.controlSize === 'L' ? 1.16 : settings.controlSize === 'S' ? 0.86 : 1.0;
    this.cluster.style.transform = `scale(${scale})`;

    this.joyBase.style.opacity = String(this.baseOpacity);
    this.joyBase.style.left = settings.leftHanded ? 'calc(100% - 96px)' : '96px';
    this.joyBase.style.top = 'calc(100% - 88px)';

    for (const btn of [this.jumpBtn, this.sprintBtn, this.actionBtn, this.shadowBtn]) {
      btn.style.opacity = String(this.baseOpacity);
    }
  }

  /**
   * Update contextual ACTION button label & pulse state.
   * @param {{type: string, labelKey: string}} ctxAction
   */
  updateContextualAction(ctxAction) {
    if (!ctxAction || ctxAction.type === 'NONE') {
      this.actionLabelSpan.textContent = 'ДЕЙСТВ.';
      this.actionBtn.classList.remove('contextual-ready');
    } else {
      this.actionLabelSpan.textContent = i18n.t(ctxAction.labelKey).toUpperCase();
      this.actionBtn.classList.add('contextual-ready');
    }
  }

  show() {
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
    this.joystickPointerId = null;
    this.joyStick.style.transform = 'translate(0px, 0px)';
  }
}
