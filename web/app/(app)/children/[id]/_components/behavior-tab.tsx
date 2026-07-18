'use client';

import { useState } from 'react';
import { api } from '../../../../../lib/api';
import { useApi } from '../../../../../lib/swr';
import { cn, formatDateTime } from '../../../../../lib/utils';

type BehaviorKind = 'TRIGGER' | 'MELTDOWN' | 'SLEEP' | 'FOOD' | 'ROUTINE' | 'OTHER';

interface BehaviorEvent {
  id: string;
  kind: BehaviorKind;
  occurredAt: string;
  durationMins?: number | null;
  severity?: number | null;
  trigger?: string | null;
  helped?: string | null;
  note?: string | null;
  loggedBy?: { id: string; fullName: string } | null;
}

const KIND_META: Record<
  BehaviorKind,
  { label: string; emoji: string; chip: string; card: string }
> = {
  TRIGGER: {
    label: 'Trigger',
    emoji: '⚠️',
    chip: 'bg-coral-100 text-coral-800',
    card: 'bg-coral-50 border-coral-100',
  },
  MELTDOWN: {
    label: 'Meltdown',
    emoji: '💔',
    chip: 'bg-coral-200 text-coral-900',
    card: 'bg-coral-50 border-coral-200',
  },
  SLEEP: {
    label: 'Sleep',
    emoji: '🌙',
    chip: 'bg-lavender-100 text-lavender-500',
    card: 'bg-lavender-50 border-lavender-100',
  },
  FOOD: {
    label: 'Food',
    emoji: '🍽️',
    chip: 'bg-mist-100 text-mist-700',
    card: 'bg-mist-50 border-mist-100',
  },
  ROUTINE: {
    label: 'Routine',
    emoji: '📅',
    chip: 'bg-sage-100 text-sage-800',
    card: 'bg-sage-50 border-sage-100',
  },
  OTHER: {
    label: 'Other',
    emoji: '·',
    chip: 'bg-cream-200 text-sage-700',
    card: 'bg-cream-100 border-cream-200',
  },
};

const KIND_ORDER: BehaviorKind[] = [
  'MELTDOWN',
  'TRIGGER',
  'SLEEP',
  'FOOD',
  'ROUTINE',
  'OTHER',
];

