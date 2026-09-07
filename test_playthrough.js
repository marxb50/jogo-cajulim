// Automated headless playthrough test for Fase 1: Pega o Lixo
global.document = {
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
                    fill: () => {},
                    drawImage: () => {},
                    save: () => {},
                    restore: () => {},
                    translate: () => {},
                    scale: () => {},
                    fillText: () => {}
                }),
                addEventListener: () => {}
            };
        }
        return {
            classList: { add: () => {}, remove: () => {} },
            textContent: '',
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

const game = new Game();
game.initLevel();
game.startGame();

console.log("=== SIMULATING FASE 1: PEGA O LIXO ===");
console.log(`Initial State: ${game.state}, Total Trash to collect: ${game.totalTrash}, Total Recyclables: ${game.totalRecyclables}`);
console.log(`Starting Position: (${game.player.x.toFixed(1)}, ${game.player.y.toFixed(1)})`);

let ticks = 0;
const maxTicks = 2000;
const dt = 1 / 60;

let lastLogX = 0;
while (ticks < maxTicks && game.state === 'PLAYING') {
    ticks++;

    // Simulated platformer controls:
    game.keys.right = true;

    // Simulated platformer controls:
    game.keys.right = true;

    // Detect if jump is needed:
    // Jump over Pit 1 (760-920): jump around 720
    // Jump over Pit 2 (1640-1920): jump at 1600 to land on 1720 platform, jump at 1800 to reach 1920
    // Jump over Pit 3 (2640-3000):
    // Plat 1: 2710..2806 (y: 390)
    // Plat 2: 2860..2956 (y: 340)
    // Seg 4 starts at 3000
    const px = game.player.x;
    let needJump = false;
    if ((px >= 710 && px <= 745) ||
        (px >= 1590 && px <= 1625) ||
        (px >= 1770 && px <= 1810) ||
        (px >= 2590 && px <= 2625) ||
        (px >= 2730 && px <= 2770) ||
        (px >= 2880 && px <= 2920) ||
        (px >= 3320 && px <= 3340) ||
        (px >= 3430 && px <= 3450) ||
        (px >= 3540 && px <= 3560)) {
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

    if (ticks >= 760 && ticks <= 820) {
        console.log(`[Tick ${ticks}] px=${game.player.x.toFixed(1)} py=${game.player.y.toFixed(1)} vy=${game.player.vy.toFixed(1)} gr=${game.player.grounded} needJump=${needJump}`);
    }

    if (game.player.x - lastLogX > 400) {
        lastLogX = game.player.x;
        console.log(`[Tick ${ticks}] Cajulim Pos: (${game.player.x.toFixed(0)}, ${game.player.y.toFixed(0)}) | Trash: ${game.trashCollected}/${game.totalTrash} | Recyclables: ${game.recyclablesCollected} | Score: ${game.score} | Lives: ${game.lives}`);
    }
}

console.log(`\nSimulation Ended at Tick ${ticks}`);
console.log(`Final State: ${game.state}`);
console.log(`Final Position: (${game.player.x.toFixed(0)}, ${game.player.y.toFixed(0)})`);
console.log(`Trash Collected: ${game.trashCollected}/${game.totalTrash}`);
console.log(`Recyclables Collected: ${game.recyclablesCollected}/${game.totalRecyclables}`);
console.log(`Score: ${game.score}`);
console.log(`Remaining Lives: ${game.lives}`);

if (game.trashCollected >= 5 && game.player.x >= 2000) {
    console.log("SUCCESS: Player progressed through the level, jumped obstacles, and collected trash!");
}
