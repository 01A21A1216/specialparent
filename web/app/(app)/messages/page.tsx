'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../../components/auth-provider';
import { api } from '../../../lib/api';
import { useApi } from '../../../lib/swr';
import { formatDateTime, initials } from '../../../lib/utils';

interface OtherUser {
  id: string;
  fullName: string;
  role: string;
  avatarUrl?: string | null;
}

interface ThreadListItem {
  id: string;
  other: OtherUser;
  child?: { id: string; fullName: string } | null;
  lastMessage: { id: string; body: string; createdAt: string; senderId: string } | null;
  unreadCount: number;
  lastMessageAt: string;
}

interface Message {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
}

interface ThreadDetail {
  id: string;
  other: OtherUser;
  child?: { id: string; fullName: string } | null;
  messages: Message[];
}

function MessagesInner() {
  const { user } = useAuth();
  const params = useSearchParams();
  const initialThreadId = params.get('thread');

  const { data: threads = [], mutate: refetchThreads } =
    useApi<ThreadListItem[]>('/messages/threads', {
      // Cheap polling so new messages surface without full page reload.
      refreshInterval: 15000,
    });

  const [activeId, setActiveId] = useState<string | null>(initialThreadId);

  useEffect(() => {
    if (!activeId && threads.length > 0) setActiveId(threads[0].id);
  }, [threads, activeId]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl text-sage-900">Messages</h1>
        <p className="text-sage-500 mt-1">
          Direct messages with the care team. Not for emergencies — call the numbers on your
          child's emergency page if needed.
        </p>
      </header>

      <div className="grid lg:grid-cols-[320px_1fr] gap-4 items-start">
        <aside className="card p-0 overflow-hidden">
          {threads.length === 0 ? (
            <div className="p-6 text-center text-sage-500 text-sm">
              No conversations yet. Start one from a care-team member on a child's profile.
            </div>
          ) : (
            <ul className="divide-y divide-sage-100 max-h-[70vh] overflow-auto">
              {threads.map((t) => {
                const isActive = t.id === activeId;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(t.id)}
                      className={`w-full text-left px-4 py-3 flex gap-3 items-start ${
                        isActive ? 'bg-coral-50' : 'hover:bg-sage-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-sage-100 text-sage-700 grid place-items-center font-semibold flex-shrink-0">
                        {initials(t.other.fullName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium text-sage-900 truncate">
                            {t.other.fullName}
                          </span>
                          {t.unreadCount > 0 && (
                            <span className="chip bg-coral-500 text-white text-xs px-2">
                              {t.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-sage-500 flex gap-1 items-baseline">
                          <span className="capitalize">{t.other.role.toLowerCase()}</span>
                          {t.child && (
                            <span className="truncate">· about {t.child.fullName}</span>
                          )}
                        </div>
                        {t.lastMessage && (
                          <p className="text-sm text-sage-600 mt-1 line-clamp-1">
                            {t.lastMessage.senderId === user?.id && 'You: '}
                            {t.lastMessage.body}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <div>
          {activeId ? (
            <ThreadPane
              key={activeId}
              threadId={activeId}
              onSent={refetchThreads}
              currentUserId={user?.id}
            />
          ) : (
            <div className="card text-center text-sage-500 py-16">
              Pick a conversation from the list.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ThreadPane({
  threadId,
  onSent,
  currentUserId,
}: {
  threadId: string;
  onSent: () => Promise<unknown>;
  currentUserId?: string;
}) {
  const { data, mutate, isLoading } = useApi<ThreadDetail>(
    `/messages/threads/${threadId}`,
    { refreshInterval: 8000 },
  );
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Autoscroll to newest message when the thread first loads or a new
    // message arrives.
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data?.messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    try {
      await api(`/messages/threads/${threadId}/messages`, {
        method: 'POST',
        body: { body: draft.trim() },
      });
      setDraft('');
      await Promise.all([mutate(), onSent()]);
    } finally {
      setSending(false);
    }
  }

  if (isLoading || !data) {
    return <div className="card h-96 animate-pulse" />;
  }

  return (
    <div className="card p-0 flex flex-col h-[70vh]">
      <div className="px-5 py-4 border-b border-sage-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-sage-100 text-sage-700 grid place-items-center font-semibold">
          {initials(data.other.fullName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sage-900 truncate">{data.other.fullName}</div>
          <div className="text-xs text-sage-500">
            <span className="capitalize">{data.other.role.toLowerCase()}</span>
            {data.child && ` · about ${data.child.fullName}`}
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-cream-50"
      >
        {data.messages.length === 0 && (
          <p className="text-center text-sage-500 text-sm py-10">
            No messages yet. Say hello.
          </p>
        )}
        {data.messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                mine
                  ? 'ml-auto bg-coral-500 text-white'
                  : 'mr-auto bg-white border border-sage-100 text-sage-900'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{m.body}</p>
              <div
                className={`text-[10px] mt-1 ${
                  mine ? 'text-coral-100' : 'text-sage-400'
                }`}
              >
                {formatDateTime(m.createdAt)}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="border-t border-sage-100 p-3 flex gap-2">
        <textarea
          className="input flex-1 min-h-[44px] max-h-32"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send(e as unknown as React.FormEvent);
            }
          }}
          placeholder="Write a message… (Shift + Enter for new line)"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="btn-primary text-sm px-5 disabled:opacity-60"
        >
          {sending ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="text-sage-500">Loading…</div>}>
      <MessagesInner />
    </Suspense>
  );
}
