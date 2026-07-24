'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useApi } from '../../../lib/swr';
import { ApiState } from '../../../components/api-state';
import { LANGUAGE_CODES, languageLabel } from '../../../lib/languages';
import {
  LEVEL_META, LEVEL_ORDER, MODE_META,
  type ServiceMode as Mode, type TherapistLevel as Level,
} from '../../../lib/therapist-levels';
import { initials } from '../../../lib/utils';

// The public therapist directory. Only VERIFIED profiles are returned by
// the backend — parents never see a Draft, Pending, or Rejected profile.

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
  level: Level | null;
  verifiedAt: string | null;
}


export default function TherapistsPage() {
  const [specialization, setSpecialization] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [language, setLanguage] = useState<string>('');
  const [mode, setMode] = useState<Mode | ''>('');
  const [level, setLevel] = useState<Level | ''>('');
  const [acceptingOnly, setAcceptingOnly] = useState<boolean>(true);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (specialization) p.set('specialization', specialization);
    if (city) p.set('city', city);
    if (language) p.set('language', language);
    if (mode) p.set('mode', mode);
    if (level) p.set('level', level);
    if (acceptingOnly) p.set('accepting', 'true');
    const s = p.toString();
    return s ? `?${s}` : '';
  }, [specialization, city, language, mode, level, acceptingOnly]);

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
          <button
            type="button"
            onClick={() => setLanguage('')}
            className={`chip text-xs ${
              language === ''
                ? 'bg-sage-600 text-cream-50'
                : 'bg-cream-100 text-sage-700 hover:bg-sage-100'
            }`}
          >
            Any
          </button>
          {LANGUAGE_CODES.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLanguage(l)}
              className={`chip text-xs ${
                language === l
                  ? 'bg-sage-600 text-cream-50'
                  : 'bg-cream-100 text-sage-700 hover:bg-sage-100'
              }`}
            >
              {languageLabel(l)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-xs text-sage-500 uppercase tracking-wider mr-1">Format</span>
          <button
            type="button"
            onClick={() => setMode('')}
            className={`chip text-xs ${
              mode === ''
                ? 'bg-sage-600 text-cream-50'
                : 'bg-cream-100 text-sage-700 hover:bg-sage-100'
            }`}
          >
            Any format
          </button>
          {(Object.keys(MODE_META) as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`chip text-xs ${
                mode === m
                  ? 'bg-sage-600 text-cream-50'
                  : 'bg-cream-100 text-sage-700 hover:bg-sage-100'
              }`}
            >
              {MODE_META[m].emoji} {MODE_META[m].label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-xs text-sage-500 uppercase tracking-wider mr-1" title="Board Analyst Certification Board tier — ABA practitioners only">
            ABA level
          </span>
          <button
            type="button"
            onClick={() => setLevel('')}
            className={`chip text-xs ${
              level === '' ? 'bg-sage-600 text-cream-50' : 'bg-cream-100 text-sage-700 hover:bg-sage-100'
            }`}
          >
            Any level
          </button>
          {LEVEL_ORDER.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              title={LEVEL_META[l].long}
              className={`chip text-xs ${
                level === l ? 'bg-sage-600 text-cream-50' : 'bg-cream-100 text-sage-700 hover:bg-sage-100'
              }`}
            >
              {LEVEL_META[l].short}
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
                    initials(t.fullName)
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
                <div className="flex flex-col items-end gap-1">
                  <span
                    className="chip text-[10px] bg-sage-100 text-sage-800 border border-sage-200"
                    title="Verified by SpecialParents.in"
                  >
                    ✓ Verified
                  </span>
                  {t.level && (
                    <span
                      className={`chip text-[10px] ${LEVEL_META[t.level].tone}`}
                      title={LEVEL_META[t.level].long}
                    >
                      {LEVEL_META[t.level].short}
                    </span>
                  )}
                </div>
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
                    {languageLabel(l)}
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
