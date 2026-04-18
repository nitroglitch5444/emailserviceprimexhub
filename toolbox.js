/**
 * NEXUS HUB - REMOTE AUTOMATION BOT
 * Uses puppeteer-real-browser to bypass detection.
 * Controlled via https://primexhub.shop/panel
 */

const { connect } = require('puppeteer-real-browser');
const fs = require('fs');
const path = require('path');
const os = require('os');

// --- Configuration ---
const SERVER_URL = "https://primexhub.shop"; 
const HWID_FILE = path.join(os.homedir(), '.nexus_hwid');
let HWID = fs.existsSync(HWID_FILE) ? fs.readFileSync(HWID_FILE, 'utf8') : '';
if (!HWID) {
    HWID = Math.random().toString(36).substring(2, 15);
    fs.writeFileSync(HWID_FILE, HWID);
}

let botConfig = {
    isRunning: false,
    mode: 'email_create',
    subMode: 'stocking',
    limits: { emailsCount: 10, timeMinutes: 60 }
};

let currentStats = { success: 0, fail: 0 };
let completedCycles = 0;
let logsBuffer = [];

function log(message) {
    const formatted = `[${new Date().toLocaleTimeString()}] ${message}`;
    console.log(formatted);
    logsBuffer.push({ message: formatted, timestamp: new Date() });
}

