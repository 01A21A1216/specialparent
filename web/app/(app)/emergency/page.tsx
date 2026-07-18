'use client';

import { useApi } from '../../../lib/swr';

interface ChildContact {
  id: string;
  fullName: string;
  emergencyContact?: string | null;
  allergies: string[];
  medications: string[];
  diagnoses: string[];
  sensoryTriggers: string[];
}

interface Helpline {
  name: string;
  number: string;
  tel: string; // dialable form
  description: string;
  hours: string;
  tone: 'coral' | 'sage' | 'mist' | 'lavender';
}

const HELPLINES: Helpline[] = [
  {
    name: 'iCall (TISS)',
    number: '9152987821',
    tel: '+919152987821',
    description:
      'Free psychosocial helpline run by TISS. Trained counsellors in English, Hindi, and Marathi.',
    hours: 'Mon–Sat, 8 AM – 10 PM',
    tone: 'coral',
  },
  {
    name: 'Vandrevala Foundation',
    number: '1860 2662 345',
    tel: '+18602662345',
    description:
      'Free mental-health & crisis support helpline. Answered in multiple Indian languages.',
    hours: '24/7',
    tone: 'sage',
  },
  {
    name: 'KIRAN (Govt. of India)',
    number: '1800-599-0019',
    tel: '+18005990019',
    description:
      'National mental health rehabilitation helpline. 13 languages. Free.',
    hours: '24/7',
    tone: 'mist',
  },
  {
    name: 'AASRA',
    number: '9820466726',
    tel: '+919820466726',
    description: 'Suicide prevention & emotional crisis helpline.',
    hours: '24/7',
    tone: 'lavender',
  },
  {
    name: 'Childline India',
    number: '1098',
    tel: '+911098',
    description:
      'Child protection & help for children in distress. Toll-free.',
    hours: '24/7',
    tone: 'coral',
  },
  {
    name: 'Ambulance (national)',
    number: '108',
    tel: '+91108',
    description: 'Medical emergency. Free ambulance service in most states.',
    hours: '24/7',
    tone: 'sage',
  },
];

const TONE_CARD: Record<Helpline['tone'], string> = {
  coral: 'bg-coral-50 border-coral-100',
  sage: 'bg-sage-50 border-sage-100',
  mist: 'bg-mist-50 border-mist-100',
  lavender: 'bg-lavender-50 border-lavender-100',
};

const TONE_BTN: Record<Helpline['tone'], string> = {
  coral: 'bg-coral-500 hover:bg-coral-600 text-cream-50',
  sage: 'bg-sage-600 hover:bg-sage-700 text-cream-50',
  mist: 'bg-mist-500 hover:bg-mist-600 text-cream-50',
  lavender: 'bg-lavender-500 hover:bg-lavender-600 text-cream-50',
};

