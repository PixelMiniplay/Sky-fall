export interface Meteor {
  id: string;
  x: number;
  y: number;
  r: number;
  s: number; // speed
  dx: number; // horizontal delta speed
  a: number; // angle
  spin: number;
  big: boolean;
  hp?: number; // small HP for bigger ones
  points: number;
}

export interface Star {
  id: string;
  x: number;
  y: number;
  r: number;
  s: number; // speed
  p: number; // pulse phase / rotation
  value: number;
}

export type PowerUpType = 'shield' | 'magnet' | 'bomb' | 'starShower';

export interface PowerUp {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
  r: number;
  s: number; // speed
  p: number; // pulse angle
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // total duration
  age: number; // elapsed time
  color: string;
  size: number;
  glow?: boolean;
}

export interface Trail {
  x: number;
  y: number;
  life: number;
}

export interface BackgroundStar {
  x: number;
  y: number;
  r: number;
  s: number; // speed multiplier
  color: string;
}

export interface StarDust {
  x: number;
  y: number;
  vy: number;
  size: number;
  alpha: number;
}

export interface HighScore {
  name: string;
  score: number;
  level: number;
  date: string;
}

export interface UpgradeItem {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  cost: number[];
  icon: string;
}

export interface ShipSkin {
  id: string;
  name: string;
  color: string;
  glowColor: string;
  thrusterColor: string;
  cost: number;
  unlocked: boolean;
  shape: 'classic' | 'phantom' | 'vanguard' | 'interceptor';
}
