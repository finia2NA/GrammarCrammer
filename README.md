# GrammarCrammer

An AI-powered grammar flashcard app. You name a grammar topic, Claude generates a tailored explanation and a set of flashcards, then judges your answers in real time.

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

You need your own [Anthropic API key](https://console.anthropic.com/). The app calls the API directly from your browser; no backend or account is required beyond the key itself.

```bash
npm install
npx expo start --web
```

On first launch the app will ask for your API key and verify it with a test request. The key is stored locally in your browser and never leaves your device.

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Expo 54 (React Native + Web) |
| Navigation | Expo Router (file-based) |
| Styling | NativeWind v4 (Tailwind CSS) |
| Storage | AsyncStorage (local, no backend) |
| AI | Direct fetch to Anthropic API |
| Explanation / rejection | Claude Sonnet 4.6 (streaming) |
| Card generation / judgment | Claude Haiku 4.5 (tool use) |

## Current state

All core features are implemented and working:

- Onboarding with API key validation
- Home screen: topic input, language selector, mode toggle, card count
- Streaming grammar explanation (renders as Markdown during load)
- Flashcard loop with shuffle and requeue on wrong answers
- Resizable grammar reference side panel
- Per-session cost display (top right)
- Hint toggle to reveal the model answer before submitting
