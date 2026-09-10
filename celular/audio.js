// Audio Engine using Web Audio API for Retro Chiptune Sound Effects & Music
class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.musicPlaying = false;
        this.musicMode = null;
        this.lastMusicMode = 'stage';
        this.musicTimer = null;
        this.musicGain = null;
        this.noiseBuffer = null;
        this.currentNarration = null;
        this.pendingNarration = null;
        this.pendingMusicMode = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.setValueAtTime(0.28, this.ctx.currentTime);
            this.musicGain.connect(this.ctx.destination);
            this.noiseBuffer = this.createNoiseBuffer();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported', e);
        }
    }

    createNoiseBuffer() {
        if (!this.ctx) return null;
        try {
            const bufferSize = this.ctx.sampleRate * 1;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            return buffer;
        } catch (e) {
            return null;
        }
    }

    resume() {
        this.init();
        if (!this.ctx) return Promise.resolve();

        const startPendingAudio = () => {
            if (this.muted) return;
            const musicMode = this.pendingMusicMode;
            this.pendingMusicMode = null;
            if (musicMode && !this.musicPlaying) this.startMusic(musicMode);

            const narration = this.pendingNarration;
            this.pendingNarration = null;
            if (narration) {
                this.playNarration(narration.audioPath, narration.fallbackText, narration.voiceHint, true);
            }
        };

        if (this.ctx.state === 'suspended') {
            return this.ctx.resume().then(startPendingAudio).catch(() => {});
        }
        startPendingAudio();
        return Promise.resolve();
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            if (this.musicGain && this.ctx) {
                try { this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime); } catch (e) {}
            }
            if (this.musicPlaying) this.stopMusic();
            this.stopNarration();
        } else {
            if (this.musicGain && this.ctx) {
                try { this.musicGain.gain.setValueAtTime(0.28, this.ctx.currentTime); } catch (e) {}
            }
            if (!this.musicPlaying) {
                this.startMusic(this.lastMusicMode || 'stage');
            }
        }
        return this.muted;
    }

    playJump() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playCollect(type = 'trash') {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'triangle';
        osc2.type = 'sine';

        const baseFreq = type === 'star' ? 660 : 523.25; // C5 or E5
        osc1.frequency.setValueAtTime(baseFreq, now);
        osc1.frequency.setValueAtTime(baseFreq * 1.5, now + 0.08); // G5
        osc2.frequency.setValueAtTime(baseFreq * 2, now + 0.08); // C6

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now + 0.08);
        osc1.stop(now + 0.35);
        osc2.stop(now + 0.35);
    }

    playBump() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    playHurt() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    playHorn() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        [349.23, 440.0].forEach(freq => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.35);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
        });
    }

    playTurbo() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    playVictory() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        // Mario stage clear inspired fanfare: C4, E4, G4, C5, E5, G5, C6
        const notes = [
            { f: 261.63, t: 0.0, d: 0.12 },
            { f: 329.63, t: 0.12, d: 0.12 },
            { f: 392.00, t: 0.24, d: 0.12 },
            { f: 523.25, t: 0.36, d: 0.18 },
            { f: 440.00, t: 0.54, d: 0.12 },
            { f: 523.25, t: 0.66, d: 0.12 },
            { f: 659.25, t: 0.78, d: 0.12 },
            { f: 783.99, t: 0.90, d: 0.45 }
        ];
        notes.forEach(note => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(note.f, now + note.t);
            gain.gain.setValueAtTime(0.2, now + note.t);
            gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + note.t);
            osc.stop(now + note.t + note.d);
        });
    }

    playDockBeep() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(950, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    playDockSuccess() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((f, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, now + idx * 0.08);
            gain.gain.setValueAtTime(0.18, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.15);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.15);
        });
    }

    playHydraulic() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.linearRampToValueAtTime(160, now + 0.12);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
    }

    playDumpRumble() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(65, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playThunder() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + 1.1);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.15, now + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 1.3);
    }

    playTimingHitPerfect() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        // Bright victory arpeggio: C6, E6, G6, C7
        [1046.50, 1318.51, 1567.98, 2093.00].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);
            gain.gain.setValueAtTime(0.2, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.2);
        });
    }

    playTimingHitGood() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        // Pleasant double-chime: G5, C6
        [783.99, 1046.50].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);
            gain.gain.setValueAtTime(0.18, now + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.18);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.07);
            osc.stop(now + idx * 0.07 + 0.18);
        });
    }

    playTimingHitMiss() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        // Low buzz warning tone
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.25);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    playEngineBrake() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(55, now);
        osc.frequency.linearRampToValueAtTime(32, now + 0.35);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    }

    playDuneJump() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.28);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
    }

    playCargoRattle() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        [240, 310, 190].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + idx * 0.03);
            gain.gain.setValueAtTime(0.08, now + idx * 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.06);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.03);
            osc.stop(now + idx * 0.03 + 0.06);
        });
    }

    playScaleBeep() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        [880, 1174.66].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.1);
            gain.gain.setValueAtTime(0.18, now + idx * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.09);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.1);
            osc.stop(now + idx * 0.1 + 0.09);
        });
    }

    playTractorEngine(moving = false) {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const baseFreq = moving ? 52 : 38;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.linearRampToValueAtTime(baseFreq + (moving ? 18 : 6), now + 0.12);
        gain.gain.setValueAtTime(moving ? 0.14 : 0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playTractorBlade() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(75, now + 0.22);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
    }

    playTurbineWhine(pitchFactor = 1.0) {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const startFreq = 220 * pitchFactor;
        const endFreq = 440 * pitchFactor;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.25);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    playAeratorSplash() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        [160, 240, 190].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.04);
            gain.gain.setValueAtTime(0.09, now + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.08);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.04);
            osc.stop(now + idx * 0.04 + 0.08);
        });
    }

    playPowerGridBeep() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);
            gain.gain.setValueAtTime(0.18, now + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.07);
            osc.stop(now + idx * 0.07 + 0.12);
        });
    }

    playPurgeValve() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        // Pneumatic steam/air hiss
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    playLabBeep() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        [880, 1174.66, 1760].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.16, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.12);
        });
    }

    playDramaticSting() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        // Deep menacing low chord with distortion-like sawtooth
        [110, 116.54, 164.81].forEach((freq) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + 0.65);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.65);
        });
    }

    playTextBlip() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(520 + Math.random() * 80, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
    }

    playVillainChuckle() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        // 3 descending sarcastic staccato laugh notes
        [220, 185, 146.83].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            const t = now + idx * 0.14;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.1);
        });
    }

    playFanfare() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        // Triumphant victory brass arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            const t = now + idx * 0.12;
            const dur = idx === 3 ? 0.6 : 0.18;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + dur);
        });
    }

    playNarration(audioPath, fallbackText, voiceHint = 'thalita', fromUserGesture = false) {
        this.stopNarration();
        if (this.muted) return null;

        try {
            if (typeof Audio !== 'undefined') {
                const audio = new Audio(audioPath);
                audio.volume = 1.0;
                this.currentNarration = audio;
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch((err) => {
                        this.currentNarration = null;
                        if (fromUserGesture) {
                            console.warn('HTML5 Audio indisponível; usando síntese de voz.', err);
                            this.playSpeechFallback(fallbackText, voiceHint);
                        } else {
                            this.pendingNarration = { audioPath, fallbackText, voiceHint };
                        }
                    });
                }
                return audio;
            }
        } catch (e) {
            console.warn('Error creating audio for narration', e);
        }

        this.playSpeechFallback(fallbackText, voiceHint);
        return null;
    }

    playSpeechFallback(text, voiceHint = 'thalita') {
        if (this.muted || typeof window === 'undefined' || !window.speechSynthesis) return;
        try {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = 'pt-BR';
            const voices = window.speechSynthesis.getVoices();
            if (voiceHint === 'antonio') {
                const antonioVoice = voices.find(v => 
                    v.name.includes('Antonio') || 
                    v.name.includes('Antônio') || 
                    (v.lang === 'pt-BR' && (v.name.includes('Male') || v.name.includes('Natural'))) ||
                    v.lang === 'pt-BR' ||
                    v.lang.startsWith('pt')
                );
                if (antonioVoice) utter.voice = antonioVoice;
                utter.rate = 1.0;
                utter.pitch = 0.95;
            } else {
                const thalitaVoice = voices.find(v => v.name.includes('Thalita')) ||
                    voices.find(v =>
                        v.name.includes('Francisca') ||
                        (v.lang === 'pt-BR' && (v.name.includes('Female') || v.name.includes('Natural'))) ||
                        v.lang === 'pt-BR' ||
                        v.lang.startsWith('pt')
                    );
                if (thalitaVoice) utter.voice = thalitaVoice;
                utter.rate = 1.02;
                utter.pitch = 1.02;
            }
            window.speechSynthesis.speak(utter);
        } catch (e) {
            console.warn('SpeechSynthesis error', e);
        }
    }

    stopNarration() {
        this.pendingNarration = null;
        if (this.currentNarration) {
            try {
                this.currentNarration.pause();
                this.currentNarration.currentTime = 0;
            } catch (e) {}
            this.currentNarration = null;
        }
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            try {
                window.speechSynthesis.cancel();
            } catch (e) {}
        }
    }

    startMusic(mode = 'stage') {
        this.lastMusicMode = mode;
        if (this.muted) {
            return;
        }
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state !== 'running') {
            this.pendingMusicMode = mode;
            return;
        }

        // If already playing the requested mode, maintain continuous loop
        if (this.musicPlaying && this.musicMode === mode) return;

        // Switching mode
        if (this.musicPlaying) {
            this.stopMusic();
        }

        this.musicPlaying = true;
        this.musicMode = mode;
        this.pendingMusicMode = null;

        if (this.musicGain && this.ctx) {
            try { this.musicGain.gain.setValueAtTime(0.28, this.ctx.currentTime); } catch (e) {}
        }

        const NOTE_FREQS = {
            'A1': 55.00, 'Bb1': 58.27, 'B1': 61.74,
            'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'Eb2': 77.78, 'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'Ab2': 103.83, 'A2': 110.00, 'Bb2': 116.54, 'B2': 123.47,
            'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'Eb3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'Ab3': 207.65, 'A3': 220.00, 'Bb3': 233.08, 'B3': 246.94,
            'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'Eb4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'Ab4': 415.30, 'A4': 440.00, 'Bb4': 466.16, 'B4': 493.88,
            'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'Eb5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'Ab5': 830.61, 'A5': 880.00, 'Bb5': 932.33, 'B5': 987.77,
            'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51, 'F6': 1396.91, 'G6': 1567.98,
            '-': 0
        };

        // TRACK DEFINITIONS
        let bpm, stepDur, totalSteps;
        let leadNotes, harmNotes, bassNotes, drumEvents;
        let leadType = 'square';

        if (mode === 'boss') {
            // Intense, fast 8-bit Boss Battle (148 BPM, D minor)
            bpm = 148;
            stepDur = 60.0 / (bpm * 4.0); // ~0.101s
            totalSteps = 64;
            leadType = 'sawtooth';

            leadNotes = [
                'D4', '-', 'F4', '-', 'Ab4', '-', 'A4', '-', 'D5', '-', '-', '-', 'C5', '-', 'Bb4', '-',
                'A4', '-', 'Ab4', '-', 'A4', '-', 'F4', '-', 'D4', '-', '-', '-', 'E4', '-', 'F4', '-',
                'Bb4', '-', 'D5', '-', 'F5', '-', 'E5', '-', 'D5', '-', 'C#5', '-', 'D5', '-', '-', '-',
                'C#5', '-', 'E5', '-', 'A5', '-', 'G5', '-', 'F5', 'E5', 'D5', 'C#5', 'D5', '-', '-', '-'
            ];

            harmNotes = [
                'D4', 'F4', 'A4', 'D5', 'F5', 'D5', 'A4', 'F4', 'D4', 'F4', 'A4', 'D5', 'F5', 'D5', 'A4', 'F4',
                'C4', 'E4', 'G4', 'C5', 'E5', 'C5', 'G4', 'E4', 'C4', 'E4', 'G4', 'C5', 'E5', 'C5', 'G4', 'E4',
                'Bb3', 'D4', 'F4', 'Bb4', 'D5', 'Bb4', 'F4', 'D4', 'Bb3', 'D4', 'F4', 'Bb4', 'D5', 'Bb4', 'F4', 'D4',
                'A3', 'C#4', 'E4', 'A4', 'C#5', 'A4', 'E4', 'C#4', 'A3', 'C#4', 'E4', 'A4', 'C#5', 'A4', 'E4', 'C#4'
            ];

            bassNotes = [
                'D2', 'D2', 'D3', 'D2', 'D2', 'D2', 'F2', 'G2', 'D2', 'D2', 'D3', 'D2', 'C2', 'C#2', 'D2', '-',
                'C2', 'C2', 'C3', 'C2', 'C2', 'C2', 'E2', 'F2', 'C2', 'C2', 'C3', 'C2', 'Bb1', 'B1', 'C2', '-',
                'Bb1', 'Bb1', 'Bb2', 'Bb1', 'Bb1', 'Bb1', 'D2', 'Eb2', 'Bb1', 'Bb1', 'Bb2', 'Bb1', 'A1', 'Bb1', 'B1', '-',
                'A1', 'A1', 'A2', 'A1', 'A1', 'A1', 'C#2', 'D2', 'A1', 'A1', 'A2', 'A1', 'G1', 'A1', 'C#2', '-'
            ];

            drumEvents = [
                'K', 'H', 'S', 'H', 'K', 'H', 'S', 'H', 'K', 'H', 'S', 'H', 'K', 'H', 'S', 'H',
                'K', 'H', 'S', 'H', 'K', 'H', 'S', 'H', 'K', 'H', 'S', 'H', 'K', 'H', 'S', 'H',
                'K', 'H', 'S', 'H', 'K', 'H', 'S', 'H', 'K', 'H', 'S', 'H', 'K', 'H', 'S', 'H',
                'K', 'H', 'S', 'H', 'K', 'H', 'S', 'H', 'K', 'H', 'S', 'H', 'S', 'S', 'S', 'S'
            ];
        } else {
            // Hino de Parnamirim Chiptune - Super Mario Bros style (114 BPM, C Major)
            bpm = 114;
            stepDur = 60.0 / (bpm * 4.0); // ~0.131s
            totalSteps = 144;
            leadType = 'square';

            leadNotes = [
                // Fanfare Intro (Mario style fanfare!)
                'G4', 'G4', 'G4', '-', 'C5', '-', 'E5', '-', 'G5', '-', '-', '-', 'G5', '-', '-', '-',
                'A5', '-', 'G5', '-', 'F5', '-', 'E5', '-', 'D5', '-', 'G4', '-', 'C5', '-', '-', '-',
                // "Como flecha que voa bem alto..."
                'G4', '-', 'C5', '-', 'C5', 'D5', 'E5', '-', 'E5', '-', 'E5', 'F5', 'G5', '-', '-', '-',
                // "no horizonte buscando o porvir..."
                'A5', '-', 'G5', '-', 'F5', '-', 'E5', '-', 'D5', '-', 'C5', '-', 'D5', '-', '-', '-',
                // "Parnamirim é um marco de glória..."
                'G4', '-', 'D5', '-', 'D5', 'E5', 'F5', '-', 'F5', '-', 'F5', 'G5', 'A5', '-', '-', '-',
                // "que a história haverá de florir..."
                'B5', '-', 'A5', '-', 'G5', '-', 'F5', '-', 'E5', '-', 'D5', '-', 'C5', '-', '-', '-',
                // "Parnamirim, cidade formosa..."
                'E5', '-', 'G5', '-', 'C6', '-', 'B5', 'A5', 'G5', '-', 'F5', '-', 'E5', '-', '-', '-',
                // "o teu povo te faz triunfar!"
                'F5', '-', 'A5', '-', 'D6', '-', 'C6', 'B5', 'A5', '-', 'G5', '-', 'F5', '-', '-', '-',
                // Climax & Loop Turnaround
                'G5', '-', 'C6', '-', 'E6', '-', 'D6', 'C6', 'B5', 'A5', 'G5', 'F5', 'E5', 'D5', 'C5', '-'
            ];

            harmNotes = [
                'E4', 'E4', 'E4', '-', 'G4', '-', 'C5', '-', 'E5', '-', '-', '-', 'E5', '-', '-', '-',
                'F5', '-', 'E5', '-', 'D5', '-', 'C5', '-', 'B4', '-', 'F4', '-', 'E4', '-', '-', '-',
                'E4', '-', 'G4', '-', 'G4', 'B4', 'C5', '-', 'C5', '-', 'C5', 'D5', 'E5', '-', '-', '-',
                'F5', '-', 'E5', '-', 'D5', '-', 'C5', '-', 'B4', '-', 'A4', '-', 'B4', '-', '-', '-',
                'B4', '-', 'B4', '-', 'B4', 'C5', 'D5', '-', 'D5', '-', 'D5', 'E5', 'F5', '-', '-', '-',
                'G5', '-', 'F5', '-', 'E5', '-', 'D5', '-', 'C5', '-', 'B4', '-', 'C5', '-', '-', '-',
                'C5', '-', 'E5', '-', 'G5', '-', 'G5', 'F5', 'E5', '-', 'D5', '-', 'C5', '-', '-', '-',
                'D5', '-', 'F5', '-', 'A5', '-', 'A5', 'G5', 'F5', '-', 'E5', '-', 'D5', '-', '-', '-',
                'E5', '-', 'G5', '-', 'C6', '-', 'B5', 'A5', 'G5', 'F5', 'E5', 'D5', 'C5', 'B4', 'C5', '-'
            ];

            bassNotes = [
                'C3', '-', '-', '-', 'G2', '-', '-', '-', 'C3', '-', '-', '-', 'G2', '-', '-', '-',
                'F2', '-', '-', '-', 'G2', '-', '-', '-', 'G2', '-', 'B2', '-', 'C3', '-', 'G2', '-',
                'C3', '-', 'E3', '-', 'G3', '-', 'C4', '-', 'A2', '-', 'C3', '-', 'E3', '-', 'A3', '-',
                'F2', '-', 'A2', '-', 'C3', '-', 'F3', '-', 'G2', '-', 'B2', '-', 'D3', '-', 'G3', '-',
                'G2', '-', 'B2', '-', 'D3', '-', 'G3', '-', 'D3', '-', 'F#3', '-', 'A3', '-', 'D4', '-',
                'G2', '-', 'B2', '-', 'D3', '-', 'G3', '-', 'C3', '-', 'E3', '-', 'G3', '-', 'C4', '-',
                'C3', '-', 'G3', '-', 'C4', '-', 'G3', '-', 'F2', '-', 'C3', '-', 'F3', '-', 'C3', '-',
                'D3', '-', 'A3', '-', 'D4', '-', 'A3', '-', 'G2', '-', 'D3', '-', 'G3', '-', 'D3', '-',
                'C3', '-', 'E3', '-', 'G3', '-', 'C4', '-', 'G2', '-', 'B2', '-', 'C3', 'G2', 'C3', '-'
            ];

            drumEvents = [
                'K', '-', 'H', '-', 'S', '-', 'H', '-', 'K', '-', 'H', '-', 'S', '-', 'H', '-'
            ];
        }

        let step = 0;
        const playStep = () => {
            if (!this.musicPlaying || this.muted || !this.ctx) return;
            const now = this.ctx.currentTime;
            const dest = this.musicGain || this.ctx.destination;

            // 1. Lead Melody Channel
            const leadNote = leadNotes[step % leadNotes.length];
            const leadFreq = NOTE_FREQS[leadNote] || 0;
            if (leadFreq > 0) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = leadType;
                osc.frequency.setValueAtTime(leadFreq, now);
                const leadVol = mode === 'boss' ? 0.16 : 0.14;
                gain.gain.setValueAtTime(leadVol, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + stepDur * 0.85);
                osc.connect(gain);
                gain.connect(dest);
                osc.start(now);
                osc.stop(now + stepDur * 0.85);
            }

            // 2. Harmony / Arpeggio Channel
            const harmNote = harmNotes[step % harmNotes.length];
            const harmFreq = NOTE_FREQS[harmNote] || 0;
            if (harmFreq > 0) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(harmFreq, now);
                const harmVol = mode === 'boss' ? 0.10 : 0.08;
                gain.gain.setValueAtTime(harmVol, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + stepDur * 0.75);
                osc.connect(gain);
                gain.connect(dest);
                osc.start(now);
                osc.stop(now + stepDur * 0.75);
            }

            // 3. Bass Channel (Triangle Wave)
            const bassNote = bassNotes[step % bassNotes.length];
            const bassFreq = NOTE_FREQS[bassNote] || 0;
            if (bassFreq > 0) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(bassFreq, now);
                const bassVol = mode === 'boss' ? 0.22 : 0.20;
                gain.gain.setValueAtTime(bassVol, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + stepDur * 0.90);
                osc.connect(gain);
                gain.connect(dest);
                osc.start(now);
                osc.stop(now + stepDur * 0.90);
            }

            // 4. Drum Channel
            const drumEvent = drumEvents[step % drumEvents.length];
            if (drumEvent === 'K') { // Kick
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(35, now + stepDur * 0.75);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + stepDur * 0.75);
                osc.connect(gain);
                gain.connect(dest);
                osc.start(now);
                osc.stop(now + stepDur * 0.75);
            } else if (drumEvent === 'S') { // Snare
                if (this.noiseBuffer) {
                    const noise = this.ctx.createBufferSource();
                    noise.buffer = this.noiseBuffer;
                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'highpass';
                    filter.frequency.setValueAtTime(800, now);
                    const gain = this.ctx.createGain();
                    gain.gain.setValueAtTime(0.14, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + stepDur * 0.70);
                    noise.connect(filter);
                    filter.connect(gain);
                    gain.connect(dest);
                    noise.start(now);
                    noise.stop(now + stepDur * 0.70);
                }
            } else if (drumEvent === 'H') { // Hi-hat
                if (this.noiseBuffer) {
                    const noise = this.ctx.createBufferSource();
                    noise.buffer = this.noiseBuffer;
                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'highpass';
                    filter.frequency.setValueAtTime(4500, now);
                    const gain = this.ctx.createGain();
                    gain.gain.setValueAtTime(0.05, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
                    noise.connect(filter);
                    filter.connect(gain);
                    gain.connect(dest);
                    noise.start(now);
                    noise.stop(now + 0.04);
                }
            }

            step = (step + 1) % totalSteps;
            this.musicTimer = setTimeout(playStep, stepDur * 1000);
        };

        playStep();
    }

    stopMusic() {
        this.musicPlaying = false;
        this.musicMode = null;
        if (this.musicTimer) {
            clearTimeout(this.musicTimer);
            this.musicTimer = null;
        }
    }
}

window.soundManager = new SoundManager();
