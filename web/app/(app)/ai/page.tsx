'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../components/auth-provider';

interface Message {
  id?: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt?: string;
}

const STORAGE_KEY = 'sp_ai_thread';

export default function AiPage() {
  const { user } = useAuth();
  const [threadId, setThreadId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // hydrate thread id from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let t = window.localStorage.getItem(STORAGE_KEY);
    if (!t) {
      t = `t_${Math.random().toString(36).slice(2, 11)}`;
      window.localStorage.setItem(STORAGE_KEY, t);
    }
    setThreadId(t);
  }, []);

  useEffect(() => {
    if (!threadId) return;
    api<Message[]>(`/ai/threads/${threadId}`).then(setMessages).catch(() => {});
  }, [threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !threadId) return;
    const userMsg: Message = { role: 'USER', content: input };
    setMessages((prev) => [...prev, userMsg]);
    const text = input;
    setInput('');
    setSending(true);
    try {
      const res = await api<{ reply: string; threadId: string }>('/ai/chat', {
        method: 'POST',
        body: { threadId, content: text },
      });
      setMessages((prev) => [...prev, { role: 'ASSISTANT', content: res.reply }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'ASSISTANT', content: `Sorry — I couldn't reach the AI service. (${err?.message ?? 'error'})` },
      ]);
    } finally {
      setSending(false);
    }
  }

  function newConversation() {
    const t = `t_${Math.random().toString(36).slice(2, 11)}`;
    window.localStorage.setItem(STORAGE_KEY, t);
    setThreadId(t);
    setMessages([]);
  }

  const SUGGESTIONS = [
    'How do I handle meltdowns at the supermarket?',
    'How do I prepare for an IEP meeting at my child\'s school?',
    'My non-verbal son is 4. Where do I begin with AAC?',
    'Tips to help my daughter with ADHD do homework calmly?',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
      <header className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-4xl text-sage-900">AI Guide</h1>
          <p className="text-sage-600 mt-1 text-sm">
            Warm, India-aware. Not a replacement for your clinician.
          </p>
        </div>
        <button onClick={newConversation} className="btn-ghost text-sm">
          + New conversation
        </button>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4"
      >
        {messages.length === 0 && (
          <div className="card bg-lavender-50 border-lavender-100">
            <p className="text-sage-800">
              Hi {user?.fullName.split(' ')[0]} — I'm here to help you think things through.
              Ask me anything about therapy, behaviour, school, communication, or your own
              wellbeing as a caregiver. <strong>I'm not a clinician</strong> — for medical or
              therapy decisions, please loop in your child's professional team.
            </p>
            <div className="mt-5">
              <p className="text-xs uppercase tracking-wider text-sage-500 mb-2">Try asking…</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="text-left text-sm rounded-2xl bg-white border border-sage-200 px-3 py-2 hover:bg-sage-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={m.id ?? i}
            className={`flex ${m.role === 'USER' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-3xl px-5 py-3 whitespace-pre-wrap leading-relaxed ${
                m.role === 'USER'
                  ? 'bg-sage-600 text-cream-50'
                  : 'bg-white border border-sage-100 text-sage-800 shadow-soft'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="rounded-3xl bg-white border border-sage-100 px-5 py-3 shadow-soft">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-sage-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-sage-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="w-2 h-2 rounded-full bg-sage-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={send} className="flex gap-3 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(e as unknown as React.FormEvent);
            }
          }}
          placeholder="Type your question…"
          className="input min-h-[56px] max-h-[200px] resize-y flex-1"
          disabled={sending}
        />
        <button type="submit" disabled={sending || !input.trim()} className="btn-primary">
          Send
        </button>
      </form>
    </div>
  );
}
