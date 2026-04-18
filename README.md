# ScriptBlox Bot Control Panel & Dashboard

A full-stack application featuring a React dashboard to control a ScriptBlox automation bot and manage accounts/emails.

## 🚀 Features
- **Admin Dashboard**: Manage products, orders, and configuration.
- **Bot Control**: Start/Stop automation loops on remote devices via Socket.io.
- **Shop**: Crypto-powered checkout for premium assets.
- **Mailbox**: Manage and view emails/OTPs for automated accounts.
- **Automation**: Human-like bot built with `puppeteer-real-browser`.

## 🛠️ Setup

1. **GitHub Upload**:
   - Upload all contents of this folder directly to a **Private** GitHub repository.
   
2. **Deployment (Render.com)**:
   - Create a new **Web Service**.
   - Connect your GitHub repository.
   - **Environment**: Node.js
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start` (or `tsx server.ts`)

3. **Environment Variables**:
   Copy `.env.example` to the "Environment Variables" section on Render and fill in:
   - `MONGO_URI`: Your MongoDB Atlas connection string.
   - `API_SECRET_KEY`: A secure key for bot authentication.
   - `ADMIN_EMAIL`: Your email to grant admin access.
   - `PROXY_HOST`, `PROXY_USER`, `PROXY_PASS`: Your proxy credentials for the bot.

## 🤖 Running the Bot
Once the server is live, anyone running the `bot.cjs` script with the correct `SERVER_URL` and `API_SECRET_KEY` will connect to your dashboard.

---
*Created with Prime X Hub Technology*
