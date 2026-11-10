/**
 * @fileoverview Settings modal for audio, graphics quality tier, touch controls ergonomics,
 * accessibility options, and save reset.
 */

import { el } from '../puzzles/PuzzleRegistry.js';
import { i18n } from '../i18n/I18n.js';

export class SettingsUI {
  /**
   * @param {HTMLElement} parent
   * @param {import('../progression/Save.js').SaveManager} saveManager
   * @param {(newSettings: any) => void} onSettingsChange
   * @param {() => void} onResetSave
   */
  constructor(parent, saveManager, onSettingsChange, onResetSave) {
    this.parent = parent;
    this.saveManager = saveManager;
    this.onSettingsChange = onSettingsChange;
    this.onResetSave = onResetSave;
    this.modalEl = null;
  }

  open() {
    this.close();
    const s = this.saveManager.state.settings;

    const backdrop = el('div', {
      className: 'vu-modal-backdrop',
      attrs: { 'data-testid': 'settings-modal' }
    });
    const card = el('div', {
      className: 'vu-modal-card',
      attrs: { role: 'dialog', 'aria-label': i18n.t('settings.title') }
    });

    const header = el('div', { className: 'vu-modal-header' }, [
      el('h2', { className: 'vu-modal-title', text: i18n.t('settings.title') }),
      el('button', {
        className: 'vu-btn vu-btn-outline',
        text: i18n.t('common.close'),
        onClick: () => this.close()
      })
    ]);

    const body = el('div', { className: 'vu-modal-body' });
    const grid = el('div', { className: 'vu-settings-grid' });

    const update = (patch) => {
      this.saveManager.updateSettings(patch);
      this.onSettingsChange(this.saveManager.state.settings);
    };

    // Volume sliders
    grid.appendChild(
      this.createSliderRow(i18n.t('settings.masterVol'), s.masterVolume, (v) => update({ masterVolume: v }))
    );
    grid.appendChild(
      this.createSliderRow(i18n.t('settings.musicVol'), s.musicVolume, (v) => update({ musicVolume: v }))
    );
    grid.appendChild(
      this.createSliderRow(i18n.t('settings.sfxVol'), s.sfxVolume, (v) => update({ sfxVolume: v }))
    );
    grid.appendChild(
      this.createToggleRow(i18n.t('settings.mute'), s.muted, (v) => update({ muted: v }))
    );

    // Quality tier
    grid.appendChild(
      this.createCycleRow(
        i18n.t('settings.quality'),
        s.qualityTier,
        [
          { val: 'AUTO', label: i18n.t('settings.qualityAuto') },
          { val: 'HIGH', label: i18n.t('settings.qualityHigh') },
          { val: 'MED', label: i18n.t('settings.qualityMed') },
          { val: 'LOW', label: i18n.t('settings.qualityLow') }
        ],
        (v) => update({ qualityTier: v })
      )
    );

    // Touch controls size S / M / L
    grid.appendChild(
      this.createCycleRow(
        i18n.t('settings.controlsSize'),
        s.controlSize,
        [
          { val: 'S', label: i18n.t('settings.sizeS') },
          { val: 'M', label: i18n.t('settings.sizeM') },
          { val: 'L', label: i18n.t('settings.sizeL') }
        ],
        (v) => update({ controlSize: v })
      )
    );

    // Touch opacity
    grid.appendChild(
      this.createSliderRow(
        i18n.t('settings.controlsOpacity'),
        s.controlOpacity,
        (v) => update({ controlOpacity: Math.max(0.2, Math.min(0.9, v)) })
      )
    );

    // Left-handed layout
    grid.appendChild(
      this.createToggleRow(i18n.t('settings.leftHanded'), s.leftHanded, (v) => update({ leftHanded: v }))
    );

    // Joystick mode DYNAMIC / FIXED
    grid.appendChild(
      this.createCycleRow(
        i18n.t('settings.joystickMode'),
        s.joystickMode,
        [
          { val: 'DYNAMIC', label: i18n.t('settings.joystickDynamic') },
          { val: 'FIXED', label: i18n.t('settings.joystickFixed') }
        ],
        (v) => update({ joystickMode: v })
      )
    );

    // Sprint mode HOLD / TOGGLE
    grid.appendChild(
      this.createCycleRow(
        i18n.t('settings.sprintMode'),
        s.sprintMode,
        [
          { val: 'HOLD', label: i18n.t('settings.sprintHold') },
          { val: 'TOGGLE', label: i18n.t('settings.sprintToggle') }
        ],
        (v) => update({ sprintMode: v })
      )
    );

    // Haptics, Puzzle Pause, Reduce Motion
    grid.appendChild(
      this.createToggleRow(i18n.t('settings.haptics'), s.haptics, (v) => update({ haptics: v }))
    );
    grid.appendChild(
      this.createToggleRow(i18n.t('settings.puzzlePause'), s.puzzleFullPause, (v) =>
        update({ puzzleFullPause: v })
      )
    );
    grid.appendChild(
      this.createToggleRow(i18n.t('settings.reduceMotion'), s.reduceMotion, (v) =>
        update({ reduceMotion: v })
      )
    );

    // Reset save
    const resetBtn = el('button', {
      className: 'vu-btn vu-btn-subtle',
      text: i18n.t('settings.resetSave'),
      onClick: () => {
        this.onResetSave();
        resetBtn.textContent = i18n.t('settings.resetConfirm');
      }
    });
    grid.appendChild(el('div', { className: 'vu-setting-row' }, [resetBtn]));

    body.appendChild(grid);
    card.appendChild(header);
    card.appendChild(body);
    backdrop.appendChild(card);
    this.modalEl = backdrop;
    this.parent.appendChild(backdrop);
  }

  createSliderRow(label, initialVal, onChange) {
    const input = el('input', {
      attrs: {
        type: 'range',
        min: '0',
        max: '1',
        step: '0.05',
        value: String(initialVal),
        'aria-label': label
      }
    });
    input.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!Number.isNaN(val)) onChange(val);
    });
    return el('div', { className: 'vu-setting-row' }, [el('span', { text: label }), input]);
  }

  createToggleRow(label, initialVal, onChange) {
    let cur = Boolean(initialVal);
    const btn = el('button', {
      className: `vu-btn ${cur ? 'vu-btn-primary' : ''}`,
      text: cur ? 'ВКЛ' : 'ВЫКЛ',
      onClick: () => {
        cur = !cur;
        btn.textContent = cur ? 'ВКЛ' : 'ВЫКЛ';
        btn.className = `vu-btn ${cur ? 'vu-btn-primary' : ''}`;
        onChange(cur);
      }
    });
    return el('div', { className: 'vu-setting-row' }, [el('span', { text: label }), btn]);
  }

  createCycleRow(label, initialVal, options, onChange) {
    let idx = Math.max(0, options.findIndex((o) => o.val === initialVal));
    const btn = el('button', {
      className: 'vu-btn vu-btn-primary',
      text: options[idx].label,
      onClick: () => {
        idx = (idx + 1) % options.length;
        btn.textContent = options[idx].label;
        onChange(options[idx].val);
      }
    });
    return el('div', { className: 'vu-setting-row' }, [el('span', { text: label }), btn]);
  }

  close() {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
  }
}
