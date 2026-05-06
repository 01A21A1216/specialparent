'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';
import { ageInYears, cn, formatDate, formatDateTime, initials } from '../../../../lib/utils';

interface ChildDetail {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  diagnoses: string[];
  allergies: string[];
  medications: string[];
  sensoryTriggers: string[];
  communicationType?: string | null;
  schoolName?: string | null;
  emergencyContact?: string | null;
  notes?: string | null;
  caregivers: Array<{
    user: { id: string; fullName: string; email: string; role: string };
    relationship: string;
    isPrimary: boolean;
  }>;
  milestones: Array<{
    id: string;
    domain: string;
    title: string;
    description?: string | null;
    status: string;
    achievedAt?: string | null;
  }>;
  goals: Array<{
    id: string;
    title: string;
    status: string;
    progress: number;
    targetDate?: string | null;
  }>;
  therapySessions: Array<{
    id: string;
    type: string;
    scheduledAt: string;
    durationMins: number;
    status: string;
    notes?: string | null;
    aiSummary?: string | null;
    therapist?: { id: string; fullName: string } | null;
  }>;
  moodEntries: Array<{ id: string; mood: string; loggedAt: string; note?: string | null }>;
}

const DOMAIN_LABEL: Record<string, string> = {
  COMMUNICATION: 'Communication',
  SOCIAL: 'Social',
  EMOTIONAL: 'Emotional',
  MOTOR: 'Motor',
  COGNITIVE: 'Cognitive',
  DAILY_LIVING: 'Daily living',
  SENSORY: 'Sensory',
};

const STATUS_TONE: Record<string, string> = {
  NOT_STARTED: 'bg-sage-100 text-sage-600',
  IN_PROGRESS: 'bg-mist-100 text-mist-700',
  ACHIEVED: 'bg-sage-200 text-sage-800',
  REGRESSED: 'bg-coral-100 text-coral-700',
};

