/* eslint-disable no-console */
import {
  Language,
  PostCategory,
  PrismaClient,
  Role,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SpecialParent.in (clean — no child demo data)...');

  const passwordHash = await bcrypt.hash('Demo1234!', 12);

  // ── Users (login accounts only) ─────────────────────────
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

  await prisma.user.upsert({
    where: { email: 'admin@specialparent.in' },
    update: {},
    create: {
      email: 'admin@specialparent.in',
      fullName: 'Platform Admin',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'teacher@specialparent.in' },
    update: {},
    create: {
      email: 'teacher@specialparent.in',
      fullName: 'Ms. Lakshmi Menon',
      passwordHash,
      role: Role.TEACHER,
    },
  });

  await prisma.user.upsert({
    where: { email: 'school@specialparent.in' },
    update: {},
    create: {
      email: 'school@specialparent.in',
      fullName: 'Mr. Vikram Sharma',
      passwordHash,
      role: Role.SCHOOL_ADMIN,
    },
  });

  // ── Children: intentionally NOT seeded ──────────────────
  // Parents add their own children from the UI.

  // ── Community posts (keep — public content) ─────────────
  // Deterministic ids so re-seeding upserts in place instead of duplicating
  // (CommunityPost has no natural unique key).
  const communityPosts = [
    {
      id: 'seed-welcome',
      authorId: parent.id,
      title: 'Welcome to SpecialParent.in 🤍',
      body: 'Hi everyone — this is a space for Indian parents and caregivers of children with special needs. Be kind, ask anything, share what works. You are not alone.',
      category: PostCategory.GENERAL,
      tags: ['welcome', 'community'],
      pinned: true,
    },
    {
      id: 'seed-visual-schedules',
      authorId: therapist.id,
      title: 'Tip: Visual schedules for school mornings',
      body: 'Many parents ask me how to reduce morning chaos. A laminated visual schedule with 5-7 picture steps (wake → toilet → brush → breakfast → uniform → bag → shoes) reduces resistance enormously. Let your child move a token after each step.',
      category: PostCategory.RESOURCE,
      tags: ['routines', 'visual-schedule'],
    },
  ];
  for (const { id, ...data } of communityPosts) {
    await prisma.communityPost.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }

  // ── Resources (keep — public CMS content) ───────────────
  const resources = [
      {
        slug: 'autism-early-signs',
        title: 'Early Signs of Autism in Indian Children',
        excerpt: 'A plain-language guide for parents wondering whether to seek a developmental assessment.',
        body: '# Early Signs\n\nIf you are noticing differences in your child\'s development, that observation is worth taking seriously. **You know your child best.**\n\n## Common early indicators\n\n- Limited eye contact or social smiling\n- Delayed speech or loss of words previously used\n- Strong reactions to sensory input (sound, light, texture)\n- Repetitive movements (hand-flapping, spinning)\n- Difficulty with transitions and changes\n\n## What to do next\n\n1. Speak to a pediatrician or developmental specialist.\n2. In India, the **District Early Intervention Centre (DEIC)** under RBSK offers free screening up to age 18.\n3. A diagnosis is a doorway — to support, services, and clarity.',
        category: 'autism-guides',
        language: Language.EN,
        publishedAt: new Date(),
      },
      {
        slug: 'home-therapy-activities',
        title: '7 Home Therapy Activities You Can Do Today',
        excerpt: 'Simple, low-cost activities that build communication, motor, and sensory skills.',
        body: '# Home Therapy Activities\n\nNot everything has to happen in a clinic.\n\n1. **Sand or rice bin play** — hide small toys, build vocabulary as you find them.\n2. **Mirror time** — make faces together; name the emotions.\n3. **Obstacle course** — pillows, chairs, blankets. Builds motor planning and joy.\n4. **Cooking together** — pouring, stirring, smelling. Engages every sense.\n5. **Picture walks** — walk in your neighborhood, take photos of 5 things you both like.\n6. **Music & movement** — let your child lead the dance for 1 minute, then you lead.\n7. **Bedtime story routine** — same book, same order, every night for 2 weeks.',
        category: 'home-therapy',
        language: Language.EN,
        publishedAt: new Date(),
      },
      {
        slug: 'rpwd-rights',
        title: 'Your Rights Under the RPWD Act 2016',
        excerpt: 'A summary of what Indian law guarantees for children with disabilities.',
        body: '# Rights of Persons with Disabilities Act, 2016\n\nThe **RPWD Act** recognizes 21 disabilities (up from 7 in the 1995 Act) and establishes legal rights to:\n\n- **Inclusive education** in mainstream schools\n- **Reservation** in government education and jobs (4%)\n- **Accessible public spaces** and transport\n- **Special educators** in schools\n- **Disability certificate** issued by designated medical authority\n- **UDID card** for unified access to schemes\n\n## How to claim\n\n1. Visit your nearest government hospital with a disability board.\n2. Get assessed and receive a Disability Certificate.\n3. Apply for UDID at swavlambancard.gov.in.\n4. Use UDID to access scholarships, travel concessions, Niramaya insurance.',
        category: 'government',
        language: Language.EN,
        publishedAt: new Date(),
      },
  ];
  for (const r of resources) {
    await prisma.resource.upsert({
      where: { slug: r.slug },
      update: r,
      create: r,
    });
  }

  // ── Government schemes (keep — public CMS content) ──────
  const schemes = [
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
  ];
  for (const s of schemes) {
    await prisma.governmentScheme.upsert({
      where: { slug: s.slug },
      update: s,
      create: s,
    });
  }

  // ── Notifications: removed (referenced demo child/sessions) ──

  console.log('✅ Seeding complete.');
  console.log('\nDemo accounts (password: Demo1234!):');
  console.log('  parent@specialparent.in    — Priya (parent — no children yet, add your own)');
  console.log('  therapist@specialparent.in — Dr. Ananya (speech therapist)');
  console.log('  teacher@specialparent.in   — Ms. Lakshmi (special educator)');
  console.log('  school@specialparent.in    — Mr. Vikram (school admin)');
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
