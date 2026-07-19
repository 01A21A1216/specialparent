'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../../../lib/api';
import { initials } from '../../../../../lib/utils';
import { ChildDetail } from './types';

export function CareTeamSection({
  childId,
  caregivers,
  sessions,
  currentUserId,
  canManage,
  onChange,
}: {
  childId: string;
  caregivers: ChildDetail['caregivers'];
  sessions: ChildDetail['therapySessions'];
  currentUserId?: string;
  canManage: boolean;
  onChange: () => Promise<void> | void;
}) {
  const router = useRouter();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [messagingId, setMessagingId] = useState<string | null>(null);

  async function messageUser(userId: string) {
    setMessagingId(userId);
    try {
      const res = await api<{ threadId: string }>('/messages/threads', {
        method: 'POST',
        body: { toUserId: userId, childId },
      });
      router.push(`/messages?thread=${res.threadId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not open message thread');
      setMessagingId(null);
    }
  }

  // Unique therapists who have sessions with this child but aren't yet in
  // the Caregiver table (e.g. self-added by admin, or historical data).
  const caregiverUserIds = new Set(caregivers.map((c) => c.user.id));
  const therapists = Array.from(
    new Map(
      sessions
        .filter((s) => s.therapist && !caregiverUserIds.has(s.therapist!.id))
        .map((s) => [s.therapist!.id, s.therapist!]),
    ).values(),
  );

  if (caregivers.length === 0 && therapists.length === 0) return null;

  async function remove(c: ChildDetail['caregivers'][number]) {
    if (
      !confirm(
        `Remove ${c.user.fullName} from the care team? They will lose access to this child's data.`,
      )
    )
      return;
    setRemovingId(c.id);
    try {
      await api(`/caregivers/${c.id}`, { method: 'DELETE' });
      await onChange();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not remove';
      alert(msg);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section>
      <h2 className="font-display text-2xl text-sage-900 mb-4">Care team</h2>
      <div className="card space-y-6">
        {caregivers.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-sage-500 font-medium mb-3">
              Caregivers ({caregivers.length})
            </h3>
            <ul className="grid sm:grid-cols-2 gap-3">
              {caregivers.map((c) => {
                const isSelf = c.user.id === currentUserId;
                const removable = canManage && !c.isPrimary && !isSelf;
                return (
                  <li key={c.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-coral-200 text-coral-700 grid place-items-center font-semibold text-sm flex-shrink-0">
                      {initials(c.user.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sage-900 truncate flex items-center gap-2 flex-wrap">
                        {c.user.fullName}
                        {isSelf && (
                          <span className="chip bg-cream-200 text-sage-700 text-[10px] uppercase tracking-wider">
                            you
                          </span>
                        )}
                        {c.isPrimary && (
                          <span className="chip bg-sage-100 text-sage-700 text-[10px] uppercase tracking-wider">
                            primary
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-sage-500 capitalize">
                        {c.relationship} ·{' '}
                        {c.user.role.toLowerCase().replace('_', ' ')}
                      </div>
                    </div>
                    {!isSelf && (
                      <button
                        onClick={() => messageUser(c.user.id)}
                        disabled={messagingId === c.user.id}
                        className="btn-ghost text-xs flex-shrink-0"
                        title={`Message ${c.user.fullName}`}
                      >
                        {messagingId === c.user.id ? '…' : '💬 Message'}
                      </button>
                    )}
                    {removable && (
                      <button
                        onClick={() => remove(c)}
                        disabled={removingId === c.id}
                        className="btn-ghost text-xs text-coral-700 flex-shrink-0"
                        title={`Remove ${c.user.fullName}`}
                      >
                        {removingId === c.id ? '…' : 'Remove'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {therapists.length > 0 && (
          <div
            className={
              caregivers.length > 0
                ? 'pt-6 border-t border-sage-100'
                : ''
            }
          >
            <h3 className="text-xs uppercase tracking-wider text-sage-500 font-medium mb-3">
              Therapists in sessions ({therapists.length})
            </h3>
            <ul className="grid sm:grid-cols-2 gap-3">
              {therapists.map((t) => (
                <li key={t.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sage-200 text-sage-700 grid place-items-center font-semibold text-sm flex-shrink-0">
                    {initials(t.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sage-900 truncate">{t.fullName}</div>
                    <div className="text-xs text-sage-500">therapist</div>
                  </div>
                  {t.id !== currentUserId && (
                    <button
                      onClick={() => messageUser(t.id)}
                      disabled={messagingId === t.id}
                      className="btn-ghost text-xs flex-shrink-0"
                    >
                      {messagingId === t.id ? '…' : '💬 Message'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
