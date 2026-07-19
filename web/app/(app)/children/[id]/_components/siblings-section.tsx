'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../../../lib/api';
import { useApi } from '../../../../../lib/swr';
import { ageInYears, initials } from '../../../../../lib/utils';

interface SiblingBrief {
  id: string;
  fullName: string;
  dateOfBirth: string;
  photoUrl?: string | null;
  diagnoses: string[];
}

interface ChildBrief {
  id: string;
  fullName: string;
  dateOfBirth: string;
}

// Shows the other children in this child's sibling group and lets the
// primary caregiver link a new sibling from the parent's own children.

export function SiblingsSection({
  childId,
  canManage,
}: {
  childId: string;
  canManage: boolean;
}) {
  const { data: siblings = [], mutate } = useApi<SiblingBrief[]>(
    `/children/${childId}/siblings`,
  );
  const { data: myChildren = [] } = useApi<ChildBrief[]>('/children');
  const [linking, setLinking] = useState(false);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkable = myChildren.filter(
    (c) => c.id !== childId && !siblings.some((s) => s.id === c.id),
  );

  useEffect(() => {
    if (linkable[0] && !selected) setSelected(linkable[0].id);
  }, [linkable, selected]);

  async function link() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/children/${childId}/siblings`, {
        method: 'POST',
        body: { otherChildId: selected },
      });
      setLinking(false);
      await mutate();
    } catch (e: any) {
      setError(e?.message ?? 'Could not link');
    } finally {
      setBusy(false);
    }
  }

  async function removeAllLinks() {
    if (!confirm('Remove this child from the sibling group?')) return;
    setBusy(true);
    try {
      await api(`/children/${childId}/siblings`, { method: 'DELETE' });
      await mutate();
    } finally {
      setBusy(false);
    }
  }

  if (siblings.length === 0 && !canManage) return null;

  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl text-sage-900">Siblings</h3>
        {canManage && siblings.length > 0 && (
          <button
            type="button"
            onClick={removeAllLinks}
            className="text-xs text-sage-500 hover:text-coral-600"
            disabled={busy}
          >
            Leave sibling group
          </button>
        )}
      </div>

      {siblings.length === 0 ? (
        <p className="text-sage-500 text-sm">
          {canManage
            ? 'No siblings linked yet. If you have multiple children on the platform, link them so their care teams can see the family picture.'
            : 'No siblings linked yet.'}
        </p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {siblings.map((s) => (
            <li key={s.id} className="flex items-center gap-3 p-3 rounded-2xl bg-cream-50 border border-cream-100">
              <div className="w-10 h-10 rounded-full bg-coral-100 text-coral-700 grid place-items-center font-semibold">
                {initials(s.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <a
                  href={`/children/${s.id}`}
                  className="font-medium text-sage-900 hover:underline truncate block"
                >
                  {s.fullName}
                </a>
                <div className="text-xs text-sage-500">
                  {ageInYears(s.dateOfBirth)}
                  {s.diagnoses.length > 0 && ` · ${s.diagnoses.join(', ')}`}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="pt-2 border-t border-sage-100">
          {linking ? (
            <div className="space-y-3">
              {error && (
                <div className="rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 p-3 text-sm">
                  {error}
                </div>
              )}
              {linkable.length === 0 ? (
                <p className="text-sm text-sage-500">
                  You need at least one other child on your account to link a sibling.
                </p>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  <select
                    className="input flex-1 min-w-[160px]"
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {linkable.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={link}
                    disabled={busy}
                    className="btn-primary text-sm"
                  >
                    {busy ? 'Linking…' : 'Link as sibling'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinking(false)}
                    className="btn-ghost text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setLinking(true)}
              className="text-sm text-coral-600 hover:text-coral-800 font-medium"
            >
              + Link a sibling
            </button>
          )}
        </div>
      )}
    </section>
  );
}
