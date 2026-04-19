import { connect } from 'puppeteer-real-browser';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

/**
 * ScriptBlox Fully Automated Signup Bot (Remote PC Version)
 * Polling from database-backed API.
 */

const API_BASE = 'https://primexhub.shop/api';
const SECRET = process.env.API_SECRET_KEY || 'keyxxx';

class ScriptBloxBot {
    constructor() {
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
            console.error(`[INTERNAL ERROR] Failed to send log to server: ${err.message}`);
            if (err.response) {
                console.error(`[SERVER RESPONSE] Status: ${err.response.status}, Data: ${JSON.stringify(err.response.data)}`);
            }
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
            console.error(`[INTERNAL ERROR] Failed to poll status: ${err.message}`);
            return null;
        }
    }

    generateUsername() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789_';
        let user = '';
        for (let i = 0; i < 12; i++) {
            user += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return user;
    }

    generateEmail() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let prefix = '';
        for (let i = 0; i < 10; i++) {
            prefix += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `${prefix}@primexhub.shop`;
    }

    async typeRobustly(selector, text) {
        await this.log(`⌨️ Typing into ${selector}...`, 'info');
        let attempts = 0;
        let success = false;
        
        while (attempts < 3 && !success) {
            try {
                await this.page.waitForSelector(selector, { visible: true, timeout: 16000 });
                
                const input = await this.page.$(selector);
                await input.click({ clickCount: 3 }); 
                await this.page.keyboard.press('Control');
                await this.page.keyboard.down('Control');
                await this.page.keyboard.press('a');
                await this.page.keyboard.up('Control');
                await this.page.keyboard.press('Backspace');
                
                for (const char of text) {
                    await this.page.type(selector, char, { delay: Math.random() * 50 + 50 });
                }
                
                const actualValue = await this.page.$eval(selector, el => el.value);
                if (actualValue === text) {
                    success = true;
                    await this.log(`✔️ Successfully filled ${selector}`, 'success');
                } else {
                    await this.log(`⚠️ Mismatch in ${selector}. Retrying...`, 'warn');
                    attempts++;
                }
            } catch (err) {
                await this.log(`❌ Attempt ${attempts + 1} failed for ${selector}: ${err.message}`, 'error');
                attempts++;
            }
        }
        
        if (!success) throw new Error(`Failed to fill ${selector} after 3 attempts.`);
    }

    async clickGotIt() {
        await this.log("🎊 Welcome page reached! Success.", 'success');
        try {
            const gotItSelector = 'button.bg-success';
            await this.page.waitForSelector(gotItSelector, { visible: true, timeout: 16000 });
            
            const gotItBtn = await this.page.$(gotItSelector);
            const box = await gotItBtn.boundingBox();
            
            await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 30 });
            await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            
            await this.log("✔️ 'Got It!' button clicked.", 'success');
            await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
            await this.log("⚠️ 'Got It!' button not found or already dismissed.", 'warn');
        }
        return true; 
    }

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

        let password = "user01@g";
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

                this.browser.on('targetcreated', async (target) => {
                    if (target.type() === 'page') {
                        const pages = await this.browser.pages();
                        if (pages.length > 1) {
                            await this.log(`⚠️ Multiple tabs detected. Closing browser...`, 'warn');
                            await this.stop();
                        }
                    }
                });

                await this.page.authenticate({
                    username: "hhhooph7qa",
                    password: "qobax1yhcj"
                });

                await this.log("✅ Proxy Authenticated. Browser ready.", 'success');

                await this.log("🔍 Fetching Proxy IP address...", 'info');
                try {
                    await this.page.goto('https://api.ipify.org?format=json', { waitUntil: 'domcontentloaded', timeout: 30000 });
                    const ipInfo = await this.page.$eval('body', el => {
                        try { return JSON.parse(el.innerText).ip; } catch(e) { return el.innerText; }
                    });
                    await this.log(`📡 Current Connection IP: ${ipInfo}`, 'success');
                } catch (e) {
                    await this.log("⚠️ Could not display IP, proceeding anyway...", 'warn');
                }

                await this.page.setViewport({ width: 1280, height: 800 });

                await this.log("🔗 Navigating to ScriptBlox Signup...", 'info');
                const iterationStartTime = Date.now();
                await this.page.goto('https://scriptblox.com/signup', { waitUntil: 'domcontentloaded', timeout: 60000 });

                const mediumDelay = async () => await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
                await this.page.waitForSelector('input[type="email"]', { timeout: 30000 });

                const fillingStartTime = Date.now();
                const email = this.generateEmail();
                await this.log(`📧 Filling Email: ${email}`, 'info');
                await this.typeRobustly('input[type="email"][placeholder="Enter email address"]', email);
                await mediumDelay();

                await this.log("⏭️ Skipping Username field (Untouched)...", 'info');
                await mediumDelay();

                await this.log(`🔑 Filling Passwords: ${password}`, 'info');
                await this.typeRobustly('input[type="password"][placeholder="Password"]', password);
                await this.typeRobustly('input[type="password"][placeholder="Repeat Password"]', password);
                await mediumDelay();

                await this.log("✅ Ticking Terms Checkbox...", 'info');
                const checkboxSelector = 'button[role="checkbox"]';
                await this.page.waitForSelector(checkboxSelector, { visible: true });
                const checkbox = await this.page.$(checkboxSelector);
                const box = await checkbox.boundingBox();
                await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 30 }); 
                await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                await this.log("✔️ Checkbox clicked.", 'success');
                await mediumDelay();

                await this.log("🛡️ Waiting for Captcha (Turnstile) success...", 'info');
                
                const xTime = Date.now() - fillingStartTime; 
                const threshold = 20000;
                if (xTime < threshold) {
                    const yTime = threshold - xTime;
                    await this.log(`⌛ Security delay: wait ${Math.round(yTime/1000)}s...`, 'info');
                    await new Promise(r => setTimeout(r, yTime));
                }

                const signUpBtnSelector = 'button.bg-primary';
                await this.page.waitForSelector(signUpBtnSelector, { visible: true });
                const signUpBtn = await this.page.$(signUpBtnSelector);
                const btnBox = await signUpBtn.boundingBox();
                await this.page.mouse.move(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2, { steps: 30 });
                await this.page.mouse.click(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2);
                await this.log("🎉 Signup process triggered!", 'success');
                
                let iterationStat = "PENDING";
                const totalLimit = 45000;
                while (true) {
                    const elapsed = Date.now() - iterationStartTime;
                    if (this.page.url().includes('/verify')) { iterationStat = "VERIFY"; break; }
                    if (this.page.url().includes('?showWelcome=true')) { iterationStat = "SUCCESS"; break; }
                    if (elapsed >= totalLimit || this.shouldStop) break;
                    await new Promise(r => setTimeout(r, 1000));
                }

                if (iterationStat === "SUCCESS") {
                    await this.clickGotIt();
                } else if (iterationStat === "VERIFY") {
                    await this.log("📧 On verification page. Starting OTP polling...", 'info');
                    const apiToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5Y2VjNDI5NDJjNTBjZDA0NmUyNDBhNSIsInVzZXJuYW1lIjoid2UiLCJpc0FkbWluIjp0cnVlLCJpYXQiOjE3NzYwMjMxMzEsImV4cCI6MTc3NjYyNzkzMX0.MWJr58NueyJOy5R996ScSqeH_Cy-FOJfxqDZgvepWfI";
                    let otp = null;
                    const startTime = Date.now();
                    await new Promise(r => setTimeout(r, 3000));
                    while (Date.now() - startTime < 36000 && !this.shouldStop) {
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
                        } catch (e) {}
                        if (this.page.url().includes('?showWelcome=true')) {
                            await this.clickGotIt();
                            otp = "ALREADY_VERIFIED";
                            break;
                        }
                        await new Promise(r => setTimeout(r, 2000));
                    }

                    if (otp && otp !== "ALREADY_VERIFIED") {
                        await this.typeRobustly('input[placeholder="Enter 7 digit code"]', otp);
                        await this.page.click('button.bg-primary');
                        await this.log("✔️ OTP submitted. Checking final status...", 'info');
                        for (let i = 0; i < 15; i++) {
                            if (this.page.url().includes('?showWelcome=true')) {
                                 await this.log("🎊 Success! Registration complete.", 'success');
                                 await this.clickGotIt();
                                 break;
                            }
                            await new Promise(r => setTimeout(r, 1000));
                        }
                    }
                }

                await this.log(`🏁 Completed Iteration #${iteration}. Cycle restart...`, 'success');
                iteration++;
                if (this.browser) await this.browser.close();
                await new Promise(r => setTimeout(r, 3000));

            } catch (error) {
                await this.log(`❌ Error: ${error.message}`, 'error');
                if (this.browser) await this.browser.close();
                await new Promise(r => setTimeout(r, 5000));
            }

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
        await this.log('🛑 Automation stopped.', 'warn');
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
