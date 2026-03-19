# GrammarCrammer

An AI-powered grammar flashcard app. You name a grammar topic, Claude generates a tailored explanation and a set of flashcards, then judges your answers in real time.

## Why

Anki is a truly great and extensible application. But using it for grammar studying is a drag. You need to make enough cards so that you will actually generalize to the grammar and not just learn the sentence by heart, and each card needs to be massive so that in case you get it wrong, you can read about the rule right in the card.

Wouldn't it be nice to have a flashcard-like app that generates a full explanation of whatever concept you want to study, and tests you on it in a more dynamic way, with changing sentences for you to solve and personalized breakdowns of what you can improve?

This is the problem GrammarCrammer is trying to solve.

## How it works

1. **Enter a topic** — anything from "Japanese conditional forms" to "Spanish subjunctive".
2. **Choose your mode**:
   - **習得 (learn)** — read the full grammar explanation first, then practise.
   - **練習 (practise)** — skip straight to the cards; the explanation stays available as a side reference.
3. **Translate sentences** — each card gives you an English sentence; you type the target-language version.
4. **Get instant feedback** — Claude judges your answer. Correct answers are confirmed with a brief note. Wrong answers get a detailed Markdown explanation of what went wrong and what the correct form demonstrates. Wrong cards cycle back to the end of the stack.
5. **Finish the stack** — the session ends when every card has been answered correctly.

Cards are generated after the explanation is complete, so they cover all the grammar patterns in the reference — not just the headline topic.

You can also **save decks** to a hierarchical collection tree for later review, and study multiple decks together by selecting a parent collection.

## Architecture

GrammarCrammer is a **monorepo** with two packages:

```
GrammarCrammer/
  client/   ← React Native / Expo app (iOS, Android, Web)
  server/   ← Express + Prisma API server
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

### 2. Configure the server

Create `server/.env`:

```env
JWT_SECRET=your-secret-here
ENCRYPTION_KEY=32-byte-hex-string   # used for AES-256-GCM API key encryption
```

Create `server/prisma/.env`:

```env
DATABASE_URL="file:./dev.db"
```

### 3. Initialise the database

```bash
pnpm db:migrate
```

### 4. Start development

```bash
pnpm dev        # server + Expo (choose platform in terminal)
pnpm dev:web    # server + web client
pnpm dev:ios    # server + iOS simulator
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

To run on a physical device, run `npx expo prebuild && open ios/GrammarCrammer.xcworkspace` from the `client/` directory, then select your device in Xcode's scheme bar and hit Run.

> **Note:** after adding any new native package, re-run `pod install` from `client/ios/` before building in Xcode.

### macOS (via Mac Catalyst)

Runs the iPad layout natively on macOS. Requires macOS + Xcode.

**One-time Xcode setup:**

1. From `client/`, generate the native project:
   ```bash
   npx expo prebuild --platform ios
   ```
2. Open the workspace:
   ```bash
   open ios/GrammarCrammer.xcworkspace
   ```
3. In Xcode: select the **GrammarCrammer** target → **General** → **Supported Destinations** → **+** → add **My Mac (Designed for iPad)**
4. Select **My Mac** in the scheme bar → **Product → Run** (⌘R)

### Android

> Android is not actively supported as of right now. While the Architecture supports it, due to me not wanting to test the app on 3 platforms for every change i make, this platform may break at any point until we get to a 1.0. In fact, it might be broken right now! :D

```bash
# from client/
npx expo run:android
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

### Server

| Concern        | Choice                           |
| -------------- | -------------------------------- |
| Runtime        | Node.js + TypeScript             |
| HTTP           | Express 5                        |
| Database       | SQLite via Prisma (swappable)    |
| Auth           | JWT + bcryptjs                   |
| OAuth          | Apple Sign In, Google OAuth2     |
| Encryption     | AES-256-GCM (API key at rest)    |

### AI

| Task                        | Model                      |
| --------------------------- | -------------------------- |
| Explanation / rejection / chat | Claude Sonnet 4.6 (streaming SSE) |
| Card generation / judgment  | Claude Haiku 4.5           |

---

## Current state

Core MVP features of the language study loop are complete, including user accounts, saved decks, hierarchical collections, and a full Express + Prisma backend. The next major milestone is an FSRS-based scheduling system. See `PROGRESS.md` for the current roadmap.
