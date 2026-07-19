'use client';

import { useEffect, useState } from 'react';
import { useApi } from '../../../lib/swr';
import { ApiState } from '../../../components/api-state';

interface ChildBrief {
  id: string;
  fullName: string;
}

interface Insights {
  child: { id: string; fullName: string };
  rangeDays: number;
  rangeStart: string;
  rangeEnd: string;
  mood: {
    avg: number | null;
    prevAvg: number | null;
    delta: number | null;
    entries: number;
    series: Array<{ date: string; avg: number | null }>;
  };
  behavior: {
    total: number;
    prevTotal: number;
    delta: number;
    byKind: Record<string, number>;
    series: Array<{ date: string; count: number }>;
  };
  sessions: {
    total: number;
    prevTotal: number;
    attendancePercent: number | null;
    documentedPercent: number | null;
  };
  milestones: {
    total: number;
    achievedInWindow: number;
    inProgress: number;
  };
  goals: {
    active: number;
    avgProgress: number | null;
  };
}

const RANGES = [
  { days: 30, label: 'Last 30 days' },
  { days: 60, label: 'Last 60 days' },
  { days: 90, label: 'Last 90 days' },
];

export default function InsightsPage() {
  const { data: children = [] } = useApi<ChildBrief[]>('/children');
  const [childId, setChildId] = useState('');
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (children.length && !childId) setChildId(children[0].id);
  }, [children, childId]);

  const {
    data,
    isLoading,
    error,
    mutate,
  } = useApi<Insights>(
    childId ? `/insights/children/${childId}?days=${days}` : null,
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sage-500 text-sm uppercase tracking-wider">Insights</p>
        <h1 className="font-display text-4xl sm:text-5xl text-sage-900 mt-2">
          Trends & patterns
        </h1>
        <p className="text-sage-600 mt-2 max-w-2xl">
          Honest analytics from what you've logged — no predictions, no black-box
          scores. Use this to spot patterns and take specific things to your care team.
        </p>
      </header>

      {children.length === 0 ? (
        <div className="card text-center py-10 text-sage-500">
          Add a child first to see insights.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {children.length > 1 && (
              <select
                className="input max-w-xs"
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
              >
                {children.map((c) => (
                  <option key={c.id} value={c.id}>{c.fullName}</option>
                ))}
              </select>
            )}
            <div className="flex gap-1">
              {RANGES.map((r) => (
                <button
                  key={r.days}
                  type="button"
                  onClick={() => setDays(r.days)}
                  className={`chip transition-colors ${
                    r.days === days
                      ? 'bg-sage-600 text-cream-50'
                      : 'bg-sage-50 text-sage-700 hover:bg-sage-100'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <ApiState
            loading={isLoading}
            error={error}
            isEmpty={false}
            onRetry={() => mutate()}
          >
            {data && <InsightsPanels d={data} />}
          </ApiState>
        </>
      )}
    </div>
  );
}

function InsightsPanels({ d }: { d: Insights }) {
  return (
    <div className="space-y-6">
      {/* Top-line stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Avg mood"
          value={d.mood.avg !== null ? formatMood(d.mood.avg) : '—'}
          hint={
            d.mood.entries === 0
              ? 'No mood entries yet'
              : `${d.mood.entries} entries · ${formatDelta(d.mood.delta, 'mood')}`
          }
        />
        <Stat
          label="Behavior events"
          value={String(d.behavior.total)}
          hint={
            d.behavior.total === 0
              ? 'No events logged'
              : formatDelta(d.behavior.delta, 'count')
          }
          tone={d.behavior.delta > 0 ? 'warn' : d.behavior.delta < 0 ? 'good' : 'neutral'}
        />
        <Stat
          label="Session attendance"
          value={
            d.sessions.attendancePercent === null
              ? '—'
              : `${d.sessions.attendancePercent}%`
          }
          hint={
            d.sessions.total === 0
              ? 'No sessions yet'
              : `${d.sessions.total} scheduled · ${d.sessions.documentedPercent ?? 0}% documented`
          }
        />
        <Stat
          label="Goal progress"
          value={d.goals.avgProgress !== null ? `${d.goals.avgProgress}%` : '—'}
          hint={
            d.goals.active === 0
              ? 'No active goals'
              : `${d.goals.active} active goal${d.goals.active === 1 ? '' : 's'}`
          }
        />
      </div>

      {/* Mood sparkline */}
      <section className="card">
        <h2 className="font-display text-xl text-sage-900 mb-1">Mood over time</h2>
        <p className="text-xs text-sage-500 mb-4">
          Higher = better day. Missing days mean no entry logged.
        </p>
        {d.mood.entries === 0 ? (
          <p className="text-sage-500 text-sm">Log daily moods to see the trend.</p>
        ) : (
          <Sparkline
            data={d.mood.series.map((s) => (s.avg === null ? null : s.avg))}
            min={0}
            max={4}
            colorFn={moodColor}
            labelFn={(v) => (v === null ? '' : formatMood(v))}
          />
        )}
      </section>

      {/* Behavior stacked breakdown */}
      <section className="card">
        <h2 className="font-display text-xl text-sage-900 mb-1">Behavior events</h2>
        <p className="text-xs text-sage-500 mb-4">
          Frequency by kind across the {d.rangeDays}-day window.
        </p>
        {d.behavior.total === 0 ? (
          <p className="text-sage-500 text-sm">No behavior events logged in this window.</p>
        ) : (
          <BehaviorBreakdown by={d.behavior.byKind} />
        )}
      </section>

      {/* Milestones */}
      <section className="card">
        <h2 className="font-display text-xl text-sage-900 mb-3">Milestones</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <MilestoneStat label="Total tracked" value={d.milestones.total} />
          <MilestoneStat
            label="Achieved in window"
            value={d.milestones.achievedInWindow}
            tone="good"
          />
          <MilestoneStat label="In progress" value={d.milestones.inProgress} />
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'good' | 'warn';
}) {
  const toneClasses =
    tone === 'good'
      ? 'text-sage-700'
      : tone === 'warn'
        ? 'text-coral-700'
        : 'text-sage-900';
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wider text-sage-500">{label}</div>
      <div className={`font-display text-3xl mt-1 ${toneClasses}`}>{value}</div>
      {hint && <div className="text-xs text-sage-500 mt-1">{hint}</div>}
    </div>
  );
}

function MilestoneStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'good';
}) {
  return (
    <div className="rounded-2xl bg-cream-50 border border-cream-100 py-4">
      <div className={`font-display text-2xl ${tone === 'good' ? 'text-sage-700' : 'text-sage-900'}`}>
        {value}
      </div>
      <div className="text-xs text-sage-500 mt-1">{label}</div>
    </div>
  );
}

function Sparkline({
  data,
  min,
  max,
  colorFn,
  labelFn,
}: {
  data: (number | null)[];
  min: number;
  max: number;
  colorFn: (v: number | null) => string;
  labelFn: (v: number | null) => string;
}) {
  const span = max - min || 1;
  return (
    <div className="flex items-end gap-[2px] h-32">
      {data.map((v, i) => {
        const height = v === null ? 4 : ((v - min) / span) * 100;
        return (
          <div
            key={i}
            className={`flex-1 min-w-[3px] rounded-t ${colorFn(v)}`}
            style={{ height: `${height}%` }}
            title={labelFn(v)}
          />
        );
      })}
    </div>
  );
}

function BehaviorBreakdown({ by }: { by: Record<string, number> }) {
  const entries = Object.entries(by).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  const TONE: Record<string, string> = {
    MELTDOWN: 'bg-coral-500',
    TRIGGER: 'bg-coral-300',
    SLEEP: 'bg-mist-400',
    FOOD: 'bg-sage-400',
    ROUTINE: 'bg-lavender-400',
    OTHER: 'bg-cream-400',
  };
  return (
    <div className="space-y-3">
      <div className="flex h-3 rounded-full overflow-hidden border border-sage-100">
        {entries.map(([k, v]) => (
          <div
            key={k}
            className={`${TONE[k] ?? 'bg-sage-300'}`}
            style={{ width: `${(v / total) * 100}%` }}
            title={`${k}: ${v}`}
          />
        ))}
      </div>
      <ul className="grid sm:grid-cols-2 gap-1 text-sm">
        {entries.map(([k, v]) => (
          <li key={k} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-sm ${TONE[k] ?? 'bg-sage-300'}`} />
            <span className="text-sage-800 capitalize">{k.toLowerCase()}</span>
            <span className="text-sage-500 ml-auto tabular-nums">
              {v} · {Math.round((v / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function moodColor(v: number | null): string {
  if (v === null) return 'bg-sage-100';
  if (v >= 3.5) return 'bg-sage-500';
  if (v >= 2.5) return 'bg-sage-400';
  if (v >= 1.5) return 'bg-mist-400';
  if (v >= 0.5) return 'bg-coral-400';
  return 'bg-coral-600';
}

function formatMood(v: number): string {
  if (v >= 3.5) return '🌟 Great';
  if (v >= 2.5) return '🙂 Good';
  if (v >= 1.5) return '😐 Okay';
  if (v >= 0.5) return '😣 Tough';
  return '💔 Hard';
}

function formatDelta(delta: number | null, kind: 'mood' | 'count'): string {
  if (delta === null) return 'vs prior window: —';
  if (delta === 0) return 'no change vs prior window';
  const sign = delta > 0 ? '+' : '';
  const suffix = kind === 'mood' ? ' pts' : '';
  return `${sign}${delta}${suffix} vs prior window`;
}
