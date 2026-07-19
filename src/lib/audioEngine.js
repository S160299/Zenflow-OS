// Module-level Web Audio engine.
// Lives outside React so soundscapes keep playing when components unmount
// (switching apps / view modes), and so the whole app shares ONE AudioContext
// instead of leaking a new one per UI chime.

import { loadJSON, saveJSON } from './storage';

export const SOUND_DEFS = [
  { id: 'rain', name: 'Procedural Rain', color: '#00f2fe' },
  { id: 'drone', name: 'Binaural Drone', color: '#b336ff' },
  { id: 'space', name: 'Cosmic Pad', color: '#ffd644' },
  { id: 'lofi', name: 'Ambient Chords', color: '#ff2a7f' },
  { id: 'ocean', name: 'Ocean Waves', color: '#05ffa1' },
  { id: 'wind', name: 'Highland Wind', color: '#8ab6ff' },
];

const MIX_KEY = 'zenflow_sound_mix_v1';
const PRESETS_KEY = 'zenflow_sound_presets_v1';

const savedMix = loadJSON(MIX_KEY, null);

const state = {
  master: savedMix?.master ?? 0.8,
  // Active flags always start false: browsers block audio without a user gesture.
  tracks: Object.fromEntries(
    SOUND_DEFS.map((s) => [
      s.id,
      { volume: savedMix?.tracks?.[s.id]?.volume ?? 0.4, active: false },
    ])
  ),
};

let ctx = null;
let masterGain = null;
const nodes = {}; // id -> { stop(), gain, analyser }
let listeners = [];

function emit() {
  const snapshot = getState();
  listeners.forEach((cb) => cb(snapshot));
}

function persistMix() {
  saveJSON(MIX_KEY, {
    master: state.master,
    tracks: Object.fromEntries(
      Object.entries(state.tracks).map(([id, t]) => [id, { volume: t.volume }])
    ),
  });
}

function ensureContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = state.master;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Noise helpers                                                       */
/* ------------------------------------------------------------------ */

function pinkNoiseBuffer(c) {
  const bufferSize = 2 * c.sampleRate;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const output = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
}

function whiteNoiseBuffer(c) {
  const bufferSize = 2 * c.sampleRate;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const output = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
  return buffer;
}

function loopedNoise(c, buffer) {
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

/* ------------------------------------------------------------------ */
/* Track synth builders — each returns { stop() } and connects to dest */
/* ------------------------------------------------------------------ */

const builders = {
  rain(c, dest) {
    const src = loopedNoise(c, pinkNoiseBuffer(c));
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 650;
    src.connect(filter).connect(dest);
    src.start(0);
    return { stop: () => src.stop() };
  },

  drone(c, dest) {
    // Binaural beat: 110 Hz left / 110.6 Hz right
    const osc1 = c.createOscillator();
    const osc2 = c.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 110;
    osc2.type = 'sine';
    osc2.frequency.value = 110.6;
    if (c.createStereoPanner) {
      const p1 = c.createStereoPanner();
      const p2 = c.createStereoPanner();
      p1.pan.value = -0.8;
      p2.pan.value = 0.8;
      osc1.connect(p1).connect(dest);
      osc2.connect(p2).connect(dest);
    } else {
      osc1.connect(dest);
      osc2.connect(dest);
    }
    osc1.start(0);
    osc2.start(0);
    return { stop: () => { osc1.stop(); osc2.stop(); } };
  },

  space(c, dest) {
    // Slow FM pad
    const carrier = c.createOscillator();
    const modulator = c.createOscillator();
    const modGain = c.createGain();
    carrier.type = 'triangle';
    carrier.frequency.value = 150;
    modulator.type = 'sine';
    modulator.frequency.value = 0.2;
    modGain.gain.value = 15;
    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 250;
    carrier.connect(filter).connect(dest);
    carrier.start(0);
    modulator.start(0);
    return { stop: () => { carrier.stop(); modulator.stop(); } };
  },

  lofi(c, dest) {
    // Gmaj7 pad with breathing note volumes
    const freqs = [196.0, 246.94, 293.66, 369.99];
    const stops = [];
    freqs.forEach((freq, index) => {
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const oscGain = c.createGain();
      oscGain.gain.value = 0.15;
      const lfo = c.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.1 + index * 0.05;
      const lfoGain = c.createGain();
      lfoGain.gain.value = 0.08;
      lfo.connect(lfoGain);
      lfoGain.connect(oscGain.gain);
      osc.connect(oscGain).connect(dest);
      osc.start(0);
      lfo.start(0);
      stops.push(() => { osc.stop(); lfo.stop(); });
    });
    return { stop: () => stops.forEach((s) => s()) };
  },

  ocean(c, dest) {
    // Filtered noise with a slow swell LFO — waves rolling in and out
    const src = loopedNoise(c, pinkNoiseBuffer(c));
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const swell = c.createGain();
    swell.gain.value = 0.55;
    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08; // ~12s per wave
    const lfoGain = c.createGain();
    lfoGain.gain.value = 0.4;
    lfo.connect(lfoGain);
    lfoGain.connect(swell.gain);
    src.connect(filter).connect(swell).connect(dest);
    src.start(0);
    lfo.start(0);
    return { stop: () => { src.stop(); lfo.stop(); } };
  },

  wind(c, dest) {
    // Bandpassed noise whose center frequency wanders — gusting wind
    const src = loopedNoise(c, whiteNoiseBuffer(c));
    const band = c.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 400;
    band.Q.value = 0.7;
    const trim = c.createGain();
    trim.gain.value = 0.5;
    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.11;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain);
    lfoGain.connect(band.frequency);
    src.connect(band).connect(trim).connect(dest);
    src.start(0);
    lfo.start(0);
    return { stop: () => { src.stop(); lfo.stop(); } };
  },
};

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function getState() {
  return {
    master: state.master,
    tracks: Object.fromEntries(
      Object.entries(state.tracks).map(([id, t]) => [id, { ...t }])
    ),
  };
}

