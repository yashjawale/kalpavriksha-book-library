-- CreateTable
CREATE TABLE "books" (
    "isbn" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "totalStock" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "email" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT
);

-- CreateTable
CREATE TABLE "loans" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bookIsbn" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "borrowedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" DATETIME,
    CONSTRAINT "loans_bookIsbn_fkey" FOREIGN KEY ("bookIsbn") REFERENCES "books" ("isbn") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "loans_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "users" ("email") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "loans_bookIsbn_idx" ON "loans"("bookIsbn");

-- CreateIndex
CREATE INDEX "loans_userEmail_idx" ON "loans"("userEmail");
