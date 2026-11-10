/**
 * @fileoverview Interactive Gallery mode (`?gallery=1` or 5 taps on version label in Menu).
 * Lets the player/reviewer inspect every visual and interactive element on a phone:
 * 1. Hero VU1FRA animation picker (14 states) + light-angle slider
 * 2. Enemies (Guard, Drone, Security Camera) + suspicion arc slider
 * 3. Parallax stack + fog & glow sliders
 * 4. Main Menu live preview
 * 5. Comic panels (all 9 panels)
 * 6. Hacking Puzzle UIs (all 5 puzzles interactive with sample data)
 */

import { el, puzzleRegistry } from '../puzzles/PuzzleRegistry.js';
import { HERO_ANIM_LIST } from '../art/HeroAnimations.js';
import { HeroRig } from '../art/HeroRig.js';
import { EnemyArt } from '../art/EnemyArt.js';
import { comicPanels } from '../art/ComicPanels.js';
import { CH01_PUZZLES } from '../content/chapters/ch01_roofs/puzzles/puzzles.js';
import { PALETTE } from '../theme.js';

export class GalleryUI {
  /**
   * @param {HTMLElement} parent
   * @param {import('../render/Renderer.js').Renderer} renderer
   * @param {() => void} onClose
   */
  constructor(parent, renderer, onClose) {
    this.parent = parent;
    this.renderer = renderer;
    this.onClose = onClose;

    this.activeTab = 'hero'; // 'hero' | 'enemies' | 'parallax' | 'menu' | 'comics' | 'puzzles'
    this.heroAnim = 'idle';
    this.lightAngle = -0.8;
    this.enemySuspicion = 0.45;
    this.selectedPanelId = 'ch1_intro_4';
    this.selectedPuzzleId = 'term_a_phishing';

    this.heroRig = new HeroRig(15);
    this.overlayEl = null;
    this.puzzleMountEl = null;
  }

  open() {
    this.close();
    const wrap = el('div', {
      className: 'vu-modal-backdrop',
      attrs: { 'data-testid': 'gallery-overlay' }
    });
    wrap.style.background = 'rgba(5, 7, 13, 0.35)';

    const card = el('div', { className: 'vu-modal-card' });
    card.style.maxWidth = '94vw';
    card.style.maxHeight = '92vh';
    card.style.background = 'rgba(11, 16, 32, 0.72)';

    const tabs = [
      { id: 'hero', label: 'Герой (14 аним.)' },
      { id: 'enemies', label: 'Враги и зрение' },
      { id: 'parallax', label: 'Параллакс и туман' },
      { id: 'menu', label: 'Сцена меню' },
      { id: 'comics', label: 'Комиксы (9 кадров)' },
      { id: 'puzzles', label: 'Головоломки (5)' }
    ];

    const tabBar = el('div', { className: 'vu-chip-grid' });
    for (const t of tabs) {
      const btn = el('button', {
        className: `vu-btn ${this.activeTab === t.id ? 'vu-btn-primary' : ''}`,
        text: t.label,
        attrs: { 'data-gallery-tab': t.id },
        onClick: () => {
          this.activeTab = t.id;
          this.open();
        }
      });
      tabBar.appendChild(btn);
    }

    const closeBtn = el('button', {
      className: 'vu-btn vu-btn-outline',
      text: 'Закрыть галерею',
      attrs: { 'data-testid': 'gallery-close-btn' },
      onClick: () => {
        this.close();
        this.onClose();
      }
    });

    const header = el('div', { className: 'vu-modal-header' }, [tabBar, closeBtn]);
    this.controlsBar = el('div', { className: 'vu-modal-footer' });
    this.controlsBar.style.flexWrap = 'wrap';

    card.appendChild(header);

    if (this.activeTab === 'puzzles') {
      this.puzzleMountEl = el('div', { className: 'vu-modal-body' });
      card.appendChild(this.puzzleMountEl);
      this.mountSelectedPuzzle();
    } else {
      // Transparent viewport area so the underlying live canvas showcase is clearly visible
      const viewportSpacer = el('div', { className: 'vu-modal-body' });
      viewportSpacer.style.minHeight = '48vh';
      viewportSpacer.style.pointerEvents = 'none';
      card.appendChild(viewportSpacer);
    }

    this.populateControlsBar();
    card.appendChild(this.controlsBar);
    wrap.appendChild(card);
    this.overlayEl = wrap;
    this.parent.appendChild(wrap);
  }

