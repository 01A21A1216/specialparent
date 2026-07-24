'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../components/auth-provider';
import { api } from '../../../../lib/api';
import { useApi } from '../../../../lib/swr';
import { ApiState } from '../../../../components/api-state';

// Therapist's self-management page. Handles first-time onboarding
// (empty profile → fill basics → add education → add certifications →
// submit for review) and post-verification editing.

type Status = 'DRAFT' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
type Mode = 'ONLINE' | 'IN_PERSON' | 'HYBRID';
type Level = 'INTERN' | 'RBT' | 'BCABA' | 'BCBA';

const LEVEL_ORDER: Level[] = ['INTERN', 'RBT', 'BCABA', 'BCBA'];
const LEVEL_META: Record<Level, { short: string; long: string }> = {
  INTERN: { short: 'Intern', long: 'Intern / Trainee (supervised)' },
  RBT:    { short: 'RBT',    long: 'Registered Behavior Technician' },
  BCABA:  { short: 'BCaBA',  long: 'Board Certified Assistant Behavior Analyst' },
  BCBA:   { short: 'BCBA',   long: 'Board Certified Behavior Analyst' },
};

interface Education {
  id: string;
  degree: string;
  institution: string;
  fieldOfStudy: string | null;
  yearCompleted: number | null;
  notes: string | null;
}
interface Certification {
  id: string;
  name: string;
  issuingOrganization: string;
  credentialId: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  credentialUrl: string | null;
  fileName: string | null;
}
interface Profile {
  id: string;
  specialization: string;
  specializations: string[];
  qualifications: string | null;
  yearsExperience: number;
  bio: string | null;
  hourlyRate: number | null;
  languages: string[];
  serviceModes: Mode[];
  city: string | null;
  state: string | null;
  photoUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  availability: string | null;
  acceptingNewClients: boolean;
  ageGroups: string[];
  level: Level | null;
  verificationStatus: Status;
  submittedAt: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  updatedAt: string;
  educations: Education[];
  certifications: Certification[];
}

const STATUS_META: Record<Status, { label: string; tone: string; blurb: string }> = {
  DRAFT: {
    label: 'Draft',
    tone: 'bg-cream-200 border-cream-400 text-sage-800',
    blurb: 'Complete your profile and submit for review to appear in the parent directory.',
  },
  PENDING_REVIEW: {
    label: 'Pending review',
    tone: 'bg-mist-100 border-mist-300 text-mist-800',
    blurb: "You're in the review queue. Our team is verifying your credentials — usually 2–5 working days.",
  },
  VERIFIED: {
    label: 'Verified',
    tone: 'bg-sage-100 border-sage-300 text-sage-800',
    blurb: 'You are live in the parent directory. Edits to your headline fields will send the profile back for a quick re-review.',
  },
  REJECTED: {
    label: 'Needs changes',
    tone: 'bg-coral-100 border-coral-300 text-coral-800',
    blurb: 'Our team needs a few things updated before we can publish your profile — see the note below.',
  },
  SUSPENDED: {
    label: 'Paused',
    tone: 'bg-coral-100 border-coral-400 text-coral-900',
    blurb: 'Your profile is currently paused from the directory. Contact us if you believe this is a mistake.',
  },
};

export default function TherapistProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data, isLoading, error, mutate } = useApi<Profile | null>('/therapist-profile');

  const canManage =
    user?.role === 'THERAPIST' || user?.role === 'DOCTOR' || user?.role === 'SPECIAL_EDUCATOR';

  // First-timer routing: if the practitioner hasn't started a profile yet,
  // send them to the guided wizard instead of the long-form editor.
  useEffect(() => {
    if (!isLoading && canManage && data == null) {
      router.replace('/therapist/onboarding');
    }
  }, [isLoading, canManage, data, router]);

  if (!canManage) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl text-sage-900">Therapist profile</h1>
        <p className="text-sage-600 mt-2">
          This page is for verified practitioners. Sign in with a therapist, doctor, or special
          educator account to manage your directory listing.
        </p>
      </div>
    );
  }

  return (
    <ApiState loading={isLoading} error={error} isEmpty={false} onRetry={() => mutate()}>
      {data ? (
        <ProfileForm initial={data} onSaved={() => mutate()} />
      ) : (
        // Momentary state while the redirect above fires.
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl text-sage-900">Starting your profile…</h1>
          <p className="text-sage-600 mt-2">
            Taking you to the guided onboarding.{' '}
            <Link href="/therapist/onboarding" className="underline">Continue →</Link>
          </p>
        </div>
      )}
    </ApiState>
  );
}

