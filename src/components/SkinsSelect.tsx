import React, { useState, useEffect } from 'react';
import { getStoredSkins, saveStoredSkins, getActiveSkinId, setActiveSkinId, getStoredStars, saveStoredStars } from '../utils/gameData';
import { ShipSkin } from '../types';
import { audio } from '../utils/audio';

interface SkinsSelectProps {
  onBack: () => void;
  starsCount: number;
  onStarsUpdated: (newStars: number) => void;
}

export const SkinsSelect: React.FC<SkinsSelectProps> = ({ onBack, starsCount, onStarsUpdated }) => {
  const [skins, setSkins] = useState<ShipSkin[]>([]);
  const [activeId, setActiveId] = useState('classic');

  useEffect(() => {
    setSkins(getStoredSkins());
    setActiveId(getActiveSkinId());
  }, []);

  const handleSelectOrBuy = (skin: ShipSkin) => {
    if (skin.unlocked) {
      setActiveSkinId(skin.id);
      setActiveId(skin.id);
      audio.playPowerUp('shield'); // play satisfying buzz
      return;
    }

    if (starsCount < skin.cost) {
      audio.playClick();
      return;
    }

    // Purchase skin
    const nextStars = starsCount - skin.cost;
    saveStoredStars(nextStars);
    onStarsUpdated(nextStars);

    const nextSkins = skins.map(s => {
      if (s.id === skin.id) {
        return { ...s, unlocked: true };
      }
      return s;
    });

    saveStoredSkins(nextSkins);
    setSkins(nextSkins);
    setActiveSkinId(skin.id);
    setActiveId(skin.id);

    // Play big purchase celebration sound
    audio.playLevelUp();
  };

  const getShapeName = (skinId: string, shape: string) => {
    if (skinId === 'super_nova') return 'Hyper-Dimensional Star-Foil';
    switch (shape) {
      case 'classic': return 'AeroInterceptor';
      case 'interceptor': return 'SolarFoil Mk-II';
      case 'phantom': return 'NebulaScythe X';
      case 'vanguard': return 'Dreadnought Armor';
      default: return 'Fighter';
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-900/90 border border-slate-700/60 rounded-2xl p-6 sm:p-8 backdrop-blur-lg shadow-2xl font-sans text-white text-left animate-[fadeIn_0.25s_ease-out]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300 tracking-tight uppercase">SHIP CODES</h2>
          <p className="text-xs text-slate-400">Unlock starship designs in the Fleet Hangar</p>
        </div>
        <div className="flex items-center gap-1 bg-amber-950/60 border border-amber-500/50 rounded-lg px-3 py-1.5 font-mono text-sm text-yellow-400">
          <span>✨</span>
          <span>{starsCount}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {skins.map((skin) => {
          const isActive = skin.id === activeId;
          const isUnlocked = skin.unlocked;
          const canAfford = starsCount >= skin.cost;

          return (
            <div
              key={skin.id}
              onClick={() => {
                audio.playClick();
                handleSelectOrBuy(skin);
              }}
              className={`border rounded-xl p-4 cursor-pointer select-none transition-all duration-200 relative ${
                isActive 
                  ? 'bg-slate-950 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.25)]' 
                  : isUnlocked
                    ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    : 'bg-slate-900/30 border-slate-950/50 opacity-80 hover:opacity-100 hover:border-slate-800'
              }`}
            >
              {/* Colored pilot indicator dot */}
              <div className="flex justify-between items-start mb-2.5">
                <div 
                  className="w-3.5 h-3.5 rounded-full" 
                  style={{ 
                    backgroundColor: skin.color, 
                    boxShadow: `0 0 8px ${skin.color}` 
                  }}
                />
                {!isUnlocked && (
                  <span className="text-[10px] bg-slate-800/80 border border-slate-700/60 font-mono px-1.5 py-0.5 rounded text-yellow-400">
                    ✨ {skin.cost}
                  </span>
                )}
              </div>

              <h3 className="text-sm font-black tracking-wide leading-tight uppercase truncate">{skin.name}</h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{getShapeName(skin.id, skin.shape)}</p>

              {/* Status footer button inside card */}
              <div className="mt-4">
                {isActive ? (
                  <span className="w-full text-center block text-[10px] font-bold font-mono tracking-widest text-cyan-400 uppercase bg-cyan-950/40 border border-cyan-800/30 rounded py-1">
                    EQUIPPED
                  </span>
                ) : isUnlocked ? (
                  <span className="w-full text-center block text-[10px] font-bold font-mono tracking-widest text-slate-400 uppercase bg-slate-950 group-hover:bg-slate-800 rounded py-1 border border-slate-800">
                    MOUNT SKIN
                  </span>
                ) : (
                  <button
                    disabled={!canAfford}
                    className={`w-full text-center block text-[10px] font-bold font-mono tracking-widest uppercase rounded py-1 border outline-none ${
                      canAfford
                        ? 'bg-amber-950/50 border-amber-600/50 text-yellow-400 active:scale-[0.98]'
                        : 'bg-slate-950 border-slate-950/50 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    ACQUIRE
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => {
          audio.playClick();
          onBack();
        }}
        className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-700/50 text-white font-bold py-3 px-4 rounded-xl cursor-pointer text-center text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-600"
      >
        BACK TO COMMAND DECK
      </button>
    </div>
  );
};
