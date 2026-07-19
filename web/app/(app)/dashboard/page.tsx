'use client';

import Link from 'next/link';
import { useAuth } from '../../../components/auth-provider';
import { useApi } from '../../../lib/swr';
import { ageInYears, formatDateTime, initials } from '../../../lib/utils';
import { AiRecommendationsTile } from './_components/ai-recommendations';
import { FamilyTile } from './_components/family-tile';

interface DashboardData {
  children: Array<{
    id: string;
    fullName: string;
    dateOfBirth: string;
    diagnoses: string[];
    photoUrl?: string | null;
    _count: { milestones: number; therapySessions: number; goals: number };
  }>;
  upcomingSessions: Array<{
    id: string;
    type: string;
    scheduledAt: string;
    durationMins: number;
    child: { id: string; fullName: string };
    therapist?: { id: string; fullName: string } | null;
  }>;
  upcomingAppts: Array<{
    id: string;
    title: string;
    startsAt: string;
    location?: string | null;
    child?: { id: string; fullName: string } | null;
  }>;
  unreadNotifications: number;
  recentMoods: Array<{
    id: string;
    mood: 'GREAT' | 'GOOD' | 'OKAY' | 'TOUGH' | 'HARD';
    loggedAt: string;
    child: { id: string; fullName: string };
    note?: string | null;
  }>;
}

