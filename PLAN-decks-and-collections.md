# Decks & Collections — Implementation Plan

## Context

GrammarCrammer currently runs ephemeral sessions: the user types a topic, Claude generates an explanation + cards, the user practices, and everything is discarded. This plan adds **persistent decks and collections**, turning the app into a re-learnable flashcard system where explanations are generated once and reused for future study sessions. The implementation must be FSRS-compatible so spaced repetition scheduling can be layered on afterward.

---

## Step 0: Storage — Migrate from AsyncStorage to Expo SQLite

### Why not AsyncStorage?

AsyncStorage is a flat key-value store. The new requirements involve structured, relational data: a tree of collections/decks, each with metadata, explanations, and (future) FSRS scheduling data. Querying "all decks under collection X" or "all decks due for review" is impractical with key-value semantics.

### Why Expo SQLite?

| Requirement | Expo SQLite |
|---|---|
| Structured/relational data | Full SQL |
| Expo 54 compatible | Yes (built-in) |
| iOS + Android | Native SQLite |
| Web | Alpha (sql.js / WebAssembly) — acceptable for MVP |
| Future sync | Manual; can add PowerSync later |
| FSRS queries | SQL makes date/interval queries trivial |
| Reactive UI updates | `addDatabaseChangeListener()` |

**Not using Drizzle ORM**: the schema is simple (3 tables), so a typed wrapper over raw `expo-sqlite` avoids migration tooling complexity. Drizzle can be added later if the schema grows.

### Installation

```bash
npx expo install expo-sqlite
```

No native rebuild needed — `expo-sqlite` is in the Expo SDK.

### Files to create

**`lib/db.ts`** — Database singleton + initialization

```ts
import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('grammarcrammer.db');
    await _db.execAsync(`PRAGMA journal_mode = WAL;`);
    await runMigrations(_db);
  }
  return _db;
}
```

The `runMigrations()` function applies schema changes via a `schema_version` pragma, with each version as an idempotent SQL block. This avoids the need for a migration framework.

### Schema (version 1)

```sql
-- Tree of collections and decks.
-- A node is a collection if it has no row in `decks`, a deck if it does.
CREATE TABLE IF NOT EXISTS nodes (
  id            TEXT PRIMARY KEY,
  parent_id     TEXT REFERENCES nodes(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,  -- epoch ms
  updated_at    INTEGER NOT NULL   -- epoch ms
);

CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_id);

-- Deck-specific metadata. 1:1 with a node row.
CREATE TABLE IF NOT EXISTS decks (
  node_id              TEXT PRIMARY KEY REFERENCES nodes(id) ON DELETE CASCADE,
  topic                TEXT NOT NULL,
  language             TEXT NOT NULL,
  explanation          TEXT,                -- full markdown, NULL until generated
  explanation_status   TEXT NOT NULL DEFAULT 'pending',  -- pending | generating | ready | error
  card_count           INTEGER NOT NULL DEFAULT 10
);

-- App-wide settings (key-value, tiny table).
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Settings keys (initial):
- `card_order`: `'sequential'` | `'shuffled'` (default `'shuffled'`)

### API key migration

Move the API key from AsyncStorage to the `settings` table (`key = 'api_key'`). On first launch after the migration, read from AsyncStorage, write to SQLite, and delete from AsyncStorage. Keep `lib/storage.ts` as the public API but rewrite its internals to use SQLite.

### FSRS-ready design note

The schema deliberately separates `nodes` (tree structure) from `decks` (deck metadata). When FSRS is added, a `reviews` table references `decks(node_id)`:

```sql
-- Added in a future migration (schema version 2)
CREATE TABLE reviews (
  id              TEXT PRIMARY KEY,
  deck_node_id    TEXT NOT NULL REFERENCES decks(node_id) ON DELETE CASCADE,
  reviewed_at     INTEGER NOT NULL,
  stability       REAL NOT NULL,
  difficulty      REAL NOT NULL,
  elapsed_days    INTEGER NOT NULL,
  scheduled_days  INTEGER NOT NULL,
  rating          INTEGER NOT NULL  -- 1=again, 2=hard, 3=good, 4=easy
);
```

No code needs to be written for this now — just noting it as a schema extension point.

### Files to create/modify

| File | Action |
|---|---|
| `lib/db.ts` | **Create** — DB singleton, migrations, raw query helpers |
| `lib/storage.ts` | **Modify** — Rewrite `getApiKey`/`setApiKey`/`clearApiKey` to use SQLite settings table, add one-time AsyncStorage migration |

---

## Step 1: Data Layer — CRUD for Nodes and Decks

### Files to create

**`lib/deck-store.ts`** — All data operations for nodes and decks

### Key functions

```ts
// ── Reads ────────────────────────────────────────────────────────────
// Get all top-level nodes (parent_id IS NULL), each with children loaded recursively
function getTree(): Promise<TreeNode[]>

