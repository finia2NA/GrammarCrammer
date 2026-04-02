-- CreateTable
CREATE TABLE "UsageLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "cost" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlyUsageSummary" (
    "userId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "totalCost" REAL NOT NULL DEFAULT 0,

    PRIMARY KEY ("userId", "yearMonth", "source"),
    CONSTRAINT "MonthlyUsageSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UsageLedger_userId_yearMonth_source_idx" ON "UsageLedger"("userId", "yearMonth", "source");

-- CreateIndex
CREATE INDEX "UsageLedger_yearMonth_source_idx" ON "UsageLedger"("yearMonth", "source");

-- CreateIndex
CREATE INDEX "MonthlyUsageSummary_yearMonth_source_idx" ON "MonthlyUsageSummary"("yearMonth", "source");
