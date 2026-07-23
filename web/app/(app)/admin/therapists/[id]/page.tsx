'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useApi } from '../../../../../lib/swr';
import { api } from '../../../../../lib/api';
import { ApiState } from '../../../../../components/api-state';
import { useAuth } from '../../../../../components/auth-provider';

// Admin detail-review view for a single therapist profile. Structured
// checklist of the things the reviewer must eyeball before approving:
// LinkedIn, each certification URL, each education entry, bio. The
// checkboxes are advisory (not persisted) — they're a checklist for
// the reviewer, not a compliance record.

type Status = 'DRAFT' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

interface Education {
  id: string; degree: string; institution: string;
  fieldOfStudy: string | null; yearCompleted: number | null; notes: string | null;
}
interface Certification {
  id: string; name: string; issuingOrganization: string;
  credentialId: string | null; issueDate: string | null;
  expiryDate: string | null; credentialUrl: string | null; fileName: string | null;
}
interface Detail {
  id: string;
  specialization: string;
  specializations: string[];
  qualifications: string | null;
  yearsExperience: number;
  bio: string | null;
  hourlyRate: number | null;
  languages: string[];
  serviceModes: string[];
  city: string | null;
  state: string | null;
  photoUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  availability: string | null;
  acceptingNewClients: boolean;
  ageGroups: string[];
  verificationStatus: Status;
  submittedAt: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  adminNotes: string | null;
  user: { id: string; fullName: string; email: string; role: string; phone: string | null };
  educations: Education[];
  certifications: Certification[];
}

const STATUS_META: Record<Status, { label: string; tone: string }> = {
  DRAFT: { label: 'Draft', tone: 'bg-cream-200 text-sage-800 border-cream-400' },
  PENDING_REVIEW: { label: 'Pending review', tone: 'bg-mist-100 text-mist-800 border-mist-300' },
  VERIFIED: { label: 'Verified', tone: 'bg-sage-100 text-sage-800 border-sage-300' },
  REJECTED: { label: 'Rejected', tone: 'bg-coral-100 text-coral-800 border-coral-300' },
  SUSPENDED: { label: 'Suspended', tone: 'bg-coral-100 text-coral-900 border-coral-400' },
};

export default function AdminTherapistDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { data, isLoading, error, mutate } = useApi<Detail>(`/admin/therapists/${params.id}`);

  if (user && user.role !== 'ADMIN') {
    return (
      <div className="max-w-xl">
        <h1 className="font-display text-3xl text-sage-900">Not authorised</h1>
        <p className="text-sage-600 mt-2">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/admin/therapists" className="text-sm text-sage-600 hover:text-sage-900 inline-flex items-center gap-1">
        ← Back to queue
      </Link>

      <ApiState loading={isLoading} error={error} isEmpty={!data} emptyTitle="Profile not found." onRetry={() => mutate()}>
        {data && <ReviewView row={data} onChanged={() => mutate()} onDeleted={() => router.replace('/admin/therapists')} />}
      </ApiState>
    </div>
  );
}