// Get a single node with its deck data (if it's a deck)
function getNode(id: string): Promise<TreeNode | null>

// Get all descendant deck IDs under a node (for collection study)
function getDescendantDeckIds(nodeId: string): Promise<string[]>

// Get deck data (explanation, topic, language) for a specific deck
function getDeck(nodeId: string): Promise<DeckData | null>

// ── Writes ───────────────────────────────────────────────────────────
// Create a deck from a path string (e.g. "JP::N5::Te-form")
// Creates intermediate collection nodes if they don't exist.
// Returns the new deck's node ID.
function createDeckFromPath(path: string, topic: string, language: string, cardCount?: number): Promise<string>

// Update deck metadata. If topic or language changed, sets explanation_status = 'pending'.
function updateDeck(nodeId: string, updates: { name?: string, topic?: string, language?: string, cardCount?: number }): Promise<{ regenerateExplanation: boolean }>

// Rename a collection node
function renameCollection(nodeId: string, newName: string): Promise<void>

// Delete a node and all descendants
function deleteNode(nodeId: string): Promise<void>

// Update explanation after background generation completes
function setExplanation(nodeId: string, explanation: string, wasTruncated: boolean): Promise<void>
function setExplanationError(nodeId: string): Promise<void>

// ── Settings ─────────────────────────────────────────────────────────
function getSetting(key: string): Promise<string | null>
function setSetting(key: string, value: string): Promise<void>
```

### Types to add to `lib/types.ts`

```ts
interface TreeNode {
  id: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  deck: DeckData | null;      // null = this is a collection
  children: TreeNode[];       // populated by getTree()
}

interface DeckData {
  nodeId: string;
  topic: string;
  language: string;
  explanation: string | null;
  explanationStatus: 'pending' | 'generating' | 'ready' | 'error';
  cardCount: number;
}
```

### Path parsing logic (`JP::N5::Te-form`)

```
Input:  "JP::N5::Te-form"
Split:  ["JP", "N5", "Te-form"]

1. Look up "JP" under root (parent_id IS NULL)
   → If missing, INSERT as collection node
2. Look up "N5" under JP's ID
   → If missing, INSERT as collection node
3. "Te-form" is the last segment → INSERT as node + INSERT into decks table
```

When renaming a deck via the edit modal, the user types the full path. If the path changes, the node moves to a new parent (and intermediate collections are created if needed). This is handled by `updateDeck` comparing old and new paths. Empty collections are deleted automatically, and when a collection is renamed, all descendant paths change accordingly.

---

## Step 2: Background Explanation Generation

When a deck is created (or its topic/language is changed), the explanation needs to be generated via the Claude API. This should happen in the background so the user can continue browsing.

### Architecture

**`lib/explanation-generator.ts`** — Stateless module, not tied to any component lifecycle.

```ts
// Starts generating an explanation for a deck.
// Writes progress directly to the database (not via React state).
// Returns a promise that resolves when generation is complete.
// Multiple calls for the same deckId are deduplicated.
function generateDeckExplanation(deckId: string): Promise<void>

