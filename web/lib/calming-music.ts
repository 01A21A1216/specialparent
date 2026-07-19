// In-app calming soundscape engine — no network, no YouTube, no licensing.
// Everything below runs entirely in the browser's Web Audio API so audio
// stays inside the app. Trade-off: these are synthesized soundscapes, not
// real songs. For calming purposes that's often the point — steady noise
// and slow drones regulate faster than lyric-carrying music.
//
// Recipe types:
//   • noise   — filtered white/pink/brown noise + optional modulation
//   • drone   — one or more sine oscillators
//   • binaural — two oscillators, panned L / R, small Δf → perceived beat
//   • pulse   — periodic short bursts (heartbeat, chime)
//
// Every recipe returns a `stop()` function; the player calls it when the
// user hits pause or picks a different track.

export type SoundCategory =
  | 'noise'
  | 'nature'
  | 'drone'
  | 'binaural'
  | 'ambient'
  | 'rhythm';

interface CommonRecipe {
  gain?: number; // overall track volume 0..1 (default 0.4)
}

export type SoundRecipe =
  | (CommonRecipe & {
      type: 'noise';
      color: 'white' | 'pink' | 'brown';
      lowpass?: number;
      highpass?: number;
      bandpass?: { center: number; q: number };
      amLfoHz?: number; // amplitude-modulation LFO for ocean-like swells
      amDepth?: number;
    })
  | (CommonRecipe & {
      type: 'drone';
      // Chord: pass multiple frequencies. Single-note drones just pass one.
      freqs: number[];
      waveform?: OscillatorType;
    })
  | (CommonRecipe & {
      type: 'binaural';
      baseHz: number;
      deltaHz: number; // right ear is baseHz + deltaHz
    })
  | (CommonRecipe & {
      type: 'pulse';
      intervalMs: number;
      // Each pulse is a short sine burst with a fast envelope.
      pulseHz: number;
      decayMs: number;
    });

export interface CalmingTrack {
  id: string;
  title: string;
  description: string;
  category: SoundCategory;
  emoji: string;
  recipe: SoundRecipe;
}

export const CATEGORY_META: Record<
  SoundCategory,
  { label: string; emoji: string; blurb: string }
> = {
  noise: {
    label: 'Noise',
    emoji: '🌫️',
    blurb: 'White, pink, brown — steady low-info sounds many autistic + ADHD listeners settle to.',
  },
  nature: {
    label: 'Nature',
    emoji: '🌿',
    blurb: 'Filtered noise shaped like rain, ocean, wind, stream.',
  },
  drone: {
    label: 'Drone / Om',
    emoji: '🕉️',
    blurb: 'Pure sine tones — Om, Solfeggio frequencies, low grounding drones.',
  },
  binaural: {
    label: 'Binaural beats',
    emoji: '🎧',
    blurb: 'Two close frequencies, one per ear — headphones recommended.',
  },
  ambient: {
    label: 'Ambient chords',
    emoji: '🌌',
    blurb: 'Slow major or minor chord pads.',
  },
  rhythm: {
    label: 'Rhythm',
    emoji: '💗',
    blurb: 'Regular pulses — heartbeat, meditation bell.',
  },
};

