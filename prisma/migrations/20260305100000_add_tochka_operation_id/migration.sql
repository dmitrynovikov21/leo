-- AlterTable
ALTER TABLE "user_subscriptions" ADD COLUMN "tochka_operation_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_tochka_operation_id_key" ON "user_subscriptions"("tochka_operation_id");
