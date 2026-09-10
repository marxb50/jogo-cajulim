const assert = require('assert');
const { createGame } = require('./test_support.js');

const { game } = createGame(1);
const cv = game.casaViva;
const dry = cv.items.filter(item => item.category === 'dry');
const wet = cv.items.filter(item => item.category === 'wet');
assert.strictEqual(dry.length, 5, 'A casa precisa de cinco resíduos secos');
assert.strictEqual(wet.length, 5, 'A casa precisa de cinco resíduos molhados');

const dryBin = game.casaVivaBins.find(bin => bin.kind === 'dry');
const wetBin = game.casaVivaBins.find(bin => bin.kind === 'wet');
assert.ok(wetBin.x - (dryBin.x + dryBin.w) >= 240, 'Os dois cestos precisam ficar visualmente separados');
assert.strictEqual(wetBin.color, '#9b5b32', 'O recipiente de lixo molhado precisa ser marrom');

for (const entry of cv.items.filter(value => value.surface === 'floor')) {
    assert.ok(entry.x > 250 && entry.x < 1010, `${entry.id} não pode ficar atrás das placas ou dos controles móveis`);
}

cv.player.x = 1080;
cv.player.y = 640;
const startX = cv.player.x;
game.moveCasaVivaPlayer(-1, 0, 0.25);
assert.ok(startX - cv.player.x >= 70, 'Cajulim precisa andar mais rápido dentro da casa');

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
assert.strictEqual(cv.player.actionItem, item.id, 'A ação precisa lembrar qual objeto está sendo descartado');

const depositDraws = [];
game.ctx.drawImage = (...args) => depositDraws.push(args);
game.renderCasaViva(game.ctx);
assert.ok(depositDraws.some(args => args[0] === game.assets.p_collect_0), 'O descarte precisa mostrar a pose das mãos do Cajulim');
assert.ok(!depositDraws.some(args => args[0] === game.assets.p_collect_1), 'O descarte não pode trocar o objeto por um saco genérico');
assert.ok(!depositDraws.some(args => args[0] === game.assets.p_sheet), 'A Casa Viva não deve depender da folha grande de sprites');

game.updateCasaVivaAction(0.52);
assert.strictEqual(item.state, 'deposited');
assert.strictEqual(cv.player.state, 'free');
assert.strictEqual(cv.player.actionItem, null, 'A ação do descarte deve ser limpa ao terminar');

for (const entry of cv.items) {
    assert.ok(entry.label && entry.name, `O objeto ${entry.id} precisa de nome visível`);
    assert.ok(game.assets[`cv_${entry.kind}_hold`], `Falta imagem parada segurando ${entry.kind}`);
    assert.ok(game.assets[`cv_${entry.kind}_walk`], `Falta imagem andando com ${entry.kind}`);
}

const playerDraws = [];
game.ctx.drawImage = (...args) => playerDraws.push(args);
cv.room = 'service';
cv.player.state = 'free';
cv.player.moving = false;
cv.player.animTime = 1.75;
game.renderCasaViva(game.ctx);
const idleDraw = playerDraws.find(args => args[0] === game.assets.p_idle_3);
assert.ok(idleDraw, 'A animação parada precisa desenhar o sprite do Cajulim');
assert.ok(!playerDraws.some(args => args[0] === game.assets.p_sheet), 'A animação parada não pode voltar para a folha pesada que causava a bola/piscada');

console.log('✓ Fase 1: 5 secos, 5 molhados, nomes, mãos, bloqueio de troca e cestos corretos.');
