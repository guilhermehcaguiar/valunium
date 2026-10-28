-- Additive: no existing financial/history tables are rewritten.
CREATE TABLE "ManualQuote" (
 "id" UUID PRIMARY KEY, "ownerId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "assetId" UUID NOT NULL REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "price" DECIMAL(38,12) NOT NULL CHECK (price>0), "currency" CHAR(3) NOT NULL CHECK (currency='BRL'),
 "effectiveAt" TIMESTAMPTZ(3) NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "invalidatedAt" TIMESTAMPTZ(3), "reason" VARCHAR(500) NOT NULL CHECK (length(trim(reason))>0),
 "invalidationReason" VARCHAR(500), "requestKey" UUID NOT NULL,
 CONSTRAINT manual_invalidation CHECK (("invalidatedAt" IS NULL AND "invalidationReason" IS NULL) OR ("invalidatedAt" IS NOT NULL AND "invalidationReason" IS NOT NULL AND length(trim("invalidationReason"))>0)),
 CONSTRAINT manual_reference_date CHECK ("effectiveAt">='2000-01-01' AND "effectiveAt"<="createdAt")
);
CREATE UNIQUE INDEX "ManualQuote_ownerId_requestKey_key" ON "ManualQuote"("ownerId","requestKey");
CREATE INDEX "ManualQuote_ownerId_assetId_createdAt_idx" ON "ManualQuote"("ownerId","assetId","createdAt");
CREATE UNIQUE INDEX manual_one_active ON "ManualQuote"("ownerId","assetId") WHERE "invalidatedAt" IS NULL;
CREATE TABLE "MarketQuote" (
 "id" UUID PRIMARY KEY, "assetId" UUID NOT NULL REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "ticker" VARCHAR(20) NOT NULL, "price" DECIMAL(38,12) NOT NULL CHECK (price>0), "currency" CHAR(3) NOT NULL CHECK(currency='BRL'),
 "effectiveAt" TIMESTAMPTZ(3), "fetchedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "provider" VARCHAR(16) NOT NULL DEFAULT 'BRAPI' CHECK(provider='BRAPI'),
 "priceType" VARCHAR(16) NOT NULL DEFAULT 'DELAYED' CHECK("priceType"='DELAYED')
);
CREATE INDEX "MarketQuote_assetId_ticker_fetchedAt_idx" ON "MarketQuote"("assetId","ticker","fetchedAt");
CREATE TABLE "MarketProviderState" (
 "id" VARCHAR(16) PRIMARY KEY, "leaseId" UUID, "leaseUntil" TIMESTAMPTZ(3), "blockedUntil" TIMESTAMPTZ(3)
);
INSERT INTO "MarketProviderState" (id) VALUES ('BRAPI');
CREATE TABLE "MarketRequest" (
 "id" UUID PRIMARY KEY, "ticker" VARCHAR(20) NOT NULL,
 "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING'
);
CREATE INDEX "MarketRequest_startedAt_idx" ON "MarketRequest"("startedAt");
CREATE INDEX "MarketRequest_ticker_startedAt_idx" ON "MarketRequest"("ticker","startedAt");
CREATE FUNCTION preserve_manual_reference() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Manual references cannot be deleted'; END IF;
 IF OLD."invalidatedAt" IS NOT NULL OR NEW."invalidatedAt" IS NULL OR
    (to_jsonb(OLD)-'invalidatedAt'-'invalidationReason') IS DISTINCT FROM (to_jsonb(NEW)-'invalidatedAt'-'invalidationReason') THEN
   RAISE EXCEPTION 'Manual references are immutable except for first invalidation';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER manual_reference_immutable BEFORE UPDATE OR DELETE ON "ManualQuote" FOR EACH ROW EXECUTE FUNCTION preserve_manual_reference();
CREATE TRIGGER market_reference_immutable BEFORE UPDATE OR DELETE ON "MarketQuote" FOR EACH ROW EXECUTE FUNCTION immutable_financial_revision();
