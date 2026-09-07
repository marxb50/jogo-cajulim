const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const chromePath = '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"';
const tempProfileDir = path.join(__dirname, 'chrome_temp_profile_p5');

if (!fs.existsSync(tempProfileDir)) {
    fs.mkdirSync(tempProfileDir, { recursive: true });
}

const targets = [
    {
        name: 'phase5_sector1_quarry.png',
        url: 'http://localhost:8000/index.html?phase=5&autostart=1&state=SOIL_COVER'
    },
    {
        name: 'phase5_sector2_biogas.png',
        url: 'http://localhost:8000/index.html?phase=5&autostart=1&state=BIOGAS_GENERATION'
    },
    {
        name: 'phase5_sector3_lagoons.png',
        url: 'http://localhost:8000/index.html?phase=5&autostart=1&state=CHORUME_TREATMENT'
    },
    {
        name: 'phase5_sector3_lab.png',
        url: 'http://localhost:8000/index.html?phase=5&autostart=1&state=LAB_ANALYSIS'
    },
    {
        name: 'phase5_victory_modal.png',
        url: 'http://localhost:8000/index.html?phase=5&autowin=1'
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
