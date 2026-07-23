'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from './auth-provider';
import { api } from '../lib/api';
import { useApi } from '../lib/swr';
import { cn, initials } from '../lib/utils';
import {
  BeakerIcon,
  BellIcon,
  BookIcon,
  CalendarIcon,
  ChartIcon,
  ChatIcon,
  LeafIcon,
  ChevronDoubleLeftIcon,
  CloseIcon,
  EmergencyIcon,
  FlagIcon,
  HeartIcon,
  HomeIcon,
  Logo,
  MenuIcon,
  ShieldIcon,
  SignoutIcon,
  SparkleIcon,
  SpeechIcon,
  UsersIcon,
  WandIcon,
} from './nav-icons';

type NavItem = {
  href: string;
  label: string;
  icon: (p: { className?: string }) => React.ReactElement;
};

const NAV_PARENT: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/children', label: 'Children', icon: HeartIcon },
  { href: '/insights', label: 'Insights', icon: ChartIcon },
  { href: '/therapy', label: 'Therapy', icon: SparkleIcon },
  { href: '/appointments', label: 'Appointments', icon: CalendarIcon },
  { href: '/messages', label: 'Messages', icon: ChatIcon },
  { href: '/documents', label: 'Documents', icon: BookIcon },
  { href: '/notifications', label: 'Notifications', icon: BellIcon },
  { href: '/aac', label: 'Communication', icon: SpeechIcon },
  { href: '/community', label: 'Community', icon: ChatIcon },
  { href: '/therapists', label: 'Find therapists', icon: UsersIcon },
  { href: '/wellness', label: 'Wellness', icon: LeafIcon },
  { href: '/research', label: 'Treatments', icon: BeakerIcon },
  { href: '/resources', label: 'Resources', icon: BookIcon },
  { href: '/schemes', label: 'Govt Schemes', icon: ShieldIcon },
  { href: '/ai', label: 'AI Guide', icon: WandIcon },
  { href: '/emergency', label: 'Emergency', icon: EmergencyIcon },
];

const NAV_THERAPIST: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/therapist/profile', label: 'My profile', icon: HeartIcon },
  { href: '/children', label: 'My caseload', icon: UsersIcon },
  { href: '/therapy', label: 'Sessions', icon: SparkleIcon },
  { href: '/appointments', label: 'Appointments', icon: CalendarIcon },
  { href: '/messages', label: 'Messages', icon: ChatIcon },
  { href: '/notifications', label: 'Notifications', icon: BellIcon },
  { href: '/community', label: 'Community', icon: ChatIcon },
  { href: '/wellness', label: 'Wellness', icon: LeafIcon },
  { href: '/research', label: 'Treatments', icon: BeakerIcon },
  { href: '/resources', label: 'Resources', icon: BookIcon },
  { href: '/ai', label: 'AI Guide', icon: WandIcon },
];

const NAV_SCHOOL: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/school', label: 'Students & IEPs', icon: HeartIcon },
  { href: '/community', label: 'Community', icon: ChatIcon },
  { href: '/resources', label: 'Resources', icon: BookIcon },
  { href: '/schemes', label: 'Govt Schemes', icon: ShieldIcon },
];

const NAV_ADMIN: NavItem[] = [
  { href: '/admin', label: 'Overview', icon: HomeIcon },
  { href: '/admin/users', label: 'Users', icon: UsersIcon },
  { href: '/admin/therapists', label: 'Therapists', icon: HeartIcon },
  { href: '/admin/moderation', label: 'Moderation', icon: FlagIcon },
  { href: '/admin/cms', label: 'CMS', icon: BookIcon },
  { href: '/community', label: 'Community', icon: ChatIcon },
  { href: '/schemes', label: 'Govt Schemes', icon: ShieldIcon },
  { href: '/ai', label: 'AI Guide', icon: WandIcon },
];

