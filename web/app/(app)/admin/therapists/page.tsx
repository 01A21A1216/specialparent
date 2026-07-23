'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useApi } from '../../../../lib/swr';
import { api } from '../../../../lib/api';
import { ApiState } from '../../../../components/api-state';
import { useAuth } from '../../../../components/auth-provider';

type Status = 'DRAFT' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
type Mode = 'ONLINE' | 'IN_PERSON' | 'HYBRID';

interface Education {
  id: string; degree: string; institution: string;
  fieldOfStudy: string | null; yearCompleted: number | null; notes: string | null;
}
interface Certification {
  id: string; name: string; issuingOrganization: string; credentialId: string | null;
  issueDate: string | null; expiryDate: string | null; credentialUrl: string | null; fileName: string | null;
}
interface Row {
  id: string;
  specialization: string;
  specializations: string[];
  qualifications: string | null;
  yearsExperience: number;
  bio: string | null;
  city: string | null;
  state: string | null;
  languages: string[];
  serviceModes: Mode[];
  linkedinUrl: string | null;
  websiteUrl: string | null;
  photoUrl: string | null;
  verificationStatus: Status;
  submittedAt: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  user: { id: string; fullName: string; email: string; role: string };
  educations: Education[];
  certifications: Certification[];
}

const STATUS_ORDER: Status[] = ['PENDING_REVIEW', 'REJECTED', 'DRAFT', 'VERIFIED', 'SUSPENDED'];
const STATUS_META: Record<Status, { label: string; tone: string }> = {
  DRAFT: { label: 'Draft', tone: 'bg-cream-200 text-sage-800 border-cream-400' },
  PENDING_REVIEW: { label: 'Pending', tone: 'bg-mist-100 text-mist-800 border-mist-300' },
  VERIFIED: { label: 'Verified', tone: 'bg-sage-100 text-sage-800 border-sage-300' },
  REJECTED: { label: 'Rejected', tone: 'bg-coral-100 text-coral-800 border-coral-300' },
  SUSPENDED: { label: 'Suspended', tone: 'bg-coral-100 text-coral-900 border-coral-400' },
};

export default function AdminTherapistsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Status | 'ALL'>('PENDING_REVIEW');
  const q = filter === 'ALL' ? '' : `?status=${filter}`;
  const { data = [], isLoading, error, mutate } = useApi<Row[]>(`/admin/therapists${q}`);

  if (user?.role !== 'ADMIN') {
    return (
      <div className="max-w-xl">
        <h1 className="font-display text-3xl text-sage-900">Verification queue</h1>
        <p className="text-sage-600 mt-2">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <p className="text-sage-500 text-sm uppercase tracking-wider">Admin</p>
        <h1 className="font-display text-4xl text-sage-900 mt-2">Therapist verification</h1>
        <p className="text-sage-600 mt-2 max-w-2xl">
          Cross-check LinkedIn, RCI number, and credential URLs before approving. Approving lists
          the therapist publicly. Rejecting sends them a note so they can resubmit.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(['PENDING_REVIEW', 'REJECTED', 'DRAFT', 'VERIFIED', 'SUSPENDED', 'ALL'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`chip text-xs ${
              filter === s
                ? 'bg-sage-600 text-cream-50'
                : 'bg-cream-100 text-sage-700 hover:bg-sage-100'
            }`}
          >
            {s === 'ALL' ? 'All' : STATUS_META[s].label}
          </button>
        ))}
      </div>

      <ApiState
        loading={isLoading}
        error={error}
        isEmpty={data.length === 0}
        emptyTitle={filter === 'PENDING_REVIEW' ? 'No profiles pending review.' : 'No profiles.'}
        emptyBody="When a therapist submits, they'll appear here."
        onRetry={() => mutate()}
      >
        <div className="space-y-4">
          {data.map((r) => (
            <TherapistReviewCard key={r.id} row={r} onChanged={() => mutate()} />
          ))}
        </div>
      </ApiState>
    </div>
  );
}

