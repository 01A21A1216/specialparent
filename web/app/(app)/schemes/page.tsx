'use client';

import { useApi } from '../../../lib/swr';
import { ApiState } from '../../../components/api-state';

interface Scheme {
  id: string;
  slug: string;
  name: string;
  description: string;
  benefitSummary?: string | null;
  eligibility?: string | null;
  applyUrl?: string | null;
  states: string[];
}

export default function SchemesPage() {
  const { data, isLoading: loading, error, mutate } = useApi<Scheme[]>('/public/schemes');
  const schemes = data ?? [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl sm:text-5xl text-sage-900">Government schemes</h1>
        <p className="text-sage-600 mt-2 max-w-2xl">
          Welfare, scholarships, and benefits available to families in India under the RPWD Act.
        </p>
      </header>

      <ApiState
        loading={loading}
        error={error}
        isEmpty={schemes.length === 0}
        emptyTitle="No schemes listed yet."
        emptyBody="Our team is still curating the current welfare programmes under the RPWD Act — check back soon."
        onRetry={() => mutate()}
      >
        <div className="grid lg:grid-cols-2 gap-4">
          {schemes.map((s) => (
            <article key={s.id} className="card">
              <h2 className="font-display text-2xl text-sage-900">{s.name}</h2>
              <p className="text-sage-700 mt-3">{s.description}</p>
              {s.benefitSummary && (
                <div className="mt-4 rounded-2xl bg-sage-50 border border-sage-100 p-4">
                  <div className="text-xs uppercase tracking-wider text-sage-500">Benefits</div>
                  <p className="text-sage-800 mt-1">{s.benefitSummary}</p>
                </div>
              )}
              {s.eligibility && (
                <div className="mt-3 text-sm">
                  <span className="text-sage-500 uppercase tracking-wider text-xs">Eligibility · </span>
                  <span className="text-sage-700">{s.eligibility}</span>
                </div>
              )}
              {s.applyUrl && (
                <a
                  href={s.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary mt-5 inline-flex"
                >
                  Apply on official site →
                </a>
              )}
            </article>
          ))}
        </div>
      </ApiState>
    </div>
  );
}
