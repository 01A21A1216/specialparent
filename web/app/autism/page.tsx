import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Understanding Autism — SpecialParent.in',
  description:
    'A warm, India-aware guide for parents: early signs, getting an evaluation, the spectrum, therapies, doctors, government support systems and helplines.',
};

const EARLY_SIGNS: Array<{ age: string; signs: string[] }> = [
  {
    age: 'By 9–12 months',
    signs: [
      'Limited eye contact or not turning toward voices',
      "Doesn't respond consistently to their own name",
      'Few smiles, gestures (waving, reaching), or babbling',
    ],
  },
  {
    age: 'By 16–18 months',
    signs: [
      'No single meaningful words',
      "Doesn't point to share interest (e.g. a bird, a toy)",
      'Difficulty with simple back-and-forth play',
    ],
  },
  {
    age: 'By 24 months',
    signs: [
      'No two-word phrases (not just repeated TV/video lines)',
      'Loss of words or social skills already learned (regression)',
      'Strong distress with small routine changes',
    ],
  },
  {
    age: 'Any age',
    signs: [
      'Repetitive movements: hand-flapping, rocking, spinning',
      'Intense, narrow interests; lining up or sorting objects',
      'Sensory differences: covers ears, avoids textures, seeks pressure',
      'Difficulty with transitions, eye contact, or unstructured play',
    ],
  },
];

const PARENT_STEPS: Array<{ n: string; title: string; body: string }> = [
  {
    n: '01',
    title: 'Notice and write it down',
    body:
      'Keep a simple log for two weeks: what you observe, when, what helped, what didn\'t. Photos and short videos are gold for the first specialist appointment.',
  },
  {
    n: '02',
    title: 'Talk to your pediatrician',
    body:
      'Ask specifically for a developmental screening (M-CHAT-R is common between 16–30 months) and a referral to a developmental pediatrician, child psychiatrist, or pediatric neurologist.',
  },
  {
    n: '03',
    title: 'Get a formal evaluation',
    body:
      'A multi-disciplinary assessment using tools like ADOS-2, ADI-R, and Vineland gives you a clear picture and unlocks services. Don\'t skip this — it\'s the foundation.',
  },
  {
    n: '04',
    title: 'Apply for UDID',
    body:
      'The Unique Disability ID (swavlambancard.gov.in) is the gateway to Niramaya health insurance, scholarships, school accommodations, and tax benefits under the RPWD Act 2016.',
  },
  {
    n: '05',
    title: 'Build a small care team',
    body:
      'Start with what your child needs most: speech therapy if communication is limited; OT if motor or sensory differences are central; a special educator if school is overwhelming.',
  },
  {
    n: '06',
    title: 'Set tiny, frequent goals',
    body:
      'Three to six-month goals across communication, daily living, and emotional regulation. Celebrate small wins — they compound.',
  },
  {
    n: '07',
    title: 'Find your people',
    body:
      'Other Indian parents who have walked this road. Online forums, regional WhatsApp groups, mentorship pairings — community is medicine.',
  },
  {
    n: '08',
    title: 'Take care of yourself',
    body:
      'Caregiver burnout is real and predictable. Therapy, sleep, a friend who listens — these aren\'t luxuries. They\'re part of caring for your child well.',
  },
];

