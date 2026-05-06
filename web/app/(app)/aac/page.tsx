'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../../lib/utils';

type Symbol = { id: string; label: string; emoji: string; phrase?: string };
type Category = {
  id: string;
  label: string;
  emoji: string;
  tone: 'sage' | 'coral' | 'mist' | 'lavender';
  symbols: Symbol[];
};

// PECS-style symbol set. Phrases are the full sentence spoken aloud.
const CATEGORIES: Category[] = [
  {
    id: 'feelings',
    label: 'Feelings',
    emoji: '💛',
    tone: 'coral',
    symbols: [
      { id: 'happy', emoji: '😊', label: 'Happy', phrase: 'I feel happy' },
      { id: 'sad', emoji: '😢', label: 'Sad', phrase: 'I feel sad' },
      { id: 'angry', emoji: '😡', label: 'Angry', phrase: 'I feel angry' },
      { id: 'tired', emoji: '😴', label: 'Tired', phrase: 'I am tired' },
      { id: 'scared', emoji: '😨', label: 'Scared', phrase: 'I feel scared' },
      { id: 'excited', emoji: '🤩', label: 'Excited', phrase: 'I am excited' },
      { id: 'calm', emoji: '😌', label: 'Calm', phrase: 'I feel calm' },
      { id: 'sick', emoji: '🤒', label: 'Sick', phrase: 'I do not feel well' },
    ],
  },
  {
    id: 'needs',
    label: 'I want',
    emoji: '🙏',
    tone: 'sage',
    symbols: [
      { id: 'help', emoji: '🆘', label: 'Help', phrase: 'I need help' },
      { id: 'break', emoji: '⏸️', label: 'Break', phrase: 'I need a break' },
      { id: 'water', emoji: '💧', label: 'Water', phrase: 'I want some water' },
      { id: 'food', emoji: '🍽️', label: 'Food', phrase: 'I am hungry' },
      { id: 'toilet', emoji: '🚽', label: 'Toilet', phrase: 'I need the toilet' },
      { id: 'hug', emoji: '🤗', label: 'Hug', phrase: 'I want a hug' },
      { id: 'quiet', emoji: '🤫', label: 'Quiet', phrase: 'I want it quiet' },
      { id: 'more', emoji: '➕', label: 'More', phrase: 'I want more' },
    ],
  },
  {
    id: 'food',
    label: 'Food',
    emoji: '🍎',
    tone: 'mist',
    symbols: [
      { id: 'rice', emoji: '🍚', label: 'Rice', phrase: 'I would like rice' },
      { id: 'roti', emoji: '🫓', label: 'Roti', phrase: 'I would like roti' },
      { id: 'dal', emoji: '🍲', label: 'Dal', phrase: 'I would like dal' },
      { id: 'fruit', emoji: '🍌', label: 'Fruit', phrase: 'I would like fruit' },
      { id: 'milk', emoji: '🥛', label: 'Milk', phrase: 'I would like milk' },
      { id: 'biscuit', emoji: '🍪', label: 'Biscuit', phrase: 'I would like a biscuit' },
      { id: 'curd', emoji: '🥣', label: 'Curd', phrase: 'I would like curd' },
      { id: 'noodles', emoji: '🍜', label: 'Noodles', phrase: 'I would like noodles' },
    ],
  },
  {
    id: 'places',
    label: 'Places',
    emoji: '🏠',
    tone: 'lavender',
    symbols: [
      { id: 'home', emoji: '🏠', label: 'Home', phrase: 'I want to go home' },
      { id: 'school', emoji: '🏫', label: 'School', phrase: 'I want to go to school' },
      { id: 'park', emoji: '🌳', label: 'Park', phrase: 'I want to go to the park' },
      { id: 'therapy', emoji: '🩺', label: 'Therapy', phrase: 'I have therapy' },
      { id: 'shop', emoji: '🛒', label: 'Shop', phrase: 'I want to go to the shop' },
      { id: 'bed', emoji: '🛏️', label: 'Bed', phrase: 'I want to sleep' },
      { id: 'outside', emoji: '🌞', label: 'Outside', phrase: 'I want to go outside' },
      { id: 'car', emoji: '🚗', label: 'Car', phrase: 'I want the car' },
    ],
  },
  {
    id: 'people',
    label: 'People',
    emoji: '👨‍👩‍👧',
    tone: 'coral',
    symbols: [
      { id: 'amma', emoji: '👩', label: 'Amma', phrase: 'I want Amma' },
      { id: 'appa', emoji: '👨', label: 'Appa', phrase: 'I want Appa' },
      { id: 'didi', emoji: '👧', label: 'Didi', phrase: 'I want Didi' },
      { id: 'bhaiya', emoji: '👦', label: 'Bhaiya', phrase: 'I want Bhaiya' },
      { id: 'teacher', emoji: '🧑‍🏫', label: 'Teacher', phrase: 'I want my teacher' },
      { id: 'friend', emoji: '🧑‍🤝‍🧑', label: 'Friend', phrase: 'I want my friend' },
      { id: 'doctor', emoji: '🧑‍⚕️', label: 'Doctor', phrase: 'I want the doctor' },
      { id: 'me', emoji: '🙋', label: 'Me', phrase: 'me' },
    ],
  },
  {
    id: 'yes-no',
    label: 'Yes / No',
    emoji: '👍',
    tone: 'sage',
    symbols: [
      { id: 'yes', emoji: '✅', label: 'Yes', phrase: 'Yes' },
      { id: 'no', emoji: '❌', label: 'No', phrase: 'No' },
      { id: 'please', emoji: '🙏', label: 'Please', phrase: 'Please' },
      { id: 'thank-you', emoji: '🌸', label: 'Thank you', phrase: 'Thank you' },
      { id: 'i-dont-know', emoji: '🤷', label: "Don't know", phrase: 'I do not know' },
      { id: 'wait', emoji: '⏳', label: 'Wait', phrase: 'Please wait' },
      { id: 'finished', emoji: '🏁', label: 'Finished', phrase: 'I am finished' },
      { id: 'again', emoji: '🔁', label: 'Again', phrase: 'Again please' },
    ],
  },
];

