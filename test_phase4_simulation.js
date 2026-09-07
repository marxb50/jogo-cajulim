// Automated headless simulation test for Phase 4: Carreta ao Aterro
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

let soundsPlayed = [];
global.window = {
    addEventListener: () => {},
    soundManager: {
        resume: () => {},
        toggleMute: () => {},
        startMusic: () => {},
        stopMusic: () => {},
        playJump: () => { soundsPlayed.push('jump'); },
        playCollect: () => { soundsPlayed.push('collect'); },
        playBump: () => { soundsPlayed.push('bump'); },
        playHurt: () => { soundsPlayed.push('hurt'); },
        playHorn: () => { soundsPlayed.push('horn'); },
        playTurbo: () => { soundsPlayed.push('turbo'); },
        playVictory: () => { soundsPlayed.push('victory'); },
        playDockBeep: () => { soundsPlayed.push('dockBeep'); },
        playDockSuccess: () => { soundsPlayed.push('dockSuccess'); },
        playHydraulic: () => { soundsPlayed.push('hydraulic'); },
        playDumpRumble: () => { soundsPlayed.push('dumpRumble'); },
        playTimingHitPerfect: () => { soundsPlayed.push('perfect'); },
        playTimingHitGood: () => { soundsPlayed.push('good'); },
        playTimingHitMiss: () => { soundsPlayed.push('miss'); },
        playEngineBrake: () => { soundsPlayed.push('engineBrake'); },
        playDuneJump: () => { soundsPlayed.push('duneJump'); },
        playCargoRattle: () => { soundsPlayed.push('cargoRattle'); },
        playScaleBeep: () => { soundsPlayed.push('scaleBeep'); }
    }
};

global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.Image = class {
    constructor() {
        this.width = 128;
        this.height = 128;
        setTimeout(() => { if (this.onload) this.onload(); }, 5);
    }
};

const { Game } = require('./game.js');

console.log("=========================================");
console.log("=== TEST: FASE 4 - CARRETA AO ATERRO ===");
console.log("=========================================");

const game = new Game();
game.switchPhase(4);
game.startGame();

console.log(`Phase: ${game.currentPhase}`);
console.log(`State: ${game.state}`);
console.log(`Initial Position: Cab (${game.player.x.toFixed(0)}, ${game.player.y.toFixed(0)}), Trailer (${game.trailer.x.toFixed(0)}, ${game.trailer.y.toFixed(0)})`);
console.log(`Cargo: ${game.cargoWeight} kg, Stability: ${game.cargoStability}%, Items: ${game.items.length}`);

if (!game.trailer) {
    console.error("FAIL: Semi-trailer is not initialized!");
    process.exit(1);
}

// Test 1: Verify dune math
const hFlat = game.getDuneHeight(200);
const hCrest = game.getDuneHeight(1140);
const hWeigh = game.getDuneHeight(4150);
console.log(`Dune heights: Flat Start (x=200): ${hFlat}, Crest (x=1140): ${hCrest.toFixed(1)}, Weigh Station (x=4150): ${hWeigh}`);
if (hFlat !== 390 || hWeigh !== 390) {
    console.error("FAIL: Flat sections should be at y = 390!");
    process.exit(1);
}

// Test 2: Excessive speed causes rattle and stability drop
console.log("\n--- Testing Excessive Speed & Bounce Physics ---");
game.player.x = 1000;
game.trailer.x = 1000 - 185;
game.speedKmh = 88; // High speed
game.keys.right = true;
soundsPlayed = [];

for (let i = 0; i < 40; i++) {
    game.update(1 / 60);
}

console.log(`Post-Speed Test: Stability = ${game.cargoStability.toFixed(1)}% (was 100%), Cargo Rattle Sound: ${soundsPlayed.includes('cargoRattle')}`);
if (game.cargoStability >= 100) {
    console.error("FAIL: Stability should decrease at 88 km/h over dune crests!");
    process.exit(1);
}
if (!soundsPlayed.includes('cargoRattle')) {
    console.error("FAIL: Cargo rattle sound was not played during high speed bounce!");
    process.exit(1);
}
console.log("PASS: Excessive speed triggers cargo rattle and stability reduction!");

