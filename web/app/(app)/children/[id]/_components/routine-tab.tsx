'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../../../lib/api';
import { useApi } from '../../../../../lib/swr';

type Category =
  | 'SELF_CARE'
  | 'MEAL'
  | 'SCHOOL'
  | 'THERAPY'
  | 'PLAY'
  | 'SLEEP'
  | 'LEARNING'
  | 'CHORE'
  | 'OTHER';

interface RoutineStep {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  category: Category;
  timeOfDay: string; // HH:MM
  durationMins: number | null;
  daysOfWeek: number[];
  active: boolean;
}

interface Preset {
  key: string;
  name: string;
  description: string;
  stepCount: number;
}

const CATEGORY_META: Record<
  Category,
  { label: string; tone: string; ring: string }
> = {
  SELF_CARE: { label: 'Self-care', tone: 'bg-mist-50 border-mist-200', ring: 'ring-mist-300' },
  MEAL: { label: 'Meal', tone: 'bg-coral-50 border-coral-200', ring: 'ring-coral-300' },
  SCHOOL: { label: 'School', tone: 'bg-sage-50 border-sage-200', ring: 'ring-sage-300' },
  THERAPY: { label: 'Therapy', tone: 'bg-lavender-50 border-lavender-200', ring: 'ring-lavender-300' },
  PLAY: { label: 'Play', tone: 'bg-cream-100 border-cream-200', ring: 'ring-cream-400' },
  SLEEP: { label: 'Sleep', tone: 'bg-sage-100 border-sage-200', ring: 'ring-sage-400' },
  LEARNING: { label: 'Learning', tone: 'bg-mist-50 border-mist-200', ring: 'ring-mist-400' },
  CHORE: { label: 'Chore', tone: 'bg-cream-50 border-cream-200', ring: 'ring-cream-300' },
  OTHER: { label: 'Other', tone: 'bg-cream-50 border-cream-200', ring: 'ring-cream-300' },
};