function toLocalInput(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BehaviorTab({ childId }: { childId: string }) {
  const {
    data: events = [],
    isLoading,
    mutate,
  } = useApi<BehaviorEvent[]>(`/children/${childId}/behavior`);

  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<BehaviorKind>('MELTDOWN');
  const [occurredAt, setOccurredAt] = useState(toLocalInput(new Date()));
  const [durationMins, setDurationMins] = useState('');
  const [severity, setSeverity] = useState('');
  const [trigger, setTrigger] = useState('');
  const [helped, setHelped] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BehaviorKind | 'ALL'>('ALL');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        kind,
        occurredAt: new Date(occurredAt).toISOString(),
      };
      if (durationMins) body.durationMins = parseInt(durationMins, 10);
      if (severity) body.severity = parseInt(severity, 10);
      if (trigger.trim()) body.trigger = trigger.trim();
      if (helped.trim()) body.helped = helped.trim();
      if (note.trim()) body.note = note.trim();
      await api(`/children/${childId}/behavior`, { method: 'POST', body });
      setShowForm(false);
      setDurationMins('');
      setSeverity('');
      setTrigger('');
      setHelped('');
      setNote('');
      setOccurredAt(toLocalInput(new Date()));
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function remove(evt: BehaviorEvent) {
    if (!confirm(`Delete this ${KIND_META[evt.kind].label.toLowerCase()} entry?`))
      return;
    try {
      await api(`/behavior/${evt.id}`, { method: 'DELETE' });
      await mutate();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const counts = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.kind] = (acc[e.kind] || 0) + 1;
    return acc;
  }, {});
  const filtered = filter === 'ALL' ? events : events.filter((e) => e.kind === filter);

  // Show duration for time-based kinds; severity for intensity-scaled kinds.
  const showDuration = kind === 'MELTDOWN' || kind === 'SLEEP';
  const showSeverity = kind === 'MELTDOWN' || kind === 'TRIGGER';

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <p className="text-sage-600 max-w-2xl">
          Record what happened — triggers, meltdowns, sleep, food, routine
          changes. Patterns emerge over weeks, and this is what your therapist
          will ask about.
        </p>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="btn-primary"
        >
          {showForm ? 'Cancel' : '+ Log observation'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card space-y-4">
          {error && (
            <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-4 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="label">What kind?</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {KIND_ORDER.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  aria-pressed={kind === k}
                  className={cn(
                    'rounded-2xl px-2 py-2 text-xs font-medium border-2 transition-all',
                    kind === k
                      ? `${KIND_META[k].chip} border-transparent shadow-soft`
                      : 'bg-white text-sage-700 border-sage-200 hover:border-sage-400',
                  )}
                >
                  <span className="text-base block" aria-hidden="true">
                    {KIND_META[k].emoji}
                  </span>
                  {KIND_META[k].label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label">When</label>
              <input
                type="datetime-local"
                required
                className="input"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </div>
            {showDuration && (
              <div>
                <label className="label">Duration (mins)</label>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  className="input"
                  value={durationMins}
                  onChange={(e) => setDurationMins(e.target.value)}
                  placeholder={kind === 'SLEEP' ? '540' : '10'}
                />
              </div>
            )}
            {showSeverity && (
              <div>
                <label className="label">Severity (1–5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="input"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  placeholder="3"
                />
              </div>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Trigger (optional)</label>
              <input
                className="input"
                maxLength={500}
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                placeholder="loud dryer noise"
              />
            </div>
            <div>
              <label className="label">What helped (optional)</label>
              <input
                className="input"
                maxLength={500}
                value={helped}
                onChange={(e) => setHelped(e.target.value)}
                placeholder="weighted blanket + quiet room"
              />
            </div>
          </div>
          <div>
            <label className="label">Note (optional)</label>
            <textarea
              rows={2}
              maxLength={2000}
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="anything else to remember about this"
            />
          </div>
          <button disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Log observation'}
          </button>
        </form>
      )}

      {events.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('ALL')}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium border-2 inline-flex items-center gap-1',
              filter === 'ALL'
                ? 'bg-sage-600 text-cream-50 border-transparent shadow-soft'
                : 'bg-cream-50 text-sage-800 border-sage-200 hover:border-sage-400',
            )}
          >
            All <span className="ml-1 opacity-75">({events.length})</span>
          </button>
          {KIND_ORDER.filter((k) => counts[k]).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium border-2 inline-flex items-center gap-1',
                filter === k
                  ? `${KIND_META[k].chip} border-transparent shadow-soft`
                  : 'bg-cream-50 text-sage-800 border-sage-200 hover:border-sage-400',
              )}
            >
              <span aria-hidden="true">{KIND_META[k].emoji}</span>
              {KIND_META[k].label}
              <span className="ml-1 opacity-75">({counts[k]})</span>
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="text-sage-500">Loading…</div>
      ) : events.length === 0 ? (
        <div className="card text-center py-10 text-sage-500">
          No observations logged yet. Track the first one above.
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-8 text-sage-500">
          Nothing in that category yet.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((evt) => {
            const meta = KIND_META[evt.kind];
            return (
              <div key={evt.id} className={cn('card border', meta.card)}>
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="text-2xl flex-shrink-0" aria-hidden="true">
                    {meta.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('chip text-xs', meta.chip)}>
                        {meta.label}
                      </span>
                      {typeof evt.severity === 'number' && (
                        <span className="chip text-xs bg-cream-200 text-sage-700">
                          severity {evt.severity}/5
                        </span>
                      )}
                      {typeof evt.durationMins === 'number' && (
                        <span className="chip text-xs bg-cream-200 text-sage-700">
                          {evt.durationMins < 60
                            ? `${evt.durationMins} min`
                            : `${(evt.durationMins / 60).toFixed(1)} h`}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-sage-500 mt-1">
                      {formatDateTime(evt.occurredAt)}
                      {evt.loggedBy && ` · logged by ${evt.loggedBy.fullName}`}
                    </div>
                    {(evt.trigger || evt.helped) && (
                      <div className="mt-2 text-sm text-sage-700 space-y-1">
                        {evt.trigger && (
                          <div>
                            <span className="text-sage-500">Trigger:</span>{' '}
                            {evt.trigger}
                          </div>
                        )}
                        {evt.helped && (
                          <div>
                            <span className="text-sage-500">Helped:</span>{' '}
                            {evt.helped}
                          </div>
                        )}
                      </div>
                    )}
                    {evt.note && (
                      <p className="mt-2 text-sm text-sage-700 italic">
                        "{evt.note}"
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => remove(evt)}
                    className="btn-ghost text-xs text-coral-700 flex-shrink-0"
                    title="Delete this observation"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
