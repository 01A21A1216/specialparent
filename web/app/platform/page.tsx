import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Platform — SpecialParent.in',
  description:
    'Eleven integrated modules covering the full Indian special-needs care journey — from early intervention and therapy to schools, government welfare, AAC, and AI guidance.',
};

type Tone = 'sage' | 'coral' | 'mist' | 'lavender' | 'cream';

interface SubGroup {
  heading: string;
  items: string[];
}

interface ModuleSpec {
  num: string;
  title: string;
  blurb: string;
  tone: Tone;
  emoji: string;
  groups: SubGroup[];
}

const MODULES: ModuleSpec[] = [
  {
    num: '01',
    title: 'Parent Portal',
    tone: 'sage',
    emoji: '🤍',
    blurb:
      'A calm, daily-use home base for parents — track development, plan therapy, and get gentle guidance, all in one place.',
    groups: [
      {
        heading: 'Features',
        items: [
          'Parent registration & login',
          'Child profile creation',
          'Multi-parent account linking',
          'Diagnosis report uploads',
          'Development milestone tracking',
          'Therapy tracking',
          'AI guidance',
          'Appointment scheduling',
          'Daily behavior logging',
          'Mood tracking',
          'Emergency support access',
        ],
      },
      {
        heading: 'Parent dashboard widgets',
        items: [
          'Therapy reminders',
          'Upcoming appointments',
          'AI recommendations',
          'Daily activity summary',
          'Child progress charts',
          'Notifications',
        ],
      },
      {
        heading: 'Resources',
        items: [
          'Autism guides',
          'Home therapy activities',
          'Nutrition support',
          'Sensory activity ideas',
          'Sleep improvement strategies',
          'Public outing guidance',
        ],
      },
    ],
  },
  {
    num: '02',
    title: 'Child Profile Management',
    tone: 'coral',
    emoji: '👧',
    blurb:
      'A complete, secure profile a parent can share with any new therapist or school in seconds — no repeated paperwork.',
    groups: [
      {
        heading: 'Profile data',
        items: [
          'Name',
          'Date of birth',
          'Gender',
          'Photo',
          'Diagnosis',
          'Allergies',
          'Medications',
          'Emergency contacts',
          'Sensory triggers',
          'Communication type',
          'School details',
        ],
      },
      {
        heading: 'Development tracking',
        items: [
          'Social skills',
          'Communication',
          'Emotional regulation',
          'Motor skills',
          'Cognitive skills',
          'Daily living skills',
        ],
      },
      {
        heading: 'Behavioral tracking',
        items: [
          'Trigger logging',
          'Sleep tracking',
          'Food tracking',
          'Meltdown patterns',
          'Mood tracking',
        ],
      },
    ],
  },
  {
    num: '03',
    title: 'Therapy Management',
    tone: 'mist',
    emoji: '🩺',
    blurb:
      'A shared, AI-augmented workspace for therapists and parents — schedule, document, summarize, and track outcomes together.',
    groups: [
      {
        heading: 'Features',
        items: [
          'Therapist scheduling',
          'Session planning',
          'Voice-to-text therapy notes',
          'AI-generated summaries',
          'Goal management',
          'Attendance tracking',
          'Teletherapy',
          'Session recordings',
        ],
      },
      {
        heading: 'Therapy types supported',
        items: [
          'ABA',
          'Speech therapy',
          'Occupational therapy',
          'Physiotherapy',
          'Behavioral therapy',
          'Special education',
        ],
      },
      {
        heading: 'Therapist dashboard',
        items: [
          'Assigned children',
          'Pending documentation',
          'Parent communication',
          'Goal completion analytics',
          'Session effectiveness insights',
        ],
      },
    ],
  },
  {
    num: '04',
    title: 'School Management',
    tone: 'lavender',
    emoji: '🏫',
    blurb:
      'Inclusive classroom tools built for the realities of Indian schools — IEPs, accommodations, and parent collaboration in one flow.',
    groups: [
      {
        heading: 'Features',
        items: [
          'Student management',
          'Inclusive classroom support',
          'IEP management',
          'Accommodation planning',
          'Attendance tracking',
          'Parent communication',
          'Assignment modifications',
          'Behavior tracking',
        ],
      },
      {
        heading: 'IEP features',
        items: [
          'Goal creation',
          'Teacher observations',
          'Parent collaboration',
          'Progress evaluation',
          'Review cycles',
        ],
      },
    ],
  },
  {
    num: '05',
    title: 'Learning & Skill Development',
    tone: 'sage',
    emoji: '📚',
    blurb:
      'Structured, neurodivergent-friendly learning paths across communication, academics, and life skills — with gamified rewards.',
    groups: [
      {
        heading: 'Learning categories',
        items: [
          'Communication',
          'Speech',
          'Reading',
          'Writing',
          'Math',
          'Social interaction',
          'Emotional understanding',
          'Life skills',
          'Motor coordination',
        ],
      },
      {
        heading: 'Learning methods',
        items: [
          'Visual schedules',
          'Interactive games',
          'Flashcards',
          'Video lessons',
          'AAC-supported activities',
          'Gamified rewards',
        ],
      },
    ],
  },
  {
    num: '06',
    title: 'AAC & Communication Support',
    tone: 'coral',
    emoji: '💬',
    blurb:
      'Picture- and symbol-based communication for children who are not yet verbal — accessible everywhere, online or off.',
    groups: [
      {
        heading: 'Features',
        items: [
          'PECS communication boards',
          'Symbol-based communication',
          'Voice output communication',
          'Text-to-speech',
          'Speech-to-text',
          'Emotion boards',
          'Routine boards',
        ],
      },
      {
        heading: 'Mobile AAC mode',
        items: [
          'Offline accessibility',
          'Full-screen communication mode',
          'Touch optimization',
        ],
      },
    ],
  },
  {
    num: '07',
    title: 'Community & Support Network',
    tone: 'mist',
    emoji: '🫂',
    blurb:
      'A safe place for Indian parents to find each other, learn from those further along, and not feel so alone.',
    groups: [
      {
        heading: 'Features',
        items: [
          'Parent forums',
          'Regional support groups',
          'Success stories',
          'Parent mentorship',
          'Webinars',
          'Workshops',
          'Resource sharing',
        ],
      },
    ],
  },
  {
    num: '08',
    title: 'Teletherapy & Video Collaboration',
    tone: 'lavender',
    emoji: '🎥',
    blurb:
      'Secure, consent-aware video so therapy reaches families anywhere — from Tier-1 cities to villages with patchy networks.',
    groups: [
      {
        heading: 'Features',
        items: [
          'Secure video calls',
          'Parent consultations',
          'Remote therapy sessions',
          'Group therapy',
          'Whiteboard collaboration',
          'Session recording',
          'Consent management',
        ],
      },
    ],
  },
  {
    num: '09',
    title: 'Government & NGO Portal',
    tone: 'sage',
    emoji: '🛡️',
    blurb:
      'Direct integration with India’s welfare and accessibility systems — so families don’t miss what they’re entitled to.',
    groups: [
      {
        heading: 'Features',
        items: [
          'Welfare scheme discovery',
          'Scholarship applications',
          'Disability certificate workflows',
          'District-level analytics',
          'Inclusion reporting',
          'Awareness campaigns',
        ],
      },
      {
        heading: 'India-specific integrations',
        items: [
          'RPWD Act support',
          'UDID integration',
          'DigiLocker integration',
          'Niramaya insurance guidance',
        ],
      },
    ],
  },
  {
    num: '10',
    title: 'AI Assistant',
    tone: 'coral',
    emoji: '✨',
    blurb:
      'A warm, India-aware AI companion for the midnight questions — and a quiet engine generating insights, summaries, and reminders.',
    groups: [
      {
        heading: 'AI capabilities',
        items: [
          'Parent support chatbot',
          'Behavioral intervention guidance',
          'Personalized learning plans',
          'Therapy recommendations',
          'Crisis guidance',
          'Emotional regulation support',
        ],
      },
      {
        heading: 'AI analytics',
        items: [
          'Predictive development insights',
          'Therapy effectiveness scoring',
          'Behavioral trend detection',
          'Skill gap analysis',
        ],
      },
      {
        heading: 'AI automation',
        items: [
          'Session summaries',
          'Smart reminders',
          'AI-generated reports',
          'Smart scheduling',
        ],
      },
    ],
  },
  {
    num: '11',
    title: 'Admin Console',
    tone: 'mist',
    emoji: '⚙️',
    blurb:
      'Enterprise-grade controls — for the team running the platform and for partner schools, NGOs, and government deployments.',
    groups: [
      {
        heading: 'Features',
        items: [
          'User management',
          'Therapist onboarding',
          'School onboarding',
          'Subscription management',
          'Analytics dashboards',
          'Content moderation',
          'Community moderation',
          'CMS management',
          'AI insights',
          'Revenue dashboards',
        ],
      },
    ],
  },
];

