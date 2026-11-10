/**
 * @fileoverview Master Game State Machine with explicit allowed-transitions table,
 * enter()/exit() lifecycle hygiene, global error boundary, Wake Lock, and Chapter 1 flow.
 */

import { STEALTH } from '../config.js';
import { EventBus } from './EventBus.js';
import { Loop } from './Loop.js';
import { logger } from './Logger.js';
import { InputManager } from '../input/InputManager.js';
import { AudioEngine } from '../audio/AudioEngine.js';
import { SaveManager } from '../progression/Save.js';
import { Renderer } from '../render/Renderer.js';
import { Level } from '../world/Level.js';
import { PerceptionSystem } from '../world/systems/Perception.js';
import { StealthSystem } from '../world/systems/Stealth.js';
import { ObjectivesSystem } from '../world/systems/Objectives.js';
import { getChapterById, getPuzzleById } from '../content/registry.js';
import { comicPanels } from '../art/ComicPanels.js';
import { assets } from '../art/Assets.js';
import { i18n } from '../i18n/I18n.js';
import { el } from '../puzzles/PuzzleRegistry.js';
import { PuzzleHost } from '../puzzles/PuzzleHost.js';
import { RotateScreen } from '../ui/RotateScreen.js';
import { MenuUI } from '../ui/Menu.js';
import { TouchControls } from '../ui/TouchControls.js';
import { HudUI } from '../ui/Hud.js';
import { SettingsUI } from '../ui/Settings.js';
import { ComicUI } from '../ui/Comic.js';
import { DebriefUI } from '../ui/Debrief.js';
import { ErrorOverlay } from '../ui/ErrorOverlay.js';
import { GalleryUI } from '../debug/Gallery.js';
import { DebugPanel } from '../debug/DebugPanel.js';
import { SelfTest } from '../debug/SelfTest.js';

export const ALLOWED_TRANSITIONS = Object.freeze({
  BOOT: ['SPLASH', 'MENU', 'PLAYING', 'GALLERY', 'ERROR'],
  SPLASH: ['MENU', 'PLAYING', 'GALLERY', 'ERROR'],
  MENU: ['COMIC', 'PLAYING', 'GALLERY', 'ERROR'],
  COMIC: ['PLAYING', 'DEBRIEF', 'MENU', 'ERROR'],
  PLAYING: ['PAUSED', 'HACKING', 'COMIC', 'DEBRIEF', 'MENU', 'GALLERY', 'ERROR'],
  HACKING: ['PLAYING', 'COMIC', 'MENU', 'ERROR'],
  PAUSED: ['PLAYING', 'MENU', 'GALLERY', 'ERROR'],
  DEBRIEF: ['COMIC', 'PLAYING', 'MENU', 'ERROR'],
  GALLERY: ['MENU', 'PLAYING', 'ERROR'],
  ERROR: ['MENU', 'PLAYING']
});

