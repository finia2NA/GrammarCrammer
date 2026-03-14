# GrammarCrammer — Project Description & Progress

## Overview
AI-assisted grammar studying app, flashcard style. React Native (Expo, web-first).
Core loop: user names a grammar topic → Claude generates an explanation + flashcards →
user practices translating English sentences → Claude judges answers in real time.

---

## Current Step

Decks:

On the home screen, the user can create collections and decks. This is a tree structure with an invisible root node and elements under them. Normal nodes are collections, leaves are decks.
A deck is a re-learnable session. Its explanation was created once, and is saved for future use. When a deck is learned, its existing explanation is used to generate new cards.
When a collection is studied, all decks within it generate cards at the same time, and are then shown in one session.

When this is implemented, an FSRS-style system for choosing which decks are due for review is next, so the implementation needs to compatible with this.

To implement this, multiple changes are necessary. In order, they are
- Think about our current way of persisting data. Is it appropriate for the new requirements, storing structured data? I suspect not, so what could be a better way of handling this? Something SQLite-based, or maybe something elegant that is react-native friendly?
  - The data will also need to be synced to a backend at some point, so if there is something with inbuilt sync capabilities between a local and remote data store, that would be ideal.
- Implement data structure for collections and decks.
- Create UI for creating and viewing collections and decks.
  - For decks, there can be a plus icon on the home screen which opens a modal that allows a user to input a deck name, language and a gramatical topic. When a deck is created, the generation of the explanation happens in the background.
  - Anki-style, collections can be simply created by naming a deck a certain way. Eg JP::N5::havsga would be deck havsga in collection N5 in collection JP.
  - The UI shows the collections and decks as a collapsible list, with subitems being more inset than their parents.
  - Clicking on the name of a deck/collection starts the study session. Cards for all applicable decks are generated in parallel. As mentioned, the pre-existing explanation is used as a base.
  - Clicking on a pencil icon on the right of the collection and decks opens an edit view. For collections, this allows a rename. For decks, this opens the same modal that was shown when the deck was created, and allows the user to change the name/prompt/language of the deck. The explanation is re-generated in the background if prompt or language are changed, not if name is changed.
  - On the home screen, there is a settings icon in the top right that opens a modal (or full-screen on small screens, same as the modal for deck creation) determines how cards are sorted initially when reviewing a collection - either all cards of one deck at once, or shuffled
  - It also contains a button to delete the API key, in which case we go back to onboarding.
  - The GrammarCrammer Name is moved to the top right
- Update the study view to handle collections and decks with pre-generated explanations. The best way to do this would probably be to re-use the UI of session.tsx, but move the generation logic up to a new session manager. the session manager can handle prompts the way they are now from the homescreen, where everything needs to be generated, decks (one pre-generated explanation) and collections (multiple explanations).

---

## Progress Tracker

| Step                        | Status | Notes                                                     |
| --------------------------- | ------ | --------------------------------------------------------- |
| Phase 0 — Project bootstrap | ✅ Done | Expo 54, NativeWind v4.2, AsyncStorage                    |
| Step 1 — Onboarding         | ✅ Done | 3-card carousel, API key validation, storage              |
| Step 2 — Home screen        | ✅ Done | topic input, language/mode/count dropdowns, start button  |
| Step 3a — Explanation phase | ✅ Done | 習得 overlay → side panel; 練習 skips overlay             |
| Step 3b — Flashcard loop    | ✅ Done | Haiku judges, Sonnet explains rejections, shuffle+requeue |

---

## Future Features

| Feature                           | Notes                                                                                                                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session history                   | Store past sessions (topic, explanation, cards, scores) in local storage for future use                                                                                                |
| ✅ Mobile apps                     | Build and publish native iOS app                                                                                                                                                       |
| ✅ Lanuage-specific prompts and UI | Help the models by giving them supplementary information for specific languages, and a way to show information not evident from the source sentence, such as level of 敬語 in japanese |
| Full flashcard system             | Grammar-point based scheduling, FSRS, notifications                                                                                                                                    |
| Backend                           | Store all state not only locally, but also in a db for sync between apps                                                                                                               |
| Difficulty level                  | Tailor the difficulty level of the grammar cards to your liking                                                                                                                        |
| More models                       | Integrate gemini and chatgpt models, let the user choose what is used for big and small models in the app                                                                              |
| Continue chatting                 | Ask follow-up questions about a card                                                                                                                                                   |
| Better styling                    | Change the look from the very default-tailwindy one to something more unique                                                                                                           |
| Better error handling             | Eg when network drops, the user is forced to restart the session and loses all progress.                                                                                               |
---

## Tech Stack
- **Framework**: Expo 54 (React Native + Web)
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based)
- **Storage**: @react-native-async-storage/async-storage
- **AI**: Direct fetch to Anthropic API (user's own key, no backend)
- **Styling**: NativeWind v4 (Tailwind CSS)
- **Models**: Claude Sonnet 4.6 (explanations), Claude Haiku 4.5 (cards + judgment)

## Housekeeping
| Feature       | Notes                                                                                |
| ------------- | ------------------------------------------------------------------------------------ |
| emojis on ios | do not work rn                                                                       |
| ios build     | works, but need to specify the steps needed in xcode to build the production version |