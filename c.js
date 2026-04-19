import { connect } from 'puppeteer-real-browser';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

/**
 * ScriptBlox Fully Automated Signup Bot (Command-Led Version)
 * 100% Logic Parity with user's provided snippet.
 */

const API_BASE = 'http://localhost:3000/api';
const SECRET = process.env.API_SECRET_KEY || 'keyxxx';

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
        this.isRunning = false;
        this.shouldStop = false;
    }

    async log(message, level = 'info') {
        console.log(`[${level.toUpperCase()}] ${message}`);
        try {
            await axios.post(`${API_BASE}/automation/report`, {
                message,
                level,
                secret: SECRET,
                isRunning: this.isRunning
            });
        } catch (err) {
            // Silently fail log report
        }
    }

    async reportStatus(status = null) {
        try {
            const res = await axios.post(`${API_BASE}/automation/report`, {
                status,
                isRunning: this.isRunning,
                secret: SECRET
            });
            return res.data.command;
        } catch (err) {
            return null;
        }
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

    // Human-like robust typing with verification
    async typeRobustly(selector, text) {
        await this.log(`⌨️ Typing into ${selector}...`, 'info');
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
                    await this.log(`✔️ Successfully filled ${selector}`, 'success');
                } else {
                    await this.log(`⚠️ Mismatch in ${selector}. Expected: "${text}", Got: "${actualValue}". Retrying...`, 'warn');
                    attempts++;
                }
            } catch (err) {
                await this.log(`❌ Attempt ${attempts + 1} failed for ${selector}: ${err.message}`, 'error');
                attempts++;
            }
        }
        
        if (!success) throw new Error(`Failed to fill ${selector} after 3 attempts.`);
    }

    // Robustly click 'Got It!' on welcome page
    async clickGotIt() {
        await this.log("🎊 Welcome page reached! Success.", 'success');
        try {
            const gotItSelector = 'button.bg-success';
            await this.page.waitForSelector(gotItSelector, { visible: true, timeout: 16000 });
            
            const gotItBtn = await this.page.$(gotItSelector);
            const box = await gotItBtn.boundingBox();
            
            // Human-like mouse movement
            await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 30 });
            await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            
            await this.log("✔️ 'Got It!' button clicked.", 'success');
            await new Promise(r => setTimeout(r, 2000)); // Short wait for animation
        } catch (e) {
            await this.log("⚠️ 'Got It!' button not found or already dismissed.", 'warn');
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

    async runRegistrationCycle(passwordShortcut) {
        if (this.isRunning) return;
        this.isRunning = true;
        this.shouldStop = false;

        let password = "user01@g"; // default
        if (passwordShortcut === 'a') password = "gonabot@5414";
        else if (passwordShortcut === 's') password = "user01@g";

        let iteration = 1;

        while (this.isRunning && !this.shouldStop) {
            await this.log(`\n=========================================`, 'info');
            await this.log(`🚀 STARTING REGISTRATION #${iteration}`, 'info');
            await this.log(`=========================================\n`, 'info');

            const bravePath = this.getBravePath();
            await this.log("🌐 Connecting with Proxy: hhhooph7qa:qobax1yhcj@pr-eu.proxies.fo:13337", 'info');
            
            try {
                const { browser, page } = await connect({
                    headless: false,
                    args: [
                        "--incognito",
                        "--proxy-server=pr-eu.proxies.fo:13337"
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

                // --- CDP AD BLOCKER ---
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
                await this.log("🚫 Ad Blocker enabled via CDP.", 'info');

                // --- MULTI-TAB DETECTION ---
                this.browser.on('targetcreated', async (target) => {
                    if (target.type() === 'page') {
                        const pages = await this.browser.pages();
                        if (pages.length > 1) {
                            await this.log(`⚠️ Multiple tabs detected (${pages.length})! Security breach or ad. Closing browser...`, 'warn');
                            await this.stop();
                        }
                    }
                });

                // Proxy Authentication
                await this.page.authenticate({
                    username: "hhhooph7qa",
                    password: "qobax1yhcj"
                });

                await this.log("✅ Proxy Authenticated. Browser ready.", 'success');

                // --- IP CHECK ---
                await this.log("🔍 Fetching Proxy IP address...", 'info');
                try {
                    await this.page.goto('https://api.ipify.org?format=json', { waitUntil: 'domcontentloaded', timeout: 30000 });
                    const ipInfo = await this.page.$eval('body', el => {
                        try { return JSON.parse(el.innerText).ip; } catch(e) { return el.innerText; }
                    });
                    await this.log(`📡 Current Connection IP: ${ipInfo}`, 'success');
                } catch (e) {
                    await this.log("⚠️ Could not display IP, but proceeding anyway...", 'warn');
                }

                await this.page.setViewport({ width: 1280, height: 800 });

                await this.log("🔗 Navigating to ScriptBlox Signup...", 'info');
                const iterationStartTime = Date.now();
                await this.page.goto('https://scriptblox.com/signup', { waitUntil: 'domcontentloaded', timeout: 60000 });

                const mediumDelay = async () => await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
                await this.page.waitForSelector('input[type="email"]', { timeout: 30000 });

                // 1. Fill Email (Robustly)
                const fillingStartTime = Date.now();
                const email = this.generateEmail();
                await this.log(`📧 Filling Email: ${email}`, 'info');
                await this.typeRobustly('input[type="email"][placeholder="Enter email address"]', email);
                await mediumDelay();

                // 2. Untouched/Skip Username
                await this.log("⏭️ Skipping Username field (Untouched)...", 'info');
                await mediumDelay();

                // 3. Fill Passwords
                await this.log(`🔑 Filling Passwords: ${password}`, 'info');
                await this.typeRobustly('input[type="password"][placeholder="Password"]', password);
                await this.typeRobustly('input[type="password"][placeholder="Repeat Password"]', password);
                await mediumDelay();

                // 4. Handle Checkbox
                await this.log("✅ Ticking Terms Checkbox...", 'info');
                const checkboxSelector = 'button[role="checkbox"]';
                await this.page.waitForSelector(checkboxSelector, { visible: true });
                const checkbox = await this.page.$(checkboxSelector);
                const box = await checkbox.boundingBox();
                await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 30 }); 
                await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                await this.log("✔️ Checkbox clicked.", 'success');
                await mediumDelay();

                // 5. Wait for Captcha and click Sign Up
                await this.log("🛡️ Waiting for Captcha (Turnstile) success...", 'info');
                
                // --- EXTENDED FINAL FIELD VERIFICATION ---
                await this.log("🧐 Running final field integrity check...", 'info');
                
                const getFormState = async () => {
                    return await this.page.evaluate(() => {
                        const emailInput = document.querySelector('input[type="email"][placeholder="Enter email address"]');
                        const passInput = document.querySelector('input[type="password"][placeholder="Password"]');
                        const repeatPassInput = document.querySelector('input[type="password"][placeholder="Repeat Password"]');
                        const chk = document.querySelector('button[role="checkbox"]');
                        return {
                            email: emailInput ? emailInput.value : '',
                            pass: passInput ? passInput.value : '',
                            repeat: repeatPassInput ? repeatPassInput.value : '',
                            checkboxChecked: chk ? chk.getAttribute('aria-checked') === 'true' : false,
                            checkboxState: chk ? chk.getAttribute('data-state') === 'checked' : false
                        };
                    });
                };

                const verifyAndFixForm = async () => {
                    const state = await getFormState();
                    let isCorrect = true;
                    if (state.email !== email) {
                        await this.log(`⚠️ Email mismatch! Re-filling...`, 'warn');
                        await this.typeRobustly('input[type="email"][placeholder="Enter email address"]', email);
                        isCorrect = false;
                    }
                    if (state.pass !== password) {
                        await this.log(`⚠️ Password mismatch! Re-filling...`, 'warn');
                        await this.typeRobustly('input[type="password"][placeholder="Password"]', password);
                        isCorrect = false;
                    }
                    if (state.repeat !== password) {
                        await this.log(`⚠️ Repeat Password mismatch! Re-filling...`, 'warn');
                        await this.typeRobustly('input[type="password"][placeholder="Repeat Password"]', password);
                        isCorrect = false;
                    }
                    if (!state.checkboxChecked || !state.checkboxState) {
                        await this.log(`⚠️ Checkbox not ticked properly! Ticking...`, 'warn');
                        try {
                            await this.page.click('button[role="checkbox"]');
                            await new Promise(r => setTimeout(r, 1000));
                        } catch (e) {
                            await this.log(`⚠️ Checkbox click failed: ${e.message}`, 'error');
                        }
                        isCorrect = false;
                    }
                    return isCorrect;
                };

                // --- DYNAMIC SECURITY DELAY (x + y = 20s) ---
                const xTime = Date.now() - fillingStartTime; 
                const threshold = 20000;
                if (xTime < threshold) {
                    const yTime = threshold - xTime;
                    await this.log(`⌛ Data filled in ${Math.round(xTime/1000)}s. Waiting for ${Math.round(yTime/1000)}s total 20s...`, 'info');
                    await new Promise(r => setTimeout(r, yTime));
                }

                await this.log("🧐 Running one last field integrity check before click...", 'info');
                const isFinalOk = await verifyAndFixForm();
                if (!isFinalOk) {
                    await this.log("⏳ Stabilizing form one last time...", 'info');
                    await new Promise(r => setTimeout(r, 1000));
                }

                const signUpBtnSelector = 'button.bg-primary';
                await this.page.waitForSelector(signUpBtnSelector, { visible: true });
                const signUpBtn = await this.page.$(signUpBtnSelector);
                const btnBox = await signUpBtn.boundingBox();
                await this.page.mouse.move(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2, { steps: 30 });
                await this.page.mouse.click(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2);
                await this.log("🎉 Signup process triggered!", 'success');
                
                // --- REDIRECTION MONITORING (45s TIMEOUT) ---
                await this.log("⏳ Waiting for redirection to /verify (45s iteration limit)...", 'info');
                
                let iterationStat = "PENDING";
                const emergencyLimit = 40000;
                const totalLimit = 45000;
                
                while (true) {
                    const elapsed = Date.now() - iterationStartTime;
                    const url = this.page.url();
                    
                    if (url.includes('/verify')) { iterationStat = "VERIFY"; break; }
                    if (url.includes('?showWelcome=true')) { iterationStat = "SUCCESS"; break; }
                    
                    if (elapsed >= emergencyLimit && elapsed < emergencyLimit + 1000) {
                        await this.log("⚠️ Emergency! 40s passed. Re-tapping Sign Up...", 'warn');
                        try { await this.page.click(signUpBtnSelector); } catch (e) {}
                    }
                    if (elapsed >= totalLimit || this.shouldStop) {
                        await this.log("❌ 45s iteration limit reached. Closing browser...", 'error');
                        throw new Error("ITERATION_TIMEOUT");
                    }
                    const pages = await this.browser.pages();
                    if (pages.length > 1) throw new Error("MULTIPLE_TABS_DETECTED");
                    
                    await new Promise(r => setTimeout(r, 500));
                }

                const apiToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5Y2VjNDI5NDJjNTBjZDA0NmUyNDBhNSIsInVzZXJuYW1lIjoid2UiLCJpc0FkbWluIjp0cnVlLCJpYXQiOjE3NzYwMjMxMzEsImV4cCI6MTc3NjYyNzkzMX0.MWJr58NueyJOy5R996ScSqeH_Cy-FOJfxqDZgvepWfI";

                if (iterationStat === "SUCCESS") {
                    await this.clickGotIt();
                } else if (iterationStat === "VERIFY") {
                    await this.log("📧 On verification page. Starting OTP polling...", 'info');
                    let otp = null;
                    const startTime = Date.now();
                    const timeoutLimit = 36000;

                    await new Promise(r => setTimeout(r, 3000));
                    while (Date.now() - startTime < timeoutLimit && !this.shouldStop) {
                        try {
                            const res = await axios.get(`https://primexhub.shop/api/live-otp/latest`, {
                                headers: { 'Authorization': `Bearer ${apiToken}`, 'Accept': 'application/json' }
                            });
                            const list = Array.isArray(res.data) ? res.data : [res.data];
                            const match = list.find(item => item.email === email);
                            if (match && match.otp) {
                                otp = match.otp;
                                await this.log(`✨ Found OTP for ${email}: ${otp}`, 'success');
                                break;
                            }
                        } catch (e) {
                            await this.log("⏳ Connection polling...", 'info');
                        }
                        
                        if (this.page.url().includes('?showWelcome=true')) {
                            await this.log("🎊 Redirected to welcome page during polling! Success.", 'success');
                            await this.clickGotIt();
                            otp = "ALREADY_VERIFIED";
                            break;
                        }
                        await new Promise(r => setTimeout(r, 2000));
                    }

                    if (otp && otp !== "ALREADY_VERIFIED") {
                        const otpSelector = 'input[placeholder="Enter 7 digit code"]';
                        await this.typeRobustly(otpSelector, otp);
                        
                        await this.log("🚀 Clicking Verify Button...", 'info');
                        const verifyBtnSelector = 'button.bg-primary';
                        await this.page.waitForSelector(verifyBtnSelector, { visible: true });
                        const verifyBtn = await this.page.$(verifyBtnSelector);
                        const vBtnBox = await verifyBtn.boundingBox();
                        await this.page.mouse.move(vBtnBox.x + vBtnBox.width / 2, vBtnBox.y + vBtnBox.height / 2, { steps: 30 });
                        await this.page.mouse.click(vBtnBox.x + vBtnBox.width / 2, vBtnBox.y + vBtnBox.height / 2);
                        
                        await this.log("✔️ OTP submitted. Waiting for final redirection...", 'info');
                        for (let i = 0; i < 21; i++) {
                            if (this.page.url().includes('?showWelcome=true')) {
                                 await this.log("🎊 Success! Account verified and logged in.", 'success');
                                 await this.clickGotIt();
                                 break;
                            }
                            await new Promise(r => setTimeout(r, 1000));
                        }
                    } else if (!otp) {
                        await this.log("❌ OTP not received within timeout.", 'error');
                    }
                }

                await this.log(`🏁 Completed Iteration #${iteration}. Reopening cycle...\n`, 'success');
                iteration++;
                if (this.browser) await this.browser.close();
                await new Promise(r => setTimeout(r, 3000));

            } catch (error) {
                await this.log(`❌ Error during automation: ${error.message}`, 'error');
                if (this.browser) await this.browser.close();
                await new Promise(r => setTimeout(r, 5000));
            }

            // Command Check
            const cmd = await this.reportStatus();
            if (cmd === 'stop') break;
        }
        await this.stop();
    }

    async stop() {
        this.shouldStop = true;
        if (this.browser) {
            try { await this.browser.close(); } catch(e) {}
            this.browser = null;
        }
        this.isRunning = false;
        await this.log('🛑 Automation stopped. Browser closed.', 'warn');
        await this.reportStatus('idle');
    }

    async runControlLoop() {
        await this.log('🤖 Bot control loop active. Polling commands...', 'info');
        while (true) {
            const command = await this.reportStatus();
            if (command && command.startsWith('start')) {
                const parts = command.split(' ');
                this.runRegistrationCycle(parts[1] || 's');
            } else if (command === 'stop') {
                await this.stop();
            }
            await new Promise(r => setTimeout(r, 3000));
        }
    }
}

const bot = new ScriptBloxBot();
bot.runControlLoop();
