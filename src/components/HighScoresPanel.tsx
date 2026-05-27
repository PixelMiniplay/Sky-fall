import React, { useState, useEffect } from 'react';
import { getHighScores } from '../utils/gameData';
import { HighScore } from '../types';
import { audio } from '../utils/audio';

interface HighScoresPanelProps {
  onBack: () => void;
}

export const HighScoresPanel: React.FC<HighScoresPanelProps> = ({ onBack }) => {
  const [scores, setScores] = useState<HighScore[]>([]);

  useEffect(() => {
    setScores(getHighScores());
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-900/95 border border-slate-700/60 rounded-2xl p-6 sm:p-8 backdrop-blur-lg shadow-2xl font-sans text-white text-left animate-[fadeIn_0.25s_ease-out]">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200 tracking-tight uppercase">HIGH RANK LEADERBOARD</h2>
        <p className="text-xs text-slate-400">Top spaceship pilot registers worldwide</p>
      </div>

      <div className="flex flex-col gap-2 mb-6 max-h-[360px] overflow-y-auto">
        <div className="grid grid-cols-12 px-3 py-1 text-[10px] text-slate-500 font-mono tracking-wider uppercase">
          <span className="col-span-2">RANK</span>
          <span className="col-span-5">PILOT CODE</span>
          <span className="col-span-2 text-center">SECTOR</span>
          <span className="col-span-3 text-right">SCORE</span>
        </div>

        {scores.length === 0 ? (
          <div className="text-slate-500 text-center py-8 text-sm font-mono leading-relaxed">
            No flight data recorded. <br />Engage thrusters to log your first run!
          </div>
        ) : (
          scores.map((record, index) => {
            const isTop3 = index < 3;
            const colors = [
              'text-yellow-400 font-extrabold bg-yellow-950/20 border-yellow-800/45',
              'text-slate-300 font-bold bg-slate-950/20 border-slate-700/30',
              'text-amber-600 font-bold bg-amber-950/20 border-amber-800/20'
            ];
            
            return (
              <div 
                key={index}
                className={`grid grid-cols-12 items-center px-4 py-3 rounded-lg border text-sm font-mono ${
                  isTop3 
                    ? `${colors[index]} shadow-sm` 
                    : 'bg-slate-950/40 border-slate-900 text-slate-300'
                }`}
              >
                {/* Rank placement */}
                <div className="col-span-2 text-xs font-bold font-sans">
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                  {index >= 3 && `#${index + 1}`}
                </div>

                {/* Name */}
                <div className="col-span-5 font-bold truncate uppercase tracking-wide">
                  {record.name}
                </div>

                {/* Sector Level */}
                <div className="col-span-2 text-center text-xs text-slate-400 font-bold">
                  S-{record.level}
                </div>

                {/* Score */}
                <div className="col-span-3 text-right font-black tracking-wider text-sm">
                  {record.score.toLocaleString()}
                </div>
              </div>
            );
          })
        )}
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