const THERAPIES: Array<{ icon: string; name: string; what: string; for: string }> = [
  {
    icon: '🗣️',
    name: 'Speech-Language Therapy',
    what:
      'Builds spoken language, comprehension, social communication, and AAC use when verbal speech is limited.',
    for: 'Most autistic children benefit, especially in the first few years.',
  },
  {
    icon: '✋',
    name: 'Occupational Therapy (OT)',
    what:
      'Sensory processing, fine motor skills, daily-living skills (dressing, self-feeding), self-regulation strategies.',
    for: 'Children with sensory differences, motor delays, or trouble with daily routines.',
  },
  {
    icon: '🎯',
    name: 'Behavioral therapy (ABA, naturalistic)',
    what:
      'Structured approaches that teach skills and reduce harmful behaviors. Modern, family-led, neurodiversity-affirming approaches focus on consent, joy, and natural learning.',
    for: 'Skill-building across communication, play, daily living. Choose practitioners who center the child\'s comfort and dignity.',
  },
  {
    icon: '🧩',
    name: 'DIR / Floortime',
    what:
      'A relationship-based, child-led play approach that follows the child\'s interests to expand engagement and communication.',
    for: 'Particularly helpful in early years and for emotional connection.',
  },
  {
    icon: '🖼️',
    name: 'PECS / AAC',
    what:
      'Picture Exchange Communication System and other Augmentative and Alternative Communication tools — physical cards, tablets, voice-output devices.',
    for: 'Children whose verbal speech is limited or absent.',
  },
  {
    icon: '👫',
    name: 'Social skills groups',
    what:
      'Small-group practice of conversation, friendship skills, perspective-taking, and self-advocacy.',
    for: 'School-age children and teens.',
  },
  {
    icon: '🌊',
    name: 'Sensory integration therapy',
    what:
      'A specific OT approach using a "sensory diet" of structured activities to help the nervous system organise input.',
    for: 'Children with significant sensory processing differences.',
  },
  {
    icon: '📚',
    name: 'Special education & inclusive school',
    what:
      'Individualised Education Plans (IEPs), accommodations, modified curriculum, and trained shadow teachers in inclusive settings.',
    for: 'School-age children — RPWD Act 2016 mandates reasonable accommodations.',
  },
];

const SPECIALISTS: Array<{ role: string; what: string }> = [
  {
    role: 'Developmental pediatrician',
    what:
      'Often the first comprehensive evaluator. Diagnoses developmental conditions and coordinates the broader care plan.',
  },
  {
    role: 'Pediatric neurologist',
    what:
      'Rules out and manages neurological conditions (epilepsy, regression with neurological cause). Important if seizures are a concern.',
  },
  {
    role: 'Child psychiatrist',
    what:
      'Diagnoses ASD and co-occurring conditions (ADHD, anxiety). Can prescribe and manage medication when needed.',
  },
  {
    role: 'Clinical psychologist',
    what:
      'Conducts diagnostic assessments (ADOS-2, ADI-R, IQ testing) and provides therapy for older children, teens, and parents.',
  },
  {
    role: 'Speech-language pathologist',
    what:
      'Evaluates and treats communication; trains parents in language-building routines and AAC.',
  },
  {
    role: 'Occupational therapist',
    what:
      'Addresses sensory, motor, and daily-living skills. Often the most-frequented therapist.',
  },
  {
    role: 'Special educator',
    what:
      'Designs and delivers individualized academic and life-skill instruction; bridges home and school.',
  },
  {
    role: 'BCBA / ABA therapist',
    what:
      'Designs and supervises behavioral programs. Look for practitioners who centre the child\'s consent and use modern, naturalistic approaches.',
  },
];

const ASSESSMENTS: Array<{ name: string; what: string }> = [
  {
    name: 'M-CHAT-R/F',
    what:
      'A short parent-completed screening for autism in toddlers (16–30 months). A "fail" suggests a full evaluation, not a diagnosis.',
  },
  {
    name: 'ADOS-2',
    what:
      'The gold-standard observational assessment. A trained clinician interacts with your child through structured play and conversation.',
  },
  {
    name: 'ADI-R',
    what:
      'A detailed structured interview with the parent or primary caregiver about developmental history and current behaviour.',
  },
  {
    name: 'Vineland Adaptive Behavior Scales',
    what:
      'Measures real-world functioning across communication, daily-living, and social domains. Often used alongside diagnostic tools.',
  },
  {
    name: 'CARS-2',
    what:
      'Childhood Autism Rating Scale — a clinician rates observed behaviour to indicate severity.',
  },
  {
    name: 'Cognitive testing (WISC / BSID)',
    what:
      'Estimates cognitive profile and learning strengths — useful for school planning, not for predicting potential.',
  },
];

