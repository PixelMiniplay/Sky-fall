import { HighScore, UpgradeItem, ShipSkin } from '../types';

export const INITIAL_UPGRADES: UpgradeItem[] = [
  {
    id: 'lives',
    name: 'Reinforced Hull',
    description: 'Increase starting lives up to 5.',
    level: 0,
    maxLevel: 2,
    cost: [120, 300],
    icon: 'ShieldAlert',
  },
  {
    id: 'shield_duration',
    name: 'Shield Capacitor',
    description: 'Extend shield pick-up active duration.',
    level: 0,
    maxLevel: 4,
    cost: [50, 100, 200, 400],
    icon: 'ShieldAlert',
  },
  {
    id: 'magnet_range',
    name: 'Quantum Magnet',
    description: 'Attract stars from much further away.',
    level: 0,
    maxLevel: 4,
    cost: [60, 120, 240, 480],
    icon: 'Radio',
  },
  {
    id: 'star_value',
    name: 'Star Compressor',
    description: 'Stars yield more points and double value.',
    level: 0,
    maxLevel: 3,
    cost: [80, 180, 350],
    icon: 'Sparkles',
  },
  {
    id: 'thruster_speed',
    name: 'Tachyonic Thrusters',
    description: 'Boost engine speed and steering hyper-acceleration.',
    level: 0,
    maxLevel: 3,
    cost: [100, 220, 450],
    icon: 'Zap',
  }
];

export const SHIPS_SKINS: ShipSkin[] = [
  {
    id: 'classic',
    name: 'Vanguard Alpha',
    color: '#44d7ff',
    glowColor: 'rgba(68, 215, 255, 0.45)',
    thrusterColor: '#ff4d00',
    cost: 0,
    unlocked: true,
    shape: 'classic'
  },
  {
    id: 'interceptor',
    name: 'Solar Ranger',
    color: '#a0ff9f',
    glowColor: 'rgba(160, 255, 159, 0.45)',
    thrusterColor: '#e0f316',
    cost: 80,
    unlocked: false,
    shape: 'interceptor'
  },
  {
    id: 'phantom',
    name: 'Nebula Phantom',
    color: '#c77cff',
    glowColor: 'rgba(199, 124, 255, 0.45)',
    thrusterColor: '#ff2ebd',
    cost: 200,
    unlocked: false,
    shape: 'phantom'
  },
  {
    id: 'vanguard',
    name: 'Void Reaper',
    color: '#ef476f',
    glowColor: 'rgba(239, 71, 111, 0.45)',
    thrusterColor: '#ffd166',
    cost: 500,
    unlocked: false,
    shape: 'vanguard'
  },
  {
    id: 'super_nova',
    name: 'Supernova Zenith',
    color: '#ffd700',
    glowColor: 'rgba(255, 215, 0, 0.55)',
    thrusterColor: '#c084fc',
    cost: 380,
    unlocked: false,
    shape: 'phantom'
  }
];

export const getStoredStars = (): number => {
  try {
    return parseInt(localStorage.getItem('starfall-stars-currency') || '0', 10);
  } catch {
    return 0;
  }
};

export const saveStoredStars = (stars: number) => {
  try {
    localStorage.setItem('starfall-stars-currency', String(stars));
  } catch {
    // safe fallback
  }
};

export const getStoredUpgrades = (): UpgradeItem[] => {
  try {
    const data = localStorage.getItem('starfall-upgrades-v5');
    if (!data) return INITIAL_UPGRADES;
    const parsed = JSON.parse(data) as UpgradeItem[];
    // Merge schema definitions with user values in case upgrades change
    return INITIAL_UPGRADES.map(item => {
      const match = parsed.find(p => p.id === item.id);
      return match ? { ...item, level: match.level } : item;
    });
  } catch {
    return INITIAL_UPGRADES;
  }
};

export const saveStoredUpgrades = (upgrades: UpgradeItem[]) => {
  try {
    localStorage.setItem('starfall-upgrades-v5', JSON.stringify(upgrades));
  } catch {
    // safe fallback
  }
};

export const getStoredSkins = (): ShipSkin[] => {
  try {
    const data = localStorage.getItem('starfall-skins-v5');
    if (!data) return SHIPS_SKINS;
    const parsed = JSON.parse(data) as ShipSkin[];
    return SHIPS_SKINS.map(item => {
      const match = parsed.find(p => p.id === item.id);
      return match ? { ...item, unlocked: match.unlocked } : item;
    });
  } catch {
    return SHIPS_SKINS;
  }
};

export const saveStoredSkins = (skins: ShipSkin[]) => {
  try {
    localStorage.setItem('starfall-skins-v5', JSON.stringify(skins));
  } catch {
    // safe fallback
  }
};

export const getActiveSkinId = (): string => {
  try {
    return localStorage.getItem('starfall-active-skin-v5') || 'classic';
  } catch {
    return 'classic';
  }
};

export const setActiveSkinId = (id: string) => {
  try {
    localStorage.setItem('starfall-active-skin-v5', id);
  } catch {
    // safe fallback
  }
};

export const getHighScores = (): HighScore[] => {
  try {
    const data = localStorage.getItem('starfall-highscores-v5');
    if (!data) {
      return [
        { name: 'COSMIC_RUNNER', score: 25000, level: 8, date: '2026-05-20' },
        { name: 'METEOR_DODGER', score: 12000, level: 5, date: '2026-05-22' },
        { name: 'STAR_FARER', score: 5000, level: 2, date: '2026-05-24' },
      ];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const saveHighScore = (score: number, level: number, name: string): HighScore[] => {
  try {
    const scoreList = getHighScores();
    const newRecord: HighScore = {
      name: name.toUpperCase().slice(0, 14) || 'SOLO_PILOT',
      score: Math.floor(score),
      level,
      date: new Date().toISOString().split('T')[0],
    };
    scoreList.push(newRecord);
    // Sort descending by score, limit to top 8
    scoreList.sort((a, b) => b.score - a.score);
    const topScores = scoreList.slice(0, 8);
    localStorage.setItem('starfall-highscores-v5', JSON.stringify(topScores));
    return topScores;
  } catch {
    return [];
  }
};
