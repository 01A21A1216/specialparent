'use client';

import { useState } from 'react';
import { api } from '../../../lib/api';
import { useApi } from '../../../lib/swr';
import { useAuth } from '../../../components/auth-provider';
import { formatDate, formatDateTime, initials } from '../../../lib/utils';

type Role =
  | 'PARENT'
  | 'THERAPIST'
  | 'DOCTOR'
  | 'TEACHER'
  | 'SPECIAL_EDUCATOR'
  | 'SCHOOL_ADMIN'
  | 'ADMIN';

interface Me {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: Role;
  preferredLanguage: string;
  avatarUrl?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
}

const LANGUAGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'EN', label: 'English' },
  { value: 'HI', label: 'Hindi' },
  { value: 'TE', label: 'Telugu' },
  { value: 'TA', label: 'Tamil' },
  { value: 'KN', label: 'Kannada' },
  { value: 'ML', label: 'Malayalam' },
  { value: 'BN', label: 'Bengali' },
  { value: 'MR', label: 'Marathi' },
  { value: 'GU', label: 'Gujarati' },
];

const ROLE_LABEL: Record<Role, string> = {
  PARENT: 'Parent',
  THERAPIST: 'Therapist',
  DOCTOR: 'Doctor',
  TEACHER: 'Teacher',
  SPECIAL_EDUCATOR: 'Special educator',
  SCHOOL_ADMIN: 'School admin',
  ADMIN: 'Platform admin',
};

export default function ProfilePage() {
  const { refresh: refreshSession } = useAuth();
  const {
    data: me,
    isLoading: loading,
    error,
    mutate,
  } = useApi<Me>('/auth/me');

  if (loading) return <div className="text-sage-500">Loading…</div>;
  if (error || !me)
    return (
      <div className="card text-coral-800 bg-coral-50 border border-coral-200">
        {error?.message || 'Profile not found.'}
      </div>
    );

  return (
    <div className="space-y-8 max-w-3xl">
      <header>
        <p className="text-sage-500 text-sm uppercase tracking-wider">Account</p>
        <h1 className="font-display text-4xl sm:text-5xl text-sage-900 mt-2">
          Your profile
        </h1>
      </header>

      {/* Summary card */}
      <section className="card">
        <div className="flex items-start gap-5 flex-wrap">
          {me.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={me.avatarUrl}
              alt=""
              className="w-20 h-20 rounded-full object-cover flex-shrink-0 bg-coral-100"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-coral-200 text-coral-700 grid place-items-center font-semibold text-3xl flex-shrink-0">
              {initials(me.fullName)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-2xl text-sage-900">{me.fullName}</h2>
            <p className="text-sage-600 mt-1 break-all">{me.email}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="chip bg-sage-100 text-sage-800">
                {ROLE_LABEL[me.role] ?? me.role}
              </span>
              <span className="chip bg-cream-200 text-sage-700">
                Member since {formatDate(me.createdAt)}
              </span>
              {me.lastLoginAt && (
                <span className="chip bg-cream-200 text-sage-700">
                  Last login {formatDateTime(me.lastLoginAt)}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <EditProfileCard
        me={me}
        onSaved={async () => {
          await mutate();
          await refreshSession?.();
        }}
      />

      <ChangePasswordCard />
    </div>
  );
}

function EditProfileCard({
  me,
  onSaved,
}: {
  me: Me;
  onSaved: () => Promise<void> | void;
}) {
  const [form, setForm] = useState({
    fullName: me.fullName,
    phone: me.phone ?? '',
    avatarUrl: me.avatarUrl ?? '',
    preferredLanguage: me.preferredLanguage,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const upd = <K extends keyof typeof form>(k: K, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api('/auth/me', {
        method: 'PATCH',
        body: {
          fullName: form.fullName,
          phone: form.phone,
          avatarUrl: form.avatarUrl,
          preferredLanguage: form.preferredLanguage,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 className="font-display text-2xl text-sage-900 mb-4">Personal information</h2>
      <form onSubmit={save} className="card space-y-4">
        {error && (
          <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-4 text-sm">
            {error}
          </div>
        )}
        {saved && (
          <div className="rounded-2xl bg-sage-50 border border-sage-200 text-sage-800 p-4 text-sm">
            Saved.
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Full name</label>
            <input
              required
              minLength={2}
              maxLength={120}
              className="input"
              value={form.fullName}
              onChange={(e) => upd('fullName', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <input
              type="tel"
              maxLength={30}
              className="input"
              value={form.phone}
              onChange={(e) => upd('phone', e.target.value)}
              placeholder="+91 98450 12345"
            />
          </div>
        </div>
        <div>
          <label className="label">Avatar image URL (optional)</label>
          <input
            type="url"
            maxLength={500}
            className="input"
            value={form.avatarUrl}
            onChange={(e) => upd('avatarUrl', e.target.value)}
            placeholder="https://…"
          />
          <p className="text-xs text-sage-500 mt-1">
            Paste a link to any image (e.g. from Gravatar or a shared drive).
          </p>
        </div>
        <div>
          <label className="label">Preferred language</label>
          <select
            className="input"
            value={form.preferredLanguage}
            onChange={(e) => upd('preferredLanguage', e.target.value)}
          >
            {LANGUAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="pt-2">
          <button disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
        <p className="text-xs text-sage-500">
          Your email address is fixed — contact us if you need to change it.
        </p>
      </form>
    </section>
  );
}

function ChangePasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (next !== confirm) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: { currentPassword: current, newPassword: next },
      });
      setSaved(true);
      setCurrent('');
      setNext('');
      setConfirm('');
      setTimeout(() => setSaved(false), 5000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not change password';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 className="font-display text-2xl text-sage-900 mb-4">Change password</h2>
      <form onSubmit={submit} className="card space-y-4 max-w-lg">
        {error && (
          <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-4 text-sm">
            {error}
          </div>
        )}
        {saved && (
          <div className="rounded-2xl bg-sage-50 border border-sage-200 text-sage-800 p-4 text-sm">
            Password changed. Other browsers and devices have been signed out.
          </div>
        )}
        <div>
          <label className="label">Current password</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            className="input"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div>
          <label className="label">New password</label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label className="label">Confirm new password</label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <div className="pt-2">
          <button disabled={saving} className="btn-primary">
            {saving ? 'Changing…' : 'Change password'}
          </button>
        </div>
        <p className="text-xs text-sage-500">
          For your safety, changing your password will sign you out of every other
          browser and device.
        </p>
      </form>
    </section>
  );
}