export const CALMING_MUSIC: CalmingTrack[] = [
  // ── Noise (3)
  { id: 'white', title: 'White noise', emoji: '🌫️', category: 'noise', description: 'Even across all frequencies — familiar TV-static warmth.', recipe: { type: 'noise', color: 'white', gain: 0.25 } },
  { id: 'pink', title: 'Pink noise', emoji: '🌸', category: 'noise', description: '1/f attenuation — smoother than white, less hiss.', recipe: { type: 'noise', color: 'pink', gain: 0.35 } },
  { id: 'brown', title: 'Brown noise', emoji: '🟤', category: 'noise', description: 'Very low, ocean-like rumble — many find it the most calming.', recipe: { type: 'noise', color: 'brown', gain: 0.5 } },

  // ── Nature (5) — filtered noise variants
  { id: 'rain', title: 'Soft rain', emoji: '🌧️', category: 'nature', description: 'Steady rainfall — band-pass filtered pink noise.', recipe: { type: 'noise', color: 'pink', bandpass: { center: 1000, q: 0.6 }, gain: 0.45 } },
  { id: 'ocean', title: 'Ocean waves', emoji: '🌊', category: 'nature', description: 'Slow rolling swells — brown noise with a breath-rhythm amplitude wave.', recipe: { type: 'noise', color: 'brown', amLfoHz: 0.12, amDepth: 0.6, gain: 0.55 } },
  { id: 'wind', title: 'Gentle wind', emoji: '🍃', category: 'nature', description: 'Distant wind through trees — deep low-pass on pink noise.', recipe: { type: 'noise', color: 'pink', lowpass: 400, amLfoHz: 0.2, amDepth: 0.4, gain: 0.4 } },
  { id: 'stream', title: 'Mountain stream', emoji: '💧', category: 'nature', description: 'Running water — high-pass filtered pink noise.', recipe: { type: 'noise', color: 'pink', highpass: 1200, gain: 0.3 } },
  { id: 'fireplace', title: 'Fireplace', emoji: '🔥', category: 'nature', description: 'Low warm crackle — band-pass filtered brown noise.', recipe: { type: 'noise', color: 'brown', bandpass: { center: 500, q: 0.4 }, gain: 0.5 } },

  // ── Drone (5) — Om + Solfeggio + grounding drones
  { id: 'om', title: 'Om (136.1 Hz)', emoji: '🕉️', category: 'drone', description: 'Traditional Om frequency — sine + one soft overtone.', recipe: { type: 'drone', freqs: [136.1, 272.2], gain: 0.15 } },
  { id: 'freq432', title: '432 Hz drone', emoji: '🎵', category: 'drone', description: 'A single sine at 432 Hz — often called the "natural" tuning.', recipe: { type: 'drone', freqs: [432], gain: 0.12 } },
  { id: 'freq528', title: '528 Hz drone', emoji: '💚', category: 'drone', description: 'The Solfeggio "love" frequency.', recipe: { type: 'drone', freqs: [528], gain: 0.1 } },
  { id: 'deep-drone', title: 'Deep drone (60 Hz)', emoji: '🌑', category: 'drone', description: 'Very low sub-bass sine — grounding, best on speakers with real bass.', recipe: { type: 'drone', freqs: [60, 120], gain: 0.4 } },
  { id: 'monk-triad', title: 'Monk triad', emoji: '⛰️', category: 'drone', description: 'Three low sines a fifth apart — feels like a distant choir.', recipe: { type: 'drone', freqs: [110, 165, 220], gain: 0.1 } },

  // ── Binaural (3)
  { id: 'binaural-alpha', title: 'Alpha waves (10 Hz)', emoji: '🎧', category: 'binaural', description: '10 Hz beat under a 220 Hz tone — associated with relaxed focus. Use headphones.', recipe: { type: 'binaural', baseHz: 220, deltaHz: 10, gain: 0.15 } },
  { id: 'binaural-theta', title: 'Theta waves (6 Hz)', emoji: '🌙', category: 'binaural', description: '6 Hz beat — associated with deep relaxation and pre-sleep.', recipe: { type: 'binaural', baseHz: 210, deltaHz: 6, gain: 0.15 } },
  { id: 'binaural-delta', title: 'Delta waves (2 Hz)', emoji: '😴', category: 'binaural', description: '2 Hz beat — the frequency band of deep sleep. Use headphones.', recipe: { type: 'binaural', baseHz: 200, deltaHz: 2, gain: 0.15 } },

  // ── Ambient chords (2)
  { id: 'chord-fmaj', title: 'F major pad', emoji: '🌸', category: 'ambient', description: 'F–A–C softly sustained — warm and open.', recipe: { type: 'drone', freqs: [174.61, 220, 261.63], waveform: 'sine', gain: 0.1 } },
  { id: 'chord-cmin', title: 'C minor pad', emoji: '🌌', category: 'ambient', description: 'C–Eb–G softly sustained — deeper, more introspective.', recipe: { type: 'drone', freqs: [130.81, 155.56, 196], waveform: 'sine', gain: 0.1 } },

  // ── Rhythm (2)
  { id: 'heartbeat', title: 'Heartbeat (60 bpm)', emoji: '💗', category: 'rhythm', description: 'A steady low pulse at resting-heart-rate pace.', recipe: { type: 'pulse', intervalMs: 1000, pulseHz: 60, decayMs: 200, gain: 0.5 } },
  { id: 'meditation-bell', title: 'Meditation bell', emoji: '🔔', category: 'rhythm', description: 'A soft bell tone every 60 seconds — good for guided breath work.', recipe: { type: 'pulse', intervalMs: 60_000, pulseHz: 500, decayMs: 2500, gain: 0.35 } },
];

// ── Sound engine ───────────────────────────────────────────────────────────