const TONE_CLASSES: Record<Category['tone'], string> = {
  sage: 'bg-sage-50 hover:bg-sage-100 border-sage-200 text-sage-800',
  coral: 'bg-coral-50 hover:bg-coral-100 border-coral-200 text-coral-800',
  mist: 'bg-mist-50 hover:bg-mist-100 border-mist-200 text-mist-800',
  lavender: 'bg-lavender-50 hover:bg-lavender-100 border-lavender-200 text-lavender-800',
};

const TONE_ACTIVE: Record<Category['tone'], string> = {
  sage: 'bg-sage-600 text-cream-50 border-sage-600',
  coral: 'bg-coral-600 text-cream-50 border-coral-600',
  mist: 'bg-mist-600 text-cream-50 border-mist-600',
  lavender: 'bg-lavender-500 text-cream-50 border-lavender-500',
};

export default function AacBoard() {
  const [activeCat, setActiveCat] = useState<string>(CATEGORIES[0].id);
  const [sentence, setSentence] = useState<Symbol[]>([]);
  const [supportsSpeech, setSupportsSpeech] = useState<boolean>(false);

  useEffect(() => {
    setSupportsSpeech(
      typeof window !== 'undefined' && 'speechSynthesis' in window,
    );
  }, []);

  const cat = useMemo(
    () => CATEGORIES.find((c) => c.id === activeCat) ?? CATEGORIES[0],
    [activeCat],
  );

  function speak(text: string) {
    if (!supportsSpeech || !text) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.9;
    utter.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  function tap(s: Symbol) {
    setSentence((prev) => [...prev, s]);
    speak(s.phrase || s.label);
  }

  function speakSentence() {
    if (sentence.length === 0) return;
    const text = sentence.map((s) => s.phrase || s.label).join(', ');
    speak(text);
  }

  function clearSentence() {
    setSentence([]);
    if (supportsSpeech) window.speechSynthesis.cancel();
  }

  function pop() {
    setSentence((prev) => prev.slice(0, -1));
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sage-500 text-sm uppercase tracking-wider">AAC</p>
        <h1 className="font-display text-4xl sm:text-5xl text-sage-900 mt-2">
          Communication board
        </h1>
        <p className="mt-3 text-sage-600 max-w-2xl leading-relaxed">
          A simple picture-based way to communicate. Tap a symbol to speak it aloud,
          string symbols together to build a sentence. Designed for quick use at home,
          in school, or on the go.
        </p>
        {!supportsSpeech && (
          <p className="mt-3 text-sm text-coral-700 bg-coral-50 border border-coral-200 rounded-xl px-4 py-2 inline-block">
            Voice output isn't available in this browser — symbols still work as a board.
          </p>
        )}
      </header>

      {/* Sentence strip */}
      <section
        aria-label="Sentence builder"
        className="card bg-cream-100 border-cream-200"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl text-sage-900">Sentence</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={pop}
              disabled={sentence.length === 0}
              className="btn-ghost text-sm disabled:opacity-40"
            >
              ← Undo
            </button>
            <button
              type="button"
              onClick={clearSentence}
              disabled={sentence.length === 0}
              className="btn-ghost text-sm disabled:opacity-40"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={speakSentence}
              disabled={!supportsSpeech || sentence.length === 0}
              className="btn-primary text-sm disabled:opacity-40"
            >
              ▶ Speak all
            </button>
          </div>
        </div>
        {sentence.length === 0 ? (
          <p className="text-sage-500 italic py-4">
            Pick symbols below to build a sentence.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 py-2">
            {sentence.map((s, i) => (
              <span
                key={`${s.id}-${i}`}
                className="inline-flex items-center gap-2 bg-white rounded-2xl border border-sage-200 px-4 py-2 shadow-soft"
              >
                <span className="text-2xl">{s.emoji}</span>
                <span className="font-medium text-sage-800">{s.label}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Category pills */}
      <nav aria-label="Categories" className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const active = c.id === activeCat;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCat(c.id)}
              aria-pressed={active}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 border-2 font-medium transition-all',
                active ? TONE_ACTIVE[c.tone] : TONE_CLASSES[c.tone],
              )}
            >
              <span className="text-xl" aria-hidden="true">{c.emoji}</span>
              {c.label}
            </button>
          );
        })}
      </nav>

      {/* Symbols grid */}
      <section aria-label={`${cat.label} symbols`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {cat.symbols.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => tap(s)}
              className={cn(
                'rounded-3xl border-2 p-4 sm:p-5 flex flex-col items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]',
                TONE_CLASSES[cat.tone],
              )}
            >
              <span className="text-5xl sm:text-6xl" aria-hidden="true">
                {s.emoji}
              </span>
              <span className="font-medium text-base sm:text-lg">{s.label}</span>
            </button>
          ))}
        </div>
      </section>

      <p className="text-xs text-sage-500 italic max-w-2xl">
        Note: this is a starter board. Real AAC programmes (PECS, TouchChat, Avaz)
        are individualized for each child by a speech-language therapist.
      </p>
    </div>
  );
}
