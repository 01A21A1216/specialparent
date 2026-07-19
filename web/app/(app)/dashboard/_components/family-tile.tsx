'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { api } from '../../../../lib/api';
import { useApi, mutateGlobal } from '../../../../lib/swr';
import { ageInYears, initials } from '../../../../lib/utils';

interface ChildBrief {
  id: string;
  fullName: string;
  dateOfBirth: string;
  diagnoses: string[];
  siblingGroupId?: string | null;
}

// "Your family at a glance" — shows every child on the parent's account,
// groups siblings, and gently suggests linking any that aren't yet grouped.
// Only rendered when the parent has 2+ children (otherwise there's no
// grouping to display).

export function FamilyTile() {
  const { data: children = [], mutate } = useApi<ChildBrief[]>('/children');
  const [linkingA, setLinkingA] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Group children by siblingGroupId (null → their own singleton group).
  const groups = useMemo(() => {
    const map = new Map<string, ChildBrief[]>();
    for (const c of children) {
      const key = c.siblingGroupId ?? `solo:${c.id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries()).map(([key, kids]) => ({
      key,
      kids,
      isReal: !key.startsWith('solo:'),
    }));
  }, [children]);

  // Auto-suggest: only meaningful if the parent has 2+ children AND at least
  // two aren't yet in the same group. Suggest the pairing UI once.
  const unlinkedChildren = children.filter((c) => !c.siblingGroupId);
  const showSuggest =
    children.length >= 2 && unlinkedChildren.length >= 2 && !linkingA;

  async function link(otherId: string) {
    if (!linkingA) return;
    setBusy(true);
    try {
      await api(`/children/${linkingA}/siblings`, {
        method: 'POST',
        body: { otherChildId: otherId },
      });
      setLinkingA(null);
      await Promise.all([
        mutate(),
        mutateGlobal(`/children/${linkingA}/siblings`),
        mutateGlobal(`/children/${otherId}/siblings`),
      ]);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not link');
    } finally {
      setBusy(false);
    }
  }

  if (children.length < 2) return null;

  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="font-display text-2xl text-sage-900">Your family</h2>
          <p className="text-sm text-sage-500 mt-1">
            Siblings share a care picture — link them so their care teams see the whole story.
          </p>
        </div>
      </div>

      <div className="card space-y-4">
        {groups.map((g) => (
          <div key={g.key}>
            {g.isReal && g.kids.length > 1 && (
              <div className="text-xs uppercase tracking-wider text-sage-500 mb-2">
                Siblings
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {g.kids.map((c) => (
                <Link
                  key={c.id}
                  href={`/children/${c.id}`}
                  className="flex items-center gap-2 rounded-2xl bg-cream-50 border border-cream-100 hover:bg-cream-100 px-3 py-2 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-coral-100 text-coral-700 grid place-items-center font-semibold text-xs">
                    {initials(c.fullName)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-sage-900 truncate">
                      {c.fullName}
                    </div>
                    <div className="text-[10px] text-sage-500">
                      {ageInYears(c.dateOfBirth)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {showSuggest && (
          <div className="rounded-2xl bg-sage-50 border border-sage-100 p-3 text-sm text-sage-700">
            <span className="mr-2">💡</span>
            You have multiple children on your account. Link the ones that are siblings so
            their care teams see the family picture.{' '}
            <button
              type="button"
              onClick={() => setLinkingA(unlinkedChildren[0].id)}
              className="font-medium text-coral-700 hover:text-coral-900 underline underline-offset-2"
            >
              Link two siblings
            </button>
          </div>
        )}

        {linkingA && (
          <div className="rounded-2xl bg-cream-100 border border-cream-200 p-3 space-y-2">
            <div className="text-sm text-sage-800">
              Which child is {children.find((c) => c.id === linkingA)?.fullName}'s sibling?
            </div>
            <div className="flex flex-wrap gap-2">
              {children
                .filter((c) => c.id !== linkingA)
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={busy}
                    onClick={() => link(c.id)}
                    className="chip bg-white border border-sage-200 hover:bg-sage-50 text-sage-800 disabled:opacity-60"
                  >
                    {c.fullName}
                  </button>
                ))}
              <button
                type="button"
                onClick={() => setLinkingA(null)}
                className="chip text-sage-500 hover:text-sage-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
