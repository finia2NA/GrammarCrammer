-- CreateTable
CREATE TABLE "GrammarCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deckId" TEXT NOT NULL,
    "caseKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ruleSummary" TEXT NOT NULL,
    "generationHint" TEXT NOT NULL,
    "baseWeight" REAL NOT NULL DEFAULT 1,
    "sourceHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GrammarCase_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck" ("nodeId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GrammarCaseUserStat" (
    "userId" TEXT NOT NULL,
    "grammarCaseId" TEXT NOT NULL,
    "seenCount" INTEGER NOT NULL DEFAULT 0,
    "correctFirstTryCount" INTEGER NOT NULL DEFAULT 0,
    "difficultyMass" REAL NOT NULL DEFAULT 0,
    "attemptMass" REAL NOT NULL DEFAULT 0,
    "lastPracticedIteration" INTEGER,
    "lastUpdatedIteration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "grammarCaseId"),
    CONSTRAINT "GrammarCaseUserStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GrammarCaseUserStat_grammarCaseId_fkey" FOREIGN KEY ("grammarCaseId") REFERENCES "GrammarCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GrammarCase_deckId_caseKey_key" ON "GrammarCase"("deckId", "caseKey");

-- CreateIndex
CREATE INDEX "GrammarCase_deckId_active_sortOrder_idx" ON "GrammarCase"("deckId", "active", "sortOrder");

-- CreateIndex
CREATE INDEX "GrammarCase_deckId_sourceHash_idx" ON "GrammarCase"("deckId", "sourceHash");

-- CreateIndex
CREATE INDEX "GrammarCaseUserStat_grammarCaseId_idx" ON "GrammarCaseUserStat"("grammarCaseId");
