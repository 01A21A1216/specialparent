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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
