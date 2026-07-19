'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '../../../lib/api';
import { useApi } from '../../../lib/swr';
import { formatDateTime } from '../../../lib/utils';

type NotificationKind = 'REMINDER' | 'SYSTEM' | 'COMMUNITY' | 'THERAPY' | 'AI';

interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
}

const KIND_STYLE: Record<NotificationKind, { emoji: string; label: string; chip: string }> = {
  REMINDER: { emoji: '⏰', label: 'Reminder', chip: 'bg-coral-100 text-coral-800' },
  SYSTEM: { emoji: '📣', label: 'System', chip: 'bg-sage-100 text-sage-800' },
  COMMUNITY: { emoji: '🫂', label: 'Community', chip: 'bg-mist-100 text-mist-800' },
  THERAPY: { emoji: '🩺', label: 'Therapy', chip: 'bg-sage-100 text-sage-800' },
  AI: { emoji: '✨', label: 'AI', chip: 'bg-lavender-100 text-lavender-500' },
};

export default function NotificationsPage() {
  const {
    data: items,
    isLoading: loading,
    error,
    mutate,
  } = useApi<Notification[]>('/notifications');
  const [busy, setBusy] = useState<string | 'all' | null>(null);

  async function markRead(n: Notification) {
    if (n.readAt) return;
    setBusy(n.id);
    // Optimistic: mutate cache directly, no revalidate.
    const optimistic = (items ?? []).map((x) =>
      x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x,
    );
    mutate(optimistic, false);
    try {
      await api(`/notifications/${n.id}/read`, { method: 'PATCH' });
    } catch {
      mutate(); // rollback via refetch
    } finally {
      setBusy(null);
    }
  }

  async function markAllRead() {
    const unread = (items ?? []).filter((n) => !n.readAt);
    if (unread.length === 0) return;
    setBusy('all');
    const optimistic = (items ?? []).map((x) =>
      x.readAt ? x : { ...x, readAt: new Date().toISOString() },
    );
    mutate(optimistic, false);
    try {
      await Promise.all(
        unread.map((n) => api(`/notifications/${n.id}/read`, { method: 'PATCH' })),
      );
    } catch {
      mutate();
    } finally {
      setBusy(null);
    }
  }

  const unread = (items ?? []).filter((n) => !n.readAt);
  const read = (items ?? []).filter((n) => n.readAt);

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl text-sage-900">Notifications</h1>
          <p className="text-sage-600 mt-2">
            Reminders, community activity, therapy updates, and gentle AI nudges.
          </p>
        </div>
        {unread.length > 0 && (
          <button
            onClick={markAllRead}
            disabled={busy === 'all'}
            className="btn-ghost text-sm"
          >
            {busy === 'all' ? 'Marking…' : `Mark all as read (${unread.length})`}
          </button>
        )}
      </header>

      {loading ? (
        <div className="card animate-pulse space-y-3">
          <div className="h-4 bg-sage-100 rounded w-1/3" />
          <div className="h-3 bg-sage-100 rounded" />
          <div className="h-3 bg-sage-100 rounded w-5/6" />
        </div>
      ) : error ? (
        <div className="card border-coral-200 bg-coral-50 text-coral-800">
          <div className="font-medium">Couldn't load notifications.</div>
          <p className="text-sm mt-1 text-coral-700">
            {error.message || 'Something went wrong. Try again in a moment.'}
          </p>
          <button
            type="button"
            onClick={() => mutate()}
            className="btn-ghost text-sm mt-3"
          >
            Try again
          </button>
        </div>
      ) : (items ?? []).length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-3">🌱</div>
          <p className="text-sage-600">You're all caught up.</p>
        </div>
      ) : (
        <>
          {unread.length > 0 && (
            <section>
              <h2 className="font-display text-2xl text-sage-900 mb-4">Unread</h2>
              <ul className="grid gap-3">
                {unread.map((n) => (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    busy={busy === n.id}
                    onMarkRead={() => markRead(n)}
                  />
                ))}
              </ul>
            </section>
          )}

          {read.length > 0 && (
            <section>
              <h2 className="font-display text-2xl text-sage-900 mb-4">Earlier</h2>
              <ul className="grid gap-3 opacity-70">
                {read.map((n) => (
                  <NotificationRow key={n.id} n={n} busy={false} onMarkRead={() => {}} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function NotificationRow({
  n,
  busy,
  onMarkRead,
}: {
  n: Notification;
  busy: boolean;
  onMarkRead: () => void;
}) {
  const style = KIND_STYLE[n.kind] ?? KIND_STYLE.SYSTEM;
  const isUnread = !n.readAt;

  const inner = (
    <div className="flex items-start gap-4">
      <div className="w-11 h-11 rounded-2xl bg-sage-100 text-sage-700 grid place-items-center text-xl flex-shrink-0">
        {style.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sage-900">{n.title}</span>
          <span className={`chip text-xs ${style.chip}`}>{style.label}</span>
          {isUnread && (
            <span className="w-2 h-2 rounded-full bg-coral-500" aria-label="unread" />
          )}
        </div>
        {n.body && <p className="mt-1 text-sm text-sage-600">{n.body}</p>}
        <p className="mt-1 text-xs text-sage-500">{formatDateTime(n.createdAt)}</p>
      </div>
      {isUnread && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMarkRead();
          }}
          disabled={busy}
          className="btn-ghost text-xs flex-shrink-0"
        >
          {busy ? '…' : 'Mark read'}
        </button>
      )}
    </div>
  );

  const className =
    'card block ' +
    (isUnread ? 'border-coral-100 bg-coral-50/40' : '') +
    (n.link ? ' hover:shadow-glow transition-shadow' : '');

  if (n.link) {
    return (
      <li>
        <Link href={n.link} onClick={onMarkRead} className={className}>
          {inner}
        </Link>
      </li>
    );
  }
  return (
    <li>
      <div className={className}>{inner}</div>
    </li>
  );
}