const TONE_BG: Record<Tone, string> = {
  sage: 'bg-sage-50 border-sage-100',
  coral: 'bg-coral-50 border-coral-100',
  mist: 'bg-mist-50 border-mist-100',
  lavender: 'bg-lavender-50 border-lavender-100',
  cream: 'bg-cream-100 border-cream-200',
};
const TONE_NUM: Record<Tone, string> = {
  sage: 'text-sage-300',
  coral: 'text-coral-300',
  mist: 'text-mist-300',
  lavender: 'text-lavender-300',
  cream: 'text-cream-200',
};
const TONE_CHIP: Record<Tone, string> = {
  sage: 'bg-sage-100 text-sage-800',
  coral: 'bg-coral-100 text-coral-800',
  mist: 'bg-mist-100 text-mist-800',
  lavender: 'bg-lavender-100 text-lavender-500',
  cream: 'bg-cream-200 text-sage-800',
};

export default function PlatformPage() {
  return (
    <div className="min-h-screen bg-cream-50 text-sage-900">
      {/* Decorative background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgb(247 203 182 / 0.4), transparent), radial-gradient(ellipse 60% 50% at 100% 50%, rgb(225 235 226 / 0.6), transparent)',
        }}
      />

      {/* Top nav (mirrors landing) */}
      <header className="sticky top-0 z-30 backdrop-blur bg-cream-50/80 border-b border-sage-100">
        <div className="container-app flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-3">
            <Logo className="w-10 h-10" />
            <span className="font-display text-2xl text-sage-900 leading-none">
              SpecialParent<span className="text-coral-500">.in</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sage-700">
            <Link href="/" className="hover:text-sage-900 min-h-fit py-1">Home</Link>
            <Link href="/autism" className="hover:text-sage-900 min-h-fit py-1">Autism guide</Link>
            <Link href="/platform" className="text-sage-900 font-medium min-h-fit py-1">Platform</Link>
            <Link href="/security" className="hover:text-sage-900 min-h-fit py-1">Security</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost">Sign in</Link>
            <Link href="/signup" className="btn-primary">Get started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container-app pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 chip bg-sage-100 text-sage-800 mb-6">
            <span className="w-2 h-2 rounded-full bg-coral-500"></span>
            The platform
          </div>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-sage-900">
            Eleven integrated modules.{' '}
            <span className="relative inline-block">
              <span className="relative z-10 text-coral-600">One ecosystem.</span>
              <span
                className="absolute bottom-1 left-0 right-0 h-3 bg-coral-200/70 -rotate-1 -z-0"
                aria-hidden="true"
              />
            </span>
          </h1>
          <p className="mt-7 text-lg sm:text-xl text-sage-700 leading-relaxed">
            From early intervention to therapy, schools, government welfare, AAC,
            and AI guidance — SpecialParent.in covers the full Indian special-needs
            care journey, designed to work together as one.
          </p>
        </div>

        {/* Quick jump */}
        <nav
          aria-label="Module index"
          className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm"
        >
          {MODULES.map((m) => (
            <a
              key={m.num}
              href={`#m${m.num}`}
              className="rounded-2xl border border-sage-100 bg-cream-50/60 hover:bg-sage-50 hover:border-sage-200 px-4 py-3 flex items-center gap-3 transition-colors"
            >
              <span className={`chip text-xs ${TONE_CHIP[m.tone]}`}>{m.num}</span>
              <span className="font-medium text-sage-800">{m.title}</span>
            </a>
          ))}
        </nav>
      </section>

      {/* Modules */}
      <main className="container-app pb-24 space-y-16">
        {MODULES.map((m, i) => (
          <article
            key={m.num}
            id={`m${m.num}`}
            className={`scroll-mt-24 rounded-3xl border ${TONE_BG[m.tone]} p-8 md:p-12`}
          >
            <header className="flex items-start gap-5 flex-wrap">
              <div className={`font-display text-7xl leading-none ${TONE_NUM[m.tone]}`}>
                {m.num}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sage-500 text-sm uppercase tracking-wider">
                  Module {parseInt(m.num, 10)}
                </p>
                <h2 className="font-display text-3xl sm:text-4xl text-sage-900 mt-1 flex items-center gap-3 flex-wrap">
                  <span aria-hidden="true">{m.emoji}</span> {m.title}
                </h2>
                <p className="mt-4 text-sage-700 text-lg leading-relaxed max-w-3xl">
                  {m.blurb}
                </p>
              </div>
            </header>

            <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {m.groups.map((g) => (
                <section key={g.heading}>
                  <h3 className="font-display text-lg text-sage-900 mb-3">
                    {g.heading}
                  </h3>
                  <ul className="space-y-2">
                    {g.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-sage-700"
                      >
                        <span
                          className="mt-2 w-1.5 h-1.5 rounded-full bg-coral-500 flex-shrink-0"
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </article>
        ))}
      </main>

      {/* CTA */}
      <section className="container-app pb-24">
        <div className="card bg-sage-600 text-cream-50 lg:p-12 grid lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-2">
            <p className="text-coral-200 font-medium tracking-wide uppercase text-sm">
              Ready to see it in action?
            </p>
            <h2 className="font-display text-3xl sm:text-4xl mt-3">
              Sign in with a demo account and walk the journey for yourself.
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/signup" className="btn-coral text-lg justify-center">
              Create a free account
            </Link>
            <Link href="/login" className="btn-secondary text-lg justify-center bg-sage-700 text-cream-50 hover:bg-sage-800">
              Try the demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-sage-100 bg-cream-100/60">
        <div className="container-app py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sage-600 text-sm">
          <div className="flex items-center gap-3">
            <Logo className="w-8 h-8" />
            <span className="font-display text-lg text-sage-900">SpecialParent.in</span>
          </div>
          <p>
            © {new Date().getFullYear()} SpecialParent.in — Built with care for Indian families.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="#e1ebe2" />
      <path
        d="M14 14 C 11 11, 7.5 12.5, 8.5 16.5 C 9.3 20, 14 24, 14 24 C 14 24, 18.7 20, 19.5 16.5 C 20.5 12.5, 17 11, 14 14 Z"
        fill="#4ea05c"
        stroke="#2e6e3a"
        strokeWidth="0.6"
      />
      <path
        d="M26 14 C 23 11, 19.5 12.5, 20.5 16.5 C 21.3 20, 26 24, 26 24 C 26 24, 30.7 20, 31.5 16.5 C 32.5 12.5, 29 11, 26 14 Z"
        fill="#e63946"
        stroke="#a82836"
        strokeWidth="0.6"
      />
    </svg>
  );
}
