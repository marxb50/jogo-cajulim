// Headless Automated Simulation Test for Phase 5 (Aterro Sanitário & Usina Verde)
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
        playVictory: () => {},
        playDockBeep: () => {},
        playDockSuccess: () => {},
        playHydraulic: () => {},
        playDumpRumble: () => {},
        playTimingHitPerfect: () => {},
        playTimingHitGood: () => {},
        playTimingHitMiss: () => {},
        playEngineBrake: () => {},
        playDuneJump: () => {},
        playCargoRattle: () => {},
        playScaleBeep: () => {},
        playTractorEngine: () => {},
        playTractorBlade: () => {},
        playTurbineWhine: () => {},
        playAeratorSplash: () => {},
        playPowerGridBeep: () => {},
        playPurgeValve: () => {},
        playLabBeep: () => {}
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
console.log("=== TEST: FASE 5 - ATERRO & USINA VERDE (REDESIGN) ===");
console.log("=================================================");

const game = new Game();
game.switchPhase(5);
game.startGame();

assert.strictEqual(game.currentPhase, 5, "Current phase should be 5");
assert.strictEqual(game.phase5State, 'COMPACTING', "Initial state should be COMPACTING");
assert.strictEqual(game.levelWidth, 5200, "Level width should be 5200px");
assert.strictEqual(game.compactionZones.length, 4, "Should have 4 compaction zones");
assert.strictEqual(game.aerators.length, 3, "Should have 3 aerators");
console.log("✔ Phase 5 initialized properly with 5200px world and 3-stage flow!");

// 1. Test Sector 1: Compactor Tractor Aterrando ('COMPACTING')
console.log("\n--- Testing Sector 1: Compaction ---");
game.keys.right = true;
game.keys.jumpHeld = true; // boost
for (let frame = 0; frame < 800; frame++) {
    game.update(0.016);
    if (game.player.x > 1350) {
        game.keys.right = false;
        game.keys.left = true;
    } else if (game.player.x < 180) {
        game.keys.left = false;
        game.keys.right = true;
    }
    if (game.phase5State === 'COMPACTING_WAIT_ADVANCE') break;
}
assert.strictEqual(game.compactionProgress, 100, "Compaction should reach 100%");
assert.strictEqual(game.phase5State, 'COMPACTING_WAIT_ADVANCE', "State should advance to COMPACTING_WAIT_ADVANCE");
console.log("✔ Compaction completed at 100%! Waiting for Jump button [Space/K/Gamepad]");

// Press Jump button to leave tractor screen and advance to Biogás
game.keys.jump = true;
game.update(0.016);
game.keys.jump = false;
assert.strictEqual(game.phase5State, 'BIOGAS_GENERATION', "State should advance to BIOGAS_GENERATION after pressing Jump");
console.log("✔ Jump pressed! Exited tractor and entered Stage 2: Biogás Pressão!");

// 2. Test Sector 2: Biogas Generation & Filter Purge
console.log("\n--- Testing Sector 2: Biogas Generation (10.0 MW) ---");
game.keys.right = false;
game.keys.left = false;
game.keys.jumpHeld = false;
game.biogasPressure = 55; // inside optimal 40-70 kPa zone
for (let frame = 0; frame < 500; frame++) {
    game.update(0.016);
    if (game.phase5State === 'BIOGAS_WAIT_ADVANCE') break;
}
assert.strictEqual(game.biogasPowerMW, 10.0, "Biogas power should reach 10.0 MW");
assert.strictEqual(game.phase5State, 'BIOGAS_WAIT_ADVANCE', "State should advance to BIOGAS_WAIT_ADVANCE");
console.log("✔ Biogas reached 10.0 MW! Waiting for Jump button [Space/K/Gamepad]");

// Press Jump button to leave Biogás screen and advance to Cajulim in the lagoons
game.keys.jump = true;
game.update(0.016);
game.keys.jump = false;
assert.strictEqual(game.phase5State, 'CHORUME_TREATMENT', "State should advance to CHORUME_TREATMENT");
console.log("✔ Jump pressed! Entered Stage 3: Cajulim in the lagoons!");

// 3. Test Sector 3: 3 Aerators & Snappy Cajulim Hero Platformer
console.log("\n--- Testing Sector 3: Leachate Treatment (3 Aerators) & Cajulim ---");
assert.strictEqual(game.player.w, 48, "Cajulim player width should be 48");
assert.strictEqual(game.player.h, 76, "Cajulim player height should be 76");
game.aerators.forEach(a => { a.active = true; });
for (let frame = 0; frame < 300; frame++) {
    game.update(0.016);
    if (game.phase5State === 'LAB_ANALYSIS') break;
}
assert.strictEqual(game.chorumeTreated, 100, "Chorume treatment should reach 100%");
assert.strictEqual(game.phase5State, 'LAB_ANALYSIS', "State should advance to LAB_ANALYSIS");
console.log("✔ Chorume treatment reached 100%! Transitioned to LAB_ANALYSIS");

// 4. Test Sector 3: ETE Lab Water Analysis
console.log("\n--- Testing Sector 3: ETE Lab Water Testing ---");
game.player.x = 5080;
game.keys.jump = true;
game.update(0.016);
game.keys.jump = false;
assert.strictEqual(game.labSampleTested, true, "Lab sample should be tested");
assert.ok(game.labSampleResult, "Lab sample result should exist");
assert.strictEqual(game.phase5State, 'CAJULIM_WAIT_ADVANCE', "State should advance to CAJULIM_WAIT_ADVANCE");
console.log(`✔ Lab sample tested! Laudo: ${JSON.stringify(game.labSampleResult)}`);
console.log("✔ Waiting for final Jump button to transition to cutscene!");

// Press Jump to complete phase 5
game.keys.jump = true;
game.update(0.016);
game.keys.jump = false;
assert.strictEqual(game.phase5State, 'COMPLETE', "State should advance to COMPLETE");
assert.strictEqual(game.state, 'LEVEL_CLEAR', "Game state should be LEVEL_CLEAR");
console.log(`✔ Phase 5 cleared! Final Score: ${game.score}`);

// 5. Test Rendering
console.log("\n--- Testing Phase 5 Render loop ---");
game.render();
console.log("✔ render() executed with zero errors across all 3 sectors!");

console.log("\n=================================================");
console.log("🎉 ALL REDESIGNED PHASE 5 SIMULATION TESTS PASSED 100%!");
console.log("=================================================");
