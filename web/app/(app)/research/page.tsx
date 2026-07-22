'use client';

import { useMemo, useState } from 'react';
import { useApi } from '../../../lib/swr';
import { ApiState } from '../../../components/api-state';

// Treatments research library. Editorial voice: neutral, referenced.
// The single most important UI element is the evidence-level chip —
// NOT_RECOMMENDED / EXPERIMENTAL entries are given loud styling so a
// parent skimming the page cannot miss the warning.

type TreatmentSystem =
  | 'ALLOPATHIC'
  | 'AYURVEDA'
  | 'HOMEOPATHY'
  | 'NUTRITIONAL'
  | 'BIOMEDICAL'
  | 'CELLULAR'
  | 'MIND_BODY'
  | 'OTHER';

type EvidenceLevel =
  | 'STANDARD_OF_CARE'
  | 'EMERGING'
  | 'LIMITED'
  | 'EXPERIMENTAL'
  | 'NOT_RECOMMENDED';

type TreatmentFocus =
  | 'CORE_SYMPTOMS'
  | 'COMORBIDITY'
  | 'SYMPTOM_RELIEF'
  | 'SUPPORT';

interface Entry {
  id: string;
  system: TreatmentSystem;
  focus: TreatmentFocus;
  evidenceLevel: EvidenceLevel;
  title: string;
  alsoKnownAs: string | null;
  summary: string;
  whatItIs: string;
  whatResearchShows: string;
  considerations: string;
  indiaContext: string | null;
  references: string[];
  prescriptionRequired: boolean;
}

const SYSTEM_META: Record<
  TreatmentSystem,
  { label: string; emoji: string; oneLine: string }
> = {
  ALLOPATHIC: {
    label: 'English medicine',
    emoji: '💊',
    oneLine: 'Modern/allopathic — prescribed by MBBS-qualified doctors, regulated by CDSCO.',
  },
  AYURVEDA: {
    label: 'Ayurveda',
    emoji: '🌿',
    oneLine: 'Traditional Indian system — regulated by the AYUSH Ministry, practised by BAMS-qualified practitioners.',
  },
  HOMEOPATHY: {
    label: 'Homeopathy',
    emoji: '🧪',
    oneLine: 'Practised by BHMS-qualified practitioners under the AYUSH Ministry.',
  },
  NUTRITIONAL: {
    label: 'Diet & nutrition',
    emoji: '🥗',
    oneLine: 'Elimination diets and supplements — best guided by a paediatric dietitian.',
  },
  BIOMEDICAL: {
    label: 'Biomedical',
    emoji: '⚗️',
    oneLine: 'Off-label protocols (chelation, HBOT, B12) — varying evidence, some with real harm risk.',
  },
  CELLULAR: {
    label: 'Cellular therapies',
    emoji: '🧬',
    oneLine: 'Stem cell and exosome therapies — experimental for autism; ICMR does not recognise as established.',
  },
  MIND_BODY: {
    label: 'Therapies & behavioural',
    emoji: '🧠',
    oneLine: 'Speech, occupational, behavioural, and sensory approaches — the foundation of care.',
  },
  OTHER: { label: 'Other', emoji: '📚', oneLine: '' },
};

const SYSTEM_ORDER: TreatmentSystem[] = [
  'MIND_BODY',
  'ALLOPATHIC',
  'NUTRITIONAL',
  'AYURVEDA',
  'HOMEOPATHY',
  'BIOMEDICAL',
  'CELLULAR',
  'OTHER',
];

const EVIDENCE_META: Record<
  EvidenceLevel,
  { label: string; short: string; tone: string; ring: string; icon: string; blurb: string }
> = {
  STANDARD_OF_CARE: {
    label: 'Standard of care',
    short: 'Standard',
    tone: 'bg-sage-100 text-sage-800 border-sage-300',
    ring: 'border-sage-300',
    icon: '✓',
    blurb: 'Guideline-backed, first-line care with strong evidence.',
  },
  EMERGING: {
    label: 'Emerging evidence',
    short: 'Emerging',
    tone: 'bg-mist-100 text-mist-800 border-mist-300',
    ring: 'border-mist-300',
    icon: '↗',
    blurb: 'Growing evidence base — promising but not fully established.',
  },
  LIMITED: {
    label: 'Limited evidence',
    short: 'Limited',
    tone: 'bg-cream-200 text-sage-800 border-cream-400',
    ring: 'border-cream-400',
    icon: '?',
    blurb: 'Some studies, weak or mixed findings — proceed with caution and clear goals.',
  },
  EXPERIMENTAL: {
    label: 'Experimental — trials only',
    short: 'Experimental',
    tone: 'bg-coral-100 text-coral-800 border-coral-400',
    ring: 'border-coral-400',
    icon: '⚠',
    blurb: 'Research phase only — should be pursued through registered clinical trials, not paid clinics.',
  },
  NOT_RECOMMENDED: {
    label: 'Not recommended',
    short: 'Not recommended',
    tone: 'bg-coral-200 text-coral-900 border-coral-500',
    ring: 'border-coral-500',
    icon: '⛔',
    blurb: 'Evidence against, or documented harm outweighs benefit.',
  },
};