const HELPLINES: Array<{ name: string; phone: string; hours: string; note: string; tone: 'sage' | 'coral' | 'mist' | 'lavender' }> = [
  {
    name: 'KIRAN Mental Health Helpline',
    phone: '1800-599-0019',
    hours: '24×7',
    note: 'Govt of India · 13 languages · free',
    tone: 'sage',
  },
  {
    name: 'Vandrevala Foundation',
    phone: '1860-266-2345',
    hours: '24×7',
    note: 'Free mental-health support · counsellors and psychiatrists',
    tone: 'coral',
  },
  {
    name: 'iCALL (TISS)',
    phone: '9152-987-821',
    hours: 'Mon–Sat, 8am–10pm',
    note: 'Mumbai-based, multilingual · email & chat available',
    tone: 'mist',
  },
  {
    name: 'AASRA',
    phone: '9820-466-726',
    hours: '24×7',
    note: 'Suicide prevention helpline',
    tone: 'lavender',
  },
  {
    name: 'NIMHANS Psychosocial Support',
    phone: '080-4611-0007',
    hours: '24×7',
    note: 'National Institute of Mental Health & Neurosciences, Bengaluru',
    tone: 'sage',
  },
  {
    name: 'Universal Emergency',
    phone: '112',
    hours: '24×7',
    note: 'Police · ambulance · medical emergency',
    tone: 'coral',
  },
];

const TONE_HELP: Record<string, string> = {
  sage: 'bg-sage-50 border-sage-200',
  coral: 'bg-coral-50 border-coral-200',
  mist: 'bg-mist-50 border-mist-200',
  lavender: 'bg-lavender-50 border-lavender-200',
};

