'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useApi } from '../../../../lib/swr';
import { ApiState } from '../../../../components/api-state';
import { useAuth } from '../../../../components/auth-provider';
import { api } from '../../../../lib/api';

// Public detail page for one verified therapist. When the viewer is a
// signed-in PARENT, we surface the "Invite to my child's care team" action.

type Mode = 'ONLINE' | 'IN_PERSON' | 'HYBRID';
type Level = 'INTERN' | 'RBT' | 'BCABA' | 'BCBA';

const LEVEL_META: Record<Level, { short: string; long: string; tone: string }> = {
  INTERN: { short: 'Intern', long: 'Intern / Trainee (supervised)',                          tone: 'bg-cream-100 text-sage-700 border border-cream-300' },
  RBT:    { short: 'RBT',    long: 'Registered Behavior Technician',                          tone: 'bg-mist-100 text-mist-800 border border-mist-300' },
  BCABA:  { short: 'BCaBA',  long: 'Board Certified Assistant Behavior Analyst',              tone: 'bg-sage-100 text-sage-800 border border-sage-300' },
  BCBA:   { short: 'BCBA',   long: 'Board Certified Behavior Analyst',                        tone: 'bg-coral-100 text-coral-800 border border-coral-300' },
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
}
interface Detail {
  id: string;
  fullName: string;
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
  verifiedAt: string | null;
  educations: Education[];
  certifications: Certification[];
}

interface ChildRow { id: string; fullName: string; }

export default function TherapistDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, isLoading, error, mutate } = useApi<Detail>(`/public/therapists/${params.id}`);
  const { data: children = [] } = useApi<ChildRow[]>(user?.role === 'PARENT' ? '/children' : null);

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/therapists"
        className="text-sm text-sage-600 hover:text-sage-900 inline-flex items-center gap-1"
      >
        ← Back to directory
      </Link>

      <ApiState
        loading={isLoading}
        error={error}
        isEmpty={!data}
        emptyTitle="Therapist not found."
        emptyBody="They may have removed their profile or paused new client intake."
        onRetry={() => mutate()}
      >
        {data && (
          <TherapistDetail
            t={data}
            viewerRole={user?.role ?? null}
            children={children}
          />
        )}
      </ApiState>
    </div>
  );
}

