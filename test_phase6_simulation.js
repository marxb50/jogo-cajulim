// Headless Automated Simulation Test for Phase 8 (Barão do Entulho & Mecha-Trator Poluidor 9000)
const assert = require('assert');

global.document = {
    fullscreenElement: null,
    documentElement: { requestFullscreen: async () => {} },
    exitFullscreen: async () => {},
    getElementById: (id) => {
        if (id === 'gameCanvas') {
            return {
                getContext: () => ({
                    imageSmoothingEnabled: false,
                    clearRect: () => {},
                    createLinearGradient: () => ({ addColorStop: () => {} }),
                    createRadialGradient: () => ({ addColorStop: () => {} }),
                    fillRect: () => {},
                    strokeRect: () => {},
                    beginPath: () => {},
                    arc: () => {},
                    ellipse: () => {},
                    polygon: () => {},
                    fill: () => {},
                    stroke: () => {},
                    moveTo: () => {},
                    lineTo: () => {},
                    closePath: () => {},
                    quadraticCurveTo: () => {},
                    setLineDash: () => {},
                    drawImage: () => {},
                    save: () => {},
                    restore: () => {},
                    translate: () => {},
                    scale: () => {},
                    rotate: () => {},
                    rect: () => {},
                    clip: () => {},
                    setTransform: () => {},
                    roundRect: () => {},
                    measureText: (txt) => ({ width: (txt || '').length * 8 }),
                    fillText: () => {}
                }),
                addEventListener: () => {},
                getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 })
            };
        }
        return {
            classList: { add: () => {}, remove: () => {}, toggle: () => {} },
            textContent: '',
            innerHTML: '',
            style: {},
            addEventListener: () => {}
        };
    }
};

global.window = {
    addEventListener: () => {},
    soundManager: {
        resume: () => {},
        toggleMute: () => {},
        startMusic: () => {},
        stopMusic: () => {},
        playJump: () => {},
        playCollect: () => {},
        playBump: () => {},
        playHurt: () => {},
        playHorn: () => {},
        playTurbo: () => {},
        playVictory: () => {}
    }
};

global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.Image = class {
    constructor() {
        this.width = 64;
        this.height = 64;
        setTimeout(() => { if (this.onload) this.onload(); }, 5);
    }
};

const { Game } = require('./game.js');

console.log("=================================================");
console.log("=== TEST: FASE 8 - O CHEFÃO FINAL (MECHA-TRATOR) ===");
console.log("=================================================");

const game = new Game();
game.switchPhase(8);
game.assetsReady = true;
game.startGame();

assert.strictEqual(game.currentPhase, 8, "Current phase should be 8");
assert.strictEqual(game.levelWidth, 1400, "Arena width should be 1400px");
assert.ok(game.boss, "Boss object must exist");
assert.strictEqual(game.lives, 5, "Cajulim must have 5 lives in Phase 8");
assert.strictEqual(game.boss.hp, 4, "Boss initial HP must be 4");
assert.strictEqual(game.boss.maxHp, 4, "Boss max HP must be 4");
assert.strictEqual(game.springDumpsters.length, 2, "Must have 2 spring dumpsters");
console.log("✔ Phase 8 initialized properly with Barão do Entulho in the Mecha-Trator 9000!");

// 1. Test Player movement & Spring Dumpster bounce
console.log("\n--- Testing Spring Dumpster Mechanics ---");
const dumpster = game.springDumpsters[0];
game.player.x = dumpster.x + 10;
game.player.y = dumpster.y - 70; // feet at dumpster.y + 6 (within d.y and d.y + 24)
game.player.vy = 200; // falling onto dumpster
game.update(0.016);
assert.ok(game.player.vy < -500, "Player must bounce upward with high velocity when landing on dumpster");
assert.strictEqual(dumpster.bounce, 1.0, "Dumpster must trigger bounce effect");
console.log(`✔ Dumpster Super Jump verified! Player vy: ${game.player.vy}px/s`);

// 2. Test Boss Damage & Head Bounce (Sonic-style hit)
console.log("\n--- Testing Boss Head Bounce & Phase Transitions ---");
const livesBeforeBossHits = game.lives;

for (let hit = 1; hit <= 4; hit++) {
    const expectedHp = 4 - hit;
    // Position boss
    game.boss.invulnerableTimer = 0;
    game.boss.hurtTimer = 0;
    game.boss.state = 'DRIVE';

    // Position player directly above boss weak spot
    game.player.x = game.boss.x + 50;
    game.player.y = game.boss.y - 60;
    game.player.vy = 250; // falling down onto hood

    game.update(0.016);

    assert.strictEqual(game.boss.hp, expectedHp, `After hit #${hit}, boss HP should be ${expectedHp}`);
    assert.ok(game.player.vy < -300, `Player must bounce upward from boss head after hit #${hit}`);
    assert.strictEqual(game.lives, livesBeforeBossHits, 'Atingir o ponto fraco não pode machucar o Cajulim');

    if (expectedHp >= 3) {
        assert.strictEqual(game.boss.phase, 1, "Should be Boss Phase 1 (Pá de Sucata)");
    } else if (expectedHp === 2) {
        assert.strictEqual(game.boss.phase, 2, "Should be Boss Phase 2 (Pneus & Óleo)");
    } else if (expectedHp === 1) {
        assert.strictEqual(game.boss.phase, 3, "Should be Boss Phase 3 (Sobrecarga)");
    }

    console.log(`✔ Hit #${hit} registered! Boss HP: ${expectedHp}/4 (Phase ${game.boss.phase}). Player bounced!`);

    // Advance timers so boss recovers from hurt state
    if (expectedHp > 0) {
        for (let f = 0; f < 100; f++) {
            game.update(0.02);
            if (game.boss.invulnerableTimer <= 0 && game.boss.state === 'DRIVE') break;
        }
    }
}

// 3. Test Boss Defeat & Community Service Transition
console.log("\n--- Testing Boss Defeat & Community Service Transition ---");
assert.strictEqual(game.phase6State, 'BOSS_DEFEATED', "State should be BOSS_DEFEATED upon reaching 0 HP");

// Advance through defeat explosion timer (2.8s)
for (let f = 0; f < 180; f++) {
    game.update(0.02);
    if (game.phase6State === 'COMMUNITY_SERVICE') break;
}
assert.strictEqual(game.phase6State, 'COMMUNITY_SERVICE', "State should transition to COMMUNITY_SERVICE");
console.log("✔ Boss Defeated! Transitioned to COMMUNITY_SERVICE: Barão is sweeping the plaza!");

// Advance through community service timer (3.8s) -> levelClear
for (let f = 0; f < 250; f++) {
    game.update(0.02);
    if (game.state === 'LEVEL_CLEAR') break;
}
assert.strictEqual(game.state, 'LEVEL_CLEAR', "Game state should reach LEVEL_CLEAR");
console.log("✔ Game completion reached LEVEL_CLEAR with Grand Victory!");

// 4. Test Rendering Pipeline for Phase 8
console.log("\n--- Testing Phase 8 Render Pipeline ---");
let renderThrew = false;
try {
    game.render();
} catch (err) {
    renderThrew = true;
    console.error("Render threw exception:", err);
}
assert.strictEqual(renderThrew, false, "Phase 8 render() must complete without errors");
console.log("✔ Phase 8 render() ran completely without any errors!");

console.log("\n=================================================");
console.log("=== ALL PHASE 8 AUTOMATED TESTS PASSED (100%) ===");
console.log("=================================================\n");
process.exit(0);
