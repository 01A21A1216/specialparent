'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { formatDateTime } from '../../../lib/utils';

interface UpcomingSession {
  id: string;
  type: string;
  scheduledAt: string;
  durationMins: number;
  status: string;
  child: { id: string; fullName: string };
  therapist?: { id: string; fullName: string } | null;
}

interface ChildBrief {
  id: string;
  fullName: string;
}

const TYPE_OPTIONS = [
  { value: 'SPEECH', label: 'Speech therapy' },
  { value: 'OCCUPATIONAL', label: 'Occupational therapy' },
  { value: 'PHYSIO', label: 'Physiotherapy' },
  { value: 'BEHAVIORAL', label: 'Behavioral therapy' },
  { value: 'ABA', label: 'ABA' },
  { value: 'SPECIAL_EDUCATION', label: 'Special education' },
  { value: 'OTHER', label: 'Other' },
];

export default function TherapyPage() {
  const [upcoming, setUpcoming] = useState<UpcomingSession[]>([]);
  const [children, setChildren] = useState<ChildBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // form
  const [childId, setChildId] = useState('');
  const [type, setType] = useState('SPEECH');
  const [when, setWhen] = useState('');
  const [duration, setDuration] = useState(45);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [u, kids] = await Promise.all([
        api<UpcomingSession[]>('/therapy/upcoming'),
        api<ChildBrief[]>('/children'),
      ]);
      setUpcoming(u);
      setChildren(kids);
      if (kids.length && !childId) setChildId(kids[0].id);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api('/therapy/sessions', {
        method: 'POST',
        body: {
          childId,
          type,
          scheduledAt: new Date(when).toISOString(),
          durationMins: duration,
        },
      });
      setWhen('');
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Could not schedule');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl text-sage-900">Therapy</h1>
          <p className="text-sage-600 mt-2">
            Schedule sessions, track progress, capture notes.
          </p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary" disabled={children.length === 0}>
          {showForm ? 'Cancel' : '+ Schedule session'}
        </button>
      </header>

      {showForm && (
        <form onSubmit={onCreate} className="card max-w-2xl space-y-4">
          {error && (
            <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-4 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="label">Child</label>
            <select className="input" value={childId} onChange={(e) => setChildId(e.target.value)}>
              {children.map((c) => (
                <option key={c.id} value={c.id}>{c.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Therapy type</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Date &amp; time</label>
              <input
                type="datetime-local"
                className="input"
                required
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Duration (mins)</label>
              <input
                type="number"
                min={15}
                max={240}
                className="input"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              />
            </div>
          </div>
          <button disabled={submitting} className="btn-primary">
            {submitting ? 'Scheduling…' : 'Schedule'}
          </button>
        </form>
      )}

      <section>
        <h2 className="font-display text-2xl text-sage-900 mb-4">Upcoming</h2>
        {loading ? (
          <div className="text-sage-500">Loading…</div>
        ) : upcoming.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-5xl mb-3">🌿</div>
            <p className="text-sage-600">No upcoming sessions.</p>
          </div>
        ) : (
          <div className="card divide-y divide-sage-100">
            {upcoming.map((s) => (
              <div key={s.id} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4 flex-wrap">
                <div className="w-12 h-12 rounded-2xl bg-sage-100 text-sage-700 grid place-items-center text-2xl">
                  {sessionEmoji(s.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sage-900">
                    {s.child.fullName} · {sessionLabel(s.type)}
                  </div>
                  <div className="text-sm text-sage-500">
                    {formatDateTime(s.scheduledAt)} · {s.durationMins} min
                    {s.therapist && ` · ${s.therapist.fullName}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function sessionEmoji(type: string) {
  return ({
    SPEECH: '🗣️',
    OCCUPATIONAL: '✋',
    PHYSIO: '🤸',
    BEHAVIORAL: '🎯',
    ABA: '🎯',
    SPECIAL_EDUCATION: '📚',
    OTHER: '✨',
  } as Record<string, string>)[type] ?? '✨';
}

function sessionLabel(type: string) {
  return TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
}
