'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../components/auth-provider';

type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

interface InvitePreview {
  childFullName: string;
  invitedByName: string;
  role: string;
  relationship: string;
  email?: string | null;
  expiresAt: string;
  status: InviteStatus;
}

const ROLE_LABEL: Record<string, string> = {
  PARENT: 'co-parent',
  THERAPIST: 'therapist',
  DOCTOR: 'doctor',
  TEACHER: 'teacher',
  SPECIAL_EDUCATOR: 'special educator',
  SCHOOL_ADMIN: 'school admin',
};

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [acceptErr, setAcceptErr] = useState<string | null>(null);

  useEffect(() => {
    if (!params.token) return;
    setLoading(true);
    api<InvitePreview>(`/invites/lookup/${params.token}`, { auth: false })
      .then(setPreview)
      .catch((e: any) => setLoadErr(e?.message || 'Invite not found'))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function accept() {
    setAccepting(true);
    setAcceptErr(null);
    try {
      const res = await api<{ ok: true; childId: string }>(
        `/invites/accept/${params.token}`,
        { method: 'POST' },
      );
      router.push(`/children/${res.childId}`);
    } catch (e: any) {
      setAcceptErr(e?.message || 'Could not accept invite');
      setAccepting(false);
    }
  }

  const returnPath = `/invite/${params.token}`;
  const roleLabel = preview ? ROLE_LABEL[preview.role] || preview.role.toLowerCase() : '';

  return (
    <div className="min-h-screen bg-cream-50 grid place-items-center px-5 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-3xl text-sage-900">
            SpecialParent<span className="text-coral-500">.in</span>
          </Link>
        </div>

        <div className="card">
          {loading || authLoading ? (
            <div className="py-10 text-center text-sage-500">Loading invite…</div>
          ) : loadErr || !preview ? (
            <div className="py-6">
              <div className="text-5xl mb-3 text-center">🔒</div>
              <h1 className="font-display text-2xl text-sage-900 text-center">
                Invite unavailable
              </h1>
              <p className="text-sage-600 mt-3 text-center">
                {loadErr || "This link doesn't look right."}
              </p>
              <Link
                href="/"
                className="btn-ghost mt-6 w-full justify-center inline-flex"
              >
                Back to home
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center">
                <div className="text-4xl mb-2">✉️</div>
                <p className="text-sage-500 text-sm uppercase tracking-wider">
                  Care-team invite
                </p>
                <h1 className="font-display text-3xl text-sage-900 mt-2">
                  You've been invited
                </h1>
              </div>

              <div className="mt-6 space-y-3">
                <Row label="From">{preview.invitedByName}</Row>
                <Row label="Child">{preview.childFullName}</Row>
                <Row label="Role">
                  <span className="capitalize">{roleLabel}</span>
                  {' · '}
                  {preview.relationship}
                </Row>
                <Row label="Link expires">
                  {new Date(preview.expiresAt).toLocaleDateString()}
                </Row>
              </div>

              {preview.status === 'accepted' && (
                <StatusNote tone="sage">
                  This invite has already been accepted. Ask{' '}
                  {preview.invitedByName} for a fresh one if this wasn't you.
                </StatusNote>
              )}
              {preview.status === 'revoked' && (
                <StatusNote tone="coral">This invite was revoked.</StatusNote>
              )}
              {preview.status === 'expired' && (
                <StatusNote tone="coral">
                  This invite has expired. Ask {preview.invitedByName} for a
                  fresh link.
                </StatusNote>
              )}

              {preview.status === 'pending' && (
                <div className="mt-8">
                  {acceptErr && (
                    <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-4 text-sm mb-4">
                      {acceptErr}
                    </div>
                  )}
                  {user ? (
                    <>
                      <p className="text-sm text-sage-600 mb-3">
                        Signed in as <strong>{user.fullName}</strong> (
                        {user.email}).
                      </p>
                      <button
                        onClick={accept}
                        disabled={accepting}
                        className="btn-primary w-full text-lg justify-center"
                      >
                        {accepting
                          ? 'Accepting…'
                          : `Accept and open ${preview.childFullName}'s profile`}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-sage-600 mb-3">
                        Sign in with your existing account, or create one first.
                      </p>
                      <div className="grid gap-2">
                        <Link
                          href={`/signup?next=${encodeURIComponent(returnPath)}&role=${preview.role}${preview.email ? `&email=${encodeURIComponent(preview.email)}` : ''}`}
                          className="btn-primary text-center"
                        >
                          Create an account as {roleLabel}
                        </Link>
                        <Link
                          href={`/login?next=${encodeURIComponent(returnPath)}`}
                          className="btn-ghost text-center"
                        >
                          Sign in
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-sage-500 text-sm">{label}: </span>
      <span className="font-medium text-sage-900">{children}</span>
    </div>
  );
}

function StatusNote({
  tone,
  children,
}: {
  tone: 'sage' | 'coral';
  children: React.ReactNode;
}) {
  const cls =
    tone === 'sage'
      ? 'bg-sage-50 border-sage-200 text-sage-800'
      : 'bg-coral-50 border-coral-200 text-coral-800';
  return (
    <div className={`mt-6 rounded-2xl border ${cls} p-4 text-sm`}>{children}</div>
  );
}
