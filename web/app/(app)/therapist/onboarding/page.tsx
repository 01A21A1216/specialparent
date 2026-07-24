'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../../components/auth-provider';
import { api } from '../../../../lib/api';
import { useApi, mutateGlobal } from '../../../../lib/swr';
import { ApiState } from '../../../../components/api-state';
import { LANGUAGE_CODES, LANGUAGE_LABEL } from '../../../../lib/languages';

// Guided 4-step onboarding wizard for a newly-registered practitioner.
// This exists next to /therapist/profile — the profile page is the
// long-form editor; this wizard is the first-run experience that walks
// them from empty state to "Submitted for review" without them having
// to figure out the shape of the whole form.

type Mode = 'ONLINE' | 'IN_PERSON' | 'HYBRID';
type Status = 'DRAFT' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
type Level = 'INTERN' | 'RBT' | 'BCABA' | 'BCBA';
type StepId = 'basics' | 'practice' | 'education' | 'credentials' | 'submit';

// Ordered lowest → highest for display; use the short label as the chip text.
const LEVEL_ORDER: Level[] = ['INTERN', 'RBT', 'BCABA', 'BCBA'];
const LEVEL_META: Record<Level, { short: string; long: string }> = {
  INTERN: { short: 'Intern', long: 'Intern / Trainee (supervised)' },
  RBT:    { short: 'RBT',    long: 'Registered Behavior Technician' },
  BCABA:  { short: 'BCaBA',  long: 'Board Certified Assistant Behavior Analyst' },
  BCBA:   { short: 'BCBA',   long: 'Board Certified Behavior Analyst' },
};

interface Education {
  id: string; degree: string; institution: string;
  fieldOfStudy: string | null; yearCompleted: number | null;
}
interface Certification {
  id: string; name: string; issuingOrganization: string;
  credentialId: string | null; credentialUrl: string | null;
}
interface Profile {
  id: string;
  specialization: string;
  yearsExperience: number;
  bio: string | null;
  hourlyRate: number | null;
  languages: string[];
  serviceModes: Mode[];
  city: string | null;
  state: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  availability: string | null;
  acceptingNewClients: boolean;
  ageGroups: string[];
  level: Level | null;
  verificationStatus: Status;
  updatedAt: string;
  educations: Education[];
  certifications: Certification[];
}

const STEPS: { id: StepId; label: string; blurb: string }[] = [
  { id: 'basics', label: 'Basics', blurb: 'Who you are and what you specialise in.' },
  { id: 'practice', label: 'Practice', blurb: 'How, where, and to whom you deliver care.' },
  { id: 'education', label: 'Education', blurb: 'Where you trained — we cross-check every entry.' },
  { id: 'credentials', label: 'Credentials', blurb: 'RCI registration + any other certifications.' },
  { id: 'submit', label: 'Review &amp; submit', blurb: 'Send your profile to the review queue.' },
];

