'use client';

import Link from 'next/link';
import { useAuth } from '../../../components/auth-provider';
import { useApi } from '../../../lib/swr';
import { ageInYears, initials } from '../../../lib/utils';

interface Student {
  id: string;
  fullName: string;
  dateOfBirth: string;
  diagnoses: string[];
  schoolName?: string | null;
  classroom?: string | null;
  _count: { milestones: number; therapySessions: number; goals: number };
}

export default function SchoolPortal() {
  const { user } = useAuth();
  const { data, isLoading: loading } = useApi<{ children: Student[] }>(
    '/users/dashboard',
  );
  const students = data?.children ?? null;

  return (
    <div className="space-y-10">
      <header>
        <p className="text-sage-500 text-sm uppercase tracking-wider">
          {user?.role === 'TEACHER' ? 'Teacher portal' : 'School portal'}
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-sage-900 mt-2">
          Inclusive classroom
        </h1>
        <p className="mt-3 text-sage-600 max-w-2xl leading-relaxed">
          The students you support, in one place. Built around the way Indian
          inclusive classrooms actually run — with IEP tools and accommodation
          planning coming next.
        </p>
      </header>

      {/* Quick stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Students" value={students?.length ?? '—'} tone="sage" />
      </section>

      {/* Students list */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-display text-2xl text-sage-900">My students</h2>
          <span className="text-sm text-sage-500">
            Linked from caregiver / therapist records
          </span>
        </div>
        {loading ? (
          <div className="card animate-pulse h-40" />
        ) : students && students.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((s) => (
              <Link
                key={s.id}
                href={`/children/${s.id}`}
                className="card hover:shadow-glow transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-sage-100 text-sage-700 grid place-items-center font-semibold">
                    {initials(s.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg text-sage-900 truncate">
                      {s.fullName}
                    </h3>
                    <p className="text-sage-500 text-xs">{ageInYears(s.dateOfBirth)} old</p>
                  </div>
                </div>
                {s.diagnoses.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {s.diagnoses.slice(0, 2).map((d) => (
                      <span key={d} className="chip bg-sage-100 text-sage-700 text-xs">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
                {s.schoolName && (
                  <p className="text-xs text-sage-500 mt-3">
                    {s.schoolName}
                    {s.classroom && ` · ${s.classroom}`}
                  </p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="card text-center py-10 text-sage-500">
            No students linked yet. Ask parents to share their child's profile with your school.
          </div>
        )}
      </section>

      <div className="card bg-cream-100 border-cream-200 flex items-center gap-4 flex-wrap">
        <div className="text-3xl">🎓</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg text-sage-900">
            Full IEP editor coming in Phase 3
          </h3>
          <p className="text-sm text-sage-600 mt-1">
            Parent collaboration, review cycles, accommodation library, and report
            export. Your input shapes what we build first.
          </p>
        </div>
        <a
          href="mailto:hello@specialparent.in"
          className="btn-coral text-sm"
        >
          Share feedback
        </a>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: 'sage' | 'coral' | 'mist' | 'lavender';
}) {
  const toneClasses = {
    sage: 'bg-sage-50 border-sage-100',
    coral: 'bg-coral-50 border-coral-100',
    mist: 'bg-mist-50 border-mist-100',
    lavender: 'bg-lavender-50 border-lavender-100',
  }[tone];
  return (
    <div className={`card border ${toneClasses}`}>
      <div className="text-sm text-sage-600">{label}</div>
      <div className="font-display text-3xl text-sage-900 mt-1">{value}</div>
    </div>
  );
}
