'use client';

import Link from 'next/link';
import { useAuth } from '../components/auth-provider';

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-cream-50 text-sage-900 overflow-x-hidden">
      {/* Decorative background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgb(247 203 182 / 0.4), transparent), radial-gradient(ellipse 60% 50% at 100% 50%, rgb(225 235 226 / 0.6), transparent)',
        }}
      />

      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur bg-cream-50/80 border-b border-sage-100">
        <div className="container-app flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-3">
            <Logo className="w-10 h-10" />
            <span className="font-display text-2xl text-sage-900 leading-none">
              SpecialParents<span className="text-coral-500">.in</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sage-700">
            <a href="#about" className="hover:text-sage-900 min-h-fit py-1">About</a>
            <Link href="/autism" className="hover:text-sage-900 min-h-fit py-1">Autism guide</Link>
            <Link href="/platform" className="hover:text-sage-900 min-h-fit py-1">Platform</Link>
            <Link href="/security" className="hover:text-sage-900 min-h-fit py-1">Security</Link>
          </nav>
          <div className="flex items-center gap-2 min-h-[48px]">
            {loading ? (
              // Avoids a Sign-in→Dashboard flicker for signed-in visitors
              // while /auth/me is in-flight. Keep the same footprint so
              // layout doesn't shift when the real CTAs land.
              <div
                aria-hidden
                className="w-40 h-11 rounded-full bg-sage-100/40 animate-pulse"
              />
            ) : user ? (
              <Link href="/dashboard" className="btn-primary">Dashboard →</Link>
            ) : (
              <>
                <Link href="/login" className="btn-ghost">Sign in</Link>
                <Link href="/signup" className="btn-primary">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container-app pt-12 pb-20 md:pt-24 md:pb-32 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 chip bg-sage-100 text-sage-800 mb-6">
            <span className="w-2 h-2 rounded-full bg-coral-500"></span>
            Built for Indian families. Phase 1 live.
          </div>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-sage-900">
            A calmer place to{' '}
            <span className="relative inline-block">
              <span className="relative z-10 text-coral-600">care</span>
              <span
                className="absolute bottom-1 left-0 right-0 h-3 bg-coral-200/70 -rotate-1 -z-0"
                aria-hidden="true"
              />
            </span>{' '}
            for your child.
          </h1>
          <p className="mt-7 text-lg sm:text-xl text-sage-700 max-w-xl leading-relaxed">
            One gentle, accessible home for therapy tracking, milestones, school
            collaboration, AI guidance, and a community of Indian parents who get it.
            For autism, ADHD, speech delays, learning differences, and more.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            {/* While /auth/me is in-flight, render the anonymous CTA so
                the primary action is never a flash of the wrong link.
                For a signed-in user it flips to "Open my dashboard" once
                loading finishes — the visible flash then is *toward* the
                more useful action, not away from it. */}
            <Link
              href={!loading && user ? '/dashboard' : '/signup'}
              className="btn-primary text-lg px-8"
            >
              {!loading && user ? 'Open my dashboard' : 'Create a free account'}
            </Link>
            <Link href="/login" className="btn-secondary text-lg px-8">
              Try the demo
            </Link>
          </div>
          <p className="mt-4 text-sm text-sage-500">
            Demo accounts: <code className="px-1.5 py-0.5 rounded bg-sage-100 text-sage-700 text-xs">parent@specialparents.in</code>{' '}
            · password <code className="px-1.5 py-0.5 rounded bg-sage-100 text-sage-700 text-xs">Demo1234!</code>
          </p>
        </div>

        <div className="lg:col-span-5">
          <HeroIllustration />
        </div>
      </section>

      {/* Executive summary */}
      <section id="about" className="container-app py-20 border-t border-sage-100">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-5">
            <p className="text-coral-600 font-medium tracking-wide uppercase text-sm">
              Executive summary
            </p>
            <h2 className="font-display text-4xl sm:text-5xl mt-3 text-sage-900 leading-tight">
              Built for the way Indian families actually navigate special-needs care.
            </h2>
            <p className="mt-6 text-sage-700 text-lg leading-relaxed">
              Optimized specifically for India's healthcare, therapy, education,
              and accessibility ecosystem.
            </p>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <p className="text-sage-700 text-lg leading-relaxed">
              SpecialParents.in is a comprehensive digital ecosystem designed for
              Indian families, schools, therapy centers, NGOs, and healthcare
              professionals supporting children with special needs — including
              Autism Spectrum Disorder (ASD), ADHD, speech disorders, developmental
              delays, learning disabilities, Down syndrome, cerebral palsy, and
              sensory disorders.
            </p>

            <div className="card bg-cream-100 border-cream-200">
              <p className="text-sm uppercase tracking-wider text-sage-600 mb-4">
                The platform combines
              </p>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sage-800">
                {[
                  'Parent support tools',
                  'Child development tracking',
                  'Therapy management',
                  'School collaboration',
                  'AI-powered guidance',
                  'AAC communication tools',
                  'Teletherapy',
                  'Government welfare integrations',
                  'Analytics dashboards',
                  'Mobile-first accessibility',
                  'Regional language support',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span
                      className="mt-2 w-1.5 h-1.5 rounded-full bg-coral-500 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container-app py-20">
        <div className="max-w-2xl flex flex-col gap-3">
          <p className="text-coral-600 font-medium tracking-wide uppercase text-sm">
            What's inside
          </p>
          <h2 className="font-display text-4xl sm:text-5xl mt-3 text-sage-900">
            Everything in one place — without the overwhelm.
          </h2>
          <p className="text-sage-600 mt-2">
            Six headlines below. The full platform spans{' '}
            <Link href="/platform" className="text-sage-900 underline underline-offset-2 decoration-coral-400">
              eleven integrated modules
            </Link>
            .
          </p>
        </div>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Feature
            title="Child profile"
            blurb="Diagnoses, allergies, sensory triggers, school context — all in one secure place you can share with new therapists in seconds."
            tone="sage"
            number="01"
          />
          <Feature
            title="Milestones tracker"
            blurb="Track communication, social, motor, emotional, daily-living goals. Celebrate small wins. Spot regressions early."
            tone="coral"
            number="02"
          />
          <Feature
            title="Therapy management"
            blurb="Schedule sessions with ABA, speech, OT, and behavioral therapists. AI-summarized session notes for tired parents."
            tone="mist"
            number="03"
          />
          <Feature
            title="AI guidance, gently"
            blurb="A warm, India-aware AI assistant for those midnight questions about meltdowns, IEPs, AAC. Never replaces your clinician."
            tone="lavender"
            number="04"
          />
          <Feature
            title="Community"
            blurb="Real conversations with parents who actually understand. Regional groups, success stories, mentorship."
            tone="sage"
            number="05"
          />
          <Feature
            title="Govt schemes &amp; rights"
            blurb="UDID, Niramaya, RPWD Act 2016 explained simply. Find scholarships and benefits you didn't know existed."
            tone="coral"
            number="06"
          />
        </div>
      </section>

      {/* Community band */}
      <section id="community" className="bg-sage-600 text-cream-50 py-24">
        <div className="container-app grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-coral-200 font-medium tracking-wide uppercase text-sm">
              You are not alone
            </p>
            <h2 className="font-display text-4xl sm:text-5xl mt-3 leading-tight">
              Built with parents, therapists, and Indian special educators — not just engineers.
            </h2>
          </div>
          <div className="space-y-6 text-cream-100/90">
            <Quote
              text="Finding a place that speaks our language about our children — and respects how exhausted we are — has changed how I show up for my daughter."
              author="A parent in Bengaluru"
            />
            <Quote
              text="Therapists, schools, and parents finally working off the same page. The AI session summaries alone save me hours every week."
              author="A speech therapist in Pune"
            />
          </div>
        </div>
      </section>

      {/* Govt / Schools */}
      <section id="govt" className="container-app py-24">
        <div className="card bg-cream-100 border-cream-200 lg:p-12 grid lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-2">
            <p className="text-sage-600 font-medium tracking-wide uppercase text-sm">
              For schools, NGOs, and government
            </p>
            <h2 className="font-display text-3xl sm:text-4xl mt-3 text-sage-900">
              District-level dashboards. Inclusion that's measurable.
            </h2>
            <p className="mt-4 text-sage-700 text-lg">
              Multi-tenant, RPWD-aligned, DPDP-compliant. Built to plug into UDID,
              DigiLocker, and Niramaya workflows.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <a href="mailto:hello@specialparents.in" className="btn-coral text-lg justify-center">
              Talk to us
            </a>
            <Link href="/schemes" className="btn-secondary text-lg justify-center">
              View schemes
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-sage-100 bg-cream-100/60">
        <div className="container-app py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sage-600 text-sm">
          <div className="flex items-center gap-3">
            <Logo className="w-8 h-8" />
            <span className="font-display text-lg text-sage-900">SpecialParents.in</span>
          </div>
          <p>
            © {new Date().getFullYear()} SpecialParents.in — Built with care for Indian families.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── Pieces ────────────────────────────────────────────────

function Feature({
  title,
  blurb,
  tone,
  number,
}: {
  title: string;
  blurb: string;
  tone: 'sage' | 'coral' | 'mist' | 'lavender';
  number: string;
}) {
  const toneClasses = {
    sage: 'bg-sage-50 border-sage-100',
    coral: 'bg-coral-50 border-coral-100',
    mist: 'bg-mist-50 border-mist-100',
    lavender: 'bg-lavender-50 border-lavender-100',
  }[tone];
  const num = {
    sage: 'text-sage-300',
    coral: 'text-coral-300',
    mist: 'text-mist-300',
    lavender: 'text-lavender-300',
  }[tone];
  return (
    <article className={`rounded-3xl border ${toneClasses} p-7`}>
      <div className={`font-display text-5xl ${num} leading-none`}>{number}</div>
      <h3 className="font-display text-2xl mt-5 text-sage-900">{title}</h3>
      <p className="mt-3 text-sage-700 leading-relaxed">{blurb}</p>
    </article>
  );
}

function Quote({ text, author }: { text: string; author: string }) {
  return (
    <figure className="border-l-2 border-coral-300 pl-5">
      <blockquote className="font-display text-xl leading-relaxed text-cream-50">
        "{text}"
      </blockquote>
      <figcaption className="mt-2 text-sm text-cream-100/70">— {author}</figcaption>
    </figure>
  );
}

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

function HeroIllustration() {
  return (
    <div className="relative aspect-square w-full max-w-md mx-auto">
      {/* Soft blob background */}
      <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full" aria-hidden="true">
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbe7dd" />
            <stop offset="100%" stopColor="#e1ebe2" />
          </linearGradient>
        </defs>
        <path
          d="M 200 30 Q 350 60 360 200 Q 370 340 200 370 Q 50 360 40 200 Q 30 60 200 30 Z"
          fill="url(#g1)"
        />
      </svg>
      {/* Floating cards */}
      <div className="absolute top-8 left-4 rounded-3xl bg-white shadow-glow p-5 w-56 rotate-[-4deg]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-coral-200 grid place-items-center text-coral-700 font-semibold">A</div>
          <div>
            <div className="font-medium text-sage-900">Aanya, 6</div>
            <div className="text-xs text-sage-500">Speech & OT</div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-sage-600">AAC requests</span>
            <span className="text-sage-900 font-medium">60%</span>
          </div>
          <div className="h-2 bg-sage-100 rounded-full overflow-hidden">
            <div className="h-full bg-sage-500 rounded-full" style={{ width: '60%' }} />
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 right-2 rounded-3xl bg-white shadow-glow p-5 w-60 rotate-[3deg]">
        <div className="text-xs text-sage-500 uppercase tracking-wider">Today's session</div>
        <div className="mt-2 font-display text-xl text-sage-900">Speech therapy</div>
        <div className="mt-1 text-sm text-sage-600">10:00 AM · Dr. Ananya Rao</div>
        <div className="mt-4 flex gap-2">
          <span className="chip bg-sage-100 text-sage-700">In-home</span>
          <span className="chip bg-coral-100 text-coral-700">45 min</span>
        </div>
      </div>

      <div className="absolute top-1/2 right-12 -translate-y-1/2 rounded-2xl bg-coral-500 text-cream-50 px-4 py-3 shadow-glow rotate-[6deg]">
        <div className="text-2xl">✨</div>
        <div className="text-sm font-medium mt-1 leading-tight">
          New milestone<br />achieved!
        </div>
      </div>
    </div>
  );
}