// Common icons offered in the picker. Users can also type their own emoji.
const ICON_LIBRARY = [
  '🌅','🌞','😴','💤','🛏️',
  '🚽','🪥','🛁','👕','👶',
  '🍳','🥣','🥞','🍎','🍌','🍛','🍱','🍽️','🥛','🍪','🍜',
  '🏫','🎒','📚','📖','✏️','🎨',
  '🩺','🗣️','✋','🧠',
  '🧩','🧸','⚽','🎮','🌳','🌞',
  '🧹','🍽️','🐕',
  '⏰','📅','🎉','🎵',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function nowHM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtTime(hm: string): string {
  const [h, m] = hm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hr12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function RoutineTab({ childId }: { childId: string }) {
  const { data: steps = [], mutate, isLoading, error } = useApi<RoutineStep[]>(
    `/children/${childId}/routine`,
  );
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<RoutineStep | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  // "Now" highlight — which step is the child in *right now*? Compute by
  // finding the last step whose time <= current time. Recompute every 60s
  // so the highlight moves through the day without a refresh.
  const [now, setNow] = useState(nowHM());
  useEffect(() => {
    const t = setInterval(() => setNow(nowHM()), 60_000);
    return () => clearInterval(t);
  }, []);

  const today = new Date().getDay();
  const stepsToday = useMemo(
    () =>
      steps.filter(
        (s) => s.active && (s.daysOfWeek.length === 0 || s.daysOfWeek.includes(today)),
      ),
    [steps, today],
  );

  const nowIdx = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < stepsToday.length; i++) {
      if (stepsToday[i].timeOfDay <= now) idx = i;
      else break;
    }
    return idx;
  }, [stepsToday, now]);

  function speak(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  function speakAll() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    stepsToday.forEach((s) => {
      const u = new SpeechSynthesisUtterance(`At ${fmtTime(s.timeOfDay)}, ${s.title}.`);
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl text-sage-900">Daily routine</h3>
          <p className="text-sm text-sage-500">
            Visual schedule for the day. Tap a card to hear it read aloud.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {stepsToday.length > 0 && (
            <button
              type="button"
              onClick={speakAll}
              className="btn-ghost text-sm"
              title="Read the whole routine aloud"
            >
              🔊 Read full routine
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowPresets((v) => !v)}
            className="btn-ghost text-sm"
          >
            📋 Load a starter
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowAdd(true);
            }}
            className="btn-primary text-sm"
          >
            + Add step
          </button>
        </div>
      </div>

      {showPresets && (
        <PresetPicker
          childId={childId}
          onLoaded={async () => {
            setShowPresets(false);
            await mutate();
          }}
          onCancel={() => setShowPresets(false)}
        />
      )}

      {(showAdd || editing) && (
        <StepForm
          childId={childId}
          step={editing ?? undefined}
          onCancel={() => {
            setShowAdd(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setShowAdd(false);
            setEditing(null);
            await mutate();
          }}
        />
      )}

      {isLoading ? (
        <div className="card animate-pulse h-40" />
      ) : error ? (
        <div className="card border-coral-200 bg-coral-50 text-coral-800">
          Couldn't load routine. {error.message}
        </div>
      ) : stepsToday.length === 0 ? (
        <div className="card text-center py-10 space-y-3">
          <div className="text-5xl">🕒</div>
          <p className="text-sage-700 font-medium">No routine yet for today.</p>
          <p className="text-sage-500 text-sm max-w-md mx-auto">
            Add a step, or load a starter template — School day, Weekend, Therapy day,
            or Toddler basics — and edit from there.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {stepsToday.map((s, i) => (
            <StepCard
              key={s.id}
              step={s}
              isNow={i === nowIdx}
              isPast={i < nowIdx}
              onSpeak={() =>
                speak(`At ${fmtTime(s.timeOfDay)}, ${s.title}. ${s.description ?? ''}`)
              }
              onEdit={() => setEditing(s)}
              onDelete={async () => {
                if (!confirm(`Delete "${s.title}"?`)) return;
                await api(`/routine/${s.id}`, { method: 'DELETE' });
                await mutate();
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Card ──
function StepCard({
  step,
  isNow,
  isPast,
  onSpeak,
  onEdit,
  onDelete,
}: {
  step: RoutineStep;
  isNow: boolean;
  isPast: boolean;
  onSpeak: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = CATEGORY_META[step.category];
  return (
    <li>
      <button
        type="button"
        onClick={onSpeak}
        className={`w-full text-left card border-2 ${meta.tone} ${
          isNow ? `ring-4 ${meta.ring}` : ''
        } ${isPast ? 'opacity-60' : ''} transition-all hover:shadow-glow flex items-center gap-4`}
        title="Tap to read this step aloud"
      >
        <div className="text-6xl leading-none flex-shrink-0" aria-hidden>
          {step.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-display text-xl text-sage-900">{step.title}</span>
            <span className="chip text-xs bg-white/70 text-sage-700">
              {fmtTime(step.timeOfDay)}
              {step.durationMins ? ` · ${step.durationMins} min` : ''}
            </span>
            <span className="chip text-xs bg-white/70 text-sage-600">{meta.label}</span>
            {isNow && (
              <span className="chip text-xs bg-coral-500 text-white">now</span>
            )}
            {step.daysOfWeek.length > 0 && (
              <span className="chip text-xs bg-white/70 text-sage-500">
                {step.daysOfWeek.map((d) => DAY_LABELS[d]).join(', ')}
              </span>
            )}
          </div>
          {step.description && (
            <p className="text-sage-700 text-sm mt-1.5">{step.description}</p>
          )}
        </div>
        <div
          className="flex-shrink-0 flex flex-col gap-1"
          onClick={(e) => e.stopPropagation()}
          role="group"
        >
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onEdit(); } }}
            className="text-sage-500 hover:text-sage-900 text-sm px-2 py-1 rounded cursor-pointer"
            aria-label={`Edit ${step.title}`}
          >
            ✎
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onDelete(); } }}
            className="text-sage-500 hover:text-coral-600 text-sm px-2 py-1 rounded cursor-pointer"
            aria-label={`Delete ${step.title}`}
          >
            ×
          </span>
        </div>
      </button>
    </li>
  );
}

// ── Add / edit form ──
function StepForm({
  childId,
  step,
  onCancel,
  onSaved,
}: {
  childId: string;
  step?: RoutineStep;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const editing = !!step;
  const [title, setTitle] = useState(step?.title ?? '');
  const [description, setDescription] = useState(step?.description ?? '');
  const [icon, setIcon] = useState(step?.icon ?? '🌅');
  const [category, setCategory] = useState<Category>(step?.category ?? 'SELF_CARE');
  const [timeOfDay, setTimeOfDay] = useState(step?.timeOfDay ?? '07:00');
  const [durationMins, setDurationMins] = useState<number | ''>(
    step?.durationMins ?? '',
  );
  const [days, setDays] = useState<Set<number>>(new Set(step?.daysOfWeek ?? []));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggleDay(d: number) {
    const next = new Set(days);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    setDays(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || undefined,
        icon,
        category,
        timeOfDay,
        durationMins: durationMins === '' ? undefined : Number(durationMins),
        daysOfWeek: [...days],
      };
      if (editing && step) {
        await api(`/routine/${step.id}`, { method: 'PATCH', body });
      } else {
        await api(`/children/${childId}/routine`, { method: 'POST', body });
      }
      await onSaved();
    } catch (e: any) {
      setErr(e?.message ?? 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-xl text-sage-900">
          {editing ? 'Edit step' : 'Add step'}
        </h4>
        <button type="button" onClick={onCancel} className="text-sage-500 hover:text-sage-900">
          Cancel
        </button>
      </div>
      {err && (
        <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-3 text-sm">
          {err}
        </div>
      )}

      <div className="grid sm:grid-cols-[80px_1fr] gap-4 items-start">
        <div>
          <label className="label">Icon</label>
          <div className="text-5xl h-16 grid place-items-center rounded-2xl bg-cream-100 border border-cream-200">
            {icon}
          </div>
        </div>
        <div>
          <label className="label">Title</label>
          <input
            className="input"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Brush teeth"
          />
        </div>
      </div>

      <div>
        <label className="label">Pick an icon</label>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 rounded-2xl bg-cream-50 border border-cream-100">
          {ICON_LIBRARY.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setIcon(e)}
              className={`text-2xl w-11 h-11 rounded-xl grid place-items-center transition-all hover:bg-white ${
                icon === e ? 'ring-2 ring-coral-400 bg-white' : ''
              }`}
              aria-label={`Choose ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="mt-2">
          <input
            className="input text-2xl w-24 text-center"
            value={icon}
            onChange={(e) => setIcon(e.target.value.slice(0, 4))}
            title="Or paste your own emoji"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="label">Time</label>
          <input
            type="time"
            className="input"
            required
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Duration (mins, optional)</label>
          <input
            type="number"
            min={1}
            max={600}
            className="input"
            value={durationMins}
            onChange={(e) =>
              setDurationMins(e.target.value === '' ? '' : parseInt(e.target.value, 10))
            }
          />
        </div>
        <div>
          <label className="label">Category</label>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {Object.entries(CATEGORY_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">
          Days (leave all off for "every day")
        </label>
        <div className="flex flex-wrap gap-1.5">
          {DAY_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              className={`chip text-xs ${
                days.has(i)
                  ? 'bg-sage-600 text-cream-50'
                  : 'bg-cream-100 text-sage-700 hover:bg-sage-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Description (optional)</label>
        <textarea
          className="input min-h-[70px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Use the timer. Song helps."
        />
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-ghost text-sm">
          Cancel
        </button>
        <button type="submit" disabled={busy} className="btn-primary text-sm">
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Add step'}
        </button>
      </div>
    </form>
  );
}

// ── Preset picker ──
function PresetPicker({
  childId,
  onLoaded,
  onCancel,
}: {
  childId: string;
  onLoaded: () => Promise<void>;
  onCancel: () => void;
}) {
  const { data: presets = [] } = useApi<Preset[]>('/routine-presets');
  const [busy, setBusy] = useState<string | null>(null);
  const [replace, setReplace] = useState(false);

  async function load(key: string) {
    if (
      replace &&
      !confirm(
        'Replace mode is on — every current step will be deleted and replaced. Continue?',
      )
    )
      return;
    setBusy(key);
    try {
      await api(`/children/${childId}/routine/preset`, {
        method: 'POST',
        body: { preset: key, replace },
      });
      await onLoaded();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not load preset');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-xl text-sage-900">Load a starter routine</h4>
        <button type="button" onClick={onCancel} className="text-sage-500 hover:text-sage-900">
          Cancel
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm text-sage-700">
        <input
          type="checkbox"
          checked={replace}
          onChange={(e) => setReplace(e.target.checked)}
        />
        Replace my current routine (otherwise steps are appended)
      </label>
      <div className="grid sm:grid-cols-2 gap-3">
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            disabled={busy !== null}
            onClick={() => load(p.key)}
            className="text-left rounded-2xl border border-sage-100 hover:border-coral-300 hover:bg-cream-50 p-4 transition-colors disabled:opacity-60"
          >
            <div className="font-medium text-sage-900">{p.name}</div>
            <div className="text-xs text-sage-500 mt-0.5">{p.stepCount} steps</div>
            <p className="text-sm text-sage-700 mt-2">{p.description}</p>
            {busy === p.key && (
              <div className="text-xs text-coral-600 mt-2">Loading…</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
