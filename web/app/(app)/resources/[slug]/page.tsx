'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';
import { formatDate } from '../../../../lib/utils';

interface Resource {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  body: string;
  category: string;
  publishedAt?: string | null;
}

export default function ResourceDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [r, setR] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    api<Resource>(`/public/resources/${slug}`)
      .then(setR)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="text-sage-500">Loading…</div>;
  if (!r) return <div className="text-sage-500">Not found.</div>;

  return (
    <article className="max-w-3xl space-y-6">
      <Link href="/resources" className="text-sage-600 hover:text-sage-900 text-sm">
        ← All resources
      </Link>
      <header>
        <span className="text-xs uppercase tracking-wider text-coral-600 font-medium">
          {r.category.replace('-', ' ')}
        </span>
        <h1 className="font-display text-4xl sm:text-5xl text-sage-900 mt-2 leading-tight">
          {r.title}
        </h1>
        {r.publishedAt && (
          <p className="text-sage-500 text-sm mt-2">Published {formatDate(r.publishedAt)}</p>
        )}
      </header>
      <div className="prose-content text-lg text-sage-800 leading-relaxed whitespace-pre-wrap">
        {/* Naive markdown-ish render — no extra deps. Splits on lines & headers. */}
        {r.body.split('\n').map((line, i) => {
          if (line.startsWith('# ')) {
            return (
              <h2 key={i} className="font-display text-3xl text-sage-900 mt-6 mb-3">
                {line.slice(2)}
              </h2>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h3 key={i} className="font-display text-2xl text-sage-900 mt-5 mb-2">
                {line.slice(3)}
              </h3>
            );
          }
          if (line.startsWith('- ')) {
            return (
              <p key={i} className="ml-5 relative before:content-['•'] before:absolute before:-left-4 before:text-coral-500">
                {line.slice(2)}
              </p>
            );
          }
          if (/^\d+\.\s/.test(line)) {
            return (
              <p key={i} className="ml-5">
                {line}
              </p>
            );
          }
          if (!line.trim()) return <div key={i} className="h-2" />;
          return <p key={i}>{renderBold(line)}</p>;
        })}
      </div>
    </article>
  );
}

function renderBold(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <strong key={i} className="text-sage-900">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}
