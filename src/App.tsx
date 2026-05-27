import React, { useState, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { UpgradeShop } from './components/UpgradeShop';
import { SkinsSelect } from './components/SkinsSelect';
import { SettingsPanel } from './components/SettingsPanel';
import { HighScoresPanel } from './components/HighScoresPanel';
import { DynamicScore } from './components/DynamicScore';
import { audio } from './utils/audio';
import { getStoredStars, saveHighScore } from './utils/gameData';
import { 
  Play, 
  Trophy, 
  Settings as SettingsIcon, 
  ShoppingBag, 
  Sparkles,
  Volume2,
  Tv,
  Gamepad2,
  Music,
  Coins,
  History,
  RotateCcw
} from 'lucide-react';

type ScreenState = 'menu' | 'playing' | 'shop' | 'skins' | 'settings' | 'highscores' | 'gameover';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('menu');
  const [stars, setStars] = useState(0);
  const [controlMode, setControlMode] = useState<'arrows' | 'drag'>('arrows');

  // In-Game state snapshots for pause and gameover
  const [gameScore, setGameScore] = useState(0);
  const [gameLevel, setGameLevel] = useState(1);
  const [gameStarsEarned, setGameStarsEarned] = useState(0);
  const [pointsKey, setPointsKey] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Pilot code name for Leaderboard entry
  const [pilotName, setPilotName] = useState('');
  const [highscoreSaved, setHighscoreSaved] = useState(false);

  // Load baseline parameters on start
  useEffect(() => {
    setStars(getStoredStars());
    
    // Auto restore control preference
    const savedControlMode = localStorage.getItem('starfall-control-mode-v5');
    if (savedControlMode === 'drag') {
      setControlMode('drag');
    }

    // Warm-up audio support
    const warmupAudio = () => {
      audio.playClick();
      // Remove events after first gesture
      window.removeEventListener('pointerdown', warmupAudio);
      window.removeEventListener('keydown', warmupAudio);
    };
    window.addEventListener('pointerdown', warmupAudio);
    window.addEventListener('keydown', warmupAudio);

    return () => {
      window.removeEventListener('pointerdown', warmupAudio);
      window.removeEventListener('keydown', warmupAudio);
    };
  }, []);

  const handleControlModeChanged = (mode: 'arrows' | 'drag') => {
    setControlMode(mode);
    localStorage.setItem('starfall-control-mode-v5', mode);
  };

  const handleGameOver = (finalScore: number, finalLevel: number, starsEarned: number) => {
    setGameScore(finalScore);
    setGameLevel(finalLevel);
    setGameStarsEarned(starsEarned);
    setHighscoreSaved(false);
    
    // reload persistent currency
    setStars(getStoredStars());

    // Switch screen with gentle latency for rendering ease
    setTimeout(() => {
      setScreen('gameover');
    }, 100);
  };

  const handlePointsEarned = (score: number, level: number, multiplier: number) => {
    setGameScore(score);
    setGameLevel(level);
    // increment token to alert state changes and trigger bouncy visual effects
    setPointsKey(prev => prev + 1);
  };

  const submitHighScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pilotName.trim()) return;

    saveHighScore(gameScore, gameLevel, pilotName.trim());
    setHighscoreSaved(true);
    audio.playLevelUp(); // Play rewarding synthesizer sound
  };

  const startGame = () => {
    audio.playClick();
    setIsPaused(false);
    setScreen('playing');
  };

  const togglePause = (pauseState: boolean) => {
    setIsPaused(pauseState);
  };

  return (
    <div id="app-root" className="relative w-screen h-screen bg-[#060813] text-white overflow-hidden select-none font-sans">
      
      {/* Absolute Starglow Background Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-[#070a13] to-[#04060b] pointer-events-none z-0" />

      {/* Cosmic background particles behind menu screens */}
      {screen !== 'playing' && (
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none overflow-hidden">
          <div className="absolute w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse top-1/4 left-1/3 shadow-[0_0_8px_#22d3ee]" />
          <div className="absolute w-1 h-1 bg-amber-400 rounded-full animate-pulse top-2/3 left-1/4 shadow-[0_0_6px_#f59e0b]" />
          <div className="absolute w-2 h-2 bg-purple-400 rounded-full top-1/3 left-3/4 animate-bounce shadow-[0_0_10px_#c084fc]" />
          <div className="absolute w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce top-4/5 left-4/5 shadow-[0_0_8px_#34d399]" />
        </div>
      )}

      {/* Primary Routing Deck Container */}
      <div className="relative w-full h-full z-10 flex flex-col items-center justify-center p-4">
        
        {/* --- SCREEN 1: MAIN MENU CARD --- */}
        {screen === 'menu' && (
          <div className="w-full max-w-sm sm:max-w-md text-center bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center animate-[fadeIn_0.2s_ease-out]">
            
            {/* Visual Header Icon */}
            <div className="mb-4 text-cyan-400 font-mono text-[10px] tracking-[0.25em] uppercase flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-800/40 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              PILOT CABIN ONLINE
            </div>

            {/* Glowing Brand Title */}
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-amber-200 to-amber-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.25)] select-none">
              STARFALL
            </h1>
            <h2 className="text-sm font-mono tracking-[0.4em] text-slate-400 uppercase mt-1">
              SPRINT V4
            </h2>

            <p className="text-xs text-slate-400 max-w-xs mt-3 leading-relaxed font-medium">
              Navigate dense meteor fields. Collect hyper-energy star-cores. Upgrade your starship shields. Survive the infinite sweep.
            </p>

            {/* Balance banner */}
            <div className="mt-5 flex items-center justify-between gap-4 w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="text-left">
                <span className="block text-[9px] text-slate-500 font-mono tracking-widest uppercase">STAR BALANCE</span>
                <span className="text-sm font-bold text-yellow-400 flex items-center gap-1">
                  ✨ {stars}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[9px] text-slate-500 font-mono tracking-widest uppercase">STEER CONTROLS</span>
                <span className="text-xs font-bold text-cyan-400 uppercase">
                  {controlMode === 'arrows' ? 'Tactile Arrow Pads' : 'Direct Slide'}
                </span>
              </div>
            </div>

            {/* Menu Buttons Group Grid */}
            <div className="flex flex-col gap-2.5 w-full mt-6">
              <button
                onClick={startGame}
                className="w-full bg-gradient-to-r from-cyan-500 to-teal-400 hover:brightness-110 active:scale-98 text-slate-950 font-black tracking-wider py-3.5 px-6 rounded-xl shadow-lg cursor-pointer transform transition-all text-sm uppercase flex items-center justify-center gap-2 outline-none"
              >
                <Play className="fill-current" size={16} /> ENGAGE HYPERDRIVE
              </button>

              <button
                onClick={() => {
                  audio.playClick();
                  setScreen('shop');
                }}
                className="w-full bg-slate-800 hover:bg-slate-750 active:scale-98 text-white font-bold py-3 px-6 rounded-xl border border-slate-700/50 cursor-pointer transition-all text-xs uppercase flex items-center justify-center gap-2 outline-none"
              >
                <ShoppingBag size={14} className="text-amber-400" /> SYSTEM PERK UPGRADES
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    audio.playClick();
                    setScreen('skins');
                  }}
                  className="w-full bg-slate-850 hover:bg-slate-800 active:scale-98 text-slate-200 font-bold py-2.5 px-4 rounded-xl border border-slate-800 cursor-pointer transition-all text-xs uppercase flex items-center justify-center gap-1.5 outline-none"
                >
                  🎨 Hangar
                </button>
                <button
                  onClick={() => {
                    audio.playClick();
                    setScreen('highscores');
                  }}
                  className="w-full bg-slate-850 hover:bg-slate-800 active:scale-98 text-slate-200 font-bold py-2.5 px-4 rounded-xl border border-slate-800 cursor-pointer transition-all text-xs uppercase flex items-center justify-center gap-1.5 outline-none"
                >
                  <Trophy size={11} className="text-yellow-400" /> Leaderboard
                </button>
              </div>

              <button
                onClick={() => {
                  audio.playClick();
                  setScreen('settings');
                }}
                className="w-full mt-1.5 text-xs text-slate-400 hover:text-white transition-colors duration-150 py-1 flex items-center justify-center gap-1.5 font-mono cursor-pointer outline-none"
              >
                <SettingsIcon size={12} /> CONFIG SYSTEM
              </button>
            </div>

            {/* Keyboard shortcut guide */}
            <div className="mt-6 border-t border-slate-800/80 pt-4 w-full">
              <span className="text-[10px] text-slate-500 font-mono block">
                ⌨️ DESKTOP: Left / Right Arrows or [A] / [D] to steer.
              </span>
            </div>
          </div>
        )}

        {/* --- SCREEN 2: GAMEPLAY ACTIVE CANVAS CONTAINER --- */}
        {screen === 'playing' && (
          <div className="absolute inset-0 w-full h-full bg-black z-10 flex flex-col justify-between">
            
            {/* Core Game Render Area */}
            <GameCanvas
              onGameOver={handleGameOver}
              onPointsEarned={handlePointsEarned}
              onPauseToggle={togglePause}
              isPaused={isPaused}
              isPlaying={screen === 'playing'}
              activeControlMode={controlMode}
            />

            {/* --- CORE GAMEPLAY OVERLAY: PAUSE SCREEN --- */}
            {isPaused && (
              <div className="absolute inset-0 z-40 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-xs text-center border border-slate-700/50 bg-slate-900/90 rounded-2xl p-6 shadow-2xl flex flex-col items-center animate-[fadeIn_0.15s_ease-out]">
                  <h2 className="text-2xl font-black text-slate-100 tracking-wider mb-2.5">COMMS SUSPENDED</h2>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    Pilot starship systems are currently paused. Ready to re-engage the hyperdrive?
                  </p>

                  <div className="flex flex-col gap-2 w-full">
                    <button
                      onClick={() => {
                        audio.playClick();
                        togglePause(false);
                      }}
                      className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-400 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs uppercase rounded-xl cursor-pointer shadow-md transition-all outline-none"
                    >
                      RESUME FLIGHT
                    </button>
                    
                    <button
                      onClick={() => {
                        audio.playClick();
                        audio.stopBGM();
                        setScreen('menu');
                      }}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 active:scale-95 text-white font-bold text-xs uppercase rounded-xl border border-slate-700/50 cursor-pointer transition-all outline-none"
                    >
                      ABORT WORK CODES
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- SCREEN 3: UPGRADE SHOP --- */}
        {screen === 'shop' && (
          <UpgradeShop
            starsCount={stars}
            onStarsUpdated={setStars}
            onBack={() => setScreen('menu')}
          />
        )}

        {/* --- SCREEN 4: COSMETICS SICK SKINS SELECT --- */}
        {screen === 'skins' && (
          <SkinsSelect
            starsCount={stars}
            onStarsUpdated={setStars}
            onBack={() => setScreen('menu')}
          />
        )}

        {/* --- SCREEN 5: SETTINGS SYSTEM SETUP --- */}
        {screen === 'settings' && (
          <SettingsPanel
            controlMode={controlMode}
            onControlModeChanged={handleControlModeChanged}
            onBack={() => setScreen('menu')}
          />
        )}

        {/* --- SCREEN 6: LEADERBOARDS --- */}
        {screen === 'highscores' && (
          <HighScoresPanel
            onBack={() => setScreen('menu')}
          />
        )}

        {/* --- SCREEN 7: GAMEOVER SCOREBOARD ENTRY --- */}
        {screen === 'gameover' && (
          <div className="w-full max-w-sm sm:max-w-md bg-slate-900/90 border-2 border-rose-950 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl text-center flex flex-col items-center animate-[fadeIn_0.25s_ease-out]">
            
            <div className="mb-2 uppercase font-mono tracking-widest text-[10px] bg-rose-950/40 border border-rose-800 px-3 py-1 rounded text-rose-400 font-extrabold animate-pulse">
              ☠️ TRANSMISSION LOST: FLIGHT TERMINAL
            </div>

            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-400 tracking-tight leading-none uppercase mt-2">
              HULL RECONSTRUCTED
            </h2>
            <p className="text-xs text-slate-400 leading-normal mt-1 mb-5">
              The ship crumbled at Sector Level {gameLevel}. Retrieve flight stats safely below.
            </p>

            {/* Score showcase tracker */}
            <div className="mb-6 w-full py-4 bg-slate-950 border border-slate-900 rounded-xl flex flex-col items-center justify-center shadow-inner">
              <DynamicScore score={Math.floor(gameScore)} highlightTrigger={pointsKey} />
              <div className="flex gap-4 mt-3 pt-3 border-t border-slate-900 w-full px-6 text-xs font-mono text-slate-400">
                <div className="flex-1 text-left">
                  <span>MAX SECTOR:</span> <span className="font-bold text-white">S-{gameLevel}</span>
                </div>
                <div className="flex-1 text-right">
                  <span>STARS EARNED:</span> <span className="font-bold text-yellow-400 flex items-center gap-0.5 justify-end">✨ {gameStarsEarned}</span>
                </div>
              </div>
            </div>

            {/* High score submitting register */}
            {!highscoreSaved ? (
              <form onSubmit={submitHighScore} className="w-full flex flex-col gap-3">
                <label className="text-[10px] text-slate-500 font-mono font-bold uppercase block text-left tracking-wider">
                  💾 REGISTER PILOT SIG RECORD
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    maxLength={12}
                    value={pilotName}
                    onChange={(e) => setPilotName(e.target.value.toUpperCase())}
                    placeholder="ENTER PILOT CODE"
                    className="flex-1 bg-slate-950/80 border border-slate-800 rounded-lg py-2.5 px-3 text-sm font-mono placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white uppercase font-bold outline-none text-center"
                  />
                  <button
                    type="submit"
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs font-mono py-2.5 px-4 rounded-lg cursor-pointer max-w-[120px] shrink-0 uppercase active:scale-95 transition-all outline-none"
                  >
                    SUBMIT
                  </button>
                </div>
              </form>
            ) : (
              <div className="w-full text-emerald-400 text-xs font-bold font-mono tracking-widest bg-emerald-950/20 border border-emerald-900/30 rounded-lg py-3 animate-pulse">
                ✅ PILOT RECORD COMMITTED TO COGNITIVE LEDGER
              </div>
            )}

            <div className="flex flex-col gap-2 w-full mt-6">
              <button
                onClick={startGame}
                className="w-full bg-gradient-to-r from-cyan-500 to-teal-400 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs tracking-wider py-3.5 px-4 rounded-xl shadow-lg cursor-pointer transform transition-all uppercase flex items-center justify-center gap-1.5 outline-none font-sans"
              >
                <RotateCcw size={13} /> FLY AGAIN
              </button>

              <button
                onClick={() => {
                  audio.playClick();
                  setScreen('menu');
                }}
                className="w-full bg-slate-800 hover:bg-slate-750 active:scale-95 text-white font-bold text-xs tracking-wider py-3 px-4 rounded-xl border border-slate-700/50 cursor-pointer transition-all uppercase outline-none"
              >
                EXIT TO DECK COMMAND
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