const EVIDENCE_ORDER: EvidenceLevel[] = [
  'STANDARD_OF_CARE',
  'EMERGING',
  'LIMITED',
  'EXPERIMENTAL',
  'NOT_RECOMMENDED',
];

const FOCUS_META: Record<TreatmentFocus, { label: string }> = {
  CORE_SYMPTOMS: { label: 'Core symptoms' },
  COMORBIDITY: { label: 'Co-occurring conditions' },
  SYMPTOM_RELIEF: { label: 'Symptom relief' },
  SUPPORT: { label: 'General support' },
};

export default function ResearchPage() {
  const [system, setSystem] = useState<TreatmentSystem | 'all'>('all');
  const [evidence, setEvidence] = useState<EvidenceLevel | 'all'>('all');
  const [focus, setFocus] = useState<TreatmentFocus | 'all'>('all');

  const query = useMemo(() => {
    const parts: string[] = [];
    if (system !== 'all') parts.push(`system=${system}`);
    if (evidence !== 'all') parts.push(`evidenceLevel=${evidence}`);
    if (focus !== 'all') parts.push(`focus=${focus}`);
    return parts.length ? `?${parts.join('&')}` : '';
  }, [system, evidence, focus]);

  const { data = [], isLoading, error, mutate } = useApi<Entry[]>(
    `/public/research${query}`,
  );

  const bySystem = SYSTEM_ORDER.map((s) => ({
    system: s,
    items: data
      .filter((e) => e.system === s)
      .sort((a, b) =>
        EVIDENCE_ORDER.indexOf(a.evidenceLevel) -
        EVIDENCE_ORDER.indexOf(b.evidenceLevel),
      ),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sage-500 text-sm uppercase tracking-wider">Research</p>
        <h1 className="font-display text-4xl sm:text-5xl text-sage-900 mt-2">
          Treatments &amp; protocols — what the research says
        </h1>
        <p className="text-sage-600 mt-2 max-w-3xl">
          A curated library covering English medicine, Ayurveda, Homeopathy,
          diet-based approaches, biomedical protocols, and experimental
          therapies including stem cell therapy. Every entry carries an
          evidence label so you can weigh options with your child&rsquo;s doctor.
        </p>
      </header>

      {/* Disclaimer — deliberately prominent. This page can shape
          real decisions for real children; the framing has to be clear. */}
      <div className="rounded-2xl border-2 border-cream-400 bg-cream-100 p-4 text-sm text-sage-800 leading-relaxed">
        <div className="font-medium text-sage-900 mb-1">
          Educational information, not medical advice.
        </div>
        <p>
          This library summarises published evidence. It does not endorse any
          treatment and does not replace a consultation with a licensed doctor,
          registered Ayurvedic or Homeopathic practitioner, or a
          paediatric neurologist. Before starting, stopping, or paying for any
          therapy — especially anything labelled{' '}
          <span className="chip bg-coral-100 text-coral-800 border border-coral-300 mx-0.5">
            ⚠ Experimental
          </span>{' '}
          or{' '}
          <span className="chip bg-coral-200 text-coral-900 border border-coral-400 mx-0.5">
            ⛔ Not recommended
          </span>{' '}
          — talk to your child&rsquo;s treating team.
        </p>
      </div>

      {/* Evidence key */}
      <details className="rounded-2xl bg-white/70 border border-sage-100 p-4 text-sm">
        <summary className="font-medium text-sage-900 cursor-pointer">
          How to read the evidence labels
        </summary>
        <ul className="mt-3 space-y-2">
          {EVIDENCE_ORDER.map((lvl) => {
            const m = EVIDENCE_META[lvl];
            return (
              <li key={lvl} className="flex items-start gap-3">
                <span className={`chip ${m.tone} shrink-0`}>
                  {m.icon} {m.label}
                </span>
                <span className="text-sage-700">{m.blurb}</span>
              </li>
            );
          })}
        </ul>
      </details>

      {/* Filters */}
      <div className="space-y-3">
        <FilterRow
          label="System"
          value={system}
          onChange={(v) => setSystem(v as TreatmentSystem | 'all')}
          options={[
            { value: 'all', label: 'All systems' },
            ...SYSTEM_ORDER.map((s) => ({
              value: s,
              label: `${SYSTEM_META[s].emoji} ${SYSTEM_META[s].label}`,
            })),
          ]}
        />
        <FilterRow
          label="Evidence"
          value={evidence}
          onChange={(v) => setEvidence(v as EvidenceLevel | 'all')}
          options={[
            { value: 'all', label: 'Any evidence level' },
            ...EVIDENCE_ORDER.map((lvl) => ({
              value: lvl,
              label: `${EVIDENCE_META[lvl].icon} ${EVIDENCE_META[lvl].short}`,
            })),
          ]}
        />
        <FilterRow
          label="Focus"
          value={focus}
          onChange={(v) => setFocus(v as TreatmentFocus | 'all')}
          options={[
            { value: 'all', label: 'Any focus' },
            ...(Object.keys(FOCUS_META) as TreatmentFocus[]).map((f) => ({
              value: f,
              label: FOCUS_META[f].label,
            })),
          ]}
        />
      </div>

      <ApiState
        loading={isLoading}
        error={error}
        isEmpty={data.length === 0}
        emptyTitle="No entries match those filters."
        emptyBody="Try loosening the filters — the library is growing."
        onRetry={() => mutate()}
      >
        <div className="space-y-10">
          {bySystem.map((group) => {
            const meta = SYSTEM_META[group.system];
            return (
              <section key={group.system}>
                <h2 className="font-display text-2xl text-sage-900 mb-1 flex items-center gap-2">
                  <span aria-hidden>{meta.emoji}</span>
                  {meta.label}
                  <span className="text-sm text-sage-500 font-normal">
                    ({group.items.length})
                  </span>
                </h2>
                {meta.oneLine && (
                  <p className="text-sm text-sage-600 mb-4">{meta.oneLine}</p>
                )}
                <div className="grid gap-4">
                  {group.items.map((e) => (
                    <EntryCard key={e.id} entry={e} />
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

function EntryCard({ entry }: { entry: Entry }) {
  const evidence = EVIDENCE_META[entry.evidenceLevel];
  const isAlarm =
    entry.evidenceLevel === 'NOT_RECOMMENDED' ||
    entry.evidenceLevel === 'EXPERIMENTAL';

  return (
    <article
      className={`card border-2 space-y-4 ${
        isAlarm ? evidence.ring : 'border-sage-100'
      }`}
    >
      <header className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className={`chip ${evidence.tone} font-medium`}>
            {evidence.icon} {evidence.label}
          </span>
          <span className="chip bg-white/70 text-sage-600 border border-sage-100">
            {FOCUS_META[entry.focus].label}
          </span>
          {entry.prescriptionRequired && (
            <span className="chip bg-white/70 text-sage-600 border border-sage-100">
              Prescription only
            </span>
          )}
        </div>
        <h3 className="font-display text-xl text-sage-900">{entry.title}</h3>
        {entry.alsoKnownAs && (
          <div className="text-sm text-sage-500">
            Also known as: {entry.alsoKnownAs}
          </div>
        )}
        <p className="text-sm text-sage-700 leading-relaxed">{entry.summary}</p>
      </header>

      <Section label="What it is" body={entry.whatItIs} />
      <Section label="What the research shows" body={entry.whatResearchShows} />
      <Section
        label="Safety and considerations"
        body={entry.considerations}
        emphasise={isAlarm}
      />
      {entry.indiaContext && (
        <Section label="India context" body={entry.indiaContext} />
      )}

      {entry.references.length > 0 && (
        <div className="pt-2 border-t border-sage-100">
          <div className="text-xs text-sage-500 uppercase tracking-wider mb-2">
            References
          </div>
          <ul className="space-y-1 text-sm">
            {entry.references.map((r, i) => (
              <li key={i}>
                <a
                  href={r}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sage-700 hover:text-sage-900 underline break-all"
                >
                  {r}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function Section({
  label,
  body,
  emphasise,
}: {
  label: string;
  body: string;
  emphasise?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-sage-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <p
        className={`text-sm leading-relaxed whitespace-pre-line ${
          emphasise ? 'text-coral-900 font-medium' : 'text-sage-700'
        }`}
      >
        {body}
      </p>
    </div>
  );
}
