'use client';

import Link from 'next/link';
import { useApi } from '../../../lib/swr';
import { formatDateTime } from '../../../lib/utils';

interface Overview {
  totals: {
    users: number;
    activeUsers: number;
    children: number;
    sessions: number;
    sessionsThisMonth: number;
    posts: number;
    comments: number;
    publishedResources: number;
    schemes: number;
  };
  usersByRole: Array<{ role: string; count: number }>;
  moodDistribution: Array<{ mood: string; count: number }>;
  sessionsByType: Array<{ type: string; count: number }>;
  recentSignups: Array<{
    id: string; fullName: string; email: string; role: string;
    isActive: boolean; createdAt: string;
  }>;
  signupTrend: Array<{ day: string; count: number }>;
}

const ROLE_TONE: Record<string, string> = {
  PARENT: 'bg-coral-100 text-coral-800',
  THERAPIST: 'bg-sage-100 text-sage-800',
  TEACHER: 'bg-mist-100 text-mist-800',
  SCHOOL_ADMIN: 'bg-mist-100 text-mist-800',
  ADMIN: 'bg-lavender-100 text-lavender-500',
};

const MOOD_COLOR: Record<string, string> = {
  GREAT: '#557a5d',
  GOOD: '#94b399',
  OKAY: '#7896b6',
  TOUGH: '#e8825c',
  HARD: '#c54d24',
};

