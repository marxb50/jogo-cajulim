const path = require('path');

function createContext() {
    const gradient = { addColorStop() {} };
    const target = {
        imageSmoothingEnabled: false,
        measureText(text) { return { width: String(text || '').length * 8 }; },
        createLinearGradient() { return gradient; },
        createRadialGradient() { return gradient; },
        createPattern() { return {}; },
        getImageData(x, y, width = 1, height = 1) {
            return { data: new Uint8ClampedArray(Math.max(1, width * height * 4)) };
        },
        isPointInPath() { return false; }
    };
    return new Proxy(target, {
        get(object, property) {
            if (property in object) return object[property];
            if (typeof property === 'symbol') return object[property];
            const noop = () => undefined;
            object[property] = noop;
            return noop;
        },
        set(object, property, value) {
            object[property] = value;
            return true;
        }
    });
}

function setupEnvironment({ search = '', hash = '' } = {}) {
    const context = createContext();
    const canvas = {
        width: 960,
        height: 540,
        style: {},
        getContext() { return context; },
        getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 540 }; },
        addEventListener() {},
        requestFullscreen: async () => {}
    };
    const elements = new Map();
    const element = () => ({
        classList: { add() {}, remove() {}, toggle() {} },
        style: {},
        textContent: '',
        innerHTML: '',
        addEventListener() {},
        setAttribute() {},
        removeAttribute() {}
    });

    global.document = {
        fullscreenElement: null,
        documentElement: { requestFullscreen: async () => {} },
        exitFullscreen: async () => {},
        getElementById(id) {
            if (id === 'gameCanvas') return canvas;
            if (!elements.has(id)) elements.set(id, element());
            return elements.get(id);
        },
        createElement(tag) {
            if (tag === 'canvas') return canvas;
            return element();
        }
    };

    const soundEvents = [];
    const soundManager = new Proxy({
        currentNarration: null,
        playNarration(file, text, voice) {
            soundEvents.push({ name: 'playNarration', file, text, voice });
        }
    }, {
        get(object, property) {
            if (property in object) return object[property];
            const recorder = (...args) => soundEvents.push({ name: String(property), args });
            object[property] = recorder;
            return recorder;
        }
    });

    global.window = {
        location: { search, hash },
        addEventListener() {},
        removeEventListener() {},
        soundManager,
        CAJULIM_NARRATIONS: require('./narrations.js')
    };
    global.navigator = { getGamepads: () => [] };
    global.performance = { now: () => Date.now() };
    global.requestAnimationFrame = () => 0;
    global.cancelAnimationFrame = () => {};
    global.Image = class MockImage {
        constructor() {
            this.width = 256;
            this.height = 256;
            this.naturalWidth = 256;
            this.naturalHeight = 256;
            this.complete = true;
        }
        addEventListener(event, callback) {
            if (event === 'load') callback();
        }
    };
    return { canvas, context, soundEvents, soundManager };
}

function createGame(phase = 1, options = {}) {
    const env = setupEnvironment(options);
    const gamePath = path.resolve(__dirname, 'game.js');
    delete require.cache[gamePath];
    const { Game } = require(gamePath);
    const game = new Game();
    game.assetsReady = true;
    game.switchPhase(phase);
    return { game, ...env };
}

module.exports = { createContext, setupEnvironment, createGame };
