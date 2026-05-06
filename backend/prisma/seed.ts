/* eslint-disable no-console */
import {
  Language,
  MilestoneDomain,
  MilestoneStatus,
  Mood,
  PostCategory,
  PrismaClient,
  Role,
  TherapyType,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SpecialParent.in...');

  const passwordHash = await bcrypt.hash('Demo1234!', 12);

  // ── Users ────────────────────────────────────────────────
  const parent = await prisma.user.upsert({
    where: { email: 'parent@specialparent.in' },
    update: {},
    create: {
      email: 'parent@specialparent.in',
      fullName: 'Priya Iyer',
      passwordHash,
      role: Role.PARENT,
      preferredLanguage: Language.EN,
    },
  });

  const therapist = await prisma.user.upsert({
    where: { email: 'therapist@specialparent.in' },
    update: {},
    create: {
      email: 'therapist@specialparent.in',
      fullName: 'Dr. Ananya Rao',
      passwordHash,
      role: Role.THERAPIST,
      preferredLanguage: Language.EN,
      therapistProfile: {
        create: {
          specialization: 'Speech & Language',
          qualifications: 'MASLP, RCI Registered',
          yearsExperience: 8,
          bio: 'Speech-language pathologist with 8 years working with children on the autism spectrum across Bengaluru.',
          hourlyRate: 150000, // ₹1,500
          verifiedAt: new Date(),
        },
      },
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@specialparent.in' },
    update: {},
    create: {
      email: 'admin@specialparent.in',
      fullName: 'Platform Admin',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@specialparent.in' },
    update: {},
    create: {
      email: 'teacher@specialparent.in',
      fullName: 'Ms. Lakshmi Menon',
      passwordHash,
      role: Role.TEACHER,
    },
  });

  const schoolAdmin = await prisma.user.upsert({
    where: { email: 'school@specialparent.in' },
    update: {},
    create: {
      email: 'school@specialparent.in',
      fullName: 'Mr. Vikram Sharma',
      passwordHash,
      role: Role.SCHOOL_ADMIN,
    },
  });

  // ── Children ─────────────────────────────────────────────
  const aanya = await prisma.child.create({
    data: {
      fullName: 'Aanya Iyer',
      dateOfBirth: new Date('2018-04-12'),
      gender: 'FEMALE',
      diagnoses: ['Autism Spectrum Disorder', 'Speech delay'],
      allergies: ['Peanuts'],
      medications: [],
      sensoryTriggers: ['Loud noises', 'Bright fluorescent lights'],
      communicationType: 'AAC + verbal (emerging)',
      schoolName: 'Inclusive Wings School, Bengaluru',
      emergencyContact: '+91 98450 12345',
      notes: 'Loves animals and music. Soothed by weighted blanket.',
      caregivers: {
        create: [
          { userId: parent.id, relationship: 'mother', isPrimary: true },
          { userId: teacher.id, relationship: 'special-educator' },
          { userId: schoolAdmin.id, relationship: 'school-admin' },
        ],
      },
    },
  });

  const arjun = await prisma.child.create({
    data: {
      fullName: 'Arjun Iyer',
      dateOfBirth: new Date('2016-08-22'),
      gender: 'MALE',
      diagnoses: ['ADHD'],
      allergies: [],
      medications: ['Methylphenidate (low dose, doctor-supervised)'],
      sensoryTriggers: ['Crowded spaces'],
      communicationType: 'verbal',
      schoolName: 'Inclusive Wings School, Bengaluru',
      emergencyContact: '+91 98450 12345',
      notes: 'High energy. Thrives with visual schedules and clear transitions.',
      caregivers: {
        create: [
          { userId: parent.id, relationship: 'mother', isPrimary: true },
          { userId: teacher.id, relationship: 'special-educator' },
          { userId: schoolAdmin.id, relationship: 'school-admin' },
        ],
      },
    },
  });

  // ── Milestones ───────────────────────────────────────────
  const milestoneSeed: Array<{
    childId: string;
    domain: MilestoneDomain;
    title: string;
    status: MilestoneStatus;
    description?: string;
  }> = [
    { childId: aanya.id, domain: 'COMMUNICATION', title: 'Uses 2-symbol AAC requests', status: 'ACHIEVED', description: 'Combines symbols like "want" + "juice".' },
    { childId: aanya.id, domain: 'COMMUNICATION', title: 'Says "Mama" spontaneously', status: 'IN_PROGRESS' },
    { childId: aanya.id, domain: 'SOCIAL', title: 'Parallel play for 5+ minutes', status: 'IN_PROGRESS' },
    { childId: aanya.id, domain: 'EMOTIONAL', title: 'Identifies happy/sad pictures', status: 'ACHIEVED' },
    { childId: aanya.id, domain: 'MOTOR', title: 'Holds pencil with tripod grip', status: 'NOT_STARTED' },
    { childId: aanya.id, domain: 'DAILY_LIVING', title: 'Brushes teeth with prompting', status: 'IN_PROGRESS' },
    { childId: arjun.id, domain: 'COGNITIVE', title: 'Completes 3-step tasks', status: 'IN_PROGRESS' },
    { childId: arjun.id, domain: 'EMOTIONAL', title: 'Names own emotion when asked', status: 'IN_PROGRESS' },
    { childId: arjun.id, domain: 'SOCIAL', title: 'Takes turns in board games', status: 'ACHIEVED' },
  ];
  for (const m of milestoneSeed) {
    await prisma.milestone.create({
      data: {
        childId: m.childId,
        domain: m.domain,
        title: m.title,
        description: m.description,
        status: m.status,
        achievedAt: m.status === 'ACHIEVED' ? new Date() : undefined,
      },
    });
  }

  // ── Goals ────────────────────────────────────────────────
  await prisma.goal.createMany({
    data: [
      { childId: aanya.id, title: 'Use AAC for 5+ requests/day', progress: 60, targetDate: new Date(Date.now() + 30 * 24 * 3600 * 1000) },
      { childId: aanya.id, title: 'Tolerate 30 min in supermarket', progress: 25, targetDate: new Date(Date.now() + 60 * 24 * 3600 * 1000) },
      { childId: arjun.id, title: 'Complete homework without 1:1 prompting', progress: 40 },
    ],
  });

  // ── Therapy sessions ────────────────────────────────────
  const now = Date.now();
  await prisma.therapySession.createMany({
    data: [
      {
        childId: aanya.id,
        therapistId: therapist.id,
        type: TherapyType.SPEECH,
        scheduledAt: new Date(now - 7 * 24 * 3600 * 1000),
        durationMins: 45,
        status: 'COMPLETED',
        notes: 'Worked on 2-symbol AAC combinations. Aanya combined "want + juice" 4x without prompt. Some resistance to new symbol set.',
        aiSummary: '✓ Strong: spontaneous "want + juice" combos\n✓ Working on: tolerating new symbol set\n→ Next: introduce 1 new symbol/session, reinforce with preferred items',
      },
      {
        childId: aanya.id,
        therapistId: therapist.id,
        type: TherapyType.OCCUPATIONAL,
        scheduledAt: new Date(now + 2 * 24 * 3600 * 1000),
        durationMins: 45,
        status: 'SCHEDULED',
      },
      {
        childId: arjun.id,
        therapistId: therapist.id,
        type: TherapyType.BEHAVIORAL,
        scheduledAt: new Date(now + 4 * 24 * 3600 * 1000),
        durationMins: 60,
        status: 'SCHEDULED',
      },
    ],
  });

  // ── Appointments ────────────────────────────────────────
  await prisma.appointment.createMany({
    data: [
      {
        userId: parent.id,
        childId: aanya.id,
        kind: 'DOCTOR',
        title: 'Pediatric review with Dr. Banerjee',
        location: 'Manipal Hospitals, Whitefield',
        startsAt: new Date(now + 3 * 24 * 3600 * 1000),
        endsAt: new Date(now + 3 * 24 * 3600 * 1000 + 45 * 60 * 1000),
        notes: 'Bring growth chart and last therapy report.',
      },
      {
        userId: parent.id,
        childId: arjun.id,
        kind: 'SCHOOL_MEETING',
        title: 'IEP review with Ms. Lakshmi',
        location: 'Inclusive Wings School',
        startsAt: new Date(now + 6 * 24 * 3600 * 1000),
        endsAt: new Date(now + 6 * 24 * 3600 * 1000 + 60 * 60 * 1000),
      },
    ],
  });

  // ── Mood entries ────────────────────────────────────────
  const moods: Mood[] = ['GREAT', 'GOOD', 'OKAY', 'TOUGH', 'GOOD', 'OKAY', 'GREAT'];
  for (let i = 0; i < moods.length; i++) {
    await prisma.moodEntry.create({
      data: {
        childId: aanya.id,
        mood: moods[i],
        loggedAt: new Date(now - i * 24 * 3600 * 1000),
        note: i === 3 ? 'Tough day — meltdown after school assembly (loud).' : undefined,
      },
    });
  }

  // ── Community posts ─────────────────────────────────────
  await prisma.communityPost.createMany({
    data: [
      {
        authorId: parent.id,
        title: 'Welcome to SpecialParent.in 🤍',
        body: 'Hi everyone — this is a space for Indian parents and caregivers of children with special needs. Be kind, ask anything, share what works. You are not alone.',
        category: PostCategory.GENERAL,
        tags: ['welcome', 'community'],
        pinned: true,
      },
      {
        authorId: therapist.id,
        title: 'Tip: Visual schedules for school mornings',
        body: 'Many parents ask me how to reduce morning chaos. A laminated visual schedule with 5-7 picture steps (wake → toilet → brush → breakfast → uniform → bag → shoes) reduces resistance enormously. Let your child move a token after each step.',
        category: PostCategory.RESOURCE,
        tags: ['routines', 'visual-schedule'],
      },
    ],
  });

  // ── Resources (CMS-lite) ────────────────────────────────
  await prisma.resource.createMany({
    data: [
      {
        slug: 'autism-early-signs',
        title: 'Early Signs of Autism in Indian Children',
        excerpt: 'A plain-language guide for parents wondering whether to seek a developmental assessment.',
        body: '# Early Signs\n\nIf you are noticing differences in your child\'s development, that observation is worth taking seriously. **You know your child best.**\n\n## Common early indicators\n\n- Limited eye contact or social smiling\n- Delayed speech or loss of words previously used\n- Strong reactions to sensory input (sound, light, texture)\n- Repetitive movements (hand-flapping, spinning)\n- Difficulty with transitions and changes\n\n## What to do next\n\n1. Speak to a pediatrician or developmental specialist.\n2. In India, the **District Early Intervention Centre (DEIC)** under RBSK offers free screening up to age 18.\n3. A diagnosis is a doorway — to support, services, and clarity.',
        category: 'autism-guides',
        language: 'EN',
        publishedAt: new Date(),
      },
      {
        slug: 'home-therapy-activities',
        title: '7 Home Therapy Activities You Can Do Today',
        excerpt: 'Simple, low-cost activities that build communication, motor, and sensory skills.',
        body: '# Home Therapy Activities\n\nNot everything has to happen in a clinic.\n\n1. **Sand or rice bin play** — hide small toys, build vocabulary as you find them.\n2. **Mirror time** — make faces together; name the emotions.\n3. **Obstacle course** — pillows, chairs, blankets. Builds motor planning and joy.\n4. **Cooking together** — pouring, stirring, smelling. Engages every sense.\n5. **Picture walks** — walk in your neighborhood, take photos of 5 things you both like.\n6. **Music & movement** — let your child lead the dance for 1 minute, then you lead.\n7. **Bedtime story routine** — same book, same order, every night for 2 weeks.',
        category: 'home-therapy',
        language: 'EN',
        publishedAt: new Date(),
      },
      {
        slug: 'rpwd-rights',
        title: 'Your Rights Under the RPWD Act 2016',
        excerpt: 'A summary of what Indian law guarantees for children with disabilities.',
        body: '# Rights of Persons with Disabilities Act, 2016\n\nThe **RPWD Act** recognizes 21 disabilities (up from 7 in the 1995 Act) and establishes legal rights to:\n\n- **Inclusive education** in mainstream schools\n- **Reservation** in government education and jobs (4%)\n- **Accessible public spaces** and transport\n- **Special educators** in schools\n- **Disability certificate** issued by designated medical authority\n- **UDID card** for unified access to schemes\n\n## How to claim\n\n1. Visit your nearest government hospital with a disability board.\n2. Get assessed and receive a Disability Certificate.\n3. Apply for UDID at swavlambancard.gov.in.\n4. Use UDID to access scholarships, travel concessions, Niramaya insurance.',
        category: 'government',
        language: 'EN',
        publishedAt: new Date(),
      },
    ],
  });

  // ── Government schemes ──────────────────────────────────
  await prisma.governmentScheme.createMany({
    data: [
      {
        slug: 'niramaya',
        name: 'Niramaya Health Insurance Scheme',
        description: 'Affordable health insurance for persons with autism, cerebral palsy, mental retardation, and multiple disabilities.',
        benefitSummary: 'Cover up to ₹1,00,000/year for OPD, hospitalization, therapy, and corrective surgeries.',
        eligibility: 'Indian citizen with disability covered under the National Trust Act. UDID card required.',
        applyUrl: 'https://thenationaltrust.gov.in/',
        states: [],
      },
      {
        slug: 'udid',
        name: 'UDID — Unique Disability ID',
        description: 'A single national ID card for persons with disabilities to access all welfare schemes.',
        benefitSummary: 'Streamlined access to scholarships, travel concessions, reservations, insurance.',
        eligibility: 'Disability certificate from a Government Medical Board.',
        applyUrl: 'https://www.swavlambancard.gov.in/',
        states: [],
      },
      {
        slug: 'samarth-scholarship',
        name: 'National Scholarship for Students with Disabilities',
        description: 'Pre-matric, post-matric, and top-class scholarships for students with disabilities.',
        benefitSummary: '₹500–₹3,000/month plus tuition support depending on level.',
        eligibility: '40%+ disability, family income below specified threshold.',
        applyUrl: 'https://scholarships.gov.in/',
        states: [],
      },
    ],
  });

  // ── Notifications ───────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        userId: parent.id,
        kind: 'THERAPY',
        title: 'Upcoming session: Aanya — Occupational Therapy',
        body: 'In 2 days at 10:00 AM with Dr. Ananya Rao.',
        link: '/therapy',
      },
      {
        userId: parent.id,
        kind: 'COMMUNITY',
        title: 'New tip in Community',
        body: 'Dr. Ananya posted "Visual schedules for school mornings".',
        link: '/community',
      },
    ],
  });

  console.log('✅ Seeding complete.');
  console.log('\nDemo accounts (password: Demo1234!):');
  console.log('  parent@specialparent.in    — Priya (parent of Aanya & Arjun)');
  console.log('  therapist@specialparent.in — Dr. Ananya (speech therapist)');
  console.log('  admin@specialparent.in     — Platform admin');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
