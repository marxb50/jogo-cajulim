// Headless Automated Simulation Test for Cutscenes (Street Fighter 2 Arcade Style)
const assert = require('assert');

let stingPlayed = false;
let blipPlayed = false;
let chucklePlayed = false;
let fanfarePlayed = false;
let narrationsPlayed = [];
let narrationStopped = false;

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
                    bezierCurveTo: () => {},
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
        playDramaticSting: () => { stingPlayed = true; },
        playTextBlip: () => { blipPlayed = true; },
        playVillainChuckle: () => { chucklePlayed = true; },
        playFanfare: () => { fanfarePlayed = true; },
        currentNarration: null,
        playNarration: (audioPath, fallbackText) => {
            narrationsPlayed.push({ audioPath, fallbackText });
        },
        stopNarration: () => {
            narrationStopped = true;
        }
    }
};

global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.Image = class {
    constructor() {
        this.width = 64;
        this.height = 64;
        this.naturalWidth = 64;
        this.naturalHeight = 64;
        this.complete = true;
        setTimeout(() => { if (this.onload) this.onload(); }, 5);
    }
};

const { Game } = require('./game.js');

console.log("=================================================");
console.log("=== TEST: CUTSCENES NARRATIVAS (ESTILO SF2) ===");
console.log("=================================================");

const game = new Game();

// 1. TEST PHASE 5 CLEAR -> CUTSCENE PHASE5_TO_6
console.log("\n--- TEST 1: Phase 5 Clear triggers Aerial Landfill Cutscene ---");
game.switchPhase(5);
game.startGame();
game.compactionProgress = 100;
game.soilCoverProgress = 100;
game.biogasPowerMW = 10.0;
game.chorumeTreated = 100;
game.labSampleTested = true;
game.levelClear();

