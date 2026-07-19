'use client';

import { useState } from 'react';
import { api } from '../../../../../lib/api';
import { useApi } from '../../../../../lib/swr';
import { useAuth } from '../../../../../components/auth-provider';
import { formatDate, formatDateTime } from '../../../../../lib/utils';

type IepStatus = 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'ARCHIVED';
type Domain =
  | 'COMMUNICATION'
  | 'SOCIAL'
  | 'EMOTIONAL'
  | 'MOTOR'
  | 'COGNITIVE'
  | 'DAILY_LIVING'
  | 'SENSORY';
type MilestoneStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'ACHIEVED' | 'REGRESSED';
type TherapyType =
  | 'SPEECH'
  | 'OCCUPATIONAL'
  | 'PHYSIO'
  | 'BEHAVIORAL'
  | 'ABA'
  | 'SPECIAL_EDUCATION'
  | 'OTHER';

interface IepGoal {
  id: string;
  domain: Domain;
  title: string;
  description: string | null;
  measurableCriteria: string | null;
  targetDate: string | null;
  status: MilestoneStatus;
  progress: number;
  carriedOverFromId?: string | null;
}

type Role =
  | 'PARENT'
  | 'THERAPIST'
  | 'DOCTOR'
  | 'TEACHER'
  | 'SPECIAL_EDUCATOR'
  | 'SCHOOL_ADMIN'
  | 'ADMIN';

interface IepApproval {
  id: string;
  userId: string;
  role: Role;
  note: string | null;
  signedAt: string;
  user: { id: string; fullName: string; role: Role; avatarUrl?: string | null };
}

interface IepReview {
  id: string;
  reviewDate: string;
  notes: string | null;
  participants: string[];
}

interface IepServiceItem {
  type: TherapyType;
  frequency: string;
  provider?: string;
  setting?: string;
}

interface IepListItem {
  id: string;
  schoolYear: string;
  title: string | null;
  status: IepStatus;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  updatedAt: string;
  _count: { goals: number; reviews: number };
}

interface IepDetail {
  id: string;
  childId: string;
  schoolYear: string;
  title: string | null;
  status: IepStatus;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  presentLevels: string | null;
  strengths: string | null;
  concerns: string | null;
  accommodations: string[];
  services: IepServiceItem[];
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  goals: IepGoal[];
  reviews: IepReview[];
  approvals: IepApproval[];
}

const STATUS_CHIP: Record<IepStatus, string> = {
  DRAFT: 'bg-cream-200 text-sage-800',
  PENDING_REVIEW: 'bg-mist-100 text-mist-700',
  ACTIVE: 'bg-sage-100 text-sage-700',
  ARCHIVED: 'bg-mist-100 text-mist-700',
};

const STATUS_LABEL: Record<IepStatus, string> = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending review',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
};

const PROFESSIONAL_ROLES: Role[] = [
  'THERAPIST',
  'SPECIAL_EDUCATOR',
  'DOCTOR',
  'SCHOOL_ADMIN',
];

const DOMAIN_LABEL: Record<Domain, string> = {
  COMMUNICATION: 'Communication',
  SOCIAL: 'Social',
  EMOTIONAL: 'Emotional',
  MOTOR: 'Motor',
  COGNITIVE: 'Cognitive',
  DAILY_LIVING: 'Daily living',
  SENSORY: 'Sensory',
};

const THERAPY_LABEL: Record<TherapyType, string> = {
  SPEECH: 'Speech therapy',
  OCCUPATIONAL: 'Occupational therapy',
  PHYSIO: 'Physiotherapy',
  BEHAVIORAL: 'Behavioral therapy',
  ABA: 'ABA',
  SPECIAL_EDUCATION: 'Special education',
  OTHER: 'Other',
};

