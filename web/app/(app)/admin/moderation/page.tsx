'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';
import { formatDateTime } from '../../../../lib/utils';

interface ModPost {
  id: string;
  title: string;
  body: string;
  category: string;
  isPinned: boolean;
  createdAt: string;
  author: { id: string; fullName: string; email: string };
  _count: { comments: number };
}

export default function AdminModeration() {
  const [posts, setPosts] = useState<ModPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const list = await api<ModPost[]>('/admin/community/posts?limit=200');
      setPosts(list);
    } catch (e: any) {
      setErr(e?.message || 'Could not load posts.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function deletePost(id: string) {
    if (!confirm('Delete this post and all its comments? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await api(`/admin/community/posts/${id}`, { method: 'DELETE' });
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      setErr(e?.message || 'Delete failed.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sage-500 text-sm uppercase tracking-wider">Admin</p>
        <h1 className="font-display text-4xl text-sage-900 mt-2">Community moderation</h1>
        <p className="mt-2 text-sage-600">
          Newest posts first. Soft-tone moderation: when in doubt, message the author before removing.
        </p>
      </header>

      <AdminTabs current="moderation" />

      {err && (
        <div className="card bg-coral-50 border-coral-200 text-coral-800">{err}</div>
      )}

      {loading ? (
        <div className="card animate-pulse h-32" />
      ) : posts.length === 0 ? (
        <div className="card text-sage-500 text-center py-10">No posts yet.</div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/community/${p.id}`}
                      target="_blank"
                      className="font-display text-lg text-sage-900 hover:text-coral-600 truncate"
                    >
                      {p.title}
                    </Link>
                    <span className="chip bg-sage-50 text-sage-700 text-xs capitalize">
                      {p.category.toLowerCase().replace('_', ' ')}
                    </span>
                    {p.isPinned && (
                      <span className="chip bg-coral-100 text-coral-800 text-xs">📌 Pinned</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-sage-700 line-clamp-3">{p.body}</p>
                  <div className="mt-2 text-xs text-sage-500">
                    {p.author.fullName} ({p.author.email}) ·{' '}
                    {formatDateTime(p.createdAt)} ·{' '}
                    {p._count.comments} {p._count.comments === 1 ? 'comment' : 'comments'}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Link
                    href={`/community/${p.id}`}
                    target="_blank"
                    className="btn-ghost text-xs"
                  >
                    View
                  </Link>
                  <button
                    type="button"
                    onClick={() => deletePost(p.id)}
                    disabled={busyId === p.id}
                    className="btn-coral text-xs disabled:opacity-50"
                  >
                    {busyId === p.id ? '…' : 'Remove'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