export default function EmergencyPage() {
  const { data: children = null, isLoading: loading } =
    useApi<ChildContact[]>('/children');

  return (
    <div className="space-y-10">
      <header>
        <p className="text-coral-500 text-sm uppercase tracking-wider font-medium">
          Get help now
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-sage-900 mt-2">
          Emergency support
        </h1>
        <p className="mt-3 text-sage-700 max-w-2xl leading-relaxed">
          You are not alone. If your child or you are in immediate danger, call{' '}
          <a href="tel:+91112" className="font-semibold text-coral-700 underline">
            112
          </a>{' '}
          — India's unified emergency number. Otherwise, one of the helplines
          below can talk with you now.
        </p>
      </header>

      {/* Big-red-button — 112 */}
      <a
        href="tel:+91112"
        className="card block bg-coral-600 hover:bg-coral-700 border-coral-700 text-cream-50 text-center py-8 transition-colors"
      >
        <div className="text-5xl">🚑</div>
        <div className="font-display text-3xl mt-2">Call 112 — Emergency</div>
        <div className="text-cream-100/90 mt-1 text-sm">
          Police · Ambulance · Fire · Disaster response
        </div>
      </a>

      {/* Per-child emergency contacts */}
      <section>
        <h2 className="font-display text-2xl text-sage-900 mb-4">
          Your children's emergency contacts
        </h2>
        {loading ? (
          <div className="card animate-pulse h-32" />
        ) : !children || children.length === 0 ? (
          <div className="card text-center py-8 text-sage-600">
            Add a child profile to keep their emergency contact one tap away.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {children.map((c) => (
              <div key={c.id} className="card">
                <h3 className="font-display text-lg text-sage-900">{c.fullName}</h3>
                {c.emergencyContact ? (
                  <a
                    href={`tel:${c.emergencyContact.replace(/\s+/g, '')}`}
                    className="btn-coral mt-3 inline-flex text-sm"
                  >
                    📞 Call {c.emergencyContact}
                  </a>
                ) : (
                  <p className="text-sm text-sage-500 mt-2 italic">
                    No emergency contact saved. Add one on the child's profile.
                  </p>
                )}
                {(c.allergies.length > 0 || c.medications.length > 0) && (
                  <div className="mt-4 space-y-2 text-sm">
                    {c.allergies.length > 0 && (
                      <div>
                        <span className="text-coral-700 font-medium">Allergies:</span>{' '}
                        <span className="text-sage-700">{c.allergies.join(', ')}</span>
                      </div>
                    )}
                    {c.medications.length > 0 && (
                      <div>
                        <span className="text-sage-700 font-medium">Medications:</span>{' '}
                        <span className="text-sage-700">{c.medications.join(', ')}</span>
                      </div>
                    )}
                    {c.sensoryTriggers.length > 0 && (
                      <div>
                        <span className="text-mist-700 font-medium">Known triggers:</span>{' '}
                        <span className="text-sage-700">{c.sensoryTriggers.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* India helplines */}
      <section>
        <h2 className="font-display text-2xl text-sage-900 mb-4">
          National helplines
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {HELPLINES.map((h) => (
            <div key={h.name} className={`card border ${TONE_CARD[h.tone]}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h3 className="font-display text-lg text-sage-900">{h.name}</h3>
                  <p className="text-xs text-sage-500 mt-0.5">{h.hours}</p>
                </div>
                <a href={`tel:${h.tel}`} className={`btn text-sm px-4 py-2 rounded-2xl ${TONE_BTN[h.tone]}`}>
                  📞 {h.number}
                </a>
              </div>
              <p className="mt-3 text-sm text-sage-700 leading-relaxed">
                {h.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* What to do */}
      <section>
        <h2 className="font-display text-2xl text-sage-900 mb-4">
          If your child is having a meltdown or crisis
        </h2>
        <div className="card space-y-4">
          <StepItem
            n="1"
            title="Safety first — physical and sensory"
            body="Move sharp objects. Dim lights. Turn off music/TV. Lower your voice."
          />
          <StepItem
            n="2"
            title="Get low, get quiet"
            body="Sit near your child, not over them. Don't demand eye contact. Reduce your own words to short, calm phrases."
          />
          <StepItem
            n="3"
            title="No teaching in the storm"
            body="Discipline, negotiation, and explanations don't work during dysregulation. That's for later, when the nervous system is calm."
          />
          <StepItem
            n="4"
            title="Offer deep pressure if welcomed"
            body="A firm hug, a weighted blanket, a squish between cushions — but only if your child accepts it."
          />
          <StepItem
            n="5"
            title="Wait it out"
            body="Meltdowns typically last 5–20 minutes. It feels longer. It will end."
          />
          <StepItem
            n="6"
            title="Repair afterward"
            body='Later, calmly: "That was hard. I love you. What helped?" Log what triggered it and what helped — patterns emerge over weeks.'
          />
          <StepItem
            n="7"
            title="Reach out"
            body="If meltdowns are increasing, causing injury, or you are exhausted — talk to your therapist, pediatrician, or one of the helplines above. This is not a failure. It is data."
          />
        </div>
      </section>
    </div>
  );
}

function StepItem({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-9 h-9 rounded-full bg-sage-100 text-sage-700 grid place-items-center font-display text-lg flex-shrink-0">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sage-900">{title}</p>
        <p className="text-sm text-sage-700 mt-1 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