export function subscribe(cb) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

export function getAnalyser(id) {
  return nodes[id]?.analyser ?? null;
}

export function isActive(id) {
  return !!state.tracks[id]?.active;
}

export function startTrack(id) {
  const c = ensureContext();
  if (!c || nodes[id] || !builders[id]) return;

  const gain = c.createGain();
  gain.gain.value = state.tracks[id].volume;
  gain.connect(masterGain);

  const analyser = c.createAnalyser();
  analyser.fftSize = 64;
  analyser.connect(gain);

  const synth = builders[id](c, analyser);
  nodes[id] = { ...synth, gain, analyser };
  state.tracks[id].active = true;
  emit();
}

export function stopTrack(id) {
  const node = nodes[id];
  if (node) {
    try { node.stop(); } catch { /* already stopped */ }
    delete nodes[id];
  }
  if (state.tracks[id]) state.tracks[id].active = false;
  emit();
}

export function toggleTrack(id) {
  if (state.tracks[id]?.active) stopTrack(id);
  else startTrack(id);
  return state.tracks[id]?.active;
}

export function setTrackVolume(id, volume) {
  if (!state.tracks[id]) return;
  state.tracks[id].volume = volume;
  const node = nodes[id];
  if (node && ctx) node.gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.1);
  persistMix();
  emit();
}

export function setMasterVolume(volume) {
  state.master = volume;
  if (masterGain && ctx) masterGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.1);
  persistMix();
  emit();
}

/* ---- Presets ------------------------------------------------------ */

export function getPresets() {
  return loadJSON(PRESETS_KEY, {});
}

export function savePreset(name) {
  const presets = getPresets();
  presets[name] = {
    master: state.master,
    tracks: Object.fromEntries(
      Object.entries(state.tracks).map(([id, t]) => [
        id,
        { volume: t.volume, active: t.active },
      ])
    ),
  };
  saveJSON(PRESETS_KEY, presets);
  return presets;
}

export function deletePreset(name) {
  const presets = getPresets();
  delete presets[name];
  saveJSON(PRESETS_KEY, presets);
  return presets;
}

// Must be called from a user gesture (click) so the context can start.
export function applyPreset(name) {
  const preset = getPresets()[name];
  if (!preset) return;
  setMasterVolume(preset.master ?? 0.8);
  SOUND_DEFS.forEach(({ id }) => {
    const t = preset.tracks?.[id];
    if (!t) return;
    setTrackVolume(id, t.volume ?? 0.4);
    if (t.active && !state.tracks[id].active) startTrack(id);
    if (!t.active && state.tracks[id].active) stopTrack(id);
  });
}

/* ---- One-shot UI sounds (shared context — no leaks) ---------------- */

export function playChime() {
  const c = ensureContext();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(587.33, c.currentTime); // D5
  osc.frequency.setValueAtTime(880, c.currentTime + 0.08); // A5
  gain.gain.setValueAtTime(0.06, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.25);
}

export function playCompletionAlert() {
  const c = ensureContext();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523.25, c.currentTime); // C5
  osc.frequency.exponentialRampToValueAtTime(880, c.currentTime + 0.6); // A5
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.005, c.currentTime + 1.0);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 1.0);
}
