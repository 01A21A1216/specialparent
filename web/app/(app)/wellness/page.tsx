'use client';

import { useMemo, useState } from 'react';
import { useApi } from '../../../lib/swr';
import { ApiState } from '../../../components/api-state';

type Category =
  | 'YOGA'
  | 'MUSIC'
  | 'ART'
  | 'PAINTING'
  | 'PARENT_COUNSELLING'
  | 'PARENT_TRAINING'
  | 'MEDITATION'
  | 'OTHER';
type Audience = 'CHILD' | 'PARENT' | 'FAMILY';
type Format = 'ONLINE' | 'IN_PERSON' | 'HYBRID';

interface Offering {
  id: string;
  category: Category;
  audience: Audience;
  format: Format;
  title: string;
  provider: string;
  description: string;
  city: string | null;
  languages: string[];
  costHint: string | null;
  scheduleHint: string | null;
  contactUrl: string | null;
  contactPhone: string | null;
  notes: string | null;
}

const CATEGORY_META: Record<
  Category,
  { label: string; emoji: string; tone: string }
> = {
  YOGA: { label: 'Yoga', emoji: '🧘', tone: 'bg-sage-50 border-sage-200 text-sage-800' },
  MUSIC: { label: 'Music', emoji: '🎵', tone: 'bg-mist-50 border-mist-200 text-mist-800' },
  ART: { label: 'Art', emoji: '🎨', tone: 'bg-coral-50 border-coral-200 text-coral-800' },
  PAINTING: { label: 'Painting', emoji: '🖌️', tone: 'bg-lavender-50 border-lavender-200 text-lavender-500' },
  PARENT_COUNSELLING: {
    label: 'Parent counselling',
    emoji: '💬',
    tone: 'bg-sage-100 border-sage-200 text-sage-800',
  },
  PARENT_TRAINING: {
    label: 'Parent training',
    emoji: '📚',
    tone: 'bg-cream-100 border-cream-200 text-sage-800',
  },
  MEDITATION: { label: 'Meditation', emoji: '🕯️', tone: 'bg-mist-100 border-mist-200 text-mist-800' },
  OTHER: { label: 'Other', emoji: '🌿', tone: 'bg-cream-50 border-cream-200 text-sage-700' },
};

const AUDIENCE_META: Record<Audience, { label: string }> = {
  CHILD: { label: 'For the child' },
  PARENT: { label: 'For the parent' },
  FAMILY: { label: 'Family together' },
};

const CATEGORY_ORDER: Category[] = [
  'YOGA',
  'MUSIC',
  'ART',
  'PAINTING',
  'PARENT_COUNSELLING',
  'PARENT_TRAINING',
  'MEDITATION',
  'OTHER',
];