export default function ChildDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [child, setChild] = useState<ChildDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'milestones' | 'goals' | 'sessions' | 'mood'>('milestones');

  async function load() {
    setLoading(true);
    try {
      const data = await api<ChildDetail>(`/children/${id}`);
      setChild(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  if (loading) return <div className="text-sage-500">Loading…</div>;
  if (!child) return <div className="text-sage-500">Not found.</div>;

  return (
    <div className="space-y-8">
      <Link href="/children" className="text-sage-600 hover:text-sage-900 text-sm">
        ← All children
      </Link>

      <header className="card">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-20 h-20 rounded-full bg-coral-200 text-coral-700 grid place-items-center font-semibold text-3xl flex-shrink-0">
            {initials(child.fullName)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-4xl text-sage-900">{child.fullName}</h1>
            <p className="text-sage-600 mt-1">
              {ageInYears(child.dateOfBirth)} old · born {formatDate(child.dateOfBirth)}
              {child.schoolName && ` · ${child.schoolName}`}
            </p>
            {child.diagnoses.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {child.diagnoses.map((d) => (
                  <span key={d} className="chip bg-sage-100 text-sage-700">{d}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <Field label="Communication" value={child.communicationType || '—'} />
          <Field label="Allergies" value={child.allergies.join(', ') || 'None'} />
          <Field label="Medications" value={child.medications.join(', ') || 'None'} />
          <Field label="Sensory triggers" value={child.sensoryTriggers.join(', ') || '—'} />
        </div>
        {child.notes && (
          <div className="mt-5 rounded-2xl bg-cream-100 border border-cream-200 p-4 text-sage-800">
            <span className="text-xs uppercase tracking-wider text-sage-500">Notes</span>
            <p className="mt-1">{child.notes}</p>
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap border-b border-sage-100">
        {([
          ['milestones', `Milestones (${child.milestones.length})`],
          ['goals', `Goals (${child.goals.length})`],
          ['sessions', `Sessions (${child.therapySessions.length})`],
          ['mood', `Mood (${child.moodEntries.length})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-3 font-medium text-sage-700 border-b-2 -mb-px ${
              tab === key
                ? 'border-coral-500 text-sage-900'
                : 'border-transparent hover:text-sage-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'milestones' && (
        <MilestonesTab childId={child.id} milestones={child.milestones} onChange={load} />
      )}
      {tab === 'goals' && <GoalsTab childId={child.id} goals={child.goals} onChange={load} />}
      {tab === 'sessions' && <SessionsTab sessions={child.therapySessions} />}
      {tab === 'mood' && <MoodTab childId={child.id} moods={child.moodEntries} onChange={load} />}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream-50 p-3 border border-sage-100">
      <div className="text-xs text-sage-500 uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-sage-900">{value}</div>
    </div>
  );
}

// ── Milestones ─────────────────────────────────────────────
function MilestonesTab({
  childId,
  milestones,
  onChange,
}: {
  childId: string;
  milestones: ChildDetail['milestones'];
  onChange: () => Promise<void> | void;
}) {
  const [adding, setAdding] = useState(false);
  const [domain, setDomain] = useState('COMMUNICATION');
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api('/milestones', {
        method: 'POST',
        body: { childId, domain, title },
      });
      setTitle('');
      setAdding(false);
      await onChange();
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(id: string, status: string) {
    await api(`/milestones/${id}`, { method: 'PATCH', body: { status } });
    await onChange();
  }

  const grouped = milestones.reduce<Record<string, typeof milestones>>((acc, m) => {
    (acc[m.domain] ??= []).push(m);
    return acc;
  }, {});

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sage-600">Track development across communication, social, motor, and more.</p>
        <button onClick={() => setAdding((a) => !a)} className="btn-secondary">
          {adding ? 'Cancel' : '+ Add milestone'}
        </button>
      </div>

      {adding && (
        <form onSubmit={add} className="card space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="label">Domain</label>
              <select className="input" value={domain} onChange={(e) => setDomain(e.target.value)}>
                {Object.entries(DOMAIN_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Title</label>
              <input
                className="input"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Uses 2-symbol AAC requests"
              />
            </div>
          </div>
          <button disabled={submitting} className="btn-primary">
            {submitting ? 'Saving…' : 'Add milestone'}
          </button>
        </form>
      )}

      {Object.keys(grouped).length === 0 ? (
        <div className="card text-center text-sage-500 py-10">No milestones yet.</div>
      ) : (
        Object.entries(grouped).map(([d, items]) => (
          <div key={d}>
            <h3 className="font-display text-xl text-sage-900 mb-3">{DOMAIN_LABEL[d] || d}</h3>
            <div className="card divide-y divide-sage-100">
              {items.map((m) => (
                <div key={m.id} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sage-900">{m.title}</div>
                    {m.description && <p className="text-sm text-sage-500">{m.description}</p>}
                    {m.achievedAt && (
                      <p className="text-xs text-sage-500 mt-1">
                        🎉 Achieved {formatDate(m.achievedAt)}
                      </p>
                    )}
                  </div>
                  <select
                    value={m.status}
                    onChange={(e) => setStatus(m.id, e.target.value)}
                    className={`text-xs font-medium rounded-full px-3 py-1.5 border-0 ${STATUS_TONE[m.status]}`}
                  >
                    <option value="NOT_STARTED">Not started</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="ACHIEVED">Achieved</option>
                    <option value="REGRESSED">Regressed</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

// ── Goals ──────────────────────────────────────────────────
function GoalsTab({
  childId,
  goals,
  onChange,
}: {
  childId: string;
  goals: ChildDetail['goals'];
  onChange: () => Promise<void> | void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api('/goals', {
        method: 'POST',
        body: { childId, title, targetDate: target || undefined },
      });
      setTitle('');
      setTarget('');
      setAdding(false);
      await onChange();
    } finally {
      setSubmitting(false);
    }
  }

  async function setProgress(id: string, progress: number) {
    await api(`/goals/${id}`, { method: 'PATCH', body: { progress } });
    await onChange();
  }

  return (
    <section className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-sage-600">Outcome-focused goals for your child.</p>
        <button onClick={() => setAdding((a) => !a)} className="btn-secondary">
          {adding ? 'Cancel' : '+ Add goal'}
        </button>
      </div>

      {adding && (
        <form onSubmit={add} className="card space-y-4">
          <div>
            <label className="label">Goal</label>
            <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Target date (optional)</label>
            <input type="date" className="input" value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
          <button disabled={submitting} className="btn-primary">
            {submitting ? 'Saving…' : 'Add goal'}
          </button>
        </form>
      )}

      {goals.length === 0 ? (
        <div className="card text-center text-sage-500 py-10">No goals yet.</div>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => (
            <div key={g.id} className="card">
              <div className="flex justify-between gap-4 items-start flex-wrap">
                <div>
                  <h3 className="font-medium text-sage-900">{g.title}</h3>
                  {g.targetDate && (
                    <p className="text-sm text-sage-500">Target: {formatDate(g.targetDate)}</p>
                  )}
                </div>
                <span className={`chip ${g.status === 'ACHIEVED' ? 'bg-sage-200 text-sage-800' : 'bg-mist-100 text-mist-700'}`}>
                  {g.status.toLowerCase()}
                </span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-sage-600">Progress</span>
                  <span className="text-sage-900 font-medium">{g.progress}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  defaultValue={g.progress}
                  onMouseUp={(e) => setProgress(g.id, parseInt((e.target as HTMLInputElement).value, 10))}
                  onTouchEnd={(e) => setProgress(g.id, parseInt((e.target as HTMLInputElement).value, 10))}
                  className="w-full accent-sage-600"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Sessions ───────────────────────────────────────────────
function SessionsTab({ sessions }: { sessions: ChildDetail['therapySessions'] }) {
  if (sessions.length === 0) {
    return <div className="card text-center text-sage-500 py-10">No sessions yet.</div>;
  }
  return (
    <div className="space-y-3">
      {sessions.map((s) => (
        <div key={s.id} className="card">
          <div className="flex justify-between gap-4 items-start flex-wrap">
            <div>
              <h3 className="font-display text-xl text-sage-900">{sessionLabel(s.type)}</h3>
              <p className="text-sm text-sage-600 mt-1">
                {formatDateTime(s.scheduledAt)} · {s.durationMins} min
                {s.therapist && ` · ${s.therapist.fullName}`}
              </p>
            </div>
            <span
              className={`chip ${
                s.status === 'COMPLETED'
                  ? 'bg-sage-200 text-sage-800'
                  : s.status === 'SCHEDULED'
                    ? 'bg-mist-100 text-mist-700'
                    : 'bg-coral-100 text-coral-700'
              }`}
            >
              {s.status.toLowerCase()}
            </span>
          </div>
          {s.notes && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sage-700 font-medium">Session notes</summary>
              <p className="mt-2 text-sage-700 whitespace-pre-wrap">{s.notes}</p>
            </details>
          )}
          {s.aiSummary && (
            <div className="mt-3 rounded-2xl bg-lavender-50 border border-lavender-100 p-4">
              <div className="text-xs text-lavender-500 uppercase tracking-wider font-medium">
                ✨ AI summary
              </div>
              <p className="mt-1 text-sage-800 whitespace-pre-wrap text-sm">{s.aiSummary}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function sessionLabel(type: string) {
  return ({
    SPEECH: 'Speech therapy',
    OCCUPATIONAL: 'Occupational therapy',
    PHYSIO: 'Physiotherapy',
    BEHAVIORAL: 'Behavioral therapy',
    ABA: 'ABA',
    SPECIAL_EDUCATION: 'Special education',
    OTHER: 'Session',
  } as Record<string, string>)[type] ?? type;
}

// ── Mood ───────────────────────────────────────────────────
const MOOD_OPTIONS = [
  { value: 'GREAT', emoji: '🌟', label: 'Great' },
  { value: 'GOOD', emoji: '🙂', label: 'Good' },
  { value: 'OKAY', emoji: '😐', label: 'Okay' },
  { value: 'TOUGH', emoji: '😣', label: 'Tough' },
  { value: 'HARD', emoji: '💔', label: 'Hard' },
] as const;

function MoodTab({
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
        body: JSON.stringify({ childId, mood: selected, note: note || undefined }),
      });
      setSelected(null);
      setNote('');
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
              <div className="text-3xl">
                {({ GREAT: '🌟', GOOD: '🙂', OKAY: '😐', TOUGH: '😣', HARD: '💔' } as any)[m.mood]}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sage-900 capitalize">
                  {m.mood.toLowerCase()}
                </div>
                <div className="text-xs text-sage-500">{formatDateTime(m.loggedAt)}</div>
                {m.note && <p className="text-sm text-sage-600 italic mt-1">"{m.note}"</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
