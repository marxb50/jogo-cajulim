const assert = require('assert');

const listeners = new Map();
const spoken = [];
const speechSynthesis = {
    speaking: false,
    cancel() { this.speaking = false; },
    getVoices() { return []; },
    speak(utterance) {
        spoken.push(utterance);
        this.speaking = true;
    }
};

global.document = {
    visibilityState: 'visible',
    addEventListener(type, listener) { listeners.set(`document:${type}`, listener); }
};
global.window = {
    addEventListener(type, listener) { listeners.set(`window:${type}`, listener); },
    speechSynthesis,
    AudioContext: class MockAudioContext {
        constructor() {
            this.state = 'running';
            this.sampleRate = 8000;
            this.currentTime = 0;
            this.destination = {};
        }
        createGain() { return { gain: { setValueAtTime() {} }, connect() {} }; }
        createBuffer(channels, length) {
            return { getChannelData() { return new Float32Array(length); } };
        }
        resume() { this.state = 'running'; return Promise.resolve(); }
    }
};
global.SpeechSynthesisUtterance = class MockUtterance {
    constructor(text) { this.text = text; this.onend = null; this.onerror = null; }
};

let playPlans = [];
let playCount = 0;
let lateReject = null;
class MockAudio {
    constructor(src) {
        this.src = src;
        this.volume = 1;
        this.preload = '';
        this.playsInline = false;
        this.paused = true;
        this.ended = false;
        this.currentTime = 0;
        this.duration = 12;
        this.handlers = new Map();
        MockAudio.instances.push(this);
    }
    addEventListener(type, callback) { this.handlers.set(type, callback); }
    emit(type) {
        const callback = this.handlers.get(type);
        if (callback) callback();
    }
    play() {
        playCount += 1;
        const plan = playPlans.shift() || 'resolve';
        if (plan === 'late-reject') {
            this.paused = true;
            return new Promise((resolve, reject) => { lateReject = reject; });
        }
        if (plan === 'reject') {
            this.paused = true;
            return Promise.reject(new Error('NotAllowedError'));
        }
        this.paused = false;
        queueMicrotask(() => this.emit('playing'));
        return Promise.resolve();
    }
    pause() { this.paused = true; }
}
MockAudio.instances = [];
global.Audio = MockAudio;

const { SoundManager } = require('./audio.js');
const flush = () => new Promise(resolve => setImmediate(resolve));
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

(async () => {
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
        const manager = new SoundManager();

        // A intenção precisa existir imediatamente, antes do catch assíncrono
        // do autoplay. O primeiro gesto deve ser consumido apenas para a fala.
        playPlans = ['late-reject', 'resolve'];
        manager.playNarration('fala-1.mp3', 'Fala um', 'thalita');
        assert.ok(manager.pendingNarration, 'A locução deve ficar registrada durante a tentativa inicial');
        listeners.get('window:pageshow')();
        assert.strictEqual(playCount, 1, 'pageshow não deve duplicar uma tentativa de áudio ainda pendente');
        const consumed = manager.resumeFromGesture();
        assert.strictEqual(consumed, true, 'O primeiro gesto deve indicar que retomou uma locução');
        assert.strictEqual(playCount, 2, 'O gesto deve tentar a locução novamente imediatamente');
        await flush();
        assert.strictEqual(manager.pendingNarration, null, 'A fala iniciada deve sair da fila pendente');
        const playingAudio = manager.currentNarration;
        assert.ok(playingAudio && !playingAudio.paused, 'A locução deve estar tocando após o gesto');

        // Uma rejeição antiga chegando atrasada não pode cancelar a nova fala.
        lateReject(new Error('Autoplay bloqueado na tentativa antiga'));
        await flush();
        assert.strictEqual(manager.currentNarration, playingAudio);

        // Girar o celular e entrar em tela cheia devem retomar a mesma fala.
        playingAudio.paused = true;
        playPlans = ['resolve'];
        listeners.get('window:orientationchange')();
        await wait(230);
        assert.strictEqual(manager.currentNarration, playingAudio);
        assert.strictEqual(playingAudio.paused, false);

        playingAudio.paused = true;
        playPlans = ['resolve'];
        listeners.get('document:fullscreenchange')();
        await wait(170);
        assert.strictEqual(manager.currentNarration, playingAudio);
        assert.strictEqual(playingAudio.paused, false, 'A entrada em tela cheia deve recuperar a locução');

        // Erro de rede depois de play() resolvido deve preservar a fala; se a
        // repetição também falhar, a síntese de voz assume e continua ativa.
        playPlans = ['resolve'];
        manager.playNarration('fala-2.mp3', 'Fala dois', 'thalita', true);
        await flush();
        const networkAudio = manager.currentNarration;
        const speechCountBeforeNetworkError = spoken.length;
        networkAudio.error = new Error('Falha de rede');
        networkAudio.emit('error');
        assert.ok(manager.pendingNarration, 'Erro tardio deve guardar a locução para nova tentativa');
        assert.strictEqual(spoken.length, speechCountBeforeNetworkError, 'Erro tardio não pode iniciar fallback fora de um gesto');

        playPlans = ['reject'];
        assert.strictEqual(manager.resumeFromGesture(), true);
        await flush();
        assert.strictEqual(spoken.at(-1).text, 'Fala dois', 'A voz sintética deve substituir um MP3 indisponível');
        assert.strictEqual(manager.isNarrationActiveOrPending(), true, 'O fallback deve ser acompanhado como fala ativa');
        spoken.at(-1).onend();
        speechSynthesis.speaking = false;
        assert.strictEqual(manager.isNarrationActiveOrPending(), false);

        manager.stopNarration();
        assert.strictEqual(manager.pendingNarration, null);
        assert.strictEqual(manager.currentNarration, null);
        assert.strictEqual(manager.currentSpeechNarration, null);
    } finally {
        console.warn = originalWarn;
    }

    console.log('✓ Locução: autoplay, primeiro gesto, orientação, erro de rede e fallback protegidos.');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
