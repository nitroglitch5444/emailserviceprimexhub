const { connect } = require('puppeteer-real-browser');
const fs = require('fs');
const path = require('path');
const io = require('socket.io-client');

/**
 * ScriptBlox Fully Automated Signup Bot
 * 
 * Features:
 * - Controlled via Bot Control Panel (Socket.io)
 * - Powered by puppeteer-real-browser for advanced bot detection bypass
 * - Human-like mouse movements and typing
 */

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const DEVICE_NAME = process.env.DEVICE_NAME || `Bot-${Math.floor(Math.random() * 1000)}`;
const API_SECRET_KEY = process.env.API_SECRET_KEY || 'keyxxx';

const socket = io(SERVER_URL, {
    query: { deviceName: DEVICE_NAME, token: API_SECRET_KEY },
    auth: { token: API_SECRET_KEY }
});

let isBotRunning = false;
let stopRequested = false;
let loopTimeout = null;

socket.on('connect', () => {
    console.log(`📡 Connected to Control Panel at ${SERVER_URL}`);
    console.log(`🤖 Device Name: ${DEVICE_NAME}`);
});

socket.on('start_loop', ({ duration }) => {
    if (isBotRunning) {
        console.log("⚠️ Bot is already running.");
        return;
    }
    console.log(`🚀 Start command received! Duration: ${duration || 'infinite'}s`);
    isBotRunning = true;
    stopRequested = false;
    
    if (duration > 0) {
        if (loopTimeout) clearTimeout(loopTimeout);
        loopTimeout = setTimeout(() => {
            console.log("⏱️ Timer expired. Stopping bot loop...");
            stopRequested = true;
        }, duration * 1000);
    }
    
    const bot = new ScriptBloxBot();
    bot.run();
});

socket.on('stop_loop', () => {
    console.log("🛑 Stop command received! Ending loop...");
    stopRequested = true;
    if (loopTimeout) clearTimeout(loopTimeout);
});

socket.on('disconnect', () => {
    console.log("❌ Disconnected from Control Panel.");
});

const PROXY_HOST = process.env.PROXY_HOST || 'pr-eu.proxies.fo:13337';
const PROXY_USER = process.env.PROXY_USER || 'hhhooph7qa';
const PROXY_PASS = process.env.PROXY_PASS || 'qobax1yhcj';

class ScriptBloxBot {
    constructor() {
        // Common Brave paths on Windows
        this.bravePaths = [
            "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
            "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
            process.env.LOCALAPPDATA + "\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
        ];
        this.browser = null;
        this.page = null;
    }

    // Generate random username
    generateUsername() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789_';
        let user = '';
        for (let i = 0; i < 12; i++) {
            user += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return user;
    }

    // Generate random email
    generateEmail() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let prefix = '';
        for (let i = 0; i < 10; i++) {
            prefix += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `${prefix}@primexhub.shop`;
    }

