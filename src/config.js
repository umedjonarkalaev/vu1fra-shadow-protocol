/**
 * @fileoverview Global game configuration, physics tunables, stealth constants, and optional asset manifest.
 */

export const GAME_CONFIG = Object.freeze({
  title: 'VU1FRA // SHADOW PROTOCOL',
  subtitle: 'SHADOW PROTOCOL',
  heroCallsign: 'VU1FRA',
  orderName: 'Закон Тени',
  cityName: 'Нео-Эдо',
  version: '1.0.0',
  visibleVerticalTiles: 10.5,
  tileSize: 48,
  maxDpr: 2,
  minRenderScale: 0.6,
  maxRenderScale: 1.0,
  targetFps: 60
});

// Gravity and jump velocities are expressed in tiles/s and tiles/s^2 so gameplay is resolution-independent.
const GRAVITY = 26.0;
const JUMP_HEIGHT = 2.35;
const MIN_JUMP_HEIGHT = 0.85;
const JUMP_VEL = Math.sqrt(2 * GRAVITY * JUMP_HEIGHT); // ~11.05 tiles/s
const MIN_JUMP_VEL = Math.sqrt(2 * GRAVITY * MIN_JUMP_HEIGHT);

export const PHYSICS = Object.freeze({
  fixedDt: 1 / 60,
  maxFrameDt: 0.05,
  subStepsMax: 4,
  gravity: GRAVITY,
  maxFallSpeed: 15.5,
  sneakSpeed: 1.5,
  walkSpeed: 3.2,
  sprintSpeed: 6.0,
  crouchHeightTiles: 1.05,
  standHeightTiles: 1.75,
  heroWidthTiles: 0.62,
  jumpHeight: JUMP_HEIGHT,
  minJumpHeight: MIN_JUMP_HEIGHT,
  jumpVelocity: JUMP_VEL,
  minJumpVelocity: MIN_JUMP_VEL,
  jumpCutMultiplier: 0.45,
  coyoteTime: 0.10,
  jumpBuffer: 0.12,
  mantleTolerance: 0.48,
  wallSlideSpeed: 1.9,
  wallJumpHorizontalSpeed: 5.4,
  wallJumpVerticalSpeed: JUMP_VEL * 0.96,
  wallRunDuration: 0.92,
  wallRunSpeed: 4.2,
  wallRunMaxHeightTiles: 3.7,
  groundAccel: 38.0,
  airAccel: 24.0,
  groundFriction: 32.0,
  shadowDissolveSpeedFactor: 0.6,
  shadowEnergyMax: 100,
  shadowEnergyMinActivation: 20,
  shadowEnergyDrainPerSec: 22,
  shadowEnergyRegenPerSec: 34
});

export const STEALTH = Object.freeze({
  guardFovDeg: 70,
  guardRangeTiles: 9.0,
  droneFovDeg: 62,
  droneRangeTiles: 8.5,
  cameraFovDeg: 58,
  cameraRangeTiles: 9.5,
  baseDetectionRate: 1.25,
  suspicionDecayRate: 0.38,
  curiousThreshold: 0.32,
  searchingThreshold: 0.65,
  alertThreshold: 1.0,
  searchDurationSec: 5.5,
  curiousPauseSec: 2.2,
  takedownRangeTiles: 1.35,
  takedownDurationSec: 0.6,
  respawnFadeSec: 1.1,
  shadowFocusTimeScale: 0.25,
  lightFactors: {
    lit: 1.0,
    shadow: 0.15,
    dissolved: 0.0,
    dissolvedCloseDist: 1.05
  },
  postureFactors: {
    crouch: 0.6,
    sneak: 0.6,
    walk: 1.0,
    sprint: 1.3
  },
  coverFactors: {
    hidden: 0.0,
    hiddenCloseDist: 1.0
  },
  soundRadii: {
    sprintStep: 7.0,
    walkStep: 3.0,
    crouchStep: 0.5,
    hardLanding: 6.0,
    wallJump: 4.0
  }
});

/**
 * Optional art manifest. Any image dropped in /assets will be loaded with a 3s timeout;
 * when absent or failed, procedural art renders seamlessly with zero errors.
 */
export const ASSET_MANIFEST = Object.freeze({
  timeoutMs: 3000,
  slots: {
    menuKeyArt: null,
    heroAtlas: null,
    comicCh1Intro1: null,
    comicCh1Intro2: null,
    comicCh1Intro3: null,
    comicCh1Intro4: null
  }
});
