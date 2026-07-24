-- Create DiscardedBook table
CREATE TABLE IF NOT EXISTS "discarded_books" (
    "id" SERIAL PRIMARY KEY,
    "isbn" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "discardedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
