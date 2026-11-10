/**
 * @fileoverview Procedural skeletal animation poses for VU1FRA across all 14 states.
 * Drives the 12-bone rig, 2-bone leg IK targets, torso lean, arm gestures, and katana angle.
 */

export const HERO_ANIM_LIST = Object.freeze([
  'idle',
  'sneak',
  'walk',
  'sprint',
  'jump',
  'fall',
  'wall_cling',
  'wall_run',
  'wall_jump',
  'takedown',
  'hack',
  'enter_cover',
  'shadow_dissolve',
  'caught'
]);

/**
 * Compute joint target offsets (in normalized rig units where 1.0 = 1 tile = 48px)
 * for a given animation state and phase time.
 * @param {string} animName
 * @param {number} timeSec
 * @param {number} gaitPhase
 * @returns {{
 *   pelvisY: number,
 *   torsoLean: number,
 *   headTilt: number,
 *   lookBack: boolean,
 *   footL: {x: number, y: number},
 *   footR: {x: number, y: number},
 *   handL: {x: number, y: number},
 *   handR: {x: number, y: number},
 *   katanaDraw: number,
 *   dissolveAmount: number,
 *   holoGlyphs: boolean,
 *   coverDim: number
 * }}
 */
export function sampleHeroPose(animName, timeSec, gaitPhase = 0) {
  const t = timeSec;
  const p = gaitPhase;

  // Base standing proportions (pelvis at y = -0.82 tiles above feet at y = 0)
  const pose = {
    pelvisY: -0.84,
    torsoLean: 0.14,
    headTilt: 0.05,
    lookBack: false,
    footL: { x: -0.14, y: 0 },
    footR: { x: 0.16, y: 0 },
    handL: { x: -0.18, y: -0.78 },
    handR: { x: 0.22, y: -0.84 },
    katanaDraw: 0,
    dissolveAmount: 0,
    holoGlyphs: false,
    coverDim: 0
  };

  switch (animName) {
    case 'idle': {
      const breath = Math.sin(t * 2.1) * 0.025;
      pose.pelvisY = -0.84 + breath;
      pose.torsoLean = 0.12 + Math.sin(t * 1.05) * 0.02;
      pose.headTilt = Math.sin(t * 1.4) * 0.04;
      // Occasional subtle glance over shoulder
      pose.lookBack = (t % 9.5) > 7.8;
      pose.handL = { x: -0.16, y: -0.80 + breath };
      pose.handR = { x: 0.18, y: -0.86 + breath };
      break;
    }

    case 'sneak': {
      const cycle = p * 2.0;
      const stepL = Math.sin(cycle);
      const stepR = Math.sin(cycle + Math.PI);
      pose.pelvisY = -0.58 + Math.abs(stepL) * 0.03;
      pose.torsoLean = 0.48;
      pose.headTilt = -0.15;
      pose.footL = {
        x: stepL * 0.24,
        y: Math.min(0, -Math.cos(cycle) * 0.09)
      };
      pose.footR = {
        x: stepR * 0.24,
        y: Math.min(0, -Math.cos(cycle + Math.PI) * 0.09)
      };
      pose.handL = { x: 0.18 + stepR * 0.1, y: -0.55 };
      pose.handR = { x: -0.15 + stepL * 0.1, y: -0.62 };
      break;
    }

    case 'walk': {
      const cycle = p * 2.2;
      const stepL = Math.sin(cycle);
      const stepR = Math.sin(cycle + Math.PI);
      pose.pelvisY = -0.82 + Math.abs(Math.cos(cycle)) * 0.04;
      pose.torsoLean = 0.24;
      pose.footL = {
        x: stepL * 0.30,
        y: Math.min(0, -Math.cos(cycle) * 0.14)
      };
      pose.footR = {
        x: stepR * 0.30,
        y: Math.min(0, -Math.cos(cycle + Math.PI) * 0.14)
      };
      pose.handL = { x: stepR * 0.22, y: -0.80 };
      pose.handR = { x: stepL * 0.22, y: -0.82 };
      break;
    }

    case 'sprint': {
      const cycle = p * 2.8;
      const stepL = Math.sin(cycle);
      const stepR = Math.sin(cycle + Math.PI);
      pose.pelvisY = -0.74 + Math.sin(cycle * 2) * 0.05;
      pose.torsoLean = 0.62; // Classic shinobi forward lean
      pose.headTilt = -0.25;
      pose.footL = {
        x: stepL * 0.44,
        y: Math.min(0, -Math.cos(cycle) * 0.24)
      };
      pose.footR = {
        x: stepR * 0.44,
        y: Math.min(0, -Math.cos(cycle + Math.PI) * 0.24)
      };
      // Arms swept back and ready at hilt
      pose.handL = { x: -0.34, y: -0.76 + stepL * 0.06 };
      pose.handR = { x: 0.26, y: -0.72 + stepR * 0.06 };
      break;
    }

    case 'jump': {
      pose.pelvisY = -0.88;
      pose.torsoLean = 0.28;
      pose.footL = { x: -0.18, y: -0.26 };
      pose.footR = { x: 0.22, y: -0.12 };
      pose.handL = { x: -0.26, y: -1.05 };
      pose.handR = { x: 0.28, y: -0.96 };
      break;
    }

    case 'fall': {
      pose.pelvisY = -0.82;
      pose.torsoLean = 0.35;
      pose.footL = { x: -0.22, y: -0.18 };
      pose.footR = { x: 0.18, y: -0.04 };
      pose.handL = { x: -0.32, y: -1.12 };
      pose.handR = { x: 0.30, y: -1.08 };
      break;
    }

    case 'wall_cling': {
      pose.pelvisY = -0.78;
      pose.torsoLean = -0.12;
      pose.footL = { x: 0.18, y: -0.22 };
      pose.footR = { x: 0.22, y: -0.05 };
      pose.handL = { x: 0.26, y: -1.24 };
      pose.handR = { x: 0.24, y: -0.92 };
      break;
    }

    case 'wall_run': {
      const cycle = t * 18;
      pose.pelvisY = -0.80;
      pose.torsoLean = 0.42;
      pose.footL = { x: 0.22, y: -0.15 + Math.sin(cycle) * 0.18 };
      pose.footR = { x: 0.22, y: -0.15 + Math.cos(cycle) * 0.18 };
      pose.handL = { x: -0.25, y: -0.95 + Math.cos(cycle) * 0.12 };
      pose.handR = { x: 0.28, y: -1.12 + Math.sin(cycle) * 0.12 };
      break;
    }

    case 'wall_jump': {
      pose.pelvisY = -0.90;
      pose.torsoLean = 0.40;
      pose.footL = { x: -0.28, y: -0.24 };
      pose.footR = { x: 0.16, y: -0.32 };
      pose.handL = { x: -0.22, y: -1.16 };
      pose.handR = { x: 0.34, y: -1.04 };
      break;
    }

    case 'takedown': {
      const prog = Math.min(1, (t % 0.65) / 0.6);
      const strike = Math.sin(prog * Math.PI);
      pose.pelvisY = -0.62;
      pose.torsoLean = 0.55;
      pose.footL = { x: -0.28, y: 0 };
      pose.footR = { x: 0.34, y: 0 };
      pose.handL = { x: 0.36 * strike, y: -0.86 };
      pose.handR = { x: 0.46 * strike, y: -0.78 };
      pose.katanaDraw = strike * 0.5;
      break;
    }

    case 'hack': {
      const bob = Math.sin(t * 4.0) * 0.02;
      pose.pelvisY = -0.52;
      pose.torsoLean = 0.34;
      pose.headTilt = 0.22;
      pose.footL = { x: -0.16, y: 0 };
      pose.footR = { x: 0.24, y: 0 };
      pose.handL = { x: 0.28, y: -0.68 + bob };
      pose.handR = { x: 0.36, y: -0.72 - bob };
      pose.holoGlyphs = true;
      break;
    }

    case 'enter_cover': {
      pose.pelvisY = -0.68;
      pose.torsoLean = 0.08;
      pose.footL = { x: -0.10, y: 0 };
      pose.footR = { x: 0.10, y: 0 };
      pose.handL = { x: -0.08, y: -0.82 };
      pose.handR = { x: 0.12, y: -0.86 };
      pose.coverDim = 0.65;
      break;
    }

    case 'shadow_dissolve': {
      const breath = Math.sin(t * 3.0) * 0.03;
      pose.pelvisY = -0.74 + breath;
      pose.torsoLean = 0.36;
      pose.footL = { x: -0.16, y: 0 };
      pose.footR = { x: 0.16, y: 0 };
      pose.handL = { x: -0.14, y: -0.78 };
      pose.handR = { x: 0.18, y: -0.82 };
      pose.dissolveAmount = 0.88;
      break;
    }

    case 'caught': {
      pose.pelvisY = -0.64;
      pose.torsoLean = -0.18;
      pose.headTilt = -0.22;
      pose.footL = { x: -0.24, y: 0 };
      pose.footR = { x: 0.18, y: 0 };
      pose.handL = { x: -0.22, y: -0.98 };
      pose.handR = { x: 0.24, y: -1.02 };
      break;
    }
  }

  return pose;
}