// Reused singleton — the browser limits how many AudioContexts a page can
// open. Created lazily on first user gesture (required by autoplay policy).
let ctx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (typeof window === 'undefined') throw new Error('Audio needs a browser');
  if (!ctx) {
    ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Returns a stop() function. Multiple simultaneous tracks are allowed —
// the player disposes the previous one before starting the next.
export function playRecipe(
  recipe: SoundRecipe,
  masterGain = 1,
): { stop: () => void } {
  const audio = getCtx();
  const nodes: (AudioNode | AudioScheduledSourceNode)[] = [];
  const master = audio.createGain();
  master.gain.value = (recipe.gain ?? 0.4) * masterGain;
  master.connect(audio.destination);
  nodes.push(master);

  let intervalId: ReturnType<typeof setInterval> | null = null;

  switch (recipe.type) {
    case 'noise': {
      const src = createNoiseSource(audio, recipe.color);
      let out: AudioNode = src;
      if (recipe.lowpass) out = chainFilter(audio, out, 'lowpass', recipe.lowpass, 1, nodes);
      if (recipe.highpass) out = chainFilter(audio, out, 'highpass', recipe.highpass, 1, nodes);
      if (recipe.bandpass) out = chainFilter(audio, out, 'bandpass', recipe.bandpass.center, recipe.bandpass.q, nodes);
      if (recipe.amLfoHz) {
        // Amplitude modulation for ocean-like swells: LFO drives a gain node.
        const swell = audio.createGain();
        swell.gain.value = 1 - (recipe.amDepth ?? 0.5) / 2;
        const lfo = audio.createOscillator();
        lfo.frequency.value = recipe.amLfoHz;
        const lfoGain = audio.createGain();
        lfoGain.gain.value = (recipe.amDepth ?? 0.5) / 2;
        lfo.connect(lfoGain).connect(swell.gain);
        lfo.start();
        out.connect(swell);
        out = swell;
        nodes.push(lfo, lfoGain, swell);
      }
      out.connect(master);
      src.start();
      nodes.push(src);
      break;
    }
    case 'drone': {
      for (const f of recipe.freqs) {
        const osc = audio.createOscillator();
        osc.type = recipe.waveform ?? 'sine';
        osc.frequency.value = f;
        // Individual gain so a chord doesn't clip when the master sums.
        const g = audio.createGain();
        g.gain.value = 1 / Math.max(1, recipe.freqs.length);
        osc.connect(g).connect(master);
        osc.start();
        nodes.push(osc, g);
      }
      break;
    }
    case 'binaural': {
      const merger = audio.createChannelMerger(2);
      const oscL = audio.createOscillator();
      const oscR = audio.createOscillator();
      oscL.frequency.value = recipe.baseHz;
      oscR.frequency.value = recipe.baseHz + recipe.deltaHz;
      const gL = audio.createGain();
      const gR = audio.createGain();
      gL.gain.value = 0.5;
      gR.gain.value = 0.5;
      oscL.connect(gL).connect(merger, 0, 0);
      oscR.connect(gR).connect(merger, 0, 1);
      merger.connect(master);
      oscL.start();
      oscR.start();
      nodes.push(oscL, oscR, gL, gR, merger);
      break;
    }
    case 'pulse': {
      const fire = () => {
        const osc = audio.createOscillator();
        const g = audio.createGain();
        osc.type = 'sine';
        osc.frequency.value = recipe.pulseHz;
        const now = audio.currentTime;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(1, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, now + recipe.decayMs / 1000);
        osc.connect(g).connect(master);
        osc.start(now);
        osc.stop(now + recipe.decayMs / 1000 + 0.05);
      };
      fire();
      intervalId = setInterval(fire, recipe.intervalMs);
      break;
    }
  }

  return {
    stop() {
      if (intervalId) clearInterval(intervalId);
      for (const n of nodes) {
        try {
          if ('stop' in n && typeof (n as AudioScheduledSourceNode).stop === 'function') {
            (n as AudioScheduledSourceNode).stop();
          }
        } catch {
          /* already stopped */
        }
        try {
          n.disconnect();
        } catch {
          /* already disconnected */
        }
      }
    },
  };
}

// ── Helpers ──

function chainFilter(
  ctx: AudioContext,
  input: AudioNode,
  type: BiquadFilterType,
  freq: number,
  q: number,
  nodes: AudioNode[],
): AudioNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  input.connect(f);
  nodes.push(f);
  return f;
}

/**
 * Generate a looping noise buffer of the given color and return an
 * AudioBufferSourceNode ready to `.start()`. The buffer is 2s long and
 * loops seamlessly — cheaper than creating an AudioWorklet for each track
 * and imperceptible for calming use.
 */
function createNoiseSource(
  ctx: AudioContext,
  color: 'white' | 'pink' | 'brown',
): AudioBufferSourceNode {
  const seconds = 2;
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  if (color === 'white') {
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  } else if (color === 'pink') {
    // Voss-McCartney algorithm — good approximation, cheap.
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  } else {
    // Brown noise = integrated white with soft leak.
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
}
