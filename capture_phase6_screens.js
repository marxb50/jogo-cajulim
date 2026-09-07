const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const chromePath = '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"';
const tempProfileDir = path.join(__dirname, 'chrome_temp_profile_p6');

if (!fs.existsSync(tempProfileDir)) {
    fs.mkdirSync(tempProfileDir, { recursive: true });
}

const targets = [
    {
        name: 'phase6_boss_battle.png',
        url: 'http://localhost:8000/index.html?phase=6&autostart=1'
    },
    {
        name: 'phase6_community_service.png',
        url: 'http://localhost:8000/index.html?phase=6&autostart=1&state=COMMUNITY_SERVICE'
    },
    {
        name: 'phase6_victory_modal.png',
        url: 'http://localhost:8000/index.html?phase=6&autowin=1'
    }
];

for (const t of targets) {
    const outPath = path.join(__dirname, t.name);
    console.log(`Capturing ${t.name}...`);
    const cmd = `${chromePath} --headless --disable-gpu --user-data-dir="${tempProfileDir}" --window-size=1280,720 --screenshot="${outPath}" --virtual-time-budget=2000 "${t.url}"`;
    try {
        execSync(cmd, { stdio: 'inherit' });
        console.log(`✔ Captured ${t.name} (${fs.statSync(outPath).size} bytes)`);
    } catch (e) {
        console.error(`Error capturing ${t.name}:`, e.message);
    }
}
