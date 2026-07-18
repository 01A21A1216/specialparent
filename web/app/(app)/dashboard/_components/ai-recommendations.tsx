'use client';

import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../../../../lib/swr';

type Category = 'therapy' | 'behavior' | 'communication' | 'wellbeing' | 'general';

interface Recommendation {
  id: string;
  category: Category;
  title: string;
  body: string;
}

interface RecommendationsResult {
  childId: string;
  childName: string;
  generatedAt: string;
  source: 'openai' | 'mock';
  recommendations: Recommendation[];
}

const CATEGORY_META: Record<Category, { label: string; chip: string }> = {
  therapy: { label: 'Therapy', chip: 'bg-sage-100 text-sage-700' },
  behavior: { label: 'Behavior', chip: 'bg-coral-100 text-coral-700' },
  communication: { label: 'Communication', chip: 'bg-mist-100 text-mist-700' },
  wellbeing: { label: 'Wellbeing', chip: 'bg-cream-200 text-sage-800' },
  general: { label: 'General', chip: 'bg-sage-50 text-sage-600' },
};

const DISMISS_KEY = 'sp_dismissed_recs';

function loadDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DISMISS_KEY, JSON.stringify([...ids]));
}

export function AiRecommendationsTile({ childId }: { childId: string }) {
  const { data, isLoading, isValidating, mutate, error } = useApi<RecommendationsResult>(
    `/ai/recommendations?childId=${childId}`,
    { revalidateOnFocus: false },
  );

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  useEffect(() => {
    setDismissed(loadDismissed());
  }, []);

  const visible = useMemo(
    () => (data?.recommendations ?? []).filter((r) => !dismissed.has(r.id)),
    [data, dismissed],
  );

  function dismiss(id: string) {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    saveDismissed(next);
  }

  function resetDismissed() {
    setDismissed(new Set());
    saveDismissed(new Set());
  }

  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="font-display text-2xl text-sage-900 flex items-center gap-2">
            <span aria-hidden>✨</span>
            AI ideas for you
          </h2>
          <p className="text-sm text-sage-500 mt-1">
            {data
              ? `Based on ${data.childName}'s last 2 weeks. Not medical advice.`
              : 'Gentle suggestions from recent milestones, moods, and events.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dismissed.size > 0 && (
            <button
              type="button"
              onClick={resetDismissed}
              className="text-xs text-sage-500 hover:text-sage-700"
            >
              Show dismissed ({dismissed.size})
            </button>
          )}
          <button
            type="button"
            onClick={() => mutate()}
            disabled={isValidating}
            className="chip bg-sage-100 text-sage-700 hover:bg-sage-200 transition-colors disabled:opacity-60"
          >
            {isValidating ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-3 bg-sage-100 rounded w-1/3" />
              <div className="mt-3 h-4 bg-sage-100 rounded w-3/4" />
              <div className="mt-2 h-3 bg-sage-100 rounded" />
              <div className="mt-1.5 h-3 bg-sage-100 rounded w-5/6" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card text-sage-500 text-sm">
          Couldn't load ideas right now. Try refresh in a moment.
        </div>
      ) : visible.length === 0 ? (
        <div className="card text-center text-sage-500">
          {data && data.recommendations.length > 0
            ? 'All caught up — nothing new for now.'
            : 'Log a mood, milestone, or event to see personalised ideas here.'}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((r) => (
            <article key={r.id} className="card relative flex flex-col">
              <button
                type="button"
                aria-label="Dismiss suggestion"
                onClick={() => dismiss(r.id)}
                className="absolute top-3 right-3 text-sage-400 hover:text-sage-700 text-lg leading-none"
              >
                ×
              </button>
              <span className={`chip text-xs w-fit ${CATEGORY_META[r.category].chip}`}>
                {CATEGORY_META[r.category].label}
              </span>
              <h3 className="font-display text-lg text-sage-900 mt-3 pr-6">
                {r.title}
              </h3>
              <p className="text-sm text-sage-600 mt-2 leading-relaxed">{r.body}</p>
            </article>
          ))}
        </div>
      )}

      {data?.source === 'mock' && (
        <p className="mt-3 text-xs text-sage-400">
          Running on local suggestions (no OpenAI key configured).
        </p>
      )}
    </section>
  );
}