// Check if a generation is in progress for a deck
function isGenerating(deckId: string): boolean
```

Implementation:
1. Set `explanation_status = 'generating'` in the database
2. Call `generateExplanation()` from `lib/claude.ts`, accumulating chunks in a local variable (not streaming to state — there's no UI mounted for this)
3. On success: call `setExplanation(deckId, fullText, wasTruncated)` → sets `explanation_status = 'ready'`
4. On error: call `setExplanationError(deckId)` → sets `explanation_status = 'error'`

A module-level `Map<string, Promise<void>>` deduplicates concurrent requests for the same deck.

### Reactive UI updates

The home screen tree view needs to reflect status changes (pending → generating → ready). Use Expo SQLite's `addDatabaseChangeListener()` to trigger a re-query of the tree when the `decks` table changes. Wrap this in a custom hook:

**`hooks/useDeckTree.ts`**

```ts
// Returns the full tree, re-queries when the database changes.
function useDeckTree(): { tree: TreeNode[]; loading: boolean }
```

This hook calls `getTree()` on mount and re-calls it whenever `addDatabaseChangeListener` fires for the `nodes` or `decks` tables.

---

## Step 3: Home Screen — Tree View + Modals

The home screen is redesigned from a single topic input to a deck/collection browser.

### Layout

```
┌─────────────────────────────────┐
│  [⚙️]              GrammarCrammer│  ← settings left, title right
│─────────────────────────────────│
│                                 │
│  ▼ JP                      [✏️] │  ← expanded collection
│    ▼ N5                    [✏️] │
│      ● Te-form   ⏳       [✏️] │  ← deck, generating
│      ● Particles ✓        [✏️] │  ← deck, ready
│    ► N4                    [✏️] │  ← collapsed collection
│  ► Spanish                 [✏️] │
│                                 │
│                           [ + ] │  ← FAB: create deck
└─────────────────────────────────┘
```

### Components to create

**`components/home/DeckTree.tsx`**
- Renders `TreeNode[]` as a collapsible list
- Each row: indent (depth × 16px), expand/collapse chevron (collections), status icon (decks), name, pencil icon
- Tapping name → navigate to session
- Tapping pencil → open edit modal
- Collection rows: `►`/`▼` + name + edit
- Deck rows: `●` + name + status indicator (⏳ generating, ✓ ready, ⚠ error) + edit
- Collapsed state stored in local React state (not persisted)

**`components/home/DeckModal.tsx`**
- Used for both create and edit
- Fields: deck name (with `::` path syntax), topic/prompt, language (PillDropdown or equivalent)
- On create: calls `createDeckFromPath()`, then `generateDeckExplanation()`
- On edit: calls `updateDeck()`, conditionally calls `generateDeckExplanation()` if topic/language changed
- Modal on large screens, full-screen sheet on small screens

**`components/home/SettingsModal.tsx`**
- Card ordering toggle: sequential vs shuffled
- Delete API key button (with confirmation) → clears key, navigates to `/onboarding`
- Same responsive treatment as DeckModal

### Modified files

**`app/home.tsx`** — Complete rewrite:
- Replace topic input with `DeckTree` + FAB
- Add settings icon (top-left) and title (top-right)
- Modal state management for DeckModal and SettingsModal

---

## Step 4: Session Manager — Multi-Deck Card Generation

The current `useSessionLoader` hook handles one explanation + one card set. Collections require parallel card generation for multiple decks.

### New hook: `hooks/useMultiDeckSession.ts`

```ts
interface UseMultiDeckSessionParams {
  deckIds: string[];       // resolved before passing in
  cardOrder: 'sequential' | 'shuffled';
}