// Give the 500ms timeout time to trigger cutscene
setTimeout(() => {
    assert.strictEqual(game.state, 'CUTSCENE', "Game state must transition to 'CUTSCENE'");
    assert.strictEqual(game.cutscene.active, true, "Cutscene must be active");
    assert.strictEqual(game.cutscene.type, 'PHASE5_TO_6', "Cutscene type must be 'PHASE5_TO_6'");
    assert.strictEqual(game.cutscene.step, 0, "Initial slide must be step 0 (Aerial Landfill)");
    console.log("✔ Phase 5 completion successfully triggers Aerial Landfill cutscene!");

    // 2. TEST TYPEWRITER EFFECT & AUDIO BLIP
    console.log("\n--- TEST 2: Typewriter text progress and sound blips ---");
    for (let i = 0; i < 30; i++) {
        game.update(0.05);
    }
    assert.ok(game.cutscene.textProgress > 0, "Text typewriter must progress");
    assert.ok(blipPlayed, "Audio text blip must have been triggered");
    console.log(`✔ Typewriter working! Progress: ${Math.floor(game.cutscene.textProgress)} chars`);

    // 3. TEST ADVANCING TO STEP 1 (DRAMATIC VILLAIN CUT)
    console.log("\n--- TEST 3: Advance to Step 1 (Dramatic Cut to Barão do Entulho) ---");
    game.advanceCutscene(); // Completes text if still typing
    game.advanceCutscene(); // Advances to step 1
    assert.strictEqual(game.cutscene.step, 1, "Cutscene step must advance to 1");
    assert.ok(stingPlayed, "Dramatic sting sound must be played for villain reveal");
    assert.ok(game.cutscene.flashTimer > 0, "Screen flash timer must be active");
    assert.ok(game.cutscene.shakeTimer > 0, "Screen shake timer must be active");
    console.log("✔ Step 1 triggered with dramatic sting, screen flash, and screen shake!");

    // 4. TEST ADVANCING INTO PHASE 6 COMBAT
    console.log("\n--- TEST 4: Advance from Villain Cutscene directly to Phase 6 Boss Combat ---");
    game.cutscene.textProgress = 999;
    game.advanceCutscene();
    assert.strictEqual(game.currentPhase, 6, "Must transition to Phase 6");
    assert.strictEqual(game.state, 'PLAYING', "Must enter PLAYING state in Phase 6");
    assert.ok(game.boss, "Boss must exist in Phase 6");
    console.log("✔ Cutscene successfully transitions directly into Phase 6 Boss Battle!");

    // 5. TEST SKIP CUTSCENE
    console.log("\n--- TEST 5: Skip Cutscene Shortcut (ESC / Button) ---");
    game.switchPhase(5);
    game.startCutscene('PHASE5_TO_6');
    assert.strictEqual(game.state, 'CUTSCENE');
    game.skipCutscene();
    assert.strictEqual(game.currentPhase, 6, "Skip must immediately start Phase 6");
    assert.strictEqual(game.state, 'PLAYING');
    console.log("✔ Skip cutscene immediately transfers player to Phase 6!");

    // 6. TEST PHASE 6 CLEAR -> GRAND ENDING CUTSCENE
    console.log("\n--- TEST 6: Phase 6 Clear triggers Grand Ending Cutscene ---");
    game.switchPhase(6);
    game.startGame();
    game.boss.hp = 0;
    game.boss.state = 'DEFEATED';
    game.levelClear();

    setTimeout(() => {
        assert.strictEqual(game.state, 'CUTSCENE', "Game state must transition to 'CUTSCENE'");
        assert.strictEqual(game.cutscene.type, 'GRAND_ENDING', "Cutscene type must be 'GRAND_ENDING'");
        assert.strictEqual(game.cutscene.step, 0, "Step 0 must be Barão redemption");
        assert.ok(fanfarePlayed, "Victory fanfare must be played on grand ending");
        console.log("✔ Defeating the boss triggers GRAND_ENDING with fanfare!");

        // Step 0 -> Step 1 (Celebration)
        game.cutscene.textProgress = 999;
        game.advanceCutscene();
        assert.strictEqual(game.cutscene.step, 1, "Must advance to step 1 (Turma do Cajulim Celebration)");

        // Step 1 -> Step 2 (Certificate & Stats)
        game.cutscene.textProgress = 999;
        game.advanceCutscene();
        assert.strictEqual(game.cutscene.step, 2, "Must advance to step 2 (Certificate of Sustainability)");

        // Step 2 -> Title Screen
        game.cutscene.textProgress = 999;
        game.advanceCutscene();
        assert.strictEqual(game.state, 'TITLE', "Final advance returns to TITLE screen");
        assert.strictEqual(game.currentPhase, 1, "Returns to Phase 1");
        console.log("✔ Grand ending progresses through Redemption, Celebration, Certificate, and returns to Title!");

        // 7. TEST RENDERING ALL SLIDES
        console.log("\n--- TEST 7: Render all cutscene slides without errors ---");
        const ctx = game.ctx;
        game.startCutscene('PHASE5_TO_6');
        game.cutscene.step = 0;
        game.render();
        game.cutscene.step = 1;
        game.render();
        game.startCutscene('GRAND_ENDING');
        game.cutscene.step = 0;
        game.render();
        game.cutscene.step = 1;
        game.render();
        game.cutscene.step = 2;
        game.render();
        console.log("✔ All 5 cutscene slides rendered with 0 errors!");

        // 8. TEST THALITA NEURAL SPOKEN NARRATION
        console.log("\n--- TEST 8: Thalita Neural Spoken Voice Narration Triggers ---");
        assert.ok(narrationsPlayed.length >= 5, "Narration must have been triggered for each cutscene slide");
        const audioFiles = narrationsPlayed.map(n => n.audioPath);
        assert.ok(audioFiles.some(f => f.includes('cutscene_phase5_step0.mp3')), "Must play Phase 5 Step 0 narration");
        assert.ok(audioFiles.some(f => f.includes('cutscene_phase5_step1.mp3')), "Must play Phase 5 Step 1 narration");
        assert.ok(audioFiles.some(f => f.includes('cutscene_ending_step0.mp3')), "Must play Ending Step 0 narration");
        assert.ok(audioFiles.some(f => f.includes('cutscene_ending_step1.mp3')), "Must play Ending Step 1 narration");
        assert.ok(audioFiles.some(f => f.includes('cutscene_ending_step2.mp3')), "Must play Ending Step 2 narration");
        assert.ok(narrationStopped, "Narration must be cleanly stopped when advancing/skipping");
        console.log(`✔ All ${narrationsPlayed.length} cutscene narrations triggered with correct Thalita Neural audio paths!`);

        console.log("\n=================================================");
        console.log("=== ALL CUTSCENE & NARRATION TESTS PASSED WITH 100% SUCCESS! ===");
        console.log("=================================================");
        process.exit(0);
    }, 700);

}, 600);