function TherapistReviewCard({ row, onChanged }: { row: Row; onChanged: () => void }) {
  const status = STATUS_META[row.verificationStatus];
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState(row.rejectionReason ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function verify() {
    setBusy(true); setErr(null);
    try { await api(`/admin/therapists/${row.id}/verify`, { method: 'POST' }); onChanged(); }
    catch (e: any) { setErr(e?.message ?? 'Verify failed'); }
    finally { setBusy(false); }
  }
  async function reject() {
    if (reason.trim().length < 4) { setErr('Give the therapist a specific note (>= 4 chars)'); return; }
    setBusy(true); setErr(null);
    try { await api(`/admin/therapists/${row.id}/reject`, { method: 'POST', body: { reason } }); onChanged(); }
    catch (e: any) { setErr(e?.message ?? 'Reject failed'); }
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

  return (
    <article className="card border border-sage-100 space-y-4">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link
            href={`/admin/therapists/${row.id}`}
            className="font-display text-xl text-sage-900 hover:text-sage-600 no-underline"
          >
            {row.user.fullName}
          </Link>
          <div className="text-sm text-sage-600">
            {row.specialization} · {row.yearsExperience} yr · {row.user.email}
          </div>
          {(row.city || row.state) && (
            <div className="text-xs text-sage-500 mt-0.5">
              📍 {[row.city, row.state].filter(Boolean).join(', ')}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`chip text-xs border ${status.tone}`}>{status.label}</span>
          <Link href={`/admin/therapists/${row.id}`} className="btn-ghost text-xs">
            Open full review →
          </Link>
        </div>
      </header>

      {row.bio && (
        <p className="text-sm text-sage-700 whitespace-pre-line">{row.bio}</p>
      )}

      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-sage-500 uppercase tracking-wider mb-1">Education</div>
          {row.educations.length === 0 ? (
            <p className="text-sage-500 italic">— none —</p>
          ) : (
            <ul className="space-y-1">
              {row.educations.map((e) => (
                <li key={e.id}>
                  <strong>{e.degree}</strong>{e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ''} — {e.institution}
                  {e.yearCompleted ? ` (${e.yearCompleted})` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="text-xs text-sage-500 uppercase tracking-wider mb-1">Certifications</div>
          {row.certifications.length === 0 ? (
            <p className="text-sage-500 italic">— none —</p>
          ) : (
            <ul className="space-y-1">
              {row.certifications.map((c) => (
                <li key={c.id}>
                  <strong>{c.name}</strong> — {c.issuingOrganization}
                  {c.credentialId ? ` (#${c.credentialId})` : ''}
                  {c.credentialUrl && (
                    <a href={c.credentialUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-sage-600 underline">
                      verify ↗
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm border-t border-sage-100 pt-3">
        {row.linkedinUrl && (
          <a href={row.linkedinUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs">
            LinkedIn ↗
          </a>
        )}
        {row.websiteUrl && (
          <a href={row.websiteUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs">
            Website ↗
          </a>
        )}
      </div>

      {row.rejectionReason && row.verificationStatus === 'REJECTED' && (
        <p className="text-xs text-sage-600 bg-coral-50 rounded-lg p-2">
          <strong>Previously rejected:</strong> {row.rejectionReason}
        </p>
      )}

      {rejecting ? (
        <div className="space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="What does the therapist need to fix before resubmission?"
            className="w-full rounded-lg border border-sage-200 bg-cream-50 px-3 py-2 text-sm"
          />
          {err && <p className="text-xs text-coral-700">{err}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={reject} disabled={busy} className="btn-primary text-sm">
              {busy ? 'Sending…' : 'Send rejection'}
            </button>
            <button type="button" onClick={() => setRejecting(false)} className="btn-ghost text-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {row.verificationStatus !== 'VERIFIED' && (
            <button type="button" onClick={verify} disabled={busy} className="btn-primary text-sm">
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
              Suspend
            </button>
          )}
          {err && <p className="text-xs text-coral-700 self-center">{err}</p>}
        </div>
      )}
    </article>
  );
}