export class Game {
  /**
   * @param {HTMLElement} rootContainer
   */
  constructor(rootContainer) {
    this.root = rootContainer;
    this.state = 'BOOT';
    this.isPortraitPaused = false;

    this.events = new EventBus();
    this.saveManager = new SaveManager();
    this.audio = new AudioEngine();
    this.input = new InputManager();

    // Create main shell & canvas
    this.shell = el('main', {
      className: 'vu-shell',
      attrs: { 'aria-label': i18n.t('common.title') }
    });
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'vu-canvas';
    this.canvas.setAttribute('data-testid', 'game-canvas');
    this.shell.appendChild(this.canvas);

    this.puzzleOverlayRoot = el('div', { className: 'vu-modal-backdrop hidden' });
    this.shell.appendChild(this.puzzleOverlayRoot);
    this.root.appendChild(this.shell);

    this.renderer = new Renderer(this.canvas);

    // UI subsystems
    this.rotateScreen = new RotateScreen(this.shell, (isPortrait) => {
      this.isPortraitPaused = isPortrait;
      this.canvas.classList.toggle('hidden', isPortrait);
      if (isPortrait) {
        this.input.releaseAll();
        this.audio.pause();
      } else if (this.state === 'PLAYING' || this.state === 'MENU') {
        this.audio.resume();
      }
      this.handleResize();
    });

    this.menuUI = new MenuUI(this.shell, {
      onUnlockSplash: () => {
        this.audio.unlock();
        this.requestWakeLock();
        this.transitionTo('MENU');
      },
      onStartGame: (chapterId, levelIndex) => {
        this.audio.unlock();
        this.requestWakeLock();
        this.startChapterAtLevel(chapterId, levelIndex);
      },
      onOpenSettings: () => this.settingsUI.open(),
      onOpenGallery: () => this.transitionTo('GALLERY')
    });

    this.touchControls = new TouchControls(this.shell, this.input);

    this.hudUI = new HudUI(this.shell, {
      onPauseToggle: () => {
        if (this.state === 'PLAYING') this.transitionTo('PAUSED');
        else if (this.state === 'PAUSED') this.transitionTo('PLAYING');
      },
      onRestartLevel: () => {
        this.hudUI.closePauseModal();
        this.loadLevel(this.activeChapterId, this.activeLevelIndex);
        this.transitionTo('PLAYING');
      },
      onOpenSettings: () => this.settingsUI.open(),
      onOpenCodex: () => this.menuUI.openCodexModal(this.saveManager),
      onExitToMenu: () => {
        this.hudUI.closePauseModal();
        this.transitionTo('MENU');
      }
    });

    this.settingsUI = new SettingsUI(
      this.shell,
      this.saveManager,
      (newSettings) => this.applySettings(newSettings),
      () => {
        this.saveManager.resetAll();
        this.applySettings(this.saveManager.state.settings);
      }
    );

    this.comicUI = new ComicUI(this.shell);

    this.debriefUI = new DebriefUI(this.shell, {
      onReplay: () => this.startChapterAtLevel('ch01_roofs', 0),
      onExitToMenu: () => this.transitionTo('MENU')
    });

    this.puzzleHost = new PuzzleHost(this.puzzleOverlayRoot, {
      onSolve: (puzzleData, hintsUsed) => this.handlePuzzleSolved(puzzleData, hintsUsed),
      onClose: () => {
        if (this.state === 'HACKING') {
          this.transitionTo('PLAYING');
        }
      },
      onSound: (kind) => {
        if (kind === 'success') this.audio.playPuzzleSuccess();
        else this.audio.playTerminalBlip(true);
      }
    });

    this.galleryUI = new GalleryUI(this.shell, this.renderer, () => {
      this.transitionTo('MENU');
    });

    this.errorOverlay = new ErrorOverlay(this.shell, {
      getSnapshot: () => ({
        state: this.state,
        chapter: this.activeChapterId,
        levelIndex: this.activeLevelIndex,
        levelId: this.currentLevel?.id || null,
        qualityTier: this.renderer.quality.activeTier
      }),
      onRestartLevel: () => {
        this.loadLevel(this.activeChapterId || 'ch01_roofs', this.activeLevelIndex || 0);
        this.loop.start();
        this.transitionTo('PLAYING');
      },
      onExitToMenu: () => {
        this.loop.start();
        this.transitionTo('MENU');
      }
    });

    this.debugPanel = new DebugPanel(this.shell, this);

    // Active gameplay state
    this.activeChapterId = 'ch01_roofs';
    this.activeLevelIndex = 0;
    /** @type {Level | null} */
    this.currentLevel = null;
    /** @type {any} */
    this.activeTerminal = null;
    this.respawnTimer = 0;
    this.shownTutorialIndices = new Set();

    this.loop = new Loop(
      (simDt) => this.onFixedUpdate(simDt),
      (realDt) => this.onRender(realDt),
      (err) => this.handleFatalError(err)
    );

    this.boundResize = this.handleResize.bind(this);
    this.boundKeyTitleStart = this.handleTitleKeyStart.bind(this);
  }

