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

    // A Fase 2 também precisa receber as três texturas dos blocos no pacote
    // prioritário, para que eles não desapareçam durante uma conexão lenta.
    global.window.location.search = '?fase=2';
    requested.length = 0;
    deferredTimers.length = 0;
    delete require.cache[gamePath];
    const { Game: Phase2Game } = require(gamePath);
    const phase2 = new Phase2Game();
    assert.ok(requested.some(url => url.includes('block_brick.png')), 'O tijolo deve carregar antes de abrir a Fase 2');
    assert.ok(requested.some(url => url.includes('block_question.png')), 'O bloco de interrogação deve carregar antes de abrir a Fase 2');
    assert.ok(requested.some(url => url.includes('block_recycle.png')), 'O bloco reciclável deve carregar antes de abrir a Fase 2');

    // Mesmo com as texturas indisponíveis, o desenho procedural mantém os
    // blocos visíveis em vez de chamar drawImage em uma imagem incompleta.
    for (const key of ['block_brick', 'block_question', 'block_recycle']) {
        phase2.assets[key].complete = false;
        phase2.assets[key].naturalWidth = 0;
    }
    let fallbackBlocks = 0;
    phase2.ctx.fillRect = (...args) => { if (args[2] === 48 && args[3] === 48) fallbackBlocks++; };
    phase2.renderBlocks(phase2.ctx);
    assert.ok(fallbackBlocks >= 4, 'Os blocos devem continuar desenhados durante uma falha de textura');

    // A Fase 6 nunca pode deixar a carreta invisível quando a textura falhar.
    global.window.location.search = '?fase=6';
    requested.length = 0;
    deferredTimers.length = 0;
    delete require.cache[gamePath];
    const { Game: Phase6Game } = require(gamePath);
    const phase6 = new Phase6Game();
    assert.ok(requested.some(url => url.includes('carreta_16bit_transparente.png')), 'A carreta transparente e leve deve ser priorizada na Fase 6');
    assert.strictEqual(phase6.getTruckCutout(), phase6.assets.sc_carreta_magenta, 'O celular deve desenhar a imagem transparente diretamente, sem recorte pesado em canvas');
    phase6.assets.sc_carreta_magenta.complete = true;
    phase6.assets.sc_carreta_magenta.naturalWidth = 0;
    const fallbackTruckRects = [];
    phase6.ctx.fillRect = (...args) => fallbackTruckRects.push(args);
    phase6.drawPhase5Truck(phase6.ctx);
    assert.ok(fallbackTruckRects.some(args => args[2] === 355 && args[3] === 93), 'A carreta deve continuar visível com fallback quando a textura falhar');

    global.window.location.search = '?fase=7';
    requested.length = 0;
    deferredTimers.length = 0;
    delete require.cache[gamePath];
    const { Game: Phase7Game } = require(gamePath);
    const phase7 = new Phase7Game();
    assert.ok(requested.some(url => url.includes('biogas_plant.png')), 'A usina deve carregar antes de abrir a Fase 7');
    assert.ok(requested.some(url => url.includes('lagoa_aerador.png')), 'Os aeradores devem carregar antes de abrir a Fase 7');
    phase7.assets.sc_biogas_plant.complete = false;
    phase7.assets.sc_biogas_plant.naturalWidth = 0;
    const fallbackArcs = [];
    phase7.ctx.arc = (...args) => fallbackArcs.push(args);
    phase7.drawPhase5BiogasSector(phase7.ctx);
    assert.ok(!fallbackArcs.some(args => args[2] >= 60), 'O fallback da usina não pode desenhar o círculo verde gigante');

    // O panorama do Cajueiro de Pirangi precisa estar pronto antes do chefão
    // para que a arena nunca apareça com o antigo fundo genérico no celular.
    global.window.location.search = '?fase=8';
    requested.length = 0;
    deferredTimers.length = 0;
    delete require.cache[gamePath];
    const { Game: Phase8Game } = require(gamePath);
    new Phase8Game();
    assert.ok(
        requested.some(url => url.includes('cajueiro-pirangi-boss-panorama.webp')),
        'O panorama do Cajueiro de Pirangi deve carregar antes de abrir a Fase 8'
    );
} finally {
    global.setTimeout = realSetTimeout;
}

console.log('✓ Carregamento: Casa Viva abre com o pacote leve e baixa o restante em segundo plano.');
