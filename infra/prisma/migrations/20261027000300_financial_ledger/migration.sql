-- AlterTable
ALTER TABLE "Portfolio" ADD COLUMN     "historyIncomplete" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Asset" (
    "id" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "ticker" VARCHAR(20) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "assetClass" VARCHAR(10) NOT NULL,
    "market" TEXT NOT NULL DEFAULT 'B3',
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" VARCHAR(300) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetAlias" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "ticker" TEXT NOT NULL,
    "market" TEXT NOT NULL,

    CONSTRAINT "AssetAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetChange" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEvent" (
    "id" UUID NOT NULL,
    "portfolioId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "kind" VARCHAR(10) NOT NULL,
    "date" DATE NOT NULL,
    "sequence" BIGSERIAL NOT NULL,
    "quantity" DECIMAL(38,12) NOT NULL,
    "unitPrice" DECIMAL(38,12) NOT NULL,
    "fees" DECIMAL(38,12) NOT NULL,
    "gross" DECIMAL(38,12) NOT NULL,
    "withholding" DECIMAL(38,12) NOT NULL,
    "note" VARCHAR(1000) NOT NULL DEFAULT '',
    "requestKey" UUID NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LedgerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerRevision" (
    "id" UUID NOT NULL,
    "portfolioId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetAlias_market_ticker_key" ON "AssetAlias"("market", "ticker");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEvent_sequence_key" ON "LedgerEvent"("sequence");

-- CreateIndex
CREATE INDEX "LedgerEvent_portfolioId_date_sequence_idx" ON "LedgerEvent"("portfolioId", "date", "sequence");

-- CreateIndex
CREATE INDEX "LedgerEvent_portfolioId_assetId_idx" ON "LedgerEvent"("portfolioId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEvent_portfolioId_requestKey_key" ON "LedgerEvent"("portfolioId", "requestKey");

-- CreateIndex
CREATE INDEX "LedgerRevision_portfolioId_resourceId_createdAt_idx" ON "LedgerRevision"("portfolioId", "resourceId", "createdAt");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAlias" ADD CONSTRAINT "AssetAlias_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetChange" ADD CONSTRAINT "AssetChange_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEvent" ADD CONSTRAINT "LedgerEvent_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEvent" ADD CONSTRAINT "LedgerEvent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerRevision" ADD CONSTRAINT "LedgerRevision_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT asset_market CHECK (market='B3' AND currency='BRL' AND "assetClass" IN ('STOCK','FII','ETF','BDR'));
ALTER TABLE "LedgerEvent" ADD CONSTRAINT event_amounts CHECK (quantity>=0 AND "unitPrice">=0 AND fees>=0 AND gross>=0 AND withholding>=0);
ALTER TABLE "LedgerEvent" ADD CONSTRAINT event_shape CHECK ((kind IN ('BUY','SELL') AND quantity>0 AND gross=0 AND withholding=0) OR (kind IN ('DIVIDEND','JCP','OTHER') AND quantity=0 AND "unitPrice"=0 AND fees=0 AND withholding<=gross));
CREATE FUNCTION immutable_financial_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit revisions are append-only'; END; $$;
CREATE TRIGGER ledger_revision_immutable BEFORE UPDATE OR DELETE ON "LedgerRevision" FOR EACH ROW EXECUTE FUNCTION immutable_financial_revision();
CREATE TRIGGER asset_change_immutable BEFORE UPDATE OR DELETE ON "AssetChange" FOR EACH ROW EXECUTE FUNCTION immutable_financial_revision();
