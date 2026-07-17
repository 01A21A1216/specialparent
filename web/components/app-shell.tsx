'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from './auth-provider';
import { cn, initials } from '../lib/utils';

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

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname || '/dashboard')}`);
    }
  }, [user, loading, router, pathname]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

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
        <button
          onClick={() => setNavOpen((o) => !o)}
          aria-label="Open navigation"
          className="rounded-full p-2 hover:bg-sage-100"
        >
          <MenuIcon className="w-6 h-6" />
        </button>
      </header>

      <div className="lg:flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:flex-shrink-0 lg:flex lg:flex-col',
            'fixed inset-0 z-40 bg-cream-50 lg:bg-cream-50',
            navOpen ? 'flex flex-col' : 'hidden lg:flex',
          )}
        >
          <div className="hidden lg:flex items-center gap-3 px-7 pt-8 pb-6">
            <Logo className="w-10 h-10" />
            <div className="flex flex-col">
              <span className="font-display text-2xl text-sage-900 leading-none">
                SpecialParent
              </span>
              <span className="text-xs tracking-widest text-coral-500 mt-1">
                .IN
              </span>
            </div>
          </div>

          <nav className="flex-1 px-4 lg:px-5 pb-6 space-y-1.5 mt-4 lg:mt-0">
            {navFor(user.role).map((item) => {
              const active =
                pathname === item.href || pathname?.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-colors',
                    active
                      ? 'bg-sage-600 text-cream-50 shadow-soft'
                      : 'text-sage-700 hover:bg-sage-100',
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-sage-100 px-5 py-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-coral-200 text-coral-700 grid place-items-center font-semibold">
                {initials(user.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-sage-900 truncate">
                  {user.fullName}
                </div>
                <div className="text-xs text-sage-500 capitalize truncate">
                  {user.role.toLowerCase().replace('_', ' ')}
                </div>
              </div>
            </div>
            <button
              onClick={async () => {
                await logout();
                router.replace('/');
              }}
              className="btn-ghost w-full text-sm"
            >
              Sign out
            </button>
          </div>
        </aside>

        <main className="flex-1 min-w-0 px-5 sm:px-8 py-8 lg:py-10 lg:pr-12">
          {children}
        </main>
      </div>
    </div>
  );
}

// ── Icons (inline SVG so no dep) ─────────────────────────
function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="#e1ebe2" />
      {/* Green heart (left) */}
      <path
        d="M14 14 C 11 11, 7.5 12.5, 8.5 16.5 C 9.3 20, 14 24, 14 24 C 14 24, 18.7 20, 19.5 16.5 C 20.5 12.5, 17 11, 14 14 Z"
        fill="#4ea05c"
        stroke="#2e6e3a"
        strokeWidth="0.6"
      />
      {/* Red heart (right) */}
      <path
        d="M26 14 C 23 11, 19.5 12.5, 20.5 16.5 C 21.3 20, 26 24, 26 24 C 26 24, 30.7 20, 31.5 16.5 C 32.5 12.5, 29 11, 26 14 Z"
        fill="#e63946"
        stroke="#a82836"
        strokeWidth="0.6"
      />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M3 11l9-8 9 8M5 10v10h14V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 21s-7-4.5-7-10a4.5 4.5 0 0 1 8-3 4.5 4.5 0 0 1 8 3c0 5.5-7 10-7 10h-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function ChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
function BookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4zM18 8H8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
function WandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 19l10-10M14 6l4 4M16 4l1 1M19 7l1 1M9 14l1 1M4 12l1 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function MenuIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function SpeechIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="5" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 19l4-3M9 9h2M9 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path d="M3 20c1-4 4-6 6-6s5 2 6 6M16 11a3 3 0 1 0 0-6M21 20c-.5-3-2-4.5-4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function FlagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 8a6 6 0 1 1 12 0v5l2 3H4l2-3V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function EmergencyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 2 L4 6v6c0 5 4 8 8 10 4-2 8-5 8-10V6l-8-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 8v4M12 15v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
