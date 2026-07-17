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
      {
        slug: 'nutrition-support',
        title: 'Nutrition Support for Neurodivergent Children',
        excerpt: 'Practical, Indian-kitchen-friendly ways to nourish picky eaters and address common sensitivities.',
        body: '# Nutrition Support\n\nMealtimes can be one of the hardest parts of the day when a child has sensory sensitivities, oral-motor challenges, or medication that affects appetite. A few grounding ideas from Indian pediatric nutritionists.\n\n## Common patterns to watch for\n\n- **Beige-food-only** phases — plain roti, curd rice, biscuits. Very common with autism.\n- **Texture aversion** — refuses anything mushy, lumpy, or sticky.\n- **Strong food-brand loyalty** — only *this* brand of biscuit, *this* colour of plate.\n- **Constipation** — especially with limited fibre + hydration.\n\n## Small wins that work\n\n1. **One safe food per plate** — always. Reduces meltdowns.\n2. **Add nutrition to accepted foods** — grated carrot into dosa batter, moong dal into khichdi, ghee for calories.\n3. **Predictable order** — offer new foods *after* the child has eaten something familiar.\n4. **No pressure, low affect** — mealtime is not therapy. Sit, eat, chat.\n5. **Chew practice outside meals** — flavoured chews, sugarcane, licorice sticks help oral-motor development.\n\n## When to seek help\n\n- Weight loss or falling off the growth curve\n- Fewer than 20 foods in the accepted list\n- Distress that lasts beyond the meal\n\nA **pediatric dietitian or feeding therapist** (usually an SLP or OT) can build a slow desensitization plan. Ask your therapist for a referral.',
        category: 'nutrition',
        language: Language.EN,
        publishedAt: new Date(),
      },
      {
        slug: 'sensory-activities',
        title: 'Sensory Activity Ideas for Home',
        excerpt: 'A menu of calming and alerting activities you can rotate through the week — no fancy equipment needed.',
        body: '# Sensory Activities\n\nSensory input isn\'t just about avoiding overwhelm — many children *seek* input to feel regulated. Rotating a small menu across the day helps.\n\n## Calming (proprioceptive & deep-pressure)\n\n- **Weighted blanket time** — 10–15 mins, no more than 10%% of body weight.\n- **Bear hugs / squishes** — firm, predictable, always with consent.\n- **Wheelbarrow walks** — child walks on hands, you hold their ankles.\n- **Pushing / pulling** — laundry basket rides, carrying groceries.\n- **Chewelry** — silicone chew necklaces for oral input.\n\n## Alerting (vestibular & light touch)\n\n- **Swinging** — front-back is calming, spinning is alerting. Watch for over-stimulation.\n- **Trampoline** — 5 mins before homework can improve focus.\n- **Ice-cube play** — quick, novel, alerting.\n- **Balloon volley** — slow-moving object, tracks eyes and arms.\n\n## Tactile (safe messy play)\n\n- **Sand or rice bin** — hide small toys inside; unearths language.\n- **Shaving foam on a mirror** — draw shapes, letters, faces.\n- **Kinetic sand** — non-drying, good for texture-averse kids to build tolerance.\n- **Sensory dough** — atta + oil + a drop of essential oil.\n\n## How to use this\n\n- Don\'t do them all in one day. Pick 2 calming + 1 alerting.\n- Watch your child. If they laugh, come back for more, or ask by name — that\'s the winner.\n- Log which activities help before school, before therapy, before sleep. Patterns emerge in ~2 weeks.',
        category: 'home-therapy',
        language: Language.EN,
        publishedAt: new Date(),
      },
      {
        slug: 'sleep-strategies',
        title: 'Sleep Improvement Strategies',
        excerpt: 'Why sleep is often disrupted for neurodivergent children, and a gentle protocol to build a stable rhythm.',
        body: '# Sleep\n\nSleep is one of the most-reported challenges parents raise — and one of the highest-leverage things to fix. Poor sleep amplifies almost everything else: mood, sensory tolerance, attention, appetite.\n\n## Why it\'s different for many neurodivergent children\n\n- **Delayed melatonin release** is more common in autism.\n- **Sensory hypervigilance** — a small noise, a scratchy tag, an unfamiliar shadow keeps the brain online.\n- **Anxiety about transitions** — bedtime is a transition.\n- **Co-occurring conditions** — GI issues, ADHD, epilepsy medication.\n\n## A gentle 3-week protocol\n\n### Week 1 — fix the environment\n- Blackout curtains. Even a streetlight matters.\n- One consistent bedtime, ±15 minutes, weekends included.\n- No screens 90 minutes before bed. This is the hardest one and the most effective.\n- Cooler room (23–24°C is often ideal for kids).\n\n### Week 2 — add the ritual\n- Same 4–5 steps, same order: bath → pajamas → teeth → story → lights out.\n- Use a visual schedule if your child benefits from one.\n- End with a low, predictable phrase: *"Amma is here. It is night. It is safe to sleep."*\n\n### Week 3 — measure and adjust\n- Track wake-ups and morning mood for 7 days.\n- If bedtime resistance is still >20 minutes, talk to your pediatrician about **melatonin** (0.5–3 mg, timed 30 mins before bed). It is well-studied and safe in children with clinician guidance.\n\n## When to escalate\n\n- Loud snoring or witnessed pauses in breathing → screen for **sleep apnea**.\n- Extreme early waking (before 4 AM) that persists → discuss anxiety or medication.\n- Meltdowns *from* tiredness feeding *into* poor sleep → the cycle needs professional help; ask your therapist.',
        category: 'daily-life',
        language: Language.EN,
        publishedAt: new Date(),
      },
      {
        slug: 'public-outings',
        title: 'Public Outing Guidance — Malls, Trains, Doctor Visits',
        excerpt: 'Preparing your child (and yourself) for outings that used to feel impossible.',
        body: '# Public Outings\n\nRestaurants, family functions, temples, train travel — outings are where the world stops being predictable. A little pre-work makes a big difference.\n\n## Before you go\n\n1. **Rehearse the place** — show a photo, a Google Street View walkthrough, or a short YouTube video of the destination.\n2. **Social story** — a 5–10 line story: *"On Sunday we will go to Phoenix Mall. We will park the car. We will take the lift. We will eat at the food court. We will come home."*\n3. **Pack the "outing kit"**: noise-cancelling headphones or earplugs, favorite chewie, spare change of clothes, snack, water, and one high-value comfort item.\n4. **Pick your timing** — early mornings and weekdays are quieter almost everywhere.\n\n## During\n\n- **Give a 5-minute warning** before any transition (leave the shop, move to the food court, exit).\n- **One yes for every no** — refusing a toy? Offer choice of two other things you were going to do anyway.\n- **Escape plan** — know where the nearest quiet corner is. Malls almost always have one near restrooms or upstairs corridors.\n- **Meltdown is not misbehavior** — it is nervous-system overload. Get out, get quiet, don\'t discipline in the moment.\n\n## After\n\n- Debrief calmly, later: *"That was hard. You did it. What helped you?"*\n- Log what worked (venue, time, kit item, warning phrase). Two months of these notes = your own custom playbook.\n\n## Specific settings\n\n- **Doctor / dentist visits** — call ahead and ask for the first appointment of the day. Many pediatric practices in India are now willing to skip the noisy waiting room for neurodivergent children.\n- **Train travel** — book AC coaches for lower sensory input. Take the top berth if your child prefers enclosure.\n- **Weddings & functions** — arrive early for the ceremony, plan to leave before the DJ starts. Nobody will remember; your child will.',
        category: 'daily-life',
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
