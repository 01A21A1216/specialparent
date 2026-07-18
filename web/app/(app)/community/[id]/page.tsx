'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { api } from '../../../../lib/api';
import { useApi } from '../../../../lib/swr';
import { formatDateTime, initials } from '../../../../lib/utils';

interface PostDetail {
  id: string;
  title: string;
  body: string;
  category: string;
  createdAt: string;
  author: { id: string; fullName: string; role: string };
  comments: Array<{
    id: string;
    body: string;
    createdAt: string;
    author: { id: string; fullName: string; role: string };
  }>;
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data: post,
    isLoading: loading,
    mutate,
  } = useApi<PostDetail>(id ? `/community/posts/${id}` : null);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setPosting(true);
    try {
      await api(`/community/posts/${id}/comments`, {
        method: 'POST',
        body: { body: comment },
      });
      setComment('');
      await mutate();
    } finally {
      setPosting(false);
    }
  }

  if (loading) return <div className="text-sage-500">Loading…</div>;
  if (!post) return <div className="text-sage-500">Not found.</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/community" className="text-sage-600 hover:text-sage-900 text-sm">
        ← Back to community
      </Link>

      <article className="card">
        <h1 className="font-display text-3xl sm:text-4xl text-sage-900">{post.title}</h1>
        <div className="mt-3 flex items-center gap-3 text-sm text-sage-500">
          <span>{post.author.fullName}</span>
          <span>·</span>
          <span className="capitalize">{post.author.role.toLowerCase()}</span>
          <span>·</span>
          <span>{formatDateTime(post.createdAt)}</span>
        </div>
        <p className="mt-6 text-sage-800 whitespace-pre-wrap leading-relaxed">{post.body}</p>
      </article>

      <section>
        <h2 className="font-display text-2xl text-sage-900 mb-4">
          Replies ({post.comments.length})
        </h2>
        <div className="space-y-3">
          {post.comments.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-sage-200 text-sage-700 grid place-items-center font-semibold text-sm flex-shrink-0">
                  {initials(c.author.fullName)}
                </div>
                <div className="flex-1">
                  <div className="text-sm">
                    <span className="font-medium text-sage-900">{c.author.fullName}</span>
                    <span className="text-sage-500"> · {formatDateTime(c.createdAt)}</span>
                  </div>
                  <p className="text-sage-800 mt-1 whitespace-pre-wrap">{c.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <form onSubmit={addComment} className="card space-y-3">
        <label className="label">Your reply</label>
        <textarea
          className="input min-h-[100px] resize-y"
          required
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience…"
        />
        <button disabled={posting} className="btn-primary">
          {posting ? 'Posting…' : 'Post reply'}
        </button>
      </form>
    </div>
  );
}
