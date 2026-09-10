const assert = require('assert');
const { createGame } = require('./test_support.js');

const { game } = createGame(1);
const cv = game.casaViva;
const dry = cv.items.filter(item => item.category === 'dry');
const wet = cv.items.filter(item => item.category === 'wet');
assert.strictEqual(dry.length, 5, 'A casa precisa de cinco resíduos secos');
assert.strictEqual(wet.length, 5, 'A casa precisa de cinco resíduos molhados');

const item = cv.items.find(entry => entry.id === 'orange');
cv.room = item.room;
cv.player.x = item.approach.x;
cv.player.y = item.approach.y;
assert.strictEqual(game.startCasaVivaPickup(item), true);
game.updateCasaVivaAction(0.40);
game.updateCasaVivaAction(0.35);
assert.strictEqual(cv.player.held, item.id, 'O objeto deve ficar preso às mãos do Cajulim');
assert.strictEqual(cv.player.state, 'carrying');

const second = cv.items.find(entry => entry.id === 'can');
assert.strictEqual(game.startCasaVivaPickup(second), false, 'Não pode trocar de objeto enquanto carrega um resíduo');
assert.strictEqual(cv.player.held, item.id, 'A tentativa de troca não pode soltar o objeto atual');

const wrongBin = game.casaVivaBins.find(bin => bin.kind === 'dry');
game.startCasaVivaDeposit(wrongBin, item);
assert.strictEqual(cv.player.state, 'wrong');
assert.ok(cv.wrongFlashTime > 0, 'O cesto errado precisa produzir a piscada vermelha');
assert.match(cv.message, /ERROU/);
game.updateCasaVivaAction(0.75);
assert.strictEqual(cv.player.held, item.id, 'O erro não pode soltar o objeto');
assert.strictEqual(item.state, 'held');

const correctBin = game.casaVivaBins.find(bin => bin.kind === item.category);
game.startCasaVivaDeposit(correctBin, item);
game.updateCasaVivaAction(0.43);
assert.strictEqual(cv.player.held, null, 'O objeto sai das mãos somente durante o depósito correto');
game.updateCasaVivaAction(0.52);
assert.strictEqual(item.state, 'deposited');
assert.strictEqual(cv.player.state, 'free');

for (const entry of cv.items) {
    assert.ok(entry.label && entry.name, `O objeto ${entry.id} precisa de nome visível`);
    assert.ok(game.assets[`cv_${entry.kind}_hold`], `Falta imagem parada segurando ${entry.kind}`);
    assert.ok(game.assets[`cv_${entry.kind}_walk`], `Falta imagem andando com ${entry.kind}`);
}

console.log('✓ Fase 1: 5 secos, 5 molhados, nomes, mãos, bloqueio de troca e cestos corretos.');