function TherapistDetail({
  t,
  viewerRole,
  children,
}: {
  t: Detail;
  viewerRole: string | null;
  children: ChildRow[];
}) {
  return (
    <>
      <header className="card border border-sage-100 space-y-4">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-20 h-20 rounded-full bg-coral-100 text-coral-700 grid place-items-center font-display text-2xl flex-shrink-0 overflow-hidden">
            {t.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              t.fullName
                .split(' ')
                .slice(0, 2)
                .map((n) => n[0])
                .join('')
                .toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="chip text-[11px] bg-sage-100 text-sage-800 border border-sage-200">
                ✓ Verified by SpecialParent.in
              </span>
              {t.level && (
                <span
                  className={`chip text-[11px] ${LEVEL_META[t.level].tone}`}
                  title={LEVEL_META[t.level].long}
                >
                  {LEVEL_META[t.level].short}
                </span>
              )}
              {!t.acceptingNewClients && (
                <span className="chip text-[11px] bg-coral-100 text-coral-800 border border-coral-200">
                  Waitlist only
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl text-sage-900 leading-tight">{t.fullName}</h1>
            <p className="text-sage-600 mt-0.5">
              {t.specialization} · {t.yearsExperience} years experience
            </p>
            {(t.city || t.state) && (
              <p className="text-sm text-sage-500 mt-0.5">
                📍 {[t.city, t.state].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>

        {viewerRole === 'PARENT' && (
          <InviteAction therapistProfileId={t.id} children={children} />
        )}
      </header>

      {t.bio && (
        <Section label="About">
          <p className="text-sage-700 leading-relaxed whitespace-pre-line">{t.bio}</p>
        </Section>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {t.availability && (
          <MiniCard label="Availability">
            <p className="text-sm text-sage-700 whitespace-pre-line">{t.availability}</p>
          </MiniCard>
        )}
        {t.serviceModes.length > 0 && (
          <MiniCard label="Format">
            <p className="text-sm text-sage-700">
              {t.serviceModes.map((m) =>
                m === 'ONLINE' ? '💻 Online' : m === 'IN_PERSON' ? '📍 In person' : '↔ Hybrid',
              ).join(' · ')}
            </p>
          </MiniCard>
        )}
        {t.languages.length > 0 && (
          <MiniCard label="Languages">
            <p className="text-sm text-sage-700">{t.languages.join(' · ')}</p>
          </MiniCard>
        )}
        {t.ageGroups.length > 0 && (
          <MiniCard label="Ages served">
            <p className="text-sm text-sage-700">{t.ageGroups.join(' · ')}</p>
          </MiniCard>
        )}
        {typeof t.hourlyRate === 'number' && (
          <MiniCard label="Rate">
            <p className="text-sm text-sage-700">₹{(t.hourlyRate / 100).toLocaleString('en-IN')} / hour</p>
          </MiniCard>
        )}
      </div>

      {t.educations.length > 0 && (
        <Section label="Education">
          <ul className="space-y-2">
            {t.educations.map((e) => (
              <li key={e.id} className="text-sm">
                <span className="font-medium text-sage-900">{e.degree}</span>
                {e.fieldOfStudy && <span className="text-sage-700">, {e.fieldOfStudy}</span>}
                <span className="text-sage-500"> — {e.institution}</span>
                {e.yearCompleted && <span className="text-sage-500"> ({e.yearCompleted})</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {t.certifications.length > 0 && (
        <Section label="Certifications">
          <ul className="space-y-3">
            {t.certifications.map((c) => (
              <li key={c.id} className="text-sm">
                <div className="font-medium text-sage-900">{c.name}</div>
                <div className="text-sage-600">
                  {c.issuingOrganization}
                  {c.credentialId && ` · #${c.credentialId}`}
                </div>
                {c.credentialUrl && (
                  <a
                    href={c.credentialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-sage-500 hover:text-sage-800"
                  >
                    Verify on issuer&rsquo;s register →
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(t.linkedinUrl || t.websiteUrl) && (
        <Section label="Links">
          <div className="flex flex-wrap gap-3 text-sm">
            {t.linkedinUrl && (
              <a
                href={t.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost text-sm"
              >
                LinkedIn ↗
              </a>
            )}
            {t.websiteUrl && (
              <a
                href={t.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost text-sm"
              >
                Website ↗
              </a>
            )}
          </div>
        </Section>
      )}
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="card border border-sage-100">
      <div className="text-xs text-sage-500 uppercase tracking-wider mb-3">{label}</div>
      {children}
    </section>
  );
}

function MiniCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card border border-sage-100 py-3">
      <div className="text-xs text-sage-500 uppercase tracking-wider mb-1">{label}</div>
      {children}
    </div>
  );
}

function InviteAction({
  therapistProfileId,
  children,
}: {
  therapistProfileId: string;
  children: ChildRow[];
}) {
  const [open, setOpen] = useState(false);
  const [childId, setChildId] = useState<string>(children[0]?.id ?? '');
  const [relationship, setRelationship] = useState('Primary therapist');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api(`/children/${childId}/invite-therapist/${therapistProfileId}`, {
        method: 'POST',
        body: { relationship },
      });
      setOk(true);
    } catch (e: any) {
      setErr(e?.message ?? 'Could not send invite');
    } finally {
      setBusy(false);
    }
  }

  if (children.length === 0) {
    return (
      <div className="text-sm text-sage-600 bg-cream-100 rounded-xl p-3">
        Add a child to your account first, then you can invite therapists to their care team.{' '}
        <Link href="/children" className="underline">Go to Children →</Link>
      </div>
    );
  }

  if (ok) {
    return (
      <div className="text-sm text-sage-800 bg-sage-50 border border-sage-200 rounded-xl p-3">
        ✓ Invite sent. The therapist will see it in their notifications; they can also open the
        link when you share it out-of-band.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary w-full sm:w-auto"
      >
        Invite to my child&rsquo;s care team
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 bg-cream-100 rounded-xl p-3">
      <label className="block text-sm">
        <span className="text-xs text-sage-500 uppercase tracking-wider">Which child</span>
        <select
          value={childId}
          onChange={(e) => setChildId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-sage-200 bg-cream-50 px-3 py-2 text-sm"
        >
          {children.map((c) => (
            <option key={c.id} value={c.id}>{c.fullName}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-xs text-sage-500 uppercase tracking-wider">Their role</span>
        <input
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          maxLength={120}
          className="mt-1 w-full rounded-lg border border-sage-200 bg-cream-50 px-3 py-2 text-sm"
          placeholder="e.g. Primary SLP, OT, Consulting doctor"
        />
      </label>
      <p className="text-xs text-sage-600">
        The therapist gets full caregiver access once they accept. You can revoke that access
        anytime from your child&rsquo;s Care Team tab.
      </p>
      {err && <p className="text-sm text-coral-700">{err}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !childId} className="btn-primary text-sm">
          {busy ? 'Sending…' : 'Send invite'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
