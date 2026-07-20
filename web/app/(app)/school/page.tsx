'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../../../components/auth-provider';
import { api } from '../../../lib/api';
import { useApi } from '../../../lib/swr';
import { ApiState } from '../../../components/api-state';
import { ageInYears, formatDate, initials } from '../../../lib/utils';

interface Student {
  id: string;
  fullName: string;
  dateOfBirth: string;
  diagnoses: string[];
  photoUrl: string | null;
  activeIepId: string | null;
  draftIepCount: number;
  pendingIepCount: number;
  primaryCaregiver: { id: string; fullName: string } | null;
}

interface SchoolBucket {
  school: {
    id: string | null;
    name: string;
    board?: string | null;
    city?: string | null;
    isInclusive?: boolean;
  };
  students: Student[];
}

interface IepInboxItem {
  id: string;
  childId: string;
  childName: string;
  schoolYear: string;
  title: string | null;
  status: 'DRAFT' | 'PENDING_REVIEW';
  updatedAt: string;
  approvalsCount: number;
  userHasSigned: boolean;
}

interface Dashboard {
  role: 'TEACHER' | 'SCHOOL_ADMIN' | 'OTHER';
  studentsBySchool: SchoolBucket[];
  iepInbox: IepInboxItem[];
  totals: {
    students: number;
    schools: number;
    pendingIepsForMe: number;
  };
}

