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
      {
        slug: 'therapy-aba',
        title: 'Applied Behavior Analysis (ABA) — a plain-language guide',
        excerpt: 'The most-studied autism therapy. What it actually is, when it helps, and how it looks in India.',
        body: '# ABA (Applied Behavior Analysis)\n\nABA is a science of learning and behavior. Applied to autism, it breaks skills into small steps, uses reinforcement to build them up, and tracks progress with data.\n\n## What ABA can help with\n\n- **Language and requesting** — from single sounds to full sentences and AAC use\n- **Play and social skills** — turn-taking, joint attention, playing with peers\n- **Self-help** — brushing, dressing, toileting, eating\n- **Reducing behaviours** that hurt the child or those around them\n- **Following instructions** in home, school, and community settings\n\n## What a session looks like\n\n- **1:1 with a therapist**, usually 60–120 minutes\n- **Naturalistic** for younger kids (embedded in play) or **discrete-trial** (structured drills) for specific skills\n- Parents are often trained alongside the child so the same strategies continue at home\n\n## What to ask before signing up\n\n1. What is the therapist\'s **certification**? Look for **RBT** (Registered Behavior Technician) supervised by a **BCBA** (Board Certified Behavior Analyst).\n2. How many hours per week do they recommend, and why? Historically 20–40 was the norm; modern practice increasingly favours **lower intensity + parent training**.\n3. How will progress be **shared**? Every good programme has a review cycle with data.\n4. What is their **stance on punishment / restraint**? The answer must be: no.\n5. How do they **listen to your child**? Assent-based, neurodiversity-affirming ABA is what to look for; not compliance at any cost.\n\n## Finding ABA in India\n\n- India has a growing community of BCBA-supervised practitioners, mostly in metro cities.\n- The **RCI (Rehabilitation Council of India)** doesn\'t yet issue an ABA-specific credential — many practitioners hold clinical psychology or special education registrations plus BCBA.\n- Cost: ₹800–₹2,500 per hour in major cities. Some insurance and Niramaya may partially cover.\n- The **National Trust** and some autism NGOs run subsidised or free programmes.\n\n## Concerns worth knowing about\n\nABA has drawn valid criticism from autistic adults, especially older forms that pushed compliance and masking. Modern, ethical ABA is:\n\n- **Assent-based** — the child\'s participation is a signal, not a mandate\n- **Values-driven** — teaches skills the child and family want\n- **Neurodiversity-affirming** — never asks a child to hide who they are\n\nIf a therapist can\'t articulate all three, keep looking.',
        category: 'therapies',
        language: Language.EN,
        publishedAt: new Date(),
      },
      {
        slug: 'therapy-occupational',
        title: 'Occupational Therapy for children with autism',
        excerpt: 'What OT is, how it differs from physio, and the goals your OT will typically work on.',
        body: '# Occupational Therapy (OT)\n\nFor a child, "occupation" means the things they do every day — play, eating, dressing, writing, going to school. Occupational Therapy helps children participate in these more independently and comfortably.\n\n## Common OT goals for autistic children\n\n- **Fine motor** — grip, cutting with scissors, buttoning, writing\n- **Gross motor** — balance, coordination, catching, riding a cycle\n- **Sensory processing** — tolerating textures, sounds, movement (see also: sensory integration therapy)\n- **Self-care** — brushing, dressing, feeding, toileting\n- **Play skills** — pretend play, sharing, planning multi-step games\n- **School readiness** — sitting, attending, following classroom routines\n\n## What a session looks like\n\n- 45–60 minutes, usually 1:1\n- Play-based for younger children — swings, ball pits, obstacle courses look like fun but every element is chosen for a reason\n- Structured tasks for older children — handwriting practice, cutting activities, buttoning boards\n- Parents get **home-programme cards** — a few activities to keep the work going between sessions\n\n## Finding an OT in India\n\n- Look for **RCI-registered occupational therapists**. Verify at rehabcouncil.nic.in.\n- Most cities have paediatric OT clinics; NIMHANS (Bengaluru), AIIMS, and major children\'s hospitals run OT departments.\n- Cost: ₹400–₹1,500 per session privately; free or subsidised at government DEICs (District Early Intervention Centres) under RBSK.\n\n## OT vs physiotherapy — how are they different?\n\n- **Physio** works mostly on **movement, strength, and gait** — sit, stand, walk, run.\n- **OT** works on **participation in daily life** — using the hands, tolerating sensations, doing self-care and school tasks.\n- Many children benefit from both.\n\n## Signs your child would benefit\n\n- Meltdowns around textures, sounds, or grooming (brushing hair, cutting nails)\n- Struggles with pencil grip, cutting, buttons\n- Trips often, avoids playground equipment\n- Doesn\'t play with toys the "expected" way and gets stuck\n- Difficulty with self-feeding, dressing, toileting past the usual age',
        category: 'therapies',
        language: Language.EN,
        publishedAt: new Date(),
      },
      {
        slug: 'therapy-sensory-integration',
        title: 'Sensory Integration Therapy — helping the nervous system regulate',
        excerpt: 'A specialised OT approach for children who under-register or over-react to everyday sensations.',
        body: '# Sensory Integration (SI) Therapy\n\nSensory integration is how the nervous system takes in information from the body and world, sorts it, and produces a matched response. For many autistic children this system runs "too loud" or "too quiet" — hence the meltdowns at Diwali fireworks, the seeking of pressure and spinning, the refusal to wear tags.\n\n## What SI therapy aims to do\n\n- Give the nervous system the input it needs, in a **safe, structured, playful** way\n- Help the child develop **self-regulation** — noticing what they need and asking for it\n- Build **adaptive responses** — instead of a meltdown at loud noises, reaching for headphones\n- Improve tolerance of everyday sensations that were previously overwhelming\n\n## What a session looks like\n\n- A specially equipped OT room — swings, ball pits, weighted blankets, tactile bins, trampoline, therapy putty\n- The therapist follows the child\'s lead and gently structures the play\n- Parents watch, learn, and take home a **"sensory diet"** — a menu of activities to do daily\n\n## Sensory diet — the take-home piece\n\nA sensory diet is not food. It is a personalised, small daily menu of activities that keep the child regulated. Typical examples:\n\n- **Before school** — 5 minutes of trampoline or wall pushes to alert the body\n- **Before homework** — deep pressure hug, weighted lap pad\n- **Before bed** — dim lights, slow linear swinging, warm bath\n- **On outings** — noise-cancelling headphones, chew necklace, break plan\n\n## Who provides it\n\n- **Paediatric OTs with SI training** (some hold **SIPT** certification — Sensory Integration and Praxis Test).\n- In India, look for OTs trained by the **Sensory Integration Global Network (SIGN)** or with international SI mentorship.\n- Not every OT does SI, and not every SI-labelled programme is real SI. Ask about their training.\n\n## What the evidence says (honestly)\n\nSI therapy has a mixed evidence base — strong on individual reports of improved participation, weaker on standardised outcome measures. Most families see real improvements in daily life; researchers debate whether the improvements come from SI\'s specific mechanisms or from any structured, playful, child-led OT. Either way: if your child looks forward to sessions, tolerates more of the world afterwards, and you have a working sensory diet at home, it is doing its job.',
        category: 'therapies',
        language: Language.EN,
        publishedAt: new Date(),
      },
      {
        slug: 'therapy-speech',
        title: 'Speech & Language Therapy — from first sounds to full conversations',
        excerpt: 'For every child who communicates differently — verbal, AAC, or somewhere in between.',
        body: '# Speech & Language Therapy (SLT)\n\nSpeech therapy is often the first therapy families think of, and one of the most rewarding. But its scope is much wider than "getting my child to talk." A good speech therapist works on everything from oral motor skills to conversational back-and-forth to alternative ways of communicating.\n\n## What speech therapy covers\n\n- **Expressive language** — sounds, words, sentences, storytelling\n- **Receptive language** — understanding what others say\n- **Articulation** — clarity of speech sounds\n- **Pragmatics** — the social side of language: greeting, turn-taking, staying on topic\n- **AAC (Augmentative & Alternative Communication)** — picture boards, sign, tablet-based speech apps\n- **Oral-motor and feeding** — chewing, swallowing, drinking from a cup\n- **Reading and writing** — literacy is language\n\n## What a session looks like\n\n- 30–60 minutes, 1:1 or small group\n- Play-based for young children — bubbles, cause-and-effect toys, picture books\n- Structured for older children — flashcards, worksheets, role-play\n- Increasingly, tablet-based apps (Avaz, Proloquo2Go, TouchChat) for AAC users\n\n## AAC is not "giving up" on speech\n\nDecades of research show that giving a child a robust way to communicate (AAC) **increases** the chance of verbal speech developing, not decreases. When a child\'s communication is not blocked, they communicate more, and that practice grows their voice. If a therapist tells you AAC will stop your child from talking, get a second opinion.\n\n## Finding a speech therapist in India\n\n- Look for **ASLP** (Audiology and Speech-Language Pathology) or **MASLP** degree holders, **RCI-registered**.\n- Verify at rehabcouncil.nic.in.\n- **AIISH** (Mysore) and **AYJNIHH** (Mumbai) are the two national institutes; graduates practise across the country.\n- Cost: ₹500–₹1,800 per session privately; free at DEICs under RBSK.\n\n## What parents can do between sessions\n\n- **Narrate the day** — commentary, not questions ("You\'re pouring the water. It\'s cold.")\n- **Wait longer** — expect it to take 5–10 seconds for a response. Silence is not empty; it is the child processing.\n- **Follow their lead** — talk about what they\'re interested in, at their level plus one\n- **Ready their AAC device** — if they use one, keep it charged and within reach *always*\n- **Read together** — even to a non-verbal child, even the same book fifty times\n\n## Signs your child would benefit\n\n- Fewer than expected words for their age (see the "Early Signs" guide)\n- Loss of words that were previously used\n- Speech that\'s hard to understand for others past age 3\n- Difficulty with 2–3 step instructions\n- Not initiating requests or comments\n- Difficulty with conversations (interrupting, staying on topic)',
        category: 'therapies',
        language: Language.EN,
        publishedAt: new Date(),
      },
      {
        slug: 'therapy-physio',
        title: 'Physiotherapy for children with special needs',
        excerpt: 'When movement, strength, or coordination is affected — how physio helps and what to expect.',
        body: '# Paediatric Physiotherapy\n\nPhysio (or PT) helps children with movement — gross motor skills, strength, coordination, balance, and gait. For many autistic children this is a secondary need, but for children with cerebral palsy, Down syndrome, or other neurodevelopmental conditions, physio is often central.\n\n## What paediatric physio works on\n\n- **Gross motor milestones** — head control, rolling, sitting, crawling, standing, walking\n- **Strength and endurance** — trunk stability, holding a posture, playground stamina\n- **Coordination** — running, jumping, cycling, ball skills, climbing\n- **Gait and posture** — walking pattern, foot alignment, hip stability\n- **Balance** — standing on one leg, catching self when tripping\n- **Assistive equipment** — orthotics, walkers, standing frames, wheelchair positioning\n\n## What a session looks like\n\n- 30–60 minutes, usually 1:1\n- **Play-based** at younger ages — climbing, rolling, obstacle courses\n- **Structured exercises** for older children — targeted strengthening, stretches\n- **Home programme** — a small set of daily exercises parents lead\n\n## Finding a paediatric physiotherapist in India\n\n- Look for a **BPT / MPT** (Bachelor / Master of Physiotherapy) with **paediatric experience**.\n- **IAP** (Indian Association of Physiotherapists) directory can help locate them.\n- Government hospitals, NIMHANS, AIIMS, and the DEICs under RBSK offer free paediatric physio.\n- Private cost: ₹400–₹1,500 per session.\n\n## Physio vs Occupational Therapy — quick guide\n\n- If the concern is **how your child moves, walks, or plays actively** — start with physio.\n- If the concern is **using the hands, tolerating sensations, or doing self-care** — start with OT.\n- If both — many clinics offer both, and the two therapists usually coordinate.\n\n## What parents can do at home\n\n- **Play on the floor** — every crawl, roll, and reach is exercise\n- **Outdoor time daily** — walks, playgrounds, cycles\n- **Barefoot when safe** — barefoot walking on grass, sand, and different textures strengthens the foot and improves sensory feedback\n- **Practice the physio home programme consistently** — even 10 minutes daily beats 60 minutes weekly',
        category: 'therapies',
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
