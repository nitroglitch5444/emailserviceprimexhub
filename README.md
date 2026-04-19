# Nexus Hub - Premium Asset Marketplace

A high-performance marketplace for premium digital assets with automated email delivery and device control.

## Features

- **Automated Delivery**: Support for 'activated_email' products with automated stock management.
- **Premium UI**: Ultra-polished dark mode interface with glassmorphism and motion animations.
- **Admin Dashboard**: Comprehensive control over products, orders, configurations, and connected devices.
- **Live OTP Mode**: Real-time OTP monitoring for rapid verification.
- **Device Control**: Heartbeat-based device management for automated tasks.

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion, Lucide React, Zustand.
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT Auth.
- **Build Tool**: Vite.

## Setup

1. Clone the repository.
2. Install dependencies: `npm install`
3. Configure environment variables (refer to `.env.example`).
4. Start the development server: `npm run dev`
5. Build for production: `npm run build`

## Deployment (Render)

1. Connect your GitHub repository to Render.
2. Create a **Web Service**.
3. Environment: `Node`.
4. Build Command: `npm install && npm run build`
5. Start Command: `npm start`
6. Add all environment variables from `.env.example` to the Render Dashboard.

## Device Client (test.js)

The project includes a secure heartbeat client in `test/test.js`. 
- To use it: `node test/test.js`
- Configure `SERVER_URL` and `SECRET_KEY` inside the script or provide them as environment variables.
- Controls are available in the **Automation** tab of the Admin Dashboard.

## License

MIT
