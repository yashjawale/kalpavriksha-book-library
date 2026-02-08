-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_books" (
    "isbn" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "publisher" TEXT,
    "totalStock" INTEGER NOT NULL DEFAULT 1,
    "needsBarcodeSticker" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_books" ("author", "createdAt", "isbn", "publisher", "title", "totalStock", "updatedAt") SELECT "author", "createdAt", "isbn", "publisher", "title", "totalStock", "updatedAt" FROM "books";
DROP TABLE "books";
ALTER TABLE "new_books" RENAME TO "books";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