export default function WellnessPage() {
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [audience, setAudience] = useState<Audience | 'all'>('all');
  const [format, setFormat] = useState<Format | 'all'>('all');

  const query = useMemo(() => {
    const parts: string[] = [];
    if (category !== 'all') parts.push(`category=${category}`);
    if (audience !== 'all') parts.push(`audience=${audience}`);
    if (format !== 'all') parts.push(`format=${format}`);
    return parts.length ? `?${parts.join('&')}` : '';
  }, [category, audience, format]);

  const { data = [], isLoading, error, mutate } = useApi<Offering[]>(
    `/public/wellness${query}`,
  );

  const byCategory = CATEGORY_ORDER.map((c) => ({
    category: c,
    items: data.filter((o) => o.category === c),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sage-500 text-sm uppercase tracking-wider">Wellness</p>
        <h1 className="font-display text-4xl sm:text-5xl text-sage-900 mt-2">
          Wellness for the whole family
        </h1>
        <p className="text-sage-600 mt-2 max-w-2xl">
          Yoga, music, art, painting, parent counselling, parent training —
          curated offerings for families of neurodivergent children in India.
          Contact each provider directly to book.
        </p>
      </header>

      {/* Filters */}
      <div className="space-y-3">
        <FilterRow
          label="Category"
          value={category}
          onChange={(v) => setCategory(v as Category | 'all')}
          options={[
            { value: 'all', label: 'All categories' },
            ...CATEGORY_ORDER.map((c) => ({
              value: c,
              label: `${CATEGORY_META[c].emoji} ${CATEGORY_META[c].label}`,
            })),
          ]}
        />
        <FilterRow
          label="For"
          value={audience}
          onChange={(v) => setAudience(v as Audience | 'all')}
          options={[
            { value: 'all', label: 'Anyone' },
            { value: 'CHILD', label: 'The child' },
            { value: 'PARENT', label: 'The parent' },
            { value: 'FAMILY', label: 'Family together' },
          ]}
        />
        <FilterRow
          label="Format"
          value={format}
          onChange={(v) => setFormat(v as Format | 'all')}
          options={[
            { value: 'all', label: 'Any format' },
            { value: 'ONLINE', label: '💻 Online' },
            { value: 'IN_PERSON', label: '📍 In person' },
            { value: 'HYBRID', label: '↔ Hybrid' },
          ]}
        />
      </div>

      <ApiState
        loading={isLoading}
        error={error}
        isEmpty={data.length === 0}
        emptyTitle="No offerings match those filters."
        emptyBody="Try loosening the filters, or check back — the directory keeps growing."
        onRetry={() => mutate()}
      >
        <div className="space-y-8">
          {byCategory.map((group) => {
            const meta = CATEGORY_META[group.category];
            return (
              <section key={group.category}>
                <h2 className="font-display text-2xl text-sage-900 mb-4 flex items-center gap-2">
                  <span aria-hidden>{meta.emoji}</span>
                  {meta.label}
                  <span className="text-sm text-sage-500 font-normal">
                    ({group.items.length})
                  </span>
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {group.items.map((o) => (
                    <OfferingCard key={o.id} offering={o} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </ApiState>
    </div>
  );
}

function FilterRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="text-xs text-sage-500 uppercase tracking-wider mr-1">
        {label}
      </span>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`chip text-xs transition-colors ${
            value === opt.value
              ? 'bg-sage-600 text-cream-50'
              : 'bg-cream-100 text-sage-700 hover:bg-sage-100'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function OfferingCard({ offering }: { offering: Offering }) {
  const meta = CATEGORY_META[offering.category];
  const formatLabel =
    offering.format === 'ONLINE'
      ? '💻 Online'
      : offering.format === 'IN_PERSON'
        ? '📍 In person'
        : '↔ Hybrid';
  return (
    <article className={`card border-2 ${meta.tone.split(' ').slice(0, 2).join(' ')} space-y-3`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-xs mb-1">
            <span className={`chip ${meta.tone}`}>
              {meta.emoji} {meta.label}
            </span>
            <span className="chip bg-white/70 text-sage-600 border border-sage-100">
              {AUDIENCE_META[offering.audience].label}
            </span>
            <span className="chip bg-white/70 text-sage-600 border border-sage-100">
              {formatLabel}
            </span>
          </div>
          <h3 className="font-display text-lg text-sage-900">{offering.title}</h3>
          <div className="text-sm text-sage-500 mt-0.5">{offering.provider}</div>
        </div>
      </div>

      <p className="text-sm text-sage-700 leading-relaxed">{offering.description}</p>

      <div className="text-xs text-sage-600 grid sm:grid-cols-2 gap-x-4 gap-y-1">
        {offering.city && (
          <div>
            <span className="text-sage-500">Where · </span>
            {offering.city}
          </div>
        )}
        {offering.scheduleHint && (
          <div>
            <span className="text-sage-500">When · </span>
            {offering.scheduleHint}
          </div>
        )}
        {offering.costHint && (
          <div>
            <span className="text-sage-500">Cost · </span>
            {offering.costHint}
          </div>
        )}
        {offering.languages.length > 0 && (
          <div>
            <span className="text-sage-500">Languages · </span>
            {offering.languages.join(', ')}
          </div>
        )}
      </div>

      {offering.notes && (
        <p className="text-xs text-sage-500 italic">💡 {offering.notes}</p>
      )}

      <div className="flex gap-2 pt-2 flex-wrap">
        {offering.contactUrl && (
          <a
            href={offering.contactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm"
          >
            Contact provider →
          </a>
        )}
        {offering.contactPhone && (
          <a
            href={`tel:${offering.contactPhone.replace(/\s+/g, '')}`}
            className="btn-ghost text-sm"
          >
            📞 {offering.contactPhone}
          </a>
        )}
      </div>
    </article>
  );
}
