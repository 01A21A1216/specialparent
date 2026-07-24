// Shared metadata for TherapistProfile.level (BACB certification ladder).
// Every therapist surface reads from here so a change to the ordering, the
// display label, or the colour tone lands in one place.

export type TherapistLevel = 'INTERN' | 'RBT' | 'BCABA' | 'BCBA';

// Lowest → highest. Used both for chip-picker rendering and for any future
// sort/rank logic.
export const LEVEL_ORDER: TherapistLevel[] = ['INTERN', 'RBT', 'BCABA', 'BCBA'];

export interface LevelMeta {
  short: string;
  long: string;
  /** Tailwind classes for a chip in this tier. Tuned so BCBA reads warmest. */
  tone: string;
}

export const LEVEL_META: Record<TherapistLevel, LevelMeta> = {
  INTERN: {
    short: 'Intern',
    long: 'Intern / Trainee (supervised)',
    tone: 'bg-cream-100 text-sage-700 border border-cream-300',
  },
  RBT: {
    short: 'RBT',
    long: 'Registered Behavior Technician',
    tone: 'bg-mist-100 text-mist-800 border border-mist-300',
  },
  BCABA: {
    short: 'BCaBA',
    long: 'Board Certified Assistant Behavior Analyst',
    tone: 'bg-sage-100 text-sage-800 border border-sage-300',
  },
  BCBA: {
    short: 'BCBA',
    long: 'Board Certified Behavior Analyst',
    tone: 'bg-coral-100 text-coral-800 border border-coral-300',
  },
};

/** Falls back to the raw code for anything unknown — safer than crashing on legacy data. */
export function levelShort(code: string | null | undefined): string {
  if (!code) return '';
  return (LEVEL_META as Record<string, LevelMeta>)[code]?.short ?? code;
}

// ── VerificationStatus (same file — the two are always used together) ──

export type VerificationStatus =
  | 'DRAFT' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

export interface StatusMeta {
  label: string;
  tone: string;
  /** Optional longer explanation shown on the therapist's own profile banner. */
  blurb?: string;
}

export const STATUS_META: Record<VerificationStatus, StatusMeta> = {
  DRAFT: {
    label: 'Draft',
    tone: 'bg-cream-200 border-cream-400 text-sage-800',
    blurb: 'Complete your profile and submit for review to appear in the parent directory.',
  },
  PENDING_REVIEW: {
    label: 'Pending review',
    tone: 'bg-mist-100 border-mist-300 text-mist-800',
    blurb: "You're in the review queue. Our team is verifying your credentials — usually 2–5 working days.",
  },
  VERIFIED: {
    label: 'Verified',
    tone: 'bg-sage-100 border-sage-300 text-sage-800',
    blurb: 'You are live in the parent directory. Edits to your headline fields will send the profile back for a quick re-review.',
  },
  REJECTED: {
    label: 'Needs changes',
    tone: 'bg-coral-100 border-coral-300 text-coral-800',
    blurb: 'Our team needs a few things updated before we can publish your profile — see the note below.',
  },
  SUSPENDED: {
    label: 'Paused',
    tone: 'bg-coral-100 border-coral-400 text-coral-900',
    blurb: 'Your profile is currently paused from the directory. Contact us if you believe this is a mistake.',
  },
};

// ── ServiceMode (also lives here — bundle of everything a therapist page needs) ──

export type ServiceMode = 'ONLINE' | 'IN_PERSON' | 'HYBRID';

export const MODE_META: Record<ServiceMode, { emoji: string; label: string }> = {
  ONLINE: { emoji: '💻', label: 'Online' },
  IN_PERSON: { emoji: '📍', label: 'In person' },
  HYBRID: { emoji: '↔', label: 'Hybrid' },
};

export function modeLabel(mode: ServiceMode): string {
  const m = MODE_META[mode];
  return `${m.emoji} ${m.label}`;
}
