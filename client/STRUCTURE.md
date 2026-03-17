# Client Structure

React Native / Expo app. Communicates with the server via `lib/api.ts` — no direct AI or database calls from the client.

## Directory map

```
client/
├── app/                        ← Expo Router pages (file-based routing)
│   ├── _layout.tsx             ← Root layout: global CSS, theme vars, KeyboardProvider, Stack nav
│   ├── index.tsx               ← Auth guard: checks JWT → /onboarding or /home
│   ├── onboarding.tsx          ← 5-step carousel: welcome, how-it-works, alpha warning, sign-up, API key
│   ├── home.tsx                ← Main screen: deck tree, quick study input, modals
│   └── session.tsx             ← Study session: card loop, explanation overlay, chat
│
├── components/
│   ├── home/
│   │   ├── DeckTree.tsx        ← Renders hierarchical collections/decks from the server tree
│   │   ├── DeckModal.tsx       ← Create / edit deck form
│   │   └── SettingsModal.tsx   ← Card sort order, API key management
│   ├── session/
│   │   ├── FlashcardDeck.tsx   ← Card-by-card UI (prompt + answer input)
│   │   ├── ExplanationOverlay.tsx ← 習得 mode full-screen explanation
│   │   ├── ExplanationPanel.tsx   ← Side-panel reference during practice
│   │   ├── GrammarMarkdown.tsx ← Renders server-streamed Markdown explanations
│   │   └── CardChat.tsx        ← In-session chat about the current card
│   └── PillDropdown.tsx        ← Generic pill-style dropdown (language, card count, etc.)
│
├── hooks/
│   ├── useDeckTree.ts          ← Fetches and caches the full deck tree from server
│   ├── useSessionLoader.ts     ← Loads explanation + cards for a quick-study session
│   └── useMultiDeckSession.ts  ← Assembles a multi-deck session from a collection
│
├── lib/
│   ├── api.ts                  ← All HTTP calls to the server (auth, tree, decks, AI)
│   ├── storage.ts              ← AsyncStorage wrapper (getAuthToken / setAuthToken / clearAuthToken)
│   └── types.ts                ← Shared TypeScript types (Card, TreeNode, DeckData, ChatMessage)
│
├── constants/
│   ├── theme.ts                ← Dark / light colour palettes
│   ├── session.ts              ← Supported languages, card count options
│   ├── prompts.ts              ← AI system prompts (kept in client for reference; sent via server)
│   └── languageInstructions.ts ← Per-language instructions injected into prompts
│
├── modules/
│   └── pill-dropdown/          ← Custom native module (iOS + web implementations)
│
└── assets/
    └── images/                 ← App icon, splash screen, etc.
```

## Key files to know

### `app/_layout.tsx`
Root of the app. Imports `global.css` (NativeWind), sets CSS variable theme tokens for light/dark mode, wraps everything in `KeyboardProvider`, and declares the Stack navigator.

### `app/index.tsx`
Acts as the auth guard. On mount it reads the stored JWT from AsyncStorage, validates it against `GET /api/auth/me`, and redirects to `/onboarding` (no valid auth) or `/home` (authenticated).

### `app/onboarding.tsx`
Five-card swipe carousel:
1. Welcome
2. How it works
3. Alpha warning (data loss disclaimer)
4. Account creation (email + password, or Apple/Google)
5. Claude API key entry + validation

### `app/home.tsx`
Main hub. Contains:
- **Quick study** — topic input, language picker, card count → launches `/session`
- **Deck tree** — renders `DeckTree.tsx`, supports create / edit / delete / rename / move
- **Settings modal** — sort order, API key status

### `app/session.tsx`
Handles two modes:
- **QuickSession** — one-off topic entered on the home screen
- **DeckSession** — saved deck or collection (fetches descendant deck IDs, loads all cards)

Both modes share `SessionUI`: explanation overlay, card loop (`FlashcardDeck`), chat panel (`CardChat`).

### `lib/api.ts`
The single place all server communication happens. Exports typed functions for every endpoint group:
- `register`, `login`, `loginWithApple`, `loginWithGoogle`, `getMe`, `validateApiKey`
- `setApiKey`, `deleteApiKey`, `getApiKeyStatus`
- `getTree`, `getNode`, `getNodePath`, `getDescendantDeckIds`, `deleteNode`
- `createDeckFromPath`, `getDeck`, `updateDeck`, `markStudied`
- `getSetting`, `setSetting`
- `generateExplanation` (SSE), `explainRejection` (SSE), `chatAboutCard` (SSE)
- `generateCards`, `judgeAnswer`

SSE endpoints return an async generator consumed via `streamSSE()`.

### `lib/types.ts`
Core types shared across the client:
```typescript
Card            { id, english, targetLanguage, sentenceContext?, notes? }
TreeNode        { id, parentId, name, sortOrder, deck, children[] }
DeckData        { nodeId, topic, language, explanation, explanationStatus, cardCount, lastStudiedAt }
ChatMessage     { role, content }
```

## Styling

NativeWind v4 (Tailwind CSS for React Native). Theme tokens are CSS custom properties set in `_layout.tsx`:
- `bg-background` / `text-foreground` — page background and default text
- `bg-card` — card container surfaces
- `bg-primary` / `text-primary-foreground` — primary action colour
- `bg-muted` / `text-muted-foreground` — secondary / disabled text

Both light and dark palettes are defined; the active palette follows `prefers-color-scheme`.

> **NativeWind note:** `nativewind/babel` must be in `presets` in `babel.config.js`, not `plugins`.
