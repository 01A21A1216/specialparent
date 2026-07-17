import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Fraunces } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../components/auth-provider';

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
  themeColor: '#fdfaf5',
};

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
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
