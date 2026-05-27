import React, { useEffect, useRef, useState } from 'react';
import { audio } from '../utils/audio';
import { 
  getStoredUpgrades, 
  getStoredSkins, 
  getActiveSkinId, 
  getStoredStars, 
  saveStoredStars, 
  saveHighScore 
} from '../utils/gameData';
import { Meteor, Star, PowerUp, Particle, Trail, BackgroundStar } from '../types';

interface GameCanvasProps {
  onGameOver: (finalScore: number, level: number, starsEarned: number) => void;
  onPointsEarned: (score: number, level: number, comboMultiplier: number) => void;
  onPauseToggle: (isPaused: boolean) => void;
  isPaused: boolean;
  isPlaying: boolean;
  activeControlMode: 'arrows' | 'drag';
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  onGameOver,
  onPointsEarned,
  onPauseToggle,
  isPaused,
  isPlaying,
  activeControlMode
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Read current upgrades and active skin properties
  const upgrades = getStoredUpgrades();
  const skins = getStoredSkins();
  const activeSkinId = getActiveSkinId();
  const activeSkin = skins.find(s => s.id === activeSkinId) || skins[0];

  // Upgrades benefits calculations
  const extraLives = upgrades.find(u => u.id === 'lives')?.level || 0; // max lives upgrade
  const shieldDurUpgrade = upgrades.find(u => u.id === 'shield_duration')?.level || 0;
  const magnetRangeUpgrade = upgrades.find(u => u.id === 'magnet_range')?.level || 0;
  const starValUpgrade = upgrades.find(u => u.id === 'star_value')?.level || 0;
  const speedUpgrade = upgrades.find(u => u.id === 'thruster_speed')?.level || 0;

  // Real-time HUD states mapped upwards to React
  const [hudLives, setHudLives] = useState(3 + extraLives);
  const [hudScore, setHudScore] = useState(0);
  const [hudLevel, setHudLevel] = useState(1);
  const [hudMultiplier, setHudMultiplier] = useState(1.0);
  const [hudStarsEarned, setHudStarsEarned] = useState(0);
  const [hudActiveShield, setHudActiveShield] = useState(0);
  const [hudActiveMagnet, setHudActiveMagnet] = useState(0);

  // Action feed notifications
  const [news, setNews] = useState<{ id: string; text: string; color: string }[]>([]);

