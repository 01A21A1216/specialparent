'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useApi } from '../../../lib/swr';
import { cn, formatDate } from '../../../lib/utils';

interface Resource {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  category: string;
  publishedAt?: string | null;
  coverImage?: string | null;
}

const CATEGORY_TONE: Record<string, { card: string; chip: string }> = {
  'therapies': {
    card: 'bg-lavender-50 border-lavender-100',
    chip: 'bg-lavender-100 text-lavender-500',
  },
  'autism-guides': {
    card: 'bg-sage-50 border-sage-100',
    chip: 'bg-sage-100 text-sage-800',
  },
  'home-therapy': {
    card: 'bg-coral-50 border-coral-100',
    chip: 'bg-coral-100 text-coral-800',
  },
  'government': {
    card: 'bg-mist-50 border-mist-100',
    chip: 'bg-mist-100 text-mist-800',
  },
  'nutrition': {
    card: 'bg-sage-50 border-sage-100',
    chip: 'bg-sage-100 text-sage-800',
  },
  'daily-life': {
    card: 'bg-cream-100 border-cream-200',
    chip: 'bg-cream-200 text-sage-700',
  },
};

const CATEGORY_LABEL: Record<string, string> = {
  'therapies': 'Therapies',
  'autism-guides': 'Autism guides',
  'home-therapy': 'Home therapy',
  'government': 'Government & rights',
  'nutrition': 'Nutrition',
  'daily-life': 'Daily life',
};

// Preferred display order for the menu. Anything not in the list falls to the end alphabetically.
const CATEGORY_ORDER = [
  'therapies',
  'autism-guides',
  'home-therapy',
  'daily-life',
  'nutrition',
  'government',
];

function categoryTone(cat: string) {
  return CATEGORY_TONE[cat] ?? {
    card: 'bg-cream-100 border-cream-200',
    chip: 'bg-cream-200 text-sage-700',
  };
}

function categoryLabel(cat: string) {
  return CATEGORY_LABEL[cat] ?? cat.replace(/-/g, ' ');
}

export default function ResourcesPage() {
  const { data, isLoading: loading } = useApi<Resource[]>('/public/resources');
  const resources = data ?? [];
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { categoryList, filteredResources } = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of resources) {
      counts[r.category] = (counts[r.category] ?? 0) + 1;
    }
    const list = Object.entries(counts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => {
        const ia = CATEGORY_ORDER.indexOf(a.category);
        const ib = CATEGORY_ORDER.indexOf(b.category);
        if (ia === -1 && ib === -1) return a.category.localeCompare(b.category);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });
    const filtered = selectedCategory
      ? resources.filter((r) => r.category === selectedCategory)
      : resources;
    return { categoryList: list, filteredResources: filtered };
  }, [resources, selectedCategory]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl sm:text-5xl text-sage-900">Resources</h1>
        <p className="text-sage-600 mt-2 max-w-2xl">
          Guides on therapies, home activities, and rights — written for Indian
          families, in plain language.
        </p>
      </header>

      {loading ? (
        <div className="text-sage-500">Loading…</div>
      ) : resources.length === 0 ? (
        <div className="card text-center py-10 text-sage-500">
          No resources published yet.
        </div>
      ) : (
        <>
          {/* Category menu */}
          <nav
            aria-label="Filter resources by category"
            className="flex gap-2 flex-wrap"
          >
            <CategoryChip
              label="All"
              count={resources.length}
              active={selectedCategory === null}
              onClick={() => setSelectedCategory(null)}
              toneChip="bg-sage-600 text-cream-50"
            />
            {categoryList.map(({ category, count }) => {
              const tone = categoryTone(category);
              return (
                <CategoryChip
                  key={category}
                  label={categoryLabel(category)}
                  count={count}
                  active={selectedCategory === category}
                  onClick={() => setSelectedCategory(category)}
                  toneChip={tone.chip}
                />
              );
            })}
          </nav>

          {/* Result count */}
          <p className="text-sm text-sage-500">
            {filteredResources.length}{' '}
            {filteredResources.length === 1 ? 'resource' : 'resources'}
            {selectedCategory && (
              <>
                {' in '}
                <span className="text-sage-800 font-medium">
                  {categoryLabel(selectedCategory)}
                </span>
              </>
            )}
          </p>

          {/* Grid */}
          {filteredResources.length === 0 ? (
            <div className="card text-center py-10 text-sage-500">
              Nothing here yet — pick a different category above.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResources.map((r) => {
                const tone = categoryTone(r.category);
                return (
                  <Link
                    key={r.id}
                    href={`/resources/${r.slug}`}
                    className={`rounded-3xl border p-6 hover:shadow-glow transition-shadow ${tone.card}`}
                  >
                    <span
                      className={`chip text-[10px] uppercase tracking-wider ${tone.chip}`}
                    >
                      {categoryLabel(r.category)}
                    </span>
                    <h3 className="font-display text-2xl text-sage-900 mt-3 leading-snug">
                      {r.title}
                    </h3>
                    {r.excerpt && (
                      <p className="mt-3 text-sage-700 leading-relaxed">
                        {r.excerpt}
                      </p>
                    )}
                    {r.publishedAt && (
                      <p className="mt-4 text-xs text-sage-500">
                        {formatDate(r.publishedAt)}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
  toneChip,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  toneChip: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full px-4 py-2 text-sm font-medium border-2 transition-all inline-flex items-center gap-2',
        active
          ? `${toneChip} border-transparent shadow-soft`
          : 'bg-cream-50 text-sage-800 border-sage-200 hover:border-sage-400',
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          'text-xs px-1.5 py-0.5 rounded-full',
          active ? 'bg-cream-50/25' : 'bg-sage-100 text-sage-700',
        )}
      >
        {count}
      </span>
    </button>
  );
}
