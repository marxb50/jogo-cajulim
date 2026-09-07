// Mock DOM and Canvas in Node
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
                    drawImage: (img, ...args) => {
                        // Check drawImage args
                        if (!img) throw new Error("drawImage called with null/undefined image");
                    },
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
        setTimeout(() => { if (this.onload) this.onload(); }, 10);
    }
};

const { Game } = require('./game.js');

console.log("Instantiating Game...");
const g = new Game();
setTimeout(() => {
    console.log("Running update & render after assets loaded...");
    try {
        g.update(0.016);
        g.render();
        console.log("SUCCESS! update() and render() executed without errors!");
    } catch(e) {
        console.error("ERROR during render:", e);
    }
    process.exit(0);
}, 100);