export default function SchoolPortal() {
  const { user } = useAuth();
  const router = useRouter();
  const { data, isLoading, error, mutate } =
    useApi<Dashboard>('/school-dashboard');

  const [messagingUserId, setMessagingUserId] = useState<string | null>(null);

  async function messageParent(childId: string, parentUserId: string) {
    setMessagingUserId(parentUserId);
    try {
      const res = await api<{ threadId: string }>('/messages/threads', {
        method: 'POST',
        body: { toUserId: parentUserId, childId },
      });
      router.push(`/messages?thread=${res.threadId}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not open thread');
      setMessagingUserId(null);
    }
  }

  const roleLabel =
    user?.role === 'TEACHER'
      ? 'Teacher portal'
      : user?.role === 'SCHOOL_ADMIN'
        ? 'School admin portal'
        : 'School portal';
  const heading =
    user?.role === 'TEACHER'
      ? 'My classroom'
      : user?.role === 'SCHOOL_ADMIN'
        ? 'School overview'
        : 'Inclusive classroom';

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sage-500 text-sm uppercase tracking-wider">
          {roleLabel}
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-sage-900 mt-2">
          {heading}
        </h1>
        <p className="mt-2 text-sage-600 max-w-2xl">
          Students you're on the care team for, grouped by school. IEPs waiting for
          your signature surface at the top.
        </p>
      </header>

      <ApiState
        loading={isLoading}
        error={error}
        isEmpty={false}
        onRetry={() => mutate()}
      >
        {data && (
          <>
            {/* Top-line stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard label="Students" value={data.totals.students} />
              <StatCard label="Schools" value={data.totals.schools} />
              <StatCard
                label="IEPs awaiting your signature"
                value={data.totals.pendingIepsForMe}
                tone={data.totals.pendingIepsForMe > 0 ? 'coral' : 'sage'}
              />
            </div>

            {/* IEP inbox */}
            {data.iepInbox.length > 0 && (
              <section>
                <h2 className="font-display text-2xl text-sage-900 mb-4">
                  IEP inbox ({data.iepInbox.length})
                </h2>
                <div className="card space-y-2">
                  {data.iepInbox.map((iep) => (
                    <IepInboxRow
                      key={iep.id}
                      iep={iep}
                      onSigned={mutate}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Students grouped by school */}
            <section className="space-y-8">
              {data.studentsBySchool.length === 0 ? (
                <div className="card text-center py-12">
                  <div className="text-4xl mb-2">🎓</div>
                  <p className="text-sage-700 font-medium">
                    No students on your care team yet.
                  </p>
                  <p className="text-sage-500 text-sm mt-2 max-w-md mx-auto">
                    Parents invite teachers and school admins to a child's
                    profile from the child's Care team section. Once accepted,
                    those children show up here.
                  </p>
                </div>
              ) : (
                data.studentsBySchool.map((bucket) => (
                  <SchoolSection
                    key={bucket.school.id ?? bucket.school.name}
                    bucket={bucket}
                    messagingUserId={messagingUserId}
                    onMessageParent={messageParent}
                  />
                ))
              )}
            </section>
          </>
        )}
      </ApiState>
    </div>
  );
}

function IepInboxRow({
  iep,
  onSigned,
}: {
  iep: IepInboxItem;
  onSigned: () => Promise<unknown>;
}) {
  const [signing, setSigning] = useState(false);
  async function sign() {
    setSigning(true);
    try {
      await api(`/ieps/${iep.id}/approve`, {
        method: 'POST',
        body: {},
      });
      await onSigned();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not sign');
    } finally {
      setSigning(false);
    }
  }
  return (
    <div className="py-3 first:pt-0 last:pb-0 flex items-center gap-4 flex-wrap">
      <div className="w-10 h-10 rounded-full bg-lavender-100 text-lavender-500 grid place-items-center text-lg flex-shrink-0">
        📘
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sage-900">
          {iep.childName} · {iep.title ?? `${iep.schoolYear} IEP`}
        </div>
        <div className="text-xs text-sage-500 mt-0.5">
          <span
            className={`chip text-[10px] mr-1 ${
              iep.status === 'PENDING_REVIEW'
                ? 'bg-mist-100 text-mist-700'
                : 'bg-cream-200 text-sage-800'
            }`}
          >
            {iep.status === 'PENDING_REVIEW' ? 'pending review' : 'draft'}
          </span>
          {iep.approvalsCount} sign{iep.approvalsCount === 1 ? '' : 's'} so far ·
          updated {formatDate(iep.updatedAt)}
          {iep.userHasSigned && (
            <span className="text-sage-700 ml-1">· ✓ you signed</span>
          )}
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {!iep.userHasSigned && (
          <button
            type="button"
            onClick={sign}
            disabled={signing}
            className="btn-primary text-sm"
          >
            {signing ? 'Signing…' : '✓ Sign'}
          </button>
        )}
        <Link
          href={`/children/${iep.childId}`}
          className="btn-ghost text-sm"
        >
          Open IEP →
        </Link>
      </div>
    </div>
  );
}

function SchoolSection({
  bucket,
  messagingUserId,
  onMessageParent,
}: {
  bucket: SchoolBucket;
  messagingUserId: string | null;
  onMessageParent: (childId: string, userId: string) => Promise<void>;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="font-display text-xl text-sage-900 flex items-center gap-2">
          <span aria-hidden>🏫</span>
          {bucket.school.name}
          {bucket.school.isInclusive && (
            <span className="chip text-xs bg-sage-100 text-sage-700">
              Inclusive
            </span>
          )}
        </h2>
        <div className="text-xs text-sage-500">
          {bucket.school.board && `${bucket.school.board} · `}
          {bucket.school.city && `${bucket.school.city} · `}
          {bucket.students.length} student{bucket.students.length === 1 ? '' : 's'}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bucket.students.map((s) => (
          <StudentCard
            key={s.id}
            student={s}
            messaging={s.primaryCaregiver?.id === messagingUserId}
            onMessage={() =>
              s.primaryCaregiver &&
              onMessageParent(s.id, s.primaryCaregiver.id)
            }
          />
        ))}
      </div>
    </div>
  );
}

function StudentCard({
  student,
  messaging,
  onMessage,
}: {
  student: Student;
  messaging: boolean;
  onMessage: () => void;
}) {
  const iepStatus = (() => {
    if (student.pendingIepCount > 0) {
      return {
        label: `${student.pendingIepCount} IEP in review`,
        tone: 'bg-mist-100 text-mist-700',
      };
    }
    if (student.draftIepCount > 0) {
      return {
        label: `${student.draftIepCount} IEP draft`,
        tone: 'bg-cream-200 text-sage-800',
      };
    }
    if (student.activeIepId) {
      return { label: 'IEP active', tone: 'bg-sage-100 text-sage-700' };
    }
    return null;
  })();

  return (
    <article className="card space-y-3">
      <Link
        href={`/children/${student.id}`}
        className="flex items-center gap-3 group"
      >
        <div className="w-11 h-11 rounded-full bg-coral-100 text-coral-700 grid place-items-center font-semibold text-sm flex-shrink-0">
          {initials(student.fullName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg text-sage-900 truncate group-hover:underline">
            {student.fullName}
          </div>
          <div className="text-xs text-sage-500">
            {ageInYears(student.dateOfBirth)}
            {student.diagnoses.length > 0 &&
              ` · ${student.diagnoses.slice(0, 2).join(', ')}`}
          </div>
        </div>
      </Link>

      {iepStatus && (
        <span className={`chip text-xs w-fit ${iepStatus.tone}`}>
          {iepStatus.label}
        </span>
      )}

      {student.primaryCaregiver && (
        <div className="pt-2 border-t border-sage-100 flex items-center justify-between gap-2">
          <div className="text-xs text-sage-500 min-w-0 truncate">
            Parent:{' '}
            <span className="text-sage-800">
              {student.primaryCaregiver.fullName}
            </span>
          </div>
          <button
            type="button"
            onClick={onMessage}
            disabled={messaging}
            className="btn-ghost text-xs flex-shrink-0"
            title={`Message ${student.primaryCaregiver.fullName}`}
          >
            {messaging ? '…' : '💬 Message'}
          </button>
        </div>
      )}
    </article>
  );
}

function StatCard({
  label,
  value,
  tone = 'sage',
}: {
  label: string;
  value: number | string;
  tone?: 'sage' | 'coral';
}) {
  const toneClass =
    tone === 'coral'
      ? 'bg-coral-50 border-coral-100'
      : 'bg-sage-50 border-sage-100';
  return (
    <div className={`card border ${toneClass}`}>
      <div className="text-xs text-sage-500 uppercase tracking-wider">{label}</div>
      <div className={`font-display text-3xl mt-1 ${tone === 'coral' ? 'text-coral-700' : 'text-sage-900'}`}>
        {value}
      </div>
    </div>
  );
}