function navFor(role: string): NavItem[] {
  switch (role) {
    case 'THERAPIST':
      return NAV_THERAPIST;
    case 'TEACHER':
    case 'SCHOOL_ADMIN':
      return NAV_SCHOOL;
    case 'ADMIN':
      return NAV_ADMIN;
    default:
      return NAV_PARENT;
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  // Desktop-only: sidebar can collapse to an icon-only rail. Persisted so it
  // survives navigation and reloads.
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  // Poll every 30s for the message unread count — cheap query, feeds the
  // sidebar badge. Skipped when the user isn't loaded yet.
  const { data: unreadMessages } = useApi<{ count: number }>(
    user ? '/messages/unread-count' : null,
    { refreshInterval: 30_000 },
  );

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname || '/dashboard')}`);
    }
  }, [user, loading, router, pathname]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    try {
      if (localStorage.getItem('sp_sidebar_collapsed') === '1') {
        setDesktopCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function toggleDesktopCollapsed() {
    setDesktopCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem('sp_sidebar_collapsed', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-cream-50">
        <div className="text-sage-500 font-display text-xl">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-cream-50/90 backdrop-blur border-b border-sage-100 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo className="w-8 h-8" />
          <span className="font-display text-lg text-sage-900">SpecialParent</span>
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.replace('/');
            }}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-full p-2 text-sage-600 hover:bg-coral-50 hover:text-coral-700"
          >
            <SignoutIcon className="w-6 h-6" />
          </button>
          <button
            onClick={() => setNavOpen((o) => !o)}
            aria-label="Open navigation"
            className="rounded-full p-2 hover:bg-sage-100"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
        </div>
      </header>

      <div className="lg:flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'lg:sticky lg:top-0 lg:h-screen lg:flex-shrink-0 lg:flex lg:flex-col lg:transition-[width] lg:duration-200',
            desktopCollapsed ? 'lg:w-20' : 'lg:w-72',
            'fixed inset-0 z-40 bg-cream-50 lg:bg-cream-50',
            navOpen ? 'flex flex-col' : 'hidden lg:flex',
          )}
        >
          {/* Mobile header inside sidebar (has close button) */}
          <div className="lg:hidden flex items-center justify-between px-5 pt-5 pb-3 border-b border-sage-100">
            <div className="flex items-center gap-2">
              <Logo className="w-8 h-8" />
              <span className="font-display text-xl text-sage-900">
                SpecialParent
              </span>
            </div>
            <button
              onClick={() => setNavOpen(false)}
              aria-label="Close navigation"
              className="rounded-full p-2 hover:bg-sage-100"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Desktop header */}
          <div
            className={cn(
              'hidden lg:flex items-center gap-3 pt-8 pb-3',
              desktopCollapsed ? 'px-4 justify-center' : 'px-7',
            )}
          >
            <Logo className="w-10 h-10 flex-shrink-0" />
            {!desktopCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-display text-2xl text-sage-900 leading-none">
                  SpecialParent
                </span>
                <span className="text-xs tracking-widest text-coral-500 mt-1">
                  .IN
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle */}
          <div className="hidden lg:flex px-3 pb-2">
            <button
              type="button"
              onClick={toggleDesktopCollapsed}
              aria-label={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="w-full py-2 rounded-2xl grid place-items-center text-sage-500 hover:bg-sage-100 hover:text-sage-800 transition-colors"
            >
              <ChevronDoubleLeftIcon
                className={cn(
                  'w-4 h-4 transition-transform',
                  desktopCollapsed && 'rotate-180',
                )}
              />
            </button>
          </div>

          <nav className="flex-1 px-3 pb-6 space-y-1.5 mt-4 lg:mt-0 overflow-y-auto">
            {navFor(user.role).map((item) => {
              const active =
                pathname === item.href || pathname?.startsWith(item.href + '/');
              const Icon = item.icon;
              const badge =
                item.href === '/messages' && (unreadMessages?.count ?? 0) > 0
                  ? unreadMessages!.count
                  : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={desktopCollapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl font-medium transition-colors px-4 py-3 relative',
                    desktopCollapsed && 'lg:justify-center lg:px-0',
                    active
                      ? 'bg-sage-600 text-cream-50 shadow-soft'
                      : 'text-sage-700 hover:bg-sage-100',
                  )}
                >
                  <span className="relative flex-shrink-0">
                    <Icon className="w-5 h-5" />
                    {badge > 0 && desktopCollapsed && (
                      // Collapsed sidebar → tiny dot on the icon so users
                      // still see the unread indicator with no label present.
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-coral-500 ring-2 ring-cream-50" />
                    )}
                  </span>
                  <span className={cn(desktopCollapsed && 'lg:hidden')}>
                    {item.label}
                  </span>
                  {badge > 0 && !desktopCollapsed && (
                    <span
                      className={cn(
                        'ml-auto text-xs font-semibold rounded-full min-w-[1.5rem] px-1.5 py-0.5 text-center tabular-nums',
                        active
                          ? 'bg-cream-50 text-sage-800'
                          : 'bg-coral-500 text-white',
                      )}
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-sage-100 p-3">
            <div
              className={cn(
                'flex items-center gap-2',
                desktopCollapsed && 'lg:flex-col',
              )}
            >
              <Link
                href="/profile"
                title={desktopCollapsed ? user.fullName : undefined}
                className={cn(
                  'flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors',
                  desktopCollapsed &&
                    'lg:flex-none lg:justify-center lg:w-full lg:px-2',
                  pathname === '/profile' || pathname?.startsWith('/profile/')
                    ? 'bg-sage-600 text-cream-50 shadow-soft'
                    : 'text-sage-800 hover:bg-sage-100',
                )}
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-coral-100"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-coral-200 text-coral-700 grid place-items-center font-semibold flex-shrink-0">
                    {initials(user.fullName)}
                  </div>
                )}
                <div
                  className={cn(
                    'min-w-0 flex-1',
                    desktopCollapsed && 'lg:hidden',
                  )}
                >
                  <div className="text-sm font-medium truncate">
                    {user.fullName}
                  </div>
                  <div
                    className={cn(
                      'text-xs capitalize truncate',
                      pathname === '/profile' || pathname?.startsWith('/profile/')
                        ? 'text-cream-100/80'
                        : 'text-sage-500',
                    )}
                  >
                    {user.role.toLowerCase().replace('_', ' ')} · View profile
                  </div>
                </div>
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  router.replace('/');
                }}
                title="Sign out"
                aria-label="Sign out"
                className="flex-shrink-0 w-11 h-11 rounded-2xl grid place-items-center text-sage-600 hover:bg-coral-50 hover:text-coral-700 transition-colors"
              >
                <SignoutIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 px-5 sm:px-8 py-8 lg:py-10 lg:pr-12">
          <UnverifiedEmailBanner />
          {children}
        </main>
      </div>
    </div>
  );
}

function UnverifiedEmailBanner() {
  const { user, refresh } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show for signed-in users whose email isn't verified. Dismissal is
  // per-session — deliberately not persistent so the reminder resurfaces.
  if (!user || user.emailVerifiedAt || dismissed) return null;

  async function resend() {
    setSending(true);
    setError(null);
    try {
      await api('/auth/send-verification', { method: 'POST' });
      setSent(true);
      // Backend keeps emailVerifiedAt null until the user clicks the link;
      // refresh so once they do, the banner disappears on next mount.
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Could not resend');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl bg-cream-200 border border-cream-300 p-4 flex items-center gap-3 flex-wrap">
      <span className="text-lg">✉️</span>
      <div className="flex-1 min-w-[220px]">
        <div className="font-medium text-sage-900">
          Please verify your email address.
        </div>
        <p className="text-sm text-sage-700 mt-0.5">
          {sent
            ? 'Verification email sent — check your inbox (and spam).'
            : `We sent a verification link to ${user.email}. Confirm it to secure your account.`}
          {error && <span className="text-coral-700 block mt-1">{error}</span>}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={resend}
          disabled={sending || sent}
          className="chip bg-sage-100 text-sage-800 hover:bg-sage-200 disabled:opacity-60"
        >
          {sending ? 'Sending…' : sent ? 'Sent ✓' : 'Resend link'}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-sage-500 hover:text-sage-800"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

