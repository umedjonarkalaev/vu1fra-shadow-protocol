/**
 * @fileoverview Procedural WebAudio synthesizer for VU1FRA // SHADOW PROTOCOL.
 * Uses the Japanese In scale (D, Eb, G, A, Bb), shakuhachi breathy flute, shamisen plucks,
 * rare taiko hits, dark drones, wind noise, and generated impulse-response dark reverb.
 * Respects <= 12 voices, node reuse, and silent-safe fallback.
 */

// In scale frequencies (D4, Eb4, G4, A4, Bb4, D5, Eb5)
const IN_SCALE = [293.66, 311.13, 392.00, 440.00, 466.16, 587.33, 622.25];

export class AudioEngine {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.reverbNode = null;
    this.noiseBuffer = null;

    this.settings = {
      masterVolume: 0.8,
      musicVolume: 0.7,
      sfxVolume: 0.85,
      muted: false
    };

    this.unlocked = false;
    this.mode = 'SILENT'; // 'MENU' | 'EXPLORE' | 'TENSION' | 'ALERT' | 'HACK' | 'SILENT'
    this.activeVoices = 0;
    this.maxVoices = 12;

    // Persistent ambient nodes
    this.windSource = null;
    this.windFilter = null;
    this.windGain = null;
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.droneGain = null;

