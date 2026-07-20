'use client';

import { useState } from 'react';
import { api } from '../../../../../lib/api';
import { cn, formatDateTime } from '../../../../../lib/utils';
import { VoiceNoteRecorder } from '../../../../../components/voice-note-recorder';
import { VoiceNotePlayer } from '../../../../../components/voice-note-player';
import { ChildDetail } from './types';

const MOOD_OPTIONS = [
  { value: 'GREAT', emoji: '🌟', label: 'Great' },
  { value: 'GOOD', emoji: '🙂', label: 'Good' },
  { value: 'OKAY', emoji: '😐', label: 'Okay' },
  { value: 'TOUGH', emoji: '😣', label: 'Tough' },
  { value: 'HARD', emoji: '💔', label: 'Hard' },
] as const;

const MOOD_EMOJI: Record<string, string> = {
  GREAT: '🌟',
  GOOD: '🙂',
  OKAY: '😐',
  TOUGH: '😣',
  HARD: '💔',
};

export function MoodTab({
  childId,
  moods,
  onChange,
}: {
  childId: string;
  moods: ChildDetail['moodEntries'];
  onChange: () => Promise<void> | void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [voiceNoteId, setVoiceNoteId] = useState<string | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      setErr('Pick how today felt.');
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      await api('/moods', {
        method: 'POST',
        body: {
          childId,
          mood: selected,
          note: note || undefined,
          voiceNoteId: voiceNoteId || undefined,
        },
      });
      setSelected(null);
      setNote('');
      setVoiceNoteId(null);
      setShowRecorder(false);
      await onChange();
    } catch (e: any) {
      setErr(e?.message || 'Could not save mood.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="card space-y-4">
        <div>
          <h3 className="font-display text-xl text-sage-900">How was today?</h3>
          <p className="text-sm text-sage-600 mt-1">
            A quick mood check helps spot patterns over weeks. No judgement.
          </p>
        </div>
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {MOOD_OPTIONS.map((m) => {
            const active = selected === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setSelected(m.value)}
                aria-pressed={active}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-2xl py-3 transition-all border-2',
                  active
                    ? 'bg-coral-100 border-coral-400 scale-105'
                    : 'bg-cream-100 border-transparent hover:border-sage-200',
                )}
              >
                <span className="text-3xl">{m.emoji}</span>
                <span className="text-xs font-medium text-sage-700">{m.label}</span>
              </button>
            );
          })}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="A note for future-you (optional) — what triggered the mood, what helped, etc."
          className="input"
        />

        {voiceNoteId ? (
          <div className="rounded-2xl border border-sage-200 bg-sage-50 p-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm text-sage-800">
              🎙 Voice note attached
              {note && <span className="text-sage-500"> · transcript in the note above</span>}
            </div>
            <button
              type="button"
              onClick={() => {
                setVoiceNoteId(null);
                // Don't wipe the text note — the transcript is now the user's
                // to edit. If they wanted a clean slate they'd clear it.
              }}
              className="chip text-xs bg-cream-200 text-sage-700 hover:bg-cream-300"
            >
              × Detach
            </button>
          </div>
        ) : showRecorder ? (
          <VoiceNoteRecorder
            onSaved={(vn) => {
              setVoiceNoteId(vn.id);
              // Prefill the note field with the transcript — the user can
              // edit before saving the mood entry. If Whisper wasn't
              // configured, transcript is null and we leave the field alone.
              if (vn.transcript && !note.trim()) setNote(vn.transcript);
              setShowRecorder(false);
            }}
            onCancel={() => setShowRecorder(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowRecorder(true)}
            className="chip bg-cream-100 text-sage-700 hover:bg-sage-100 w-fit text-xs"
          >
            🎙 Add a voice note instead
          </button>
        )}

        {err && <p className="text-sm text-coral-700">{err}</p>}
        <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
          {saving ? 'Saving…' : 'Log mood'}
        </button>
      </form>

      {moods.length === 0 ? (
        <div className="card text-center text-sage-500 py-10">
          No mood entries yet — log today's above.
        </div>
      ) : (
        <div className="space-y-3">
          {moods.map((m) => (
            <div key={m.id} className="card flex items-center gap-4">
              <div className="text-3xl">{MOOD_EMOJI[m.mood] ?? '·'}</div>
              <div className="flex-1">
                <div className="font-medium text-sage-900 capitalize">
                  {m.mood.toLowerCase()}
                </div>
                <div className="text-xs text-sage-500">{formatDateTime(m.loggedAt)}</div>
                {m.note && <p className="text-sm text-sage-600 italic mt-1">"{m.note}"</p>}
                {m.voiceNoteId && (
                  <div className="mt-2">
                    <VoiceNotePlayer voiceNoteId={m.voiceNoteId} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
