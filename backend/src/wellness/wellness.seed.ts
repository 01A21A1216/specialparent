import {
  WellnessAudience,
  WellnessCategory,
  WellnessFormat,
} from '@prisma/client';

// Starter seed — a curated set of India-context wellness offerings covering
// every category the launch surface promises. Real names/contacts are
// placeholders — the platform team should replace them with actual partner
// details before public launch. Content stays here so it's version-tracked;
// admins can add more via the CMS at runtime.

interface Seed {
  category: WellnessCategory;
  audience: WellnessAudience;
  format: WellnessFormat;
  title: string;
  provider: string;
  description: string;
  city?: string;
  languages: string[];
  costHint?: string;
  scheduleHint?: string;
  contactUrl?: string;
  contactPhone?: string;
  notes?: string;
}

export const WELLNESS_SEED: Seed[] = [
  // ── Yoga ──
  {
    category: 'YOGA',
    audience: 'CHILD',
    format: 'IN_PERSON',
    title: 'Yoga for neurodivergent kids',
    provider: 'Little Yogis (partner studio)',
    description:
      'Weekly yoga adapted for kids on the autism spectrum, ADHD, and sensory-seeking children. Small groups (max 6), predictable routine, sensory-friendly space.',
    city: 'Bengaluru',
    languages: ['EN'],
    costHint: '₹600 / session · ₹2,000 / month',
    scheduleHint: 'Sat + Sun 9:30 am',
    contactUrl: 'https://example.com/little-yogis',
    notes: 'First class free. Parents welcome to observe or join.',
  },
  {
    category: 'YOGA',
    audience: 'FAMILY',
    format: 'ONLINE',
    title: 'Family yoga (60 min live)',
    provider: 'Isha Hatha Yoga (online)',
    description:
      'Live Zoom sessions parent + child can do together. Simple asanas and breathing suited for kids as young as 5.',
    languages: ['EN', 'HI', 'TA'],
    costHint: 'Free',
    scheduleHint: 'Daily 6:30 am IST',
    contactUrl: 'https://isha.sadhguru.org',
  },
  {
    category: 'YOGA',
    audience: 'PARENT',
    format: 'HYBRID',
    title: 'Yoga for caregivers',
    provider: 'The Yoga Institute, Mumbai',
    description:
      'Restorative yoga + pranayama for caregivers dealing with chronic stress. Grounded in evidence-based caregiver-burnout research.',
    city: 'Mumbai',
    languages: ['EN', 'HI', 'MR'],
    costHint: '₹1,500 / month',
    scheduleHint: 'Weekday mornings',
    contactUrl: 'https://theyogainstitute.org',
  },

  // ── Music ──
  {
    category: 'MUSIC',
    audience: 'CHILD',
    format: 'IN_PERSON',
    title: 'Music therapy — individual sessions',
    provider: 'Nada Centre for Music Therapy',
    description:
      'Certified music therapists work 1:1 on communication, emotional regulation, and motor skills through rhythm, melody, and voice.',
    city: 'Chennai',
    languages: ['EN', 'TA'],
    costHint: '₹1,200 / session',
    scheduleHint: 'By appointment',
    contactUrl: 'https://example.com/nada-music-therapy',
  },
  {
    category: 'MUSIC',
    audience: 'CHILD',
    format: 'ONLINE',
    title: 'Learn Indian classical music (kids)',
    provider: 'Shankar Mahadevan Academy',
    description:
      'Online vocal + instrumental classes with a track adapted for kids with attention or speech differences. Recorded sessions available for re-watching.',
    languages: ['EN', 'HI'],
    costHint: '₹800 / class',
    scheduleHint: 'Flexible slots',
    contactUrl: 'https://www.shankarmahadevanacademy.com',
  },

  // ── Art ──
  {
    category: 'ART',
    audience: 'CHILD',
    format: 'IN_PERSON',
    title: 'Sensory-friendly art class',
    provider: 'Artsphere Studio',
    description:
      'Small-group art class with predictable structure and adjustable sensory input (quiet corner, soft lighting, choice of textures).',
    city: 'Bengaluru',
    languages: ['EN'],
    costHint: '₹500 / class',
    scheduleHint: 'Wed + Sat afternoons',
    contactUrl: 'https://example.com/artsphere',
    notes: 'Also offers a parent + child session on Sundays.',
  },
  {
    category: 'ART',
    audience: 'FAMILY',
    format: 'HYBRID',
    title: 'Art therapy — parent + child',
    provider: 'Fortis Mental Health, Delhi',
    description:
      'Weekly art therapy sessions led by a licensed therapist — a shared creative space that supports the parent–child bond after difficult weeks.',
    city: 'New Delhi',
    languages: ['EN', 'HI'],
    costHint: '₹1,800 / session',
    contactUrl: 'https://www.fortishealthcare.com',
  },

  // ── Painting ──
  {
    category: 'PAINTING',
    audience: 'CHILD',
    format: 'IN_PERSON',
    title: 'Kids painting workshop',
    provider: 'Chitrakala Parishath',
    description:
      'Weekend painting sessions with pastel + acrylic. Instructor has 8+ years experience adapting technique for kids with fine-motor delays.',
    city: 'Bengaluru',
    languages: ['EN', 'KN'],
    costHint: '₹400 / class · materials included',
    scheduleHint: 'Sat 3–5 pm',
    contactUrl: 'https://example.com/chitrakala',
  },
  {
    category: 'PAINTING',
    audience: 'PARENT',
    format: 'ONLINE',
    title: 'Mindful painting for parents (weekly circle)',
    provider: 'Paint & Pause',
    description:
      'Live Zoom painting circle for caregivers — no experience needed. 90 minutes of guided painting + optional peer conversation at the end.',
    languages: ['EN'],
    costHint: '₹300 / session',
    scheduleHint: 'Sun 8 pm IST',
    contactUrl: 'mailto:hello@paintandpause.example',
  },

  // ── Parent counselling ──
  {
    category: 'PARENT_COUNSELLING',
    audience: 'PARENT',
    format: 'ONLINE',
    title: 'Confidential 1:1 counselling',
    provider: 'iCall (TISS)',
    description:
      'Free phone + email counselling from trained psychologists at Tata Institute of Social Sciences. Non-judgemental, confidential, English + multiple Indian languages.',
    languages: ['EN', 'HI', 'MR', 'TA', 'TE'],
    costHint: 'Free',
    scheduleHint: 'Mon–Sat, 8 am – 10 pm',
    contactPhone: '9152987821',
    contactUrl: 'https://icallhelpline.org',
    notes: 'Best entry point if you\'re not sure where to start.',
  },
  {
    category: 'PARENT_COUNSELLING',
    audience: 'PARENT',
    format: 'ONLINE',
    title: 'Caregiver-burnout specialists',
    provider: 'Mpower — 1on1',
    description:
      'Structured 6-session programme with a psychologist who specialises in parents of children with disabilities. Video sessions, weekend slots.',
    languages: ['EN', 'HI'],
    costHint: '₹2,000 / session · sliding scale available',
    contactUrl: 'https://mpowerminds.com',
  },

  // ── Parent training ──
  {
    category: 'PARENT_TRAINING',
    audience: 'PARENT',
    format: 'HYBRID',
    title: 'PECS Level 1 workshop for parents',
    provider: 'Communication Matters India',
    description:
      'Two-day training on setting up a Picture Exchange Communication System at home. Practical, hands-on, with follow-up support.',
    city: 'Multiple cities',
    languages: ['EN', 'HI'],
    costHint: '₹4,500 · one-time',
    scheduleHint: 'Runs monthly',
    contactUrl: 'https://example.com/pecs-india',
  },
  {
    category: 'PARENT_TRAINING',
    audience: 'PARENT',
    format: 'ONLINE',
    title: 'IEP + RPWD Act masterclass',
    provider: 'SpecialParent.in (in-house)',
    description:
      'Free 90-minute workshop covering how to ask for an IEP, what accommodations are legally protected under the RPWD Act, and how to escalate calmly.',
    languages: ['EN', 'HI'],
    costHint: 'Free',
    scheduleHint: 'Second Saturday of every month, 5 pm IST',
    contactUrl: 'mailto:workshops@specialparent.in',
  },
  {
    category: 'PARENT_TRAINING',
    audience: 'PARENT',
    format: 'ONLINE',
    title: 'Behaviour basics — positive reinforcement',
    provider: 'BCBA India Network',
    description:
      'A 4-session course teaching parents the core ABA tools that BCBAs use in clinic — reinforcement, prompting, generalisation. Assent-based, neurodiversity-affirming.',
    languages: ['EN'],
    costHint: '₹6,000 · payment plan available',
    contactUrl: 'https://example.com/bcba-india',
  },

  // ── Meditation ──
  {
    category: 'MEDITATION',
    audience: 'PARENT',
    format: 'ONLINE',
    title: '10-minute meditation for hard days',
    provider: 'Isha Kriya',
    description:
      'A free guided meditation designed for busy caregivers. 10 minutes, no chanting, plain-spoken guidance in multiple Indian languages.',
    languages: ['EN', 'HI', 'TA', 'TE', 'KN', 'ML'],
    costHint: 'Free',
    contactUrl: 'https://isha.sadhguru.org/ishakriya',
  },
];
