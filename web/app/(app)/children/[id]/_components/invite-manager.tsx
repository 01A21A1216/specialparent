'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../../../lib/api';
import { INVITE_ROLE_OPTIONS, Invite, InviteRole } from './types';

export function InviteManager({
  childId,
  childName,
}: {
  childId: string;
  childName: string;
}) {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [role, setRole] = useState<InviteRole>('THERAPIST');
  const [relationship, setRelationship] = useState('');
  const [email, setEmail] = useState('');
  const [days, setDays] = useState(14);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    try {
      const list = await api<Invite[]>(`/children/${childId}/invites`);
      setInvites(list);
    } catch {
      setInvites([]);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setErr(null);
    try {
      await api(`/children/${childId}/invites`, {
        method: 'POST',
        body: {
          role,
          relationship: relationship.trim(),
          email: email.trim() || undefined,
          expiresInDays: days,
        },
      });
      setRelationship('');
      setEmail('');
      setShowForm(false);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not create invite';
      setErr(msg);
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this invite? The link will stop working.')) return;
    try {
      await api(`/invites/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not revoke';
      alert(msg);
    }
  }

  async function copyLink(inv: Invite) {
    const url = `${window.location.origin}/invite/${inv.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(inv.id);
      setTimeout(
        () => setCopiedId((c) => (c === inv.id ? null : c)),
        2000,
      );
    } catch {
      // Fallback for older browsers / non-secure contexts
      window.prompt('Copy this link:', url);
    }
  }

  const now = Date.now();
  const pending = (invites ?? []).filter(
    (i) => !i.acceptedAt && !i.revokedAt && new Date(i.expiresAt).getTime() > now,
  );
  const past = (invites ?? []).filter(
    (i) => i.acceptedAt || i.revokedAt || new Date(i.expiresAt).getTime() <= now,
  );

  return (
    <section>
      <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="font-display text-2xl text-sage-900">Care-team invites</h2>
          <p className="text-sm text-sage-600 mt-1">
            Send a link to invite {childName}'s therapist, doctor, or educator to
            log in and track their work.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="btn-secondary"
        >
          {showForm ? 'Cancel' : '+ New invite'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="card space-y-4 mb-4">
          {err && (
            <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-4 text-sm">
              {err}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Role</label>
              <select
                className="input"
                value={role}
                onChange={(e) => setRole(e.target.value as InviteRole)}
              >
                {INVITE_ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Relationship / role label</label>
              <input
                className="input"
                required
                maxLength={120}
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g. Speech therapist at NIMHANS"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Their email (optional)</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@example.com"
              />
            </div>
            <div>
              <label className="label">Link expires in (days)</label>
              <input
                type="number"
                min={1}
                max={90}
                className="input"
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value, 10) || 14)}
              />
            </div>
          </div>
          <p className="text-xs text-sage-500">
            You'll get a shareable link. Send it to them by WhatsApp / email /
            in person — they can sign up and start logging {childName}'s data.
          </p>
          <button disabled={creating} className="btn-primary">
            {creating ? 'Creating…' : 'Create invite link'}
          </button>
        </form>
      )}

      {invites === null ? (
        <div className="card text-sage-500">Loading…</div>
      ) : invites.length === 0 ? (
        <div className="card text-center py-8 text-sage-500">
          No invites yet.
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-wider text-sage-500 font-medium">
                Pending ({pending.length})
              </h3>
              {pending.map((inv) => (
                <InviteRow
                  key={inv.id}
                  inv={inv}
                  onRevoke={() => revoke(inv.id)}
                  onCopy={() => copyLink(inv)}
                  copied={copiedId === inv.id}
                />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-wider text-sage-500 font-medium">
                Accepted / expired / revoked ({past.length})
              </h3>
              {past.map((inv) => (
                <InviteRow
                  key={inv.id}
                  inv={inv}
                  onRevoke={() => {}}
                  onCopy={() => copyLink(inv)}
                  copied={copiedId === inv.id}
                  readOnly
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function InviteRow({
  inv,
  onRevoke,
  onCopy,
  copied,
  readOnly,
}: {
  inv: Invite;
  onRevoke: () => void;
  onCopy: () => void;
  copied: boolean;
  readOnly?: boolean;
}) {
  const status: 'pending' | 'accepted' | 'revoked' | 'expired' = inv.revokedAt
    ? 'revoked'
    : inv.acceptedAt
      ? 'accepted'
      : new Date(inv.expiresAt).getTime() < Date.now()
        ? 'expired'
        : 'pending';
  const statusTone: Record<typeof status, string> = {
    pending: 'bg-mist-100 text-mist-700',
    accepted: 'bg-sage-200 text-sage-800',
    revoked: 'bg-coral-100 text-coral-700',
    expired: 'bg-sage-100 text-sage-600',
  };
  const roleLabel =
    INVITE_ROLE_OPTIONS.find((o) => o.value === inv.role)?.label ??
    inv.role.toLowerCase().replace('_', ' ');
  return (
    <div className="card">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sage-900">{inv.relationship}</span>
            <span className={`chip text-xs ${statusTone[status]}`}>
              {status}
            </span>
          </div>
          <div className="text-xs text-sage-500 mt-1">
            {roleLabel} · expires{' '}
            {new Date(inv.expiresAt).toLocaleDateString()}
            {inv.email && ` · sent to ${inv.email}`}
            {inv.acceptedBy && ` · accepted by ${inv.acceptedBy.fullName}`}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {status === 'pending' && (
            <>
              <button onClick={onCopy} className="btn-ghost text-sm">
                {copied ? '✓ Copied' : 'Copy link'}
              </button>
              {!readOnly && (
                <button
                  onClick={onRevoke}
                  className="btn-ghost text-sm text-coral-700"
                >
                  Revoke
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