const moodEmoji: Record<string, string> = {
  GREAT: '🌟',
  GOOD: '🙂',
  OKAY: '😐',
  TOUGH: '😣',
  HARD: '💔',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const {
    data,
    isLoading: loading,
    error,
    mutate,
  } = useApi<DashboardData>('/users/dashboard');

  if (!user) return null;

  const role = user.role;
  const heading =
    role === 'THERAPIST'
      ? "Today's caseload"
      : role === 'TEACHER' || role === 'SCHOOL_ADMIN'
      ? "Today's classroom"
      : role === 'ADMIN'
      ? 'Platform overview'
      : 'How are things today?';
  const childrenSectionTitle =
    role === 'THERAPIST' ? 'My patients'
      : role === 'TEACHER' || role === 'SCHOOL_ADMIN' ? 'My students'
      : role === 'ADMIN' ? 'Children on platform'
      : 'My children';
  const childrenLink =
    role === 'TEACHER' || role === 'SCHOOL_ADMIN'
      ? { href: '/school', label: 'Open school portal' }
      : { href: '/children', label: 'Manage all' };
  const moodTitle =
    role === 'THERAPIST' ? 'Patient wellbeing trends' : 'Recent days';

  return (
    <div className="space-y-10">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-sage-500 text-sm uppercase tracking-wider">
            {greet()}, {user.fullName.split(' ')[0]}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl text-sage-900 mt-2">
            {heading}
          </h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-sage-600">
          {data?.unreadNotifications ? (
            <Link
              href="/notifications"
              className="chip bg-coral-100 text-coral-700 hover:bg-coral-200 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-coral-500" />
              {data.unreadNotifications} new
            </Link>
          ) : null}
        </div>
      </header>

      {loading ? (
        <SkeletonGrid />
      ) : error ? (
        <div className="card border-coral-200 bg-coral-50 text-coral-800">
          <div className="font-medium">Couldn't load your dashboard.</div>
          <p className="text-sm mt-1 text-coral-700">
            {error.message || 'Something went wrong. Try again in a moment.'}
          </p>
          <button
            type="button"
            onClick={() => mutate()}
            className="btn-ghost text-sm mt-3"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* Children */}
          <section>
            <SectionHeader title={childrenSectionTitle} link={childrenLink} />
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {data?.children.length ? (
                data.children.map((c) => (
                  <Link
                    key={c.id}
                    href={`/children/${c.id}`}
                    className="card hover:shadow-glow transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-coral-200 text-coral-700 grid place-items-center font-semibold text-xl">
                        {initials(c.fullName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-xl text-sage-900 truncate">
                          {c.fullName}
                        </h3>
                        <p className="text-sage-500 text-sm">{ageInYears(c.dateOfBirth)} old</p>
                      </div>
                    </div>
                    {c.diagnoses.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {c.diagnoses.slice(0, 3).map((d) => (
                          <span key={d} className="chip bg-sage-100 text-sage-700 text-xs">
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                      <Stat label="Milestones" value={c._count.milestones} />
                      <Stat label="Sessions" value={c._count.therapySessions} />
                      <Stat label="Goals" value={c._count.goals} />
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyState
                  title="Add your first child"
                  body="Create a profile to track milestones, therapy, and goals."
                  cta={{ href: '/children', label: 'Add child' }}
                />
              )}
              <Link
                href="/children"
                className="card border-dashed border-2 border-sage-200 hover:border-sage-400 hover:bg-sage-50 transition-colors flex items-center justify-center text-sage-700 font-medium"
              >
                + Add child
              </Link>
            </div>
          </section>

          {/* Family tile — parents with 2+ children */}
          {role === 'PARENT' && (data?.children.length ?? 0) >= 2 && <FamilyTile />}

          {/* AI ideas — parents only, when at least one child exists */}
          {role === 'PARENT' && data?.children?.[0] && (
            <AiRecommendationsTile childId={data.children[0].id} />
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Upcoming sessions */}
            <section>
              <SectionHeader title="Upcoming therapy" link={{ href: '/therapy', label: 'View all' }} />
              <div className="card divide-y divide-sage-100">
                {data?.upcomingSessions.length ? (
                  data.upcomingSessions.map((s) => (
                    <div key={s.id} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-sage-100 text-sage-700 grid place-items-center text-2xl">
                        {sessionEmoji(s.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sage-900 truncate">
                          {s.child.fullName} · {sessionLabel(s.type)}
                        </div>
                        <div className="text-sm text-sage-500">
                          {formatDateTime(s.scheduledAt)} · {s.durationMins} min
                          {s.therapist && ` · ${s.therapist.fullName}`}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sage-500 text-center py-8">No upcoming sessions yet.</p>
                )}
              </div>
            </section>

            {/* Mood/wellbeing */}
            <section>
              <SectionHeader title={moodTitle} />
              <div className="card">
                {data?.recentMoods.length ? (
                  <>
                    <div className="flex items-end gap-1.5 h-24">
                      {data.recentMoods.slice(0, 14).reverse().map((m, i) => {
                        const heights: Record<string, number> = {
                          GREAT: 100,
                          GOOD: 75,
                          OKAY: 50,
                          TOUGH: 30,
                          HARD: 15,
                        };
                        const colors: Record<string, string> = {
                          GREAT: 'bg-sage-500',
                          GOOD: 'bg-sage-400',
                          OKAY: 'bg-mist-400',
                          TOUGH: 'bg-coral-400',
                          HARD: 'bg-coral-600',
                        };
                        return (
                          <div
                            key={m.id + i}
                            className={`flex-1 ${colors[m.mood]} rounded-t-lg`}
                            style={{ height: `${heights[m.mood]}%` }}
                            title={`${m.mood} on ${formatDateTime(m.loggedAt)}`}
                          />
                        );
                      })}
                    </div>
                    <div className="mt-4 text-sm text-sage-600">
                      Latest:{' '}
                      <strong className="text-sage-900">
                        {moodEmoji[data.recentMoods[0].mood]} {data.recentMoods[0].mood.toLowerCase()}
                      </strong>{' '}
                      for {data.recentMoods[0].child.fullName}
                      {data.recentMoods[0].note && (
                        <span className="block mt-1 italic text-sage-500">"{data.recentMoods[0].note}"</span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sage-500 text-center py-8">No mood entries yet.</p>
                )}
              </div>
            </section>
          </div>

          {/* Appointments */}
          <section>
            <SectionHeader title="Appointments" link={{ href: '/appointments', label: 'View all' }} />
            <div className="card">
              {data?.upcomingAppts.length ? (
                <ul className="divide-y divide-sage-100">
                  {data.upcomingAppts.map((a) => (
                    <li key={a.id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-4">
                      <div className="text-coral-500">📅</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sage-900">{a.title}</div>
                        <div className="text-sm text-sage-500">
                          {formatDateTime(a.startsAt)}
                          {a.location && ` · ${a.location}`}
                          {a.child && ` · for ${a.child.fullName}`}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sage-500 text-center py-6">
                  No appointments scheduled. Take a breath. 🍃
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-cream-100 rounded-xl py-2">
      <div className="font-display text-xl text-sage-900">{value}</div>
      <div className="text-xs text-sage-500">{label}</div>
    </div>
  );
}

function SectionHeader({
  title,
  link,
}: {
  title: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <h2 className="font-display text-2xl text-sage-900">{title}</h2>
      {link && (
        <Link href={link.href} className="text-sage-600 hover:text-sage-900 text-sm font-medium">
          {link.label} →
        </Link>
      )}
    </div>
  );
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="card text-center col-span-full">
      <h3 className="font-display text-xl text-sage-900">{title}</h3>
      <p className="mt-2 text-sage-600">{body}</p>
      {cta && (
        <Link href={cta.href} className="btn-primary mt-5 inline-flex">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="card animate-pulse">
          <div className="h-12 bg-sage-100 rounded-2xl" />
          <div className="mt-4 h-3 bg-sage-100 rounded w-3/4" />
          <div className="mt-2 h-3 bg-sage-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function sessionEmoji(type: string) {
  return ({
    SPEECH: '🗣️',
    OCCUPATIONAL: '✋',
    PHYSIO: '🤸',
    BEHAVIORAL: '🎯',
    ABA: '🎯',
    SPECIAL_EDUCATION: '📚',
    OTHER: '✨',
  } as Record<string, string>)[type] ?? '✨';
}

function sessionLabel(type: string) {
  return ({
    SPEECH: 'Speech therapy',
    OCCUPATIONAL: 'Occupational therapy',
    PHYSIO: 'Physiotherapy',
    BEHAVIORAL: 'Behavioral therapy',
    ABA: 'ABA',
    SPECIAL_EDUCATION: 'Special education',
    OTHER: 'Session',
  } as Record<string, string>)[type] ?? 'Session';
}
