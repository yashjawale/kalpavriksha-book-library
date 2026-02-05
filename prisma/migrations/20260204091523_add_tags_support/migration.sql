-- CreateTable
CREATE TABLE "tags" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "book_tags" (
    "bookIsbn" TEXT NOT NULL,
    "tagId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("bookIsbn", "tagId"),
    CONSTRAINT "book_tags_bookIsbn_fkey" FOREIGN KEY ("bookIsbn") REFERENCES "books" ("isbn") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "book_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "book_tags_bookIsbn_idx" ON "book_tags"("bookIsbn");

-- CreateIndex
CREATE INDEX "book_tags_tagId_idx" ON "book_tags"("tagId");
