const assert = require('assert');
const { createGame } = require('./test_support.js');

const checks = {
    1(game) {
        assert.strictEqual(game.casaViva.items.length, 10);
        assert.strictEqual(game.casaViva.items.filter(item => item.category === 'dry').length, 5);
        assert.strictEqual(game.casaViva.items.filter(item => item.category === 'wet').length, 5);
    },
    2(game) {
        assert.ok(game.platforms.length > 10, 'Fase 2 precisa do mapa de plataformas');
        assert.ok(game.truck, 'Fase 2 precisa do caminhão de chegada');
        assert.strictEqual(game.totalTrash, 6);
        assert.strictEqual(game.totalRecyclables, 13);
    },
    3(game) {
        assert.ok(game.phase2Truck, 'Fase 3 precisa do caminhão controlável');
        assert.ok(game.phase2Npc, 'Fase 3 precisa do Cajulim NPC');
        assert.strictEqual(game.phase2Stops.length, 5);
        assert.strictEqual(game.phase2TotalBags, 10);
    },
    4(game) {
        assert.ok(game.transbordoFacility, 'Fase 4 precisa do destino do transbordo');
        assert.strictEqual(game.trafficLights.length, 4);
        assert.strictEqual(game.totalBiodiesel, 5);
    },
    5(game) {
        assert.strictEqual(game.phase3State, 'DOCKING');
        assert.strictEqual(game.totalTrucks, 4);
        assert.strictEqual(game.totalTrailerCapacity, 30);
        assert.ok(game.carreta, 'Fase 5 precisa da carreta receptora');
    },
    6(game) {
        assert.ok(game.phase5Truck, 'Fase 6 precisa da carreta articulada');
        assert.strictEqual(game.cargoWeight, 30000);
        assert.strictEqual(game.phase5ScaleState, 'WAIT');
        assert.strictEqual(game.phase5DestinationX, 6300);
    },
    7(game) {
        assert.strictEqual(game.phase5Stage, 'APPROACH');
        assert.strictEqual(game.phase5Zones.length, 4);
        assert.strictEqual(game.phase5Aerators.length, 3);
        assert.ok(game.phase5Tractor, 'Fase 7 precisa do trator compactador');
    },
    8(game) {
        assert.ok(game.boss, 'Fase 8 precisa do Barão do Entulho');
        assert.strictEqual(game.boss.hp, 4);
        assert.strictEqual(game.lives, 5);
        assert.strictEqual(game.springDumpsters.length, 2);
    }
};

for (let phase = 1; phase <= 8; phase++) {
    const { game } = createGame(phase);
    assert.strictEqual(game.currentPhase, phase);
    assert.strictEqual(game.state, 'PLAYING');
    checks[phase](game);
    assert.doesNotThrow(() => game.update(0.016), `update da fase ${phase} não pode falhar`);
    assert.doesNotThrow(() => game.render(), `render da fase ${phase} não pode falhar`);
    console.log(`✓ Fase ${phase}: inicialização, update e renderização`);
}

console.log('✓ As oito fases executam a lógica e a tela corretas.');
