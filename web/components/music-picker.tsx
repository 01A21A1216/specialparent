'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CALMING_MUSIC,
  CATEGORY_META,
  playRecipe,
  type CalmingTrack,
  type SoundCategory,
} from '../lib/calming-music';

// In-app calming music player. Sound is synthesized locally via Web Audio
// API (see calming-music.ts) — no network calls, no YouTube, no leaving
// the app. One track plays at a time; selecting a new one stops the
// current one first.
//
// Optional auto-stop timer: 5 / 15 / 30 min so the player doesn't run all
// night by accident.

const CATEGORY_ORDER: SoundCategory[] = [
  'noise',
  'nature',
  'drone',
  'binaural',
  'ambient',
  'rhythm',
];
const TIMER_OPTIONS = [
  { label: 'No timer', mins: 0 },
  { label: '5 min', mins: 5 },
  { label: '15 min', mins: 15 },
  { label: '30 min', mins: 30 },
];

export function MusicPicker({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState<SoundCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.6);
  const [timerMins, setTimerMins] = useState(0);

  // Stable handle to the currently-playing recipe so we can stop it when
  // another one is picked or the modal closes.
  const activeRef = useRef<{ stop: () => void } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopAll() {
    if (activeRef.current) {
      activeRef.current.stop();
      activeRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setPlayingId(null);
  }

  function togglePlay(track: CalmingTrack) {
    if (playingId === track.id) {
      stopAll();
      return;
    }
    stopAll();
    activeRef.current = playRecipe(track.recipe, volume);
    setPlayingId(track.id);
    if (timerMins > 0) {
      timeoutRef.current = setTimeout(stopAll, timerMins * 60 * 1000);
    }
  }

  // Live-adjust master volume by restarting the current track at the new
  // level. Web Audio doesn't expose master volume without holding a
  // reference chain; restarting is simpler and imperceptible for these
  // long-form sounds.
  useEffect(() => {
    if (!playingId) return;
    const track = CALMING_MUSIC.find((t) => t.id === playingId);
    if (!track) return;
    if (activeRef.current) activeRef.current.stop();
    activeRef.current = playRecipe(track.recipe, volume);
    // Intentionally no cleanup: the outer stopAll handles disposal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume]);

  // Always cut audio when the modal unmounts — don't leave music running
  // in a hidden component.
  useEffect(() => {
    return () => stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CALMING_MUSIC.filter((t) => {
      if (category !== 'all' && t.category !== category) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    });
  }, [category, query]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Calming music library"
    >
      <div
        className="bg-cream-50 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 pt-5 pb-4 border-b border-sage-100">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="font-display text-2xl text-sage-900">
                🎵 Calming music
              </h2>
              <p className="text-sm text-sage-500 mt-1">
                Synthesized locally — plays right here, no ads, no network.
                Use headphones for binaural beats.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-sage-500 hover:text-sage-900 text-2xl leading-none px-2"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={`chip text-xs ${
                category === 'all'
                  ? 'bg-sage-600 text-cream-50'
                  : 'bg-cream-100 text-sage-700 hover:bg-sage-100'
              }`}
            >
              All ({CALMING_MUSIC.length})
            </button>
            {CATEGORY_ORDER.map((c) => {
              const count = CALMING_MUSIC.filter((t) => t.category === c).length;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`chip text-xs ${
                    category === c
                      ? 'bg-sage-600 text-cream-50'
                      : 'bg-cream-100 text-sage-700 hover:bg-sage-100'
                  }`}
                >
                  {CATEGORY_META[c].emoji} {CATEGORY_META[c].label} ({count})
                </button>
              );
            })}
          </div>

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="input mt-3"
          />

          <div className="mt-3 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <span className="text-sm text-sage-600" aria-hidden>🔈</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1"
                aria-label="Volume"
              />
              <span className="text-sm text-sage-600" aria-hidden>🔊</span>
              <span className="text-xs tabular-nums text-sage-500 w-9 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-sage-500 mr-1">Auto-stop:</span>
              {TIMER_OPTIONS.map((opt) => (
                <button
                  key={opt.mins}
                  type="button"
                  onClick={() => setTimerMins(opt.mins)}
                  className={`chip text-xs ${
                    timerMins === opt.mins
                      ? 'bg-sage-600 text-cream-50'
                      : 'bg-cream-100 text-sage-700 hover:bg-sage-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {category !== 'all' && (
            <p className="text-xs text-sage-500 italic mb-3">
              {CATEGORY_META[category].blurb}
            </p>
          )}
          {filtered.length === 0 ? (
            <p className="text-sage-500 text-sm text-center py-10">
              Nothing matches that search.
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  isPlaying={playingId === track.id}
                  onToggle={() => togglePlay(track)}
                />
              ))}
            </ul>
          )}
        </div>

        {playingId && (
          <div className="border-t border-sage-100 bg-sage-50 px-6 py-3 flex items-center justify-between">
            <div className="text-sm text-sage-700 truncate">
              <span className="text-lg mr-2" aria-hidden>
                {CALMING_MUSIC.find((t) => t.id === playingId)?.emoji}
              </span>
              Playing:{' '}
              <strong className="text-sage-900">
                {CALMING_MUSIC.find((t) => t.id === playingId)?.title}
              </strong>
              {timerMins > 0 && (
                <span className="text-sage-500"> · stops in {timerMins} min</span>
              )}
            </div>
            <button
              type="button"
              onClick={stopAll}
              className="btn-ghost text-sm"
              aria-label="Stop playback"
            >
              ⏹ Stop
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TrackRow({
  track,
  isPlaying,
  onToggle,
}: {
  track: CalmingTrack;
  isPlaying: boolean;
  onToggle: () => void;
}) {
  const meta = CATEGORY_META[track.category];
  return (
    <li
      className={`rounded-2xl border p-3 flex items-center gap-3 transition-colors ${
        isPlaying
          ? 'border-coral-300 bg-coral-50'
          : 'border-sage-100 hover:border-coral-200 hover:bg-cream-50'
      }`}
    >
      <div className="text-2xl w-10 h-10 rounded-xl bg-cream-100 grid place-items-center flex-shrink-0" aria-hidden>
        {track.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sage-900 truncate">{track.title}</div>
        <div className="text-xs text-sage-500">{meta.label}</div>
        <p className="text-sm text-sage-700 mt-1">{track.description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`text-sm flex-shrink-0 flex items-center gap-1 rounded-full px-4 py-2 transition-colors ${
          isPlaying
            ? 'bg-coral-500 text-white hover:bg-coral-600'
            : 'bg-sage-600 text-cream-50 hover:bg-sage-700'
        }`}
        aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
        aria-pressed={isPlaying}
      >
        {isPlaying ? '⏸ Pause' : '▶ Play'}
      </button>
    </li>
  );
}