  populateControlsBar() {
    this.controlsBar.textContent = '';

    if (this.activeTab === 'hero') {
      const chipWrap = el('div', { className: 'vu-chip-grid' });
      for (const anim of HERO_ANIM_LIST) {
        const b = el('button', {
          className: `vu-choice-chip ${this.heroAnim === anim ? 'active' : ''}`,
          text: anim,
          onClick: () => {
            this.heroAnim = anim;
            this.populateControlsBar();
          }
        });
        chipWrap.appendChild(b);
      }

      const slider = el('input', {
        attrs: {
          type: 'range',
          min: '-3.14',
          max: '3.14',
          step: '0.1',
          value: String(this.lightAngle),
          'aria-label': 'Угол света'
        }
      });
      slider.addEventListener('input', (e) => {
        this.lightAngle = parseFloat(e.target.value) || 0;
      });

      this.controlsBar.appendChild(chipWrap);
      this.controlsBar.appendChild(
        el('div', { className: 'vu-setting-row' }, [el('span', { text: 'Угол света:' }), slider])
      );
    } else if (this.activeTab === 'enemies') {
      const slider = el('input', {
        attrs: {
          type: 'range',
          min: '0',
          max: '1',
          step: '0.05',
          value: String(this.enemySuspicion),
          'aria-label': 'Уровень подозрения'
        }
      });
      slider.addEventListener('input', (e) => {
        this.enemySuspicion = parseFloat(e.target.value) || 0;
      });
      this.controlsBar.appendChild(
        el('div', { className: 'vu-setting-row' }, [
          el('span', { text: 'Индикатор подозрения (белый -> янтарный -> багровый):' }),
          slider
        ])
      );
    } else if (this.activeTab === 'parallax') {
      const fogSlider = el('input', {
        attrs: {
          type: 'range',
          min: '0',
          max: '2',
          step: '0.1',
          value: String(this.renderer.fogMultiplier),
          'aria-label': 'Плотность тумана'
        }
      });
      fogSlider.addEventListener('input', (e) => {
        this.renderer.fogMultiplier = parseFloat(e.target.value) || 0;
      });

      const glowSlider = el('input', {
        attrs: {
          type: 'range',
          min: '0',
          max: '2',
          step: '0.1',
          value: String(this.renderer.glowMultiplier),
          'aria-label': 'Свечение'
        }
      });
      glowSlider.addEventListener('input', (e) => {
        this.renderer.glowMultiplier = parseFloat(e.target.value) || 0;
      });

      this.controlsBar.appendChild(
        el('div', { className: 'vu-setting-row' }, [el('span', { text: 'Туман:' }), fogSlider])
      );
      this.controlsBar.appendChild(
        el('div', { className: 'vu-setting-row' }, [el('span', { text: 'Свечение:' }), glowSlider])
      );
    } else if (this.activeTab === 'comics') {
      const ids = [
        'ch1_intro_1',
        'ch1_intro_2',
        'ch1_intro_3',
        'ch1_intro_4',
        'ch1_mid_1',
        'ch1_mid_2',
        'ch1_end_1',
        'ch1_end_2',
        'ch1_end_3'
      ];
      const grid = el('div', { className: 'vu-chip-grid' });
      for (const id of ids) {
        grid.appendChild(
          el('button', {
            className: `vu-choice-chip ${this.selectedPanelId === id ? 'active' : ''}`,
            text: id,
            onClick: () => {
              this.selectedPanelId = id;
              this.populateControlsBar();
            }
          })
        );
      }
      this.controlsBar.appendChild(grid);
    } else if (this.activeTab === 'puzzles') {
      const grid = el('div', { className: 'vu-chip-grid' });
      for (const pz of Object.values(CH01_PUZZLES)) {
        grid.appendChild(
          el('button', {
            className: `vu-choice-chip ${this.selectedPuzzleId === pz.id ? 'active' : ''}`,
            text: pz.titleRu,
            onClick: () => {
              this.selectedPuzzleId = pz.id;
              this.mountSelectedPuzzle();
              this.populateControlsBar();
            }
          })
        );
      }
      this.controlsBar.appendChild(grid);
    }
  }