export function IepTab({ childId }: { childId: string }) {
  const { data: list = [], mutate: refetchList } = useApi<IepListItem[]>(
    `/children/${childId}/ieps`,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const activeId = selectedId ?? list[0]?.id ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl text-sage-900">IEP</h3>
          <p className="text-sage-500 text-sm">
            Individualized Education Program — the living plan built with the school and therapy team.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setSelectedId(null);
          }}
          className="btn-primary"
        >
          + New IEP
        </button>
      </div>

      {list.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {list.map((iep) => {
            const label = iep.title || `${iep.schoolYear} IEP`;
            const isSelected = iep.id === activeId && !creating;
            return (
              <button
                key={iep.id}
                type="button"
                onClick={() => {
                  setSelectedId(iep.id);
                  setCreating(false);
                }}
                className={`chip transition-colors ${
                  isSelected
                    ? 'bg-coral-100 text-coral-700 ring-2 ring-coral-300'
                    : 'bg-sage-50 text-sage-700 hover:bg-sage-100'
                }`}
              >
                {label}
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${STATUS_CHIP[iep.status]}`}>
                  {STATUS_LABEL[iep.status]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {creating ? (
        <IepCreateForm
          childId={childId}
          onCancel={() => setCreating(false)}
          onCreated={async (id) => {
            setCreating(false);
            setSelectedId(id);
            await refetchList();
          }}
        />
      ) : activeId ? (
        <IepDetailPanel
          iepId={activeId}
          onChanged={refetchList}
          onDeleted={async () => {
            setSelectedId(null);
            await refetchList();
          }}
        />
      ) : (
        <div className="card text-center py-10">
          <div className="text-4xl mb-3">📘</div>
          <p className="text-sage-600">
            No IEP yet. Create one to start capturing goals, accommodations, and reviews.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Create form ──
function IepCreateForm({
  childId,
  onCancel,
  onCreated,
}: {
  childId: string;
  onCancel: () => void;
  onCreated: (id: string) => void;
}) {
  const currentYear = new Date().getFullYear();
  const [schoolYear, setSchoolYear] = useState(`${currentYear}-${currentYear + 1}`);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<IepStatus>('DRAFT');
  const [presentLevels, setPresentLevels] = useState('');
  const [strengths, setStrengths] = useState('');
  const [concerns, setConcerns] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      const created = await api<{ id: string }>(`/children/${childId}/ieps`, {
        method: 'POST',
        body: {
          schoolYear,
          title: title || undefined,
          status,
          presentLevels: presentLevels || undefined,
          strengths: strengths || undefined,
          concerns: concerns || undefined,
        },
      });
      onCreated(created.id);
    } catch (e: any) {
      setErr(e?.message ?? 'Could not create');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-xl text-sage-900">New IEP</h4>
        <button type="button" onClick={onCancel} className="text-sage-500 hover:text-sage-900">
          Cancel
        </button>
      </div>
      {err && (
        <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-3 text-sm">
          {err}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">School year</label>
          <input
            className="input"
            required
            value={schoolYear}
            onChange={(e) => setSchoolYear(e.target.value)}
            placeholder="2026-2027"
          />
        </div>
        <div>
          <label className="label">Title (optional)</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Grade 3 IEP"
          />
        </div>
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as IepStatus)}
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Present levels of performance</label>
        <textarea
          className="input min-h-[100px]"
          value={presentLevels}
          onChange={(e) => setPresentLevels(e.target.value)}
          placeholder="Where the child is right now — academic, communication, social, motor."
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Strengths</label>
          <textarea
            className="input min-h-[80px]"
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
            placeholder="What's working, what your child enjoys."
          />
        </div>
        <div>
          <label className="label">Concerns</label>
          <textarea
            className="input min-h-[80px]"
            value={concerns}
            onChange={(e) => setConcerns(e.target.value)}
            placeholder="Areas that need the most support this year."
          />
        </div>
      </div>
      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? 'Creating…' : 'Create IEP'}
      </button>
    </form>
  );
}

// ── Detail panel ──
function IepDetailPanel({
  iepId,
  onChanged,
  onDeleted,
}: {
  iepId: string;
  onChanged: () => Promise<unknown>;
  onDeleted: () => Promise<void>;
}) {
  const { data: iep, mutate, isLoading } = useApi<IepDetail>(`/ieps/${iepId}`);
  const [editing, setEditing] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddReview, setShowAddReview] = useState(false);

  if (isLoading || !iep) {
    return <div className="card animate-pulse h-48" />;
  }

  async function refresh() {
    await Promise.all([mutate(), onChanged()]);
  }

  async function deleteIep() {
    if (!confirm('Delete this IEP and all its goals + reviews? This cannot be undone.')) return;
    await api(`/ieps/${iepId}`, { method: 'DELETE' });
    await onDeleted();
  }

  return (
    <div className="space-y-6">
      {editing ? (
        <IepEditForm
          iep={iep}
          onCancel={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            await refresh();
          }}
        />
      ) : (
        <div className="card space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h4 className="font-display text-2xl text-sage-900">
                {iep.title || `${iep.schoolYear} IEP`}
              </h4>
              <p className="text-sage-500 text-sm mt-1">
                {iep.schoolYear}
                {iep.effectiveFrom && ` · in effect from ${formatDate(iep.effectiveFrom)}`}
                {iep.effectiveTo && ` to ${formatDate(iep.effectiveTo)}`}
                {iep.createdByName && ` · authored by ${iep.createdByName}`}
              </p>
              <span
                className={`chip mt-2 inline-flex ${STATUS_CHIP[iep.status]}`}
              >
                {iep.status.toLowerCase()}
              </span>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <a
                href={`/ieps/${iep.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost text-sm"
                title="Open printable view (Save as PDF from the print dialog)"
              >
                🖨 Print
              </a>
              <button className="btn-ghost text-sm" onClick={() => setEditing(true)}>
                ✎ Edit
              </button>
              <button
                className="btn-ghost text-sm text-coral-600 hover:bg-coral-50"
                onClick={deleteIep}
              >
                Delete
              </button>
            </div>
          </div>

          {iep.presentLevels && (
            <Section title="Present levels of performance">
              <p className="text-sage-800 whitespace-pre-wrap">{iep.presentLevels}</p>
            </Section>
          )}

          {(iep.strengths || iep.concerns) && (
            <div className="grid sm:grid-cols-2 gap-4">
              {iep.strengths && (
                <Section title="Strengths">
                  <p className="text-sage-800 whitespace-pre-wrap">{iep.strengths}</p>
                </Section>
              )}
              {iep.concerns && (
                <Section title="Concerns">
                  <p className="text-sage-800 whitespace-pre-wrap">{iep.concerns}</p>
                </Section>
              )}
            </div>
          )}

          {iep.accommodations.length > 0 && (
            <Section title={`Accommodations (${iep.accommodations.length})`}>
              <ul className="space-y-1.5">
                {iep.accommodations.map((a, i) => (
                  <li key={i} className="text-sage-800 flex gap-2">
                    <span className="text-sage-400">•</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {iep.services.length > 0 && (
            <Section title={`Related services (${iep.services.length})`}>
              <ul className="divide-y divide-sage-100">
                {iep.services.map((s, i) => (
                  <li key={i} className="py-2 flex items-baseline gap-3 flex-wrap">
                    <span className="font-medium text-sage-900">{THERAPY_LABEL[s.type] ?? s.type}</span>
                    <span className="text-sage-600 text-sm">{s.frequency}</span>
                    {s.provider && (
                      <span className="text-sage-500 text-sm">· {s.provider}</span>
                    )}
                    {s.setting && (
                      <span className="text-sage-500 text-sm">· {s.setting}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}

      <ApprovalPanel iep={iep} onChanged={refresh} />

      {/* Goals */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="font-display text-xl text-sage-900">
            Goals ({iep.goals.length})
          </h4>
          <div className="flex gap-3">
            {iep.status === 'DRAFT' && (
              <CarryoverButton
                childId={iep.childId}
                targetIepId={iep.id}
                onCarried={refresh}
              />
            )}
            <button
              type="button"
              onClick={() => setShowAddGoal((v) => !v)}
              className="text-sm text-coral-600 hover:text-coral-800 font-medium"
            >
              {showAddGoal ? 'Cancel' : '+ Add goal'}
            </button>
          </div>
        </div>
        {showAddGoal && (
          <GoalForm
            iepId={iep.id}
            onCancel={() => setShowAddGoal(false)}
            onSaved={async () => {
              setShowAddGoal(false);
              await refresh();
            }}
          />
        )}
        {iep.goals.length === 0 && !showAddGoal ? (
          <p className="text-sage-500 text-sm">
            No goals yet. Add 3-6 measurable goals across communication, social, and academic areas.
          </p>
        ) : (
          <ul className="space-y-3">
            {iep.goals.map((g) => (
              <li key={g.id}>
                <GoalCard goal={g} onChanged={refresh} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Reviews */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-display text-xl text-sage-900">
            Reviews ({iep.reviews.length})
          </h4>
          <button
            type="button"
            onClick={() => setShowAddReview((v) => !v)}
            className="text-sm text-coral-600 hover:text-coral-800 font-medium"
          >
            {showAddReview ? 'Cancel' : '+ Log a review'}
          </button>
        </div>
        {showAddReview && (
          <ReviewForm
            iepId={iep.id}
            onCancel={() => setShowAddReview(false)}
            onSaved={async () => {
              setShowAddReview(false);
              await refresh();
            }}
          />
        )}
        {iep.reviews.length === 0 && !showAddReview ? (
          <p className="text-sage-500 text-sm">
            No reviews logged. Quarterly reviews with the school + therapists keep the IEP alive.
          </p>
        ) : (
          <ul className="space-y-3">
            {iep.reviews.map((r) => (
              <li key={r.id} className="rounded-2xl border border-sage-100 p-4 bg-cream-50">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-medium text-sage-900">
                    {formatDate(r.reviewDate)}
                  </div>
                  <button
                    className="text-sage-500 hover:text-coral-600 text-sm"
                    onClick={async () => {
                      if (!confirm('Delete this review?')) return;
                      await api(`/iep-reviews/${r.id}`, { method: 'DELETE' });
                      await refresh();
                    }}
                  >
                    Delete
                  </button>
                </div>
                {r.participants.length > 0 && (
                  <div className="text-sage-500 text-sm mt-1">
                    With: {r.participants.join(', ')}
                  </div>
                )}
                {r.notes && (
                  <p className="text-sage-800 mt-2 whitespace-pre-wrap text-sm">{r.notes}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-sage-500 mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

// ── Goal card + form ──
function GoalCard({
  goal,
  onChanged,
}: {
  goal: IepGoal;
  onChanged: () => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  async function bumpProgress(delta: number) {
    const next = Math.max(0, Math.min(100, goal.progress + delta));
    if (next === goal.progress) return;
    setSavingProgress(true);
    try {
      await api(`/iep-goals/${goal.id}`, {
        method: 'PATCH',
        body: {
          progress: next,
          status:
            next === 100 ? 'ACHIEVED' : next > 0 ? 'IN_PROGRESS' : goal.status,
        },
      });
      await onChanged();
    } finally {
      setSavingProgress(false);
    }
  }

  async function deleteGoal() {
    if (!confirm('Delete this goal?')) return;
    await api(`/iep-goals/${goal.id}`, { method: 'DELETE' });
    await onChanged();
  }

  if (editing) {
    return (
      <GoalForm
        iepId=""
        goal={goal}
        onCancel={() => setEditing(false)}
        onSaved={async () => {
          setEditing(false);
          await onChanged();
        }}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-sage-100 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="chip bg-sage-50 text-sage-700 text-xs">
              {DOMAIN_LABEL[goal.domain]}
            </span>
            <span className={`chip text-xs ${statusChip(goal.status)}`}>
              {goal.status.toLowerCase().replace('_', ' ')}
            </span>
            {goal.targetDate && (
              <span className="text-xs text-sage-500">
                target {formatDate(goal.targetDate)}
              </span>
            )}
            {goal.carriedOverFromId && (
              <span
                className="chip bg-cream-100 text-sage-600 text-[10px]"
                title="Carried over from a previous year's IEP"
              >
                ↻ carried over
              </span>
            )}
            <GoalSessionsChip goalId={goal.id} />
          </div>
          <div className="font-medium text-sage-900 mt-2">{goal.title}</div>
          {goal.description && (
            <p className="text-sage-600 text-sm mt-1 whitespace-pre-wrap">
              {goal.description}
            </p>
          )}
          {goal.measurableCriteria && (
            <p className="text-xs text-sage-500 mt-1.5">
              <span className="font-medium">Measurable:</span> {goal.measurableCriteria}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button className="text-sage-500 hover:text-sage-900 text-sm" onClick={() => setEditing(true)}>
            ✎
          </button>
          <button
            className="text-sage-500 hover:text-coral-600 text-sm"
            onClick={deleteGoal}
          >
            ×
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-sage-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-coral-400 transition-all"
            style={{ width: `${goal.progress}%` }}
          />
        </div>
        <span className="text-sm text-sage-600 tabular-nums w-10 text-right">
          {goal.progress}%
        </span>
        <div className="flex gap-1">
          <button
            className="w-7 h-7 rounded-full bg-sage-100 hover:bg-sage-200 text-sage-700 disabled:opacity-40"
            onClick={() => bumpProgress(-10)}
            disabled={savingProgress || goal.progress === 0}
          >
            −
          </button>
          <button
            className="w-7 h-7 rounded-full bg-sage-100 hover:bg-sage-200 text-sage-700 disabled:opacity-40"
            onClick={() => bumpProgress(10)}
            disabled={savingProgress || goal.progress === 100}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

// Small pill that shows "N sessions" once we've fetched the per-goal session
// count. Zero → hidden entirely to avoid noise.
function GoalSessionsChip({ goalId }: { goalId: string }) {
  const { data } = useApi<Array<{ id: string; scheduledAt: string; type: string }>>(
    `/iep-goals/${goalId}/sessions`,
  );
  if (!data || data.length === 0) return null;
  return (
    <span
      className="chip bg-mist-100 text-mist-700 text-[10px]"
      title={`${data.length} therapy session${data.length === 1 ? '' : 's'} worked on this goal`}
    >
      🎯 {data.length}
    </span>
  );
}

function statusChip(s: MilestoneStatus): string {
  switch (s) {
    case 'ACHIEVED':
      return 'bg-sage-100 text-sage-700';
    case 'IN_PROGRESS':
      return 'bg-cream-200 text-sage-800';
    case 'REGRESSED':
      return 'bg-coral-100 text-coral-700';
    default:
      return 'bg-mist-100 text-mist-700';
  }
}

function GoalForm({
  iepId,
  goal,
  onCancel,
  onSaved,
}: {
  iepId: string;
  goal?: IepGoal;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [domain, setDomain] = useState<Domain>(goal?.domain ?? 'COMMUNICATION');
  const [title, setTitle] = useState(goal?.title ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [criteria, setCriteria] = useState(goal?.measurableCriteria ?? '');
  const [targetDate, setTargetDate] = useState(
    goal?.targetDate ? goal.targetDate.slice(0, 10) : '',
  );
  const [status, setStatus] = useState<MilestoneStatus>(goal?.status ?? 'NOT_STARTED');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const body = {
        domain,
        title,
        description: description || undefined,
        measurableCriteria: criteria || undefined,
        targetDate: targetDate || undefined,
        status,
      };
      if (goal) {
        await api(`/iep-goals/${goal.id}`, { method: 'PATCH', body });
      } else {
        await api(`/ieps/${iepId}/goals`, { method: 'POST', body });
      }
      await onSaved();
    } catch (e: any) {
      setErr(e?.message ?? 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-sage-200 p-4 space-y-3 bg-cream-50">
      {err && (
        <div className="rounded-xl bg-coral-50 border border-coral-200 text-coral-800 p-2 text-sm">
          {err}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Domain</label>
          <select className="input" value={domain} onChange={(e) => setDomain(e.target.value as Domain)}>
            {Object.entries(DOMAIN_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as MilestoneStatus)}>
            <option value="NOT_STARTED">Not started</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="ACHIEVED">Achieved</option>
            <option value="REGRESSED">Regressed</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Title</label>
        <input
          className="input"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Answer wh-questions about a picture book"
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[70px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Measurable criteria</label>
        <input
          className="input"
          value={criteria}
          onChange={(e) => setCriteria(e.target.value)}
          placeholder="e.g. 4/5 correct across 3 sessions"
        />
      </div>
      <div>
        <label className="label">Target date</label>
        <input
          type="date"
          className="input"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-ghost text-sm">
          Cancel
        </button>
        <button type="submit" className="btn-primary text-sm" disabled={saving}>
          {saving ? 'Saving…' : goal ? 'Save' : 'Add goal'}
        </button>
      </div>
    </form>
  );
}

// ── Review form ──
function ReviewForm({
  iepId,
  onCancel,
  onSaved,
}: {
  iepId: string;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [participants, setParticipants] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await api(`/ieps/${iepId}/reviews`, {
        method: 'POST',
        body: {
          reviewDate: new Date(date).toISOString(),
          participants: participants
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          notes: notes || undefined,
        },
      });
      await onSaved();
    } catch (e: any) {
      setErr(e?.message ?? 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-sage-200 p-4 space-y-3 bg-cream-50">
      {err && (
        <div className="rounded-xl bg-coral-50 border border-coral-200 text-coral-800 p-2 text-sm">
          {err}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Review date</label>
          <input
            type="date"
            className="input"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Participants (comma-separated)</label>
          <input
            className="input"
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            placeholder="Ms. Priya, Ms. Rao, Mr. Sharma"
          />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea
          className="input min-h-[100px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Decisions made, changes to goals or services, follow-ups."
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-ghost text-sm">
          Cancel
        </button>
        <button type="submit" className="btn-primary text-sm" disabled={saving}>
          {saving ? 'Saving…' : 'Save review'}
        </button>
      </div>
    </form>
  );
}

// ── Edit form for the IEP metadata ──
function IepEditForm({
  iep,
  onCancel,
  onSaved,
}: {
  iep: IepDetail;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [schoolYear, setSchoolYear] = useState(iep.schoolYear);
  const [title, setTitle] = useState(iep.title ?? '');
  const [status, setStatus] = useState<IepStatus>(iep.status);
  const [effectiveFrom, setEffectiveFrom] = useState(
    iep.effectiveFrom ? iep.effectiveFrom.slice(0, 10) : '',
  );
  const [effectiveTo, setEffectiveTo] = useState(
    iep.effectiveTo ? iep.effectiveTo.slice(0, 10) : '',
  );
  const [presentLevels, setPresentLevels] = useState(iep.presentLevels ?? '');
  const [strengths, setStrengths] = useState(iep.strengths ?? '');
  const [concerns, setConcerns] = useState(iep.concerns ?? '');
  const [accommodations, setAccommodations] = useState<string[]>(
    iep.accommodations.length ? iep.accommodations : [''],
  );
  const [services, setServices] = useState<IepServiceItem[]>(iep.services ?? []);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await api(`/ieps/${iep.id}`, {
        method: 'PATCH',
        body: {
          schoolYear,
          title: title || undefined,
          status,
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : undefined,
          effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : undefined,
          presentLevels: presentLevels || undefined,
          strengths: strengths || undefined,
          concerns: concerns || undefined,
          accommodations: accommodations.map((s) => s.trim()).filter(Boolean),
          services: services.filter((s) => s.type && s.frequency.trim()),
        },
      });
      await onSaved();
    } catch (e: any) {
      setErr(e?.message ?? 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-xl text-sage-900">Edit IEP</h4>
        <button type="button" onClick={onCancel} className="text-sage-500 hover:text-sage-900">
          Cancel
        </button>
      </div>
      {err && (
        <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-3 text-sm">
          {err}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">School year</label>
          <input className="input" value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} />
        </div>
        <div>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as IepStatus)}
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">In effect from</label>
            <input
              type="date"
              className="input"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="label">To</label>
            <input
              type="date"
              className="input"
              value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="label">Present levels</label>
        <textarea
          className="input min-h-[100px]"
          value={presentLevels}
          onChange={(e) => setPresentLevels(e.target.value)}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Strengths</label>
          <textarea
            className="input min-h-[80px]"
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Concerns</label>
          <textarea
            className="input min-h-[80px]"
            value={concerns}
            onChange={(e) => setConcerns(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label">Accommodations</label>
        <div className="space-y-2">
          {accommodations.map((a, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input flex-1"
                value={a}
                onChange={(e) => {
                  const next = [...accommodations];
                  next[i] = e.target.value;
                  setAccommodations(next);
                }}
                placeholder="e.g. Seat in front row near teacher"
              />
              <button
                type="button"
                className="text-sage-500 hover:text-coral-600 px-2"
                onClick={() => setAccommodations(accommodations.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-coral-600 hover:text-coral-800 font-medium"
            onClick={() => setAccommodations([...accommodations, ''])}
          >
            + Add accommodation
          </button>
        </div>
      </div>

      <div>
        <label className="label">Related services</label>
        <div className="space-y-2">
          {services.map((s, i) => (
            <div key={i} className="grid sm:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-start">
              <select
                className="input"
                value={s.type}
                onChange={(e) => {
                  const next = [...services];
                  next[i] = { ...next[i], type: e.target.value as TherapyType };
                  setServices(next);
                }}
              >
                {Object.entries(THERAPY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <input
                className="input"
                placeholder="Frequency"
                value={s.frequency}
                onChange={(e) => {
                  const next = [...services];
                  next[i] = { ...next[i], frequency: e.target.value };
                  setServices(next);
                }}
              />
              <input
                className="input"
                placeholder="Provider"
                value={s.provider ?? ''}
                onChange={(e) => {
                  const next = [...services];
                  next[i] = { ...next[i], provider: e.target.value };
                  setServices(next);
                }}
              />
              <input
                className="input"
                placeholder="Setting"
                value={s.setting ?? ''}
                onChange={(e) => {
                  const next = [...services];
                  next[i] = { ...next[i], setting: e.target.value };
                  setServices(next);
                }}
              />
              <button
                type="button"
                className="text-sage-500 hover:text-coral-600 px-2 self-center"
                onClick={() => setServices(services.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-coral-600 hover:text-coral-800 font-medium"
            onClick={() =>
              setServices([
                ...services,
                { type: 'SPEECH', frequency: '', provider: '', setting: '' },
              ])
            }
          >
            + Add service
          </button>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

// ── Approval panel ──
function ApprovalPanel({
  iep,
  onChanged,
}: {
  iep: IepDetail;
  onChanged: () => Promise<unknown>;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState('');

  if (!user) return null;
  if (iep.status === 'ARCHIVED') return null;

  const mine = iep.approvals.find((a) => a.userId === user.id) ?? null;
  const hasCaregiverSig = iep.approvals.some((a) => a.role === 'PARENT');
  const hasProfessionalSig = iep.approvals.some((a) =>
    PROFESSIONAL_ROLES.includes(a.role),
  );

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    try {
      await fn();
      await onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  }

  const canSubmit = iep.status === 'DRAFT';
  const canRetract = iep.status === 'PENDING_REVIEW';
  const canApprove = iep.status === 'DRAFT' || iep.status === 'PENDING_REVIEW';

  return (
    <section className="card space-y-4">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h4 className="font-display text-xl text-sage-900">Approvals</h4>
        <div className="text-xs text-sage-500">
          Requires 1 parent + 1 professional (therapist / educator / doctor) to activate.
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <div
          className={`chip ${hasCaregiverSig ? 'bg-sage-100 text-sage-700' : 'bg-cream-100 text-sage-500'}`}
        >
          {hasCaregiverSig ? '✓' : '○'} Parent / guardian
        </div>
        <div
          className={`chip ${hasProfessionalSig ? 'bg-sage-100 text-sage-700' : 'bg-cream-100 text-sage-500'}`}
        >
          {hasProfessionalSig ? '✓' : '○'} Professional
        </div>
      </div>

      {iep.approvals.length > 0 && (
        <ul className="space-y-2">
          {iep.approvals.map((a) => (
            <li
              key={a.id}
              className="rounded-2xl border border-sage-100 p-3 flex items-start gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-sage-100 text-sage-700 grid place-items-center font-semibold text-xs">
                {a.user.fullName
                  .split(' ')
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-sage-900">
                  {a.user.fullName}{' '}
                  <span className="font-normal text-sage-500 text-xs">
                    · {a.role.toLowerCase().replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs text-sage-500">
                  Signed {formatDateTime(a.signedAt)}
                </div>
                {a.note && (
                  <p className="text-sm text-sage-700 mt-1 italic">"{a.note}"</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-sage-100 pt-4 space-y-3">
        {iep.status === 'ACTIVE' && (
          <div className="text-sm text-sage-700 bg-sage-50 rounded-2xl border border-sage-100 p-3">
            ✓ This IEP is active and in effect. All required signatures collected.
          </div>
        )}
        {(canApprove || canSubmit || canRetract) && (
          <>
            {canApprove && (
              <div>
                <label className="label">Optional note with your signature</label>
                <input
                  className="input"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Reviewed goals, minor tweaks to timing."
                  disabled={!!busy}
                />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {canSubmit && (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() =>
                    run('submit', () =>
                      api(`/ieps/${iep.id}/submit`, { method: 'POST' }),
                    )
                  }
                  className="btn-primary text-sm"
                >
                  {busy === 'submit' ? 'Submitting…' : 'Submit for review'}
                </button>
              )}
              {canRetract && (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() =>
                    run('retract', () =>
                      api(`/ieps/${iep.id}/retract`, { method: 'POST' }),
                    )
                  }
                  className="btn-ghost text-sm"
                >
                  {busy === 'retract' ? 'Retracting…' : 'Retract to draft'}
                </button>
              )}
              {canApprove && !mine && (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() =>
                    run('approve', () =>
                      api(`/ieps/${iep.id}/approve`, {
                        method: 'POST',
                        body: { note: note || undefined },
                      }),
                    ).then(() => setNote(''))
                  }
                  className="btn-primary text-sm"
                >
                  {busy === 'approve' ? 'Signing…' : '✓ Sign & approve'}
                </button>
              )}
              {canApprove && mine && (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() =>
                    run('revoke', () =>
                      api(`/ieps/${iep.id}/approve`, { method: 'DELETE' }),
                    )
                  }
                  className="btn-ghost text-sm text-coral-700"
                >
                  {busy === 'revoke' ? 'Revoking…' : 'Revoke my signature'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// ── Cross-year goal carryover ──
function CarryoverButton({
  childId,
  targetIepId,
  onCarried,
}: {
  childId: string;
  targetIepId: string;
  onCarried: () => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-sage-600 hover:text-sage-900 font-medium"
      >
        ↻ Carry over from previous year
      </button>
      {open && (
        <CarryoverModal
          childId={childId}
          targetIepId={targetIepId}
          onClose={() => setOpen(false)}
          onCarried={async () => {
            setOpen(false);
            await onCarried();
          }}
        />
      )}
    </>
  );
}

function CarryoverModal({
  childId,
  targetIepId,
  onClose,
  onCarried,
}: {
  childId: string;
  targetIepId: string;
  onClose: () => void;
  onCarried: () => Promise<unknown>;
}) {
  const { data: ieps = [] } = useApi<IepListItem[]>(`/children/${childId}/ieps`);
  const candidates = ieps.filter((i) => i.id !== targetIepId);
  const [sourceIepId, setSourceIepId] = useState<string>('');
  const { data: source } = useApi<IepDetail>(
    sourceIepId ? `/ieps/${sourceIepId}` : null,
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function carry() {
    if (!sourceIepId || selected.size === 0) return;
    setBusy(true);
    try {
      await api(`/ieps/${targetIepId}/carryover`, {
        method: 'POST',
        body: { sourceIepId, goalIds: [...selected] },
      });
      await onCarried();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Carryover failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-cream-50 rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-display text-2xl text-sage-900">Carry over goals</h4>
          <button type="button" onClick={onClose} className="text-sage-500 hover:text-sage-900 text-xl">
            ×
          </button>
        </div>
        <p className="text-sm text-sage-600 mb-4">
          Copy selected goals from a previous IEP into this one. Progress resets to 0
          and the target date clears — the title, description, and measurable criteria
          come across.
        </p>

        {candidates.length === 0 ? (
          <p className="text-sage-500 text-sm">
            No other IEPs on file for this child yet.
          </p>
        ) : (
          <>
            <label className="label">Source IEP</label>
            <select
              className="input"
              value={sourceIepId}
              onChange={(e) => {
                setSourceIepId(e.target.value);
                setSelected(new Set());
              }}
            >
              <option value="">— Pick one —</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title || `${c.schoolYear} IEP`} · {STATUS_LABEL[c.status]} ·{' '}
                  {c._count.goals} goals
                </option>
              ))}
            </select>

            {source && source.goals.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-xs uppercase tracking-wider text-sage-500">
                  Pick goals to carry over
                </div>
                <ul className="space-y-1.5">
                  {source.goals.map((g) => (
                    <li key={g.id}>
                      <label className="flex items-start gap-3 p-3 rounded-2xl border border-sage-100 hover:bg-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected.has(g.id)}
                          onChange={() => toggle(g.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-sage-900">{g.title}</div>
                          <div className="text-xs text-sage-500">
                            {DOMAIN_LABEL[g.domain]} · progress {g.progress}% ·{' '}
                            status {g.status.toLowerCase().replace('_', ' ')}
                          </div>
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {source && source.goals.length === 0 && (
              <p className="text-sage-500 text-sm mt-4">
                That IEP has no goals to carry over.
              </p>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="btn-ghost text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={carry}
            disabled={busy || !sourceIepId || selected.size === 0}
            className="btn-primary text-sm"
          >
            {busy
              ? 'Carrying over…'
              : `Carry over ${selected.size || 0} goal${selected.size === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
