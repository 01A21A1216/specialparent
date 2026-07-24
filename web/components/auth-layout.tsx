import Link from 'next/link';

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen bg-cream-50 grid lg:grid-cols-2">
      {/* Visual side */}
      <div className="hidden lg:flex relative overflow-hidden bg-sage-600 text-cream-50 p-12 flex-col justify-between">
        <Link href="/" className="flex items-center gap-3 z-10">
          <svg viewBox="0 0 40 40" className="w-10 h-10" aria-hidden="true">
            <circle cx="20" cy="20" r="18" fill="#e1ebe2" />
            <path d="M14 22c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#42624a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <circle cx="16" cy="17" r="1.5" fill="#dc6438" />
            <circle cx="24" cy="17" r="1.5" fill="#dc6438" />
          </svg>
          <span className="font-display text-2xl">SpecialParents.in</span>
        </Link>

        <div className="z-10 max-w-md">
          <p className="text-coral-200 font-medium tracking-wide uppercase text-sm">
            For Indian families
          </p>
          <h2 className="font-display text-5xl mt-4 leading-tight">
            A calmer place to care for your child.
          </h2>
          <p className="mt-6 text-cream-100/85 text-lg leading-relaxed">
            Therapy tracking, milestones, school collaboration, AI guidance,
            and a community of parents who get it — all in one warm place.
          </p>
        </div>

        <div className="z-10 text-cream-100/70 text-sm">
          Built with care · WCAG 2.1 · DPDP-aligned
        </div>

        {/* Decorative shapes */}
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-coral-500/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute top-1/3 -left-20 w-64 h-64 rounded-full bg-cream-100/10 blur-2xl"
        />
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Link href="/" className="lg:hidden flex items-center gap-2 mb-8 text-sage-700">
            ← Back home
          </Link>
          <h1 className="font-display text-4xl text-sage-900">{title}</h1>
          {subtitle && <p className="mt-2 text-sage-600">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
