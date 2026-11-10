/**
 * @fileoverview VU1FRA hero entity implementing fixed-timestep movement, sneak/walk/sprint,
 * coyote time, jump buffering, wall-cling, wall-run (~0.9s / ~3.5 tiles), wall-jump,
 * foreground cover hiding, shadow-dissolve, and silent non-lethal takedowns.
 */

import { PHYSICS, STEALTH } from '../../config.js';
import { Collision } from '../Collision.js';
import { HeroRig } from '../../art/HeroRig.js';

export class Hero {
  /**
   * @param {number} x Spawn X in tiles
   * @param {number} y Spawn feet Y in tiles
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = PHYSICS.heroWidthTiles;
    this.height = PHYSICS.standHeightTiles;
    this.facing = 1;

    this.grounded = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.dropThroughTimer = 0;

    // Wall interaction
    this.wallClingDir = 0; // -1 left wall, +1 right wall, 0 none
    this.wallRunning = false;
    this.wallRunTimer = 0;
    this.wallRunUsedOnWall = false;

    // Stealth & abilities
    this.inCover = false;
    /** @type {any} */
    this.activeCover = null;
    this.shadowDissolved = false;
    this.shadowEnergy = PHYSICS.shadowEnergyMax;
    this.isInShadow = true;

    // Non-lethal takedown state
    this.takedownTimer = 0;
    this.caught = false;

