// Shared PECS-style symbol dataset for both the in-shell /aac board and the
// fullscreen /aac/fullscreen board (installed-PWA shortcut target). Keeping
// the data here means the two views stay in sync as new symbols are added.

export type AacSymbol = {
  id: string;
  label: string;
  emoji: string;
  phrase?: string;
};

export type AacCategory = {
  id: string;
  label: string;
  emoji: string;
  tone: 'sage' | 'coral' | 'mist' | 'lavender';
  symbols: AacSymbol[];
};

export const AAC_CATEGORIES: AacCategory[] = [
  {
    id: 'feelings',
    label: 'Feelings',
    emoji: '💛',
    tone: 'coral',
    symbols: [
      { id: 'happy', emoji: '😊', label: 'Happy', phrase: 'I feel happy' },
      { id: 'sad', emoji: '😢', label: 'Sad', phrase: 'I feel sad' },
      { id: 'angry', emoji: '😡', label: 'Angry', phrase: 'I feel angry' },
      { id: 'tired', emoji: '😴', label: 'Tired', phrase: 'I am tired' },
      { id: 'scared', emoji: '😨', label: 'Scared', phrase: 'I feel scared' },
      { id: 'excited', emoji: '🤩', label: 'Excited', phrase: 'I am excited' },
      { id: 'calm', emoji: '😌', label: 'Calm', phrase: 'I feel calm' },
      { id: 'sick', emoji: '🤒', label: 'Sick', phrase: 'I do not feel well' },
    ],
  },
  {
    id: 'needs',
    label: 'I want',
    emoji: '🙏',
    tone: 'sage',
    symbols: [
      { id: 'help', emoji: '🆘', label: 'Help', phrase: 'I need help' },
      { id: 'break', emoji: '⏸️', label: 'Break', phrase: 'I need a break' },
      { id: 'water', emoji: '💧', label: 'Water', phrase: 'I want some water' },
      { id: 'food', emoji: '🍽️', label: 'Food', phrase: 'I am hungry' },
      { id: 'toilet', emoji: '🚽', label: 'Toilet', phrase: 'I need the toilet' },
      { id: 'hug', emoji: '🤗', label: 'Hug', phrase: 'I want a hug' },
      { id: 'quiet', emoji: '🤫', label: 'Quiet', phrase: 'I want it quiet' },
      { id: 'more', emoji: '➕', label: 'More', phrase: 'I want more' },
    ],
  },
  {
    id: 'food',
    label: 'Food',
    emoji: '🍎',
    tone: 'mist',
    symbols: [
      { id: 'rice', emoji: '🍚', label: 'Rice', phrase: 'I would like rice' },
      { id: 'roti', emoji: '🫓', label: 'Roti', phrase: 'I would like roti' },
      { id: 'dal', emoji: '🍲', label: 'Dal', phrase: 'I would like dal' },
      { id: 'fruit', emoji: '🍌', label: 'Fruit', phrase: 'I would like fruit' },
      { id: 'milk', emoji: '🥛', label: 'Milk', phrase: 'I would like milk' },
      { id: 'biscuit', emoji: '🍪', label: 'Biscuit', phrase: 'I would like a biscuit' },
      { id: 'curd', emoji: '🥣', label: 'Curd', phrase: 'I would like curd' },
      { id: 'noodles', emoji: '🍜', label: 'Noodles', phrase: 'I would like noodles' },
    ],
  },
  {
    id: 'places',
    label: 'Places',
    emoji: '🏠',
    tone: 'lavender',
    symbols: [
      { id: 'home', emoji: '🏠', label: 'Home', phrase: 'I want to go home' },
      { id: 'school', emoji: '🏫', label: 'School', phrase: 'I want to go to school' },
      { id: 'park', emoji: '🌳', label: 'Park', phrase: 'I want to go to the park' },
      { id: 'therapy', emoji: '🩺', label: 'Therapy', phrase: 'I have therapy' },
      { id: 'shop', emoji: '🛒', label: 'Shop', phrase: 'I want to go to the shop' },
      { id: 'bed', emoji: '🛏️', label: 'Bed', phrase: 'I want to sleep' },
      { id: 'outside', emoji: '🌞', label: 'Outside', phrase: 'I want to go outside' },
      { id: 'car', emoji: '🚗', label: 'Car', phrase: 'I want the car' },
    ],
  },
  {
    id: 'people',
    label: 'People',
    emoji: '👨‍👩‍👧',
    tone: 'coral',
    symbols: [
      { id: 'amma', emoji: '👩', label: 'Amma', phrase: 'I want Amma' },
      { id: 'appa', emoji: '👨', label: 'Appa', phrase: 'I want Appa' },
      { id: 'didi', emoji: '👧', label: 'Didi', phrase: 'I want Didi' },
      { id: 'bhaiya', emoji: '👦', label: 'Bhaiya', phrase: 'I want Bhaiya' },
      { id: 'teacher', emoji: '🧑‍🏫', label: 'Teacher', phrase: 'I want my teacher' },
      { id: 'friend', emoji: '🧑‍🤝‍🧑', label: 'Friend', phrase: 'I want my friend' },
      { id: 'doctor', emoji: '🧑‍⚕️', label: 'Doctor', phrase: 'I want the doctor' },
      { id: 'me', emoji: '🙋', label: 'Me', phrase: 'me' },
    ],
  },
  {
    id: 'yes-no',
    label: 'Yes / No',
    emoji: '👍',
    tone: 'sage',
    symbols: [
      { id: 'yes', emoji: '✅', label: 'Yes', phrase: 'Yes' },
      { id: 'no', emoji: '❌', label: 'No', phrase: 'No' },
      { id: 'please', emoji: '🙏', label: 'Please', phrase: 'Please' },
      { id: 'thank-you', emoji: '🌸', label: 'Thank you', phrase: 'Thank you' },
      { id: 'i-dont-know', emoji: '🤷', label: "Don't know", phrase: 'I do not know' },
      { id: 'wait', emoji: '⏳', label: 'Wait', phrase: 'Please wait' },
      { id: 'finished', emoji: '🏁', label: 'Finished', phrase: 'I am finished' },
      { id: 'again', emoji: '🔁', label: 'Again', phrase: 'Again please' },
    ],
  },
];
