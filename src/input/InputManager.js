/**
 * @fileoverview Unified InputManager producing one clean InputState object per frame.
 * Primary input is touch (dynamic/fixed left thumb joystick + right thumb arc buttons).
 * Keyboard/gamepad exist strictly as hidden dev-only inputs; keyboard hints are NEVER rendered.
 */

export class InputManager {
  constructor() {
    this.state = {
      moveX: 0,
      moveY: 0,
      sneak: false,
      crouch: false,
      sprint: false,
      jumpHeld: false,
      jumpJustPressed: false,
      jumpJustReleased: false,
      actionJustPressed: false,
      shadowJustPressed: false,
      pauseJustPressed: false
    };

    // Touch state controlled by TouchControls UI
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.touchButtons = {
      jump: false,
      sprint: false,
      action: false,
      shadow: false,
      pause: false
    };
    this.sprintToggled = false;
    this.sprintMode = 'HOLD'; // 'HOLD' | 'TOGGLE'
    this.hapticsEnabled = true;

    // Hidden dev-only keyboard state
    /** @type {Set<string>} */
    this.keysHeld = new Set();

    // Previous frame states for edge detection
    this.prevJump = false;
    this.prevAction = false;
    this.prevShadow = false;
    this.prevPause = false;
    this.prevSprintBtn = false;

    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    this.boundBlur = this.releaseAll.bind(this);
  }

  attach() {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('blur', this.boundBlur);
  }

  detach() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('blur', this.boundBlur);
    this.releaseAll();
  }

  configure(settings) {
    if (!settings) return;
    this.sprintMode = settings.sprintMode || 'HOLD';
    this.hapticsEnabled = settings.haptics !== false;
  }

  /**
   * Release all held touch and keyboard inputs on pause, blur, or pointercancel.
   */
  releaseAll() {
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.touchButtons.jump = false;
    this.touchButtons.sprint = false;
    this.touchButtons.action = false;
    this.touchButtons.shadow = false;
    this.touchButtons.pause = false;
    this.sprintToggled = false;
    this.keysHeld.clear();

    this.state.moveX = 0;
    this.state.moveY = 0;
    this.state.sneak = false;
    this.state.crouch = false;
    this.state.sprint = false;
    this.state.jumpHeld = false;
    this.state.jumpJustPressed = false;
    this.state.jumpJustReleased = false;
    this.state.actionJustPressed = false;
    this.state.shadowJustPressed = false;
    this.state.pauseJustPressed = false;

    this.prevJump = false;
    this.prevAction = false;
    this.prevShadow = false;
    this.prevPause = false;
    this.prevSprintBtn = false;
  }

  /**
   * Set normalized analog joystick vector from TouchControls.
   * Deadzone (12%) is already applied or enforced here.
   * @param {number} x in [-1, 1]
   * @param {number} y in [-1, 1]
   */
  setTouchJoystick(x, y) {
    const mag = Math.hypot(x, y);
    if (mag < 0.12) {
      this.touchMoveX = 0;
      this.touchMoveY = 0;
      return;
    }
    this.touchMoveX = Math.max(-1, Math.min(1, x));
    this.touchMoveY = Math.max(-1, Math.min(1, y));
  }

  /**
   * Set touch button state from TouchControls.
   * @param {'jump'|'sprint'|'action'|'shadow'|'pause'} btn
   * @param {boolean} pressed
   */
  setTouchButton(btn, pressed) {
    if (btn in this.touchButtons) {
      this.touchButtons[btn] = Boolean(pressed);
    }
  }

  onKeyDown(e) {
    // Ignore when typing in any input
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    this.keysHeld.add(e.code);
  }

  onKeyUp(e) {
    this.keysHeld.delete(e.code);
  }

  /**
   * Trigger haptics on supported mobile browsers.
   * @param {number | number[]} pattern
   */
  vibrate(pattern) {
    if (!this.hapticsEnabled) return;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Poll and compute unified InputState for the current simulation step.
   * @returns {typeof this.state}
   */
  poll() {
    // Combine touch joystick with hidden dev keyboard
    let mx = this.touchMoveX;
    let my = this.touchMoveY;

    if (mx === 0 && my === 0) {
      const left = this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft');
      const right = this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight');
      const down = this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown');
      const up = this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp');
      const slowMod = this.keysHeld.has('ControlLeft') || this.keysHeld.has('AltLeft');
      if (left !== right) {
        mx = (right ? 1 : -1) * (slowMod ? 0.38 : 0.85);
      }
      if (down) my = 0.85;
      else if (up) my = -0.85;
    }

    const absX = Math.abs(mx);
    const crouch = my > 0.48;
    // Horizontal below 50% = SNEAK (silent), above = WALK
    const sneak = (absX > 0.12 && absX < 0.5) || (crouch && absX > 0.12);

    const rawSprintBtn =
      this.touchButtons.sprint ||
      this.keysHeld.has('ShiftLeft') ||
      this.keysHeld.has('ShiftRight');

    if (this.sprintMode === 'TOGGLE') {
      if (rawSprintBtn && !this.prevSprintBtn) {
        this.sprintToggled = !this.sprintToggled;
      }
    } else {
      this.sprintToggled = rawSprintBtn;
    }
    this.prevSprintBtn = rawSprintBtn;

    const sprint = this.sprintToggled && absX >= 0.25 && !crouch;

    const rawJump =
      this.touchButtons.jump ||
      this.keysHeld.has('Space') ||
      this.keysHeld.has('KeyW') ||
      this.keysHeld.has('ArrowUp');

    const rawAction =
      this.touchButtons.action ||
      this.keysHeld.has('KeyE') ||
      this.keysHeld.has('Enter');

    const rawShadow =
      this.touchButtons.shadow ||
      this.keysHeld.has('KeyQ') ||
      this.keysHeld.has('KeyF');

    const rawPause =
      this.touchButtons.pause ||
      this.keysHeld.has('Escape') ||
      this.keysHeld.has('KeyP');

    this.state.moveX = mx;
    this.state.moveY = my;
    this.state.sneak = sneak;
    this.state.crouch = crouch;
    this.state.sprint = sprint;
    this.state.jumpHeld = rawJump;
    this.state.jumpJustPressed = rawJump && !this.prevJump;
    this.state.jumpJustReleased = !rawJump && this.prevJump;
    this.state.actionJustPressed = rawAction && !this.prevAction;
    this.state.shadowJustPressed = rawShadow && !this.prevShadow;
    this.state.pauseJustPressed = rawPause && !this.prevPause;

    this.prevJump = rawJump;
    this.prevAction = rawAction;
    this.prevShadow = rawShadow;
    this.prevPause = rawPause;

    return this.state;
  }
}