    // Animation & juice
    this.animState = 'idle';
    this.animTime = 0;
    this.gaitPhase = 0;
    this.stepSoundAccum = 0;
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.rig = new HeroRig(15);
  }

  resetAt(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.wallClingDir = 0;
    this.wallRunning = false;
    this.wallRunTimer = 0;
    this.wallRunUsedOnWall = false;
    this.inCover = false;
    this.activeCover = null;
    this.shadowDissolved = false;
    this.shadowEnergy = PHYSICS.shadowEnergyMax;
    this.takedownTimer = 0;
    this.caught = false;
    this.animState = 'idle';
    this.scaleX = 1;
    this.scaleY = 1;
  }

  /**
   * Advance hero simulation by fixed dt.
   * @param {number} dt
   * @param {import('../../input/InputManager.js').InputManager['state']} input
   * @param {import('../Level.js').Level} level
   * @param {boolean} isCurrentlyInShadow
   * @param {import('../../core/EventBus.js').EventBus} events
   */
  update(dt, input, level, isCurrentlyInShadow, events) {
    this.animTime += dt;
    this.isInShadow = isCurrentlyInShadow;

    // Recover squash & stretch smoothly
    this.scaleX += (1.0 - this.scaleX) * Math.min(1, dt * 14);
    this.scaleY += (1.0 - this.scaleY) * Math.min(1, dt * 14);

    if (this.caught) {
      this.animState = 'caught';
      this.vx = 0;
      return;
    }

    if (this.takedownTimer > 0) {
      this.takedownTimer = Math.max(0, this.takedownTimer - dt);
      this.animState = 'takedown';
      this.vx = 0;
      this.vy = 0;
      return;
    }

    // Shadow-Dissolve ability toggle & energy update
    if (input.shadowJustPressed) {
      if (this.shadowDissolved) {
        this.endShadowDissolve(events);
      } else if (
        this.isInShadow &&
        this.shadowEnergy >= PHYSICS.shadowEnergyMinActivation &&
        !this.inCover
      ) {
        this.shadowDissolved = true;
        events.emit('hero:shadow_dissolve', { active: true, x: this.x, y: this.y - 0.8 });
      } else if (!this.isInShadow || this.shadowEnergy < PHYSICS.shadowEnergyMinActivation) {
        events.emit('hud:toast', { key: 'hud.needShadow' });
      }
    }

    if (this.shadowDissolved) {
      if (!this.isInShadow) {
        this.endShadowDissolve(events);
      } else {
        this.shadowEnergy = Math.max(0, this.shadowEnergy - PHYSICS.shadowEnergyDrainPerSec * dt);
        if (this.shadowEnergy <= 0) {
          this.endShadowDissolve(events);
        }
      }
    } else if (this.isInShadow || this.inCover) {
      this.shadowEnergy = Math.min(
        PHYSICS.shadowEnergyMax,
        this.shadowEnergy + PHYSICS.shadowEnergyRegenPerSec * dt
      );
    }

    // If hidden in foreground cover, movement exits cover or stays still
    if (this.inCover) {
      this.vx = 0;
      this.vy = 0;
      this.animState = 'enter_cover';
      if (Math.abs(input.moveX) > 0.65 || input.jumpJustPressed) {
        this.inCover = false;
        this.activeCover = null;
      }
      return;
    }

    // Timers
    if (this.coyoteTimer > 0) this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    if (this.dropThroughTimer > 0) this.dropThroughTimer = Math.max(0, this.dropThroughTimer - dt);

    if (input.jumpJustPressed && !this.shadowDissolved) {
      if (input.crouch && this.grounded) {
        // Drop through one-way platform
        this.dropThroughTimer = 0.22;
        this.grounded = false;
      } else {
        this.jumpBufferTimer = PHYSICS.jumpBuffer;
      }
    }

    // Adjust hitbox height for crouch/sneak
    const wantsCrouch = input.crouch || input.sneak;
    this.height = wantsCrouch ? PHYSICS.crouchHeightTiles : PHYSICS.standHeightTiles;

    // Target horizontal speed
    let maxSpeed = PHYSICS.walkSpeed;
    if (this.shadowDissolved) {
      maxSpeed = PHYSICS.walkSpeed * PHYSICS.shadowDissolveSpeedFactor;
    } else if (input.sprint) {
      maxSpeed = PHYSICS.sprintSpeed;
    } else if (input.sneak || input.crouch) {
      maxSpeed = PHYSICS.sneakSpeed;
    }

    const moveDir = Math.abs(input.moveX) > 0.12 ? Math.sign(input.moveX) : 0;
    if (moveDir !== 0) {
      this.facing = moveDir;
      const accel = this.grounded ? PHYSICS.groundAccel : PHYSICS.airAccel;
      const targetVx = moveDir * maxSpeed;
      const diff = targetVx - this.vx;
      const maxDelta = accel * dt;
      if (Math.abs(diff) <= maxDelta) this.vx = targetVx;
      else this.vx += Math.sign(diff) * maxDelta;
    } else {
      const fric = (this.grounded ? PHYSICS.groundFriction : PHYSICS.airAccel * 0.6) * dt;
      if (Math.abs(this.vx) <= fric) this.vx = 0;
      else this.vx -= Math.sign(this.vx) * fric;
    }

    // Check adjacent walls for wall-cling and wall-run
    const adjWall = Collision.checkAdjacentWall(level, this);
    const pressingIntoWall = adjWall.dir !== 0 && moveDir === adjWall.dir;

    // Wall-Run activation & update: while Sprint is held and moving into a wall
    if (
      !this.shadowDissolved &&
      input.sprint &&
      pressingIntoWall &&
      !this.wallRunUsedOnWall &&
      this.wallRunTimer < PHYSICS.wallRunDuration
    ) {
      this.wallRunning = true;
      this.wallClingDir = adjWall.dir;
      this.wallRunTimer += dt;
      this.vy = -PHYSICS.wallRunSpeed;
    } else {
      if (this.wallRunning) {
        this.wallRunUsedOnWall = true;
      }
      this.wallRunning = false;
    }

    // Gravity & Wall-Cling slide
    if (!this.wallRunning) {
      if (!this.grounded && adjWall.dir !== 0 && (pressingIntoWall || this.vy > 0)) {
        this.wallClingDir = adjWall.dir;
        this.vy = Math.min(this.vy + PHYSICS.gravity * dt * 0.5, PHYSICS.wallSlideSpeed);
      } else {
        this.wallClingDir = 0;
        this.vy = Math.min(this.vy + PHYSICS.gravity * dt, PHYSICS.maxFallSpeed);
      }
    }

    // Execute Jump or Wall-Jump from buffer
    if (this.jumpBufferTimer > 0 && !this.shadowDissolved) {
      if (this.coyoteTimer > 0 || this.grounded) {
        // Normal ground/coyote jump
        this.vy = -PHYSICS.jumpVelocity;
        this.grounded = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.scaleX = 0.85;
        this.scaleY = 1.18;
        events.emit('hero:jump', { x: this.x, y: this.y, wallJump: false });
      } else if (this.wallClingDir !== 0 || adjWall.dir !== 0) {
        // Wall-Jump away and up
        const wDir = this.wallClingDir || adjWall.dir;
        this.vx = -wDir * PHYSICS.wallJumpHorizontalSpeed;
        this.vy = -PHYSICS.wallJumpVerticalSpeed;
        this.facing = -wDir;
        this.wallRunning = false;
        this.wallClingDir = 0;
        this.wallRunTimer = 0;
        this.wallRunUsedOnWall = false;
        this.jumpBufferTimer = 0;
        this.scaleX = 0.84;
        this.scaleY = 1.20;
        events.emit('hero:noise', {
          x: this.x,
          y: this.y,
          radius: STEALTH.soundRadii.wallJump
        });
        events.emit('hero:jump', { x: this.x, y: this.y, wallJump: true });
      }
    }

    // Variable jump height cut when releasing jump early while ascending
    if (input.jumpJustReleased && this.vy < -PHYSICS.minJumpVelocity && !this.wallRunning) {
      this.vy *= PHYSICS.jumpCutMultiplier;
    }

    // Move and resolve collisions
    const prevGrounded = this.grounded;
    const prevVy = this.vy;
    const col = Collision.moveAndSlide(level, this, dt);
    this.grounded = col.grounded;

    if (this.grounded) {
      this.coyoteTimer = PHYSICS.coyoteTime;
      this.wallRunTimer = 0;
      this.wallRunUsedOnWall = false;
      this.wallRunning = false;
      this.wallClingDir = 0;

      if (!prevGrounded) {
        // Landed
        this.scaleX = 1.22;
        this.scaleY = 0.78;
        const hard = prevVy > 11.5;
        events.emit('hero:land', { x: this.x, y: this.y, hard });
        if (hard && !this.shadowDissolved) {
          events.emit('hero:noise', {
            x: this.x,
            y: this.y,
            radius: STEALTH.soundRadii.hardLanding
          });
        }
      }
    }

    // Advance gait cycle & emit footstep sounds based on distance traveled
    const absVx = Math.abs(this.vx);
    if (this.grounded && absVx > 0.1) {
      const dist = absVx * dt;
      this.gaitPhase += dist * 2.2;
      this.stepSoundAccum += dist;
      const stepStride = input.sprint ? 1.85 : 1.35;
      if (this.stepSoundAccum >= stepStride) {
        this.stepSoundAccum = 0;
        if (!this.shadowDissolved) {
          const rad = input.sprint
            ? STEALTH.soundRadii.sprintStep
            : input.sneak || input.crouch
            ? STEALTH.soundRadii.crouchStep
            : STEALTH.soundRadii.walkStep;
          events.emit('hero:step', { x: this.x, y: this.y, sprint: input.sprint, radius: rad });
          if (rad >= 2.0) {
            events.emit('hero:noise', { x: this.x, y: this.y, radius: rad });
          }
        }
      }
    }

    // Select visual animation state
    if (this.shadowDissolved) {
      this.animState = 'shadow_dissolve';
    } else if (this.wallRunning) {
      this.animState = 'wall_run';
    } else if (!this.grounded && this.wallClingDir !== 0) {
      this.animState = 'wall_cling';
    } else if (!this.grounded) {
      this.animState = this.vy < 0 ? 'jump' : 'fall';
    } else if (absVx > 0.15) {
      if (input.sprint) this.animState = 'sprint';
      else if (input.sneak || input.crouch) this.animState = 'sneak';
      else this.animState = 'walk';
    } else if (input.crouch) {
      this.animState = 'sneak';
    } else {
      this.animState = 'idle';
    }
  }

  endShadowDissolve(events) {
    if (!this.shadowDissolved) return;
    this.shadowDissolved = false;
    events.emit('hero:shadow_dissolve', { active: false, x: this.x, y: this.y - 0.8 });
  }
}
