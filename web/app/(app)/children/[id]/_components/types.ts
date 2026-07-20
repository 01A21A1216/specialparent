// Shared types + constants for the child-detail page and its subcomponents.

export interface ChildDetail {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  diagnoses: string[];
  allergies: string[];
  medications: string[];
  sensoryTriggers: string[];
  calmingStrategies: string[];
  hobbies: string[];
  communicationType?: string | null;
  schoolName?: string | null;
  schoolId?: string | null;
  school?: {
    id: string;
    name: string;
    board?: string | null;
    city?: string | null;
    state?: string | null;
    isInclusive?: boolean;
  } | null;
  emergencyContact?: string | null;
  notes?: string | null;
  caregivers: Array<{
    id: string;
    user: { id: string; fullName: string; email: string; role: string };
    relationship: string;
    isPrimary: boolean;
  }>;
  milestones: Array<{
    id: string;
    domain: string;
    title: string;
    description?: string | null;
    status: string;
    achievedAt?: string | null;
  }>;
  goals: Array<{
    id: string;
    title: string;
    status: string;
    progress: number;
    targetDate?: string | null;
  }>;
  therapySessions: Array<{
    id: string;
    type: string;
    scheduledAt: string;
    durationMins: number;
    status: string;
    notes?: string | null;
    aiSummary?: string | null;
    therapist?: { id: string; fullName: string } | null;
  }>;
  moodEntries: Array<{
    id: string;
    mood: string;
    loggedAt: string;
    note?: string | null;
    voiceNoteId?: string | null;
  }>;
  diagnosticReports: Array<{
    id: string;
    title: string;
    description?: string | null;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedByName?: string | null;
    createdAt: string;
  }>;
}

export const DOMAIN_LABEL: Record<string, string> = {
  COMMUNICATION: 'Communication',
  SOCIAL: 'Social',
  EMOTIONAL: 'Emotional',
  MOTOR: 'Motor',
  COGNITIVE: 'Cognitive',
  DAILY_LIVING: 'Daily living',
  SENSORY: 'Sensory',
};

export const STATUS_TONE: Record<string, string> = {
  NOT_STARTED: 'bg-sage-100 text-sage-600',
  IN_PROGRESS: 'bg-mist-100 text-mist-700',
  ACHIEVED: 'bg-sage-200 text-sage-800',
  REGRESSED: 'bg-coral-100 text-coral-700',
};

export type InviteRole =
  | 'THERAPIST'
  | 'DOCTOR'
  | 'SPECIAL_EDUCATOR'
  | 'TEACHER'
  | 'SCHOOL_ADMIN'
  | 'PARENT';

export interface Invite {
  id: string;
  token: string;
  role: InviteRole;
  relationship: string;
  email?: string | null;
  expiresAt: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  acceptedBy?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
  createdAt: string;
}

export const INVITE_ROLE_OPTIONS: Array<{ value: InviteRole; label: string }> = [
  { value: 'THERAPIST', label: 'Therapist' },
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'SPECIAL_EDUCATOR', label: 'Special educator' },
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'SCHOOL_ADMIN', label: 'School admin' },
  { value: 'PARENT', label: 'Co-parent / guardian' },
];
