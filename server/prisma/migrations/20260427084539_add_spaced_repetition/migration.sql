-- CreateTable
CREATE TABLE "DeckReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deckId" TEXT NOT NULL,
    "studiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiStars" INTEGER NOT NULL,
    "userStars" INTEGER NOT NULL,
    "aiRecap" TEXT NOT NULL,
    "intervalApplied" REAL NOT NULL,
    CONSTRAINT "DeckReview_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck" ("nodeId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Deck" (
    "nodeId" TEXT NOT NULL PRIMARY KEY,
    "topic" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "explanation" TEXT,
    "explanationStatus" TEXT NOT NULL DEFAULT 'pending',
    "cardCount" INTEGER NOT NULL DEFAULT 10,
    "lastStudiedAt" DATETIME,
    "dueAt" DATETIME,
    "intervalDays" REAL NOT NULL DEFAULT 1,
    CONSTRAINT "Deck_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Deck" ("cardCount", "explanation", "explanationStatus", "language", "lastStudiedAt", "nodeId", "topic") SELECT "cardCount", "explanation", "explanationStatus", "language", "lastStudiedAt", "nodeId", "topic" FROM "Deck";
DROP TABLE "Deck";
ALTER TABLE "new_Deck" RENAME TO "Deck";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
