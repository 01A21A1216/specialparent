import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Fraunces } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../components/auth-provider';
import { ErrorBoundary } from '../components/error-boundary';
import { SWRProvider } from '../components/swr-provider';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  axes: ['SOFT', 'opsz'],
});

export const metadata: Metadata = {
  title: 'SpecialParent.in — India\'s Inclusive Special Needs Care Ecosystem',
  description:
    'A warm, accessible platform for Indian families, schools, therapists and NGOs supporting children with special needs.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SpecialParent',
  },
  icons: {
    icon: [{ url: '/icons/icon-192.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icons/icon-192.svg' }],
  },
};

// Next 15 moved themeColor from metadata to viewport.
export const viewport: Viewport = {
  themeColor: '#fdfaf5',
};

// Registers the service worker so the app becomes installable (PWA) and the
// AAC / static shell keeps working offline. Runs after hydration; dev builds
// aggressively purge any leftover SW AND its caches so hot reload isn't
// serving stale HTML/JS from a prior session (which manifests as
// impossible-to-diagnose ErrorBoundary catches referencing old chunk names).
const SW_REGISTER = `
(function () {
  if (!('serviceWorker' in navigator)) return;
  var isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  window.addEventListener('load', function () {
    if (isDev) {
      // 1) Unregister every SW claiming this scope.
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        regs.forEach(function (r) { r.unregister(); });
      }).catch(function () {});
      // 2) Nuke every named cache — otherwise the old CACHE_NAME entries
      // linger and get served on the next SW install even though we
      // unregistered.
      if (window.caches && caches.keys) {
        caches.keys().then(function (keys) {
          keys.forEach(function (k) { caches.delete(k); });
        }).catch(function () {});
      }
      return;
    }
    navigator.serviceWorker.register('/sw.js').catch(function (err) {
      console.warn('SW registration failed:', err);
    });
  });
})();
`.trim();

// Inline, runs before any bundle loads. Swallows errors whose stack originates
// in a chrome-extension:// so Next.js's dev overlay doesn't red-box them and
// drown out real app errors. Any error originating in our own code still fires.
const SUPPRESS_EXTENSION_ERRORS = `
(function() {
  function isExtSrc(s) {
    return typeof s === 'string' && s.indexOf('chrome-extension://') !== -1;
  }
  window.addEventListener('error', function(e) {
    var src = (e && e.filename) || (e && e.error && e.error.stack) || '';
    if (isExtSrc(src)) { e.stopImmediatePropagation(); }
  }, true);
  window.addEventListener('unhandledrejection', function(e) {
    var r = e && e.reason;
    var src = (r && r.stack) || (r && r.message) || '';
    if (isExtSrc(src)) { e.stopImmediatePropagation(); }
  }, true);
})();
`.trim();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SUPPRESS_EXTENSION_ERRORS }} />
        <script dangerouslySetInnerHTML={{ __html: SW_REGISTER }} />
      </head>
      <body suppressHydrationWarning>
        <ErrorBoundary>
          <SWRProvider>
            <AuthProvider>{children}</AuthProvider>
          </SWRProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
