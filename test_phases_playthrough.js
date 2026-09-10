const assert = require('assert');
const { createGame } = require('./test_support.js');

const transitionCases = [
    ['INTRO', 1],
    ['PHASE1_CLEAR', 2],
    ['PHASE2_CLEAR', 3],
    ['PHASE3_CLEAR', 4],
    ['PHASE4_CLEAR', 5],
    ['PHASE5_CLEAR', 6],
    ['PHASE6_CLEAR', 7],
    ['PHASE7_TO_8', 8]
];

for (const [cutscene, destination] of transitionCases) {
    const { game } = createGame(Math.max(1, destination - 1));
    game.startCutscene(cutscene);
    game.skipCutscene();
    assert.strictEqual(game.currentPhase, destination, `${cutscene} deve abrir a fase ${destination}`);
    assert.strictEqual(game.state, 'PLAYING');
}

{
    const { game } = createGame(2);
    game.trashCollected = game.totalTrash;
    game.player.x = game.truck.x + 30;
    game.player.y = game.truck.y + 50;
    game.checkGoal();
    assert.strictEqual(game.state, 'LEVEL_CLEAR', 'A fase 2 deve terminar ao levar toda a coleta ao caminhão');
}

{
    const { game } = createGame(3);
    for (const stop of game.phase2Stops) {
        stop.complete = true;
        stop.collected = stop.bags;
    }
    game.phase2Collected = game.phase2TotalBags;
    game.phase2Truck.x = game.phase2DestinationX + 120;
    game.updatePhase2(0.016);
    assert.strictEqual(game.phase2Mode, 'WIN', 'A rota de coleta deve reconhecer os cinco bairros concluídos');
}

{
    const { game } = createGame(4);
    game.player.x = game.transbordoFacility.x + 80;
    game.player.y = game.transbordoFacility.y + 100;
    game.checkGoal();
    assert.strictEqual(game.state, 'LEVEL_CLEAR', 'A rodovia deve terminar dentro do transbordo');
}

for (let phase = 5; phase <= 8; phase++) {
    const { game } = createGame(phase);
    game.levelClear();
    assert.strictEqual(game.state, 'LEVEL_CLEAR', `A fase ${phase} deve aceitar sua conclusão`);
}

console.log('✓ Encadeamento completo: casa → plataforma → coleta → rodovia → transbordo → carreta → aterro → chefão.');
