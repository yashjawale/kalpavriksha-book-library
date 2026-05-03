-- CreateTable
CREATE TABLE "captured_books" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "frontImage" TEXT NOT NULL,
    "backImage" TEXT NOT NULL,
    "isbn" TEXT,
    "title" TEXT,
    "author" TEXT,
    "publisher" TEXT,
    "tagIds" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
