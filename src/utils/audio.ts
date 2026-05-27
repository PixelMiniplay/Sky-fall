class AudioManager {
  private ctx: AudioContext | null = null;
  private masterVolume: number = 0.5;
  private sfxVolume: number = 0.6;
  private bgmVolume: number = 0.3;
  private sfxEnabled: boolean = true;
  private bgmEnabled: boolean = true;

  // Background Synth state
  private bgmNodes: {
    oscillators: OscillatorNode[];
    filter: BiquadFilterNode;
    gain: GainNode;
  } | null = null;
  private bgmInterval: any = null;

  constructor() {
    // Load settings from localStorage
    try {
      this.sfxEnabled = localStorage.getItem('starfall-sfx-enabled') !== 'false';
      this.bgmEnabled = localStorage.getItem('starfall-bgm-enabled') !== 'false';
      this.masterVolume = parseFloat(localStorage.getItem('starfall-volume-master') || '0.5');
      this.sfxVolume = parseFloat(localStorage.getItem('starfall-volume-sfx') || '0.6');
      this.bgmVolume = parseFloat(localStorage.getItem('starfall-volume-bgm') || '0.3');
    } catch (e) {
      // safe fallback
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getSettings() {
    return {
      masterVolume: this.masterVolume,
      sfxVolume: this.sfxVolume,
      bgmVolume: this.bgmVolume,
      sfxEnabled: this.sfxEnabled,
      bgmEnabled: this.bgmEnabled,
    };
  }

  public setSettings(settings: {
    masterVolume?: number;
    sfxVolume?: number;
    bgmVolume?: number;
    sfxEnabled?: boolean;
    bgmEnabled?: boolean;
  }) {
    if (settings.masterVolume !== undefined) this.masterVolume = settings.masterVolume;
    if (settings.sfxVolume !== undefined) this.sfxVolume = settings.sfxVolume;
    if (settings.bgmVolume !== undefined) this.bgmVolume = settings.bgmVolume;
    if (settings.sfxEnabled !== undefined) this.sfxEnabled = settings.sfxEnabled;
    if (settings.bgmEnabled !== undefined) {
      this.bgmEnabled = settings.bgmEnabled;
      if (!this.bgmEnabled) {
        this.stopBGM();
      } else {
        this.startBGM();
      }
    }

    // Save to localStorage
    try {
      localStorage.setItem('starfall-sfx-enabled', String(this.sfxEnabled));
      localStorage.setItem('starfall-bgm-enabled', String(this.bgmEnabled));
      localStorage.setItem('starfall-volume-master', String(this.masterVolume));
      localStorage.setItem('starfall-volume-sfx', String(this.sfxVolume));
      localStorage.setItem('starfall-volume-bgm', String(this.bgmVolume));
    } catch (e) {
      // safe fallback
    }

    // Adjust active BGM node volumes if running
    if (this.bgmNodes && this.bgmNodes.gain) {
      this.bgmNodes.gain.gain.setValueAtTime(this.bgmEnabled ? this.bgmVolume * this.masterVolume : 0, this.ctx?.currentTime || 0);
    }
  }

  /**
   * Play clean click feedback sound
   */
  public playClick() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.4, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  /**
   * Play chirpy ascending sound for picking up items (stars)
   */
  public playCollectStar(combo: number = 0) {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.type = 'sine';
    // Pitch rises depending on combo to represent combo escalation musically!
    const baseFreq = 500 + combo * 80;
    osc.frequency.setValueAtTime(baseFreq, time);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.1, time + 0.15);

    gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.35, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    osc.start();
    osc.stop(time + 0.15);
  }

  /**
   * Play exciting sound for picking up a regular powerup (Shield, Magnet, etc)
   */
  public playPowerUp(type: string) {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.type = 'sawtooth';
    osc2.type = 'sine';

    let freq = 340;
    if (type === 'shield') freq = 440;
    if (type === 'magnet') freq = 330;
    if (type === 'bomb') freq = 520;

    osc1.frequency.setValueAtTime(freq, time);
    osc1.frequency.linearRampToValueAtTime(freq * 1.5, time + 0.1);
    osc1.frequency.linearRampToValueAtTime(freq * 2.2, time + 0.25);

    osc2.frequency.setValueAtTime(freq * 1.01, time);
    osc2.frequency.linearRampToValueAtTime(freq * 1.5 * 1.01, time + 0.1);
    osc2.frequency.linearRampToValueAtTime(freq * 2.2 * 1.01, time + 0.25);

    gain.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.22, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    osc1.start();
    osc2.start();
    osc1.stop(time + 0.25);
    osc2.stop(time + 0.25);
  }

  /**
   * Base explosion (low frequency noise synthesis)
   */
  public playCrash() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const dur = 0.45;

    // We can simulate an explosion noise buffer
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const filterNode = this.ctx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.Q.setValueAtTime(1.5, time);
    filterNode.frequency.setValueAtTime(350, time);
    filterNode.frequency.exponentialRampToValueAtTime(40, time + dur);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.75, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noiseNode.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    // Also inject a low pitched rumble sine osc to make it feel meaty
    const rumble = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    rumble.type = 'sine';
    rumble.frequency.setValueAtTime(100, time);
    rumble.frequency.linearRampToValueAtTime(20, time + dur);
    rumbleGain.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.7, time);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    rumble.connect(rumbleGain);
    rumbleGain.connect(this.ctx.destination);

    noiseNode.start();
    rumble.start();
    
    noiseNode.stop(time + dur);
    rumble.stop(time + dur);
  }

  /**
   * Sound effect when a shield gets destroyed
   */
  public playShieldBreak() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc1.type = 'triangle';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(800, time);
    osc1.frequency.setValueAtTime(150, time + 0.05);

    osc2.frequency.setValueAtTime(820, time);
    osc2.frequency.setValueAtTime(120, time + 0.05);

    gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.65, time);
    gainNode.gain.exponentialRampToValueAtTime(0.005, time + 0.3);

    osc1.start();
    osc2.start();
    osc1.stop(time + 0.35);
    osc2.stop(time + 0.35);
  }

  /**
   * Bomb blast sweep effect clearing space around
   */
  public playBombExplosion() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const dur = 0.85;

    // Noise node
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
       data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(120, time + dur);
    filter.Q.setValueAtTime(5, time);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.85, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    // Deep sub drop
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, time);
    sub.frequency.linearRampToValueAtTime(30, time + dur);

    subGain.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.8, time);
    subGain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    sub.connect(subGain);
    subGain.connect(this.ctx.destination);

    noise.start();
    sub.start();

    noise.stop(time + dur);
    sub.stop(time + dur);
  }

  /**
   * Majestic futuristic fan-fare sounded on level up
   */
  public playLevelUp() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio

    notes.forEach((freq, idx) => {
      const noteDelay = idx * 0.08;
      const osc = this.ctx!.createOscillator();
      const gainNode = this.ctx!.createGain();

      osc.connect(gainNode);
      gainNode.connect(this.ctx!.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time + noteDelay);

      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(this.sfxVolume * this.masterVolume * 0.25, time + noteDelay + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + noteDelay + 0.28);

      osc.start(time + noteDelay);
      osc.stop(time + noteDelay + 0.3);
    });
  }

  /**
   * Procedural Space Synth Pad loop playing chords in the background.
   */
  public startBGM() {
    if (!this.bgmEnabled) return;
    this.initContext();
    if (!this.ctx) return;
    if (this.bgmNodes) return; // Already running

    const time = this.ctx.currentTime;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, time);

    const bgmGainNode = this.ctx.createGain();
    bgmGainNode.gain.setValueAtTime(this.bgmVolume * this.masterVolume, time);

    filter.connect(bgmGainNode);
    bgmGainNode.connect(this.ctx.destination);

    this.bgmNodes = {
      oscillators: [],
      filter,
      gain: bgmGainNode,
    };

    // Progression of stellar space chords: Dm9, Am9, Gmaj9, Bbmaj9
    const chords = [
      [146.83, 220.00, 261.63, 293.66, 349.23], // Dm9: D3, A3, C4, D4, F4
      [110.00, 196.00, 220.00, 261.63, 329.63], // Am9: A2, G3, A3, C4, E4
      [196.00, 246.94, 293.66, 369.99, 440.00], // Gmaj9: G3, B3, D4, F#4, A4
      [116.54, 174.61, 233.08, 293.66, 349.23], // Bbmaj9: Bb2, F3, Bb3, D4, F4
    ];

    let currentChordIndex = 0;

    const playChord = () => {
      if (!this.ctx || !this.bgmEnabled || !this.bgmNodes) return;
      
      const chord = chords[currentChordIndex];
      const now = this.ctx.currentTime;
      const duration = 5.0; // 5 seconds per chord with long release values

      // Clear expired oscillators
      this.bgmNodes.oscillators = this.bgmNodes.oscillators.filter((osc) => {
        try {
          // just filter out ones that should have completed
          return (osc as any).endTime > now;
        } catch {
          return false;
        }
      });

      // Spawn synth voices
      chord.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const voiceGain = this.ctx!.createGain();

        // Connect
        osc.connect(voiceGain);
        voiceGain.connect(this.bgmNodes!.filter);

        // Slow, warm swell and release on chords
        osc.type = Math.random() > 0.4 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);

        // Modulate frequency slightly for space chorus effect
        osc.frequency.linearRampToValueAtTime(freq * (1 + 0.002 * Math.sin(now)), now + duration);

        voiceGain.gain.setValueAtTime(0, now);
        voiceGain.gain.linearRampToValueAtTime(0.08, now + 1.25); // slow swell
        voiceGain.gain.setValueAtTime(0.08, now + duration - 1.25);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration); // slow release

        osc.start(now);
        osc.stop(now + duration + 0.1);
        (osc as any).endTime = now + duration + 0.1;

        this.bgmNodes!.oscillators.push(osc);
      });

      // Modulate lowpass filter frequency dynamically (space LFO effect)
      this.bgmNodes.filter.frequency.cancelScheduledValues(now);
      this.bgmNodes.filter.frequency.setValueAtTime(250 + Math.random() * 150, now);
      this.bgmNodes.filter.frequency.exponentialRampToValueAtTime(180 + Math.random() * 250, now + duration);

      currentChordIndex = (currentChordIndex + 1) % chords.length;
    };

    // Trigger immediately
    playChord();

    // Loop
    this.bgmInterval = setInterval(playChord, 4750); // overlap of 250ms
  }

  public stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }

    if (this.bgmNodes) {
      const now = this.ctx?.currentTime || 0;
      this.bgmNodes.oscillators.forEach((osc) => {
        try {
          osc.stop(now + 0.2);
        } catch {
          // ignore
        }
      });
      if (this.bgmNodes.gain) {
        this.bgmNodes.gain.gain.setValueAtTime(0, now);
      }
      this.bgmNodes = null;
    }
  }
}

export const audio = new AudioManager();
