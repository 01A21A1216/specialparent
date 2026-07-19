import { AuthLayout } from './auth-layout';

// Shown while a page's inner form suspends (Next 15 requires client components
// that read useSearchParams to be inside a Suspense boundary during
// hydration). Without a visible fallback the whole page looks blank for
// the first paint — this renders the same AuthLayout shell plus grey
// placeholder bars so the user always sees SOMETHING immediately.

export function AuthPageFallback({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <AuthLayout title={title} subtitle={subtitle}>
      <div className="animate-pulse space-y-5" aria-busy="true">
        <div className="h-12 bg-sage-100 rounded-2xl" />
        <div className="h-12 bg-sage-100 rounded-2xl" />
        <div className="h-14 bg-sage-100 rounded-2xl" />
      </div>
    </AuthLayout>
  );
}