async function checkIn() {
    try {
        const response = await fetch(`${SERVER_URL}/api/bot/check-in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                hwid: HWID, 
                logs: logsBuffer, 
                stats: currentStats,
                completedCycles: completedCycles
            })
        });
        if (response.ok) {
            logsBuffer = [];
            botConfig = await response.json();
            return true;
        }
    } catch (e) { log("⚠️ Connection to Panel failed. Retrying..."); }
    return false;
}

// --- Automation Class ---
class ScriptBloxBot {
    constructor() {
        this.bravePaths = [
            "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
            process.env.LOCALAPPDATA + "\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
        ];
    }

    getBravePath() {
        for (const p of this.bravePaths) if (fs.existsSync(p)) return p;
        return null;
    }

    generateEmail() {
        return `${Math.random().toString(36).substring(2, 12)}@primexhub.shop`;
    }

    async runCycle() {
        const bravePath = this.getBravePath();
        log(`🌐 Opening Brave with Proxy...`);
        
        try {
            const { browser, page } = await connect({
                headless: false,
                args: ["--incognito", "--proxy-server=pr-eu.proxies.fo:13337"],
                fingerprint: true,
                turnstile: true,
                connectOption: { executablePath: bravePath || undefined }
            });

            await page.authenticate({ username: "hhhooph7qa", password: "qobax1yhcj" });
            await page.setViewport({ width: 1280, height: 800 });

            log("🔗 Navigating to ScriptBlox...");
            await page.goto('https://scriptblox.com/signup', { waitUntil: 'domcontentloaded', timeout: 60000 });

            const email = this.generateEmail();
            const password = botConfig.subMode === 'admin' ? "gonabot@5414" : "user01@g";

            log(`📝 Filling: ${email} | Mode: ${botConfig.subMode.toUpperCase()} | Pass: ${password}`);
            
            await page.waitForSelector('input[type="email"]');
            await page.type('input[type="email"]', email, { delay: 50 });
            await page.type('input[type="password"][placeholder="Password"]', password, { delay: 50 });
            await page.type('input[type="password"][placeholder="Repeat Password"]', password, { delay: 50 });
            
            await page.click('button[role="checkbox"]');
            
            log("🛡️ Human Simulation (15s delay)...");
            await new Promise(r => setTimeout(r, 15000));

            await page.click('button.bg-primary');
            log("🎉 Signup Clicked. Waiting for OTP or Redirection...");

            let success = false;
            const apiToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5Y2VjNDI5NDJjNTBjZDA0NmUyNDBhNSIsInVzZXJuYW1lIjoid2UiLCJpc0FkbWluIjp0cnVlLCJpYXQiOjE3NzYwMjMxMzEsImV4cCI6MTc3NjYyNzkzMX0.MWJr58NueyJOy5R996ScSqeH_Cy-FOJfxqDZgvepWfI";

            // Loop to check status (up to 60s)
            const automationStart = Date.now();
            while (Date.now() - automationStart < 60000) {
                const url = page.url();
                
                // 1. Check if success without OTP
                if (url.includes('?showWelcome=true')) {
                    log("🎊 Welcome page reached! Clicking 'Got It!'");
                    await page.waitForSelector('button.bg-success', { timeout: 5000 });
                    await page.click('button.bg-success');
                    success = true;
                    break;
                }

                // 2. Check if OTP is needed
                if (url.includes('/verify')) {
                    log("📧 Verification page detected. Polling OTP for " + email + "...");
                    
                    let otp = null;
                    const otpStart = Date.now();
                    while (Date.now() - otpStart < 40000) {
                        try {
                            const res = await fetch(`${SERVER_URL}/api/live-otp/latest`, {
                                headers: { 'Authorization': `Bearer ${apiToken}` }
                            });
                            const data = await res.json();
                            const list = Array.isArray(data) ? data : [data];
                            const match = list.find(item => item.email === email);
                            
                            if (match && match.otp) {
                                otp = match.otp;
                                break;
                            }
                        } catch (e) {}
                        await new Promise(r => setTimeout(r, 2000));
                        if (page.url().includes('showWelcome=true')) break;
                    }

                    if (otp) {
                        log(`✨ Found OTP: ${otp}. Submitting...`);
                        await page.type('input[placeholder="Enter 7 digit code"]', otp);
                        await page.click('button.bg-primary');
                    }
                }
                
                await new Promise(r => setTimeout(r, 2000));
            }

            if (!success && page.url().includes('showWelcome=true')) {
                log("🎊 Final check: Welcome detected!");
                await page.waitForSelector('button.bg-success', { timeout: 5000 });
                await page.click('button.bg-success');
                success = true;
            }

            await browser.close();
            if (success) {
                log("🏆 CYCLE SUCCESSFUL");
                currentStats.success++;
                completedCycles++;
                return true;
            }
        } catch (e) {
            log(`❌ Cycle Error: ${e.message}`);
        }
        
        log("🥀 CYCLE FAILED");
        currentStats.fail++;
        return false;
    }
}

// --- Main Loop ---
async function main() {
    const automation = new ScriptBloxBot();
    let startTime = null;

    log(`🚀 Bot Initialized | HWID: ${HWID}`);
    log(`📡 Connected to Nexus Hub. Waiting for 'RUN' command...`);

    while (true) {
        const wasRunning = botConfig.isRunning;
        await checkIn();

        if (botConfig.isRunning) {
            if (!wasRunning) {
                log("▶️ SESSION STARTED");
                startTime = Date.now();
                completedCycles = 0; // Reset for new session
            }
            
            const elapsed = (Date.now() - startTime) / 60000;
            
            if (completedCycles >= botConfig.limits.emailsCount) {
                log("🎯 Limit reached (Count). Stopping session.");
                await fetch(`${SERVER_URL}/api/bot/check-in`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hwid: HWID, completedCycles: completedCycles, stats: currentStats })
                });
                continue; // Server will set isRunning to false on next update
            }
            
            if (elapsed >= botConfig.limits.timeMinutes) {
                log("⏰ Limit reached (Time). Stopping session.");
                await fetch(`${SERVER_URL}/api/bot/check-in`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hwid: HWID, completedCycles: completedCycles, stats: currentStats })
                });
                continue;
            }

            log(`\n--- STARTING WORK CYCLE #${completedCycles + 1} ---`);
            await automation.runCycle();
        } else {
            startTime = null; // Reset timer when stopped
            await new Promise(r => setTimeout(r, 5000));
        }

        await new Promise(r => setTimeout(r, 2000));
    }
}

main();
