import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Security & Compliance — SpecialParents.in',
  description:
    'How SpecialParents.in protects family, child, therapist and school data — built around India’s DPDP Act, with HIPAA- and FERPA-inspired controls.',
};

interface ComplianceItem {
  badge: string;
  title: string;
  body: string;
  tone: 'sage' | 'coral' | 'mist';
}

interface SecurityItem {
  title: string;
  body: string;
  icon: (p: { className?: string }) => React.ReactElement;
}

const COMPLIANCE: ComplianceItem[] = [
  {
    badge: 'India',
    title: 'India DPDP Act',
    tone: 'sage',
    body:
      'Aligned to the Digital Personal Data Protection Act, 2023 — lawful purposes, consent at every collection point, parental authorisation for minors, breach notification, and the right to erasure.',
  },
  {
    badge: 'Healthcare',
    title: 'HIPAA-inspired standards',
    tone: 'coral',
    body:
      'Health and therapy records are treated as protected information — minimum-necessary access, encryption at rest and in transit, audit trails on every read and write, and signed agreements with care-provider partners.',
  },
  {
    badge: 'Education',
    title: 'FERPA-inspired education privacy',
    tone: 'mist',
    body:
      'Student-level information stays with the family. Schools and teachers see only the children explicitly linked to them, parents control sharing, and records are not used for training models without explicit consent.',
  },
];

const SECURITY: SecurityItem[] = [
  {
    title: 'End-to-end encryption',
    body:
      'TLS 1.2+ on the wire and AES-256 at rest. Sensitive fields (diagnoses, session notes, documents) are stored in dedicated encrypted columns — separate from operational metadata.',
    icon: LockIcon,
  },
  {
    title: 'Multi-factor authentication',
    body:
      'Email + password today, with TOTP and OTP-on-mobile MFA on the roadmap for therapists, school admins, and admin accounts. Admin sessions are short-lived and re-verified.',
    icon: ShieldIcon,
  },
  {
    title: 'Audit logging',
    body:
      'Every meaningful action — sign in, role change, child profile read, post moderation, scheme edit — is appended to an immutable audit log, queryable by admins and exportable for compliance reviews.',
    icon: ClipboardIcon,
  },
  {
    title: 'Secure document storage',
    body:
      'Diagnosis reports and uploads are stored in object storage with private ACLs, signed-URL access, virus scanning, and retention rules tied to the parent’s deletion request.',
    icon: FolderIcon,
  },
  {
    title: 'Disaster recovery',
    body:
      'Daily automated backups of the primary database, point-in-time restore, geo-redundant object storage, and a documented recovery runbook with RPO/RTO targets reviewed quarterly.',
    icon: BackupIcon,
  },
  {
    title: 'Role-based access control',
    body:
      'Five roles (Parent, Therapist, Teacher, School Admin, Admin) with strict boundaries enforced server-side. Therapists see only their caseload. Schools see only their linked students. Parents own their child’s data.',
    icon: KeyIcon,
  },
];