export default function AdminOverview() {
  const { data, error, isLoading: loading } = useApi<Overview>('/admin/overview');

  if (loading) return <div className="card animate-pulse h-64" />;
  if (error) return <div className="card text-coral-700">{error.message || 'Failed to load'}</div>;
  if (!data) return null;

  return (
    <div className="space-y-10">
      <header>
        <p className="text-sage-500 text-sm uppercase tracking-wider">Admin</p>
        <h1 className="font-display text-4xl sm:text-5xl text-sage-900 mt-2">
          Platform overview
        </h1>
        <p className="mt-2 text-sage-600">
          A live look at users, activity, and content health.
        </p>
      </header>

      <AdminTabs current="overview" />

      {/* Big numbers */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BigStat label="Total users" value={data.totals.users} sub={`${data.totals.activeUsers} active`} />
        <BigStat label="Children" value={data.totals.children} />
        <BigStat label="Therapy sessions" value={data.totals.sessions} sub={`${data.totals.sessionsThisMonth} in last 30 days`} />
        <BigStat label="Community posts" value={data.totals.posts} sub={`${data.totals.comments} comments`} />
        <BigStat label="Published resources" value={data.totals.publishedResources} />
        <BigStat label="Govt schemes listed" value={data.totals.schemes} />
        <BigStat label="Active engagement" value={`${pctActive(data.totals.activeUsers, data.totals.users)}%`} sub="of users still active" />
        <BigStat label="Avg sessions / child" value={ratio(data.totals.sessions, data.totals.children)} />
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <SectionHeader title="Users by role" />
          <div className="card">
            <UsersByRoleChart data={data.usersByRole} />
          </div>
        </section>
        <section>
          <SectionHeader title="Signups (last 30 days)" />
          <div className="card">
            <SignupTrendChart trend={data.signupTrend} />
          </div>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <SectionHeader title="Mood distribution" />
          <div className="card">
            <MoodChart data={data.moodDistribution} />
          </div>
        </section>
        <section>
          <SectionHeader title="Sessions by type" />
          <div className="card">
            <SessionsByTypeChart data={data.sessionsByType} />
          </div>
        </section>
      </div>

      <section>
        <SectionHeader title="Recent signups" link={{ href: '/admin/users', label: 'Manage all users' }} />
        <div className="card">
          {data.recentSignups.length === 0 ? (
            <p className="text-sage-500 py-4 text-center">No signups yet.</p>
          ) : (
            <ul className="divide-y divide-sage-100">
              {data.recentSignups.map((u) => (
                <li key={u.id} className="py-3 flex items-center gap-4 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sage-900 truncate">{u.fullName}</div>
                    <div className="text-sm text-sage-500 truncate">{u.email}</div>
                  </div>
                  <span className={`chip text-xs ${ROLE_TONE[u.role] || 'bg-sage-100 text-sage-700'}`}>
                    {u.role.toLowerCase()}
                  </span>
                  <span className="text-xs text-sage-500">{formatDateTime(u.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Phase-3 placeholders */}
      <section className="grid md:grid-cols-2 gap-4">
        <Phase3Card icon="💳" title="Subscriptions & billing" body="Per-parent, per-school, and per-therapist plans, with Razorpay/Stripe webhooks. In Phase 3." />
        <Phase3Card icon="📈" title="Revenue dashboard" body="MRR, ARR, churn, LTV — wired to the billing system. In Phase 3." />
        <Phase3Card icon="✅" title="Therapist verification" body="Document upload, license check, background verification workflow. In Phase 3." />
        <Phase3Card icon="🏫" title="School onboarding" body="Multi-tenant school setup, bulk student import, custom branding. In Phase 3." />
      </section>
    </div>
  );
}

// ─── Pieces ────────────────────────────────────────────────

function AdminTabs({ current }: { current: string }) {
  const tabs = [
    { id: 'overview', label: 'Overview', href: '/admin' },
    { id: 'users', label: 'Users', href: '/admin/users' },
    { id: 'moderation', label: 'Moderation', href: '/admin/moderation' },
    { id: 'cms', label: 'CMS', href: '/admin/cms' },
  ];
  return (
    <nav className="flex gap-1 border-b border-sage-100 -mb-2 overflow-x-auto">
      {tabs.map((t) => {
        const active = t.id === current;
        return (
          <Link
            key={t.id}
            href={t.href}
            className={
              'px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ' +
              (active
                ? 'border-coral-500 text-sage-900'
                : 'border-transparent text-sage-600 hover:text-sage-900')
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

function BigStat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="card">
      <div className="text-sm text-sage-600">{label}</div>
      <div className="font-display text-3xl text-sage-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-sage-500 mt-1">{sub}</div>}
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

function Phase3Card({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="card bg-cream-100 border-cream-200">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="font-display text-lg text-sage-900">{title}</h3>
          <p className="text-sm text-sage-600 mt-1">{body}</p>
        </div>
      </div>
    </div>
  );
}

function UsersByRoleChart({ data }: { data: Array<{ role: string; count: number }> }) {
  if (data.length === 0) return <p className="text-sage-500 py-4 text-center">No data</p>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.role}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-sage-700 font-medium capitalize">
              {d.role.toLowerCase().replace('_', ' ')}
            </span>
            <span className="text-sage-500">{d.count}</span>
          </div>
          <div className="h-3 bg-sage-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-sage-500 rounded-full"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SignupTrendChart({ trend }: { trend: Array<{ day: string; count: number }> }) {
  // Render last 30 days, fill missing days with 0.
  const days: Array<{ day: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000);
    const key = d.toISOString().slice(0, 10);
    const found = trend.find((t) => t.day === key);
    days.push({ day: key, count: found?.count ?? 0 });
  }
  const max = Math.max(...days.map((d) => d.count), 1);
  const totalSignups = days.reduce((s, d) => s + d.count, 0);

  return (
    <div>
      <div className="text-sm text-sage-600 mb-3">
        <strong className="text-sage-900">{totalSignups}</strong> signups in last 30 days
      </div>
      <div className="flex items-end gap-1 h-24">
        {days.map((d, i) => (
          <div
            key={i}
            className="flex-1 bg-coral-300 hover:bg-coral-500 transition-colors rounded-sm"
            style={{ height: `${Math.max((d.count / max) * 100, 2)}%` }}
            title={`${d.day} — ${d.count}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-sage-500 mt-2">
        <span>{days[0].day.slice(5)}</span>
        <span>today</span>
      </div>
    </div>
  );
}

function MoodChart({ data }: { data: Array<{ mood: string; count: number }> }) {
  const order = ['GREAT', 'GOOD', 'OKAY', 'TOUGH', 'HARD'];
  const sorted = order
    .map((m) => data.find((d) => d.mood === m))
    .filter(Boolean) as Array<{ mood: string; count: number }>;
  if (sorted.length === 0) return <p className="text-sage-500 py-4 text-center">No mood data</p>;
  const total = sorted.reduce((s, d) => s + d.count, 0);
  return (
    <div>
      <div className="flex h-6 rounded-full overflow-hidden bg-sage-50">
        {sorted.map((d) => (
          <div
            key={d.mood}
            style={{
              width: `${(d.count / total) * 100}%`,
              backgroundColor: MOOD_COLOR[d.mood],
            }}
            title={`${d.mood}: ${d.count}`}
          />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
        {sorted.map((d) => (
          <li key={d.mood} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: MOOD_COLOR[d.mood] }} />
            <span className="text-sage-700 capitalize">{d.mood.toLowerCase()}</span>
            <span className="text-sage-500 ml-auto">{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SessionsByTypeChart({ data }: { data: Array<{ type: string; count: number }> }) {
  if (data.length === 0) return <p className="text-sage-500 py-4 text-center">No session data</p>;
  const max = Math.max(...data.map((d) => d.count), 1);
  const labels: Record<string, string> = {
    SPEECH: 'Speech',
    OCCUPATIONAL: 'Occupational',
    PHYSIO: 'Physio',
    BEHAVIORAL: 'Behavioral',
    ABA: 'ABA',
    SPECIAL_EDUCATION: 'Special education',
    OTHER: 'Other',
  };
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.type}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-sage-700 font-medium">{labels[d.type] || d.type}</span>
            <span className="text-sage-500">{d.count}</span>
          </div>
          <div className="h-3 bg-sage-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-coral-500 rounded-full"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function pctActive(active: number, total: number) {
  if (total === 0) return 0;
  return Math.round((active / total) * 100);
}
function ratio(a: number, b: number) {
  if (b === 0) return '—';
  return (a / b).toFixed(1);
}