function ProfileForm({
  initial,
  onSaved,
}: {
  initial: Profile | null;
  onSaved: () => void;
}) {
  const [specialization, setSpecialization] = useState(initial?.specialization ?? '');
  const [yearsExperience, setYearsExperience] = useState(initial?.yearsExperience ?? 0);
  const [bio, setBio] = useState(initial?.bio ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [state, setState] = useState(initial?.state ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(initial?.linkedinUrl ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(initial?.websiteUrl ?? '');
  const [availability, setAvailability] = useState(initial?.availability ?? '');
  const [languages, setLanguages] = useState<string[]>(initial?.languages ?? ['EN']);
  const [serviceModes, setServiceModes] = useState<Mode[]>(initial?.serviceModes ?? ['ONLINE']);
  const [acceptingNewClients, setAcceptingNewClients] = useState(initial?.acceptingNewClients ?? true);
  const [hourlyRateRupees, setHourlyRateRupees] = useState<string>(
    initial?.hourlyRate ? String(initial.hourlyRate / 100) : '',
  );
  const [ageGroups, setAgeGroups] = useState<string[]>(initial?.ageGroups ?? []);
  const [level, setLevel] = useState<Level | ''>(initial?.level ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Sync when server sends fresh data (e.g., after submit-for-review).
    if (!initial) return;
    setSpecialization(initial.specialization);
    setYearsExperience(initial.yearsExperience);
    setBio(initial.bio ?? '');
    setCity(initial.city ?? '');
    setState(initial.state ?? '');
    setLinkedinUrl(initial.linkedinUrl ?? '');
    setWebsiteUrl(initial.websiteUrl ?? '');
    setAvailability(initial.availability ?? '');
    setLanguages(initial.languages);
    setServiceModes(initial.serviceModes);
    setAcceptingNewClients(initial.acceptingNewClients);
    setHourlyRateRupees(initial.hourlyRate ? String(initial.hourlyRate / 100) : '');
    setAgeGroups(initial.ageGroups);
    setLevel(initial.level ?? '');
  }, [initial?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api('/therapist-profile', {
        method: 'POST',
        body: {
          specialization,
          yearsExperience: Number(yearsExperience) || 0,
          bio: bio || undefined,
          city: city || undefined,
          state: state || undefined,
          linkedinUrl: linkedinUrl || undefined,
          websiteUrl: websiteUrl || undefined,
          availability: availability || undefined,
          languages,
          serviceModes,
          acceptingNewClients,
          hourlyRate: hourlyRateRupees ? Math.round(Number(hourlyRateRupees) * 100) : undefined,
          ageGroups,
          level: level || undefined,
        },
      });
      onSaved();
    } catch (e: any) {
      setErr(e?.message ?? 'Could not save profile');
    } finally {
      setBusy(false);
    }
  }

  async function submitForReview() {
    setBusy(true);
    setErr(null);
    try {
      await api('/therapist-profile/submit', { method: 'POST' });
      onSaved();
    } catch (e: any) {
      setErr(e?.message ?? 'Could not submit');
    } finally {
      setBusy(false);
    }
  }

  const status = initial?.verificationStatus ?? 'DRAFT';
  const statusMeta = STATUS_META[status];

  function toggleFrom<T>(list: T[], v: T): T[] {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <p className="text-sage-500 text-sm uppercase tracking-wider">Practitioner</p>
        <h1 className="font-display text-4xl text-sage-900 mt-2">Your therapist profile</h1>
        <p className="text-sage-600 mt-2">
          Parents can only find and invite you once your profile is verified. This is the trust
          surface of the whole platform — the more complete you are, the faster the review.
        </p>
      </header>

      <div className={`rounded-2xl border-2 p-4 ${statusMeta.tone}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="chip bg-white/60 border border-current/20 font-medium">
            Status · {statusMeta.label}
          </span>
          {initial?.submittedAt && (
            <span className="text-xs opacity-80">
              Submitted {new Date(initial.submittedAt).toLocaleDateString('en-IN')}
            </span>
          )}
          {initial?.verifiedAt && (
            <span className="text-xs opacity-80">
              Verified {new Date(initial.verifiedAt).toLocaleDateString('en-IN')}
            </span>
          )}
        </div>
        <p className="text-sm mt-2">{statusMeta.blurb}</p>
        {initial?.rejectionReason && status === 'REJECTED' && (
          <p className="text-sm mt-2 bg-white/50 rounded-lg p-2">
            <strong>Reviewer note:</strong> {initial.rejectionReason}
          </p>
        )}
        {(status === 'DRAFT' || status === 'REJECTED') && initial && (
          <button
            type="button"
            onClick={submitForReview}
            disabled={busy}
            className="btn-primary text-sm mt-3"
          >
            {busy ? 'Submitting…' : status === 'REJECTED' ? 'Resubmit for review' : 'Submit for review'}
          </button>
        )}
      </div>

      <form onSubmit={save} className="card border border-sage-100 space-y-4">
        <h2 className="font-display text-xl text-sage-900">1. Basics</h2>
        <Field label="Primary specialisation" required>
          <input
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            required
            maxLength={120}
            placeholder="e.g. Speech-Language Pathology"
            className="input"
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Years of experience" required>
            <input
              type="number"
              min={0}
              max={70}
              value={yearsExperience}
              onChange={(e) => setYearsExperience(Number(e.target.value))}
              required
              className="input"
            />
          </Field>
          <Field label="Hourly rate (₹, optional)">
            <input
              type="number"
              min={0}
              value={hourlyRateRupees}
              onChange={(e) => setHourlyRateRupees(e.target.value)}
              placeholder="1500"
              className="input"
            />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="City">
            <input value={city} onChange={(e) => setCity(e.target.value)} className="input" placeholder="Bengaluru" />
          </Field>
          <Field label="State">
            <input value={state} onChange={(e) => setState(e.target.value)} className="input" placeholder="Karnataka" />
          </Field>
        </div>
        <Field label="About you">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={3000}
            placeholder="Approach, populations you serve, what parents can expect from a session…"
            className="input"
          />
        </Field>
        <Field label="Availability">
          <input
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className="input"
            placeholder="Mon–Fri 5–8pm; Sat 10am–2pm"
          />
        </Field>
        <ChipGroup
          label="Languages"
          all={['EN', 'HI', 'TA', 'TE', 'KN', 'ML', 'MR', 'BN', 'GU']}
          selected={languages}
          onToggle={(v) => setLanguages(toggleFrom(languages, v))}
        />
        <ChipGroup
          label="Session format"
          all={['ONLINE', 'IN_PERSON', 'HYBRID']}
          selected={serviceModes}
          labels={{ ONLINE: '💻 Online', IN_PERSON: '📍 In person', HYBRID: '↔ Hybrid' }}
          onToggle={(v) => setServiceModes(toggleFrom(serviceModes, v as Mode))}
        />
        <ChipGroup
          label="Age groups"
          all={['0-3', '4-7', '8-12', '13-18', '18+']}
          selected={ageGroups}
          onToggle={(v) => setAgeGroups(toggleFrom(ageGroups, v))}
        />

        <div>
          <div className="text-xs text-sage-500 uppercase tracking-wider mb-1">
            Certification level <span className="normal-case text-sage-400">(ABA — optional)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setLevel('')}
              className={`chip text-xs transition-colors ${
                level === '' ? 'bg-sage-600 text-cream-50' : 'bg-cream-100 text-sage-700 hover:bg-sage-100'
              }`}
            >
              Not applicable
            </button>
            {LEVEL_ORDER.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                title={LEVEL_META[l].long}
                className={`chip text-xs transition-colors ${
                  level === l ? 'bg-sage-600 text-cream-50' : 'bg-cream-100 text-sage-700 hover:bg-sage-100'
                }`}
              >
                {LEVEL_META[l].short}
              </button>
            ))}
          </div>
        </div>

        <h2 className="font-display text-xl text-sage-900 pt-4">2. Verification links</h2>
        <Field label="LinkedIn profile URL">
          <input
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            className="input"
            placeholder="https://www.linkedin.com/in/…"
          />
        </Field>
        <Field label="Website / clinic page (optional)">
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className="input"
            placeholder="https://…"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-sage-700">
          <input
            type="checkbox"
            checked={acceptingNewClients}
            onChange={(e) => setAcceptingNewClients(e.target.checked)}
          />
          Accepting new clients
        </label>

        {err && <p className="text-sm text-coral-700">{err}</p>}
        <div className="flex gap-2 pt-2 border-t border-sage-100">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>

      {initial && (
        <>
          <EducationList profile={initial} onChanged={onSaved} />
          <CertificationList profile={initial} onChanged={onSaved} />
        </>
      )}

      <style jsx>{`
        .input {
          margin-top: 4px;
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgb(210 220 210);
          background: #fbf9f4;
          padding: 8px 12px;
          font-size: 14px;
          color: rgb(31 46 34);
        }
        .input:focus { outline: 2px solid rgb(90 130 100); outline-offset: 0; border-color: transparent; }
      `}</style>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-xs text-sage-500 uppercase tracking-wider">
        {label}{required && <span className="text-coral-500 ml-1">*</span>}
      </span>
      {children}
    </label>
  );
}

function ChipGroup({
  label,
  all,
  selected,
  labels,
  onToggle,
}: {
  label: string;
  all: string[];
  selected: string[];
  labels?: Record<string, string>;
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-xs text-sage-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="flex flex-wrap gap-2">
        {all.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onToggle(v)}
            className={`chip text-xs transition-colors ${
              selected.includes(v)
                ? 'bg-sage-600 text-cream-50'
                : 'bg-cream-100 text-sage-700 hover:bg-sage-100'
            }`}
          >
            {labels?.[v] ?? v}
          </button>
        ))}
      </div>
    </div>
  );
}

function EducationList({ profile, onChanged }: { profile: Profile; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  return (
    <section className="card border border-sage-100">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl text-sage-900">3. Education</h2>
        <button type="button" onClick={() => setAdding((v) => !v)} className="btn-ghost text-sm">
          {adding ? 'Close' : '+ Add education'}
        </button>
      </div>
      {adding && (
        <EducationForm
          profileHasNone={profile.educations.length === 0}
          onDone={() => { setAdding(false); onChanged(); }}
        />
      )}
      {profile.educations.length === 0 ? (
        <p className="text-sm text-sage-500 italic">Add at least one education row (degree + institution).</p>
      ) : (
        <ul className="space-y-2 mt-2">
          {profile.educations.map((e) => (
            <li key={e.id} className="text-sm flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-sage-900">{e.degree}{e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ''}</div>
                <div className="text-sage-600">{e.institution}{e.yearCompleted ? ` · ${e.yearCompleted}` : ''}</div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm('Remove this education row?')) return;
                  await api(`/therapist-profile/educations/${e.id}`, { method: 'DELETE' });
                  onChanged();
                }}
                className="text-xs text-sage-500 hover:text-coral-700"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EducationForm({ profileHasNone, onDone }: { profileHasNone: boolean; onDone: () => void }) {
  const [degree, setDegree] = useState('');
  const [institution, setInstitution] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [yearCompleted, setYearCompleted] = useState<string>('');
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api('/therapist-profile/educations', {
            method: 'POST',
            body: {
              degree,
              institution,
              fieldOfStudy: fieldOfStudy || undefined,
              yearCompleted: yearCompleted ? Number(yearCompleted) : undefined,
            },
          });
          onDone();
        } finally { setBusy(false); }
      }}
      className="bg-cream-100 rounded-xl p-3 space-y-3 mb-3"
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <input required value={degree} onChange={(e) => setDegree(e.target.value)} maxLength={80} placeholder="Degree (e.g. MSc, BASLP)" className="rounded-lg border border-sage-200 bg-cream-50 px-3 py-2 text-sm" />
        <input value={fieldOfStudy} onChange={(e) => setFieldOfStudy(e.target.value)} maxLength={200} placeholder="Field of study" className="rounded-lg border border-sage-200 bg-cream-50 px-3 py-2 text-sm" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input required value={institution} onChange={(e) => setInstitution(e.target.value)} maxLength={200} placeholder="Institution (e.g. AIISH Mysuru)" className="rounded-lg border border-sage-200 bg-cream-50 px-3 py-2 text-sm" />
        <input type="number" min={1950} max={2100} value={yearCompleted} onChange={(e) => setYearCompleted(e.target.value)} placeholder="Year completed" className="rounded-lg border border-sage-200 bg-cream-50 px-3 py-2 text-sm" />
      </div>
      <button type="submit" disabled={busy} className="btn-primary text-sm">
        {busy ? 'Adding…' : profileHasNone ? 'Add first education' : 'Add education'}
      </button>
    </form>
  );
}

function CertificationList({ profile, onChanged }: { profile: Profile; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  return (
    <section className="card border border-sage-100">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl text-sage-900">4. Certifications</h2>
        <button type="button" onClick={() => setAdding((v) => !v)} className="btn-ghost text-sm">
          {adding ? 'Close' : '+ Add certification'}
        </button>
      </div>
      {adding && <CertForm onDone={() => { setAdding(false); onChanged(); }} />}
      {profile.certifications.length === 0 ? (
        <p className="text-sm text-sage-500 italic">
          RCI registration is the most important one for Indian practitioners — add it here with
          your registration number and the RCI register URL so the reviewer can verify quickly.
        </p>
      ) : (
        <ul className="space-y-2 mt-2">
          {profile.certifications.map((c) => (
            <li key={c.id} className="text-sm flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-sage-900">{c.name}</div>
                <div className="text-sage-600">
                  {c.issuingOrganization}{c.credentialId ? ` · #${c.credentialId}` : ''}
                </div>
                {c.credentialUrl && (
                  <a href={c.credentialUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-sage-500 hover:text-sage-800">
                    Verification link
                  </a>
                )}
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm('Remove this certification?')) return;
                  await api(`/therapist-profile/certifications/${c.id}`, { method: 'DELETE' });
                  onChanged();
                }}
                className="text-xs text-sage-500 hover:text-coral-700"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CertForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [issuingOrganization, setIssuingOrganization] = useState('');
  const [credentialId, setCredentialId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [credentialUrl, setCredentialUrl] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api('/therapist-profile/certifications', {
            method: 'POST',
            body: {
              name,
              issuingOrganization,
              credentialId: credentialId || undefined,
              issueDate: issueDate || undefined,
              expiryDate: expiryDate || undefined,
              credentialUrl: credentialUrl || undefined,
            },
          });
          onDone();
        } finally { setBusy(false); }
      }}
      className="bg-cream-100 rounded-xl p-3 space-y-3 mb-3"
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <input required value={name} onChange={(e) => setName(e.target.value)} maxLength={200} placeholder="Certification name (e.g. RCI Registration)" className="rounded-lg border border-sage-200 bg-cream-50 px-3 py-2 text-sm" />
        <input required value={issuingOrganization} onChange={(e) => setIssuingOrganization(e.target.value)} maxLength={200} placeholder="Issuing organisation" className="rounded-lg border border-sage-200 bg-cream-50 px-3 py-2 text-sm" />
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <input value={credentialId} onChange={(e) => setCredentialId(e.target.value)} maxLength={120} placeholder="Credential ID / number" className="rounded-lg border border-sage-200 bg-cream-50 px-3 py-2 text-sm" />
        <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="rounded-lg border border-sage-200 bg-cream-50 px-3 py-2 text-sm" />
        <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="rounded-lg border border-sage-200 bg-cream-50 px-3 py-2 text-sm" />
      </div>
      <input type="url" value={credentialUrl} onChange={(e) => setCredentialUrl(e.target.value)} maxLength={500} placeholder="Verification URL (e.g. RCI public register entry)" className="w-full rounded-lg border border-sage-200 bg-cream-50 px-3 py-2 text-sm" />
      <button type="submit" disabled={busy} className="btn-primary text-sm">
        {busy ? 'Adding…' : 'Add certification'}
      </button>
    </form>
  );
}
