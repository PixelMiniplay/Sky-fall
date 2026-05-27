import React, { useState, useEffect } from 'react';
import { getStoredUpgrades, saveStoredUpgrades, getStoredStars, saveStoredStars } from '../utils/gameData';
import { UpgradeItem } from '../types';
import { audio } from '../utils/audio';

interface UpgradeShopProps {
  onBack: () => void;
  starsCount: number;
  onStarsUpdated: (newStars: number) => void;
}

export const UpgradeShop: React.FC<UpgradeShopProps> = ({ onBack, starsCount, onStarsUpdated }) => {
  const [upgrades, setUpgrades] = useState<UpgradeItem[]>([]);

  useEffect(() => {
    setUpgrades(getStoredUpgrades());
  }, []);

  const handlePurchase = (item: UpgradeItem) => {
    if (item.level >= item.maxLevel) return;
    const cost = item.cost[item.level];
    if (starsCount < cost) {
      audio.playClick();
      return;
    }

    const nextStars = starsCount - cost;
    saveStoredStars(nextStars);
    onStarsUpdated(nextStars);

    const nextUpgrades = upgrades.map(u => {
      if (u.id === item.id) {
        return { ...u, level: u.level + 1 };
      }
      return u;
    });

    saveStoredUpgrades(nextUpgrades);
    setUpgrades(nextUpgrades);

    // Play successful positive synth sound
    audio.playPowerUp(item.id === 'lives' || item.id === 'shield_duration' ? 'shield' : 'magnet');
  };

  const getIcon = (id: string) => {
    switch(id) {
      case 'lives': return '🛡️';
      case 'shield_duration': return '⚡';
      case 'magnet_range': return '🧲';
      case 'star_value': return '✨';
      case 'thruster_speed': return '🚀';
      default: return '🌌';
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-900/90 border border-slate-700/60 rounded-2xl p-6 sm:p-8 backdrop-blur-lg shadow-2xl font-sans text-white text-left animate-[fadeIn_0.25s_ease-out]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-300 tracking-tight uppercase">PERK UPGRADES</h2>
          <p className="text-xs text-slate-400">Upgrade ship sub-systems using stars</p>
        </div>
        <div className="flex items-center gap-1 bg-amber-950/60 border border-amber-500/50 rounded-lg px-3 py-1.5 font-mono text-sm text-yellow-400">
          <span>✨</span>
          <span>{starsCount}</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-6 max-h-[380px] overflow-y-auto pr-1">
        {upgrades.map((item) => {
          const isMaxed = item.level >= item.maxLevel;
          const cost = isMaxed ? 0 : item.cost[item.level];
          const canAfford = starsCount >= cost;

          return (
            <div 
              key={item.id} 
              className="flex items-center justify-between gap-4 bg-slate-950/70 border border-slate-800 rounded-xl p-4 transition-all duration-200 hover:border-slate-700 hover:bg-slate-950/90"
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl bg-slate-900 border border-slate-800 rounded-lg w-12 h-12 flex items-center justify-center">
                  {getIcon(item.id)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide truncate">{item.name}</h3>
                  <p className="text-xs text-slate-400 leading-tight mt-0.5">{item.description}</p>
                  
                  {/* Progress bars representing levels */}
                  <div className="flex gap-1.5 mt-2">
                    {Array.from({ length: item.maxLevel }).map((_, idx) => (
                      <div 
                        key={idx}
                        className={`h-1.5 flex-1 rounded-full ${idx < item.level ? 'bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'bg-slate-800'}`}
                      />
                    ))}
                    <span className="text-[10px] text-slate-500 font-mono ml-1">Lvl {item.level}/{item.maxLevel}</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                {isMaxed ? (
                  <span className="bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1.5 rounded-lg font-bold font-mono tracking-wider uppercase inline-block">
                    MAX LEVEL
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      audio.playClick();
                      handlePurchase(item);
                    }}
                    disabled={!canAfford}
                    className={`px-3 py-2 rounded-lg font-bold font-mono text-xs flex flex-col items-center justify-center min-w-[80px] transition-all border outline-none ${
                      canAfford
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 border-yellow-600 text-slate-950 hover:brightness-110 active:scale-95 cursor-pointer shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <span>UPGRADE</span>
                    <span className="text-[10px] font-mono mt-0.5">✨{cost}</span>
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
