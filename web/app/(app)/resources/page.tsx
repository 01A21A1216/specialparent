'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { formatDate } from '../../../lib/utils';

interface Resource {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  category: string;
  publishedAt?: string | null;
  coverImage?: string | null;
}

const CATEGORY_TONE: Record<string, string> = {
  'autism-guides': 'bg-sage-50 border-sage-100',
  'home-therapy': 'bg-coral-50 border-coral-100',
  'government': 'bg-mist-50 border-mist-100',
};

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Resource[]>('/public/resources')
      .then(setResources)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl sm:text-5xl text-sage-900">Resources</h1>
        <p className="text-sage-600 mt-2 max-w-2xl">
          Guides, home activities, and rights — written for Indian families, in plain language.
        </p>
      </header>

      {loading ? (
        <div className="text-sage-500">Loading…</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((r) => (
            <Link
              key={r.id}
              href={`/resources/${r.slug}`}
              className={`rounded-3xl border p-6 hover:shadow-glow transition-shadow ${
                CATEGORY_TONE[r.category] ?? 'bg-cream-100 border-cream-200'
              }`}
            >
              <span className="text-xs uppercase tracking-wider text-sage-500">
                {r.category.replace('-', ' ')}
              </span>
              <h3 className="font-display text-2xl text-sage-900 mt-2">{r.title}</h3>
              {r.excerpt && <p className="mt-3 text-sage-700 leading-relaxed">{r.excerpt}</p>}
              {r.publishedAt && (
                <p className="mt-4 text-xs text-sage-500">{formatDate(r.publishedAt)}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