  mountSelectedPuzzle() {
    if (!this.puzzleMountEl) return;
    const pz = CH01_PUZZLES[this.selectedPuzzleId];
    if (!pz) return;
    const typeMod = puzzleRegistry.get(pz.type);
    if (!typeMod) return;
    const ctrl = typeMod.createController(pz, {
      onBlip: () => {},
      triggerEvaluate: () => {}
    });
    ctrl.mount(this.puzzleMountEl);
  }

  /**
   * Render the active Gallery canvas showcase every frame.
   */
  renderCanvas(clockSec) {
    const r = this.renderer;
    const ctx = r.ctx;
    if (!ctx) return;
    const w = r.width;
    const h = r.height;
    const S = r.camera.tileScale;

    if (this.activeTab === 'menu' || this.activeTab === 'parallax') {
      r.renderMenuScene(clockSec, false);
      return;
    }

    r.layers.drawBackground(ctx, w, h, clockSec * 0.15);
    r.fog.draw(ctx, w, h, clockSec * 0.15, clockSec, r.fogMultiplier);

    // Stage floor
    const floorY = h * 0.68;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(0, floorY, w, h - floorY);
    ctx.strokeStyle = 'rgba(61, 242, 255, 0.45)';
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(w, floorY);
    ctx.stroke();

    if (this.activeTab === 'hero') {
      const lx = w * 0.5 + Math.cos(this.lightAngle) * S * 2.2;
      const ly = floorY - S * 1.1 + Math.sin(this.lightAngle) * S * 2.2;
      r.glow.drawGlow(ctx, 'amber', lx, ly, S * 1.2, 0.75);

      this.heroRig.draw(ctx, {
        screenX: w * 0.5,
        screenY: floorY,
        tileScale: S * 1.45,
        facing: 1,
        anim: this.heroAnim,
        animTime: clockSec,
        gaitPhase: clockSec * 3.5,
        worldX: 10,
        worldY: 8,
        vx: this.heroAnim === 'sprint' ? 5.5 : 1.5,
        vy: 0,
        clock: clockSec,
        lightAngleRad: this.lightAngle,
        lightIntensity: 0.9,
        shadowEnergy: 82
      });
    } else if (this.activeTab === 'enemies') {
      const st =
        this.enemySuspicion >= 0.85
          ? 'ALERTED'
          : this.enemySuspicion >= 0.35
          ? 'SEARCHING'
          : 'CALM';

      EnemyArt.drawGuard(ctx, {
        screenX: w * 0.32,
        screenY: floorY,
        tileScale: S * 1.25,
        facing: 1,
        walkCycle: clockSec * 4,
        state: st,
        suspicion: this.enemySuspicion,
        aimAngleRad: 0
      });

      EnemyArt.drawDrone(ctx, {
        screenX: w * 0.52,
        screenY: floorY - S * 1.4,
        tileScale: S * 1.25,
        clock: clockSec,
        suspicion: this.enemySuspicion,
        state: st
      });

      EnemyArt.drawCamera(ctx, {
        screenX: w * 0.70,
        screenY: floorY - S * 1.6,
        tileScale: S * 1.25,
        aimAngleRad: Math.sin(clockSec) * 0.5 + 0.5,
        suspicion: this.enemySuspicion,
        state: st
      });
    } else if (this.activeTab === 'comics') {
      const cw = Math.min(w * 0.76, h * 0.65 * (16 / 9));
      const ch = cw * (9 / 16);
      ctx.save();
      ctx.translate((w - cw) * 0.5, h * 0.14);
      ctx.scale(cw / 960, ch / 540);
      comicPanels.renderPanel(ctx, this.selectedPanelId, 960, 540);
      ctx.restore();
    }
  }

  close() {
    if (this.overlayEl) {
      this.overlayEl.remove();
      this.overlayEl = null;
    }
  }
}
