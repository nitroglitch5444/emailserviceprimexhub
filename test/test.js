/**
 * Prime X Hub - Authorized Device Client (Control Edition)
 * 
 * This script registers this hardware as an authorized device and 
 * executes ONLY the pre-approved local task based on server instructions.
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');

// --- Configuration ---
// TO RUN: Replace the placeholders below with your actual values.
const CONFIG = {
    SERVER_URL: 'http://localhost:3000', // Change to your site URL (e.g., https://your-site.render.com)
    SECRET_KEY: 'your-device-secret',   // Must match API_SECRET_KEY in server environment
    DEVICE_NAME: 'Hardware Node Alpha', 
    HEARTBEAT_INTERVAL: 10000,          
};

const DEVICE_ID = `dev_${crypto.randomBytes(4).toString('hex')}`;

console.log(`\n=========================================`);
console.log(`🛡️ PRIME X HUB CONTROL CLIENT`);
console.log(`Device ID: ${DEVICE_ID}`);
console.log(`Name: ${CONFIG.DEVICE_NAME}`);
console.log(`=========================================\n`);

let isRunning = true;
let currentTaskActive = false;
let taskEndTime = null;

/**
 * The "Approved Task" 
 */
async function runApprovedTask() {
    if (currentTaskActive) return;
    currentTaskActive = true;
    
    console.log(`\n🚀 [STARTED] Approved task is now running...`);
    
    const workInterval = setInterval(() => {
        if (!currentTaskActive) {
            clearInterval(workInterval);
            return;
        }

        const remaining = taskEndTime ? Math.round((taskEndTime - Date.now()) / 1000) : '∞';
        console.log(`⚙️ [WORKING] Status: Running | Time remaining: ${remaining}s`);
        
        if (taskEndTime && Date.now() >= taskEndTime) {
            console.log(`⏱️ [TIMER] Local limit reached.`);
            stopApprovedTask();
        }
    }, 5000);
}

function stopApprovedTask() {
    if (!currentTaskActive) return;
    currentTaskActive = false;
    taskEndTime = null;
    console.log(`\n🛑 [STOPPED] Approved task has finished.`);
}

/**
 * Sends a heartbeat and fetches instructions
 */
async function syncWithServer() {
    if (!isRunning) return;

    try {
        const payload = JSON.stringify({
            deviceId: DEVICE_ID,
            name: CONFIG.DEVICE_NAME,
            secret: CONFIG.SECRET_KEY,
            metadata: {
                taskActive: currentTaskActive
            }
        });

        const url = new URL(`${CONFIG.SERVER_URL}/api/devices/heartbeat`);
        const protocol = url.protocol === 'https:' ? https : http;

        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'User-Agent': `PrimeXHub-Control/${DEVICE_ID}`
            }
        };

        const req = protocol.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const data = JSON.parse(body);
                        handleInstructions(data.device);
                    } catch (e) {
                         console.log(`[${new Date().toLocaleTimeString()}] ⚠️ Parse failed`);
                    }
                } else {
                    console.log(`[${new Date().toLocaleTimeString()}] ⚠️ Sync failed (${res.statusCode}): ${body}`);
                }
            });
        });

        req.on('error', (e) => console.log(`[${new Date().toLocaleTimeString()}] ❌ Sync error: ${e.message}`));
        req.write(payload);
        req.end();

    } catch (err) {
        console.error(`[FATAL] Sync error:`, err.message);
    }
}

/**
 * Handle incoming server state
 */
function handleInstructions(device) {
    if (!device) return;

    const { targetState, timerValue, startTime } = device;

    if (targetState === 'START') {
        const start = new Date(startTime).getTime();
        const durationMs = timerValue * 1000;
        const potentialEndTime = start + durationMs;

        if (Date.now() < potentialEndTime) {
            taskEndTime = potentialEndTime;
            if (!currentTaskActive) {
                runApprovedTask();
            }
        } else {
            if (currentTaskActive) stopApprovedTask();
        }
    } else {
        if (currentTaskActive) stopApprovedTask();
    }
}

syncWithServer();
setInterval(syncWithServer, CONFIG.HEARTBEAT_INTERVAL);

process.on('SIGINT', () => {
    console.log("\n👋 Exiting...");
    process.exit(0);
});