  const addNotification = (text: string, color: string = 'text-cyan-400') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNews(prev => [...prev, { id, text, color }].slice(-3));
    setTimeout(() => {
      setNews(prev => prev.filter(n => n.id !== id));
    }, 2800);
  };

  // Keep references to real-time states for game loop
  const stateRef = useRef({
    w: 0,
    h: 0,
    dpr: 1,
    running: false,
    paused: false,
    over: false,
    last: 0,
    score: 0,
    lives: 3 + extraLives,
    level: 1,
    starsCollectedThisRun: 0,
    
    // Performance optimization: prevent React redraw on every RAF frame
    lastSetLives: 3 + extraLives,
    lastSetScore: -1,
    lastSetLevel: 1,
    lastSetMultiplier: 1.0,
    lastSetStars: -1,

    // Spawners timers (seconds)
    spawn: 1.3,
    starSpawn: 1.1,
    powerupSpawn: 10.0,
    
    meteors: [] as Meteor[],
    stars: [] as Star[],
    powerups: [] as PowerUp[],
    bg: [] as BackgroundStar[],
    particles: [] as Particle[],
    trails: [] as Trail[],
    
    keys: new Set<string>(),
    touch: { left: false, right: false, lastX: 0, isDragging: false },
    
    targetX: 0, // lerp target for drag interaction

    ship: { 
      x: 0, 
      y: 0, 
      vx: 0, 
      r: 16, 
      inv: 0, // invincibility timer
      shield: 0, // shield timer
      magnet: 0  // magnet timer
    },
    
    multiplier: 1.0,
    combo: 0,
    lastStarTime: 0,

    // Screen Shake effect
    shakeTime: 0,
    shakeIntensity: 0,
  });

  // Sound triggers
  const triggerCollectSound = (combo: number) => {
    audio.playCollectStar(combo);
  };

  useEffect(() => {
    stateRef.current.paused = isPaused;
  }, [isPaused]);

  useEffect(() => {
    // Sync starting lives if config changes
    stateRef.current.lives = 3 + extraLives;
    setHudLives(3 + extraLives);
  }, [extraLives]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      
      stateRef.current.dpr = dpr;
      stateRef.current.w = rect.width || window.innerWidth;
      stateRef.current.h = rect.height || window.innerHeight;
      
      canvas.width = stateRef.current.w * dpr;
      canvas.height = stateRef.current.h * dpr;
      
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      
      // Keep ship on stable baseline relative to current height
      stateRef.current.ship.y = stateRef.current.h - 90;
      if (stateRef.current.ship.x === 0) {
        stateRef.current.ship.x = stateRef.current.w / 2;
        stateRef.current.targetX = stateRef.current.w / 2;
      }
    };

    // Setup initial stars background with parallax speeds
    const initStars = () => {
      const numStars = 150;
      const palette = ['#ffffff', '#a5f3fc', '#cbd5e1', '#fed7aa', '#f472b6'];
      stateRef.current.bg = Array.from({ length: numStars }, () => ({
        x: Math.random() * stateRef.current.w,
        y: Math.random() * stateRef.current.h,
        r: Math.random() * (2.4 - 0.4) + 0.4,
        s: Math.random() * (60 - 15) + 15,
        color: palette[Math.floor(Math.random() * palette.length)]
      }));
    };

    // Key event binders
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || isPaused) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const targets = ['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'a', 'd', 'w'];
      if (targets.includes(e.key) || targets.includes(k)) {
        e.preventDefault();
        stateRef.current.keys.add(k);
      }
      if (e.key === 'p' || e.key === 'P') {
        onPauseToggle(!isPaused);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      stateRef.current.keys.delete(k);
      stateRef.current.keys.delete(e.key);
    };

    // Listeners assignment
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);

    // Run layout calculations
    handleResize();
    initStars();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying, isPaused, onPauseToggle]);

  // Touch and pointer interaction listeners
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPlaying || isPaused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    stateRef.current.touch.isDragging = true;
    stateRef.current.touch.lastX = clickX;

    if (activeControlMode === 'arrows') {
      // arrow mode - clicking directly
      if (clickX < stateRef.current.w / 2) {
        stateRef.current.touch.left = true;
      } else {
        stateRef.current.touch.right = true;
      }
    } else {
      // drag-steer mode: set targetX for linear interpolation
      stateRef.current.targetX = Math.max(30, Math.min(stateRef.current.w - 30, clickX));
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPlaying || isPaused || !stateRef.current.touch.isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;

    if (activeControlMode === 'drag') {
      stateRef.current.targetX = Math.max(30, Math.min(stateRef.current.w - 30, currentX));
    } else {
      // update steering side based on pointer position relative to center
      if (currentX < stateRef.current.w / 2) {
        stateRef.current.touch.left = true;
        stateRef.current.touch.right = false;
      } else {
        stateRef.current.touch.right = true;
        stateRef.current.touch.left = false;
      }
    }
    stateRef.current.touch.lastX = currentX;
  };

  const handlePointerUp = () => {
    stateRef.current.touch.isDragging = false;
    stateRef.current.touch.left = false;
    stateRef.current.touch.right = false;
  };

  // Start the Game Cycle when isPlaying becomes true
  useEffect(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = stateRef.current;
    state.running = true;
    state.paused = false;
    state.over = false;
    state.score = 0;
    state.lives = 3 + extraLives;
    state.level = 1;
    state.starsCollectedThisRun = 0;
    state.spawn = 1.0;
    state.starSpawn = 0.5;
    state.powerupSpawn = 8.0;
    
    // Performance track resets
    state.lastSetLives = 3 + extraLives;
    state.lastSetScore = -1;
    state.lastSetLevel = 1;
    state.lastSetMultiplier = 1.0;
    state.lastSetStars = -1;
    
    state.meteors = [];
    state.stars = [];
    state.powerups = [];
    state.particles = [];
    state.trails = [];
    
    state.ship.x = state.w / 2;
    state.targetX = state.w / 2;
    state.ship.vx = 0;
    state.ship.inv = 1.8; // Brief shield on cold start
    state.ship.shield = 0;
    state.ship.magnet = 0;
    state.multiplier = 1.0;
    state.combo = 0;
    state.lastStarTime = 0;
    state.last = performance.now();

    // Trigger music
    audio.startBGM();

    setHudLives(state.lives);
    setHudScore(0);
    setHudLevel(1);
    setHudMultiplier(1.0);
    setHudStarsEarned(0);
    setHudActiveShield(0);
    setHudActiveMagnet(0);

    addNotification('🚀 Starship Engines Engaged!', 'text-emerald-400');
    addNotification('🛡️ Dynamic Launch Deflectors online', 'text-cyan-400');

    let rAFId: number;

    const boomParticles = (x: number, y: number, color: string, count: number, speedMult = 1) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 160 + 40) * speedMult;
        state.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 60, // Slight upward trajectory
          life: Math.random() * 0.7 + 0.45,
          age: 0,
          color,
          size: Math.random() * 3.4 + 1.2
        });
      }
    };

    const bigShockwave = (x: number, y: number, color: string) => {
      // Glow shock ring
      for (let i = 0; i < 28; i++) {
        const angle = (i / 28) * Math.PI * 2;
        const speed = 260;
        state.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.65,
          age: 0,
          color,
          size: 5.0,
          glow: true
        });
      }
    };

    const spawnMeteor = () => {
      const radius = Math.random() * (40 - 14) + 14;
      const isBig = radius > 28;
      state.meteors.push({
        id: Math.random().toString(36).substring(2, 9),
        x: Math.random() * (state.w - radius * 2) + radius,
        y: -radius - 10,
        r: radius,
        s: (Math.random() * (220 - 110) + 110) + state.level * 16,
        dx: Math.random() * 80 - 40,
        a: Math.random() * Math.PI * 2,
        spin: Math.random() * 3.5 - 1.75,
        big: isBig,
        hp: isBig ? 3 : 1,
        points: isBig ? 150 : 50
      });
    };

    const spawnStar = () => {
      state.stars.push({
        id: Math.random().toString(36).substring(2, 9),
        x: Math.random() * (state.w - 40) + 20,
        y: -30,
        r: 12,
        s: (Math.random() * (130 - 80) + 80) + state.level * 6,
        p: Math.random() * 10,
        value: 10 * (1 + starValUpgrade * 0.5) // upgrade impact on base star points
      });
    };

    const spawnPowerup = () => {
      const types: ('shield' | 'magnet' | 'bomb' | 'starShower')[] = ['shield'];
      if (state.level >= 2) types.push('magnet');
      if (state.level >= 3) types.push('bomb');
      if (state.level >= 4) types.push('starShower');

      const chosen = types[Math.floor(Math.random() * types.length)];
      state.powerups.push({
        id: Math.random().toString(36).substring(2, 9),
        type: chosen,
        x: Math.random() * (state.w - 60) + 30,
        y: -30,
        r: 15,
        s: Math.random() * 40 + 80,
        p: 0
      });
    };

    // Core Game Update
    const updateGame = (dt: number) => {
      const left = state.keys.has('arrowleft') || state.keys.has('a') || state.touch.left;
      const right = state.keys.has('arrowright') || state.keys.has('d') || state.touch.right;
      const boost = state.keys.has('arrowup') || state.keys.has(' ') || state.keys.has('w');

      // Tachyonic Thruster upgrade affects acceleration & limitSpeed
      const speedMult = 1 + speedUpgrade * 0.15;
      const limitMult = 1 + speedUpgrade * 0.12;

      const acceleration = (boost ? 1350 : 920) * speedMult;
      const dragFactor = 0.08;
      const limitSpeed = (boost ? 580 : 390) * limitMult;

      if (activeControlMode === 'drag') {
        const targetX = state.targetX !== undefined ? state.targetX : state.w / 2;
        // Frame-rate independent linear interpolation
        const lerpSpeed = 16.0;
        state.ship.x += (targetX - state.ship.x) * (1 - Math.exp(-lerpSpeed * dt));
        // Compute virtual velocity for ship banking roll angle
        state.ship.vx = (targetX - state.ship.x) * lerpSpeed;
      } else {
        // Arrow zone steering physics
        if (left) state.ship.vx -= acceleration * dt;
        if (right) state.ship.vx += acceleration * dt;
        state.ship.vx *= Math.pow(dragFactor, dt);
        state.ship.vx = Math.max(-limitSpeed, Math.min(limitSpeed, state.ship.vx));

        // Coordinate shift
        state.ship.x += state.ship.vx * dt;
      }
      state.ship.x = Math.max(30, Math.min(state.w - 30, state.ship.x));

      // Timers decrement
      if (state.ship.inv > 0) state.ship.inv = Math.max(0, state.ship.inv - dt);
      if (state.ship.shield > 0) state.ship.shield = Math.max(0, state.ship.shield - dt);
      if (state.ship.magnet > 0) state.ship.magnet = Math.max(0, state.ship.magnet - dt);
      if (state.shakeTime > 0) state.shakeTime = Math.max(0, state.shakeTime - dt);

      // Render notifications countdowns
      setHudActiveShield(Math.ceil(state.ship.shield));
      setHudActiveMagnet(Math.ceil(state.ship.magnet));

      // Jets particles
      if (Math.random() < 0.72) {
        state.trails.push({
          x: state.ship.x + (Math.random() * 12 - 6),
          y: state.ship.y + 20,
          life: 0.5
        });
      }

      // Special legendary trail effects for Supernova Zenith skin
      if (activeSkin.id === 'super_nova' && Math.random() < 0.45) {
        state.particles.push({
          x: state.ship.x + (Math.random() * 8 - 4),
          y: state.ship.y + 22,
          vx: Math.random() * 50 - 25,
          vy: Math.random() * 80 + 90,
          life: Math.random() * 0.45 + 0.15,
          age: 0,
          color: Math.random() > 0.4 ? '#ffd700' : '#c084fc',
          size: Math.random() * 2.2 + 0.8,
          glow: true
        });
      }

      // High pace background dust speed based on Boost status
      const stellarMultiplier = boost ? 3.0 : 1.2;
      for (const b of state.bg) {
        b.y += b.s * dt * (1 + state.level * 0.015) * stellarMultiplier;
        if (b.y > state.h) {
          b.y = -10;
          b.x = Math.random() * state.w;
        }
      }

      // Core scoring: flying onwards grants soft points
      state.score += dt * (12 + state.level * 3) * state.multiplier;
      const currentCalculatedLevel = 1 + Math.floor(state.score / 600);
      if (currentCalculatedLevel > state.level) {
        state.level = currentCalculatedLevel;
        addNotification(`⭐ LEVEL UP: sector ${state.level} reached!`, 'text-amber-300 font-bold text-center animate-bounce');
        audio.playLevelUp();
      }

      // Combo decaying multiplier values
      const now = performance.now();
      if (state.combo > 0 && now - state.lastStarTime > 1600) {
        // Combo broken
        state.combo = 0;
        state.multiplier = 1.0;
        addNotification('⚡ Combo streak reset', 'text-slate-400');
      }

      // Spawning schedules
      state.spawn -= dt;
      state.starSpawn -= dt;
      state.powerupSpawn -= dt;

      if (state.spawn <= 0) {
        spawnMeteor();
        // Dynamic intense rates on higher levels
        if (state.level >= 5 && Math.random() < 0.42) {
          setTimeout(spawnMeteor, 180);
        }
        state.spawn = Math.max(0.38, 1.35 - state.level * 0.04);
      }

      if (state.starSpawn <= 0) {
        spawnStar();
        if (Math.random() < 0.3) {
          setTimeout(spawnStar, 240);
        }
        state.starSpawn = Math.random() * (2.1 - 0.9) + 0.9;
      }

      if (state.powerupSpawn <= 0) {
        spawnPowerup();
        state.powerupSpawn = Math.random() * (22.0 - 12.0) + 12.0;
      }

      // Interaction: Meteors Move & Collision
      for (let i = state.meteors.length - 1; i >= 0; i--) {
        const m = state.meteors[i];
        m.y += m.s * dt;
        m.x += m.dx * dt;
        m.a += m.spin * dt;

        // Bounce on boundaries
        if (m.x < m.r || m.x > state.w - m.r) {
          m.dx *= -0.9;
          m.x = m.x < m.r ? m.r : state.w - m.r;
        }

        // Check crash
        const dist = Math.hypot(m.x - state.ship.x, m.y - state.ship.y);
        const touchRadius = state.ship.r + m.r - 2;

        if (dist < touchRadius) {
          // Collision event
          state.meteors.splice(i, 1);
          
          if (state.ship.inv <= 0) {
            if (state.ship.shield > 0) {
              // Shield absorbed and broke!
              state.ship.shield = 0;
              state.ship.inv = 0.8; // short blink
              audio.playShieldBreak();
              boomParticles(m.x, m.y, '#38bdf8', 35, 1.4);
              bigShockwave(m.x, m.y, '#0284c7');
              state.shakeTime = 0.4;
              state.shakeIntensity = 10;
              addNotification(`💥 Shield vaporized! Defender online`, 'text-rose-400');
            } else {
              // Deduct life
              state.lives--;
              state.ship.inv = 1.6; // Invincibility frame
              audio.playCrash();
              boomParticles(state.ship.x, state.ship.y, '#f43f5e', 50, 1.8);
              state.shakeTime = 0.65;
              state.shakeIntensity = 18;
              addNotification(`🚩 Hull integrity compromised! Lives left: ${state.lives}`, 'text-red-500 font-extrabold animate-pulse');
              
              if (state.lives <= 0) {
                // Game Over triggered
                state.running = false;
                state.over = true;
                audio.stopBGM();
                
                // Add star currency to persistent balance
                const savedStars = getStoredStars() + state.starsCollectedThisRun;
                saveStoredStars(savedStars);
                
                onGameOver(state.score, state.level, state.starsCollectedThisRun);
                break;
              }
            }
          }
          continue;
        }

        // Expire meteors
        if (m.y > state.h + m.r + 50) {
          state.meteors.splice(i, 1);
        }
      }

      // Interaction: Stars Move, Magnetic pull & Collision
      const actualMagnetRadius = 180 + magnetRangeUpgrade * 70; // 180px base + 70px per upgrade level!

      for (let i = state.stars.length - 1; i >= 0; i--) {
        const s = state.stars[i];
        s.y += s.s * dt;
        s.p += dt * 6.5;

        // Magnet attraction pull
        if (state.ship.magnet > 0) {
          const dx = state.ship.x - s.x;
          const dy = state.ship.y - s.y;
          const distToShip = Math.hypot(dx, dy);
          if (distToShip < actualMagnetRadius) {
            // Accelerate pulled speed
            s.x += (dx / distToShip) * 380 * dt;
            s.y += (dy / distToShip) * 380 * dt;
          }
        }

        const dist = Math.hypot(s.x - state.ship.x, s.y - state.ship.y);
        if (dist < state.ship.r + s.r + 5) {
          // Collected!
          state.stars.splice(i, 1);
          state.starsCollectedThisRun++;
          
          // Music chime increment based on combo
          triggerCollectSound(state.combo);

          // Star scores with upgraded values
          const pointBonus = s.value * (1 + starValUpgrade * 0.4);
          state.score += pointBonus * state.multiplier;
          
          state.combo++;
          state.lastStarTime = now;
          state.multiplier = Math.min(6.0, 1.0 + state.combo * 0.25);

          boomParticles(s.x, s.y, starValUpgrade > 0 ? '#f59e0b' : '#fbbf24', 16, 0.7);
          
          // Flash points indicator
          onPointsEarned(state.score, state.level, state.multiplier);
          continue;
        }

        if (s.y > state.h + 40) {
          state.stars.splice(i, 1);
        }
      }

      // Interaction: Powerups Move & Collection
      const actualShieldDuration = 8.0 + shieldDurUpgrade * 2.0;

      for (let i = state.powerups.length - 1; i >= 0; i--) {
        const p = state.powerups[i];
        p.y += p.s * dt;
        p.p += dt * 5.0;

        const dist = Math.hypot(p.x - state.ship.x, p.y - state.ship.y);
        if (dist < state.ship.r + p.r + 6) {
          state.powerups.splice(i, 1);
          audio.playPowerUp(p.type);

          if (p.type === 'shield') {
            state.ship.shield = actualShieldDuration;
            boomParticles(p.x, p.y, '#06b6d4', 38, 1.3);
            addNotification(`🛡️ Deflector Shields active (+${actualShieldDuration.toFixed(0)}s)`, 'text-cyan-300 font-bold');
          } else if (p.type === 'magnet') {
            state.ship.magnet = 10.0;
            boomParticles(p.x, p.y, '#10b981', 32, 1.1);
            addNotification(`🧲 Quantum Tractor Magnet active (+10s)`, 'text-emerald-300 font-bold');
          } else if (p.type === 'bomb') {
            state.shakeTime = 0.55;
            state.shakeIntensity = 15;
            audio.playBombExplosion();
            
            // clear meteors screen-wide
            for (const met of state.meteors) {
              boomParticles(met.x, met.y, '#eaf2ff', 12, 1.0);
              state.score += 25 * state.multiplier;
            }
            state.meteors = [];
            addNotification('💣 EMP Detonator! Screen Cleared', 'text-purple-400 font-bold');
            bigShockwave(state.ship.x, state.ship.y - 30, '#c084fc');
          } else if (p.type === 'starShower') {
            // trigger instant bunch of falling stars
            addNotification('🌠 Meteor Trail! Star Shower active', 'text-yellow-400 font-bold animate-pulse');
            for (let j = 0; j < 12; j++) {
              setTimeout(() => {
                state.stars.push({
                  id: Math.random().toString(36).substring(2, 9),
                  x: Math.random() * (state.w - 50) + 25,
                  y: -10,
                  r: 10,
                  s: Math.random() * 80 + 190,
                  p: Math.random(),
                  value: 12
                });
              }, j * 150);
            }
          }
          continue;
        }

        if (p.y > state.h + 40) {
          state.powerups.splice(i, 1);
        }
      }

      // Particles aging
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const pt = state.particles[i];
        pt.age += dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        if (pt.age >= pt.life) {
          state.particles.splice(i, 1);
        }
      }

      // Trails decay
      for (let i = state.trails.length - 1; i >= 0; i--) {
        const tr = state.trails[i];
        tr.life -= dt;
        if (tr.life <= 0) {
          state.trails.splice(i, 1);
        }
      }

      // High-performance state buffering! Use stateRef to avoid 60fps React render cycles.
      if (state.lives !== state.lastSetLives) {
        setHudLives(state.lives);
        state.lastSetLives = state.lives;
      }

      const scoreFloor = Math.floor(state.score);
      if (scoreFloor !== state.lastSetScore) {
        setHudScore(scoreFloor);
        state.lastSetScore = scoreFloor;
      }

      if (state.level !== state.lastSetLevel) {
        setHudLevel(state.level);
        state.lastSetLevel = state.level;
      }

      const multRounded = parseFloat(state.multiplier.toFixed(1));
      if (multRounded !== state.lastSetMultiplier) {
        setHudMultiplier(multRounded);
        state.lastSetMultiplier = multRounded;
      }

      if (state.starsCollectedThisRun !== state.lastSetStars) {
        setHudStarsEarned(state.starsCollectedThisRun);
        state.lastSetStars = state.starsCollectedThisRun;
      }
    };

    // Drawing Context
    const drawGame = () => {
      ctx.fillStyle = '#070a13';
      ctx.fillRect(0, 0, state.w, state.h);

      ctx.save();
      // Apply screen shake offsets
      if (state.shakeTime > 0) {
        const shakeX = (Math.random() - 0.5) * state.shakeIntensity;
        const shakeY = (Math.random() - 0.5) * state.shakeIntensity;
        ctx.translate(shakeX, shakeY);
      }

      // Stars backdrop
      for (const b of state.bg) {
        ctx.globalAlpha = b.s / 80;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // Draw active thuster exhaust trails
      for (const t of state.trails) {
        ctx.globalAlpha = (t.life / 0.5) * 0.76;
        ctx.fillStyle = activeSkin.thrusterColor;
        ctx.beginPath();
        // size shrinks as trail ages
        ctx.arc(t.x, t.y, 8.5 * (t.life / 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // Draw Pick-up Stars
      for (const s of state.stars) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.p);
        
        // Star shape builder
        ctx.fillStyle = starValUpgrade > 0 ? '#f59e0b' : '#fbbf24';
        
        // Add optional halo glow for high-tier upgrades
        if (starValUpgrade > 1) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#f59e0b';
        }
        
        ctx.beginPath();
        for (let j = 0; j < 10; j++) {
          const angle = -Math.PI / 2 + j * Math.PI / 5;
          const radius = j % 2 ? 5.5 : 14.5;
          ctx[j === 0 ? 'moveTo' : 'lineTo'](Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Draw Powerups
      for (const p of state.powerups) {
        ctx.save();
        ctx.translate(p.x, p.y);
        
        let color = '#06b6d4';
        let strokeColor = '#38bdf8';
        let letter = '🛡️';
        if (p.type === 'magnet') { color = '#10b981'; strokeColor = '#34d399'; letter = '🧲'; }
        if (p.type === 'bomb') { color = '#a855f7'; strokeColor = '#c084fc'; letter = '💣'; }
        if (p.type === 'starShower') { color = '#f59e0b'; strokeColor = '#fbbf24'; letter = '🌠'; }

        // Glow circle
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, p.r + 3, 0, Math.PI * 2);
        ctx.stroke();

        // Draw symbol
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        ctx.fillText(letter, 0, 0.5);
        ctx.restore();
      }

      // Draw Obstacle Meteors
      for (const m of state.meteors) {
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.a);

        // Core base stone coloring
        ctx.fillStyle = m.big ? '#475569' : '#64748b';
        ctx.beginPath();
        
        // Draw slightly irregular jagged asteroid shapes!
        const rOffsets = m.big ? [1, 0.85, 1.1, 0.9, 1.15, 0.95, 1.05, 0.9] : [1, 0.9, 1.1, 0.95];
        const ptsCount = rOffsets.length;
        
        for (let j = 0; j < ptsCount; j++) {
          const angle = (j / ptsCount) * Math.PI * 2;
          const currRadius = m.r * rOffsets[j];
          ctx[j === 0 ? 'moveTo' : 'lineTo'](Math.cos(angle) * currRadius, Math.sin(angle) * currRadius);
        }
        ctx.closePath();
        ctx.fill();

        // Surface craters drawing
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(-m.r * 0.35, -m.r * 0.2, m.r * 0.24, 0, Math.PI * 2);
        ctx.fill();

        if (m.r > 20) {
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.arc(m.r * 0.25, m.r * 0.3, m.r * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Jagged highlights edge
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = m.big ? '#ef4444' : '#f43f5e';
        ctx.shadowBlur = 8;
        ctx.shadowColor = m.big ? '#ef4444' : '#f43f5e';
        ctx.beginPath();
        ctx.arc(0, 0, m.r - 1, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      // Draw Particles exploded
      for (const pt of state.particles) {
        ctx.globalAlpha = 1.0 - (pt.age / pt.life);
        if (pt.glow) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = pt.color;
        }
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1.0;

      // Draw spaceship (selected cosmetic model features)
      const ship = state.ship;
      ctx.save();
      ctx.translate(ship.x, ship.y);
      
      // Roll ship slightly depending on horizontal velocity
      const rollAngle = ship.vx * 0.00085;
      ctx.rotate(rollAngle);

      // Flickering invincibility frame
      if (ship.inv > 0) {
        const cycle = Math.floor(performance.now() / 60) % 2;
        ctx.globalAlpha = cycle === 0 ? 0.38 : 0.95;
      }

      // Drawing shapes classically based on cosmetic profile
      ctx.fillStyle = activeSkin.color;
      ctx.shadowBlur = 18;
      ctx.shadowColor = activeSkin.color;

      ctx.beginPath();
      if (activeSkin.id === 'super_nova') {
        // Supernova golden celestial cruiser shape
        ctx.moveTo(0, -34);
        ctx.quadraticCurveTo(18, -12, 28, 14);
        ctx.lineTo(16, 18);
        ctx.lineTo(8, 24);
        ctx.lineTo(-8, 24);
        ctx.lineTo(-16, 18);
        ctx.quadraticCurveTo(-18, -12, -28, 14);
        ctx.closePath();
        ctx.fill();

        // Dual forward cannons
        ctx.fillStyle = '#c084fc';
        ctx.fillRect(10, -14, 3, 10);
        ctx.fillRect(-13, -14, 3, 10);

        // Rotating fission star-core inside cockpit sphere
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // Golden orbit wind rings
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 14 + Math.sin(performance.now() / 60) * 3, 0, Math.PI * 2);
        ctx.stroke();
      } else if (activeSkin.shape === 'classic') {
        // Advanced sleek delta wing design
        ctx.moveTo(0, -28);
        ctx.lineTo(24, 18);
        ctx.lineTo(8, 10);
        ctx.lineTo(-8, 10);
        ctx.lineTo(-24, 18);
        ctx.closePath();
        ctx.fill();

        // Canopy glass bubble
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(7, 4);
        ctx.lineTo(-7, 4);
        ctx.closePath();
        ctx.fill();
      } else if (activeSkin.shape === 'interceptor') {
        // Twin-forward swept foils
        ctx.moveTo(0, -32);
        ctx.lineTo(26, 12);
        ctx.lineTo(16, 22);
        ctx.lineTo(4, 14);
        ctx.lineTo(-4, 14);
        ctx.lineTo(-16, 22);
        ctx.lineTo(-26, 12);
        ctx.closePath();
        ctx.fill();

        // Canopy bubble
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.ellipse(0, -5, 6, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (activeSkin.shape === 'phantom') {
        // Alien crescent hyper-ship
        ctx.moveTo(0, -30);
        ctx.bezierCurveTo(22, -10, 28, 16, 18, 22);
        ctx.lineTo(6, 12);
        ctx.lineTo(-6, 12);
        ctx.lineTo(-18, 22);
        ctx.bezierCurveTo(-28, 16, -22, -10, 0, -30);
        ctx.closePath();
        ctx.fill();

        // Fusion orb core
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#d8b4fe';
        ctx.beginPath();
        ctx.arc(0, -4, 6.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (activeSkin.shape === 'vanguard') {
        // Hexagonal heavyweight warrior ship
        ctx.moveTo(0, -32);
        ctx.lineTo(28, 2);
        ctx.lineTo(14, 22);
        ctx.lineTo(7, 12);
        ctx.lineTo(-7, 12);
        ctx.lineTo(-14, 22);
        ctx.lineTo(-28, 2);
        ctx.closePath();
        ctx.fill();

        // Dual engines plates glows
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(-12, 10, 5, 4);
        ctx.fillRect(7, 10, 5, 4);
      }

      ctx.shadowBlur = 0;

      // Active Shield Bubble surrounding ship
      if (ship.shield > 0) {
        const pulseFactor = 0.85 + Math.sin(performance.now() / 65) * 0.15;
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#06b6d4';
        ctx.strokeStyle = `rgba(14, 165, 233, ${pulseFactor * 0.7})`;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, -2, 38, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Active Magnet Bubble ring surrounding ship
      if (ship.magnet > 0) {
        ctx.strokeStyle = `rgba(16, 185, 129, ${0.35 + Math.sin(performance.now() / 90) * 0.18})`;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(0, -2, 65, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]); // clear dash
      }

      ctx.restore();
      ctx.restore(); // pop screen shake transforms
    };

    const runLoop = (timestamp: number) => {
      if (!state.running) return;
      
      const frameDelta = Math.min(0.033, (timestamp - state.last) / 1000);
      state.last = timestamp;

      if (!state.paused && !state.over) {
        updateGame(frameDelta);
      }

      drawGame();
      rAFId = requestAnimationFrame(runLoop);
    };

    rAFId = requestAnimationFrame(runLoop);

    return () => {
      cancelAnimationFrame(rAFId);
      audio.stopBGM();
    };
  }, [isPlaying, extraLives, shieldDurUpgrade, magnetRangeUpgrade, starValUpgrade]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden select-none touch-none">
      {/* Canvas Render Element */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="block w-full h-full cursor-crosshair"
        id="game-canvas"
      />

      {/* Action News notifications feed overlay */}
      <div className="absolute top-26 left-4 flex flex-col gap-1.5 pointer-events-none z-10 font-mono text-xs max-w-[280px]">
        {news.map((item) => (
          <div
            key={item.id}
            className={`px-3 py-1.5 rounded-md bg-slate-900/80 border border-slate-800/60 backdrop-blur-md shadow-lg ${item.color} transform translate-x-0 animate-[fadeIn_0.2s_ease-out]`}
          >
            {item.text}
          </div>
        ))}
      </div>

      {/* Active Powerups counters */}
      <div className="absolute bottom-28 left-4 flex flex-col gap-2.5 z-10 pointer-events-none">
        {hudActiveShield > 0 && (
          <div className="flex items-center gap-2 bg-cyan-900/80 border border-cyan-500/50 rounded-lg px-3 py-1.5 shadow-md backdrop-blur-md text-white font-semibold text-xs animate-pulse">
            <span>🛡️</span>
            <span>SHIELD ACTIVE:</span>
            <span className="font-mono text-cyan-300 font-extrabold">{hudActiveShield}s</span>
          </div>
        )}
        {hudActiveMagnet > 0 && (
          <div className="flex items-center gap-2 bg-emerald-900/80 border border-emerald-500/50 rounded-lg px-3 py-1.5 shadow-md backdrop-blur-md text-white font-semibold text-xs animate-pulse">
            <span>🧲</span>
            <span>MAGNET ACTIVE:</span>
            <span className="font-mono text-emerald-300 font-extrabold">{hudActiveMagnet}s</span>
          </div>
        )}
      </div>

      {/* Real-time responsive HTML Head-Up Display (HUD) */}
      <div className="absolute top-3 left-3 right-3 z-30 pointer-events-none font-sans flex items-center justify-between gap-2">
        
        {/* Sleek Integrated Left Status Block */}
        <div className="flex items-center gap-2 sm:gap-3 bg-slate-950/95 border border-slate-800/80 px-2.5 sm:px-4 py-1.5 rounded-xl backdrop-blur-md shadow-2xl pointer-events-auto">
          {/* Shields count */}
          <div className="flex items-center gap-1.5 border-r border-slate-800/80 pr-2.5">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest hidden sm:inline">Shields</span>
            <div className="flex gap-0.5 items-center">
              {hudLives <= 4 ? (
                Array.from({ length: hudLives }).map((_, index) => (
                  <span 
                    key={index} 
                    className="text-base text-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.7)] animate-[pulse_2s_infinite]"
                  >
                    ❤️
                  </span>
                ))
              ) : (
                <div className="flex items-center gap-1 font-mono text-xs font-bold text-red-500">
                  <span>❤️</span>
                  <span className="text-red-400">x{hudLives}</span>
                </div>
              )}
              {hudLives === 0 && (
                <span className="text-xs font-mono text-red-500/85 font-black uppercase tracking-wider animate-pulse">CRITICAL</span>
              )}
            </div>
          </div>

          {/* Sector Display */}
          <div className="flex items-center gap-1 border-r border-slate-800/80 pr-2.5 pl-0.5">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider hidden min-[400px]:inline">SECTOR</span>
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider min-[400px]:hidden inline">S.</span>
            <span className="text-sm font-black text-amber-400 font-mono">{hudLevel}</span>
          </div>

          {/* Stars display */}
          <div className="flex items-center gap-1.5 border-r border-slate-800/80 pr-2.5 pl-0.5 font-mono">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider hidden min-[400px]:inline">STARS</span>
            <span className="text-sm font-black text-yellow-400 flex items-center gap-0.5">
              ✨{hudStarsEarned}
            </span>
          </div>

          {/* Real-time active Score display */}
          <div className="flex items-center gap-1.5 pl-0.5 font-mono">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider hidden min-[400px]:inline">SCORE</span>
            <span className="text-sm font-black text-cyan-400">
              {hudScore.toString().padStart(5, '0')}
            </span>
          </div>
        </div>

        {/* Dynamic Pause Button */}
        <div className="pointer-events-auto">
          <button
            onClick={() => {
              audio.playClick();
              onPauseToggle(!isPaused);
            }}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-950/95 hover:bg-slate-800 border border-slate-850 rounded-xl text-white backdrop-blur-md active:scale-95 transition-all outline-none font-mono text-[10px] sm:text-xs font-black tracking-widest text-[#22d3ee] hover:text-white cursor-pointer shadow-2xl flex items-center gap-1.5"
          >
            <span>{isPaused ? '▶️ CONTINUE' : '⏸️ PAUSE'}</span>
          </button>
        </div>

      </div>

      {/* Multiplier / Combo Streak Bar */}
      <div className="absolute top-22 left-1/2 -translate-x-1/2 z-10 pointer-events-none bg-slate-900/90 border border-slate-700/60 rounded-full px-5 py-1 text-center font-mono backdrop-blur-sm shadow-md">
        <span className="text-xs text-slate-400">MULTIPLIER: </span>
        <span className={`text-sm font-extrabold transition-all duration-150 ${hudMultiplier > 1.0 ? 'text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.6)] animate-pulse' : 'text-white'}`}>
          {hudMultiplier.toFixed(1)}x
        </span>
      </div>

      {/* Touch Screen buttons drawn strictly on mobile and arrows selected */}
      {activeControlMode === 'arrows' && (
        <div className="absolute bottom-6 left-6 right-6 z-20 flex justify-between pointer-events-none md:hidden gap-4">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              stateRef.current.touch.left = true;
              audio.playClick();
            }}
            onPointerUp={() => {
              stateRef.current.touch.left = false;
            }}
            onPointerCancel={() => {
              stateRef.current.touch.left = false;
            }}
            className="w-18 h-18 select-none touch-none active:scale-95 flex items-center justify-center rounded-full bg-slate-900/70 border-2 border-slate-500 text-white text-3xl font-bold backdrop-blur-md pointer-events-auto shadow-2xl shadow-cyan-500/20 active:border-cyan-400 active:bg-cyan-950/70"
          >
            ←
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              stateRef.current.touch.right = true;
              audio.playClick();
            }}
            onPointerUp={() => {
              stateRef.current.touch.right = false;
            }}
            onPointerCancel={() => {
              stateRef.current.touch.right = false;
            }}
            className="w-18 h-18 select-none touch-none active:scale-95 flex items-center justify-center rounded-full bg-slate-900/70 border-2 border-slate-500 text-white text-3xl font-bold backdrop-blur-md pointer-events-auto shadow-2xl shadow-cyan-500/20 active:border-cyan-400 active:bg-cyan-950/70"
          >
            →
          </button>
        </div>
      )}

      {/* Guide subtitle overlay for slide mode */}
      {activeControlMode === 'drag' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-[11px] text-slate-500 tracking-wider font-mono bg-slate-900/40 px-3 py-1 rounded-full backdrop-blur-sm">
          📱 SLIDE OR DRAG HORIZONTALLY TO STEER
        </div>
      )}
    </div>
  );
};
