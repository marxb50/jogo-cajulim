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
    assert.strictEqual(played.file, `assets/audio/${item.filename}?v=8.5`);
    assert.strictEqual(played.voice, key === 'PHASE7_TO_8:1' ? 'antonio' : 'thalita');
}

for (const key of ['PHASE3_CLEAR:0', 'PHASE4_CLEAR:0', 'PHASE5_CLEAR:0']) {
    assert.match(source[key].speech_text, /transbõrdo/i, `${key} precisa pronunciar transbõrdo`);
    assert.doesNotMatch(source[key].text, /transbõrdo/i, `${key} precisa manter a grafia visível original`);
    assert.match(source[key].text, /transbordo/i, `${key} precisa continuar exibindo transbordo`);
}

assert.match(source['INTRO:0'].speech_text, /sêco/i, 'A introdução precisa pronunciar sêco');
assert.doesNotMatch(source['INTRO:0'].text, /sêco/i, 'A introdução precisa manter a grafia visível seco');
assert.match(source['INTRO:0'].text, /seco/i, 'A legenda da introdução precisa continuar exibindo seco');

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
assert.strictEqual(game.state, 'CREDITS', 'O final precisa abrir os créditos antes de voltar ao menu');
assert.ok(game.credits, 'A rolagem dos créditos precisa ser inicializada');
assert.strictEqual(game.currentPhase, 8);

const creditsText = [];
const creditImages = [];
game.ctx.fillText = text => creditsText.push(String(text));
game.ctx.drawImage = image => creditImages.push(image);
for (const scroll of [0, 650, 1200, 1700, 2260]) {
    game.credits.scroll = scroll;
    game.renderCredits(game.ctx);
}
assert.ok(creditImages.includes(game.assets.ui_parnamirim_logo), 'A logo da Prefeitura precisa abrir os créditos');
for (const requiredText of [
    'FIM',
    'VOCÊ CONSEGUIU!',
    'Obrigado por jogar!',
    'PREFEITURA DE PARNAMIRIM',
    'PROFESSORA NILDA',
    'ROSEANE PAIVA',
    'MARX BRUNO',
    'GPT-5.6 LUNA',
    'GEMINI 3.8',
    'OBRIGADO POR JOGAR!'
]) {
    assert.ok(creditsText.includes(requiredText), `Crédito ausente: ${requiredText}`);
}
for (const role of ['CRIADO POR', 'PROGRAMAÇÃO', 'ARTE', 'MÚSICA', 'EFEITOS SONOROS', 'DESIGN DE FASES', 'HISTÓRIA']) {
    assert.ok(creditsText.includes(role), `Função ausente nos créditos: ${role}`);
}

game.credits.scroll = 0;
game.keys.down = true;
game.updateCredits(1);
assert.strictEqual(game.credits.scroll, 130, 'A seta para baixo precisa acelerar os créditos');
game.keys.down = false;
game.finishCredits();
assert.strictEqual(game.state, 'TITLE');
assert.strictEqual(game.currentPhase, 1);

console.log('✓ Legendas preservadas; pronúncias transbõrdo e sêco; Thalita em tudo, Antônio somente no chefão.');