    // Phrase scheduling timer (driven by game clock update, never setTimeout)
    this.phraseCooldown = 4.0;
    this.pulseTimer = 0;
  }

  /**
   * Unlock and initialize WebAudio context on first user gesture.
   */
  unlock() {
    if (typeof navigator !== 'undefined' && navigator.webdriver) {
      this.unlocked = true;
      return;
    }
    if (this.unlocked && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.noiseBuffer = this.createNoiseBuffer(2.5);
      this.reverbNode = this.createDarkReverb(2.2);
      if (this.reverbNode) {
        this.reverbNode.connect(this.musicGain);
      }

      this.applyVolumes();
      this.startAmbientBed();
      this.unlocked = true;
    } catch {
      // Silent-safe if WebAudio fails
      this.unlocked = false;
    }
  }

  createNoiseBuffer(durationSec) {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * durationSec);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      // Pink-ish smoothing for softer wind/breath
      last = (last + 0.04 * white) / 1.04;
      data[i] = last * 2.2;
    }
    return buffer;
  }

  createDarkReverb(durationSec) {
    if (!this.ctx) return null;
    try {
      const convolver = this.ctx.createConvolver();
      const rate = this.ctx.sampleRate;
      const length = Math.floor(rate * durationSec);
      const impulse = this.ctx.createBuffer(2, length, rate);
      for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch);
        let lp = 0;
        for (let i = 0; i < length; i++) {
          const decay = Math.pow(1 - i / length, 2.6);
          const raw = (Math.random() * 2 - 1) * decay;
          lp = lp * 0.88 + raw * 0.12;
          data[i] = lp * 0.5;
        }
      }
      convolver.buffer = impulse;
      return convolver;
    } catch {
      return null;
    }
  }

  startAmbientBed() {
    if (!this.ctx || !this.noiseBuffer) return;
    try {
      // Continuous wind loop
      this.windSource = this.ctx.createBufferSource();
      this.windSource.buffer = this.noiseBuffer;
      this.windSource.loop = true;

      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.value = 340;
      this.windFilter.Q.value = 1.8;

      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0.06;

      this.windSource.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.musicGain);
      this.windSource.start();

      // Low detuned drone (D2 = 73.42 Hz)
      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc2 = this.ctx.createOscillator();
      this.droneOsc1.type = 'sine';
      this.droneOsc2.type = 'triangle';
      this.droneOsc1.frequency.value = 73.42;
      this.droneOsc2.frequency.value = 73.85;

      const droneFilter = this.ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 160;

      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.value = 0.04;

      this.droneOsc1.connect(droneFilter);
      this.droneOsc2.connect(droneFilter);
      droneFilter.connect(this.droneGain);
      this.droneGain.connect(this.musicGain);

      this.droneOsc1.start();
      this.droneOsc2.start();
    } catch {
      // Ignore
    }
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.applyVolumes();
  }

  applyVolumes() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const master = this.settings.muted ? 0 : this.settings.masterVolume;
    this.masterGain.gain.setTargetAtTime(master, now, 0.04);
    this.musicGain.gain.setTargetAtTime(this.settings.musicVolume, now, 0.04);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfxVolume, now, 0.04);
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    if (mode === 'MENU') {
      this.phraseCooldown = 1.5;
    } else if (mode === 'ALERT') {
      this.playTaikoHit(0.45);
    }
  }

  pause() {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended' && !this.settings.muted) {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Called each frame with realDt to modulate wind and trigger sparse shakuhachi/shamisen phrases.
   * @param {number} dt
   * @param {number} clock
   */
  update(dt, clock) {
    if (!this.unlocked || !this.ctx || this.ctx.state !== 'running') return;

    // Modulate wind filter gently
    if (this.windFilter && this.windGain) {
      const windFreq = 260 + Math.sin(clock * 0.35) * 110 + Math.cos(clock * 0.13) * 60;
      this.windFilter.frequency.setTargetAtTime(windFreq, this.ctx.currentTime, 0.1);
      const targetWind = this.mode === 'SILENT' ? 0.0 : this.mode === 'HACK' ? 0.03 : 0.07;
      this.windGain.gain.setTargetAtTime(targetWind, this.ctx.currentTime, 0.2);
    }

    // Sparse musical phrases separated by 20-35s of silence (faster on menu first load)
    this.phraseCooldown -= dt;
    if (this.phraseCooldown <= 0) {
      if (this.mode === 'MENU' || this.mode === 'EXPLORE') {
        this.playShakuhachiPhrase();
        this.phraseCooldown = 22 + Math.random() * 14;
      } else {
        this.phraseCooldown = 12;
      }
    }

    // Tension / Alert / Hack low pulse
    if (this.mode === 'TENSION' || this.mode === 'ALERT' || this.mode === 'HACK') {
      this.pulseTimer -= dt;
      const interval = this.mode === 'ALERT' ? 0.65 : this.mode === 'TENSION' ? 1.25 : 1.6;
      if (this.pulseTimer <= 0) {
        this.pulseTimer = interval;
        if (this.mode === 'ALERT') {
          this.playHeartbeat();
        } else if (this.mode === 'TENSION') {
          this.playShamisenPluck(IN_SCALE[0] * 0.5, 0.14);
        } else if (this.mode === 'HACK') {
          this.playTerminalBlip(false);
        }
      }
    }
  }

  canSpawnVoice() {
    return this.unlocked && this.ctx && this.ctx.state === 'running' && this.activeVoices < this.maxVoices;
  }

  /**
   * Synthesize a breathy shakuhachi flute phrase (2-3 notes in the In scale).
   */
  playShakuhachiPhrase() {
    if (!this.canSpawnVoice()) return;
    const notes = [IN_SCALE[0], IN_SCALE[2], IN_SCALE[1]];
    notes.forEach((freq, idx) => {
      this.playShakuhachiNote(freq, idx * 1.45, 1.35);
    });
  }

  playShakuhachiNote(freq, delaySec = 0, durationSec = 1.4) {
    if (!this.canSpawnVoice() || !this.ctx) return;
    try {
      this.activeVoices++;
      const now = this.ctx.currentTime + delaySec;
      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const env = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq * 0.985, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.22);

      // Subtle vibrato
      lfo.frequency.value = 4.6;
      lfoGain.gain.value = 3.2;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      // Slow breathy envelope
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(0.09, now + 0.35);
      env.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = freq * 2.4;

      osc.connect(filter);
      filter.connect(env);
      env.connect(this.reverbNode || this.musicGain);
      env.connect(this.musicGain);

      // Breathy noise layer
      if (this.noiseBuffer) {
        const breath = this.ctx.createBufferSource();
        breath.buffer = this.noiseBuffer;
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = freq * 1.5;
        bp.Q.value = 4.0;
        const bGain = this.ctx.createGain();
        bGain.gain.setValueAtTime(0.0001, now);
        bGain.gain.linearRampToValueAtTime(0.025, now + 0.18);
        bGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec * 0.8);
        breath.connect(bp);
        bp.connect(bGain);
        bGain.connect(env);
        breath.start(now);
        breath.stop(now + durationSec);
      }

      osc.start(now);
      lfo.start(now);
      osc.stop(now + durationSec + 0.05);
      lfo.stop(now + durationSec + 0.05);
      osc.onended = () => {
        this.activeVoices = Math.max(0, this.activeVoices - 1);
      };
    } catch {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    }
  }

  /**
   * Shamisen-like pluck synthesis.
   */
  playShamisenPluck(freq = 293.66, volume = 0.18) {
    if (!this.canSpawnVoice() || !this.ctx) return;
    try {
      this.activeVoices++;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const env = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 6, now);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.1, now + 0.25);

      env.gain.setValueAtTime(volume, now);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(filter);
      filter.connect(env);
      env.connect(this.sfxGain);
      if (this.reverbNode) env.connect(this.reverbNode);

      osc.start(now);
      osc.stop(now + 0.48);
      osc.onended = () => {
        this.activeVoices = Math.max(0, this.activeVoices - 1);
      };
    } catch {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    }
  }

  /**
   * Deep taiko drum strike for major transitions, takedowns, or alerts.
   */
  playTaikoHit(volume = 0.35) {
    if (!this.canSpawnVoice() || !this.ctx) return;
    try {
      this.activeVoices++;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(118, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.38);

      env.gain.setValueAtTime(volume, now);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      osc.connect(env);
      env.connect(this.sfxGain);
      if (this.reverbNode) env.connect(this.reverbNode);

      osc.start(now);
      osc.stop(now + 0.6);
      osc.onended = () => {
        this.activeVoices = Math.max(0, this.activeVoices - 1);
      };
    } catch {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    }
  }

  playHeartbeat() {
    this.playTaikoHit(0.22);
  }

  playFootstep(heavy = false) {
    if (!this.canSpawnVoice() || !this.ctx || !this.noiseBuffer) return;
    try {
      this.activeVoices++;
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = heavy ? 190 : 420 + (Math.random() * 60 - 30);
      filter.Q.value = 2.5;

      const env = this.ctx.createGain();
      const vol = heavy ? 0.16 : 0.05;
      env.gain.setValueAtTime(vol, now);
      env.gain.exponentialRampToValueAtTime(0.0001, now + (heavy ? 0.14 : 0.06));

      src.connect(filter);
      filter.connect(env);
      env.connect(this.sfxGain);

      src.start(now);
      src.stop(now + 0.15);
      src.onended = () => {
        this.activeVoices = Math.max(0, this.activeVoices - 1);
      };
    } catch {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    }
  }

  playJump() {
    this.playFootstep(false);
    this.playShamisenPluck(IN_SCALE[2] * 0.5, 0.07);
  }

  playShadowDissolve(entering = true) {
    const freq = entering ? IN_SCALE[1] : IN_SCALE[0];
    this.playShakuhachiNote(freq, 0, 0.55);
  }

  playTakedown() {
    this.playTaikoHit(0.28);
    this.playShamisenPluck(IN_SCALE[1], 0.14);
  }

  playTerminalBlip(high = false) {
    if (!this.canSpawnVoice() || !this.ctx) return;
    try {
      this.activeVoices++;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(high ? 880 : 587.33, now);
      env.gain.setValueAtTime(0.05, now);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
      osc.connect(env);
      env.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.08);
      osc.onended = () => {
        this.activeVoices = Math.max(0, this.activeVoices - 1);
      };
    } catch {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    }
  }

  playPuzzleSuccess() {
    this.playShamisenPluck(IN_SCALE[2], 0.18);
    this.playShakuhachiNote(IN_SCALE[5], 0.12, 0.9);
  }
}
