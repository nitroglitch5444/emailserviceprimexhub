/**
 * TOOLBOX - Remote Bot Script
 * Connects to the Nexus Hub Panel for remote configuration and monitoring.
 */

const axios = require('axios');
const os = require('os');
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const SERVER_URL = "https://ais-dev-uczsg5fiylni2sd23efmm2-181083649851.asia-southeast1.run.app"; // Update with your actual domain
// Simple HWID generation (Node.js)
const HWID_FILE = path.join(os.homedir(), '.nexus_hwid');
let HWID = '';

if (fs.existsSync(HWID_FILE)) {
    HWID = fs.readFileSync(HWID_FILE, 'utf8');
} else {
    HWID = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    fs.writeFileSync(HWID_FILE, HWID);
}

let botConfig = {
    mode: 'email_create',
    subMode: 'stocking',
    limits: { emailsCount: 10, timeMinutes: 60 },
    success: 0,
    fail: 0
};

let currentStats = {
    success: 0,
    fail: 0
};

let logsBuffer = [];

function log(message) {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${message}`;
    console.log(formattedMessage);
    logsBuffer.push({ message: formattedMessage, timestamp: new Date() });
}

async function checkIn() {
    try {
        const response = await axios.post(`${SERVER_URL}/api/bot/check-in`, {
            hwid: HWID,
            logs: logsBuffer,
            stats: currentStats
        });
        
        logsBuffer = []; // Clear buffer after successful check-in
        botConfig = response.data;
        return true;
    } catch (error) {
        console.error("Check-in failed:", error.message);
        return false;
    }
}

// --- Bot Logic Emulation (Replace with actual Puppeteer/Automation logic) ---

async function runEmailCreationCycle() {
    const startTime = Date.now();
    let completedEmails = 0;

    log(`🚀 Bot Started | HWID: ${HWID}`);
    log(`Mode: ${botConfig.mode.toUpperCase()} | SubMode: ${botConfig.subMode.toUpperCase()}`);

    while (true) {
        // 1. Check Limits
        const elapsedMinutes = (Date.now() - startTime) / 60000;
        if (completedEmails >= botConfig.limits.emailsCount) {
            log(`🎯 Target reached: ${completedEmails} emails created. Stopping.`);
            break;
        }
        if (elapsedMinutes >= botConfig.limits.timeMinutes) {
            log(`⏰ Time limit reached: ${elapsedMinutes.toFixed(1)} minutes. Stopping.`);
            break;
        }

        // 2. Decide Password based on Mode
        const password = botConfig.subMode === 'admin' ? "gonabot@5414" : "user01@g";
        
        log(`🌀 Starting Cycle #${completedEmails + 1}`);
        log(`🔑 Using Mode Password: ${password}`);

        // Simulate browser work
        await new Promise(r => setTimeout(r, 5000)); 

        // 3. Random Success/Fail Simulation
        const isSuccess = Math.random() > 0.3;
        if (isSuccess) {
            log(`✅ Cycle #${completedEmails + 1} SUCCESS`);
            currentStats.success++;
        } else {
            log(`❌ Cycle #${completedEmails + 1} FAILED`);
            currentStats.fail++;
        }

        completedEmails++;
        
        // Check in with server after each cycle
        await checkIn();
        
        // Wait before next cycle
        await new Promise(r => setTimeout(r, 2000));
    }

    log(`🏁 Job Finished | Total Success: ${currentStats.success} | Fails: ${currentStats.fail}`);
    await checkIn(); // Final check-in
}

// Start heartbeats
setInterval(async () => {
    await checkIn();
}, 10000);

// Initial start
checkIn().then(() => {
    runEmailCreationCycle();
});
