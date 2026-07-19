'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';
import { ageInYears, formatDate, initials } from '../../../../lib/utils';
import { useAuth } from '../../../../components/auth-provider';
import { BehaviorTab } from './_components/behavior-tab';
import { CareTeamSection } from './_components/care-team-section';
import { EditProfilePanel } from './_components/edit-profile-panel';
import { Field } from './_components/field';
import { GoalsTab } from './_components/goals-tab';
import { IepTab } from './_components/iep-tab';
import { InviteManager } from './_components/invite-manager';
import { MilestonesTab } from './_components/milestones-tab';
import { MoodTab } from './_components/mood-tab';
import { ReportsTab } from './_components/reports-tab';
import { RoutineTab } from './_components/routine-tab';
import { SessionsTab } from './_components/sessions-tab';
import { SiblingsSection } from './_components/siblings-section';
import { ChildDetail } from './_components/types';

type TabKey =
  | 'routine'
  | 'milestones'
  | 'goals'
  | 'sessions'
  | 'mood'
  | 'behavior'
  | 'iep'
  | 'reports';

export default function ChildDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id;
  const [child, setChild] = useState<ChildDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('routine');
  const [editing, setEditing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api<ChildDetail>(`/children/${id}`);
      setChild(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div className="text-sage-500">Loading…</div>;
  if (!child) return <div className="text-sage-500">Not found.</div>;

  const isPrimary =
    user?.role === 'ADMIN' ||
    child.caregivers.some((c) => c.user.id === user?.id && c.isPrimary);

  return (
    <div className="space-y-8">
      <Link href="/children" className="text-sage-600 hover:text-sage-900 text-sm">
        ← All children
      </Link>

      {editing ? (
        <EditProfilePanel
          child={child}
          onClose={() => setEditing(false)}
          onSaved={load}
          onDeleted={() => router.push('/children')}
        />
      ) : (
        <header className="card">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="w-20 h-20 rounded-full bg-coral-200 text-coral-700 grid place-items-center font-semibold text-3xl flex-shrink-0">
              {initials(child.fullName)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-4xl text-sage-900">{child.fullName}</h1>
              <p className="text-sage-600 mt-1">
                {ageInYears(child.dateOfBirth)} old · born {formatDate(child.dateOfBirth)}
                {child.schoolName && ` · ${child.schoolName}`}
              </p>
              {child.diagnoses.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {child.diagnoses.map((d) => (
                    <span key={d} className="chip bg-sage-100 text-sage-700">{d}</span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setEditing(true)} className="btn-ghost text-sm flex-shrink-0">
              ✎ Edit profile
            </button>
          </div>

          {child.hobbies.length > 0 && (
            <div className="mt-5">
              <div className="text-xs text-sage-500 uppercase tracking-wider mb-2">Hobbies &amp; interests</div>
              <div className="flex flex-wrap gap-1.5">
                {child.hobbies.map((h) => (
                  <span key={h} className="chip bg-lavender-100 text-lavender-500">{h}</span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <Field label="Communication" value={child.communicationType || '—'} />
            <Field label="School" value={child.schoolName || '—'} />
            <Field label="Emergency contact" value={child.emergencyContact || '—'} />
            <Field label="Allergies" value={child.allergies.join(', ') || 'None'} />
            <Field label="Medications" value={child.medications.join(', ') || 'None'} />
            <Field label="Sensory triggers" value={child.sensoryTriggers.join(', ') || '—'} />
          </div>

          {(child.calmingStrategies.length > 0 || child.notes) && (
            <div className="mt-5 rounded-2xl bg-cream-100 border border-cream-200 p-4">
              <span className="text-xs uppercase tracking-wider text-sage-500">Behavior notes</span>
              {child.calmingStrategies.length > 0 && (
                <div className="mt-2">
                  <span className="text-sage-500 text-sm">Calming strategies: </span>
                  <span className="text-sage-800 text-sm">
                    {child.calmingStrategies.join(', ')}
                  </span>
                </div>
              )}
              {child.notes && (
                <p className="mt-2 text-sage-800 whitespace-pre-wrap">{child.notes}</p>
              )}
            </div>
          )}
        </header>
      )}

      {!editing && (
        <CareTeamSection
          childId={child.id}
          caregivers={child.caregivers}
          sessions={child.therapySessions}
          currentUserId={user?.id}
          canManage={isPrimary}
          onChange={load}
        />
      )}

      {!editing && (
        <SiblingsSection childId={child.id} canManage={isPrimary} />
      )}

      {!editing && isPrimary && (
        <InviteManager childId={child.id} childName={child.fullName} />
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap border-b border-sage-100">
        {(
          [
            ['routine', 'Routine'],
            ['milestones', `Milestones (${child.milestones.length})`],
            ['goals', `Goals (${child.goals.length})`],
            ['sessions', `Sessions (${child.therapySessions.length})`],
            ['mood', `Mood (${child.moodEntries.length})`],
            ['behavior', 'Behavior'],
            ['iep', 'IEP'],
            ['reports', `Reports (${child.diagnosticReports.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-3 font-medium text-sage-700 border-b-2 -mb-px ${
              tab === key
                ? 'border-coral-500 text-sage-900'
                : 'border-transparent hover:text-sage-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'routine' && <RoutineTab childId={child.id} />}
      {tab === 'milestones' && (
        <MilestonesTab childId={child.id} milestones={child.milestones} onChange={load} />
      )}
      {tab === 'goals' && <GoalsTab childId={child.id} goals={child.goals} onChange={load} />}
      {tab === 'sessions' && <SessionsTab sessions={child.therapySessions} />}
      {tab === 'mood' && <MoodTab childId={child.id} moods={child.moodEntries} onChange={load} />}
      {tab === 'behavior' && <BehaviorTab childId={child.id} />}
      {tab === 'iep' && <IepTab childId={child.id} />}
      {tab === 'reports' && (
        <ReportsTab childId={child.id} reports={child.diagnosticReports} onChange={load} />
      )}
    </div>
  );
}
