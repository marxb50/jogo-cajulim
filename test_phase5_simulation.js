const assert = require('assert');
const { createGame } = require('./test_support.js');

const { game } = createGame(7);
assert.strictEqual(game.phase5Stage, 'APPROACH');
assert.strictEqual(game.phase5Mode, 'PLAYER');

game.player.x = 541;
game.triggerPhase5Action();
assert.strictEqual(game.phase5Stage, 'COMPACT');
assert.strictEqual(game.phase5Mode, 'TRACTOR');

game.keys.right = true;
for (const zone of game.phase5Zones) {
    zone.comp = 99;
    game.phase5Tractor.x = zone.x;
    game.phase5Tractor.vx = 55;
    game.update(0.1);
    assert.strictEqual(zone.comp, 100, `Trecho ${zone.id} deve ser compactado`);
}
assert.strictEqual(game.phase5Stage, 'GET_SOIL');

game.keys.right = false;
game.phase5Tractor.x = 230;
game.triggerPhase5Action();
assert.strictEqual(game.phase5Stage, 'COVER');
assert.strictEqual(game.phase5SoilLoaded, true);

const soilPath = [];
game.phase5Mode = 'PLAYER';
game.ctx.moveTo = (...args) => soilPath.push(args);
game.drawPhase5Tractor(game.ctx);
assert.ok(soilPath.some(([x]) => x === -24), 'A terra precisa aparecer na lâmina dianteira do trator');
game.phase5Mode = 'TRACTOR';

game.keys.right = true;
for (const zone of game.phase5Zones) {
    zone.cover = 99;
    game.phase5Tractor.x = zone.x;
    game.phase5Tractor.vx = 55;
    game.update(0.1);
    assert.strictEqual(zone.cover, 100, `Trecho ${zone.id} deve receber cobertura`);
}
assert.strictEqual(game.phase5Stage, 'PARK');

game.keys.right = false;
game.phase5Tractor.x = 1390;
game.triggerPhase5Action();
assert.strictEqual(game.phase5Stage, 'TO_BIOGAS');
assert.strictEqual(game.phase5Mode, 'PLAYER');

game.player.x = 2336;
game.triggerPhase5Action();
assert.strictEqual(game.phase5Stage, 'BIOGAS');
assert.strictEqual(game.phase5Mode, 'PANEL');
game.phase5Pressure = 50;
game.update(6.1);
assert.strictEqual(game.phase5PowerComplete, true, 'A pressão ideal deve gerar 10 MW');
game.triggerPhase5Action();
assert.strictEqual(game.phase5Stage, 'TO_LAGOONS');

game.player.x = 3200;
game.player.y = 500;
game.player.vx = 0;
game.player.vy = 0;
game.keys.left = false;
game.keys.right = false;
game.updatePhase5Player(0);
assert.strictEqual(game.player.y, game.phase5Floor - game.player.h, 'Os pés do Cajulim devem tocar a passarela do chorume');

const lagoonRects = [];
game.ctx.fillRect = (...args) => lagoonRects.push(args);
game.drawPhase5LagoonSector(game.ctx);
assert.ok(lagoonRects.some(([x, y, w]) => x === 3010 && y === game.phase5Floor && w === 1570), 'A passarela deve ser visível exatamente sob o personagem');

game.phase5Message = 'TESTE NO TOPO';
game.phase5MessageTimer = 2;
let messageBox = null;
const rounded = game.drawPhase5RoundedRect.bind(game);
game.drawPhase5RoundedRect = (ctx, x, y, w, h, radius) => {
    if (w >= 480 && h === 58) messageBox = { x, y, w, h };
    return rounded(ctx, x, y, w, h, radius);
};
game.drawPhase5Message(game.ctx);
assert.ok(messageBox && messageBox.y < 180, 'As mensagens da fase do aterro precisam aparecer no alto da tela');

const tipRects = [];
game.ctx.fillRect = (...args) => tipRects.push(args);
game.tipText = 'OBJETIVO NO ALTO';
game.tipTimer = 2;
game.renderTip(game.ctx);
assert.ok(tipRects.some(([, y, w, h]) => y < 230 && w === 860 && h === 42), 'As dicas da fase do aterro também precisam ficar no alto');

for (const aerator of game.phase5Aerators) {
    game.player.x = aerator.x - game.player.w / 2;
    game.triggerPhase5Action();
    assert.strictEqual(aerator.active, true);
}
assert.strictEqual(game.phase5Stage, 'TO_LAB');

game.player.x = 4810 - game.player.w / 2;
game.triggerPhase5Action();
assert.strictEqual(game.phase5Stage, 'ANALYSIS');
assert.strictEqual(game.phase5Mode, 'ANALYSIS');
game.update(2.8);
assert.strictEqual(game.phase5AnalysisDone, true);
assert.strictEqual(game.phase5Stage, 'COMPLETE');
assert.strictEqual(game.phase5Mode, 'WIN');
assert.strictEqual(game.player.y, game.phase5Floor - game.player.h, 'Cajulim precisa reaparecer com os pés no chão');
assert.strictEqual(game.player.grounded, true, 'Cajulim precisa terminar a fase apoiado no piso');

game.triggerPhase5Action();
assert.strictEqual(game.state, 'LEVEL_CLEAR');

console.log('✓ Fase 7: compactação, cobertura, biogás, aeradores, laboratório e certificação.');