  async init() {
    this.installGlobalErrorHandlers();
    this.registerEngineEvents();

    // Run startup self-test validation
    SelfTest.runAll();

    // Pre-bake parallax planes and comic panels
    this.renderer.layers.bakeAll();
    comicPanels.prebakeAll([
      'ch1_intro_1',
      'ch1_intro_2',
      'ch1_intro_3',
      'ch1_intro_4',
      'ch1_mid_1',
      'ch1_mid_2',
      'ch1_end_1',
      'ch1_end_2',
      'ch1_end_3'
    ]);
    assets.loadAll().catch(() => {});

    this.applySettings(this.saveManager.state.settings);
    this.input.attach();
    this.rotateScreen.attach();

    window.addEventListener('resize', this.boundResize);
    window.addEventListener('keydown', this.boundKeyTitleStart);
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.input.releaseAll();
        this.audio.pause();
      } else if (!this.isPortraitPaused) {
        this.audio.resume();
      }
    });

    this.handleResize();

    // Inspect query parameters (?autostart=1, ?gallery=1, ?debug=1)
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === '1') {
      this.debugPanel.enable();
    }
    if (params.get('gallery') === '1') {
      this.transitionTo('GALLERY');
    } else if (params.get('autostart') === '1') {
      this.loadLevel('ch01_roofs', 0);
      this.transitionTo('PLAYING');
    } else {
      this.transitionTo('SPLASH');
    }

    this.loop.start();
  }

  installGlobalErrorHandlers() {
    window.addEventListener('error', (event) => {
      this.handleFatalError(event.error || event.message);
    });
    window.addEventListener('unhandledrejection', (event) => {
      this.handleFatalError(event.reason);
    });
  }

  handleFatalError(err) {
    logger.error('Fatal error intercepted by boundary', err);
    this.transitionTo('ERROR', { error: err });
  }

  registerEngineEvents() {
    this.events.on('hero:jump', () => {
      this.audio.playJump();
    });

    this.events.on('hero:land', ({ x, y, hard }) => {
      this.audio.playFootstep(hard);
      this.renderer.particles.spawnBurst(x, y, hard ? 10 : 4, 'dust', '#8fa3c7');
      if (hard) this.renderer.camera.addTrauma(0.22);
    });

    this.events.on('hero:step', ({ sprint }) => {
      this.audio.playFootstep(sprint);
    });

    this.events.on('hero:noise', ({ x, y, radius }) => {
      if (this.currentLevel) {
        PerceptionSystem.emitNoise(this.currentLevel, x, y, radius);
        this.renderer.particles.spawnSoundRing(x, y, radius);
      }
    });

    this.events.on('hero:shadow_dissolve', ({ active, x, y }) => {
      this.audio.playShadowDissolve(active);
      this.renderer.particles.spawnBurst(x, y, 16, 'ink', '#3df2ff');
    });

    this.events.on('level:checkpoint', () => {
      this.hudUI.showToast(i18n.t('hud.checkpointSaved'), 2.5);
    });

    this.events.on('hud:toast', ({ key }) => {
      this.hudUI.showToast(i18n.t(key), 2.5);
    });
  }

  /**
   * Explicit state transition method validated against ALLOWED_TRANSITIONS.
   * @param {string} nextState
   * @param {any} [payload]
   */
  transitionTo(nextState, payload = {}) {
    if (this.state === nextState && nextState !== 'COMIC') return;

    const allowed = ALLOWED_TRANSITIONS[this.state] || [];
    if (!allowed.includes(nextState)) {
      logger.warn(`Illegal state transition ${this.state} -> ${nextState}; falling back to MENU`);
      nextState = 'MENU';
    }

    this.exitState(this.state);
    const prevState = this.state;
    this.state = nextState;
    logger.info(`State transition: ${prevState} -> ${nextState}`);
    this.enterState(nextState, payload);
    this.syncBodyDatasetState();
  }

  syncBodyDatasetState() {
    if (typeof document === 'undefined' || !document.body) return;
    document.body.dataset.vuState = this.state.toLowerCase();
    if (this.state === 'SPLASH' || this.state === 'MENU' || this.state === 'GALLERY') {
      document.body.dataset.state = 'title';
    } else if (this.state === 'PLAYING' || this.state === 'COMIC' || this.state === 'HACKING') {
      document.body.dataset.state = 'playing';
    } else if (this.state === 'PAUSED') {
      document.body.dataset.state = 'paused';
    } else {
      document.body.dataset.state = 'gameover';
    }
  }

  exitState(state) {
    this.input.releaseAll();
    if (state === 'SPLASH' || state === 'MENU') {
      this.menuUI.hideAll();
    } else if (state === 'PLAYING') {
      this.touchControls.hide();
    } else if (state === 'PAUSED') {
      this.hudUI.closePauseModal();
    } else if (state === 'HACKING') {
      this.puzzleHost.close();
      this.loop.timeScale = 1.0;
    } else if (state === 'COMIC') {
      this.comicUI.close();
    } else if (state === 'DEBRIEF') {
      this.debriefUI.close();
    } else if (state === 'GALLERY') {
      this.galleryUI.close();
    }
  }

  enterState(state, payload) {
    switch (state) {
      case 'SPLASH':
        this.hudUI.hide();
        this.menuUI.showSplash();
        this.audio.setMode('MENU');
        break;

      case 'MENU':
        this.hudUI.hide();
        this.menuUI.showMainMenu(this.saveManager);
        this.audio.setMode('MENU');
        break;

      case 'COMIC':
        this.hudUI.hide();
        this.touchControls.hide();
        this.comicUI.play(payload.sequence, payload.onComplete || (() => this.transitionTo('PLAYING')));
        break;

      case 'PLAYING':
        this.loop.timeScale = 1.0;
        this.hudUI.show();
        this.touchControls.show();
        this.audio.setMode('EXPLORE');
        break;

      case 'HACKING': {
        const fullPause = this.saveManager.state.settings.puzzleFullPause;
        this.loop.timeScale = fullPause ? 0.0 : STEALTH.shadowFocusTimeScale;
        this.touchControls.hide();
        this.audio.setMode('HACK');
        if (payload.puzzleData) {
          this.puzzleHost.open(payload.puzzleData);
        }
        break;
      }

      case 'PAUSED':
        this.loop.timeScale = 0.0;
        this.touchControls.hide();
        this.hudUI.openPauseModal();
        break;

      case 'DEBRIEF': {
        this.hudUI.hide();
        this.touchControls.hide();
        const chStats = this.saveManager.state.chapterStats[this.activeChapterId] || {
          alarms: 0,
          takedowns: 0,
          hintsUsed: 0,
          elapsedSec: 0
        };
        this.debriefUI.open(chStats, this.saveManager.state.unlockedCodexIds);
        break;
      }

      case 'GALLERY':
        this.hudUI.hide();
        this.touchControls.hide();
        this.galleryUI.open();
        break;

      case 'ERROR':
        this.hudUI.hide();
        this.touchControls.hide();
        this.errorOverlay.show(payload.error || 'Unknown error');
        break;
    }
  }

  handleTitleKeyStart(e) {
    if (e.code !== 'Enter' && e.code !== 'Space') return;
    if (this.state === 'SPLASH') {
      e.preventDefault();
      this.audio.unlock();
      this.transitionTo('MENU');
    } else if (this.state === 'MENU' && !this.menuUI.modalEl && !this.settingsUI.modalEl) {
      e.preventDefault();
      const chId = this.saveManager.state.currentChapterId || 'ch01_roofs';
      const lvlIdx = this.saveManager.state.hasStarted
        ? this.saveManager.state.currentLevelIndex || 0
        : 0;
      this.startChapterAtLevel(chId, lvlIdx);
    }
  }

  startChapterAtLevel(chapterId, levelIndex) {
    const ch = getChapterById(chapterId);
    this.activeChapterId = ch.id;
    this.activeLevelIndex = Math.max(0, Math.min(ch.levels.length - 1, levelIndex));
    this.loadLevel(this.activeChapterId, this.activeLevelIndex);

    // Play Intro Comic if starting Level 0
    if (this.activeLevelIndex === 0 && ch.comics?.intro) {
      this.transitionTo('COMIC', {
        sequence: ch.comics.intro,
        onComplete: () => this.transitionTo('PLAYING')
      });
    } else {
      this.transitionTo('PLAYING');
    }
  }

  loadLevel(chapterId, levelIndex) {
    const ch = getChapterById(chapterId);
    const lvlDef = ch.levels[levelIndex] || ch.levels[0];
    this.currentLevel = new Level(lvlDef);
    this.shownTutorialIndices.clear();
    this.respawnTimer = 0;

    // Mark previously completed puzzles if replaying
    for (const term of this.currentLevel.terminals) {
      if (this.saveManager.state.completedPuzzles.includes(term.puzzleId)) {
        // Keep unsolved at fresh level load so the player can always play the terminals
        term.solved = false;
      }
    }

    this.renderer.bakeLevelTiles(this.currentLevel);
    this.renderer.camera.x = Math.max(0, this.currentLevel.spawn.x - 4);
    this.renderer.camera.y = 0;
    this.saveManager.recordLevelProgress(chapterId, levelIndex);
  }

  handlePuzzleSolved(puzzleData, hintsUsed) {
    if (this.activeTerminal) {
      this.activeTerminal.solved = true;
    }
    this.saveManager.recordPuzzleSolved(puzzleData.id, puzzleData.codexId, hintsUsed);

    const ch = getChapterById(this.activeChapterId);
    const midTermId = this.currentLevel?.midComicAfterTerminalId;
    if (midTermId && this.activeTerminal?.id === midTermId && ch.comics?.mid) {
      this.activeTerminal = null;
      this.transitionTo('COMIC', {
        sequence: ch.comics.mid,
        onComplete: () => this.transitionTo('PLAYING')
      });
      return;
    }

    this.activeTerminal = null;
    this.transitionTo('PLAYING');
  }

  advanceToNextLevelOrDebrief() {
    const ch = getChapterById(this.activeChapterId);
    const nextIdx = this.activeLevelIndex + 1;
    if (nextIdx < ch.levels.length) {
      this.activeLevelIndex = nextIdx;
      this.loadLevel(this.activeChapterId, this.activeLevelIndex);
      this.transitionTo('PLAYING');
    } else {
      // Chapter complete: play Ending Comic -> Debrief
      if (ch.comics?.ending) {
        this.transitionTo('COMIC', {
          sequence: ch.comics.ending,
          onComplete: () => this.transitionTo('DEBRIEF')
        });
      } else {
        this.transitionTo('DEBRIEF');
      }
    }
  }

  onFixedUpdate(dt) {
    if (this.isPortraitPaused) return;

    if (this.state === 'COMIC') {
      this.comicUI.update(dt);
      return;
    }

    if (this.state !== 'PLAYING' && this.state !== 'HACKING') return;
    if (!this.currentLevel) return;

    const lvl = this.currentLevel;
    const input = this.input.poll();

    if (input.pauseJustPressed && this.state === 'PLAYING') {
      this.transitionTo('PAUSED');
      return;
    }

    // Track chapter elapsed time
    const chStats = this.saveManager.state.chapterStats[this.activeChapterId];
    if (chStats) {
      chStats.elapsedSec += dt;
    }

    // Respawn countdown when caught
    if (this.respawnTimer > 0) {
      this.respawnTimer -= dt;
      this.renderer.alertPulse = Math.max(0, this.respawnTimer / STEALTH.respawnFadeSec);
      if (this.respawnTimer <= 0) {
        this.renderer.alertPulse = 0;
        lvl.respawnAtCheckpoint();
      }
      return;
    }

    // Evaluate lighting on VU1FRA
    const emitters = lvl.getDynamicLightEmitters();
    const camCenterX = this.renderer.camera.x + this.renderer.camera.viewWidthTiles * 0.5;
    this.renderer.lighting.updateDynamicLights(
      lvl,
      emitters,
      camCenterX,
      this.renderer.quality.getRayCount()
    );

    const heroLight = this.renderer.lighting.evaluatePointLight(lvl, lvl.hero.x, lvl.hero.y - 0.8);
    const isHeroInShadow = !heroLight.isLit;

    if (this.state === 'PLAYING') {
      lvl.hero.update(dt, input, lvl, isHeroInShadow, this.events);
    }

    // Update guards, drones, cameras
    for (const g of lvl.guards) g.update(dt, lvl);
    for (const d of lvl.drones) d.update(dt, this.loop.clock);
    for (const c of lvl.cameras) c.update(dt, this.loop.clock);

    // Update enemy perception
    const perc = PerceptionSystem.update(lvl, heroLight.isLit, dt, this.debugPanel.godMode);

    if (perc.triggeredAlarm && this.respawnTimer <= 0) {
      lvl.hero.caught = true;
      this.respawnTimer = STEALTH.respawnFadeSec;
      this.renderer.alertPulse = 1.0;
      this.audio.setMode('ALERT');
      this.input.vibrate([90, 50, 120]);
      if (chStats) chStats.alarms++;
      this.hudUI.showToast(i18n.t('hud.spotted'), 2.0);
      return;
    }

    if (this.state === 'PLAYING') {
      this.audio.setMode(perc.maxSuspicion > 0.3 ? 'TENSION' : 'EXPLORE');
      this.renderer.alertPulse = perc.maxSuspicion > 0.65 ? (perc.maxSuspicion - 0.65) * 1.5 : 0;
    }

    // Checkpoints & tutorial whispers
    StealthSystem.updateCheckpoints(lvl, this.events);
    lvl.tutorialHints.forEach((hint, idx) => {
      if (!this.shownTutorialIndices.has(idx) && Math.abs(lvl.hero.x - hint.x) <= 2.4) {
        this.shownTutorialIndices.add(idx);
        this.hudUI.showToast(hint.textRu, 4.5);
      }
    });

    // Contextual ACTION handling
    const ctxAction = StealthSystem.findContextualAction(lvl, perc.anySeeingHero);
    this.touchControls.updateContextualAction(ctxAction);

    if (this.state === 'PLAYING' && input.actionJustPressed) {
      this.executeContextualAction(ctxAction);
    }

    this.renderer.particles.update(dt);
  }

  executeContextualAction(ctxAction) {
    if (!this.currentLevel || !ctxAction || ctxAction.type === 'NONE') return;
    const hero = this.currentLevel.hero;

    switch (ctxAction.type) {
      case 'TAKEDOWN': {
        const guard = ctxAction.target;
        guard.knockOut();
        hero.takedownTimer = STEALTH.takedownDurationSec;
        this.loop.triggerHitstop(0.05);
        this.audio.playTakedown();
        this.input.vibrate(45);
        this.renderer.particles.spawnBurst(guard.x, guard.y - 0.8, 14, 'ink', '#3df2ff');
        const chStats = this.saveManager.state.chapterStats[this.activeChapterId];
        if (chStats) chStats.takedowns++;
        break;
      }

      case 'HACK': {
        if (ctxAction.blockedReasonKey) {
          this.hudUI.showToast(i18n.t(ctxAction.blockedReasonKey), 2.5);
          this.audio.playTerminalBlip(false);
          return;
        }
        const term = ctxAction.target;
        const pz = getPuzzleById(this.activeChapterId, term.puzzleId);
        if (pz) {
          this.activeTerminal = term;
          hero.animState = 'hack';
          this.transitionTo('HACKING', { puzzleData: pz });
        }
        break;
      }

      case 'COVER_ENTER': {
        const cov = ctxAction.target;
        hero.x = cov.x;
        hero.inCover = true;
        hero.activeCover = cov;
        this.audio.playFootstep(false);
        break;
      }

      case 'COVER_EXIT': {
        hero.inCover = false;
        hero.activeCover = null;
        this.audio.playFootstep(false);
        break;
      }

      case 'EXIT': {
        this.advanceToNextLevelOrDebrief();
        break;
      }
    }
  }

  onRender(realDt) {
    if (this.isPortraitPaused) return;

    this.renderer.quality.update(this.loop.frameTimeMs);
    this.audio.update(realDt, this.loop.clock);
    this.debugPanel.update(this.loop.frameTimeMs, this.state);

    const reduceMotion = Boolean(this.saveManager.state.settings.reduceMotion);

    if (this.state === 'SPLASH' || this.state === 'MENU') {
      this.renderer.renderMenuScene(this.loop.clock, reduceMotion);
      return;
    }

    if (this.state === 'GALLERY') {
      this.galleryUI.renderCanvas(this.loop.clock);
      return;
    }

    if (this.state === 'COMIC') {
      this.comicUI.renderToCanvas(this.renderer.ctx, this.renderer.width, this.renderer.height, reduceMotion);
      return;
    }

    if (this.state === 'DEBRIEF' || this.state === 'ERROR') {
      return;
    }

    if (this.currentLevel) {
      const h = this.currentLevel.hero;
      this.renderer.camera.follow(
        h.x,
        h.y,
        h.facing,
        this.currentLevel.width,
        this.currentLevel.height,
        realDt,
        reduceMotion
      );
      this.renderer.renderWorld(this.currentLevel, this.loop.clock, reduceMotion);

      if (this.renderer.ctx) {
        this.debugPanel.drawDebugOverlay(this.renderer.ctx, this.currentLevel, this.renderer.camera);
      }

      const objStatus = ObjectivesSystem.getStatus(this.currentLevel);
      this.hudUI.update(objStatus.textRu, realDt);
    }
  }

  applySettings(s) {
    if (!s) return;
    this.audio.updateSettings(s);
    this.input.configure(s);
    this.touchControls.applySettings(s);
    this.renderer.quality.setMode(s.qualityTier || 'AUTO');
    this.handleResize();
  }

  handleResize() {
    const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    this.renderer.resize(vw, vh);
  }

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator && navigator.wakeLock?.request) {
        await navigator.wakeLock.request('screen');
      }
    } catch {
      // Silent-safe
    }
  }

  debugSkipActivePuzzle() {
    if (this.state === 'HACKING' && this.puzzleHost.activeData) {
      this.handlePuzzleSolved(this.puzzleHost.activeData, 0);
    } else if (this.currentLevel) {
      for (const t of this.currentLevel.terminals) t.solved = true;
    }
  }

  debugTeleportToExit() {
    if (this.currentLevel && this.currentLevel.exit) {
      for (const t of this.currentLevel.terminals) t.solved = true;
      this.currentLevel.hero.x = this.currentLevel.exit.x - 0.5;
      this.currentLevel.hero.y = this.currentLevel.exit.y;
    }
  }
}
