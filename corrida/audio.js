// Sistema de Áudio Procedural via Web Audio API para o Cajulim Endless Runner 3D
class RunnerAudioManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicPlaying = false;
    this.musicTimer = null;
    this.comboPitch = 1.0;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
    return this.muted;
  }

  // Coleta de reciclável: Chime harmonioso com escala musical crescente por combo
  playCollect(combo = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // C5, D5, E5, G5, A5, C6
    const baseFreq = notes[Math.min(notes.length - 1, (combo - 1) % notes.length)];

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.12);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  // Troca rápida de faixa: Whoosh estéreo de ar
  playLaneSwitch() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.09);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Pulo ágil
  playJump() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(620, t + 0.18);

    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  // Deslize com atrito
  playSlide() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.25);

    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  // Batida / Colisão
  playCrash() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.35);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.4);
  }

  // Ativação de Ímã / Turbo Power-up
  playPowerup() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [392.00, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const delay = t + i * 0.05;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, delay);

      gain.gain.setValueAtTime(0.18, delay);
      gain.gain.exponentialRampToValueAtTime(0.001, delay + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(delay);
      osc.stop(delay + 0.15);
    });
  }

  // Trilha sonora procedural leve e contagiante estilo endless runner
  startMusic() {
    if (this.muted || this.musicPlaying) return;
    this.init();
    if (!this.ctx) return;

    this.musicPlaying = true;
    let step = 0;
    const bassline = [130.81, 130.81, 164.81, 174.61, 196.00, 196.00, 174.61, 146.83];

    const playBeat = () => {
      if (!this.musicPlaying || this.muted) return;
      const t = this.ctx.currentTime;

      // Baixo rítmico
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(bassline[step % bassline.length], t);
      bassGain.gain.setValueAtTime(0.09, t);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      bassOsc.connect(bassGain);
      bassGain.connect(this.ctx.destination);
      bassOsc.start(t);
      bassOsc.stop(t + 0.18);

      // Hi-hat leve a cada tempo
      const noise = this.ctx.createOscillator();
      const noiseGain = this.ctx.createGain();
      noise.type = 'square';
      noise.frequency.setValueAtTime(step % 2 === 0 ? 800 : 1200, t);
      noiseGain.gain.setValueAtTime(0.02, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      noise.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(t);
      noise.stop(t + 0.04);

      step++;
      this.musicTimer = setTimeout(playBeat, 220);
    };

    playBeat();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

window.runnerAudio = new RunnerAudioManager();
