---

##  PHASE 0 — HACKATHON WARM-UP

**Our LearnLite development journey begins here!**

On 6 November 2026, our team is participating
in the Women in Tech × MMC × Newly
Vibe Coding Hackathon.

We aim to build our first functional
offline-first learning MVP.

This hackathon is the foundation of our
long-term LearnLite engineering project.

### 👉 [OPEN THE HACKATHON COMMAND CENTRE](./HACKATHON-WARMUP/README.md)

**Development Platform:** Newly

**Duration:** 2 Hours

**Focus:** Offline Learning MVP

**Cloud Infrastructure:** Not required
for this phase.






# LEARNLITE CAPSTONE PROJECT

### Offline-First AI-Assisted Learning Platform

LearnLite is a collaborative cloud engineering project
focused on delivering educational content to learners
in low-connectivity environments.

The platform aims to support offline learning,
learner progress tracking, secure synchronization,
and AI-assisted educational experiences.

## Run the mobile application

The current application lives in `apps/mobile` and uses Expo, React Native, and Expo Router. Run the following commands from that directory.

### Requirements

- Node.js 20 or newer.
- `pnpm` 9.15 (the project declares this version in `package.json`).
- For iOS: macOS, Xcode, and a configured simulator. Testing on a physical iPhone also requires an Apple account and a connected device.
- For Android: Android Studio, Android SDK, and either a configured emulator or a device with USB debugging enabled.
- For web: a modern browser, preferably Chrome, Edge, or Safari.

### 1. Install dependencies

```bash
cd apps/mobile
corepack enable
pnpm install
```

If `pnpm` is not installed, Corepack can enable it. You can also install it globally with `npm install -g pnpm@9.15.0`.

### 2. Start the development server

```bash
pnpm start
```

Expo DevTools will open and display a QR code. You can also use these terminal shortcuts:

- `w`: open the web version.
- `i`: open the iOS simulator.
- `a`: open the Android emulator.
- `r`: reload the application.
- `m`: open the development menu.

Clear the Metro cache if stale screens or module errors appear:

```bash
pnpm exec expo start --clear
```

### View the application on the web

The direct command is:

```bash
cd apps/mobile
pnpm web
```

You can also start Expo and press `w`:

```bash
pnpm start
```

The web application will open at the address shown by Expo, usually `http://localhost:8081`.

### Test on iOS

#### iOS simulator

1. Install Xcode from the Mac App Store.
2. Open Xcode once and accept its licenses.
3. Install an iOS runtime and create/open a simulator from **Window → Devices and Simulators**.
4. Run:

```bash
cd apps/mobile
pnpm ios
```

If the simulator is already open, Expo will use it automatically. You can also run `pnpm start` and press `i`.

#### Physical iPhone

For a quick preview, connect the iPhone and scan Expo's QR code with Expo Go if the app version is compatible. Some LearnLite native modules require a development build; in that case, use the [Development build](#development-build-recommended-for-native-testing) section.

The phone and computer must be on the same Wi-Fi network. If the network blocks the connection, try:

```bash
pnpm exec expo start --tunnel
```

### Test on Android

#### Android emulator

1. Install Android Studio.
2. Install the Android SDK and Platform Tools, then create a virtual device from **Device Manager**.
3. Start the emulator.
4. Run:

```bash
cd apps/mobile
pnpm android
```

You can also run `pnpm start` and press `a`.

#### Physical Android device

Enable **Developer options** and **USB debugging**, connect the device, and verify that it appears with `adb devices`. Then run `pnpm android`. To use Expo Go, open Expo Go on the device and scan the QR code shown by `pnpm start`.

If the emulator or phone cannot reach Metro, make sure it is on the same network or use `pnpm exec expo start --tunnel`.

### Development build (recommended for native testing)

LearnLite includes `expo-dev-client` and EAS configuration. Use a development build when Expo Go cannot load a native module, or when testing audio, secure storage, native icons, or another platform integration.

Install/use the EAS CLI:

