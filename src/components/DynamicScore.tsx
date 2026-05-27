import React, { useEffect, useState, useRef } from 'react';

interface DynamicScoreProps {
  score: number;
  highlightTrigger: number; // Increment changes key to highlight
}

export const DynamicScore: React.FC<DynamicScoreProps> = ({ score, highlightTrigger }) => {
  const [displayValue, setDisplayValue] = useState(score);
  const [pulse, setPulse] = useState(false);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    // Smoothed transition interpolation
    const startValue = displayValue;
    const endValue = score;
    if (startValue === endValue) return;

    const duration = 400; // ms
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const easedProgress = progress === 1.0 ? 1.0 : 1.0 - Math.pow(2, -10 * progress); // Ease Out Exponential

      const nextVal = Math.floor(startValue + (endValue - startValue) * easedProgress);
      setDisplayValue(nextVal);

      if (progress < 1.0) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [score]);

  // Handle pulse effects on picked items
  useEffect(() => {
    if (highlightTrigger === 0) return;
    setPulse(true);
    const timeout = setTimeout(() => setPulse(false), 240);
    return () => clearTimeout(timeout);
  }, [highlightTrigger]);

  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">PILOT SCORE</span>
      <div 
        className={`font-mono text-4xl sm:text-5xl font-black text-white tracking-widest select-none transition-all duration-200 ${
          pulse 
            ? 'text-cyan-400 scale-110 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]' 
            : 'text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.15)]'
        }`}
      >
        {displayValue.toLocaleString('en-US', { minimumIntegerDigits: 6, useGrouping: false })}
      </div>
    </div>
  );
};