export default function OnboardingWizardPage() {
  const { user, loading: authLoading } = useAuth();
  const search = useSearchParams();
  const router = useRouter();
  const rawStep = (search?.get('step') ?? 'basics') as StepId;
  const step: StepId = STEPS.some((s) => s.id === rawStep) ? rawStep : 'basics';
  const { data: profile, isLoading, error, mutate } = useApi<Profile | null>('/therapist-profile');

  useEffect(() => {
    if (!authLoading && user && !['THERAPIST', 'DOCTOR', 'SPECIAL_EDUCATOR'].includes(user.role)) {
      // Non-practitioners have no reason to be on this screen.
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  // Once the profile is VERIFIED, drop them into the edit view.
  useEffect(() => {
    if (profile?.verificationStatus === 'VERIFIED') {
      router.replace('/therapist/profile');
    }
  }, [profile?.verificationStatus, router]);

  const goTo = (next: StepId) => router.replace(`/therapist/onboarding?step=${next}`);

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <p className="text-sage-500 text-sm uppercase tracking-wider">Welcome</p>
        <h1 className="font-display text-4xl text-sage-900 mt-2">
          Let&rsquo;s set up your therapist profile
        </h1>
        <p className="text-sage-600 mt-2 max-w-2xl">
          Parents can only discover and invite you once your profile is verified by our team.
          This should take about 10 minutes. You can save and come back any time.
        </p>
      </header>

      <ApiState loading={authLoading || isLoading} error={error} isEmpty={false} onRetry={() => mutate()}>
        <>
          <Progress current={step} profile={profile ?? null} />

          <div className="card border border-sage-100">
            {step === 'basics' && (
              <BasicsStep profile={profile ?? null} onSaved={() => mutate()} onNext={() => goTo('practice')} />
            )}
            {step === 'practice' && (
              <PracticeStep profile={profile ?? null} onSaved={() => mutate()} onBack={() => goTo('basics')} onNext={() => goTo('education')} />
            )}
            {step === 'education' && (
              <EducationStep profile={profile ?? null} onSaved={() => mutate()} onBack={() => goTo('practice')} onNext={() => goTo('credentials')} />
            )}
            {step === 'credentials' && (
              <CredentialsStep profile={profile ?? null} onSaved={() => mutate()} onBack={() => goTo('education')} onNext={() => goTo('submit')} />
            )}
            {step === 'submit' && (
              <SubmitStep profile={profile ?? null} onSubmitted={() => mutate()} onBack={() => goTo('credentials')} />
            )}
          </div>

          <p className="text-xs text-sage-500 text-center">
            Prefer the long-form editor? <Link href="/therapist/profile" className="underline">Open the full profile page</Link>.
          </p>
        </>
      </ApiState>
    </div>
  );
}

// ─── Progress rail ─────────────────────────────────────────────

function Progress({ current, profile }: { current: StepId; profile: Profile | null }) {
  const done = useMemo(() => ({
    basics: !!(profile?.specialization && profile.yearsExperience >= 0 && profile.city),
    practice: !!(profile?.languages?.length && profile?.serviceModes?.length),
    education: !!profile?.educations?.length,
    credentials: !!(profile?.linkedinUrl || profile?.certifications?.length),
    submit: profile?.verificationStatus === 'PENDING_REVIEW' || profile?.verificationStatus === 'VERIFIED',
  }), [profile]);

  return (
    <ol className="flex items-center gap-1 flex-wrap text-xs">
      {STEPS.map((s, i) => {
        const isCurrent = s.id === current;
        const isDone = done[s.id];
        return (
          <li key={s.id} className="flex items-center gap-1">
            <span
              className={`chip whitespace-nowrap ${
                isCurrent
                  ? 'bg-sage-600 text-cream-50 border border-sage-600'
                  : isDone
                    ? 'bg-sage-100 text-sage-800 border border-sage-200'
                    : 'bg-cream-100 text-sage-600 border border-sage-100'
              }`}
            >
              <span className="tabular-nums opacity-70 mr-1">{i + 1}</span>
              {isDone && !isCurrent ? '✓ ' : ''}{s.label.replace('&amp;', '&')}
            </span>
            {i < STEPS.length - 1 && <span className="text-sage-300">·</span>}
          </li>
        );
      })}
    </ol>
  );
}

// ─── Step 1: Basics ────────────────────────────────────────────

function BasicsStep({
  profile, onSaved, onNext,
}: { profile: Profile | null; onSaved: () => void; onNext: () => void }) {
  const [specialization, setSpecialization] = useState(profile?.specialization ?? '');
  const [yearsExperience, setYearsExperience] = useState(profile?.yearsExperience ?? 0);
  const [city, setCity] = useState(profile?.city ?? '');
  const [state, setState] = useState(profile?.state ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [level, setLevel] = useState<Level | ''>(profile?.level ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(andThen: 'next' | 'stay') {
    setBusy(true); setErr(null);
    try {
      await api('/therapist-profile', { method: 'POST', body: {
        specialization,
        yearsExperience: Number(yearsExperience) || 0,
        city: city || undefined,
        state: state || undefined,
        bio: bio || undefined,
        level: level || undefined,
        // Preserve any values from later steps so a save here doesn't wipe them.
        languages: profile?.languages ?? [],
        serviceModes: profile?.serviceModes ?? [],
        ageGroups: profile?.ageGroups ?? [],
        acceptingNewClients: profile?.acceptingNewClients ?? true,
        linkedinUrl: profile?.linkedinUrl ?? undefined,
        websiteUrl: profile?.websiteUrl ?? undefined,
        availability: profile?.availability ?? undefined,
        hourlyRate: profile?.hourlyRate ?? undefined,
      }});
      onSaved();
      if (andThen === 'next') onNext();
    } catch (e: any) { setErr(e?.message ?? 'Save failed'); }
    finally { setBusy(false); }
  }

  return (
    <StepFrame title="1. Basics" blurb={STEPS[0].blurb}>
      <Field label="Primary specialisation" required>
        <input
          value={specialization}
          onChange={(e) => setSpecialization(e.target.value)}
          required
          maxLength={120}
          placeholder="e.g. Speech-Language Pathology, Occupational Therapy, Applied Behaviour Analysis"
          className="input"
        />
      </Field>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Years of experience" required>
          <input
            type="number" min={0} max={70}
            value={yearsExperience}
            onChange={(e) => setYearsExperience(Number(e.target.value))}
            required
            className="input"
          />
        </Field>
        <Field label="City" required>
          <input value={city} onChange={(e) => setCity(e.target.value)} required maxLength={80} placeholder="Bengaluru" className="input" />
        </Field>
        <Field label="State">
          <input value={state} onChange={(e) => setState(e.target.value)} maxLength={80} placeholder="Karnataka" className="input" />
        </Field>
      </div>
      <div>
        <div className="text-xs text-sage-500 uppercase tracking-wider mb-1">
          Certification level <span className="normal-case text-sage-400">(ABA practitioners — leave blank if not applicable)</span>
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
      <Field label="A short bio">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={3000}
          placeholder="Approach, populations you serve, what a first session with you looks like…"
          className="input"
        />
      </Field>
      {err && <p className="text-sm text-coral-700">{err}</p>}
      <StepNav busy={busy}
        onSaveNext={() => save('next')}
        onSaveStay={() => save('stay')}
        nextDisabled={!specialization.trim() || !city.trim()}
      />
      <StepInputStyles />
    </StepFrame>
  );
}

// ─── Step 2: Practice ──────────────────────────────────────────

function PracticeStep({
  profile, onSaved, onBack, onNext,
}: { profile: Profile | null; onSaved: () => void; onBack: () => void; onNext: () => void }) {
  const [languages, setLanguages] = useState<string[]>(profile?.languages ?? ['EN']);
  const [serviceModes, setServiceModes] = useState<Mode[]>(profile?.serviceModes ?? ['ONLINE']);
  const [ageGroups, setAgeGroups] = useState<string[]>(profile?.ageGroups ?? []);
  const [availability, setAvailability] = useState(profile?.availability ?? '');
  const [hourlyRateRupees, setHourlyRateRupees] = useState<string>(
    profile?.hourlyRate ? String(profile.hourlyRate / 100) : '',
  );
  const [acceptingNewClients, setAcceptingNewClients] = useState(profile?.acceptingNewClients ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = <T,>(list: T[], v: T) => list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  async function save(andThen: 'next' | 'stay') {
    if (!profile) { setErr('Save the Basics step first.'); return; }
    setBusy(true); setErr(null);
    try {
      await api('/therapist-profile', { method: 'POST', body: {
        specialization: profile.specialization,
        yearsExperience: profile.yearsExperience,
        city: profile.city ?? undefined,
        state: profile.state ?? undefined,
        bio: profile.bio ?? undefined,
        level: profile.level ?? undefined,
        languages,
        serviceModes,
        ageGroups,
        availability: availability || undefined,
        acceptingNewClients,
        hourlyRate: hourlyRateRupees ? Math.round(Number(hourlyRateRupees) * 100) : undefined,
        linkedinUrl: profile.linkedinUrl ?? undefined,
        websiteUrl: profile.websiteUrl ?? undefined,
      }});
      onSaved();
      if (andThen === 'next') onNext();
    } catch (e: any) { setErr(e?.message ?? 'Save failed'); }
    finally { setBusy(false); }
  }

  return (
    <StepFrame title="2. Practice details" blurb={STEPS[1].blurb}>
      <ChipGroup
        label="Languages you deliver care in"
        all={[...LANGUAGE_CODES]}
        labels={LANGUAGE_LABEL}
        selected={languages}
        onToggle={(v) => setLanguages(toggle(languages, v))}
      />
      <ChipGroup
        label="Session format"
        all={['ONLINE', 'IN_PERSON', 'HYBRID']}
        selected={serviceModes}
        labels={{ ONLINE: '💻 Online', IN_PERSON: '📍 In person', HYBRID: '↔ Hybrid' }}
        onToggle={(v) => setServiceModes(toggle(serviceModes, v as Mode))}
      />
      <ChipGroup
        label="Age groups you work with"
        all={['0-3', '4-7', '8-12', '13-18', '18+']}
        selected={ageGroups}
        onToggle={(v) => setAgeGroups(toggle(ageGroups, v))}
      />
      <Field label="Availability (free text — parents see this)">
        <input
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          className="input"
          placeholder="Mon–Fri 5–8pm; Sat 10am–2pm"
        />
      </Field>
      <Field label="Hourly rate (₹, optional)">
        <input
          type="number" min={0}
          value={hourlyRateRupees}
          onChange={(e) => setHourlyRateRupees(e.target.value)}
          className="input"
          placeholder="1500"
        />
      </Field>
      <label className="flex items-center gap-2 text-sm text-sage-700">
        <input type="checkbox" checked={acceptingNewClients} onChange={(e) => setAcceptingNewClients(e.target.checked)} />
        Accepting new clients
      </label>
      {err && <p className="text-sm text-coral-700">{err}</p>}
      <StepNav busy={busy} onBack={onBack} onSaveNext={() => save('next')} onSaveStay={() => save('stay')}
        nextDisabled={languages.length === 0 || serviceModes.length === 0}
      />
      <StepInputStyles />
    </StepFrame>
  );
}

// ─── Step 3: Education ─────────────────────────────────────────

function EducationStep({
  profile, onSaved, onBack, onNext,
}: { profile: Profile | null; onSaved: () => void; onBack: () => void; onNext: () => void }) {
  return (
    <StepFrame title="3. Education" blurb={STEPS[2].blurb}>
      <p className="text-sm text-sage-600">
        Add at least one entry. Include the highest relevant qualification for your specialisation
        (e.g. MASLP for SLP, MOT for OT, PhD in Clinical Psychology, etc.).
      </p>
      {profile && (
        <>
          <ExistingEducations profile={profile} onChanged={onSaved} />
          <NewEducationForm onAdded={onSaved} />
        </>
      )}
      <StepNav busy={false} onBack={onBack} onSaveNext={onNext} nextDisabled={!profile?.educations.length} nextLabel="Next → Credentials" />
    </StepFrame>
  );
}

function ExistingEducations({ profile, onChanged }: { profile: Profile; onChanged: () => void }) {
  if (profile.educations.length === 0) {
    return <p className="text-sm text-sage-500 italic">Add your first education entry below.</p>;
  }
  return (
    <ul className="space-y-2">
      {profile.educations.map((e) => (
        <li key={e.id} className="text-sm flex items-start justify-between gap-3 rounded-lg bg-cream-50 border border-sage-100 p-3">
          <div>
            <div className="font-medium text-sage-900">
              {e.degree}{e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ''}
            </div>
            <div className="text-sage-600">
              {e.institution}{e.yearCompleted ? ` · ${e.yearCompleted}` : ''}
            </div>
          </div>
          <button
            type="button"
            className="text-xs text-sage-500 hover:text-coral-700"
            onClick={async () => {
              if (!confirm('Remove this education entry?')) return;
              await api(`/therapist-profile/educations/${e.id}`, { method: 'DELETE' });
              onChanged();
            }}
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}

function NewEducationForm({ onAdded }: { onAdded: () => void }) {
  const [degree, setDegree] = useState('');
  const [institution, setInstitution] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [yearCompleted, setYearCompleted] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await api('/therapist-profile/educations', { method: 'POST', body: {
        degree, institution,
        fieldOfStudy: fieldOfStudy || undefined,
        yearCompleted: yearCompleted ? Number(yearCompleted) : undefined,
      }});
      setDegree(''); setInstitution(''); setFieldOfStudy(''); setYearCompleted('');
      onAdded();
    } catch (e: any) { setErr(e?.message ?? 'Could not add'); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={add} className="rounded-xl border border-dashed border-sage-200 p-3 space-y-3">
      <div className="text-xs text-sage-500 uppercase tracking-wider">+ Add education</div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input required value={degree} onChange={(e) => setDegree(e.target.value)} maxLength={80} placeholder="Degree (MSc / MASLP / MOT / …)" className="input" />
        <input value={fieldOfStudy} onChange={(e) => setFieldOfStudy(e.target.value)} maxLength={200} placeholder="Field of study" className="input" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input required value={institution} onChange={(e) => setInstitution(e.target.value)} maxLength={200} placeholder="Institution (e.g. AIISH Mysuru)" className="input" />
        <input type="number" min={1950} max={2100} value={yearCompleted} onChange={(e) => setYearCompleted(e.target.value)} placeholder="Year completed" className="input" />
      </div>
      {err && <p className="text-sm text-coral-700">{err}</p>}
      <button type="submit" disabled={busy} className="btn-primary text-sm">
        {busy ? 'Adding…' : 'Add entry'}
      </button>
      <StepInputStyles />
    </form>
  );
}

// ─── Step 4: Credentials (LinkedIn + certifications) ───────────

function CredentialsStep({
  profile, onSaved, onBack, onNext,
}: { profile: Profile | null; onSaved: () => void; onBack: () => void; onNext: () => void }) {
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedinUrl ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(profile?.websiteUrl ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function saveLinks() {
    if (!profile) return;
    setBusy(true); setErr(null);
    try {
      await api('/therapist-profile', { method: 'POST', body: {
        specialization: profile.specialization,
        yearsExperience: profile.yearsExperience,
        city: profile.city ?? undefined,
        state: profile.state ?? undefined,
        bio: profile.bio ?? undefined,
        level: profile.level ?? undefined,
        languages: profile.languages,
        serviceModes: profile.serviceModes,
        ageGroups: profile.ageGroups,
        acceptingNewClients: profile.acceptingNewClients,
        availability: profile.availability ?? undefined,
        hourlyRate: profile.hourlyRate ?? undefined,
        linkedinUrl: linkedinUrl || undefined,
        websiteUrl: websiteUrl || undefined,
      }});
      onSaved();
    } catch (e: any) { setErr(e?.message ?? 'Save failed'); }
    finally { setBusy(false); }
  }

  const nextDisabled = !((profile?.linkedinUrl || linkedinUrl) || (profile?.certifications?.length ?? 0) > 0);

  return (
    <StepFrame title="4. Credentials" blurb={STEPS[3].blurb}>
      <div className="rounded-lg bg-cream-100 border border-cream-300 p-3 text-sm text-sage-800">
        Our reviewer will cross-check either your LinkedIn profile <em>or</em> at least one
        certification. Adding both speeds up the review.
      </div>
      <Field label="LinkedIn profile URL">
        <input
          type="url"
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          onBlur={saveLinks}
          className="input"
          placeholder="https://www.linkedin.com/in/…"
        />
      </Field>
      <Field label="Website / clinic page (optional)">
        <input
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          onBlur={saveLinks}
          className="input"
          placeholder="https://…"
        />
      </Field>

      <div className="pt-3 border-t border-sage-100">
        <div className="font-medium text-sage-900 mb-1">Certifications</div>
        <p className="text-sm text-sage-600 mb-3">
          RCI registration is the most important one for Indian practitioners. Include your
          registration number and a link to your RCI public-register entry — the reviewer will
          verify against the register.
        </p>
        {profile && (
          <>
            <ExistingCertifications profile={profile} onChanged={onSaved} />
            <NewCertificationForm onAdded={onSaved} />
          </>
        )}
      </div>

      {err && <p className="text-sm text-coral-700">{err}</p>}
      <StepNav busy={busy} onBack={onBack} onSaveNext={onNext} nextDisabled={nextDisabled} nextLabel="Next → Review" />
      <StepInputStyles />
    </StepFrame>
  );
}

function ExistingCertifications({ profile, onChanged }: { profile: Profile; onChanged: () => void }) {
  if (profile.certifications.length === 0) {
    return <p className="text-sm text-sage-500 italic mb-3">No certifications added yet.</p>;
  }
  return (
    <ul className="space-y-2 mb-3">
      {profile.certifications.map((c) => (
        <li key={c.id} className="text-sm flex items-start justify-between gap-3 rounded-lg bg-cream-50 border border-sage-100 p-3">
          <div>
            <div className="font-medium text-sage-900">{c.name}</div>
            <div className="text-sage-600">
              {c.issuingOrganization}{c.credentialId ? ` · #${c.credentialId}` : ''}
            </div>
            {c.credentialUrl && (
              <a href={c.credentialUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-sage-500 hover:text-sage-800 underline">
                Verification link
              </a>
            )}
          </div>
          <button
            type="button"
            className="text-xs text-sage-500 hover:text-coral-700"
            onClick={async () => {
              if (!confirm('Remove this certification?')) return;
              await api(`/therapist-profile/certifications/${c.id}`, { method: 'DELETE' });
              onChanged();
            }}
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}

function NewCertificationForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState('');
  const [issuingOrganization, setIssuingOrganization] = useState('');
  const [credentialId, setCredentialId] = useState('');
  const [credentialUrl, setCredentialUrl] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await api('/therapist-profile/certifications', { method: 'POST', body: {
        name, issuingOrganization,
        credentialId: credentialId || undefined,
        credentialUrl: credentialUrl || undefined,
        issueDate: issueDate || undefined,
        expiryDate: expiryDate || undefined,
      }});
      setName(''); setIssuingOrganization(''); setCredentialId(''); setCredentialUrl(''); setIssueDate(''); setExpiryDate('');
      onAdded();
    } catch (e: any) { setErr(e?.message ?? 'Could not add'); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={add} className="rounded-xl border border-dashed border-sage-200 p-3 space-y-3">
      <div className="text-xs text-sage-500 uppercase tracking-wider">+ Add certification</div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input required value={name} onChange={(e) => setName(e.target.value)} maxLength={200} placeholder="Name (e.g. RCI Registration)" className="input" />
        <input required value={issuingOrganization} onChange={(e) => setIssuingOrganization(e.target.value)} maxLength={200} placeholder="Issuing organisation" className="input" />
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <input value={credentialId} onChange={(e) => setCredentialId(e.target.value)} maxLength={120} placeholder="Credential ID / number" className="input" />
        <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="input" />
        <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="input" />
      </div>
      <input type="url" value={credentialUrl} onChange={(e) => setCredentialUrl(e.target.value)} maxLength={500} placeholder="Verification URL (RCI public register entry, issuer's page)" className="input w-full" />
      {err && <p className="text-sm text-coral-700">{err}</p>}
      <button type="submit" disabled={busy} className="btn-primary text-sm">
        {busy ? 'Adding…' : 'Add certification'}
      </button>
      <StepInputStyles />
    </form>
  );
}

// ─── Step 5: Submit ────────────────────────────────────────────

function SubmitStep({
  profile, onSubmitted, onBack,
}: { profile: Profile | null; onSubmitted: () => void; onBack: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function submit() {
    setBusy(true); setErr(null);
    try {
      await api('/therapist-profile/submit', { method: 'POST' });
      onSubmitted();
      mutateGlobal('/therapist-profile');
      router.replace('/therapist/profile');
    } catch (e: any) { setErr(e?.message ?? 'Submit failed'); }
    finally { setBusy(false); }
  }

  if (!profile) {
    return (
      <StepFrame title="5. Review &amp; submit" blurb={STEPS[4].blurb}>
        <p className="text-sm text-sage-500">Save the earlier steps first.</p>
        <StepNav busy={false} onBack={onBack} />
      </StepFrame>
    );
  }

  const checks = [
    { label: 'Primary specialisation', ok: !!profile.specialization, note: profile.specialization || 'Missing' },
    { label: 'City', ok: !!profile.city, note: profile.city ?? 'Missing' },
    { label: 'At least one language', ok: profile.languages.length > 0, note: profile.languages.join(', ') || 'Missing' },
    { label: 'At least one session format', ok: profile.serviceModes.length > 0, note: profile.serviceModes.join(', ') || 'Missing' },
    { label: 'At least one education entry', ok: profile.educations.length > 0, note: `${profile.educations.length} entered` },
    { label: 'LinkedIn or at least one certification', ok: !!profile.linkedinUrl || profile.certifications.length > 0, note: profile.linkedinUrl ? 'LinkedIn provided' : `${profile.certifications.length} certification(s)` },
  ];
  const allOk = checks.every((c) => c.ok);

  return (
    <StepFrame title="5. Review &amp; submit" blurb={STEPS[4].blurb}>
      <ul className="space-y-2">
        {checks.map((c) => (
          <li key={c.label} className="flex items-start justify-between gap-3 text-sm rounded-lg bg-cream-50 border border-sage-100 p-3">
            <div>
              <div className="font-medium text-sage-900">{c.label}</div>
              <div className="text-sage-600">{c.note}</div>
            </div>
            <span className={`chip text-xs ${c.ok ? 'bg-sage-100 text-sage-800 border border-sage-200' : 'bg-coral-100 text-coral-800 border border-coral-200'}`}>
              {c.ok ? '✓ Ready' : '⚠ Needs input'}
            </span>
          </li>
        ))}
      </ul>

      <div className="rounded-lg bg-cream-100 border border-cream-300 p-3 text-sm text-sage-800">
        Once submitted, your profile enters our review queue (usually 2–5 working days). We check
        your LinkedIn, credential URLs, and any uploaded documents. If we need clarification we
        send a note back — you can edit and resubmit.
      </div>

      {err && <p className="text-sm text-coral-700">{err}</p>}
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onBack} className="btn-ghost">← Back</button>
        <button type="button" onClick={submit} disabled={busy || !allOk} className="btn-primary">
          {busy ? 'Submitting…' : 'Submit for review'}
        </button>
      </div>
    </StepFrame>
  );
}

// ─── Small building blocks ─────────────────────────────────────

function StepFrame({ title, blurb, children }: { title: string; blurb: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl text-sage-900">{title.replace('&amp;', '&')}</h2>
        <p className="text-sage-600 text-sm mt-0.5">{blurb.replace('&amp;', '&')}</p>
      </div>
      {children}
    </div>
  );
}

function StepNav({
  busy, onBack, onSaveNext, onSaveStay, nextDisabled, nextLabel,
}: {
  busy: boolean;
  onBack?: () => void;
  onSaveNext?: () => void;
  onSaveStay?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-2 border-t border-sage-100">
      {onBack && (
        <button type="button" onClick={onBack} className="btn-ghost text-sm">← Back</button>
      )}
      <div className="flex-1" />
      {onSaveStay && (
        <button type="button" onClick={onSaveStay} disabled={busy} className="btn-ghost text-sm">
          {busy ? 'Saving…' : 'Save & stay'}
        </button>
      )}
      {onSaveNext && (
        <button type="button" onClick={onSaveNext} disabled={busy || nextDisabled} className="btn-primary text-sm">
          {busy ? 'Saving…' : nextLabel ?? 'Save & continue →'}
        </button>
      )}
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
  label, all, selected, labels, onToggle,
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

function StepInputStyles() {
  return (
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
  );
}
