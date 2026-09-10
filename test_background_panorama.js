const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createGame } = require('./test_support.js');

const cases = [
    { phase: 2, key: 'sc_parnamirim_centro', filename: 'parnamirim-igreja-pixel-v3.png' },
    { phase: 3, key: 'sc_phase3_bairros_bg', filename: 'rota-bairros-pixel-v2.png' },
    { phase: 4, key: 'sc_phase4_transbordo_bg', filename: 'rodovia-transbordo-pixel-v2.png' }
];

for (const entry of cases) {
    const copies = [
        path.join(__dirname, 'assets', 'scenery', entry.filename),
        path.join(__dirname, 'PC', 'assets', 'scenery', entry.filename),
        path.join(__dirname, 'celular', 'assets', 'scenery', entry.filename)
    ];
    const hashes = copies.map(file => {
        const data = fs.readFileSync(file);
        assert.strictEqual(data.toString('ascii', 1, 4), 'PNG', `${file} precisa ser PNG`);
        const width = data.readUInt32BE(16);
        const height = data.readUInt32BE(20);
        assert.ok(width / height >= 2.8, `${file} precisa ser um panorama de proporção próxima a 3:1`);
        return crypto.createHash('sha256').update(data).digest('hex');
    });
    assert.strictEqual(new Set(hashes).size, 1, `${entry.filename} precisa ser igual no PC e celular`);

    const { game } = createGame(entry.phase);
    const image = game.assets[entry.key];
    image.naturalWidth = 2172;
    image.naturalHeight = 724;
    image.width = 2172;
    image.height = 724;

    const draws = [];
    game.ctx.drawImage = (...args) => draws.push(args);
    game.camera.x = Math.max(0, game.levelWidth - 960);
    game.renderBackground(game.ctx);

    const panorama = draws.find(args => args[0] === image);
    assert.ok(panorama, `A fase ${entry.phase} precisa desenhar seu panorama`);
    assert.ok(panorama[1] < 0, `O panorama da fase ${entry.phase} precisa se mover com a câmera`);
    assert.ok(panorama[3] > 960, `O panorama da fase ${entry.phase} precisa ser mais largo que a tela`);
}

console.log('✓ Fases 2, 3 e 4: panoramas longos acompanham o avanço da câmera.');