function ReviewView({ row, onChanged, onDeleted }: { row: Detail; onChanged: () => void; onDeleted: () => void }) {
  // Reviewer's local checklist — advisory only. Not persisted.
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setChecks((c) => ({ ...c, [k]: !c[k] }));

  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState(row.rejectionReason ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const status = STATUS_META[row.verificationStatus];

  async function verify() {
    setBusy(true); setErr(null);
    try { await api(`/admin/therapists/${row.id}/verify`, { method: 'POST' }); onChanged(); }
    catch (e: any) { setErr(e?.message ?? 'Verify failed'); }
    finally { setBusy(false); }
  }
  async function reject() {
    if (reason.trim().length < 4) { setErr('Give the therapist a specific note (>= 4 chars)'); return; }
    setBusy(true); setErr(null);
    try {
      await api(`/admin/therapists/${row.id}/reject`, { method: 'POST', body: { reason } });
      onChanged();
    } catch (e: any) { setErr(e?.message ?? 'Reject failed'); }
    finally { setBusy(false); }
  }
  async function suspend() {
    const r = prompt('Reason for suspension (visible to the practitioner):');
    if (!r) return;
    setBusy(true); setErr(null);
    try { await api(`/admin/therapists/${row.id}/suspend`, { method: 'POST', body: { reason: r } }); onChanged(); }
    catch (e: any) { setErr(e?.message ?? 'Suspend failed'); }
    finally { setBusy(false); }
  }

  const initials = row.user.fullName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <>
      <header className="card border border-sage-100 flex items-start gap-4 flex-wrap">
        <div className="w-20 h-20 rounded-full bg-coral-100 text-coral-700 grid place-items-center font-display text-2xl flex-shrink-0 overflow-hidden">
          {row.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.photoUrl} alt="" className="w-full h-full object-cover" />
          ) : initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`chip text-xs border ${status.tone}`}>{status.label}</span>
            {row.submittedAt && (
              <span className="text-xs text-sage-500">Submitted {new Date(row.submittedAt).toLocaleString('en-IN')}</span>
            )}
            {row.verifiedAt && row.verificationStatus === 'VERIFIED' && (
              <span className="text-xs text-sage-500">Verified {new Date(row.verifiedAt).toLocaleDateString('en-IN')}</span>
            )}
          </div>
          <h1 className="font-display text-3xl text-sage-900 leading-tight">{row.user.fullName}</h1>
          <div className="text-sage-600 text-sm">
            {row.specialization} · {row.yearsExperience} yr · {row.user.email}
            {row.user.phone && <> · {row.user.phone}</>}
          </div>
          {(row.city || row.state) && (
            <div className="text-xs text-sage-500 mt-0.5">
              📍 {[row.city, row.state].filter(Boolean).join(', ')}
            </div>
          )}
        </div>
      </header>

      {row.rejectionReason && row.verificationStatus === 'REJECTED' && (
        <div className="rounded-2xl border border-coral-300 bg-coral-50 p-4 text-sm">
          <div className="font-medium text-coral-900 mb-1">Previously rejected</div>
          <p className="text-coral-800">{row.rejectionReason}</p>
        </div>
      )}

      {/* Structured review checklist */}
      <section className="card border border-sage-100 space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl text-sage-900">Reviewer checklist</h2>
          <span className="text-xs text-sage-500">Advisory — not persisted.</span>
        </div>

        <CheckRow k="bio" checked={!!checks.bio} onToggle={() => toggle('bio')}
          label="Bio reads as an experienced practitioner"
        >
          {row.bio ? (
            <p className="text-sm text-sage-700 whitespace-pre-line">{row.bio}</p>
          ) : (
            <p className="text-sm text-sage-500 italic">No bio provided.</p>
          )}
        </CheckRow>

        <CheckRow k="linkedin" checked={!!checks.linkedin} onToggle={() => toggle('linkedin')}
          label={`LinkedIn profile ${row.linkedinUrl ? 'opens and matches' : '— NOT provided'}`}
        >
          {row.linkedinUrl ? (
            <a href={row.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-sage-700 underline break-all">
              {row.linkedinUrl} ↗
            </a>
          ) : (
            <p className="text-sm text-sage-500 italic">
              Not provided — approval requires either LinkedIn or at least one credential URL.
            </p>
          )}
          {row.websiteUrl && (
            <div className="text-xs text-sage-500 mt-1">
              Website: <a href={row.websiteUrl} target="_blank" rel="noopener noreferrer" className="underline">{row.websiteUrl}</a>
            </div>
          )}
        </CheckRow>

        <CheckRow k="education" checked={!!checks.education} onToggle={() => toggle('education')}
          label={`Education (${row.educations.length}) is plausible + institution exists`}
        >
          {row.educations.length === 0 ? (
            <p className="text-sm text-sage-500 italic">— none —</p>
          ) : (
            <ul className="text-sm space-y-1">
              {row.educations.map((e) => (
                <li key={e.id}>
                  <strong>{e.degree}</strong>{e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ''} — {e.institution}
                  {e.yearCompleted ? ` (${e.yearCompleted})` : ''}
                </li>
              ))}
            </ul>
          )}
        </CheckRow>

        <CheckRow k="creds" checked={!!checks.creds} onToggle={() => toggle('creds')}
          label={`Credentials (${row.certifications.length}) verified against issuer register`}
        >
          {row.certifications.length === 0 ? (
            <p className="text-sm text-sage-500 italic">— none —</p>
          ) : (
            <ul className="text-sm space-y-2">
              {row.certifications.map((c) => (
                <li key={c.id} className="pl-3 border-l-2 border-sage-100">
                  <div><strong>{c.name}</strong> — {c.issuingOrganization}</div>
                  <div className="text-sage-600 text-xs">
                    {c.credentialId && <>ID <code className="text-xs">{c.credentialId}</code> · </>}
                    {c.issueDate && <>Issued {new Date(c.issueDate).toLocaleDateString('en-IN')} · </>}
                    {c.expiryDate && <>Expires {new Date(c.expiryDate).toLocaleDateString('en-IN')}</>}
                  </div>
                  {c.credentialUrl && (
                    <a href={c.credentialUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-sage-600 underline">
                      Open issuer&rsquo;s public register ↗
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CheckRow>

        <div className="pt-2 border-t border-sage-100 text-sm text-sage-600">
          <span className="chip text-xs bg-sage-100 text-sage-800 border border-sage-200">
            {Object.values(checks).filter(Boolean).length} / 4 checked
          </span>
        </div>
      </section>

      {/* Practice snapshot */}
      <section className="card border border-sage-100 grid sm:grid-cols-2 gap-4 text-sm">
        <SmallField label="Languages" value={row.languages.join(', ') || '—'} />
        <SmallField label="Session format" value={row.serviceModes.join(', ') || '—'} />
        <SmallField label="Age groups" value={row.ageGroups.join(', ') || '—'} />
        <SmallField label="Availability" value={row.availability || '—'} />
        <SmallField label="Accepting new clients" value={row.acceptingNewClients ? 'Yes' : 'Waitlist'} />
        <SmallField label="Rate" value={row.hourlyRate ? `₹${(row.hourlyRate / 100).toLocaleString('en-IN')}/hr` : '—'} />
      </section>

      {/* Actions */}
      <section className="card border border-sage-100 space-y-3">
        <h2 className="font-display text-xl text-sage-900">Decision</h2>
        {err && <p className="text-sm text-coral-700">{err}</p>}

        {rejecting ? (
          <div className="space-y-2">
            <label className="text-sm">
              <span className="text-xs text-sage-500 uppercase tracking-wider">Rejection note (sent to the therapist)</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="E.g. RCI registration URL didn't resolve — please add the direct link from rehabcouncil.nic.in."
                className="mt-1 w-full rounded-lg border border-sage-200 bg-cream-50 px-3 py-2 text-sm"
              />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={reject} disabled={busy} className="btn-primary text-sm">
                {busy ? 'Sending…' : 'Send rejection'}
              </button>
              <button type="button" onClick={() => setRejecting(false)} className="btn-ghost text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {row.verificationStatus !== 'VERIFIED' && (
              <button
                type="button"
                onClick={verify}
                disabled={busy}
                className="btn-primary text-sm"
              >
                ✓ Verify &amp; publish
              </button>
            )}
            {(row.verificationStatus === 'PENDING_REVIEW' || row.verificationStatus === 'DRAFT') && (
              <button type="button" onClick={() => setRejecting(true)} className="btn-ghost text-sm">
                Reject with note
              </button>
            )}
            {row.verificationStatus === 'VERIFIED' && (
              <button type="button" onClick={suspend} disabled={busy} className="btn-ghost text-sm text-coral-700">
                Suspend from directory
              </button>
            )}
          </div>
        )}
      </section>
    </>
  );
}

function CheckRow({
  k, checked, onToggle, label, children,
}: {
  k: string; checked: boolean; onToggle: () => void; label: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-sage-100 bg-cream-50 p-3">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-1"
          aria-label={label}
          data-checkid={k}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-sage-900">{label}</div>
          <div className="mt-2">{children}</div>
        </div>
      </label>
    </div>
  );
}

function SmallField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-sage-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-sage-800">{value}</div>
    </div>
  );
}
