'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useApi } from '../../../lib/swr';
import { ApiState } from '../../../components/api-state';

// The public therapist directory. Only VERIFIED profiles are returned by
// the backend — parents never see a Draft, Pending, or Rejected profile.

type Mode = 'ONLINE' | 'IN_PERSON' | 'HYBRID';

interface Card {
  id: string;
  fullName: string;
  specialization: string;
  specializations: string[];
  yearsExperience: number;
  bio: string | null;
  hourlyRate: number | null;
  languages: string[];
  serviceModes: Mode[];
  city: string | null;
  state: string | null;
  photoUrl: string | null;
  acceptingNewClients: boolean;
  ageGroups: string[];
  verifiedAt: string | null;
}

const MODE_META: Record<Mode, { emoji: string; label: string }> = {
  ONLINE: { emoji: '💻', label: 'Online' },
  IN_PERSON: { emoji: '📍', label: 'In person' },
  HYBRID: { emoji: '↔', label: 'Hybrid' },
};

export default function TherapistsPage() {
  const [specialization, setSpecialization] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [language, setLanguage] = useState<string>('');
  const [mode, setMode] = useState<Mode | ''>('');
  const [acceptingOnly, setAcceptingOnly] = useState<boolean>(true);

  const query = useMemo(() => {
    const parts: string[] = [];
    if (specialization) parts.push(`specialization=${encodeURIComponent(specialization)}`);
    if (city) parts.push(`city=${encodeURIComponent(city)}`);
    if (language) parts.push(`language=${language}`);
    if (mode) parts.push(`mode=${mode}`);
    if (acceptingOnly) parts.push(`accepting=true`);
    return parts.length ? `?${parts.join('&')}` : '';
  }, [specialization, city, language, mode, acceptingOnly]);

  const { data = [], isLoading, error, mutate } = useApi<Card[]>(
    `/public/therapists${query}`,
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sage-500 text-sm uppercase tracking-wider">Care team</p>
        <h1 className="font-display text-4xl sm:text-5xl text-sage-900 mt-2">
          Find a therapist
        </h1>
        <p className="text-sage-600 mt-2 max-w-2xl">
          Every practitioner listed here has been verified by our team —
          RCI registration, education, and credentials checked. You choose
          who joins your child&rsquo;s care team, and you can revoke access
          at any time.
        </p>
      </header>

      {/* Filters */}
      <div className="bg-white/60 border border-sage-100 rounded-2xl p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-sage-500 uppercase tracking-wider">Specialisation</span>
            <input
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="e.g. Speech-Language Pathology"
              className="mt-1 w-full rounded-xl border border-sage-200 bg-cream-50 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-sage-500 uppercase tracking-wider">City</span>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Bengaluru / Chennai / Mumbai / …"
              className="mt-1 w-full rounded-xl border border-sage-200 bg-cream-50 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-xs text-sage-500 uppercase tracking-wider mr-1">Language</span>
          {['', 'EN', 'HI', 'TA', 'TE', 'KN', 'ML', 'MR', 'BN', 'GU'].map((l) => (
            <button
              key={l || 'any'}
              type="button"
              onClick={() => setLanguage(l)}
              className={`chip text-xs ${
                language === l
                  ? 'bg-sage-600 text-cream-50'
                  : 'bg-cream-100 text-sage-700 hover:bg-sage-100'
              }`}
            >
              {l || 'Any'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-xs text-sage-500 uppercase tracking-wider mr-1">Format</span>
          {[
            { v: '', label: 'Any format' },
            { v: 'ONLINE', label: '💻 Online' },
            { v: 'IN_PERSON', label: '📍 In person' },
            { v: 'HYBRID', label: '↔ Hybrid' },
          ].map((o) => (
            <button
              key={o.v || 'any'}
              type="button"
              onClick={() => setMode(o.v as Mode | '')}
              className={`chip text-xs ${
                mode === o.v
                  ? 'bg-sage-600 text-cream-50'
                  : 'bg-cream-100 text-sage-700 hover:bg-sage-100'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-sage-700 pt-1">
          <input
            type="checkbox"
            checked={acceptingOnly}
            onChange={(e) => setAcceptingOnly(e.target.checked)}
            className="rounded"
          />
          Accepting new clients only
        </label>
      </div>

      <ApiState
        loading={isLoading}
        error={error}
        isEmpty={data.length === 0}
        emptyTitle="No verified therapists match those filters."
        emptyBody="Try loosening the filters, or check back — the directory keeps growing."
        onRetry={() => mutate()}
      >
        <div className="grid md:grid-cols-2 gap-4">
          {data.map((t) => (
            <Link
              key={t.id}
              href={`/therapists/${t.id}`}
              className="card border border-sage-100 hover:border-sage-300 transition-colors space-y-3 no-underline"
            >
              <header className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-full bg-coral-100 text-coral-700 grid place-items-center font-display text-lg flex-shrink-0 overflow-hidden">
                  {t.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    t.fullName
                      .split(' ')
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg text-sage-900 leading-tight truncate">
                    {t.fullName}
                  </div>
                  <div className="text-sm text-sage-600 truncate">
                    {t.specialization}
                  </div>
                  <div className="text-xs text-sage-500 mt-0.5">
                    {t.yearsExperience} yr experience
                    {t.city ? ` · ${t.city}${t.state ? `, ${t.state}` : ''}` : ''}
                  </div>
                </div>
                <span
                  className="chip text-[10px] bg-sage-100 text-sage-800 border border-sage-200"
                  title="Verified by SpecialParent.in"
                >
                  ✓ Verified
                </span>
              </header>

              {t.bio && (
                <p className="text-sm text-sage-700 leading-relaxed line-clamp-3">{t.bio}</p>
              )}

              <div className="flex flex-wrap gap-1.5 text-xs">
                {t.serviceModes.map((m) => (
                  <span key={m} className="chip bg-cream-100 text-sage-700 border border-sage-100">
                    {MODE_META[m].emoji} {MODE_META[m].label}
                  </span>
                ))}
                {t.languages.slice(0, 5).map((l) => (
                  <span key={l} className="chip bg-mist-100 text-mist-800 border border-mist-200">
                    {l}
                  </span>
                ))}
                {!t.acceptingNewClients && (
                  <span className="chip bg-coral-100 text-coral-800 border border-coral-200">
                    Waitlist only
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </ApiState>
    </div>
  );
}
