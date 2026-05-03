# PatternDeck

An AI-powered grammar flashcard app. You name a grammar topic, Claude generates a tailored explanation and a set of flashcards, then judges your answers in real time.

## Why

Anki is a truly great and extensible application. But using it for grammar studying is a drag. You need to make enough cards so that you will actually generalize to the grammar and not just learn the sentence by heart, and each card needs to be massive so that in case you get it wrong, you can read about the rule right in the card.

Wouldn't it be nice to have a flashcard-like app that generates a full explanation of whatever concept you want to study, and tests you on it in a more dynamic way, with changing sentences for you to solve and personalized breakdowns of what you can improve?

This is the problem PatternDeck is trying to solve.

## How it works

1. **Enter a topic** — anything from "Japanese conditional forms" to "Spanish subjunctive".
2. **Study your tailor-made explanation**: The application generates a custom explanation of your chosen topic, covering it in detail with conjugation tables and many examples.
3. **Test your knowledge** — Apply what you learned. Each card gives you an English sentence; you type the target-language version.
4. **Get instant feedback** — Claude judges your answer. Correct answers are confirmed with a brief note. Wrong answers get a detailed Markdown explanation of what went wrong and what the correct form demonstrates. Wrong cards cycle back to the end of the stack.
5. **Rate your session** — After finishing a deck, rate how well you felt you knew the material. Claude also gives its own assessment. Together these feed a spaced-repetition algorithm that schedules the deck for review.
6. **Finish the stack** — the session ends when every card has been answered correctly.

Cards are generated after the explanation is complete, so they cover all the grammar patterns in the reference — not just the headline topic.

You can also **save decks** to a hierarchical collection tree for later review, and study multiple decks together by selecting a parent collection.

Push notifications remind you when decks are due for review.

## Architecture

PatternDeck is a **monorepo** with two packages:

```
PatternDeck/
  client/   ← React Native / Expo app (iOS, Android, Web)
  server/   ← Express + Prisma API server
  shared/   ← @patterndeck/shared: constants and types used by both
```

All AI calls go through the server — the client never calls the Anthropic API directly. This keeps your API key secure (encrypted server-side) and enables server-side features like background explanation generation.

See [`client/STRUCTURE.md`](client/STRUCTURE.md) and [`server/STRUCTURE.md`](server/STRUCTURE.md) for directory-level guides.

## Setup

### Prerequisites

- [pnpm](https://pnpm.io/) (monorepo package manager)
- An [Anthropic API key](https://console.anthropic.com/) — entered during onboarding, stored encrypted on the server

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy the example files and fill in your values:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

**`server/.env`:**

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET=your-secret-here
ENCRYPTION_KEY=32-byte-hex-string   # used for AES-256-GCM API key encryption
PORT=3001                           # optional, defaults to 3001

# Optional: for social auth
APPLE_CLIENT_ID=""
GOOGLE_CLIENT_ID=""

# Optional: central API key (shared for all users)
CENTRAL_API_KEY=""
CENTRAL_KEY_USER_MONTHLY_LIMIT=""   # USD, default 0
CENTRAL_KEY_GLOBAL_MONTHLY_LIMIT="" # USD, default 0

# Optional: email (password reset via Resend)
RESEND_API_KEY=""
EMAIL_FROM=""

# Optional: analytics
POSTHOG_API_KEY=""
```

**`client/.env`:**

```env
DEV_SERVER_HOST=localhost   # set to your machine's IP for physical device testing
DEV_SERVER_PORT=3001        # must match the server's PORT
```

Both files are gitignored.

### 3. Initialise the database

```bash
pnpm db:migrate
```

### 4. Start development

```bash
pnpm dev          # server + Expo (choose platform in terminal)
pnpm dev:web      # server + web client
pnpm dev:ios      # server + iOS simulator
pnpm dev:ios:fast # server + already-installed iOS dev build
pnpm dev:android  # server + Android emulator
```

The server runs on port **3001**; the Expo dev server on its default port.

---

## Platform setup

### Web

```bash
pnpm dev:web
```

### iOS & iPadOS

Requires macOS with Xcode installed.

```bash
pnpm dev:ios
```

For faster simulator rebuilds after dependencies are installed, skip the dependency installation phase:

```bash
pnpm ios:fast
```

After the simulator app has been built once, the fastest loop is:

```bash
pnpm dev:ios:fast
```

To run on a physical device, run `npx expo prebuild && open ios/*.xcworkspace` from the `client/` directory, then select your device in Xcode's scheme bar and hit Run. Or use:

```bash
pnpm ios:phone   # launches on connected physical iOS device
```

> **Note:** after adding any new native package, re-run `pnpm pods` before building in Xcode.

### macOS (via Mac Catalyst)

Runs the iPad layout natively on macOS. Requires macOS + Xcode.

**One-time Xcode setup:**

1. From the repo root, generate the native project:
   ```bash
   pnpm xcode   # runs expo prebuild then opens the workspace
   ```
2. In Xcode: select the **PatternDeck** target → **General** → **Supported Destinations** → **+** → add **My Mac (Designed for iPad)**
3. Select **My Mac** in the scheme bar → **Product → Run** (⌘R)

### Android

```bash
pnpm dev:android         # emulator
pnpm dev:android:phone   # connected physical device
```

> Android support is functional but not as actively tested as iOS/web. Push notifications on Android require a Firebase project — see below.

For Android push notifications, create or open the Firebase project used by the Expo project, add an Android app with package name `de.richardhanss.patterndeck`, download `google-services.json`, and place it at `client/google-services.json`. The private FCM v1 service-account JSON is only needed when uploading push credentials to EAS with `eas credentials`; do not commit that private key.

---

## Deployment

The `deploy/` directory contains scripts for deploying to a Linux server via SSH. See the scripts for required configuration (hostname, URLs, etc.).

```bash
pnpm setup:server   # one-time: installs Node, pnpm, creates user, nginx, systemd, .env
pnpm ship           # builds frontend + backend, deploys both to server
```

---

## Tech stack

### Client

| Concern        | Choice                           |
| -------------- | -------------------------------- |
| Framework      | Expo 54 (React Native 0.81.5)    |
| Navigation     | Expo Router (file-based)         |
| Styling        | NativeWind v4 (Tailwind CSS)     |
| Auth storage   | AsyncStorage (JWT token only)    |
| Analytics      | PostHog                          |
| Notifications  | Expo Push Notifications          |

### Server

| Concern        | Choice                           |
| -------------- | -------------------------------- |
| Runtime        | Node.js + TypeScript             |
| HTTP           | Express 5                        |
| Database       | SQLite via Prisma (swappable)    |
| Auth           | JWT + bcryptjs                   |
| OAuth          | Apple Sign In, Google OAuth2     |
| Encryption     | AES-256-GCM (API key at rest)    |
| Email          | Resend (password reset)          |
| Analytics      | PostHog                          |

### AI

| Task                        | Model                      |
| --------------------------- | -------------------------- |
| Explanation / rejection / chat | Claude Sonnet 4.6 (streaming SSE) |
| Card generation / judgment  | Claude Haiku 4.5           |

---
