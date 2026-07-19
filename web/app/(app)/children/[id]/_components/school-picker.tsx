'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../../../../../lib/api';

interface SchoolBrief {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  board?: string | null;
  isInclusive?: boolean;
  _count?: { children: number };
}

// A search-or-create combobox for schools. Debounces search, offers to
// create-a-new-school when no result matches. Emits the picked school id +
// display name to the parent so the outer form can save both schoolId +
// schoolName (schoolName kept as a plain-text fallback).

export function SchoolPicker({
  value,
  displayName,
  onPick,
}: {
  value: string | null;
  displayName: string;
  onPick: (school: { id: string | null; name: string }) => void;
}) {
  const [query, setQuery] = useState(displayName);
  const [results, setResults] = useState<SchoolBrief[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await api<SchoolBrief[]>(
          `/schools?q=${encodeURIComponent(query.trim())}`,
        );
        setResults(list);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, open]);

  function pick(s: SchoolBrief) {
    onPick({ id: s.id, name: s.name });
    setQuery(s.name);
    setOpen(false);
  }

  async function createNew() {
    if (!query.trim()) return;
    setCreating(true);
    try {
      const s = await api<SchoolBrief>('/schools', {
        method: 'POST',
        body: { name: query.trim() },
      });
      pick(s);
    } finally {
      setCreating(false);
    }
  }

  const canOfferCreate =
    query.trim().length >= 2 &&
    !loading &&
    !results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          className="input flex-1"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            // Text-only edit unlinks any previous school pick until the user
            // chooses one from the list — keeps schoolName editable freely.
            if (value) onPick({ id: null, name: e.target.value });
          }}
          placeholder="Search or type a school name"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onPick({ id: null, name: '' });
              setQuery('');
            }}
            className="btn-ghost text-xs"
            title="Unlink from directory"
          >
            Unlink
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-2xl border border-sage-200 bg-white shadow-lg max-h-72 overflow-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-sage-500">Searching…</div>
          )}
          {!loading &&
            results.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => pick(s)}
                className="w-full text-left px-4 py-2.5 hover:bg-sage-50 border-b border-sage-100 last:border-b-0"
              >
                <div className="font-medium text-sage-900">{s.name}</div>
                <div className="text-xs text-sage-500 flex gap-2 flex-wrap">
                  {s.board && <span>{s.board}</span>}
                  {s.city && (
                    <span>
                      {s.city}
                      {s.state ? `, ${s.state}` : ''}
                    </span>
                  )}
                  {s.isInclusive && (
                    <span className="chip bg-sage-100 text-sage-700 text-[10px]">
                      Inclusive
                    </span>
                  )}
                  {s._count?.children ? (
                    <span>· {s._count.children} on platform</span>
                  ) : null}
                </div>
              </button>
            ))}
          {canOfferCreate && (
            <button
              type="button"
              onClick={createNew}
              disabled={creating}
              className="w-full text-left px-4 py-3 hover:bg-coral-50 text-coral-700 border-t border-sage-100"
            >
              {creating
                ? 'Creating…'
                : `+ Add "${query.trim()}" to the school directory`}
            </button>
          )}
          {!loading && results.length === 0 && !canOfferCreate && (
            <div className="px-4 py-3 text-sm text-sage-500">
              Start typing to search.
            </div>
          )}
        </div>
      )}

      {open && (
        <button
          type="button"
          aria-label="close"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-10 cursor-default"
          tabIndex={-1}
        />
      )}
    </div>
  );
}