// Test 3: Freio Motor (Retarder)
console.log("\n--- Testing Freio Motor (Retarder) ---");
game.keys.right = false;
game.keys.down = true; // S / Down key
soundsPlayed = [];
const preSpeed = game.speedKmh;

for (let i = 0; i < 20; i++) {
    game.update(1 / 60);
}

console.log(`Freio Motor Test: Speed ${preSpeed.toFixed(1)} -> ${game.speedKmh.toFixed(1)} km/h, Engine Brake Sound: ${soundsPlayed.includes('engineBrake')}`);
if (game.speedKmh >= preSpeed) {
    console.error("FAIL: Freio Motor did not decelerate the carreta!");
    process.exit(1);
}
if (!soundsPlayed.includes('engineBrake')) {
    console.error("FAIL: Engine brake sound was not played!");
    process.exit(1);
}
console.log("PASS: Freio motor successfully slows the 30t carreta with retarder sound!");

// Test 4: Tração Reduzida 6x4 on Steep Dunes
console.log("\n--- Testing Tração Reduzida 6x4 Climbing ---");
game.keys.down = false;
game.player.x = 2150;
game.speedKmh = 15; // Low speed on slope
game.keys.jumpHeld = true; // Engage 6x4
game.keys.right = true; // Throttle

for (let i = 0; i < 30; i++) {
    game.update(1 / 60);
}

console.log(`Tração 6x4 Test: Mode Active = ${game.tracaoReduzidaActive}, Speed = ${game.speedKmh.toFixed(1)} km/h`);
if (!game.tracaoReduzidaActive || game.speedKmh <= 15) {
    console.error("FAIL: Tração Reduzida 6x4 did not activate or accelerate!");
    process.exit(1);
}
console.log("PASS: Tração 6x4 heavy sand torque powers up the dunes!");

// Test 5: Full Drive to Weigh Station & Level Clear
console.log("\n--- Testing ANTT Weigh Station & Gate Clearance ---");
game.player.x = 3980;
game.speedKmh = 45;
game.cargoStability = 92;
game.scaleWeighed = false;
game.scaleTimer = 0;
game.gateAngle = 0;
soundsPlayed = [];

let ticks = 0;
const dt = 1 / 60;

while (ticks < 1200 && game.state === 'PLAYING') {
    ticks++;
    const px = game.player.x;

    // Approaching scale platform: slow down to 18 km/h
    if (px >= 4050 && px <= 4220) {
        game.keys.right = false;
        if (game.speedKmh > 16) {
            game.keys.left = true;
        } else {
            game.keys.left = false;
            game.keys.right = true; // crawl through scale
        }
    } else if (px > 4220) {
        // Accelerate through open gate
        game.keys.left = false;
        game.keys.right = true;
    } else {
        // Highway cruise 60 km/h
        if (game.speedKmh < 60) {
            game.keys.right = true;
            game.keys.left = false;
        } else {
            game.keys.right = false;
            game.keys.left = false;
        }
    }

    game.update(dt);
    game.render();

    if (ticks % 100 === 0) {
        console.log(`[Tick ${ticks}] Pos: ${game.player.x.toFixed(0)} | Speed: ${game.speedKmh.toFixed(0)} km/h | Scale Reading: "${game.scaleReading}" | Weighed: ${game.scaleWeighed} | Gate: ${game.gateAngle.toFixed(0)}°`);
    }
}

console.log(`\nSimulation Ended at Tick ${ticks}`);
console.log(`Final State: ${game.state}`);
console.log(`Final Pos: ${game.player.x.toFixed(0)}`);
console.log(`Scale Weighed: ${game.scaleWeighed}`);
console.log(`Gate Angle: ${game.gateAngle.toFixed(0)}°`);
console.log(`Cargo Stability: ${game.cargoStability.toFixed(1)}%`);
console.log(`Scale Beep Sound: ${soundsPlayed.includes('scaleBeep')}`);
console.log(`Score: ${game.score}`);

if (game.state !== 'LEVEL_CLEAR') {
    console.error("FAIL: Phase 4 did not reach LEVEL_CLEAR!");
    process.exit(1);
}

console.log("\n=========================================");
console.log("=== ALL PHASE 4 TESTS PASSED (100%) ===");
console.log("=========================================");
process.exit(0);
