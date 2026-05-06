'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../../components/auth-provider';
import { api } from '../../../../lib/api';
import { formatDateTime } from '../../../../lib/utils';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'PARENT' | 'THERAPIST' | 'TEACHER' | 'SCHOOL_ADMIN' | 'ADMIN';
  isActive: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLES: User['role'][] = ['PARENT', 'THERAPIST', 'TEACHER', 'SCHOOL_ADMIN', 'ADMIN'];

const ROLE_TONE: Record<string, string> = {
  PARENT: 'bg-coral-100 text-coral-800',
  THERAPIST: 'bg-sage-100 text-sage-800',
  TEACHER: 'bg-mist-100 text-mist-800',
  SCHOOL_ADMIN: 'bg-mist-100 text-mist-800',
  ADMIN: 'bg-lavender-100 text-lavender-500',
};

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'' | User['role']>('');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('role', filter);
      if (q.trim()) params.set('q', q.trim());
      const list = await api<User[]>(`/admin/users?${params.toString()}`);
      setUsers(list);
    } catch (e: any) {
      setErr(e?.message || 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function patchUser(id: string, patch: { role?: User['role']; isActive?: boolean }) {
    setBusyId(id);
    setErr(null);
    try {
      const updated = await api<User>(`/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    } catch (e: any) {
      setErr(e?.message || 'Update failed.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sage-500 text-sm uppercase tracking-wider">Admin</p>
        <h1 className="font-display text-4xl text-sage-900 mt-2">Users</h1>
      </header>

      <AdminTabs current="users" />

      <div className="card flex flex-col sm:flex-row gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Search by name or email…"
          className="input flex-1"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="input sm:w-56"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.toLowerCase().replace('_', ' ')}
            </option>
          ))}
        </select>
        <button onClick={load} className="btn-primary">Search</button>
      </div>

      {err && (
        <div className="card bg-coral-50 border-coral-200 text-coral-800">{err}</div>
      )}

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="animate-pulse h-32" />
        ) : users.length === 0 ? (
          <p className="text-sage-500 text-center py-8">No users match.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-sage-500 uppercase text-xs tracking-wider">
              <tr>
                <th className="py-3 pr-4">User</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Joined</th>
                <th className="py-3 pr-4">Last login</th>
                <th className="py-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage-100">
              {users.map((u) => {
                const isMe = me?.id === u.id;
                const busy = busyId === u.id;
                return (
                  <tr key={u.id} className="align-top">
                    <td className="py-4 pr-4">
                      <div className="font-medium text-sage-900">{u.fullName}</div>
                      <div className="text-xs text-sage-500 truncate max-w-[18rem]">{u.email}</div>
                      {isMe && (
                        <div className="text-xs text-coral-600 mt-1">(that's you)</div>
                      )}
                    </td>
                    <td className="py-4 pr-4">
                      <select
                        value={u.role}
                        disabled={busy || isMe}
                        onChange={(e) => patchUser(u.id, { role: e.target.value as User['role'] })}
                        className={`px-2 py-1 rounded-lg text-xs font-medium border-0 ${ROLE_TONE[u.role]} disabled:opacity-50`}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r.toLowerCase().replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={
                          'chip text-xs ' +
                          (u.isActive
                            ? 'bg-sage-100 text-sage-800'
                            : 'bg-coral-100 text-coral-800')
                        }
                      >
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-sage-600">
                      {formatDateTime(u.createdAt)}
                    </td>
                    <td className="py-4 pr-4 text-sage-600">
                      {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : <span className="text-sage-400">—</span>}
                    </td>
                    <td className="py-4 pr-4">
                      <button
                        type="button"
                        disabled={busy || isMe}
                        onClick={() => patchUser(u.id, { isActive: !u.isActive })}
                        className="btn-ghost text-xs disabled:opacity-50"
                      >
                        {busy ? '…' : u.isActive ? 'Disable' : 'Re-enable'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-sage-500">
        Role and status changes are written to the audit log. You can't disable or demote your own admin account.
      </p>
    </div>
  );
}

function AdminTabs({ current }: { current: string }) {
  const tabs = [
    { id: 'overview', label: 'Overview', href: '/admin' },
    { id: 'users', label: 'Users', href: '/admin/users' },
    { id: 'moderation', label: 'Moderation', href: '/admin/moderation' },
    { id: 'cms', label: 'CMS', href: '/admin/cms' },
  ];
  return (
    <nav className="flex gap-1 border-b border-sage-100 -mb-2 overflow-x-auto">
      {tabs.map((t) => {
        const active = t.id === current;
        return (
          <Link
            key={t.id}
            href={t.href}
            className={
              'px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ' +
              (active
                ? 'border-coral-500 text-sage-900'
                : 'border-transparent text-sage-600 hover:text-sage-900')
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