    async sendDiscordNotification(message) {
        try {
            await fetch(`${SERVER_URL}/api/bot/notify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_SECRET_KEY}`,
                    'x-auth-key': API_SECRET_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });
            console.log("📡 Server notified to send Discord alert.");
        } catch (e) {
            console.error("❌ Failed to notify server for Discord log:", e.message);
        }
    }

    // Human-like robust typing with verification
    async typeRobustly(selector, text) {
        console.log(`⌨️ Typing into ${selector}...`);
        let attempts = 0;
        let success = false;
        
        while (attempts < 3 && !success) {
            try {
                await this.page.waitForSelector(selector, { visible: true, timeout: 16000 });
                
                // Clear existing data reliably
                const input = await this.page.$(selector);
                await input.click({ clickCount: 3 }); 
                await this.page.keyboard.press('Control'); // Windows clear
                await this.page.keyboard.down('Control');
                await this.page.keyboard.press('a');
                await this.page.keyboard.up('Control');
                await this.page.keyboard.press('Backspace');
                
                // Human-like typing
                for (const char of text) {
                    await this.page.type(selector, char, { delay: Math.random() * 50 + 50 });
                }
                
                // Verification check
                const actualValue = await this.page.$eval(selector, el => el.value);
                if (actualValue === text) {
                    success = true;
                    console.log(`✔️ Successfully filled ${selector}`);
                } else {
                    console.log(`⚠️ Mismatch in ${selector}. Expected: "${text}", Got: "${actualValue}". Retrying...`);
                    attempts++;
                }
            } catch (err) {
                console.log(`❌ Attempt ${attempts + 1} failed for ${selector}: ${err.message}`);
                attempts++;
            }
        }
        
        if (!success) throw new Error(`Failed to fill ${selector} after 3 attempts.`);
    }

    // Robustly click 'Got It!' on welcome page
    async clickGotIt() {
        console.log("🎊 Welcome page reached! Success.");
        try {
            const gotItSelector = 'button.bg-success';
            await this.page.waitForSelector(gotItSelector, { visible: true, timeout: 16000 });
            
            const gotItBtn = await this.page.$(gotItSelector);
            const box = await gotItBtn.boundingBox();
            
            // Human-like mouse movement
            await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 30 });
            await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            
            console.log("✔️ 'Got It!' button clicked.");
            await new Promise(r => setTimeout(r, 2000)); // Short wait for animation
        } catch (e) {
            console.log("⚠️ 'Got It!' button not found or already dismissed.");
        }
        return true; 
    }

    // Find Brave executable
    getBravePath() {
        for (const p of this.bravePaths) {
            if (fs.existsSync(p)) return p;
        }
        return null;
    }

    async run() {
        let iteration = 1;

        while (isBotRunning && !stopRequested) {
            console.log(`\n=========================================`);
            console.log(`🚀 STARTING REGISTRATION #${iteration}`);
            console.log(`=========================================\n`);

            try {
                const bravePath = this.getBravePath();
                
                console.log(`🌐 Connecting with Proxy: ${PROXY_HOST}`);
                
                const { browser, page } = await connect({
                    headless: false,
                    args: [
                        "--incognito",
                        `--proxy-server=${PROXY_HOST}`
                    ],
                    customConfig: {},
                    skipTarget: [],
                    fingerprint: true,
                    turnstile: true,
                    connectOption: {
                        executablePath: bravePath || undefined
                    }
                });

                this.browser = browser;
                this.page = page;

            // --- NEW: CDP AD BLOCKER ---
            const client = await this.page.createCDPSession();
            await client.send('Network.enable');
            await client.send('Network.setBlockedURLs', {
                urls: [
                    '*doubleclick.net*',
                    '*googlesyndication.com*',
                    '*adservice.google.com*',
                    '*ads.yahoo.com*',
                    '*.adnxs.com*',
                    '*googletagmanager.com*',
                    '*google-analytics.com*',
                ]
            });
            console.log("🚫 Ad Blocker enabled via CDP.");
            // ---------------------------

            // --- NEW: MULTI-TAB DETECTION ---
            this.browser.on('targetcreated', async (target) => {
                if (target.type() === 'page') {
                    const pages = await this.browser.pages();
                    if (pages.length > 1) {
                        console.log(`⚠️ Multiple tabs detected (${pages.length})! Security breach or ad. Closing browser immediately...`);
                        if (this.browser) await this.browser.close();
                    }
                }
            });
            // --------------------------------

            // Proxy Authentication
            await this.page.authenticate({
                username: PROXY_USER,
                password: PROXY_PASS
            });

            console.log("✅ Proxy Authenticated. Browser ready.");

            // --- NEW: IP CHECK ---
            console.log("🔍 Fetching Proxy IP address...");
            try {
                // Using a light-weight IP check service
                await this.page.goto('https://api.ipify.org?format=json', { waitUntil: 'domcontentloaded', timeout: 30000 });
                const ipInfo = await this.page.$eval('body', el => {
                    try { return JSON.parse(el.innerText).ip; } catch(e) { return el.innerText; }
                });
                console.log(`📡 Current Connection IP: ${ipInfo}`);
            } catch (e) {
                console.log("⚠️ Could not display IP, but proceeding anyway...");
            }
            // ---------------------

            await this.page.setViewport({ width: 1280, height: 800 });

        try {
            console.log("🔗 Navigating to ScriptBlox Signup...");
            const iterationStartTime = Date.now(); // Start total iteration timer
            await this.page.goto('https://scriptblox.com/signup', { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Medium speed delay
            const mediumDelay = async () => await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

            // Wait for form to be visible
            await this.page.waitForSelector('input[type="email"]', { timeout: 30000 });

            // 1. Fill Email (Robustly)
            const fillingStartTime = Date.now(); // Start timer for dynamic delay
            const email = this.generateEmail();
            console.log(`📧 Filling Email: ${email}`);
            await this.typeRobustly('input[type="email"][placeholder="Enter email address"]', email);
            await mediumDelay();

            // 2. Untouched/Skip Username (as requested: "is box ko untouched rahne dena")
            console.log("⏭️ Skipping Username field (Untouched)...");
            await mediumDelay();

            // 3. Fill Passwords (user01@g)
            const password = "user01@g";
            console.log(`🔑 Filling Passwords: ${password}`);
            await this.typeRobustly('input[type="password"][placeholder="Password"]', password);
            await this.typeRobustly('input[type="password"][placeholder="Repeat Password"]', password);
            await mediumDelay();

            // 4. Handle Checkbox
            console.log("✅ Ticking Terms Checkbox...");
            const checkboxSelector = 'button[role="checkbox"]';
            await this.page.waitForSelector(checkboxSelector, { visible: true });
            
            // Move mouse to checkbox and click
            const checkbox = await this.page.$(checkboxSelector);
            const box = await checkbox.boundingBox();
            
            // Human-like mouse movement
            await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 30 }); 
            await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            console.log("✔️ Checkbox clicked.");
            await mediumDelay();

            // 5. Wait for Captcha and click Sign Up
            console.log("🛡️ Waiting for Captcha (Turnstile) success...");
            
            // --- NEW: EXTENDED FINAL FIELD VERIFICATION ---
            console.log("🧐 Running final field integrity check...");
            
            const getFormState = async () => {
                return await this.page.evaluate(() => {
                    const emailInput = document.querySelector('input[type="email"][placeholder="Enter email address"]');
                    const passInput = document.querySelector('input[type="password"][placeholder="Password"]');
                    const repeatPassInput = document.querySelector('input[type="password"][placeholder="Repeat Password"]');
                    const checkbox = document.querySelector('button[role="checkbox"]');
                    
                    return {
                        email: emailInput ? emailInput.value : '',
                        pass: passInput ? passInput.value : '',
                        repeat: repeatPassInput ? repeatPassInput.value : '',
                        checkboxChecked: checkbox ? checkbox.getAttribute('aria-checked') === 'true' : false,
                        checkboxState: checkbox ? checkbox.getAttribute('data-state') === 'checked' : false
                    };
                });
            };

            const verifyAndFixForm = async () => {
                const state = await getFormState();
                let isCorrect = true;

                if (state.email !== email) {
                    console.log(`⚠️ Email mismatch! Re-filling...`);
                    await this.typeRobustly('input[type="email"][placeholder="Enter email address"]', email);
                    isCorrect = false;
                }
                if (state.pass !== password) {
                    console.log(`⚠️ Password mismatch! Re-filling...`);
                    await this.typeRobustly('input[type="password"][placeholder="Password"]', password);
                    isCorrect = false;
                }
                if (state.repeat !== password) {
                    console.log(`⚠️ Repeat Password mismatch! Re-filling...`);
                    await this.typeRobustly('input[type="password"][placeholder="Repeat Password"]', password);
                    isCorrect = false;
                }
                
                // FIXED logic: only click if it's REALLY not checked and we aren't in a transition
                if (!state.checkboxChecked || !state.checkboxState) {
                    console.log(`⚠️ Checkbox not ticked properly! Ticking...`);
                    try {
                        await this.page.click('button[role="checkbox"]');
                        await new Promise(r => setTimeout(r, 1000)); // Stabilization wait
                    } catch (e) {
                        console.log("⚠️ Checkbox click failed: " + e.message);
                    }
                    isCorrect = false;
                }
                return isCorrect;
            };
            // ----------------------------------------------

            // --- NEW: DYNAMIC SECURITY DELAY (x + y = 20s) ---
            const xTime = Date.now() - fillingStartTime; 
            const threshold = 20000; // 20 seconds total

            if (xTime < threshold) {
                const yTime = threshold - xTime;
                console.log(`⌛ Data filled in ${Math.round(xTime/1000)}s. Waiting for additional ${Math.round(yTime/1000)}s to reach 20s threshold...`);
                await new Promise(r => setTimeout(r, yTime));
            }

            console.log("🧐 Running one last field integrity check before click...");
            const isFinalOk = await verifyAndFixForm();
            if (!isFinalOk) {
                console.log("⏳ Stabilizing form one last time...");
                await new Promise(r => setTimeout(r, 1000));
            }
            // -------------------------------------------------

            const signUpBtnSelector = 'button.bg-primary';
            await this.page.waitForSelector(signUpBtnSelector, { visible: true });
            
            const signUpBtn = await this.page.$(signUpBtnSelector);
            const btnBox = await signUpBtn.boundingBox();
            
            // Human-like mouse movement
            await this.page.mouse.move(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2, { steps: 30 });
            await this.page.mouse.click(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2);

            console.log("🎉 Signup process triggered!");
            
            // --- NEW: REDIRECTION MONITORING (45s TIMEOUT) ---
            console.log("⏳ Waiting for redirection to /verify (45s iteration limit)...");
            
            let status = "PENDING";
            const emergencyLimit = 40000; // 40s
            const totalLimit = 45000; // 45s
            
            while (true) {
                const elapsed = Date.now() - iterationStartTime;
                const url = this.page.url();
                
                if (url.includes('/verify')) {
                    status = "VERIFY";
                    break;
                }
                if (url.includes('?showWelcome=true')) {
                    status = "SUCCESS";
                    break;
                }
                
                // Emergency tap 3 seconds before closing
                if (elapsed >= emergencyLimit && elapsed < emergencyLimit + 1000) {
                    console.log("⚠️ Emergency! 40s passed without redirect. Tapping Sign Up again...");
                    try {
                        await this.page.click(signUpBtnSelector);
                    } catch (e) {}
                }
                
                // Total timeout
                if (elapsed >= totalLimit) {
                    console.log("❌ 45s iteration limit reached without redirect to /verify. Closing browser...");
                    throw new Error("ITERATION_TIMEOUT");
                }
                
                // Multi-tab detection
                const pages = await this.browser.pages();
                if (pages.length > 1) throw new Error("MULTIPLE_TABS_DETECTED");
                
                await new Promise(r => setTimeout(r, 500));
            }
            // --------------------------------------------------

            const targetEmail = email;
            const apiToken = process.env.ADMIN_TOKEN;

            if (status === "SUCCESS") {
                // Done
            } else if (status === "VERIFY") {
                console.log("📧 On verification page. Starting OTP polling...");
                
                let otp = null;
                const startTime = Date.now();
                const timeoutLimit = 36000; // 36 seconds

                // First request after 3s
                await new Promise(r => setTimeout(r, 3000));

                while (Date.now() - startTime < timeoutLimit) {
                    try {
                        const res = await fetch(`${SERVER_URL}/api/live-otp/latest`, {
                            method: 'GET',
                            headers: { 
                                'Authorization': `Bearer ${API_SECRET_KEY}`,
                                'x-auth-key': API_SECRET_KEY,
                                'Accept': 'application/json'
                            },
                            signal: AbortSignal.timeout(16000) // 16 second timeout
                        });
                        
                        const data = await res.json();
                        
                        if (res.ok) {
                            // Checking if data is array (latest version)
                            const list = Array.isArray(data) ? data : [data];
                            
                            // Match email in the list
                            const match = list.find(item => item.email === targetEmail);
                            if (match && match.otp) {
                                otp = match.otp;
                                console.log(`✨ Found OTP for ${targetEmail}: ${otp}`);
                                break;
                            }
                        } else {
                            console.log(`⚠️ Server Error: ${res.status} - ${data.error || 'Unknown'}`);
                        }
                    } catch (e) {
                        if (e.name === 'TimeoutError') {
                            console.log("⏳ Connection Timeout - Server is slow/waking up...");
                        } else {
                            console.log("⚠️ Connection error or API is down, retrying...");
                            console.log("Debug Info:", e.message);
                        }
                    }
                    
                    console.log(`⏱️ Polling OTP... (${Math.round((Date.now() - startTime) / 1000)}s)`);
                    await new Promise(r => setTimeout(r, 2000)); // Polling every 2s
                    
                    // Also check if we got redirected to welcome in the meantime
                    if (this.page.url().includes('?showWelcome=true')) {
                        console.log("🎊 Redirected to welcome page during polling! Success.");
                        await this.clickGotIt();
                        otp = "ALREADY_VERIFIED";
                        break;
                    }
                }

                if (otp === "ALREADY_VERIFIED") {
                    // Success
                } else if (otp) {
                    const otpSelector = 'input[placeholder="Enter 7 digit code"]';
                    await this.typeRobustly(otpSelector, otp);
                    
                    // 6. Click Verify Button
                    console.log("🚀 Clicking Verify Button...");
                    const verifyBtnSelector = 'button.bg-primary';
                    await this.page.waitForSelector(verifyBtnSelector, { visible: true });
                    
                    const verifyBtn = await this.page.$(verifyBtnSelector);
                    const vBtnBox = await verifyBtn.boundingBox();
                    
                    // Human-like mouse movement
                    await this.page.mouse.move(vBtnBox.x + vBtnBox.width / 2, vBtnBox.y + vBtnBox.height / 2, { steps: 30 });
                    await this.page.mouse.click(vBtnBox.x + vBtnBox.width / 2, vBtnBox.y + vBtnBox.height / 2);
                    
                    console.log("✔️ OTP submitted. Checking for final redirection...");
                    
                    // Final wait for welcome page (up to 21s)
                    for (let i = 0; i < 21; i++) {
                        if (this.page.url().includes('?showWelcome=true')) {
                             console.log("🎊 Success! Account verified and logged in.");
                             await this.sendDiscordNotification(`✅ **Success!** New ScriptBlox account created: \`${email}\``);
                             await this.clickGotIt();
                             break;
                        }
                        await new Promise(r => setTimeout(r, 1000));
                    }
                } else {
                    console.log("❌ OTP not received within 30 seconds.");
                }
            } else {
                console.log("❌ Failed to reach verification page.");
            }

            console.log(`\n🏁 Completed Iteration #${iteration}. Reopening with new Proxy IP...\n`);
            iteration++;
            if (this.browser) await this.browser.close();
            await new Promise(r => setTimeout(r, 3000)); // Short pause before next cycle

            } catch (error) {
                console.error("❌ Error during automation:", error);
                try {
                    if (this.page) await this.page.screenshot({ path: `error_iter_${iteration}.png` });
                } catch (e) {}
                if (this.browser) await this.browser.close();
                await new Promise(r => setTimeout(r, 5000)); // Delay after error
            }
        }
        isBotRunning = false;
        console.log("🔚 Bot loop ended.");
    }
}