interface MultiDeckSessionResult {
  loading: boolean;
  loadPhase: 'cards';      // no explanation phase — they're pre-generated
  loadError: string | null;
  setLoadError: (e: string | null) => void;
  decks: Map<string, { explanation: string; wasTruncated: boolean }>;
  cards: DeckCard[];       // Card + deckId for knowing which explanation to show
  setCards: (cards: DeckCard[]) => void;
  totalCost: number;
  addCost: (usd: number) => void;
  apiKeyRef: React.MutableRefObject<string>;
}
```

Where `DeckCard` extends `Card` with a `deckId` field so the UI knows which explanation to show in the side panel.

### Implementation

1. Read all deck data from the database (explanation, topic, language, card count)
2. Call `generateCards()` for each deck **in parallel** (using `Promise.all`)
3. Tag each card with its `deckId`
4. Order cards based on `cardOrder` setting:
   - `'sequential'`: all cards from deck 1, then deck 2, etc.
   - `'shuffled'`: Fisher-Yates shuffle of all cards together
5. Return merged card array + explanations map

### Keep `useSessionLoader` for single decks

`useSessionLoader` already supports `existingExplanation`. For a single deck, the home screen can:
1. Read the deck's explanation from the database
2. Pass it as `existingExplanation`

So single-deck study works without changes to `useSessionLoader`.

Alternatively, single-deck study could use `useMultiDeckSession` with a single-element array. Choose whichever is simpler at implementation time.

### Navigation params

Update session route params:

```ts
// Option A: study specific decks
{ deckIds: string }  // JSON-encoded string[] (expo-router params are strings)

// Option B: study a node (resolves to descendant decks)
{ nodeId: string }
```

Option B is simpler — the session screen resolves a nodeId to deck IDs. If the nodeId is a deck, it's a single-deck session. If it's a collection, query all descendant decks.

---

## Step 5: Update Session UI

### Side panel / bottom sheet — multi-explanation support

When studying a collection, the side panel should show the explanation for the **current card's deck**. As the user progresses through cards from different decks, the explanation switches automatically.

Changes to `ExplanationPanel.tsx` (`SidePanel` + `BottomSheet`):
- Accept a new prop: `deckName: string` (shown as a label above "Grammar Reference")
- The explanation content already accepts a string — no change needed

Changes to `app/session.tsx`:
- Track `currentDeckId` derived from `cards[0].deckId`
- Look up the explanation from the `decks` map returned by the session hook
- Pass the correct explanation + deck name to the side panel

### ExplanationOverlay — skip for pre-generated decks

When studying decks/collections, explanations are already generated. The overlay's purpose was to show the explanation while it loads, then transition to cards.

For deck study:
- Skip the overlay entirely (cards can start generating immediately)
- Or show a brief loading screen while cards are generated (no streaming explanation)

The simplest approach: use the overlay with `loading=true` and the deck's pre-existing explanation already displayed. The user reads the explanation while cards generate. When cards are ready, "Start Practising" appears. This matches the existing UX flow.

For collections: show the first deck's explanation in the overlay, or skip the overlay and go straight to cards (since there are multiple explanations and none is primary). Let the side panel handle showing relevant explanations during practice.

### Session complete

On session complete, record that the decks were studied (for future FSRS). For now, just store a timestamp:

```sql
UPDATE decks SET last_studied_at = ? WHERE node_id = ?;
```

Add `last_studied_at INTEGER` column to the `decks` table in the initial schema.

---

## Step 6: Wiring — End-to-End Flow

### Flow 1: Create a deck

```
Home screen → tap [+] → DeckModal opens
  User enters: "JP::N5::Te-form", topic: "Japanese て-form conjugation", language: Japanese
  → createDeckFromPath("JP::N5::Te-form", "Japanese て-form conjugation", "Japanese")
    → creates nodes: JP (collection), N5 (collection), Te-form (deck)
  → generateDeckExplanation(deckId) starts in background
  → DeckModal closes
  → Tree updates reactively (Te-form shows ⏳)
  → When generation completes, tree updates (Te-form shows ✓)