export default function AutismPage() {
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
              SpecialParent<span className="text-coral-500">.in</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sage-700">
            <Link href="/" className="hover:text-sage-900 min-h-fit py-1">Home</Link>
            <Link href="/autism" className="text-sage-900 font-medium min-h-fit py-1">Autism</Link>
            <Link href="/platform" className="hover:text-sage-900 min-h-fit py-1">Platform</Link>
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
            Understanding autism
          </div>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-sage-900">
            You're not lost.{' '}
            <span className="relative inline-block">
              <span className="relative z-10 text-coral-600">This is the start.</span>
              <span
                className="absolute bottom-1 left-0 right-0 h-3 bg-coral-200/70 -rotate-1 -z-0"
                aria-hidden="true"
              />
            </span>
          </h1>
          <p className="mt-7 text-lg sm:text-xl text-sage-700 leading-relaxed">
            A warm, India-aware introduction for parents who suspect — or have just
            learned — that their child may be on the autism spectrum. Take what you
            need. Come back as often as you like.
          </p>
        </div>

        {/* Quick jump */}
        <nav aria-label="On this page" className="mt-12 flex flex-wrap gap-2 text-sm">
          {[
            ['#what', 'What is autism'],
            ['#signs', 'Early signs'],
            ['#acceptance', 'Acceptance'],
            ['#steps', 'First steps'],
            ['#early', 'Early intervention'],
            ['#spectrum', 'The spectrum'],
            ['#assessments', 'Assessments'],
            ['#therapies', 'Therapies'],
            ['#specialists', 'Specialists'],
            ['#india', 'India support'],
            ['#emergency', 'Emergency'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-full border border-sage-200 bg-cream-50/60 hover:bg-sage-50 px-4 py-2 text-sage-800"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Disclaimer */}
        <div className="mt-10 card bg-cream-100 border-cream-200 max-w-3xl">
          <p className="text-sm text-sage-700">
            <strong className="text-sage-900">A note before you read:</strong>{' '}
            this page is educational. It is not a diagnosis, not a substitute for a
            qualified clinician, and not personalised medical advice. If you have
            concerns about your child, please speak to a developmental pediatrician
            or child psychiatrist. Phone numbers below are real Indian helplines —
            verify before relying in an emergency.
          </p>
        </div>
      </section>

      <main className="container-app pb-24 space-y-20">
        {/* What is autism */}
        <Section id="what" eyebrow="The basics" title="What autism is — and what it isn't">
          <div className="prose-warm">
            <p>
              Autism Spectrum Disorder (ASD) is a developmental difference in how a
              person communicates, processes the world, and connects socially. It
              shows up early — usually in the first three years of life — and lasts
              a lifetime.
            </p>
            <p>
              Autism is <strong>not</strong> an illness. It is <strong>not</strong>{' '}
              caused by parenting, vaccines, or screen time. It is <strong>not</strong>{' '}
              a single thing — two children with the same diagnosis can present
              very differently. And it is <strong>not</strong> something to be cured.
              It's a way of being.
            </p>
            <p>
              With the right support — therapy, accommodations, an understanding
              family, an inclusive school — autistic children can grow into
              autistic adults who lead full, meaningful lives. Many of the people
              who shape technology, science, art, and engineering today are autistic.
            </p>
          </div>
        </Section>

        {/* Early signs */}
        <Section id="signs" eyebrow="Early signs" title="What to watch for, by age">
          <p className="text-sage-700 max-w-2xl mb-8">
            No single sign means autism, and many autistic children don't show every
            sign. Trust your instincts. If something feels off, ask for a screening —
            you do not need to "wait and see."
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            {EARLY_SIGNS.map((g) => (
              <article
                key={g.age}
                className="card bg-sage-50 border-sage-100"
              >
                <h3 className="font-display text-xl text-sage-900">{g.age}</h3>
                <ul className="mt-4 space-y-2.5">
                  {g.signs.map((s) => (
                    <li key={s} className="flex items-start gap-2.5 text-sage-700">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-coral-500 flex-shrink-0" aria-hidden="true" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </Section>

        {/* Acceptance */}
        <Section id="acceptance" eyebrow="A note for parents" title="Acceptance is a process, not a moment">
          <div className="prose-warm">
            <p>
              You may move through shock, denial, fear, anger, guilt, grief — sometimes
              several in a single afternoon. This is normal. It does not mean you
              love your child any less. Most parents describe a slow internal shift
              over months or years, from "what's wrong with my child" to "how do I
              meet my child where they are."
            </p>
            <p>Two ideas that other Indian parents say helped them:</p>
            <ul>
              <li>
                <strong>This is your same child.</strong> The diagnosis didn't change
                them. It gave you better information.
              </li>
              <li>
                <strong>You don't have to "fix" them.</strong> You learn how they
                communicate, advocate for what they need, and build skills together —
                at their pace, on their terms.
              </li>
            </ul>
            <p>
              In Indian families, well-meaning relatives may say hurtful things, suggest
              "remedies," or insist nothing is wrong. You are allowed to set boundaries.
              Find a small circle of people who will simply believe you. Start there.
            </p>
          </div>
        </Section>

        {/* Steps */}
        <Section id="steps" eyebrow="A roadmap" title="Eight high-level steps for parents">
          <div className="grid md:grid-cols-2 gap-5">
            {PARENT_STEPS.map((s) => (
              <article key={s.n} className="card">
                <div className="font-display text-4xl text-coral-300 leading-none">{s.n}</div>
                <h3 className="font-display text-xl text-sage-900 mt-3">{s.title}</h3>
                <p className="mt-3 text-sage-700 leading-relaxed text-sm">{s.body}</p>
              </article>
            ))}
          </div>
        </Section>

        {/* Early intervention */}
        <Section id="early" eyebrow="Why time matters" title="Early intervention works — but it's never too late">
          <div className="prose-warm">
            <p>
              The brain is most plastic in the first five years of life. Children
              who begin therapy early — ideally before age three — generally show
              the strongest outcomes. The window between recognising signs and
              starting support is the most important one to shorten.
            </p>
            <p>
              That said: a child who starts therapy at six is not "behind." They
              are starting now. The brain continues to learn at every age. Many
              autistic teenagers and adults make life-changing progress when they
              finally find the right support and a community that understands them.
            </p>
            <p className="text-sage-600 italic">
              In short — start as early as you can, but if you're starting late,
              start anyway.
            </p>
          </div>
        </Section>

        {/* Spectrum */}
        <Section id="spectrum" eyebrow="The spectrum" title="No two autistic children are the same">
          <div className="prose-warm">
            <p>
              "Spectrum" is the right word. The DSM-5 (the diagnostic manual most
              Indian psychiatrists use) describes Autism Spectrum Disorder with three
              levels of support need:
            </p>
            <ul>
              <li><strong>Level 1 — requiring support.</strong> May have noticeable difficulty starting or maintaining conversations, transitioning between activities, or organising independently.</li>
              <li><strong>Level 2 — substantial support.</strong> Marked deficits in verbal and non-verbal social communication; restricted, repetitive behaviours obvious to a casual observer.</li>
              <li><strong>Level 3 — very substantial support.</strong> Severe deficits in functional communication; very limited initiation of social interaction; significant difficulty with change.</li>
            </ul>
            <p>
              Older labels like <em>Asperger's syndrome</em> and <em>PDD-NOS</em> are
              now folded into ASD. Many adults still use these older terms about
              themselves — that's their right.
            </p>
            <p>
              Autism rarely travels alone. About 30–50% of autistic children also
              have ADHD; many experience anxiety, sensory processing differences,
              learning differences, sleep issues, or epilepsy. Around 30% have
              co-occurring intellectual disability — the other 70% do not.
            </p>
          </div>
        </Section>

        {/* Assessments */}
        <Section id="assessments" eyebrow="Assessments" title="The tools clinicians use">
          <p className="text-sage-700 max-w-2xl mb-8">
            A good evaluation is multi-disciplinary and combines several of these.
            Don't be alarmed by the names — they're standard, well-validated, and
            mostly look like structured play to your child.
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            {ASSESSMENTS.map((a) => (
              <article key={a.name} className="card">
                <h3 className="font-display text-lg text-sage-900">{a.name}</h3>
                <p className="mt-2 text-sage-700 text-sm leading-relaxed">{a.what}</p>
              </article>
            ))}
          </div>
        </Section>

        {/* Therapies */}
        <Section id="therapies" eyebrow="Therapies" title="What helps — and why">
          <p className="text-sage-700 max-w-2xl mb-8">
            No single therapy works for every child. A good plan combines a few,
            adjusts as your child changes, and centres their dignity, comfort, and
            consent. Beware of any program that promises a "cure."
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            {THERAPIES.map((t) => (
              <article key={t.name} className="card">
                <div className="text-3xl">{t.icon}</div>
                <h3 className="font-display text-xl text-sage-900 mt-2">{t.name}</h3>
                <p className="mt-3 text-sage-700 leading-relaxed text-sm">{t.what}</p>
                <p className="mt-3 text-sage-600 leading-relaxed text-sm italic">
                  Best for: {t.for}
                </p>
              </article>
            ))}
          </div>
        </Section>

        {/* Specialists */}
        <Section id="specialists" eyebrow="Your team" title="Doctors and specialists who help">
          <div className="grid md:grid-cols-2 gap-5">
            {SPECIALISTS.map((s) => (
              <article key={s.role} className="card bg-mist-50 border-mist-100">
                <h3 className="font-display text-lg text-sage-900">{s.role}</h3>
                <p className="mt-2 text-sage-700 text-sm leading-relaxed">{s.what}</p>
              </article>
            ))}
          </div>
        </Section>

        {/* India support */}
        <Section id="india" eyebrow="India support systems" title="What's available, and where">
          <div className="space-y-8">
            <article className="card bg-coral-50 border-coral-100">
              <h3 className="font-display text-2xl text-sage-900">Government & legal</h3>
              <ul className="mt-4 space-y-3 text-sage-800">
                <li>
                  <strong>National Trust</strong> (Department of Empowerment of Persons with Disabilities, Ministry of Social Justice) — runs <strong>Niramaya</strong> health insurance, <strong>Disha</strong> early-intervention programme, <strong>Vikaas</strong> day-care centres, and <strong>Gharaunda</strong> group homes.
                </li>
                <li>
                  <strong>UDID — Unique Disability ID.</strong> Free, online application at{' '}
                  <a className="underline underline-offset-2 decoration-coral-400" href="https://www.swavlambancard.gov.in" target="_blank" rel="noreferrer">swavlambancard.gov.in</a>. Required for most central and state benefits.
                </li>
                <li>
                  <strong>RPWD Act 2016.</strong> Recognises autism as a disability; mandates inclusive education, reasonable accommodations in schools and workplaces, and protection from discrimination.
                </li>
                <li>
                  <strong>National Education Policy 2020.</strong> Reinforces inclusive education with trained teachers and individualised plans across all schools.
                </li>
                <li>
                  <strong>DigiLocker.</strong> Government-issued digital wallet — store medical records, UDID, school certificates safely.
                </li>
              </ul>
            </article>

            <article className="card bg-sage-50 border-sage-100">
              <h3 className="font-display text-2xl text-sage-900">Premier institutes</h3>
              <ul className="mt-4 space-y-3 text-sage-800">
                <li>
                  <strong>NIMHANS</strong> — National Institute of Mental Health and
                  Neurosciences, Bengaluru. Outpatient and tertiary care; renowned
                  Child & Adolescent Psychiatry department.
                </li>
                <li>
                  <strong>AIIMS</strong> — multiple cities. Pediatric and child
                  psychiatry departments offer evaluation and ongoing care, often
                  at low cost.
                </li>
                <li>
                  <strong>NIEPID</strong> — National Institute for Empowerment of
                  Persons with Intellectual Disabilities, Secunderabad. National
                  centre with regional centres in Kolkata, New Delhi, Mumbai, and
                  Noida.
                </li>
                <li>
                  <strong>NIPMR</strong> — National Institute of Physical Medicine
                  & Rehabilitation, Kerala (and similar state-run centres
                  elsewhere).
                </li>
              </ul>
            </article>

            <article className="card bg-mist-50 border-mist-100">
              <h3 className="font-display text-2xl text-sage-900">Major NGOs and parent organisations</h3>
              <ul className="mt-4 space-y-3 text-sage-800">
                <li>
                  <strong>Action for Autism</strong> (New Delhi) — pioneer Indian
                  autism organisation. Parent training, school, vocational,{' '}
                  <a className="underline underline-offset-2 decoration-coral-400" href="https://www.actionforautism.org" target="_blank" rel="noreferrer">actionforautism.org</a>.
                </li>
                <li>
                  <strong>Forum for Autism</strong> — Mumbai-based, parent-run.
                </li>
                <li>
                  <strong>The Spastics Society of India</strong> — multi-city services for cerebral palsy, autism, and developmental disabilities.
                </li>
                <li>
                  <strong>Ummeed Child Development Center</strong> — Mumbai, multi-disciplinary care.
                </li>
                <li>
                  <strong>Sankalp / Nayi Disha / Sahaay Autism Trust</strong> and many regional groups across Indian cities — search "[your city] autism parent group" for active WhatsApp communities.
                </li>
              </ul>
            </article>
          </div>
        </Section>

        {/* Emergency */}
        <Section id="emergency" eyebrow="If you need help right now" title="Emergency and mental-health helplines">
          <p className="text-sage-700 max-w-2xl mb-8">
            All numbers below are for India. Save them in your phone before you need
            them. If your child or you are in immediate physical danger, call{' '}
            <strong className="text-sage-900">112</strong> first.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {HELPLINES.map((h) => (
              <article
                key={h.name}
                className={`rounded-3xl border ${TONE_HELP[h.tone]} p-6`}
              >
                <h3 className="font-display text-lg text-sage-900">{h.name}</h3>
                <a
                  href={`tel:${h.phone.replace(/[^0-9+]/g, '')}`}
                  className="block font-display text-3xl text-sage-900 mt-3 hover:text-coral-600"
                >
                  {h.phone}
                </a>
                <p className="text-sage-600 text-sm mt-2">
                  <strong>{h.hours}</strong> · {h.note}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-8 text-sm text-sage-600 italic max-w-2xl">
            Asking for help is not weakness. Caregivers carry a real, measurable
            psychological load. Reaching out — even just to talk — is part of being
            a good parent.
          </p>
        </Section>

        {/* Closing */}
        <section className="card bg-sage-600 text-cream-50 lg:p-12">
          <p className="text-coral-200 font-medium tracking-wide uppercase text-sm">
            One last thing
          </p>
          <h2 className="font-display text-3xl sm:text-4xl mt-3 max-w-3xl">
            Autism is a part of who your child is. Loving them well — and helping
            the world meet them where they are — is the work of a lifetime, and you
            don't have to do it alone.
          </h2>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-coral text-lg">
              Create a free account
            </Link>
            <Link href="/community" className="btn-secondary text-lg bg-sage-700 text-cream-50 hover:bg-sage-800">
              Find your community
            </Link>
          </div>
        </section>
      </main>

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

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <p className="text-coral-600 font-medium tracking-wide uppercase text-sm">
        {eyebrow}
      </p>
      <h2 className="font-display text-4xl sm:text-5xl mt-3 text-sage-900 leading-tight">
        {title}
      </h2>
      <div className="mt-8">{children}</div>
    </section>
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
