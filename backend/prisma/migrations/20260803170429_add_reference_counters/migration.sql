-- CreateTable
CREATE TABLE "reference_counters" (
    "year" INTEGER NOT NULL,
    "entity" VARCHAR(20) NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "reference_counters_pkey" PRIMARY KEY ("year","entity")
);
