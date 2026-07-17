'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, apiDownload } from '../../../../lib/api';
import { ageInYears, cn, formatDate, formatDateTime, initials } from '../../../../lib/utils';
import { useAuth } from '../../../../components/auth-provider';

interface ChildDetail {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  diagnoses: string[];
  allergies: string[];
  medications: string[];
  sensoryTriggers: string[];
  calmingStrategies: string[];
  hobbies: string[];
  communicationType?: string | null;
  schoolName?: string | null;
  emergencyContact?: string | null;
  notes?: string | null;
  caregivers: Array<{
    id: string;
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
  diagnosticReports: Array<{
    id: string;
    title: string;
    description?: string | null;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedByName?: string | null;
    createdAt: string;
  }>;
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
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id;
  const [child, setChild] = useState<ChildDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'milestones' | 'goals' | 'sessions' | 'mood' | 'reports'>(
    'milestones',
  );
  const [editing, setEditing] = useState(false);

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

      {editing ? (
        <EditProfilePanel
          child={child}
          onClose={() => setEditing(false)}
          onSaved={load}
          onDeleted={() => router.push('/children')}
        />
      ) : (
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
            <button onClick={() => setEditing(true)} className="btn-ghost text-sm flex-shrink-0">
              ✎ Edit profile
            </button>
          </div>

          {child.hobbies.length > 0 && (
            <div className="mt-5">
              <div className="text-xs text-sage-500 uppercase tracking-wider mb-2">Hobbies &amp; interests</div>
              <div className="flex flex-wrap gap-1.5">
                {child.hobbies.map((h) => (
                  <span key={h} className="chip bg-lavender-100 text-lavender-500">{h}</span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <Field label="Communication" value={child.communicationType || '—'} />
            <Field label="School" value={child.schoolName || '—'} />
            <Field label="Emergency contact" value={child.emergencyContact || '—'} />
            <Field label="Allergies" value={child.allergies.join(', ') || 'None'} />
            <Field label="Medications" value={child.medications.join(', ') || 'None'} />
            <Field label="Sensory triggers" value={child.sensoryTriggers.join(', ') || '—'} />
          </div>

          {(child.calmingStrategies.length > 0 || child.notes) && (
            <div className="mt-5 rounded-2xl bg-cream-100 border border-cream-200 p-4">
              <span className="text-xs uppercase tracking-wider text-sage-500">Behavior notes</span>
              {child.calmingStrategies.length > 0 && (
                <div className="mt-2">
                  <span className="text-sage-500 text-sm">Calming strategies: </span>
                  <span className="text-sage-800 text-sm">
                    {child.calmingStrategies.join(', ')}
                  </span>
                </div>
              )}
              {child.notes && (
                <p className="mt-2 text-sage-800 whitespace-pre-wrap">{child.notes}</p>
              )}
            </div>
          )}
        </header>
      )}

      {!editing && (
        <CareTeamSection
          caregivers={child.caregivers}
          sessions={child.therapySessions}
          currentUserId={user?.id}
          canManage={
            user?.role === 'ADMIN' ||
            child.caregivers.some(
              (c) => c.user.id === user?.id && c.isPrimary,
            )
          }
          onChange={load}
        />
      )}

      {!editing &&
        (user?.role === 'ADMIN' ||
          child.caregivers.some((c) => c.user.id === user?.id && c.isPrimary)) && (
          <InviteManager childId={child.id} childName={child.fullName} />
        )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap border-b border-sage-100">
        {([
          ['milestones', `Milestones (${child.milestones.length})`],
          ['goals', `Goals (${child.goals.length})`],
          ['sessions', `Sessions (${child.therapySessions.length})`],
          ['mood', `Mood (${child.moodEntries.length})`],
          ['reports', `Reports (${child.diagnosticReports.length})`],
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
      {tab === 'reports' && (
        <ReportsTab childId={child.id} reports={child.diagnosticReports} onChange={load} />
      )}
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
        body: { childId, mood: selected, note: note || undefined },
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

// ── Care team ──────────────────────────────────────────────
function CareTeamSection({
  caregivers,
  sessions,
  currentUserId,
  canManage,
  onChange,
}: {
  caregivers: ChildDetail['caregivers'];
  sessions: ChildDetail['therapySessions'];
  currentUserId?: string;
  canManage: boolean;
  onChange: () => Promise<void> | void;
}) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Unique therapists who have sessions with this child but aren't yet in
  // the Caregiver table (e.g. self-added by admin, or historical data).
  const caregiverUserIds = new Set(caregivers.map((c) => c.user.id));
  const therapists = Array.from(
    new Map(
      sessions
        .filter((s) => s.therapist && !caregiverUserIds.has(s.therapist!.id))
        .map((s) => [s.therapist!.id, s.therapist!]),
    ).values(),
  );

  if (caregivers.length === 0 && therapists.length === 0) return null;

  async function remove(c: ChildDetail['caregivers'][number]) {
    if (
      !confirm(
        `Remove ${c.user.fullName} from the care team? They will lose access to this child's data.`,
      )
    )
      return;
    setRemovingId(c.id);
    try {
      await api(`/caregivers/${c.id}`, { method: 'DELETE' });
      await onChange();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not remove';
      alert(msg);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section>
      <h2 className="font-display text-2xl text-sage-900 mb-4">Care team</h2>
      <div className="card space-y-6">
        {caregivers.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-sage-500 font-medium mb-3">
              Caregivers ({caregivers.length})
            </h3>
            <ul className="grid sm:grid-cols-2 gap-3">
              {caregivers.map((c) => {
                const isSelf = c.user.id === currentUserId;
                const removable = canManage && !c.isPrimary && !isSelf;
                return (
                  <li key={c.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-coral-200 text-coral-700 grid place-items-center font-semibold text-sm flex-shrink-0">
                      {initials(c.user.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sage-900 truncate flex items-center gap-2 flex-wrap">
                        {c.user.fullName}
                        {isSelf && (
                          <span className="chip bg-cream-200 text-sage-700 text-[10px] uppercase tracking-wider">
                            you
                          </span>
                        )}
                        {c.isPrimary && (
                          <span className="chip bg-sage-100 text-sage-700 text-[10px] uppercase tracking-wider">
                            primary
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-sage-500 capitalize">
                        {c.relationship} ·{' '}
                        {c.user.role.toLowerCase().replace('_', ' ')}
                      </div>
                    </div>
                    {removable && (
                      <button
                        onClick={() => remove(c)}
                        disabled={removingId === c.id}
                        className="btn-ghost text-xs text-coral-700 flex-shrink-0"
                        title={`Remove ${c.user.fullName}`}
                      >
                        {removingId === c.id ? '…' : 'Remove'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {therapists.length > 0 && (
          <div
            className={
              caregivers.length > 0
                ? 'pt-6 border-t border-sage-100'
                : ''
            }
          >
            <h3 className="text-xs uppercase tracking-wider text-sage-500 font-medium mb-3">
              Therapists in sessions ({therapists.length})
            </h3>
            <ul className="grid sm:grid-cols-2 gap-3">
              {therapists.map((t) => (
                <li key={t.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sage-200 text-sage-700 grid place-items-center font-semibold text-sm flex-shrink-0">
                    {initials(t.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sage-900 truncate">{t.fullName}</div>
                    <div className="text-xs text-sage-500">therapist</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Edit profile ───────────────────────────────────────────
function EditProfilePanel({
  child,
  onClose,
  onSaved,
  onDeleted,
}: {
  child: ChildDetail;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onDeleted: () => void;
}) {
  const csv = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
  const [form, setForm] = useState({
    fullName: child.fullName,
    dateOfBirth: child.dateOfBirth.slice(0, 10),
    gender: child.gender,
    diagnoses: child.diagnoses.join(', '),
    allergies: child.allergies.join(', '),
    medications: child.medications.join(', '),
    sensoryTriggers: child.sensoryTriggers.join(', '),
    calmingStrategies: child.calmingStrategies.join(', '),
    hobbies: child.hobbies.join(', '),
    communicationType: child.communicationType ?? '',
    schoolName: child.schoolName ?? '',
    emergencyContact: child.emergencyContact ?? '',
    notes: child.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const upd = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleDelete() {
    if (confirmName !== child.fullName) return;
    if (
      !confirm(
        `This will permanently delete ${child.fullName}'s profile and every milestone, therapy session, goal, mood entry, appointment, and uploaded report attached to them. Continue?`,
      )
    )
      return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api(`/children/${child.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not delete';
      setDeleteError(msg);
      setDeleting(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api(`/children/${child.id}`, {
        method: 'PATCH',
        body: {
          fullName: form.fullName,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          diagnoses: csv(form.diagnoses),
          allergies: csv(form.allergies),
          medications: csv(form.medications),
          sensoryTriggers: csv(form.sensoryTriggers),
          calmingStrategies: csv(form.calmingStrategies),
          hobbies: csv(form.hobbies),
          communicationType: form.communicationType || undefined,
          schoolName: form.schoolName || undefined,
          emergencyContact: form.emergencyContact || undefined,
          notes: form.notes || undefined,
        },
      });
      await onSaved();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="card space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display text-2xl text-sage-900">Edit profile</h2>
        <button type="button" onClick={onClose} className="btn-ghost text-sm">
          Cancel
        </button>
      </div>
      {error && (
        <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-4 text-sm">
          {error}
        </div>
      )}

      <FieldGroup legend="Basics">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Full name</label>
            <input
              required
              maxLength={120}
              className="input"
              value={form.fullName}
              onChange={(e) => upd('fullName', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Date of birth</label>
            <input
              type="date"
              required
              className="input"
              value={form.dateOfBirth}
              onChange={(e) => upd('dateOfBirth', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Gender</label>
            <select
              className="input"
              value={form.gender}
              onChange={(e) => upd('gender', e.target.value)}
            >
              <option value="FEMALE">Female</option>
              <option value="MALE">Male</option>
              <option value="OTHER">Other</option>
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </select>
          </div>
        </div>
      </FieldGroup>

      <FieldGroup legend="Health & diagnoses">
        <div>
          <label className="label">Diagnoses (comma-separated)</label>
          <input
            className="input"
            value={form.diagnoses}
            onChange={(e) => upd('diagnoses', e.target.value)}
            placeholder="Autism Spectrum Disorder, ADHD"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Allergies</label>
            <input
              className="input"
              value={form.allergies}
              onChange={(e) => upd('allergies', e.target.value)}
              placeholder="peanuts, dust"
            />
          </div>
          <div>
            <label className="label">Medications</label>
            <input
              className="input"
              value={form.medications}
              onChange={(e) => upd('medications', e.target.value)}
              placeholder="melatonin 1mg, methylphenidate"
            />
          </div>
        </div>
      </FieldGroup>

      <FieldGroup legend="Behavior">
        <div>
          <label className="label">Sensory triggers</label>
          <input
            className="input"
            value={form.sensoryTriggers}
            onChange={(e) => upd('sensoryTriggers', e.target.value)}
            placeholder="loud noises, bright lights, crowded spaces"
          />
        </div>
        <div>
          <label className="label">Calming strategies</label>
          <input
            className="input"
            value={form.calmingStrategies}
            onChange={(e) => upd('calmingStrategies', e.target.value)}
            placeholder="weighted blanket, deep-pressure hug, counting to 10"
          />
        </div>
      </FieldGroup>

      <FieldGroup legend="Interests & school">
        <div>
          <label className="label">Hobbies &amp; interests</label>
          <input
            className="input"
            value={form.hobbies}
            onChange={(e) => upd('hobbies', e.target.value)}
            placeholder="drawing, trains, music"
          />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Communication type</label>
            <input
              className="input"
              value={form.communicationType}
              onChange={(e) => upd('communicationType', e.target.value)}
              placeholder="verbal, AAC, PECS"
            />
          </div>
          <div>
            <label className="label">School</label>
            <input
              className="input"
              value={form.schoolName}
              onChange={(e) => upd('schoolName', e.target.value)}
              placeholder="Inclusive Wings School"
            />
          </div>
          <div>
            <label className="label">Emergency contact</label>
            <input
              className="input"
              value={form.emergencyContact}
              onChange={(e) => upd('emergencyContact', e.target.value)}
              placeholder="+91 98450 12345"
            />
          </div>
        </div>
      </FieldGroup>

      <div>
        <label className="label">Notes</label>
        <textarea
          rows={4}
          className="input"
          value={form.notes}
          onChange={(e) => upd('notes', e.target.value)}
          placeholder="Anything else worth remembering — routines, favourite people, comfort items…"
        />
      </div>

      <div className="flex gap-2">
        <button disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={onClose} className="btn-ghost">
          Cancel
        </button>
      </div>

      {/* Danger zone — deletion */}
      <div className="mt-2 rounded-2xl border border-coral-200 bg-coral-50 p-5 space-y-4">
        <div>
          <h3 className="font-display text-lg text-coral-800">Danger zone</h3>
          <p className="text-sm text-coral-700 mt-1 leading-relaxed">
            Deleting <strong>{child.fullName}</strong>'s profile permanently removes every
            milestone, therapy session, goal, mood entry, appointment, and uploaded report
            attached to them, plus caregiver links. Uploaded files are removed from disk.
            This cannot be undone.
          </p>
        </div>
        {deleteError && (
          <div className="rounded-xl bg-coral-100 border border-coral-300 text-coral-900 p-3 text-sm">
            {deleteError}
          </div>
        )}
        <div>
          <label className="label text-coral-800">
            Type <span className="font-semibold">{child.fullName}</span> to confirm
          </label>
          <input
            className="input"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={child.fullName}
            autoComplete="off"
          />
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={confirmName !== child.fullName || deleting}
          className="rounded-2xl px-5 py-2.5 bg-coral-600 text-cream-50 font-medium hover:bg-coral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {deleting ? 'Deleting…' : `Delete ${child.fullName}'s profile`}
        </button>
      </div>
    </form>
  );
}

function FieldGroup({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-wider text-sage-500 font-medium">
        {legend}
      </div>
      {children}
    </div>
  );
}

// ── Reports ────────────────────────────────────────────────
function ReportsTab({
  childId,
  reports,
  onChange,
}: {
  childId: string;
  reports: ChildDetail['diagnosticReports'];
  onChange: () => Promise<void> | void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Pick a file to upload.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title);
      if (description) fd.append('description', description);
      await api(`/children/${childId}/reports`, { method: 'POST', body: fd });
      setFile(null);
      setTitle('');
      setDescription('');
      // Clear the file input DOM element
      const el = document.getElementById('report-file') as HTMLInputElement | null;
      if (el) el.value = '';
      await onChange();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  async function view(r: ChildDetail['diagnosticReports'][number]) {
    setBusy(r.id);
    try {
      const blob = await apiDownload(`/reports/${r.id}/download`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      // Give the new tab time to load, then release the blob URL.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not open';
      alert(msg);
    } finally {
      setBusy(null);
    }
  }

  async function del(r: ChildDetail['diagnosticReports'][number]) {
    if (!confirm(`Delete "${r.title}"?`)) return;
    setBusy(r.id);
    try {
      await api(`/reports/${r.id}`, { method: 'DELETE' });
      await onChange();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not delete';
      alert(msg);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={upload} className="card space-y-4">
        <div>
          <h3 className="font-display text-xl text-sage-900">Upload diagnostic report</h3>
          <p className="text-sm text-sage-600 mt-1">
            PDF, JPG, PNG, or WebP. Max 10 MB. Only caregivers can see these.
          </p>
        </div>
        {error && (
          <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-4 text-sm">
            {error}
          </div>
        )}
        <div>
          <label className="label" htmlFor="report-file">File</label>
          <input
            id="report-file"
            type="file"
            required
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-sage-700 file:mr-3 file:py-2 file:px-4 file:rounded-2xl file:border-0 file:bg-sage-100 file:text-sage-800 file:font-medium hover:file:bg-sage-200"
          />
        </div>
        <div>
          <label className="label">Title</label>
          <input
            required
            maxLength={200}
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Speech assessment at NIMHANS — Aug 2025"
          />
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <textarea
            rows={2}
            maxLength={1000}
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Assessed by Dr. Rao; recommends 2x/week speech therapy."
          />
        </div>
        <button disabled={uploading || !file} className="btn-primary">
          {uploading ? 'Uploading…' : 'Upload report'}
        </button>
      </form>

      {reports.length === 0 ? (
        <div className="card text-center py-10 text-sage-500">
          No reports yet. Upload the first one above.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="card flex items-start gap-4 flex-wrap">
              <div className="w-11 h-11 rounded-xl bg-sage-100 text-sage-700 grid place-items-center text-xl flex-shrink-0">
                {r.mimeType === 'application/pdf' ? '📄' : '🖼️'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sage-900">{r.title}</div>
                <div className="text-xs text-sage-500 mt-0.5 truncate">
                  {r.fileName} · {formatBytes(r.fileSize)} · uploaded{' '}
                  {formatDate(r.createdAt)}
                  {r.uploadedByName && ` by ${r.uploadedByName}`}
                </div>
                {r.description && (
                  <p className="text-sm text-sage-600 mt-2">{r.description}</p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => view(r)}
                  disabled={busy === r.id}
                  className="btn-ghost text-sm"
                >
                  {busy === r.id ? '…' : 'View'}
                </button>
                <button
                  onClick={() => del(r)}
                  disabled={busy === r.id}
                  className="btn-ghost text-sm text-coral-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Invite manager ─────────────────────────────────────────
type InviteRole =
  | 'THERAPIST'
  | 'DOCTOR'
  | 'SPECIAL_EDUCATOR'
  | 'TEACHER'
  | 'SCHOOL_ADMIN'
  | 'PARENT';

interface Invite {
  id: string;
  token: string;
  role: InviteRole;
  relationship: string;
  email?: string | null;
  expiresAt: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  acceptedBy?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
  createdAt: string;
}

const INVITE_ROLE_OPTIONS: Array<{ value: InviteRole; label: string }> = [
  { value: 'THERAPIST', label: 'Therapist' },
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'SPECIAL_EDUCATOR', label: 'Special educator' },
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'SCHOOL_ADMIN', label: 'School admin' },
  { value: 'PARENT', label: 'Co-parent / guardian' },
];

function InviteManager({
  childId,
  childName,
}: {
  childId: string;
  childName: string;
}) {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [role, setRole] = useState<InviteRole>('THERAPIST');
  const [relationship, setRelationship] = useState('');
  const [email, setEmail] = useState('');
  const [days, setDays] = useState(14);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    try {
      const list = await api<Invite[]>(`/children/${childId}/invites`);
      setInvites(list);
    } catch {
      setInvites([]);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setErr(null);
    try {
      await api(`/children/${childId}/invites`, {
        method: 'POST',
        body: {
          role,
          relationship: relationship.trim(),
          email: email.trim() || undefined,
          expiresInDays: days,
        },
      });
      setRelationship('');
      setEmail('');
      setShowForm(false);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not create invite';
      setErr(msg);
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this invite? The link will stop working.')) return;
    try {
      await api(`/invites/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not revoke';
      alert(msg);
    }
  }

  async function copyLink(inv: Invite) {
    const url = `${window.location.origin}/invite/${inv.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(inv.id);
      setTimeout(
        () => setCopiedId((c) => (c === inv.id ? null : c)),
        2000,
      );
    } catch {
      // Fallback for older browsers / non-secure contexts
      window.prompt('Copy this link:', url);
    }
  }

  const now = Date.now();
  const pending = (invites ?? []).filter(
    (i) => !i.acceptedAt && !i.revokedAt && new Date(i.expiresAt).getTime() > now,
  );
  const past = (invites ?? []).filter(
    (i) => i.acceptedAt || i.revokedAt || new Date(i.expiresAt).getTime() <= now,
  );

  return (
    <section>
      <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="font-display text-2xl text-sage-900">Care-team invites</h2>
          <p className="text-sm text-sage-600 mt-1">
            Send a link to invite {childName}'s therapist, doctor, or educator to
            log in and track their work.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="btn-secondary"
        >
          {showForm ? 'Cancel' : '+ New invite'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="card space-y-4 mb-4">
          {err && (
            <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-4 text-sm">
              {err}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Role</label>
              <select
                className="input"
                value={role}
                onChange={(e) => setRole(e.target.value as InviteRole)}
              >
                {INVITE_ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Relationship / role label</label>
              <input
                className="input"
                required
                maxLength={120}
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g. Speech therapist at NIMHANS"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Their email (optional)</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@example.com"
              />
            </div>
            <div>
              <label className="label">Link expires in (days)</label>
              <input
                type="number"
                min={1}
                max={90}
                className="input"
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value, 10) || 14)}
              />
            </div>
          </div>
          <p className="text-xs text-sage-500">
            You'll get a shareable link. Send it to them by WhatsApp / email /
            in person — they can sign up and start logging {childName}'s data.
          </p>
          <button disabled={creating} className="btn-primary">
            {creating ? 'Creating…' : 'Create invite link'}
          </button>
        </form>
      )}

      {invites === null ? (
        <div className="card text-sage-500">Loading…</div>
      ) : invites.length === 0 ? (
        <div className="card text-center py-8 text-sage-500">
          No invites yet.
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-wider text-sage-500 font-medium">
                Pending ({pending.length})
              </h3>
              {pending.map((inv) => (
                <InviteRow
                  key={inv.id}
                  inv={inv}
                  onRevoke={() => revoke(inv.id)}
                  onCopy={() => copyLink(inv)}
                  copied={copiedId === inv.id}
                />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-wider text-sage-500 font-medium">
                Accepted / expired / revoked ({past.length})
              </h3>
              {past.map((inv) => (
                <InviteRow
                  key={inv.id}
                  inv={inv}
                  onRevoke={() => {}}
                  onCopy={() => copyLink(inv)}
                  copied={copiedId === inv.id}
                  readOnly
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function InviteRow({
  inv,
  onRevoke,
  onCopy,
  copied,
  readOnly,
}: {
  inv: Invite;
  onRevoke: () => void;
  onCopy: () => void;
  copied: boolean;
  readOnly?: boolean;
}) {
  const status: 'pending' | 'accepted' | 'revoked' | 'expired' = inv.revokedAt
    ? 'revoked'
    : inv.acceptedAt
      ? 'accepted'
      : new Date(inv.expiresAt).getTime() < Date.now()
        ? 'expired'
        : 'pending';
  const statusTone: Record<typeof status, string> = {
    pending: 'bg-mist-100 text-mist-700',
    accepted: 'bg-sage-200 text-sage-800',
    revoked: 'bg-coral-100 text-coral-700',
    expired: 'bg-sage-100 text-sage-600',
  };
  const roleLabel =
    INVITE_ROLE_OPTIONS.find((o) => o.value === inv.role)?.label ??
    inv.role.toLowerCase().replace('_', ' ');
  return (
    <div className="card">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sage-900">{inv.relationship}</span>
            <span className={`chip text-xs ${statusTone[status]}`}>
              {status}
            </span>
          </div>
          <div className="text-xs text-sage-500 mt-1">
            {roleLabel} · expires{' '}
            {new Date(inv.expiresAt).toLocaleDateString()}
            {inv.email && ` · sent to ${inv.email}`}
            {inv.acceptedBy && ` · accepted by ${inv.acceptedBy.fullName}`}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {status === 'pending' && (
            <>
              <button onClick={onCopy} className="btn-ghost text-sm">
                {copied ? '✓ Copied' : 'Copy link'}
              </button>
              {!readOnly && (
                <button
                  onClick={onRevoke}
                  className="btn-ghost text-sm text-coral-700"
                >
                  Revoke
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
