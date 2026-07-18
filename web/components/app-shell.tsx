'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from './auth-provider';
import { cn, initials } from '../lib/utils';
import {
  BellIcon,
  BookIcon,
  CalendarIcon,
  ChatIcon,
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
  { href: '/therapy', label: 'Therapy', icon: SparkleIcon },
  { href: '/appointments', label: 'Appointments', icon: CalendarIcon },
  { href: '/notifications', label: 'Notifications', icon: BellIcon },
  { href: '/aac', label: 'Communication', icon: SpeechIcon },
  { href: '/community', label: 'Community', icon: ChatIcon },
  { href: '/resources', label: 'Resources', icon: BookIcon },
  { href: '/schemes', label: 'Govt Schemes', icon: ShieldIcon },
  { href: '/ai', label: 'AI Guide', icon: WandIcon },
  { href: '/emergency', label: 'Emergency', icon: EmergencyIcon },
];

const NAV_THERAPIST: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/children', label: 'My caseload', icon: HeartIcon },
  { href: '/therapy', label: 'Sessions', icon: SparkleIcon },
  { href: '/appointments', label: 'Appointments', icon: CalendarIcon },
  { href: '/notifications', label: 'Notifications', icon: BellIcon },
  { href: '/community', label: 'Community', icon: ChatIcon },
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
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={desktopCollapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl font-medium transition-colors px-4 py-3',
                    desktopCollapsed && 'lg:justify-center lg:px-0',
                    active
                      ? 'bg-sage-600 text-cream-50 shadow-soft'
                      : 'text-sage-700 hover:bg-sage-100',
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className={cn(desktopCollapsed && 'lg:hidden')}>
                    {item.label}
                  </span>
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
          {children}
        </main>
      </div>
    </div>
  );
}

