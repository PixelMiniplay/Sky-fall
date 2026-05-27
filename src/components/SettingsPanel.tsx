import React, { useState, useEffect } from 'react';
import { audio } from '../utils/audio';

interface SettingsPanelProps {
  onBack: () => void;
  controlMode: 'arrows' | 'drag';
  onControlModeChanged: (mode: 'arrows' | 'drag') => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  onBack,
  controlMode,
  onControlModeChanged,
}) => {
  const [settings, setSettings] = useState({
    masterVolume: 0.5,
    sfxVolume: 0.6,
    bgmVolume: 0.3,
    sfxEnabled: true,
    bgmEnabled: true,
  });

  useEffect(() => {
    setSettings(audio.getSettings());
  }, []);

  const handleChange = (key: string, value: any) => {
    const nextSettings = { ...settings, [key]: value };
    setSettings(nextSettings);
    audio.setSettings(nextSettings);
    
    // Play test beep sound when configuring SFX volumes
    if (key === 'sfxVolume' || key === 'masterVolume' || key === 'sfxEnabled') {
      audio.playClick();
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-900/90 border border-slate-700/60 rounded-2xl p-6 sm:p-8 backdrop-blur-lg shadow-2xl font-sans text-white text-left animate-[fadeIn_0.25s_ease-out]">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-300 tracking-tight uppercase">SYSTEMS SETUP</h2>
        <p className="text-xs text-slate-400">Configure spaceflight input rules and acoustics</p>
      </div>

      <div className="flex flex-col gap-5 mb-8">
        
        {/* Toggle Controls Category */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            🛰️ FLIGHT STEERING METHOD
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onControlModeChanged('arrows');
                audio.playClick();
              }}
              className={`py-2 px-3 rounded-lg font-bold font-mono text-xs border outline-none cursor-pointer transition-all ${
                controlMode === 'arrows'
                  ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-[0_0_8px_rgba(34,211,238,0.4)]'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              Left / Right Pads
            </button>
            <button
              onClick={() => {
                onControlModeChanged('drag');
                audio.playClick();
              }}
              className={`py-2 px-3 rounded-lg font-bold font-mono text-xs border outline-none cursor-pointer transition-all ${
                controlMode === 'drag'
                  ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-[0_0_8px_rgba(34,211,238,0.4)]'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              Direct Drag / Follow
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-mono">
            * Drag/Follow follows fingers or mouse on the board. Arrow Pads render tactile steering zones.
          </p>
        </div>

        {/* Audio Volume configuration sliders */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
          <span className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            🔊 ACOUSTIC CAPACITORS
          </span>

          {/* Master volume */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">MASTER VOLUME</span>
              <span className="text-cyan-400 font-bold">{Math.round(settings.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.0"
              step="0.05"
              value={settings.masterVolume}
              onChange={(e) => handleChange('masterVolume', parseFloat(e.target.value))}
              className="accent-cyan-400 cursor-pointer h-1.5 w-full bg-slate-800 rounded-lg outline-none"
            />
          </div>

          {/* SFX slider & switch */}
          <div className="flex flex-col gap-1 border-t border-slate-900 pt-3">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk-sfx"
                  checked={settings.sfxEnabled}
                  onChange={(e) => handleChange('sfxEnabled', e.target.checked)}
                  className="accent-cyan-400 rounded h-4 w-4 bg-slate-950"
                />
                <label htmlFor="chk-sfx" className="text-xs font-mono text-slate-300 cursor-pointer">
                  SOUND EFFECTS (SFX)
                </label>
              </div>
              <span className="text-xs font-mono text-cyan-400 font-bold">{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.0"
              step="0.05"
              disabled={!settings.sfxEnabled}
              value={settings.sfxVolume}
              onChange={(e) => handleChange('sfxVolume', parseFloat(e.target.value))}
              className="accent-cyan-400 cursor-pointer h-1.5 w-full bg-slate-800 rounded-lg outline-none disabled:opacity-40"
            />
          </div>

          {/* BGM slider & switch */}
          <div className="flex flex-col gap-1 border-t border-slate-900 pt-3">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk-bgm"
                  checked={settings.bgmEnabled}
                  onChange={(e) => handleChange('bgmEnabled', e.target.checked)}
                  className="accent-cyan-400 rounded h-4 w-4 bg-slate-950"
                />
                <label htmlFor="chk-bgm" className="text-xs font-mono text-slate-300 cursor-pointer">
                  SPACE AMBIENCE VOICE (BGM)
                </label>
              </div>
              <span className="text-xs font-mono text-cyan-400 font-bold">{Math.round(settings.bgmVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.0"
              step="0.05"
              disabled={!settings.bgmEnabled}
              value={settings.bgmVolume}
              onChange={(e) => handleChange('bgmVolume', parseFloat(e.target.value))}
              className="accent-cyan-400 cursor-pointer h-1.5 w-full bg-slate-800 rounded-lg outline-none disabled:opacity-40"
            />
          </div>

        </div>

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
