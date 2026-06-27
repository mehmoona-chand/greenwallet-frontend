const LEVEL_LABELS = [
  'Eco Beginner',
  'Green Explorer',
  'Carbon Cutter',
  'Eco Warrior',
  'Climate Guardian',
  'Eco Champion',
  'Eco Crusader',
  'Planet Protector',
];

// Demo champions shown until real users outrank them
const SEED_LEADERBOARD = [
  { name: 'Ahmed K.', location: 'Karachi, Pakistan',   level: 7, xp: 2100, avgCO2: 1.65, entries: 42 },
  { name: 'Sara M.',  location: 'Lahore, Pakistan',   level: 6, xp: 1580, avgCO2: 1.92, entries: 31 },
  { name: 'Bilal R.', location: 'Islamabad, Pakistan', level: 5, xp: 920,  avgCO2: 2.15, entries: 18 },
  { name: 'Nida F.',  location: 'Multan, Pakistan',    level: 4, xp: 620,  avgCO2: 2.38, entries: 12 },
  { name: 'Usman T.', location: 'Faisalabad, Pakistan', level: 3, xp: 380, avgCO2: 2.55, entries: 8  },
];

const getLevelLabel = (level) =>
  LEVEL_LABELS[Math.min(Math.max(level || 1, 1), LEVEL_LABELS.length) - 1];

const getInitials = (name) => {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name || '??').slice(0, 2).toUpperCase();
};

const sortLeaderboard = (a, b) => {
  if (b.xp !== a.xp) return b.xp - a.xp;
  if (b.level !== a.level) return b.level - a.level;
  return (a.avgCO2 ?? 999) - (b.avgCO2 ?? 999);
};

const qualifiesForBoard = (user, entryCount) =>
  (user.level || 1) >= 2 || (user.xp || 0) >= 50 || entryCount >= 1;

module.exports = {
  LEVEL_LABELS,
  SEED_LEADERBOARD,
  getLevelLabel,
  getInitials,
  sortLeaderboard,
  qualifiesForBoard,
};
