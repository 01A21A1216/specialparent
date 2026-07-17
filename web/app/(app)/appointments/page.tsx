'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { formatDateTime } from '../../../lib/utils';

type AppointmentKind = 'THERAPY' | 'DOCTOR' | 'SCHOOL_MEETING' | 'ASSESSMENT' | 'OTHER';

interface Appointment {
  id: string;
  kind: AppointmentKind;
  title: string;
  location?: string | null;
  startsAt: string;
  endsAt: string;
  notes?: string | null;
  reminderAt?: string | null;
  child?: { id: string; fullName: string } | null;
}

interface ChildBrief {
  id: string;
  fullName: string;
}

const KIND_OPTIONS: Array<{ value: AppointmentKind; label: string; emoji: string }> = [
  { value: 'THERAPY', label: 'Therapy', emoji: '🩺' },
  { value: 'DOCTOR', label: 'Doctor', emoji: '⚕️' },
  { value: 'SCHOOL_MEETING', label: 'School meeting', emoji: '🏫' },
  { value: 'ASSESSMENT', label: 'Assessment', emoji: '📋' },
  { value: 'OTHER', label: 'Other', emoji: '📌' },
];

const kindEmoji = (k: string) => KIND_OPTIONS.find((o) => o.value === k)?.emoji ?? '📌';
const kindLabel = (k: string) => KIND_OPTIONS.find((o) => o.value === k)?.label ?? k;

// datetime-local input needs "YYYY-MM-DDTHH:mm" in the *user's* local time.
function toLocalInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface FormState {
  kind: AppointmentKind;
  title: string;
  childId: string;
  location: string;
  startsAt: string;
  endsAt: string;
  notes: string;
  reminderAt: string;
}

const emptyForm = (): FormState => ({
  kind: 'THERAPY',
  title: '',
  childId: '',
  location: '',
  startsAt: '',
  endsAt: '',
  notes: '',
  reminderAt: '',
});

export default function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [children, setChildren] = useState<ChildBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [appts, kids] = await Promise.all([
        api<Appointment[]>('/appointments'),
        api<ChildBrief[]>('/children'),
      ]);
      setItems(appts);
      setChildren(kids);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    setError(null);
  }

  function startEdit(a: Appointment) {
    setEditingId(a.id);
    setForm({
      kind: a.kind,
      title: a.title,
      childId: a.child?.id ?? '',
      location: a.location ?? '',
      startsAt: toLocalInput(a.startsAt),
      endsAt: toLocalInput(a.endsAt),
      notes: a.notes ?? '',
      reminderAt: toLocalInput(a.reminderAt),
    });
    setShowForm(true);
    setError(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (new Date(form.endsAt) <= new Date(form.startsAt)) {
      setError('The end time has to be after the start time.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        kind: form.kind,
        title: form.title.trim(),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      };
      if (form.childId) body.childId = form.childId;
      if (form.location.trim()) body.location = form.location.trim();
      if (form.notes.trim()) body.notes = form.notes.trim();
      if (form.reminderAt) body.reminderAt = new Date(form.reminderAt).toISOString();

      if (editingId) {
        await api(`/appointments/${editingId}`, { method: 'PATCH', body });
      } else {
        await api('/appointments', { method: 'POST', body });
      }
      closeForm();
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(a: Appointment) {
    if (!confirm(`Delete "${a.title}"?`)) return;
    try {
      await api(`/appointments/${a.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not delete';
      alert(msg);
    }
  }

  const now = Date.now();
  const upcoming = (items ?? []).filter((a) => new Date(a.startsAt).getTime() >= now);
  const past = (items ?? [])
    .filter((a) => new Date(a.startsAt).getTime() < now)
    .slice()
    .reverse(); // most-recent past first

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl text-sage-900">Appointments</h1>
          <p className="text-sage-600 mt-2">
            Therapy, doctor visits, school meetings, assessments — all in one calendar.
          </p>
        </div>
        <button onClick={startCreate} className="btn-primary">
          + New appointment
        </button>
      </header>

      {showForm && (
        <form onSubmit={onSubmit} className="card max-w-3xl space-y-4">
          <h2 className="font-display text-xl text-sage-900">
            {editingId ? 'Edit appointment' : 'New appointment'}
          </h2>
          {error && (
            <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-4 text-sm">
              {error}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Kind</label>
              <select
                className="input"
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as AppointmentKind }))}
              >
                {KIND_OPTIONS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.emoji} {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">For child (optional)</label>
              <select
                className="input"
                value={form.childId}
                onChange={(e) => setForm((f) => ({ ...f, childId: e.target.value }))}
              >
                <option value="">— No specific child —</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              required
              maxLength={200}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Speech assessment at NIMHANS"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Starts</label>
              <input
                type="datetime-local"
                className="input"
                required
                value={form.startsAt}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Ends</label>
              <input
                type="datetime-local"
                className="input"
                required
                value={form.endsAt}
                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="label">Location (optional)</label>
            <input
              className="input"
              maxLength={200}
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Manipal Hospital, Bengaluru"
            />
          </div>
          <div>
            <label className="label">Reminder (optional)</label>
            <input
              type="datetime-local"
              className="input"
              value={form.reminderAt}
              onChange={(e) => setForm((f) => ({ ...f, reminderAt: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              className="input min-h-[80px]"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Anything to remember — instructions, questions to ask, forms to carry."
            />
          </div>
          <div className="flex gap-2">
            <button disabled={submitting} className="btn-primary">
              {submitting ? 'Saving…' : editingId ? 'Save changes' : 'Create'}
            </button>
            <button type="button" onClick={closeForm} className="btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Upcoming */}
      <section>
        <h2 className="font-display text-2xl text-sage-900 mb-4">Upcoming</h2>
        {loading ? (
          <div className="text-sage-500">Loading…</div>
        ) : upcoming.length === 0 ? (
          <div className="card text-center py-10">
            <div className="text-5xl mb-3">📅</div>
            <p className="text-sage-600">
              Nothing scheduled. Take a breath. 🍃
            </p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {upcoming.map((a) => (
              <AppointmentRow
                key={a.id}
                a={a}
                onEdit={() => startEdit(a)}
                onDelete={() => onDelete(a)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="font-display text-2xl text-sage-900 mb-4">Past</h2>
          <ul className="grid gap-3 opacity-70">
            {past.slice(0, 20).map((a) => (
              <AppointmentRow
                key={a.id}
                a={a}
                onEdit={() => startEdit(a)}
                onDelete={() => onDelete(a)}
              />
            ))}
          </ul>
          {past.length > 20 && (
            <p className="text-xs text-sage-500 mt-3">Showing the 20 most recent.</p>
          )}
        </section>
      )}
    </div>
  );
}

function AppointmentRow({
  a,
  onEdit,
  onDelete,
}: {
  a: Appointment;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="card">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-2xl bg-sage-100 text-sage-700 grid place-items-center text-2xl flex-shrink-0">
          {kindEmoji(a.kind)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sage-900">{a.title}</span>
            <span className="chip bg-sage-100 text-sage-700 text-xs">
              {kindLabel(a.kind)}
            </span>
          </div>
          <div className="text-sm text-sage-500 mt-1">
            {formatDateTime(a.startsAt)}
            {a.location && ` · ${a.location}`}
            {a.child && ` · for ${a.child.fullName}`}
          </div>
          {a.notes && (
            <p className="mt-2 text-sm text-sage-600 italic">"{a.notes}"</p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={onEdit} className="btn-ghost text-sm">
            Edit
          </button>
          <button onClick={onDelete} className="btn-ghost text-sm text-coral-700">
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}
