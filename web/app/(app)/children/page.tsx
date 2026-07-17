'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { ageInYears, initials } from '../../../lib/utils';

interface ChildItem {
  id: string;
  fullName: string;
  dateOfBirth: string;
  diagnoses: string[];
  schoolName?: string | null;
  _count?: { milestones: number; therapySessions: number; goals: number };
}

export default function ChildrenPage() {
  const [children, setChildren] = useState<ChildItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [diagnoses, setDiagnoses] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const csv = (s: string) =>
    s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

  async function load() {
    setLoading(true);
    try {
      const data = await api<ChildItem[]>('/children');
      setChildren(data);
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
      await api('/children', {
        method: 'POST',
        body: {
          fullName,
          dateOfBirth: dob,
          diagnoses: csv(diagnoses),
          hobbies: csv(hobbies),
        },
      });
      setFullName('');
      setDob('');
      setDiagnoses('');
      setHobbies('');
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Could not create');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl text-sage-900">My children</h1>
          <p className="text-sage-600 mt-2">
            Each profile is private to you and the caregivers you invite.
          </p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary">
          {showForm ? 'Cancel' : '+ Add child'}
        </button>
      </header>

      {showForm && (
        <form onSubmit={onCreate} className="card max-w-2xl space-y-5">
          <h2 className="font-display text-2xl text-sage-900">New child profile</h2>
          {error && (
            <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-4 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="label" htmlFor="cname">Full name</label>
            <input
              id="cname"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              placeholder="Aanya Iyer"
            />
          </div>
          <div>
            <label className="label" htmlFor="cdob">Date of birth</label>
            <input
              id="cdob"
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="cdiag">Diagnoses (comma-separated, optional)</label>
            <input
              id="cdiag"
              value={diagnoses}
              onChange={(e) => setDiagnoses(e.target.value)}
              className="input"
              placeholder="Autism Spectrum Disorder, Speech delay"
            />
          </div>
          <div>
            <label className="label" htmlFor="chobbies">Hobbies & interests (comma-separated, optional)</label>
            <input
              id="chobbies"
              value={hobbies}
              onChange={(e) => setHobbies(e.target.value)}
              className="input"
              placeholder="drawing, trains, music"
            />
          </div>
          <p className="text-xs text-sage-500">
            You can add allergies, medications, school, emergency contact and more from the profile page after creating.
          </p>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Saving…' : 'Create profile'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-sage-500">Loading…</div>
      ) : children.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-3">🌱</div>
          <h2 className="font-display text-2xl text-sage-900">No children yet</h2>
          <p className="text-sage-600 mt-2">Add your first child profile to get started.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map((c) => (
            <Link key={c.id} href={`/children/${c.id}`} className="card hover:shadow-glow transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-coral-200 text-coral-700 grid place-items-center font-semibold text-xl">
                  {initials(c.fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-xl text-sage-900 truncate">{c.fullName}</h3>
                  <p className="text-sage-500 text-sm">{ageInYears(c.dateOfBirth)} old</p>
                </div>
              </div>
              {c.diagnoses.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {c.diagnoses.slice(0, 3).map((d) => (
                    <span key={d} className="chip bg-sage-100 text-sage-700 text-xs">{d}</span>
                  ))}
                </div>
              )}
              {c.schoolName && (
                <p className="mt-3 text-xs text-sage-500">🏫 {c.schoolName}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
