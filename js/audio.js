/**
 * Tiny procedural soundscape — no audio files.
 * A low station drone, air movement and soft footsteps, started by the first
 * user gesture so browsers permit playback.
 */
export class Ambience {
  constructor() {
    this.context = null;
    this.master = null;
    this.droneBus = null;
    this.noiseBuffer = null;
    this.started = false;
    this.muted = false;
    this.paused = false;
    this.footstepCounter = 0;
  }

  async start() {
    if (!this.context) this._build();
    if (!this.context) return;
    try {
      await this.context.resume();
      this.started = true;
      this._fadeMaster(this.muted ? 0 : 0.5, 0.8);
    } catch {
      // Audio is optional; the exhibition remains fully functional without it.
    }
  }

  _build() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    this.context = new AudioContext();
    const ctx = this.context;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    this.droneBus = ctx.createGain();
    this.droneBus.gain.value = 0.65;
    this.droneBus.connect(this.master);

    // A very low bed.
    this._oscillator(43.2, "sine", 0.016, 110, this.droneBus);
    this._oscillator(64.8, "triangle", 0.0055, 190, this.droneBus);
    this._oscillator(86.4, "sine", 0.003, 240, this.droneBus);
    this._oscillator(118.5, "sine", 0.0016, 900, this.droneBus);

    this.noiseBuffer = this._makeNoiseBuffer(3);
    const air = ctx.createBufferSource();
    air.buffer = this.noiseBuffer;
    air.loop = true;
    const airFilter = ctx.createBiquadFilter();
    airFilter.type = "lowpass";
    airFilter.frequency.value = 280;
    const airGain = ctx.createGain();
    airGain.gain.value = 0.008;
    air.connect(airFilter).connect(airGain).connect(this.droneBus);
    air.start();

    // Very slow amplitude movement so the room never feels completely static.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.055;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.22;
    lfo.connect(lfoGain).connect(this.droneBus.gain);
    lfo.start();
  }

  _oscillator(frequency, type, gainValue, cutoff, destination) {
    const ctx = this.context;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    filter.Q.value = 0.6;
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    osc.connect(filter).connect(gain).connect(destination);
    osc.start();
  }

  _makeNoiseBuffer(seconds) {
    const ctx = this.context;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = 0.985 * last + 0.015 * white;
      data[i] = last * 4.5;
    }
    return buffer;
  }

  _fadeMaster(value, duration = 0.3) {
    if (!this.master) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(value, now + duration);
  }

  footstep({ speed = 2.5, sprinting = false } = {}) {
    if (!this.started || this.muted || this.paused) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.playbackRate.value = 0.7 + Math.random() * 0.25;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = sprinting ? 280 : 190 + Math.random() * 45;
    filter.Q.value = 0.9;

    const gain = ctx.createGain();
    const level = (sprinting ? 0.045 : 0.03) * Math.min(1.4, speed / 2.2);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
    source.stop(now + 0.22);

    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.frequency.setValueAtTime(72, now);
    thud.frequency.exponentialRampToValueAtTime(46, now + 0.08);
    thudGain.gain.setValueAtTime(0.018, now);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    thud.connect(thudGain).connect(this.master);
    thud.start(now);
    thud.stop(now + 0.13);
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.started) return;
    this._fadeMaster(muted ? 0 : 0.5, 0.35);
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setPaused(paused) {
    this.paused = paused;
    if (!this.started) return;
    this._fadeMaster(this.muted ? 0 : paused ? 0.18 : 0.5, 0.7);
  }
}
