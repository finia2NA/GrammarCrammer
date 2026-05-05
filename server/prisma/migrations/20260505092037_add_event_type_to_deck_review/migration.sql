-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DeckReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deckId" TEXT NOT NULL,
    "studiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventType" TEXT NOT NULL DEFAULT 'review',
    "aiStars" INTEGER NOT NULL,
    "userStars" INTEGER NOT NULL,
    "aiRecap" TEXT NOT NULL,
    "intervalApplied" REAL NOT NULL,
    "correctCount" INTEGER,
    "totalCount" INTEGER,
    CONSTRAINT "DeckReview_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck" ("nodeId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DeckReview" ("aiRecap", "aiStars", "correctCount", "deckId", "id", "intervalApplied", "studiedAt", "totalCount", "userStars") SELECT "aiRecap", "aiStars", "correctCount", "deckId", "id", "intervalApplied", "studiedAt", "totalCount", "userStars" FROM "DeckReview";
DROP TABLE "DeckReview";
ALTER TABLE "new_DeckReview" RENAME TO "DeckReview";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
