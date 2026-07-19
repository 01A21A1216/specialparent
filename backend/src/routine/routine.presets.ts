import { RoutineCategory } from '@prisma/client';

// Starter templates that let parents skip the blank-slate problem. Each is
// tuned for a specific rhythm — most families end up on School Day for
// term-time and Weekend for Saturday/Sunday, with Therapy Day layered on
// top when relevant. Toddler Basics is for the < 4 age group before
// school-day structure applies.

export type RoutinePresetKey =
  | 'schoolDay'
  | 'weekend'
  | 'therapyDay'
  | 'toddlerBasics';

interface PresetStep {
  title: string;
  description?: string;
  icon: string;
  category: RoutineCategory;
  timeOfDay: string; // HH:MM
  durationMins?: number;
  daysOfWeek?: number[];
}

interface Preset {
  name: string;
  description: string;
  steps: PresetStep[];
}

export const ROUTINE_PRESETS: Record<RoutinePresetKey, Preset> = {
  schoolDay: {
    name: 'Typical school day',
    description: 'A full weekday from wake-up to sleep — school, homework, therapy fit in.',
    steps: [
      { title: 'Wake up', icon: '🌅', category: 'SLEEP', timeOfDay: '06:30' },
      { title: 'Toilet', icon: '🚽', category: 'SELF_CARE', timeOfDay: '06:35' },
      { title: 'Brush teeth', icon: '🪥', category: 'SELF_CARE', timeOfDay: '06:45', durationMins: 3 },
      { title: 'Bath', icon: '🛁', category: 'SELF_CARE', timeOfDay: '06:50', durationMins: 15 },
      { title: 'Get dressed', icon: '👕', category: 'SELF_CARE', timeOfDay: '07:10' },
      { title: 'Breakfast', icon: '🍳', category: 'MEAL', timeOfDay: '07:20', durationMins: 20 },
      { title: 'Leave for school', icon: '🎒', category: 'SCHOOL', timeOfDay: '07:50' },
      { title: 'School', icon: '🏫', category: 'SCHOOL', timeOfDay: '08:30', durationMins: 300 },
      { title: 'Lunch at school', icon: '🍱', category: 'MEAL', timeOfDay: '12:30', durationMins: 30 },
      { title: 'Home from school', icon: '🏡', category: 'SCHOOL', timeOfDay: '14:30' },
      { title: 'Snack + rest', icon: '🍎', category: 'MEAL', timeOfDay: '14:45', durationMins: 20 },
      { title: 'Play time', icon: '🧩', category: 'PLAY', timeOfDay: '15:15', durationMins: 60 },
      { title: 'Homework', icon: '📚', category: 'LEARNING', timeOfDay: '16:15', durationMins: 30 },
      { title: 'Outdoor play', icon: '🌳', category: 'PLAY', timeOfDay: '16:45', durationMins: 45 },
      { title: 'Dinner', icon: '🍛', category: 'MEAL', timeOfDay: '19:00', durationMins: 30 },
      { title: 'Quiet play', icon: '🧸', category: 'PLAY', timeOfDay: '19:30' },
      { title: 'Bath', icon: '🛁', category: 'SELF_CARE', timeOfDay: '20:00', durationMins: 15 },
      { title: 'Story time', icon: '📖', category: 'LEARNING', timeOfDay: '20:30', durationMins: 15 },
      { title: 'Brush teeth', icon: '🪥', category: 'SELF_CARE', timeOfDay: '20:45', durationMins: 3 },
      { title: 'Sleep', icon: '😴', category: 'SLEEP', timeOfDay: '21:00' },
    ],
  },
  weekend: {
    name: 'Weekend rhythm',
    description: 'Slower start, more play + family time, still with predictable meals and sleep.',
    steps: [
      { title: 'Wake up', icon: '🌅', category: 'SLEEP', timeOfDay: '07:30' },
      { title: 'Toilet', icon: '🚽', category: 'SELF_CARE', timeOfDay: '07:35' },
      { title: 'Brush teeth', icon: '🪥', category: 'SELF_CARE', timeOfDay: '07:45' },
      { title: 'Breakfast', icon: '🥞', category: 'MEAL', timeOfDay: '08:15', durationMins: 30 },
      { title: 'Free play', icon: '🎨', category: 'PLAY', timeOfDay: '09:00', durationMins: 90 },
      { title: 'Outdoor time', icon: '🌳', category: 'PLAY', timeOfDay: '10:30', durationMins: 60 },
      { title: 'Bath', icon: '🛁', category: 'SELF_CARE', timeOfDay: '11:45', durationMins: 15 },
      { title: 'Lunch', icon: '🍛', category: 'MEAL', timeOfDay: '12:30', durationMins: 30 },
      { title: 'Quiet time / nap', icon: '💤', category: 'SLEEP', timeOfDay: '13:15', durationMins: 60 },
      { title: 'Snack', icon: '🍎', category: 'MEAL', timeOfDay: '15:00' },
      { title: 'Family activity', icon: '👨‍👩‍👧', category: 'PLAY', timeOfDay: '15:30', durationMins: 90 },
      { title: 'Dinner', icon: '🍽️', category: 'MEAL', timeOfDay: '19:00', durationMins: 30 },
      { title: 'Bath', icon: '🛁', category: 'SELF_CARE', timeOfDay: '20:00' },
      { title: 'Story time', icon: '📖', category: 'LEARNING', timeOfDay: '20:30' },
      { title: 'Sleep', icon: '😴', category: 'SLEEP', timeOfDay: '21:00' },
    ],
  },
  therapyDay: {
    name: 'Therapy day',
    description: 'A day with speech + OT sessions layered onto the usual rhythm.',
    steps: [
      { title: 'Wake up', icon: '🌅', category: 'SLEEP', timeOfDay: '07:00' },
      { title: 'Toilet + brush teeth', icon: '🪥', category: 'SELF_CARE', timeOfDay: '07:10' },
      { title: 'Breakfast', icon: '🍳', category: 'MEAL', timeOfDay: '07:45', durationMins: 30 },
      { title: 'Get ready for therapy', icon: '🎒', category: 'THERAPY', timeOfDay: '08:30' },
      { title: 'Speech therapy', icon: '🗣️', category: 'THERAPY', timeOfDay: '09:30', durationMins: 45 },
      { title: 'Snack + calm-down', icon: '🍎', category: 'MEAL', timeOfDay: '10:30' },
      { title: 'Play break', icon: '🧩', category: 'PLAY', timeOfDay: '11:00', durationMins: 60 },
      { title: 'Lunch', icon: '🍛', category: 'MEAL', timeOfDay: '12:30', durationMins: 30 },
      { title: 'Quiet time', icon: '💤', category: 'SLEEP', timeOfDay: '13:15', durationMins: 45 },
      { title: 'OT session', icon: '✋', category: 'THERAPY', timeOfDay: '15:00', durationMins: 45 },
      { title: 'Outdoor play', icon: '🌳', category: 'PLAY', timeOfDay: '16:15', durationMins: 60 },
      { title: 'Home practice', icon: '📚', category: 'LEARNING', timeOfDay: '17:30', durationMins: 20 },
      { title: 'Dinner', icon: '🍽️', category: 'MEAL', timeOfDay: '19:00', durationMins: 30 },
      { title: 'Bath + story', icon: '🛁', category: 'SELF_CARE', timeOfDay: '20:00' },
      { title: 'Sleep', icon: '😴', category: 'SLEEP', timeOfDay: '20:45' },
    ],
  },
  toddlerBasics: {
    name: 'Toddler basics',
    description: 'For under-4s: short steps, more naps, no school block yet.',
    steps: [
      { title: 'Wake up', icon: '🌅', category: 'SLEEP', timeOfDay: '07:00' },
      { title: 'Nappy / toilet', icon: '👶', category: 'SELF_CARE', timeOfDay: '07:05' },
      { title: 'Breakfast', icon: '🥣', category: 'MEAL', timeOfDay: '07:30', durationMins: 30 },
      { title: 'Play', icon: '🧸', category: 'PLAY', timeOfDay: '08:15', durationMins: 60 },
      { title: 'Snack', icon: '🍌', category: 'MEAL', timeOfDay: '09:30' },
      { title: 'Outdoor time', icon: '🌳', category: 'PLAY', timeOfDay: '10:00', durationMins: 45 },
      { title: 'Morning nap', icon: '💤', category: 'SLEEP', timeOfDay: '11:00', durationMins: 60 },
      { title: 'Lunch', icon: '🍛', category: 'MEAL', timeOfDay: '12:30', durationMins: 30 },
      { title: 'Quiet play', icon: '📖', category: 'PLAY', timeOfDay: '13:15', durationMins: 30 },
      { title: 'Afternoon nap', icon: '😴', category: 'SLEEP', timeOfDay: '14:00', durationMins: 90 },
      { title: 'Snack', icon: '🍎', category: 'MEAL', timeOfDay: '16:00' },
      { title: 'Outdoor play', icon: '🌞', category: 'PLAY', timeOfDay: '16:30', durationMins: 45 },
      { title: 'Dinner', icon: '🍽️', category: 'MEAL', timeOfDay: '18:00', durationMins: 30 },
      { title: 'Bath', icon: '🛁', category: 'SELF_CARE', timeOfDay: '18:45' },
      { title: 'Story time', icon: '📖', category: 'LEARNING', timeOfDay: '19:15' },
      { title: 'Sleep', icon: '😴', category: 'SLEEP', timeOfDay: '19:45' },
    ],
  },
};
