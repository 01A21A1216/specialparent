// Shared mapping between the ISO-ish short code stored in Postgres
// (Language enum on the User + Therapist + Resource models, plus the
// String[] language arrays on TherapistProfile) and the human-readable
// name shown in the UI. Add new codes here and every surface picks
// them up.

export const LANGUAGE_CODES = [
  'EN', 'HI', 'TA', 'TE', 'KN', 'ML', 'MR', 'BN', 'GU',
] as const;

export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export const LANGUAGE_LABEL: Record<LanguageCode, string> = {
  EN: 'English',
  HI: 'Hindi',
  TA: 'Tamil',
  TE: 'Telugu',
  KN: 'Kannada',
  ML: 'Malayalam',
  MR: 'Marathi',
  BN: 'Bengali',
  GU: 'Gujarati',
};

/** Look up a display name. Falls back to the raw code if it isn't in the map — safer than crashing on an unknown language stored in older data. */
export function languageLabel(code: string): string {
  return (LANGUAGE_LABEL as Record<string, string>)[code] ?? code;
}
