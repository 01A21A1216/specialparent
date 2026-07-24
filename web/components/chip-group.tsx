'use client';

// Reusable multi-select chip group. Kept generic (T = string by default) so
// the therapist wizard, profile editor, and any future picker can share the
// same visual + interaction contract.

interface Props<T extends string = string> {
  label: string;
  all: T[];
  selected: T[];
  /** Optional value → display label mapping. Chip text falls back to the raw value. */
  labels?: Record<string, string>;
  /** Optional value → tooltip mapping (title attribute). */
  titles?: Record<string, string>;
  onToggle: (v: T) => void;
}

export function ChipGroup<T extends string = string>({
  label,
  all,
  selected,
  labels,
  titles,
  onToggle,
}: Props<T>) {
  return (
    <div>
      <div className="text-xs text-sage-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="flex flex-wrap gap-2">
        {all.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onToggle(v)}
            title={titles?.[v]}
            className={`chip text-xs transition-colors ${
              selected.includes(v)
                ? 'bg-sage-600 text-cream-50'
                : 'bg-cream-100 text-sage-700 hover:bg-sage-100'
            }`}
          >
            {labels?.[v] ?? v}
          </button>
        ))}
      </div>
    </div>
  );
}
