import {
  EvidenceLevel,
  TreatmentFocus,
  TreatmentSystem,
} from '@prisma/client';

// Editorial standard for this seed:
//   • Neutral, referenced tone. No endorsements. No fear-mongering.
//   • Every row states what the research actually shows, including for
//     unproven or harmful therapies — silence would let clinics fill the gap.
//   • India-specific regulatory context (CDSCO for drugs, ICMR for research
//     protocols, AYUSH Ministry for traditional systems) whenever relevant.
//   • References point to primary sources (WHO, NIH, ICMR, Cochrane, AAP,
//     Indian medical journals) so parents can verify us.
//
// Reviewed by: <TBD — before public launch, have a paediatrician + a
// developmental specialist + an AYUSH-registered practitioner sign off. Log
// their names + the date here.>

interface Seed {
  system: TreatmentSystem;
  focus: TreatmentFocus;
  evidenceLevel: EvidenceLevel;
  title: string;
  alsoKnownAs?: string;
  summary: string;
  whatItIs: string;
  whatResearchShows: string;
  considerations: string;
  indiaContext?: string;
  references: string[];
  prescriptionRequired?: boolean;
}

export const TREATMENT_RESEARCH_SEED: Seed[] = [
  // ═══ ALLOPATHIC (Modern medicine) ═══════════════════════════════════
  {
    system: 'ALLOPATHIC',
    focus: 'SYMPTOM_RELIEF',
    evidenceLevel: 'STANDARD_OF_CARE',
    title: 'Risperidone',
    alsoKnownAs: 'Risperdal, Sizodon, Respidon',
    summary:
      'An atypical antipsychotic that has FDA and CDSCO approval for irritability, aggression, and self-injurious behaviour in children with autism aged 5–16. Not for core autism features.',
    whatItIs:
      'A prescription medication that reduces the severity of aggressive outbursts, deliberate self-injury, and severe tantrums when behavioural strategies alone have not helped.',
    whatResearchShows:
      'Multiple randomised controlled trials and a Cochrane review (2016) show significant reduction in irritability scores versus placebo. It does not improve social communication, restricted interests, or repetitive behaviours — the core features of autism.',
    considerations:
      'Common side effects: weight gain (often significant), increased appetite, sedation, raised prolactin, and rare movement disorders. Requires baseline weight, fasting glucose, and prolactin monitoring, then periodic follow-up. Never start or stop without a psychiatrist. Not a first step — behaviour therapy and environmental adjustments come first.',
    indiaContext:
      'Approved by CDSCO. Available on prescription from psychiatrists and paediatric neurologists. Generic versions are affordable (~₹50–200/month). Overprescription without behavioural workup is a documented concern — insist on a full assessment first.',
    references: [
      'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD005040.pub2/full',
      'https://www.fda.gov/media/85554/download',
    ],
    prescriptionRequired: true,
  },
  {
    system: 'ALLOPATHIC',
    focus: 'SYMPTOM_RELIEF',
    evidenceLevel: 'STANDARD_OF_CARE',
    title: 'Aripiprazole',
    alsoKnownAs: 'Abilify, Arpizol, Asprito',
    summary:
      'A second FDA-approved antipsychotic for irritability in autism (ages 6–17). Often chosen when risperidone causes intolerable weight gain or prolactin rise.',
    whatItIs:
      'An atypical antipsychotic with a different receptor profile than risperidone. Prescribed for the same target — severe irritability, aggression, self-injury — not for core autism traits.',
    whatResearchShows:
      'Two large RCTs and a Cochrane review (2018) show meaningful reduction in irritability. Head-to-head data with risperidone is limited, but aripiprazole is often better tolerated on the metabolic side.',
    considerations:
      'Can still cause weight gain and sedation, plus akathisia (inner restlessness) which some children find distressing. Requires the same baseline labs and psychiatric follow-up as risperidone.',
    indiaContext:
      'Approved by CDSCO. Generic aripiprazole is widely available (~₹200–500/month for common doses).',
    references: [
      'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD009043.pub3/full',
    ],
    prescriptionRequired: true,
  },
  {
    system: 'ALLOPATHIC',
    focus: 'COMORBIDITY',
    evidenceLevel: 'EMERGING',
    title: 'Melatonin for sleep-onset problems',
    summary:
      'A hormone that helps signal sleep onset. Meta-analyses show it modestly improves sleep-onset latency and total sleep time in autistic children with sleep problems.',
    whatItIs:
      'A supplement version of the hormone the body already produces at night. Used short-term to establish a sleep routine, or longer under paediatrician guidance.',
    whatResearchShows:
      'Systematic reviews (2019, 2022) find consistent small-to-moderate benefit for sleep-onset latency. Behavioural sleep strategies (consistent routine, dim light, no screens before bed) come first — melatonin works best alongside them.',
    considerations:
      'Start low (0.5–1 mg, 30 min before bed). Immediate-release for onset problems, prolonged-release for staying-asleep problems — different formulations do different things. Not regulated as strictly as prescription drugs, so brand quality varies. Talk to your paediatrician before starting.',
    indiaContext:
      'Sold OTC in India but quality/dosing varies widely between brands. Look for prescription-brand versions or brands with third-party testing. Prolonged-release paediatric melatonin is available (import brands like Slenyto are prescription-only where sold).',
    references: [
      'https://www.thelancet.com/journals/lanchi/article/PIIS2352-4642(19)30189-0/fulltext',
    ],
  },
  {
    system: 'ALLOPATHIC',
    focus: 'COMORBIDITY',
    evidenceLevel: 'STANDARD_OF_CARE',
    title: 'SSRIs for co-occurring anxiety or OCD',
    alsoKnownAs: 'Fluoxetine, Sertraline, Escitalopram',
    summary:
      'Selective serotonin reuptake inhibitors are used for co-occurring anxiety or obsessive-compulsive symptoms in autistic children — NOT for autism itself.',
    whatItIs:
      'A class of prescription antidepressants. When a child\'s anxiety or intrusive rituals interfere with daily life on top of autism, SSRIs are one option alongside CBT-adapted-for-autism.',
    whatResearchShows:
      'Evidence for autism core symptoms is negative — SSRIs do not reduce repetitive behaviours in most trials. Evidence for co-occurring anxiety is more mixed but generally supportive when paired with therapy.',
    considerations:
      'Autistic children can be more sensitive to activation (agitation, insomnia) on SSRIs than typically-developing peers. Start at half a normal starting dose. Monitor closely in the first month — including for behavioural change and any suicidality (per standard SSRI black-box guidance).',
    indiaContext:
      'Available on prescription from psychiatrists and paediatricians. Widely available generics (₹100–300/month).',
    references: [
      'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD004677.pub3/full',
    ],
    prescriptionRequired: true,
  },
  {
    system: 'ALLOPATHIC',
    focus: 'COMORBIDITY',
    evidenceLevel: 'STANDARD_OF_CARE',
    title: 'Stimulants and non-stimulants for co-occurring ADHD',
    alsoKnownAs: 'Methylphenidate, Atomoxetine',
    summary:
      'Roughly 30–50% of autistic children also meet criteria for ADHD. When they do, ADHD medications work — though side effects are more common than in non-autistic ADHD.',
    whatItIs:
      'Methylphenidate is a stimulant; atomoxetine is a non-stimulant norepinephrine reuptake inhibitor. Both are used for attention, hyperactivity, and impulsivity — not for autism itself.',
    whatResearchShows:
      'RCTs show meaningful benefit at lower response rates and higher side-effect rates than in typically-developing children with ADHD. Start low, titrate slowly.',
    considerations:
      'Watch for increased irritability, appetite loss, sleep disruption, and worsening tics. If the child cannot tolerate stimulants, atomoxetine or guanfacine are alternatives. Behavioural strategies (structure, timers, movement breaks) come first.',
    indiaContext:
      'Methylphenidate is a Schedule H1 drug in India — controlled and prescription-only. Widely available brands (Inspiral, Addwize). Atomoxetine is more freely prescribed.',
    references: [
      'https://pubmed.ncbi.nlm.nih.gov/16275811/',
    ],
    prescriptionRequired: true,
  },
  {
    system: 'ALLOPATHIC',
    focus: 'COMORBIDITY',
    evidenceLevel: 'STANDARD_OF_CARE',
    title: 'Anticonvulsants for co-occurring epilepsy',
    summary:
      'About 20–30% of autistic children develop seizures by adolescence. When they do, standard paediatric neurology care applies — anticonvulsant choice depends on seizure type.',
    whatItIs:
      'Any of the standard anti-seizure medications (levetiracetam, valproate, lamotrigine, carbamazepine, etc.), selected by a paediatric neurologist based on the seizure pattern on EEG.',
    whatResearchShows:
      'These are not autism treatments — they treat the seizures themselves. Well-controlled epilepsy is associated with better developmental and behavioural outcomes.',
    considerations:
      'Every anticonvulsant has a distinct side-effect profile — mood changes, cognitive slowing, or behavioural effects that can look like autism getting worse. Report any change to the neurologist. Never stop abruptly.',
    indiaContext:
      'All standard anticonvulsants are available in India, mostly as affordable generics. See a paediatric neurologist, not a general practitioner, for seizure workup.',
    references: [
      'https://onlinelibrary.wiley.com/doi/10.1111/epi.13195',
    ],
    prescriptionRequired: true,
  },

  // ═══ MIND–BODY / BEHAVIOURAL (the foundation) ═════════════════════════
  {
    system: 'MIND_BODY',
    focus: 'CORE_SYMPTOMS',
    evidenceLevel: 'STANDARD_OF_CARE',
    title: 'Speech therapy, occupational therapy, and behavioural intervention',
    alsoKnownAs: 'SLT, OT, ABA / naturalistic developmental behavioural interventions (NDBI)',
    summary:
      'These are the foundation of care for autism worldwide. Intensive, early, sustained therapy — matched to the individual child — has the strongest evidence base of anything on this page.',
    whatItIs:
      'Speech-language therapy for communication (verbal, AAC, PECS). Occupational therapy for self-care, sensory regulation, fine motor. Behavioural / developmental interventions like ESDM, JASPER, and modern assent-based ABA for skill-building and reducing barriers.',
    whatResearchShows:
      'Decades of RCTs and systematic reviews show consistent gains in communication, adaptive skills, and quality of life when intervention is early, individualised, and family-involved. Older-style compliance-based ABA has drawn valid criticism from autistic adults — modern practice emphasises assent, neurodiversity-affirming goals, and generalisation to daily life.',
    considerations:
      'The right intervention is child-specific — a nonspeaking child with sensory needs and a hyperlexic anxious child need very different plans. Ask any provider: what is the goal, who defined it, and how will we know it worked? Progress should be visible to you as the parent.',
    indiaContext:
      'Access is uneven — well-served in metros, thin elsewhere. RCI (Rehabilitation Council of India) certification is the minimum credential for special educators, SLPs, and clinical psychologists in India. Ask to see the RCI number.',
    references: [
      'https://pediatrics.aappublications.org/content/145/1/e20193447',
      'https://www.who.int/news-room/fact-sheets/detail/autism-spectrum-disorders',
    ],
  },
  {
    system: 'MIND_BODY',
    focus: 'COMORBIDITY',
    evidenceLevel: 'EMERGING',
    title: 'Sensory integration therapy (Ayres SI)',
    summary:
      'A specialised OT approach that uses structured sensory input to help children who over- or under-respond to touch, movement, or sound. Evidence is mixed — helpful for specific sensory goals, not a treatment for autism itself.',
    whatItIs:
      'An occupational therapist with SI training runs sessions in a specially equipped room (swings, weighted equipment, textures). The child follows a play-based sequence tailored to their sensory profile.',
    whatResearchShows:
      'Recent trials show benefit on individualised sensory-related goals (COPM, GAS scores). Broader claims of improving social communication or academics are not well supported.',
    considerations:
      'Best used as one part of an OT plan, with clear goals you agree on upfront. Not "gadgets and swings will fix everything" — watch out for clinics that promise general behavioural or cognitive gains.',
    indiaContext:
      'Widely offered by OTs in Indian metros. Ask about the therapist\'s specific SI training (e.g., USC/WPS certification is a common credential).',
    references: [
      'https://ajot.aota.org/article.aspx?articleid=2733185',
    ],
  },

  // ═══ NUTRITIONAL ═══════════════════════════════════════════════════════
  {
    system: 'NUTRITIONAL',
    focus: 'CORE_SYMPTOMS',
    evidenceLevel: 'LIMITED',
    title: 'Gluten-free casein-free (GFCF) diet',
    summary:
      'A dietary elimination of wheat and dairy that some families report helps their child. Rigorous trials do not show a general benefit for autism, but a subset with GI symptoms may respond.',
    whatItIs:
      'A strict diet removing gluten (wheat, barley, rye) and casein (all dairy). Sometimes tried as a 3–6 month trial to see whether symptoms change.',
    whatResearchShows:
      'Blinded RCTs (including the University of Rochester study) do not show benefit for autism core symptoms in the average child. Systematic reviews conclude evidence is insufficient to recommend it universally, though families of children with confirmed celiac, cow-milk protein allergy, or persistent GI symptoms may see real gains.',
    considerations:
      'A restricted diet in a child who is often already a selective eater can cause serious nutritional gaps (calcium, vitamin D, iron, protein). Do it with a paediatric dietitian, not from a Facebook group. Keep a food + behaviour diary so you can actually tell if it helped.',
    indiaContext:
      'GFCF is harder in an Indian household (wheat rotis, milk-based curd/paneer). A dietitian who understands Indian meal patterns matters.',
    references: [
      'https://link.springer.com/article/10.1007/s10803-010-1078-8',
    ],
  },
  {
    system: 'NUTRITIONAL',
    focus: 'SUPPORT',
    evidenceLevel: 'EMERGING',
    title: 'Omega-3 fatty acids (fish oil)',
    summary:
      'A safe, widely-used supplement with small but consistent signals in meta-analyses for hyperactivity and irritability in autism. Not a core-symptom treatment.',
    whatItIs:
      'EPA + DHA fatty acids, usually from fish oil or algae oil (vegetarian). Sold as OTC supplements.',
    whatResearchShows:
      'Meta-analyses show small effect sizes. Not a substitute for behavioural intervention or medication when those are indicated. Low harm profile makes it a reasonable adjunct.',
    considerations:
      'Look for brands with third-party purity testing (IFOS, USP). Avoid mega-doses. Some children dislike the taste — smaller capsules or flavoured formulations help.',
    indiaContext:
      'Widely available in Indian pharmacies as prescription and OTC brands. Vegetarian algae-oil options are stocked in most major cities.',
    references: [
      'https://pubmed.ncbi.nlm.nih.gov/28303240/',
    ],
  },

  // ═══ AYURVEDA ════════════════════════════════════════════════════════
  {
    system: 'AYURVEDA',
    focus: 'SUPPORT',
    evidenceLevel: 'LIMITED',
    title: 'Brahmi (Bacopa monnieri)',
    summary:
      'A traditional Ayurvedic nootropic. Small trials in children (not autism-specific) suggest possible cognitive benefit. No autism-specific trial evidence to date.',
    whatItIs:
      'An herb prepared as ghrita, tablets, or syrups. In Ayurveda, prescribed for memory, attention, and general "brain tonic" indications.',
    whatResearchShows:
      'Small RCTs in typically-developing children (Sharma et al., others) show modest attention and memory benefits. No published RCTs specifically in autism.',
    considerations:
      'Can interact with SSRIs, anticonvulsants, thyroid medication, and sedatives — always tell every doctor what your child is taking. Quality varies enormously between brands. Buy only from AYUSH-licensed manufacturers, ideally through a registered Ayurvedic practitioner.',
    indiaContext:
      'Widely sold OTC in India. AYUSH Ministry regulates but enforcement of heavy-metal limits varies — see the safety alert entry below.',
    references: [
      'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3746283/',
    ],
  },
  {
    system: 'AYURVEDA',
    focus: 'COMORBIDITY',
    evidenceLevel: 'LIMITED',
    title: 'Ashwagandha (Withania somnifera)',
    summary:
      'An adaptogenic herb with adult evidence for stress and anxiety. No autism-specific paediatric trials. Sometimes suggested for co-occurring anxiety.',
    whatItIs:
      'The dried root of Withania somnifera, prepared as churna, tablets, or syrup.',
    whatResearchShows:
      'Adult trials show modest reductions in stress and cortisol. No published paediatric autism trials.',
    considerations:
      'Contraindicated in autoimmune conditions, pregnancy, and with thyroid medication (can raise T4). Occasional GI upset. As with all herbal products, quality and dose vary between brands.',
    indiaContext:
      'AYUSH-regulated. Buy from established brands with third-party testing where possible. Discuss with your paediatrician before starting alongside prescription medications.',
    references: [
      'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7096728/',
    ],
  },
  {
    system: 'AYURVEDA',
    focus: 'CORE_SYMPTOMS',
    evidenceLevel: 'NOT_RECOMMENDED',
    title: 'Safety alert: heavy-metal contamination in some OTC Ayurvedic products',
    summary:
      'Peer-reviewed studies have found unsafe levels of lead, mercury, or arsenic in a meaningful fraction of Ayurvedic products sold OTC in India and abroad — especially unregulated bhasma and rasa shastra preparations.',
    whatItIs:
      'A safety note, not a treatment. Rasa shastra formulations traditionally contain purified heavy metals; some non-rasa products are contaminated during manufacture.',
    whatResearchShows:
      'Saper et al. (JAMA, 2004 and 2008) found ~20% of tested Ayurvedic products contained detectable lead, mercury, or arsenic; some at pediatric-toxic levels. Case reports of childhood lead poisoning from Ayurvedic products exist in Indian and international medical literature.',
    considerations:
      'Never give a child unlabelled powders, bhasmas, or rasa preparations from unlicensed sources. Buy from AYUSH-licensed manufacturers only. Prefer well-known brands with published third-party testing. If a child on any Ayurvedic supplement develops abdominal pain, developmental regression, or unexplained anaemia, ask the paediatrician for a blood lead level.',
    indiaContext:
      'AYUSH Ministry sets heavy-metal limits and requires GMP certification. Enforcement varies. Always ask for the AYUSH license number and manufacturer.',
    references: [
      'https://jamanetwork.com/journals/jama/fullarticle/199962',
      'https://jamanetwork.com/journals/jama/fullarticle/182460',
    ],
  },

  // ═══ HOMEOPATHY ══════════════════════════════════════════════════════
  {
    system: 'HOMEOPATHY',
    focus: 'CORE_SYMPTOMS',
    evidenceLevel: 'LIMITED',
    title: 'Homeopathy for autism',
    summary:
      'Individual homeopathic remedies are widely prescribed for autism in India. Systematic reviews find no credible evidence that homeopathy improves core autism symptoms.',
    whatItIs:
      'A system of ultra-dilute remedies prescribed by BHMS-qualified practitioners after a constitutional workup. Common remedies mentioned in the literature include Carcinosin, Tarentula, and Stramonium.',
    whatResearchShows:
      'Cochrane and other major systematic reviews find no reliable evidence that homeopathy is effective for autism — or, more broadly, for any specific medical condition beyond placebo.',
    considerations:
      'Direct harm risk is low (the remedies are highly dilute). The real risk is delaying evidence-based intervention — speech therapy, occupational therapy, and behavioural support — during a critical window. If you use homeopathy, do NOT use it as a substitute for the therapies above. Tell your paediatrician what you are giving.',
    indiaContext:
      'Homeopathy is regulated under the AYUSH Ministry. BHMS is a recognised qualification. Cost is generally low. India-specific: some clinics market cure claims that overstate the evidence; treat any "cure autism" language as a warning sign.',
    references: [
      'https://www.nhmrc.gov.au/about-us/publications/homeopathy',
      'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD001957/full',
    ],
  },

  // ═══ BIOMEDICAL (experimental / harm risks) ══════════════════════════
  {
    system: 'BIOMEDICAL',
    focus: 'CORE_SYMPTOMS',
    evidenceLevel: 'NOT_RECOMMENDED',
    title: 'Chelation therapy for autism',
    alsoKnownAs: 'DMSA, EDTA chelation',
    summary:
      '⚠️ Not recommended. Marketed as a way to remove "heavy metals" from autistic children, chelation has no evidence of benefit for autism and has caused paediatric deaths in the US.',
    whatItIs:
      'A medical procedure — normally used to treat confirmed heavy-metal poisoning — that binds to metals in the blood so they can be excreted. Some alternative clinics market it as an autism treatment.',
    whatResearchShows:
      'No credible evidence of benefit for autism. Documented deaths in children who received chelation for autism (notably the 2005 Pittsburgh case). Major medical bodies including the AAP explicitly warn against it.',
    considerations:
      'Chelation is only indicated when a laboratory-confirmed heavy-metal poisoning exists. If a clinic offers it as an autism treatment, do not proceed — get a second opinion from a paediatrician. If your child has actual heavy-metal exposure concerns, insist on validated blood testing (not urine "provoked" testing, which is unreliable) before any treatment.',
    indiaContext:
      'Not approved as an autism treatment by any Indian medical body. Report clinics marketing it as such to your State Medical Council.',
    references: [
      'https://pubmed.ncbi.nlm.nih.gov/16770858/',
    ],
  },
  {
    system: 'BIOMEDICAL',
    focus: 'CORE_SYMPTOMS',
    evidenceLevel: 'EXPERIMENTAL',
    title: 'Hyperbaric oxygen therapy (HBOT)',
    summary:
      'A treatment where the child breathes oxygen inside a pressurised chamber. Evidence for autism is mixed and small; leading medical bodies do not recommend it as an autism intervention.',
    whatItIs:
      'Sessions in a hyperbaric chamber (typically 1.3–1.5 ATA for autism protocols, lower than medical HBOT for burns or wounds). Usually sold as 40-session packages costing lakhs of rupees.',
    whatResearchShows:
      'A few small trials show mixed results; larger reviews conclude the evidence is inadequate to recommend it. It is not FDA-approved for autism.',
    considerations:
      'Risks include middle-ear barotrauma, oxygen toxicity, and rare seizures. The main cost is financial and the opportunity cost of using that money on evidence-based therapy.',
    indiaContext:
      'HBOT is legitimate for indications like wound healing and carbon-monoxide poisoning — those are prescribed by qualified physicians. Autism-directed HBOT packages sold by wellness clinics are not the same thing. Ask for peer-reviewed evidence, not testimonials.',
    references: [
      'https://pubmed.ncbi.nlm.nih.gov/26980434/',
    ],
  },
  {
    system: 'BIOMEDICAL',
    focus: 'SUPPORT',
    evidenceLevel: 'EXPERIMENTAL',
    title: 'Methyl-B12 injections',
    summary:
      'Subcutaneous methylcobalamin (a form of vitamin B12) has been trialled in autism with mixed results. Only under a paediatrician\'s supervision; not a substitute for standard care.',
    whatItIs:
      'Small injections of methyl-B12, typically every three days, sometimes combined with folinic acid. Based on a hypothesis about methylation-cycle differences in autism.',
    whatResearchShows:
      'Small RCTs (Hendren et al., 2016) show subgroup responses on behavioural measures. Not consistent enough to recommend broadly. Long-term safety data is limited.',
    considerations:
      'Injection-site reactions, sleep changes, and irritability are reported. Only pursue under a paediatrician who can monitor and who is willing to stop if there\'s no clear benefit after a reasonable trial (e.g., 12 weeks).',
    indiaContext:
      'Available on prescription. Cost varies. Not a standard-of-care intervention — treat any provider selling it as guaranteed to help with scepticism.',
    references: [
      'https://pubmed.ncbi.nlm.nih.gov/26889726/',
    ],
    prescriptionRequired: true,
  },

  // ═══ NAMED BIOMEDICAL PROTOCOLS ══════════════════════════════════════
  {
    system: 'BIOMEDICAL',
    focus: 'CORE_SYMPTOMS',
    evidenceLevel: 'LIMITED',
    title: 'The Nemechek Protocol',
    alsoKnownAs: 'Inulin + extra-virgin olive oil + fish oil protocol',
    summary:
      'A supplement protocol (inulin fibre, extra-virgin olive oil, high-DHA fish oil, sometimes vagus-nerve stimulation) popularised by a US physician\'s book. Claims to reverse autism symptoms by treating small-intestinal bacterial overgrowth. No RCT evidence in autism; ingredients themselves are low-harm.',
    whatItIs:
      'A structured daily regimen combining three OTC ingredients — inulin (a prebiotic fibre), extra-virgin olive oil, and high-DHA fish oil — at doses that scale with the child\'s age and weight. Some versions add vagus nerve stimulation via a TENS unit behind the ear.',
    whatResearchShows:
      'The core mechanistic claim — that small-intestinal bacterial overgrowth (SIBO) drives autism and that this protocol corrects it — is not supported by mainstream autism research. There are no published randomised controlled trials evaluating the protocol for autism. Family reports on social media are enthusiastic but subject to placebo, natural developmental change, and reporting bias. Individually, the components have their own small evidence base: fish-oil omega-3 shows modest signals for hyperactivity; inulin is a well-tolerated prebiotic in most children; extra-virgin olive oil is a food.',
    considerations:
      'The three core ingredients are food-grade and generally safe. Watch for: gas and bloating from inulin (start very low and titrate slowly, especially in children with existing GI issues), fish-oil brand quality (look for third-party purity testing to avoid heavy-metal contamination), and rare allergic reactions. The bigger concerns are indirect: paid consultations and proprietary supplement bundles that markup ingredients you can buy cheaply at any grocery store, and the risk of delaying speech therapy, OT, and behavioural intervention while waiting for the protocol to "work". If you try it, do it alongside evidence-based therapy, not instead of it. Tell your paediatrician what you are giving.',
    indiaContext:
      'All three ingredients are available in India (inulin as a powder from health stores or online, EVOO in supermarkets, fish-oil capsules including vegetarian algae-oil versions in pharmacies). Total ingredient cost is generally ₹1,500–4,000 per month. Paying for specialty branded bundles or overseas consultations is optional at best. India-based paediatricians and paediatric gastroenterologists can weigh in — a doctor local to you is more useful than a website.',
    references: [
      'https://www.autismspeaks.org/expert-opinion/what-do-we-know-nemechek-protocol-treating-autism',
    ],
  },

  // ═══ CELLULAR THERAPIES (stem cell / exosome) ════════════════════════
  {
    system: 'CELLULAR',
    focus: 'CORE_SYMPTOMS',
    evidenceLevel: 'EXPERIMENTAL',
    title: 'Stem cell therapy for autism',
    alsoKnownAs: 'Umbilical cord blood stem cells, mesenchymal stem cells, autologous bone marrow',
    summary:
      '⚠️ Not an approved treatment for autism. India\'s ICMR guidelines and CDSCO consider stem cell therapy for autism unproven and only permissible in registered clinical trials. Clinics selling it as a cure operate outside regulatory approval.',
    whatItIs:
      'Infusions of stem cells (from cord blood, bone marrow, or expanded mesenchymal cells) marketed as a treatment that will "reset" autism. Typically sold as multi-lakh-rupee protocols.',
    whatResearchShows:
      'A small number of early-phase trials (Duke, others) show safety but no consistent efficacy signal. There is no published Phase 3 evidence supporting stem cell therapy as a treatment for autism. It is not approved by the US FDA, EMA, or CDSCO for autism.',
    considerations:
      'The ICMR "National Guidelines for Stem Cell Research 2017" explicitly states that stem cell therapy for autism is not an established treatment and must only be undertaken as part of a registered clinical trial. Real risks include infection, immune reactions, tumor formation from non-target cell types, and unknown long-term effects. Before proceeding: (1) ask for the CTRI (Clinical Trials Registry India) registration number; (2) ask which institutional ethics committee approved the protocol; (3) ask why you should pay for a trial. If any of the three answers are missing, walk away.',
    indiaContext:
      'ICMR and CDSCO have repeatedly warned that stem cell therapy for autism is not approved. State Medical Councils have taken action against some clinics. Public advisory: https://www.icmr.gov.in/stemcell-guidelines.pdf. This is one of the most heavily marketed unproven therapies to Indian special-needs families — cost commonly runs ₹5–15 lakh per protocol.',
    references: [
      'https://main.icmr.nic.in/sites/default/files/guidelines/Guidelines_for_stem_cell_research_2017.pdf',
      'https://www.cdsco.gov.in/opencms/opencms/en/Notifications/',
    ],
  },
  {
    system: 'CELLULAR',
    focus: 'CORE_SYMPTOMS',
    evidenceLevel: 'EXPERIMENTAL',
    title: 'Exosome therapy for autism',
    summary:
      '⚠️ Experimental. The US FDA has issued public safety notifications against unapproved exosome products. No autism efficacy evidence exists.',
    whatItIs:
      'Infusions of exosomes (small vesicles secreted by stem cells) marketed as a "next-generation" alternative to stem cell therapy.',
    whatResearchShows:
      'There are no completed autism trials showing efficacy. The FDA has publicly warned about unapproved exosome products, citing serious adverse events including hospitalisation.',
    considerations:
      'All the caveats for stem cell therapy apply, plus the fact that exosome preparations from unaccredited labs have caused documented harm. Not appropriate as an autism intervention outside a registered clinical trial.',
    indiaContext:
      'Not approved for autism in India. See the stem cell entry above for how to evaluate any clinic offering these therapies.',
    references: [
      'https://www.fda.gov/vaccines-blood-biologics/consumers-biologics/public-safety-notification-exosome-products',
    ],
  },
];
