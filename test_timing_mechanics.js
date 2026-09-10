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
                    fillRect: () => {},
                    strokeRect: () => {},
                    beginPath: () => {},
                    arc: () => {},
                    polygon: () => {},
                    fill: () => {},
                    stroke: () => {},
                    moveTo: () => {},
                    lineTo: () => {},
                    drawImage: () => {},
                    save: () => {},
                    restore: () => {},
                    translate: () => {},
                    scale: () => {},
                    rotate: () => {},
                    rect: () => {},
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
        playTimingHitMiss: () => {}
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

const game = new Game();
game.switchPhase(5);
game.assetsReady = true;
game.startGame();

console.log("=== TEST A: VERMELHO (MISS) -> 0t despejadas, tenta de novo ===");
game.phase3State = 'TIMING_GAME';
game.timingNeedlePos = 95; // 95 is RED
game.currentTruckIndex = 1;
game.truckDumped = 0;
game.trailerLoad = 0;

// Trigger hit on RED
game.keys.jump = true;
game.update(0.016);
console.log(`Hit on RED: Result=${game.timingResult}, roundDumpTarget=${game.roundDumpTarget}t, truckDumped=${game.truckDumped}t`);
if (game.timingResult !== 'MISS' || game.roundDumpTarget !== 0 || game.truckDumped !== 0) {
    console.error("FAIL: Expected MISS with 0t target and 0t dumped");
    process.exit(1);
}

// Wait 0.8s
for (let i = 0; i < 55; i++) game.update(0.016);
console.log(`After RED wait -> State=${game.phase3State}, timingResult=${game.timingResult}, truckDumped=${game.truckDumped}t`);
if (game.phase3State !== 'TIMING_GAME' || game.timingResult !== null || game.truckDumped !== 0) {
    console.error("FAIL: Expected return to TIMING_GAME with 0t dumped");
    process.exit(1);
}
console.log("PASS: VERMELHO não jogou nada de lixo e retornou para tentar de novo!\n");

console.log("=== TEST B: AMARELO (GOOD) -> Joga 2.5t (pouco lixo) e tenta de novo ===");
// Needle at 72 (YELLOW: outside green half-width 22, inside yellow half-width 40)
game.phase3State = 'TIMING_GAME';
game.timingNeedlePos = 72;
game.timingResult = null;
game.truckDumped = 0;
game.keys.jump = true;
game.update(0.016);

console.log(`Hit on YELLOW: Result=${game.timingResult}, roundDumpTarget=${game.roundDumpTarget}t`);
if (game.timingResult !== 'GOOD' || game.roundDumpTarget !== 2.5) {
    console.error("FAIL: Expected GOOD with 2.5t target");
    process.exit(1);
}

// Advance through DUMPING until bed lowers
let loop = 0;
while (game.phase3State === 'TIMING_GAME' || game.phase3State === 'DUMPING') {
    game.update(0.016);
    loop++;
    if (loop > 500) break;
}
console.log(`After YELLOW dump -> State=${game.phase3State}, truckDumped=${game.truckDumped.toFixed(1)}t, trailerLoad=${game.trailerLoad.toFixed(1)}t`);
if (game.phase3State !== 'TIMING_GAME' || Math.abs(game.truckDumped - 2.5) > 0.1) {
    console.error(`FAIL: Expected TIMING_GAME with ~2.5t dumped, got state=${game.phase3State}, truckDumped=${game.truckDumped}`);
    process.exit(1);
}
console.log("PASS: AMARELO jogou pouco lixo (2.5t) e voltou para a mira para tentar de novo!\n");

console.log("=== TEST C: VERDE (PERFECT) -> Joga todo o restante (5.0t), completa 7.5t e sai ===");
// Needle at 50 (VERDE)
game.timingNeedlePos = 50;
game.timingResult = null;
game.keys.jump = true;
game.update(0.016);

console.log(`Hit on GREEN: Result=${game.timingResult}, roundDumpTarget=${game.roundDumpTarget.toFixed(1)}t`);
if (game.timingResult !== 'PERFECT' || Math.abs(game.roundDumpTarget - 5.0) > 0.1) {
    console.error(`FAIL: Expected PERFECT with 5.0t target, got ${game.roundDumpTarget}`);
    process.exit(1);
}

loop = 0;
while (game.phase3State === 'TIMING_GAME' || game.phase3State === 'DUMPING') {
    game.update(0.016);
    loop++;
    if (loop > 500) break;
}
console.log(`After GREEN dump -> State=${game.phase3State}, truckDumped=${game.truckDumped.toFixed(1)}t, trailerLoad=${game.trailerLoad.toFixed(1)}t`);
if (game.phase3State !== 'TRUCK_EXIT' || Math.abs(game.truckDumped - 7.5) > 0.1) {
    console.error(`FAIL: Expected TRUCK_EXIT with 7.5t dumped, got state=${game.phase3State}, truckDumped=${game.truckDumped}`);
    process.exit(1);
}
console.log("PASS: VERDE jogou o restante todo (5.0t), totalizou 7.5t e liberou o caminhão para a saída!\n");

console.log("=========================================");
console.log("=== ALL SPECIFIC MECHANICS TESTS PASS ===");
console.log("=========================================");
