const assert = require('assert');
const path = require('path');
const { setupEnvironment } = require('./test_support.js');

setupEnvironment();

const requested = [];
global.Image = class ImmediateImage {
    constructor() {
        this.complete = false;
        this.naturalWidth = 0;
        this.naturalHeight = 0;
    }

    set src(value) {
        this._src = value;
        requested.push(value);
        this.complete = true;
        this.naturalWidth = 256;
        this.naturalHeight = 256;
        if (this.onload) this.onload();
    }

    get src() {
        return this._src;
    }
};

const realSetTimeout = global.setTimeout;
const deferredTimers = [];
global.setTimeout = (callback, delay) => {
    deferredTimers.push({ callback, delay });
    return deferredTimers.length;
};

try {
    const gamePath = path.resolve(__dirname, 'game.js');
    delete require.cache[gamePath];
    const { Game } = require(gamePath);
    const game = new Game();

    assert.strictEqual(game.assetsReady, true, 'A fase deve abrir após os arquivos prioritários');
    assert.strictEqual(requested.length, game.totalAssets, 'Somente os arquivos prioritários devem iniciar antes da tela abrir');
    assert.ok(game.totalAssets < Object.keys(game.imageList).length / 4, 'O carregamento inicial precisa ser uma fração pequena do jogo completo');
    assert.ok(!requested.some(url => url.includes('cajulim_sheet.png')), 'A Casa Viva não deve esperar a folha pesada de sprites');
    assert.ok(!requested.some(url => url.includes('/cutscenes/')), 'A Casa Viva não deve esperar as cutscenes antes de abrir');
    assert.ok(deferredTimers.some(timer => timer.delay === 80), 'Os demais arquivos devem ficar agendados para segundo plano');
} finally {
    global.setTimeout = realSetTimeout;
}

console.log('✓ Carregamento: Casa Viva abre com o pacote leve e baixa o restante em segundo plano.');
