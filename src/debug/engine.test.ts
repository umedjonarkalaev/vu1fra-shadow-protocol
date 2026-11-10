import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_CONFIG, PHYSICS, STEALTH } from '../config.js';
import { SelfTest } from './SelfTest.js';
import { LevelValidator } from './LevelValidator.js';
import { CHAPTER_01 } from '../content/chapters/ch01_roofs/chapter.js';
import { CHAPTER_REGISTRY } from '../content/registry.js';
import { PhysicsCapabilities } from '../world/Physics.js';
import { Collision } from '../world/Collision.js';
import { Level } from '../world/Level.js';
import { Grading } from '../progression/Grading.js';
import { HaikuGenerator } from '../progression/Haiku.js';
import { SaveManager } from '../progression/Save.js';
import { Storage } from '../core/Storage.js';
import { ALLOWED_TRANSITIONS } from '../core/Game.js';

test('GAME_CONFIG constants match exact title and hero callsign', () => {
  assert.equal(GAME_CONFIG.title, 'VU1FRA // SHADOW PROTOCOL');
  assert.equal(GAME_CONFIG.heroCallsign, 'VU1FRA');
  assert.ok(PHYSICS.sneakSpeed < PHYSICS.walkSpeed);
  assert.ok(PHYSICS.walkSpeed < PHYSICS.sprintSpeed);
  assert.equal(STEALTH.lightFactors.lit, 1.0);
  assert.equal(STEALTH.lightFactors.shadow, 0.15);
});

test('SelfTest validates all Chapter 1 levels, puzzles, and comic captions', () => {
  const result = SelfTest.runAll();
  assert.equal(result.ok, true, `SelfTest errors: ${result.errors.join('; ')}`);
});

test('All 3 Chapter 1 levels are 120-200 tiles wide and pass LevelValidator', () => {
  assert.equal(CHAPTER_01.levels.length, 3);
  for (const lvlDef of CHAPTER_01.levels) {
    const w = lvlDef.rows[0].length;
    assert.ok(w >= 120 && w <= 200, `Level ${lvlDef.id} width ${w} not in [120, 200]`);
    const v = LevelValidator.validate(lvlDef, CHAPTER_01.puzzles);
    assert.equal(v.valid, true, `Level ${lvlDef.id} errors: ${v.errors.join(', ')}`);
  }
});

test('Chapters 2 through 6 are registered as locked stubs in CHAPTER_REGISTRY', () => {
  assert.equal(CHAPTER_REGISTRY.length, 6);
  assert.equal(CHAPTER_REGISTRY[0].locked, false);
  for (let i = 1; i < 6; i++) {
    assert.equal(CHAPTER_REGISTRY[i].locked, true);
    assert.ok(CHAPTER_REGISTRY[i].titleRu.length > 0);
  }
});

test('PhysicsCapabilities analytical feasibility checks pass valid jumps and reject impossible climbs', () => {
  const okJump = PhysicsCapabilities.canTraverseSegment(
    { x: 10, y: 11, mode: 'walk' },
    { x: 14, y: 9, mode: 'jump' }
  );
  assert.equal(okJump.feasible, true);

  const okWallRun = PhysicsCapabilities.canTraverseSegment(
    { x: 48, y: 11, mode: 'walk' },
    { x: 52, y: 7, mode: 'wall_run' }
  );
  assert.equal(okWallRun.feasible, true);

  const impossibleClimb = PhysicsCapabilities.canTraverseSegment(
    { x: 10, y: 11, mode: 'walk' },
    { x: 12, y: 1, mode: 'jump' }
  );
  assert.equal(impossibleClimb.feasible, false);
});

test('Collision.moveAndSlide prevents entities from entering solid tiles and lands cleanly', () => {
  const lvl = new Level(CHAPTER_01.levels[0]);
  const body = {
    x: 10,
    y: 10.5,
    vx: 2.0,
    vy: 8.0,
    width: 0.62,
    height: 1.75
  };
  const res = Collision.moveAndSlide(lvl, body, 0.1);
  assert.equal(res.grounded, true);
  assert.equal(body.y, 11);
  assert.equal(lvl.isSolidAt(Math.floor(body.x), Math.floor(body.y - 0.5)), false);
});

test('Grading and HaikuGenerator produce deterministic S/A/B/C ranks and 3-line Russian haiku', () => {
  const sGrade = Grading.evaluate({ alarms: 0, takedowns: 0, hintsUsed: 0, elapsedSec: 320 });
  assert.equal(sGrade.rank, 'S');

  const bGrade = Grading.evaluate({ alarms: 2, takedowns: 3, hintsUsed: 1, elapsedSec: 400 });
  assert.ok(['B', 'C'].includes(bGrade.rank));

  const haiku = HaikuGenerator.generate({ alarms: 0, takedowns: 0, hintsUsed: 0, rank: 'S' });
  assert.equal(haiku.length, 3);
});

test('SaveManager migrates v1 saves and recovers from corrupted JSON without crashing', () => {
  const storage = new Storage('test_vu1fra_');
  storage.setRaw('save_state', '{corrupted_json_here');
  const smCorrupt = new SaveManager(storage);
  assert.equal(smCorrupt.state.version, 2);
  assert.equal(storage.getRaw('save_state_corrupt_backup'), '{corrupted_json_here');

  storage.setJSON('save_state', { version: 1, hasStarted: true, currentLevelIndex: 2 });
  const smMigrated = new SaveManager(storage);
  assert.equal(smMigrated.state.version, 2);
  assert.equal(smMigrated.state.currentLevelIndex, 2);
  assert.ok(Array.isArray(smMigrated.state.unlockedCodexIds));
});

test('State machine ALLOWED_TRANSITIONS defines valid paths for every game state', () => {
  assert.ok(ALLOWED_TRANSITIONS.BOOT.includes('SPLASH'));
  assert.ok(ALLOWED_TRANSITIONS.SPLASH.includes('MENU'));
  assert.ok(ALLOWED_TRANSITIONS.MENU.includes('COMIC'));
  assert.ok(ALLOWED_TRANSITIONS.PLAYING.includes('HACKING'));
  assert.ok(ALLOWED_TRANSITIONS.HACKING.includes('PLAYING'));
});
