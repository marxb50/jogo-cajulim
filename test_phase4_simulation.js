const assert = require('assert');
const { createGame } = require('./test_support.js');

const { game } = createGame(6);
const truck = game.phase5Truck;
assert.ok(truck);
assert.strictEqual(game.cargoWeight, 30000);

const rampStartY = game.phase5RoadYAt(game.phase5ScaleX - 220);
const scaleY = game.phase5RoadYAt(game.phase5ScaleX);
assert.ok(rampStartY - scaleY >= 40, 'A rampa da balança precisa subir de forma visível');

truck.x = game.phase5ScaleX - 339;
truck.speed = 190;
game.keys.right = true;
for (let frame = 0; frame < 1200 && game.phase5ScaleState !== 'WEIGHING'; frame++) {
    game.update(0.016);
}
assert.strictEqual(game.phase5ScaleState, 'WEIGHING', 'O controle automático deve alinhar a carreta na balança');
assert.strictEqual(truck.speed, 0, 'A carreta deve parar mesmo com a seta pressionada');

for (let frame = 0; frame < 170; frame++) game.update(0.016);
assert.strictEqual(game.phase5ScaleState, 'DONE');
assert.strictEqual(game.phase5DepartureLocked, true, 'A carreta fica bloqueada até o motorista soltar a seta');
assert.strictEqual(truck.speed, 0);

game.update(0.25);
assert.strictEqual(game.phase5DepartureLocked, true, 'Continuar acelerando não pode furar a pesagem');
assert.strictEqual(truck.speed, 0);

game.keys.right = false;
game.update(0.016);
assert.strictEqual(game.phase5DepartureLocked, false, 'Soltar a seta libera a saída depois da pesagem');
game.keys.right = true;
game.update(0.25);
assert.ok(truck.speed > 0, 'A seta volta a mover a carreta após a liberação');

truck.x = game.phase5DestinationX - 79;
truck.speed = 0;
game.keys.right = false;
assert.doesNotThrow(
    () => game.renderPhase5(game.ctx),
    'A área de recebimento precisa continuar desenhando a carreta e a instrução no celular'
);
game.keys.jumpHeld = true;
game.update(0.016);
assert.strictEqual(game.phase5Mode, 'WIN', 'A entrega precisa concluir dentro do aterro');
assert.strictEqual(game.cargoWeight, 30000);

console.log('✓ Fase 6: rampa, parada automática, pesagem de 30 t, liberação e entrega ao aterro.');
