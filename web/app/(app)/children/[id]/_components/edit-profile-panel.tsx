'use client';

import { useState } from 'react';
import { api } from '../../../../../lib/api';
import { FieldGroup } from './field-group';
import { ChildDetail } from './types';

export function EditProfilePanel({
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
