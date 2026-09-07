const assert = require('assert');

// Automated headless simulation test for Phase 1 & Phase 2
global.document = {
    fullscreenElement: null,
    documentElement: {
        requestFullscreen: async () => {}
    },
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
                addEventListener: () => {}
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
        playThunder: () => {}
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

console.log("=========================================");
console.log("=== TEST 1: FASE 1 - PEGA O LIXO ===");
console.log("=========================================");

const game = new Game();
game.switchPhase(1);
game.startGame();

let ticks = 0;
const dt = 1 / 60;

while (ticks < 3000 && game.state === 'PLAYING') {
    ticks++;
    game.keys.right = true;

    const px = game.player.x;
    let needJump = false;
    if ((px >= 710 && px <= 745) ||
        (px >= 1590 && px <= 1625) ||
        (px >= 1770 && px <= 1810) ||
        (px >= 2590 && px <= 2625) ||
        (px >= 2730 && px <= 2770) ||
        (px >= 2880 && px <= 2920) ||
        (px >= 4150 && px <= 4180) ||
        (px >= 4310 && px <= 4350) ||
        (px >= 5200 && px <= 5230) ||
        (px >= 5350 && px <= 5390) ||
        (px >= 5520 && px <= 5545) ||
        (px >= 5630 && px <= 5655) ||
        (px >= 5740 && px <= 5765) ||
        (px >= 5850 && px <= 5880)) {
        needJump = true;
    }

    if (needJump && (game.player.grounded || game.player.coyoteTimer > 0)) {
        game.keys.jump = true;
        game.keys.jumpHeld = true;
        game.player.jumpBuffer = 0.2;
    } else if (!game.player.grounded && game.player.vy > 0) {
        game.keys.jump = false;
        game.keys.jumpHeld = false;
    }

    game.update(dt);
    game.render();
}

console.log(`Phase 1 Ended at Tick ${ticks} | State: ${game.state} | Pos: ${game.player.x.toFixed(0)} | Trash: ${game.trashCollected}/${game.totalTrash} | Score: ${game.score}`);
if (game.state !== 'LEVEL_CLEAR') {
    console.error("FAIL: Phase 1 did not complete!");
    process.exit(1);
}
console.log("PASS: Phase 1 completed successfully!\n");


console.log("=========================================");
console.log("=== TEST 2: FASE 2 - CAMINHÃO AO TRANSBORDO ===");
console.log("=========================================");

game.switchPhase(2);
console.log(`Phase 2 Initial State: ${game.state}, Player w: ${game.player.w}, h: ${game.player.h}, Anim: ${game.player.animState}`);

ticks = 0;
while (ticks < 2500 && game.state === 'PLAYING') {
    ticks++;
    const px = game.player.x;

    // Check if approaching a red traffic light - driver must brake early and wait for green!
    let approachingRed = false;
    if (game.trafficLights) {
        for (const tl of game.trafficLights) {
            const dist = tl.x - (px + game.player.w);
            if (dist > 0 && dist < 260 && (tl.state === 'RED' || tl.state === 'YELLOW')) {
                approachingRed = true;
                break;
            }
        }
    }

    if (approachingRed) {
        game.keys.right = false;
        if (game.player.vx > 10) {
            game.keys.left = true; // brake to a complete stop before the stop line!
        } else {
            game.keys.left = false; // truck parked waiting for green
            game.player.vx = 0;
        }
    } else {
        game.keys.right = true;
        game.keys.left = false;
    }


    // Truck Road Gaps to jump:
    // Gap 1: 980..1160 (jump around 940)
    // Overpass 1: 1300..1560 (jump onto overpass around 1250)
    // Gap 2: 2100..2320 (jump around 2060)
    // Gap 3: 3100..3300 (jump around 3050)
    let needJump = false;
    if ((px >= 930 && px <= 970) ||
        (px >= 1230 && px <= 1280) ||
        (px >= 2050 && px <= 2090) ||
        (px >= 3040 && px <= 3080) ||
        // Jump over cones
        (px >= 460 && px <= 490) ||
        (px >= 760 && px <= 790)) {
        needJump = true;
    }

    if (needJump && (game.player.grounded || game.player.coyoteTimer > 0)) {
        game.keys.jump = true;
        game.keys.jumpHeld = true;
        game.player.jumpBuffer = 0.2;
    } else if (!game.player.grounded && game.player.vy > 0) {
        game.keys.jump = false;
        game.keys.jumpHeld = false;
    }

    game.update(dt);
    game.render();

    if (ticks % 200 === 0) {
        console.log(`[Phase 2 Tick ${ticks}] Truck Pos: (${game.player.x.toFixed(0)}, ${game.player.y.toFixed(0)}) | Speed: ${game.player.vx.toFixed(0)} | Biodiesel: ${game.biodieselCollected} | Wrenches: ${game.wrenchesCollected} | Score: ${game.score}`);
    }
}

console.log(`\nPhase 2 Ended at Tick ${ticks}`);
console.log(`Final State: ${game.state}`);
console.log(`Final Position: (${game.player.x.toFixed(0)}, ${game.player.y.toFixed(0)})`);
console.log(`Biodiesel Collected: ${game.biodieselCollected}/${game.totalBiodiesel}`);
console.log(`Wrenches Collected: ${game.wrenchesCollected}/${game.totalWrenches}`);
console.log(`Score: ${game.score}`);
console.log(`Lives: ${game.lives}`);

if (game.state === 'LEVEL_CLEAR') {
    console.log("\nPASS: Phase 2 completed successfully! Truck arrived at Estação de Transbordo!");
} else {
    console.log(`Phase 2 status: ${game.state} at pos ${game.player.x.toFixed(0)}`);
    process.exit(1);
}

console.log("\n=========================================");
console.log("=== TEST 3: FASE 3 - JOGA NA CARRETA ===");
console.log("=========================================");

game.switchPhase(3);
game.startGame();
console.log(`Phase 3 Initial State: ${game.state}, Sub-state: ${game.phase3State}, Player Pos: (${game.player.x}, ${game.player.y})`);

ticks = 0;
while (ticks < 3000 && game.state === 'PLAYING') {
    ticks++;

    if (game.phase3State === 'TRUCK_ENTER') {
        game.keys.right = false;
        game.keys.left = false;
        game.keys.jump = false;
    } else if (game.phase3State === 'DOCKING') {
        game.keys.right = true;
        game.keys.left = false;
        if (Math.abs(game.player.x - game.dockTargetX) <= 15) {
            game.keys.jump = true;
        }
    } else if (game.phase3State === 'ALIGNED') {
        game.keys.right = false;
        game.keys.jump = false;
    } else if (game.phase3State === 'TIMING_GAME') {
        game.keys.right = false;
        // Press when needle is near center (50) for perfect hit!
        if (Math.abs(game.timingNeedlePos - 50) <= 8) {
            game.keys.jump = true;
        } else {
            game.keys.jump = false;
        }
    } else if (game.phase3State === 'DUMPING') {
        game.keys.right = false;
        game.keys.jump = false;
    } else if (game.phase3State === 'TRUCK_EXIT') {
        game.keys.right = false;
        game.keys.jump = false;
    } else if (game.phase3State === 'COMPACTING' || game.phase3State === 'COMPLETE') {
        game.keys.jump = false;
        game.keys.jumpHeld = false;
    }

    game.update(dt);
    game.render();

    if (ticks % 150 === 0) {
        console.log(`[Phase 3 Tick ${ticks}] Truck #${game.currentTruckIndex}/4 | SubState: ${game.phase3State} | Truck Pos: ${game.player.x.toFixed(0)} | Angle: ${game.dumpAngle.toFixed(1)}° | Trailer: ${game.trailerLoad.toFixed(1)}/30t (${game.dumpProgress}%) | Score: ${game.score}`);
    }
}

console.log(`\nPhase 3 Ended at Tick ${ticks}`);
console.log(`Final State: ${game.state}`);
console.log(`SubState: ${game.phase3State}`);
console.log(`Current Truck: #${game.currentTruckIndex}/4`);
console.log(`Trailer Load: ${game.trailerLoad.toFixed(1)}/30t`);
console.log(`Tarp Progress: ${game.tarpCoverProgress.toFixed(0)}%`);
console.log(`Score: ${game.score}`);

if (game.state === 'LEVEL_CLEAR') {
    console.log("\nPASS: Phase 3 completed successfully! Giant Carreta fully loaded with 30 tons from 4 trucks!");
} else {
    console.log(`Phase 3 status: ${game.state}, SubState: ${game.phase3State}`);
    process.exit(1);
}

console.log("\n=========================================");
console.log("=== TEST 4: FASE 4 - CARRETA AO ATERRO ===");
console.log("=========================================");

game.switchPhase(4);
game.startGame();
console.log(`Phase 4 Initial State: ${game.state}, Cab: (${game.player.x.toFixed(0)}, ${game.player.y.toFixed(0)}), Trailer: (${game.trailer.x.toFixed(0)}, ${game.trailer.y.toFixed(0)})`);
console.log(`Cargo Weight: ${game.cargoWeight} kg, Stability: ${game.cargoStability}%`);

ticks = 0;
while (ticks < 2500 && game.state === 'PLAYING') {
    ticks++;
    const px = game.player.x;
    const slope = game.getDuneAngle(px);

    // Dynamic driving logic:
    // 1. In steep climbs (slope < -0.12), engage Tração Reduzida 6x4!
    if (slope < -0.12) {
        game.keys.jumpHeld = true; // Tração 6x4
    } else {
        game.keys.jumpHeld = false;
    }

    // 2. In steep descents (slope > 0.15) or excess speed (> 74 km/h), engage Freio Motor!
    if (slope > 0.15 && game.speedKmh > 65) {
        game.keys.down = true; // Freio motor
        game.keys.right = false;
    } else if (game.speedKmh > 75) {
        game.keys.down = true;
        game.keys.right = false;
    } else {
        game.keys.down = false;
    }

    // 3. ANTT Weigh Station approach (x >= 4050 && x <= 4240)
    if (px >= 4050 && px <= 4220) {
        game.keys.down = false;
        if (game.speedKmh > 16) {
            game.keys.left = true;
            game.keys.right = false;
        } else {
            game.keys.left = false;
            game.keys.right = true; // Crawl through scale platform
        }
    } else if (px > 4220) {
        // Accelerate through open gate
        game.keys.left = false;
        game.keys.down = false;
        game.keys.right = true;
    } else if (!game.keys.down) {
        // Highway cruise around 62 km/h
        if (game.speedKmh < 62) {
            game.keys.right = true;
            game.keys.left = false;
        } else {
            game.keys.right = false;
            game.keys.left = false;
        }
    }

    game.update(dt);
    game.render();

    if (ticks % 250 === 0) {
        console.log(`[Phase 4 Tick ${ticks}] Pos: ${game.player.x.toFixed(0)} | Speed: ${game.speedKmh.toFixed(0)} km/h | Stability: ${game.cargoStability.toFixed(1)}% | 6x4: ${game.tracaoReduzidaActive} | Freio Motor: ${game.freioMotorActive} | Score: ${game.score}`);
    }
}

console.log(`\nPhase 4 Ended at Tick ${ticks}`);
console.log(`Final State: ${game.state}`);
console.log(`Final Position: ${game.player.x.toFixed(0)}`);
console.log(`Scale Weighed: ${game.scaleWeighed}`);
console.log(`Gate Angle: ${game.gateAngle.toFixed(0)}°`);
console.log(`Cargo Stability: ${game.cargoStability.toFixed(1)}%`);
console.log(`Score: ${game.score}`);

if (game.state === 'LEVEL_CLEAR') {
    console.log("✔ Phase 4 passed successfully!");
} else {
    console.error(`Phase 4 failed with state: ${game.state}`);
    process.exit(1);
}

console.log("\n=========================================");
console.log("=== TEST 5: FASE 5 - ATERRO & USINA VERDE ===");
console.log("=========================================");

game.nextPhase();
assert.strictEqual(game.currentPhase, 5, "Should advance to phase 5");
game.startGame();

// Sector 1: Compactor Tractor Aterrando
game.keys.right = true;
game.keys.jumpHeld = true;
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
assert.strictEqual(game.phase5State, 'COMPACTING_WAIT_ADVANCE', "Should reach COMPACTING_WAIT_ADVANCE");

// Advance to Biogás with Jump
game.keys.jump = true;
game.update(0.016);
game.keys.jump = false;
assert.strictEqual(game.phase5State, 'BIOGAS_GENERATION', "Should reach BIOGAS_GENERATION");

// Sector 2: Biogas power plant 10.0 MW
game.keys.right = false;
game.keys.left = false;
game.keys.jumpHeld = false;
game.biogasPressure = 55;
for (let frame = 0; frame < 500; frame++) {
    game.update(0.016);
    if (game.phase5State === 'BIOGAS_WAIT_ADVANCE') break;
}
assert.strictEqual(game.phase5State, 'BIOGAS_WAIT_ADVANCE', "Should reach BIOGAS_WAIT_ADVANCE");

// Advance to Cajulim in lagoons with Jump
game.keys.jump = true;
game.update(0.016);
game.keys.jump = false;
assert.strictEqual(game.phase5State, 'CHORUME_TREATMENT', "Should reach CHORUME_TREATMENT");

// Sector 3: Leachate lagoons (3 Aerators)
game.aerators.forEach(a => { a.active = true; });
for (let frame = 0; frame < 300; frame++) {
    game.update(0.016);
    if (game.phase5State === 'LAB_ANALYSIS') break;
}
assert.strictEqual(game.phase5State, 'LAB_ANALYSIS', "Should reach LAB_ANALYSIS");

// Sector 3: ETE Lab Water Testing
game.player.x = 5080;
game.keys.jump = true;
game.update(0.016);
game.keys.jump = false;
assert.strictEqual(game.labSampleTested, true, "Lab sample should be tested");
assert.strictEqual(game.phase5State, 'CAJULIM_WAIT_ADVANCE', "Should reach CAJULIM_WAIT_ADVANCE");

// Advance with Jump to complete Phase 5
game.keys.jump = true;
game.update(0.016);
game.keys.jump = false;
game.render();
assert.strictEqual(game.state, 'LEVEL_CLEAR', "Phase 5 should clear");
console.log("✔ Phase 5 Cleared! Transitioning to Phase 6 Boss...");

// =======================================================
// PHASE 6 PLAYTHROUGH: O CHEFÃO FINAL (BARÃO DO ENTULHO)
// =======================================================
game.nextPhase();
assert.strictEqual(game.currentPhase, 6, "Should switch to Phase 6");
game.startGame();
assert.strictEqual(game.levelWidth, 1400, "Level width should be 1400px");
assert.ok(game.boss, "Boss must exist");
assert.strictEqual(game.lives, 5, "Cajulim must have 5 lives in Phase 6");
assert.strictEqual(game.boss.hp, 4, "Boss initial HP must be 4");

// Boss Battle Hits
for (let hit = 1; hit <= 4; hit++) {
    game.boss.invulnerableTimer = 0;
    game.boss.hurtTimer = 0;
    game.boss.state = 'DRIVE';

    game.player.x = game.boss.x + 50;
    game.player.y = game.boss.y - 60;
    game.player.vy = 250;

    game.update(0.016);
    assert.ok(game.player.vy < -300, `Player must bounce on boss head on hit #${hit}`);
    assert.strictEqual(game.boss.hp, 4 - hit, `Boss HP must be ${4 - hit}`);

    if (4 - hit > 0) {
        for (let f = 0; f < 80; f++) {
            game.update(0.02);
            if (game.boss.invulnerableTimer <= 0 && game.boss.state === 'DRIVE') break;
        }
    }
}

assert.strictEqual(game.phase6State, 'BOSS_DEFEATED', "Phase 6 state should be BOSS_DEFEATED");

// Defeat timer -> Community service
for (let f = 0; f < 180; f++) {
    game.update(0.02);
    if (game.phase6State === 'COMMUNITY_SERVICE') break;
}
assert.strictEqual(game.phase6State, 'COMMUNITY_SERVICE', "Should transition to COMMUNITY_SERVICE");

// Community service timer -> LEVEL_CLEAR
for (let f = 0; f < 250; f++) {
    game.update(0.02);
    if (game.state === 'LEVEL_CLEAR') break;
}
assert.strictEqual(game.state, 'LEVEL_CLEAR', "Final game state should be LEVEL_CLEAR");

game.render();

console.log("\n=======================================================");
console.log("PASS: ALL 6 PHASES COMPLETED WITH 100% SUCCESS!");
console.log(`Final Game Score across all 6 phases: ${game.score}`);
console.log("=======================================================");
process.exit(0);
