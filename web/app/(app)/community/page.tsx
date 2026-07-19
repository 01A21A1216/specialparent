'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '../../../lib/api';
import { useApi } from '../../../lib/swr';
import { formatDateTime, initials } from '../../../lib/utils';

interface Post {
  id: string;
  title: string;
  body: string;
  category: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  author: { id: string; fullName: string; role: string };
  _count: { comments: number };
}

const CATEGORY_LABEL: Record<string, string> = {
  GENERAL: 'General',
  SUCCESS_STORY: 'Success story',
  QUESTION: 'Question',
  RESOURCE: 'Resource',
  REGIONAL: 'Regional',
};

export default function CommunityPage() {
  const { data, isLoading: loading, error, mutate } =
    useApi<Post[]>('/community/posts');
  const posts = data ?? [];
  const [showForm, setShowForm] = useState(false);

  // form
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [submitting, setSubmitting] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api('/community/posts', {
        method: 'POST',
        body: { title, body, category },
      });
      setTitle('');
      setBody('');
      setShowForm(false);
      await mutate();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl text-sage-900">Community</h1>
          <p className="text-sage-600 mt-2">
            Real conversations with parents and therapists who get it.
          </p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary">
          {showForm ? 'Cancel' : '+ New post'}
        </button>
      </header>

      {showForm && (
        <form onSubmit={onCreate} className="card space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Your post</label>
            <textarea
              className="input min-h-[150px] resize-y"
              required
              minLength={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share what's on your mind…"
            />
          </div>
          <button disabled={submitting} className="btn-primary">
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="card animate-pulse space-y-3">
          <div className="h-4 bg-sage-100 rounded w-1/3" />
          <div className="h-3 bg-sage-100 rounded" />
        </div>
      ) : error ? (
        <div className="card border-coral-200 bg-coral-50 text-coral-800">
          <div className="font-medium">Couldn't load community posts.</div>
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
      ) : posts.length === 0 ? (
        <div className="card text-center py-12 space-y-2">
          <div className="text-4xl">🫂</div>
          <p className="text-sage-700 font-medium">Be the first to post.</p>
          <p className="text-sage-500 text-sm max-w-md mx-auto">
            Share a question, a win, or a hard day. This is a safe space for
            Indian parents to find each other.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/community/${p.id}`}
              className="card block hover:shadow-glow transition-shadow"
            >
              {p.pinned && (
                <span className="chip bg-coral-100 text-coral-700 text-xs mb-2">📌 Pinned</span>
              )}
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-sage-200 text-sage-700 grid place-items-center font-semibold flex-shrink-0">
                  {initials(p.author.fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-xl text-sage-900">{p.title}</h3>
                  <div className="text-xs text-sage-500 mt-1">
                    {p.author.fullName} · {p.author.role.toLowerCase()} · {formatDateTime(p.createdAt)}
                  </div>
                  <p className="mt-3 text-sage-700 line-clamp-3">{p.body}</p>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="chip bg-sage-100 text-sage-700 text-xs">
                      {CATEGORY_LABEL[p.category]}
                    </span>
                    <span className="text-sage-500 text-xs">💬 {p._count.comments}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
