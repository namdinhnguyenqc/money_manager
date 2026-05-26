# Developer Getting-Started Guide

This guide describes how to set up the TrọCare local development environment, install system dependencies, and run the backend Hono API server alongside the Next.js web administration portal and the Expo React Native mobile application.

---

## 1. System Requirements & Software

Ensure your local workstation has the following tools installed before beginning installation:

- **Node.js**: Version `18.x` or higher (Version `20.x` LTS recommended).
- **Package Manager**: `npm` (packaged with Node.js) or `yarn`.
- **Database Engine**: Access to a Supabase Cloud instance or local Supabase CLI installation.
- **Mobile Development Tools** (Only for Mobile Client):
  - **Android Studio**: Android SDK, AVD Manager (Emulator Setup), and platform tools.
  - **Xcode** (macOS only): For running iOS Simulator and deploying to Apple devices.
  - **Expo Go App**: Download on your physical Android or iOS device to test without computer compilation.

---

## 2. Environment Configurations (Dotenv Setup)

To coordinate the frontend, mobile, and backend microservices, developers must configure local environment files under their respective project roots.

### A. Hono Backend Configuration (`backend/.env`)
Create a file named `.env` inside the `backend/` directory:

```env
# Server Network Parameters
API_PORT=8787
NODE_ENV=development

# Supabase Storage & Relational Connections
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_ANON_KEY=<your-anonymous-public-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-admin-key>

# DB Mock Mode Toggle (Set false to use active Supabase tables)
IS_MOCK=false

# Token Signatures Secrets
JWT_SECRET=use-a-secure-random-32-character-hash-here

# Google OAuth Integration
GOOGLE_CLIENT_ID=<your-app-google-client-id>
GOOGLE_CLIENT_SECRET=<your-app-google-client-secret>

# Permitted Client Origins (CORS configuration)
CORS_ORIGINS=http://localhost:3001,http://localhost:3000
```

### B. Web-Admin Frontend Configuration (`web-admin/.env.local`)
Create a file named `.env.local` inside the `web-admin/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8787
```

### C. Mobile Client Configuration (`mobile/.env`)
Create a file named `.env` inside the `mobile/` directory:

```env
# For Android Emulator, use http://10.0.2.2:8787
# For iOS Simulator, use http://localhost:8787
# For Physical device, use http://YOUR_LAN_IP:8787
EXPO_PUBLIC_API_URL=http://10.0.2.2:8787
```

---

## 3. Fast-Track Project Bootstrapping

TrọCare is managed using a standardized root workspace setup, allowing developers to install dependencies and boot systems quickly.

### Step 1: Install Unified Dependencies
From the monorepo root directory, run:
```bash
npm install
```
This triggers package installations across all folders in the monorepo.

### Step 2: Launch Local Backend & Web Client
From the monorepo root, execute the unified launcher script:
```bash
npm run local
```

The server boot sequence coordinates:
- **Hono Backend API**: Available at `http://localhost:8787`
- **Next.js Web-Admin Portal**: Available at `http://localhost:3001` (or falling back to `3000` if taken).

---

## 4. Mobile Development Launcher

To run and debug the mobile app, you need to spin up the Expo bundler:

### Running on Android Emulator
1. Open your Android Virtual Device (AVD) from Android Studio.
2. In a new terminal tab, navigate to the `mobile` folder and start Expo:
   ```bash
   cd mobile
   npm run android
   ```
3. The packager compiles your bundle and loads the app automatically on your open emulator.

### Running on iOS Simulator
1. Open Xcode and start the Simulator.
2. Navigate to the `mobile` folder and boot Expo:
   ```bash
   cd mobile
   npm run ios
   ```

### Testing on a Physical Device
1. Connect your phone to the same local Wi-Fi network as your computer.
2. Run `npx expo start` in `mobile/`.
3. Open the **Expo Go** app on your phone and scan the QR code displayed in the terminal.

---

## 5. Production Deployment Best Practices

When building the platform for deployment (Vercel, Render, or Supabase Hosting):
1. **Enforce CORS Boundaries**: Always specify the production frontend and backend URL inside the backend `CORS_ORIGINS` variable.
2. **Standardize Production Environment Hooks**: Ensure `NODE_ENV=production` is declared to disable verbose logs.
3. **HTTP Header Overrides**: Hono automatically attaches security caching parameters (`Cache-Control: no-store`) for authenticated API endpoints.