const TONE_CARD: Record<ComplianceItem['tone'], string> = {
  sage: 'bg-sage-50 border-sage-100',
  coral: 'bg-coral-50 border-coral-100',
  mist: 'bg-mist-50 border-mist-100',
};
const TONE_BADGE: Record<ComplianceItem['tone'], string> = {
  sage: 'bg-sage-200 text-sage-800',
  coral: 'bg-coral-200 text-coral-800',
  mist: 'bg-mist-200 text-mist-800',
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-cream-50 text-sage-900">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgb(247 203 182 / 0.4), transparent), radial-gradient(ellipse 60% 50% at 100% 50%, rgb(225 235 226 / 0.6), transparent)',
        }}
      />

      <header className="sticky top-0 z-30 backdrop-blur bg-cream-50/80 border-b border-sage-100">
        <div className="container-app flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-3">
            <Logo className="w-10 h-10" />
            <span className="font-display text-2xl text-sage-900 leading-none">
              SpecialParents<span className="text-coral-500">.in</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sage-700">
            <Link href="/" className="hover:text-sage-900 min-h-fit py-1">Home</Link>
            <Link href="/autism" className="hover:text-sage-900 min-h-fit py-1">Autism guide</Link>
            <Link href="/platform" className="hover:text-sage-900 min-h-fit py-1">Platform</Link>
            <Link href="/security" className="text-sage-900 font-medium min-h-fit py-1">Security</Link>
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
            Security &amp; compliance
          </div>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-sage-900">
            Built so families can{' '}
            <span className="relative inline-block">
              <span className="relative z-10 text-coral-600">trust</span>
              <span
                className="absolute bottom-1 left-0 right-0 h-3 bg-coral-200/70 -rotate-1 -z-0"
                aria-hidden="true"
              />
            </span>{' '}
            us with the things that matter.
          </h1>
          <p className="mt-7 text-lg sm:text-xl text-sage-700 leading-relaxed">
            Your child’s diagnoses, therapy notes, school records, and conversations
            sit with people who already feel exposed. Our job is to be a quiet,
            careful custodian — and to be specific about how.
          </p>
        </div>
      </section>

      {/* Compliance */}
      <section className="container-app pb-20">
        <p className="text-coral-600 font-medium tracking-wide uppercase text-sm">
          Compliance
        </p>
        <h2 className="font-display text-4xl sm:text-5xl mt-3 text-sage-900">
          Built around three frameworks.
        </h2>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {COMPLIANCE.map((c) => (
            <article
              key={c.title}
              className={`rounded-3xl border ${TONE_CARD[c.tone]} p-7`}
            >
              <span className={`chip text-xs ${TONE_BADGE[c.tone]}`}>
                {c.badge}
              </span>
              <h3 className="font-display text-2xl mt-4 text-sage-900">
                {c.title}
              </h3>
              <p className="mt-3 text-sage-700 leading-relaxed">{c.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Security features */}
      <section className="container-app pb-24">
        <p className="text-coral-600 font-medium tracking-wide uppercase text-sm">
          Security features
        </p>
        <h2 className="font-display text-4xl sm:text-5xl mt-3 text-sage-900">
          The controls behind the calm.
        </h2>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {SECURITY.map((s) => {
            const Icon = s.icon;
            return (
              <article
                key={s.title}
                className="rounded-3xl border border-sage-100 bg-cream-50/60 p-7 hover:bg-sage-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-sage-100 text-sage-700 grid place-items-center">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-display text-xl mt-5 text-sage-900">
                  {s.title}
                </h3>
                <p className="mt-3 text-sage-700 leading-relaxed text-sm">
                  {s.body}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Reporting */}
      <section className="container-app pb-24">
        <div className="card bg-cream-100 border-cream-200 lg:p-12 grid lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-2">
            <p className="text-sage-600 font-medium tracking-wide uppercase text-sm">
              Found something?
            </p>
            <h2 className="font-display text-3xl sm:text-4xl mt-3 text-sage-900">
              Responsible disclosure is welcomed and acknowledged.
            </h2>
            <p className="mt-4 text-sage-700 text-lg">
              If you believe you’ve found a vulnerability, please email us before
              public disclosure. We aim to respond within 72 hours.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <a
              href="mailto:security@specialparents.in"
              className="btn-coral text-lg justify-center"
            >
              security@specialparents.in
            </a>
            <a
              href="mailto:privacy@specialparents.in"
              className="btn-secondary text-lg justify-center"
            >
              Data &amp; privacy requests
            </a>
          </div>
        </div>
      </section>

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

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="6" y="4" width="12" height="17" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="9" y="2" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
      <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 14v-3M10.5 12.5h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function BackupIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <ellipse cx="12" cy="6" rx="7" ry="3" stroke="currentColor" strokeWidth="2" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function KeyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="14" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M11 12l9-9M17 4l3 3M14 7l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
