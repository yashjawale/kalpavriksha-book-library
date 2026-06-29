-- CreateIndex
CREATE INDEX "loans_returnedAt_idx" ON "loans"("returnedAt");

-- CreateIndex
CREATE INDEX "loans_dueDate_idx" ON "loans"("dueDate");

-- CreateIndex
CREATE INDEX "loans_borrowedAt_idx" ON "loans"("borrowedAt");
