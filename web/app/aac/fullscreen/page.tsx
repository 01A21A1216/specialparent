'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AAC_CATEGORIES, type AacSymbol } from '../../../lib/aac-data';

// Zero-chrome fullscreen AAC board. Reachable from:
//   • the manifest shortcut (installed PWA long-press → AAC full-screen)
//   • the /aac page's "Full-screen mode" button
// No sidebar, no header — just categories on the left, symbols on the
// right, and a sentence strip on top. Designed for handing the device to
// a non-verbal child in a public setting.

const TONE_ACTIVE: Record<string, string> = {
  sage: 'bg-sage-600 text-cream-50',
  coral: 'bg-coral-600 text-cream-50',
  mist: 'bg-mist-600 text-cream-50',
  lavender: 'bg-lavender-500 text-cream-50',
};

const TONE_IDLE: Record<string, string> = {
  sage: 'bg-sage-50 hover:bg-sage-100 text-sage-800',
  coral: 'bg-coral-50 hover:bg-coral-100 text-coral-800',
  mist: 'bg-mist-50 hover:bg-mist-100 text-mist-800',
  lavender: 'bg-lavender-50 hover:bg-lavender-100 text-lavender-500',
};

export default function AacFullscreenPage() {
  const [activeCat, setActiveCat] = useState(AAC_CATEGORIES[0].id);
  const [sentence, setSentence] = useState<AacSymbol[]>([]);
  const [supportsSpeech, setSupportsSpeech] = useState(false);
  const category = useMemo(
    () => AAC_CATEGORIES.find((c) => c.id === activeCat) ?? AAC_CATEGORIES[0],
    [activeCat],
  );

  useEffect(() => {
    setSupportsSpeech(typeof window !== 'undefined' && 'speechSynthesis' in window);
    // Ask the browser for real fullscreen once the user has interacted at
    // least once — Firefox / Safari reject fullscreen without a gesture.
    // We attach a one-shot listener that fires on first tap.
    const arm = () => {
      document.documentElement.requestFullscreen?.().catch(() => {});
      document.removeEventListener('pointerdown', arm);
    };
    document.addEventListener('pointerdown', arm, { once: true });
    return () => document.removeEventListener('pointerdown', arm);
  }, []);

  function say(text: string) {
    if (!supportsSpeech || !text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  function tap(s: AacSymbol) {
    say(s.phrase ?? s.label);
    setSentence((cur) => [...cur, s]);
  }

  function speakSentence() {
    if (sentence.length === 0) return;
    say(sentence.map((s) => s.phrase ?? s.label).join('. '));
  }

  return (
    <div className="fixed inset-0 bg-cream-50 text-sage-900 flex flex-col select-none">
      {/* Sentence strip */}
      <header className="border-b border-sage-100 px-4 py-3 flex items-center gap-3">
        <Link
          href="/aac"
          className="w-11 h-11 rounded-full grid place-items-center text-2xl text-sage-500 hover:bg-sage-100"
          title="Exit fullscreen"
          aria-label="Exit fullscreen"
        >
          ×
        </Link>
        <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto py-1">
          {sentence.length === 0 ? (
            <span className="text-sage-400 text-sm">Tap a picture below…</span>
          ) : (
            sentence.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSentence((cur) => cur.filter((_, j) => j !== i))}
                className="flex-shrink-0 chip bg-white border border-sage-200 flex items-center gap-1 text-sm"
                title="Tap to remove"
              >
                <span className="text-lg">{s.emoji}</span>
                {s.label}
              </button>
            ))
          )}
        </div>
        {sentence.length > 0 && (
          <>
            <button
              type="button"
              onClick={speakSentence}
              disabled={!supportsSpeech}
              className="btn-primary text-sm disabled:opacity-60"
            >
              🔊 Speak
            </button>
            <button
              type="button"
              onClick={() => setSentence([])}
              className="btn-ghost text-sm"
            >
              Clear
            </button>
          </>
        )}
      </header>

      <div className="flex-1 grid grid-cols-[140px_1fr] lg:grid-cols-[200px_1fr] min-h-0">
        {/* Category rail */}
        <nav className="border-r border-sage-100 overflow-y-auto p-2 space-y-2 bg-white/50">
          {AAC_CATEGORIES.map((c) => {
            const active = c.id === activeCat;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCat(c.id)}
                className={`w-full rounded-2xl p-3 text-left transition-colors ${
                  active ? TONE_ACTIVE[c.tone] : TONE_IDLE[c.tone]
                }`}
              >
                <div className="text-3xl leading-none">{c.emoji}</div>
                <div className="text-sm font-medium mt-1.5">{c.label}</div>
              </button>
            );
          })}
        </nav>

        {/* Symbol grid */}
        <div className="overflow-y-auto p-3 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {category.symbols.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => tap(s)}
                className={`rounded-3xl p-4 sm:p-5 flex flex-col items-center gap-2 transition-transform active:scale-95 ${TONE_IDLE[category.tone]}`}
              >
                <span className="text-5xl sm:text-6xl">{s.emoji}</span>
                <span className="text-sm sm:text-base font-medium">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