```

### Flow 2: Study a single deck

```
Home screen → tap "Te-form" name
  → router.push('/session', { nodeId: teFormId })
  → Session screen: resolves nodeId → single deck
  → useSessionLoader({ topic, language, cardCount, existingExplanation: deck.explanation })
  → Overlay shows existing explanation + "Generating flashcards…"
  → Cards generated → "Start Practising" appears
  → Normal flashcard loop
  → Session complete → update last_studied_at
```

### Flow 3: Study a collection

```
Home screen → tap "N5" name
  → router.push('/session', { nodeId: n5Id })
  → Session screen: resolves nodeId → [teFormId, particlesId]
  → useMultiDeckSession({ deckIds: [...], cardOrder })
  → Brief loading screen while cards generate in parallel
  → Cards merged + ordered → practice begins
  → Side panel shows explanation matching current card's deck
  → Session complete → update last_studied_at for all decks
```

### Flow 4: Edit a deck

```
Home screen → tap pencil on "Te-form"
  → DeckModal opens (edit mode, pre-filled)
  → User changes topic
  → updateDeck(nodeId, { topic: newTopic }) → returns { regenerateExplanation: true }
  → generateDeckExplanation(deckId) starts in background
  → Tree shows ⏳ until done
```

### Flow 5: Settings

```
Home screen → tap ⚙️
  → SettingsModal opens
  → Toggle card order → setSetting('card_order', 'sequential')
  → Delete API key → clearApiKey() → router.replace('/onboarding')
```

---

## Implementation Order

Work in this order so each step is independently testable:

| Step | What | Test |
|---|---|---|
| 0 | `lib/db.ts` + schema + migrate storage.ts | App boots, API key still works, onboarding still works |
| 1 | `lib/deck-store.ts` + types | Unit test CRUD operations manually via console |
| 2 | `lib/explanation-generator.ts` | Create a deck programmatically, verify explanation generates |
| 3 | Home screen tree view + DeckModal + SettingsModal | Full UI for browsing/creating/editing decks |
| 4 | `hooks/useMultiDeckSession.ts` | Study a collection, verify parallel card generation |
| 5 | Session UI updates (multi-explanation, skip overlay) | End-to-end: create deck → study → complete |

---

## Files Summary

### New files

| File | Purpose |
|---|---|
| `lib/db.ts` | Database singleton, migrations, helpers |
| `lib/deck-store.ts` | CRUD for nodes, decks, settings |
| `lib/explanation-generator.ts` | Background explanation generation |
| `hooks/useDeckTree.ts` | Reactive tree query hook |
| `hooks/useMultiDeckSession.ts` | Multi-deck card generation hook |
| `components/home/DeckTree.tsx` | Collapsible tree list |
| `components/home/DeckModal.tsx` | Create/edit deck modal |
| `components/home/SettingsModal.tsx` | Settings modal |

### Modified files

| File | Changes |
|---|---|
| `lib/storage.ts` | Rewrite to use SQLite instead of AsyncStorage |
| `lib/types.ts` | Add `TreeNode`, `DeckData`, `DeckCard` types |
| `app/home.tsx` | Complete rewrite: tree view + modals |
| `app/session.tsx` | Accept `nodeId` param, resolve to deck(s), use multi-deck hook, pass current explanation to panel |
| `hooks/useSessionLoader.ts` | Minor: may be replaced by `useMultiDeckSession` or kept for single-deck convenience |
| `components/session/ExplanationPanel.tsx` | Add `deckName` prop label |
| `components/session/ExplanationOverlay.tsx` | Handle pre-generated explanation (no streaming) |
| `package.json` | Add `expo-sqlite` |

### Files to remove (eventually)

| File | Why |
|---|---|
| — | `@react-native-async-storage/async-storage` can be removed from dependencies after migration is confirmed stable |
