-- AlterTable
ALTER TABLE "store_goods" ADD COLUMN "rank" INTEGER NOT NULL DEFAULT 0;

-- Backfill rank for existing goods per store
UPDATE "store_goods"
SET "rank" = (
  SELECT COUNT(*) - 1
  FROM "store_goods" AS sg2
  WHERE sg2."store_id" = "store_goods"."store_id"
    AND sg2."id" <= "store_goods"."id"
);
