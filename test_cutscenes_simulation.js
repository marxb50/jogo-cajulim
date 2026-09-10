const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createGame } = require('./test_support.js');

const source = JSON.parse(fs.readFileSync(path.join(__dirname, 'narrations.json'), 'utf8'));
const generated = require('./narrations.js');
assert.deepStrictEqual(generated, source, 'O texto usado pelo jogo precisa vir do mesmo manifesto da dublagem');

const entries = Object.entries(source);
assert.strictEqual(entries.length, 12);
const bossEntries = entries.filter(([, item]) => item.voice === 'pt-BR-AntonioNeural');
assert.deepStrictEqual(bossEntries.map(([key]) => key), ['PHASE7_TO_8:1'], 'Somente o chefão pode usar Antônio');
for (const [key, item] of entries) {
    if (key !== 'PHASE7_TO_8:1') {
        assert.strictEqual(item.voice, 'pt-BR-ThalitaNeural', `${key} precisa usar Thalita Neural`);
    }
    assert.ok(item.text.length > 40, `${key} precisa de texto completo`);

    const copies = [
        path.join(__dirname, 'assets', 'audio', item.filename),
        path.join(__dirname, 'PC', 'assets', 'audio', item.filename),
        path.join(__dirname, 'celular', 'assets', 'audio', item.filename)
    ];
    const hashes = copies.map(file => {
        assert.ok(fs.existsSync(file), `Áudio ausente: ${file}`);
        assert.ok(fs.statSync(file).size > 50000, `Áudio vazio ou incompleto: ${file}`);
        return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    });
    assert.strictEqual(new Set(hashes).size, 1, `${item.filename} deve ser idêntico no PC e celular`);
}

const { game, soundEvents } = createGame(1);
for (const [key, item] of entries) {
    const separator = key.lastIndexOf(':');
    game.cutscene.type = key.slice(0, separator);
    game.cutscene.step = Number(key.slice(separator + 1));
    assert.strictEqual(game.getCutsceneFullText(), item.text.toLocaleUpperCase('pt-BR'));
    game.triggerCutsceneNarration();
    const played = soundEvents.at(-1);
    assert.strictEqual(played.name, 'playNarration');
    assert.strictEqual(played.text, item.speech_text || item.text, 'A fala precisa usar o texto próprio de pronúncia quando informado');
    assert.strictEqual(played.file, `assets/audio/${item.filename}`);
    assert.strictEqual(played.voice, key === 'PHASE7_TO_8:1' ? 'antonio' : 'thalita');
}

for (const key of ['PHASE3_CLEAR:0', 'PHASE4_CLEAR:0', 'PHASE5_CLEAR:0']) {
    assert.match(source[key].speech_text, /transbôrdo/i, `${key} precisa pronunciar transbôrdo`);
    assert.doesNotMatch(source[key].text, /transbôrdo/i, `${key} precisa manter a grafia visível original`);
    assert.match(source[key].text, /transbordo/i, `${key} precisa continuar exibindo transbordo`);
}

game.startCutscene('PHASE7_TO_8');
game.cutscene.textProgress = game.getCutsceneFullText().length;
game.advanceCutscene();
assert.strictEqual(game.cutscene.step, 1);
assert.ok(game.cutscene.flashTimer > 0);
game.cutscene.textProgress = game.getCutsceneFullText().length;
game.advanceCutscene();
assert.strictEqual(game.currentPhase, 8);

game.startCutscene('GRAND_ENDING');
for (let step = 0; step < 3; step++) {
    game.cutscene.textProgress = game.getCutsceneFullText().length;
    game.advanceCutscene();
}
assert.strictEqual(game.state, 'TITLE');
assert.strictEqual(game.currentPhase, 1);

console.log('✓ Legendas preservadas; pronúncia dedicada no transbôrdo; Thalita em tudo, Antônio somente no chefão.');