```bash
cd apps/mobile
pnpm dlx eas-cli login
pnpm dlx eas-cli build --profile development --platform ios
pnpm dlx eas-cli build --profile development --platform android
```

After installing the generated build on the simulator/device, start Metro for the development client:

```bash
pnpm exec expo start --dev-client
```

The `development` profile generates an Android APK according to `eas.json`. On iOS, EAS will request the Apple team and credentials required to sign the build.

### Current testing status

- The frontend currently uses local stores persisted with MMKV; a backend is not required to open it.
- Sign-in and registration are in demo mode: any email and password will work.
- Classroom, module, assignment, and student data include device-local seed data.
- Backend synchronization, real accounts, and push notifications still need to be connected according to [`BACKEND_REQUIREMENTS.md`](./BACKEND_REQUIREMENTS.md).

### Common troubleshooting

**The screen does not change after editing code**

```bash
pnpm exec expo start --clear
```

**The port is already in use**

```bash
pnpm exec expo start --port 8082
```

**The device cannot find the server**

- Check that the computer and device are on the same network.
- Temporarily disable a VPN/proxy or use `--tunnel`.
- On Android, confirm that `adb devices` detects the device.

**Dependency installation fails**

```bash
rm -rf node_modules
pnpm install
```

Do not delete the user's data directory or the global pnpm store; only remove `node_modules` inside `apps/mobile`.

**The old icon or splash screen is still displayed**

Native icons are bundled into the installed binary. After changing `app.json` or the assets, rebuild/reinstall the development build; reloading Metro does not change the icon of an already-installed application. On the web, clear the browser cache and reload.

## Technology Stack

### Proposed Frontend
- React
- TypeScript
- Progressive Web Application
- IndexedDB

### Proposed Backend
- Node.js
- TypeScript
- Google Cloud Run
- Firestore
- Cloud Storage

### AI Integration
- NVIDIA AI services
- Educator-reviewed learning content

### Cloud Infrastructure
- Google Cloud
- Secret Manager
- IAM
- Cloud Logging and Monitoring
- Terraform (planned)

## Project Structure

| Directory | Purpose |
|-----------|---------|
| apps/web | Learner application |
| apps/api | Backend API |
| packages/shared | Shared models and types |
| packages/sync-engine | Offline synchronization |
| services/ai-content | AI learning content |
| infrastructure/terraform | Cloud infrastructure |
| infrastructure/scripts | Infrastructure scripts |
| tests/integration | Integration tests |
| tests/e2e | End-to-end tests |
| tests/fixtures | Synthetic test data |
| docs | Project documentation |
| .github/workflows | CI/CD automation |

## Team Responsibilities

| Team Member | Responsibility |
|-------------|----------------|
| Aashma Lama | Team Lead and Security |
| Harold Ormeño | Learner Experience and Offline Application |
| Elvis Ncube | Cloud Services, Integration and Synchronization |
| Reshma Thomas | Learning Product, Content and AI Evaluation |
| Ernest Lukheli | Synthetic Data, Monitoring and Evaluation |

## Collaboration Guidelines

1. Work on assigned components.
2. Create a feature branch for development.
3. Do not commit API keys or credentials.
4. Open Pull Requests for proposed changes.
5. Request reviews before merging.
6. Document significant technical decisions.
7. Keep GitHub Issues updated.

## Current Status

Repository architecture initialized.

Application development and cloud infrastructure
implementation are in progress or pending team kickoff.

## Security

Never commit:
- API keys
- Service account private keys
- Passwords
- Production environment files
- Real learner personal information

## Project Objective

Build and demonstrate a working offline-first
learning experience with reliable synchronization
and appropriate AI-assisted learning capabilities.

(THE INITIAL ROPSITORY STRUCTURE CONTAINS A DOCUMENTED PROJECT SKELETON, IT DOES NOT CONTAIN RUNNING FRONT-END AND BACK-END APPLICATIONS. THIS WAS DONE INTENTIONAL, SO THAT THE TEAMS WILL BUILD THE ACTUAL COMPONENTS INSIDE THESE DIRECTORIES.)
