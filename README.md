# GrammarCrammer

An AI-powered grammar flashcard app. You name a grammar topic, Claude generates a tailored explanation and a set of flashcards, then judges your answers in real time.

## Why
Anki is a truly great and extensible application. But using it for grammar studying is a drag. You need to make enough cards so that you will actually generalize to the grammar and not just learn the sentence by heart, and each card needs to be massive so that in case you get it wrong, you can read about the rule right in the card.

Wouldn't it be nice to have a flashcard-like app that generates a full explanation of whatever concept you want to study, and tests you on it in a more dynamic way, with changing sentences for you to solve and personalized breakdowns of what you can improve?

This is the problem grammar crammer is trying to solve.

## How it works

1. **Enter a topic** — anything from "Japanese conditional forms" to "Spanish subjunctive".
2. **Choose your mode**:
   - **習得 (learn)** — read the full grammar explanation first, then practise.
   - **練習 (practise)** — skip straight to the cards; the explanation stays available as a side reference.
3. **Translate sentences** — each card gives you an English sentence; you type the target-language version.
4. **Get instant feedback** — Claude judges your answer. Correct answers are confirmed with a brief note. Wrong answers get a detailed Markdown explanation of what went wrong and what the correct form demonstrates. Wrong cards cycle back to the end of the stack.
5. **Finish the stack** — the session ends when every card has been answered correctly.

Cards are generated after the explanation is complete, so they cover all the grammar patterns in the reference — not just the headline topic.

## Setup

You need your own [Anthropic API key](https://console.anthropic.com/). The app calls the API directly from the device; no backend or account is required beyond the key itself. On first launch the app will ask for your key and verify it with a test request. The key is stored locally and only used to authenticate with anthropic for use with this application.

```bash
npm install
```

### Web

```bash
npx expo start --web
```

### iOS & iPadOS

Requires macOS with Xcode installed.

```bash
npx expo run:ios
```

Opens in the iOS Simulator. To run on a physical device,
first run `npx expo prebuild && open ios/GrammarCrammer.xcworkspace`, then open the generated workspace in Xcode and select it from the scheme bar in Xcode after the project generates.

> **Note:** after adding any new native package (e.g. via `npx expo install`), re-run `pod install` from the `ios/` directory before building in Xcode — `npx expo prebuild` alone won't pick up packages installed after the last prebuild.
>
> ```bash
> cd ios && pod install
> ```

### macOS (via Mac Catalyst)

Runs the iPad layout natively on macOS — no simulator needed. Requires macOS with Xcode installed.

**One-time Xcode setup:**

1. Generate the native project:
   ```bash
   npx expo prebuild --platform ios
   ```
2. Open the workspace in Xcode:
   ```bash
   open ios/GrammarCrammer.xcworkspace
   ```
3. In Xcode: select the **GrammarCrammer** target → **General** → **Supported Destinations** → click **+** → add **My Mac (Designed for iPad)**
4. Select **My Mac** in the scheme bar, then **Product → Run** (⌘R)

**Subsequent runs** — reopen the workspace and run from Xcode, or build from the command line:

```bash
xcodebuild \
  -workspace ios/GrammarCrammer.xcworkspace \
  -scheme GrammarCrammer \
  -destination 'platform=macOS,variant=Mac Catalyst' \
  -configuration Debug \
  build
```

> `npx expo run:ios` targets the iOS Simulator and will not build for Mac Catalyst. Use Xcode or xcodebuild for macOS builds.

### Android

Requires Android Studio with an emulator configured, or a physical device with USB debugging enabled.

```bash
npx expo run:android
```

## Tech stack

| Concern                    | Choice                           |
| -------------------------- | -------------------------------- |
| Framework                  | Expo 54 (React Native + Web)     |
| Navigation                 | Expo Router (file-based)         |
| Styling                    | NativeWind v4 (Tailwind CSS)     |
| Storage                    | AsyncStorage (local, no backend) |
| AI                         | Direct fetch to Anthropic API    |
| Explanation / rejection    | Claude Sonnet 4.6 (streaming)    |
| Card generation / judgment | Claude Haiku 4.5 (tool use)      |

## Current state

Core MVP features of the language study loop are implemented. To become a true studying app, collection management and scheduling would be next - check `PROGRESS.md` for current goals.