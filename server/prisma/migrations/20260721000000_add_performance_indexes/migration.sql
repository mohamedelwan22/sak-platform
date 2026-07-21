-- Sprint 2.8: Add performance indexes for commonly queried fields

-- AuditLog: compound index for entity lookups (entityType + entityId queried together)
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- Transaction: compound index for type + status filtering
CREATE INDEX "transactions_type_status_idx" ON "transactions"("type", "status");

-- KycSubmission: compound index for user + status filtering
CREATE INDEX "kyc_submissions_user_id_status_idx" ON "kyc_submissions"("user_id", "status");

-- PaymentRequest: compound index for user + type + status (admin stats)
CREATE INDEX "payment_requests_user_id_type_status_idx" ON "payment_requests"("user_id", "type", "status");

-- GoldPriceHistory: index on createdAt for ORDER BY queries
CREATE INDEX "gold_price_history_created_at_idx" ON "gold_price_history"("created_at");

-- SakConfig: index on effectiveFrom for latest config lookup
CREATE INDEX "sak_config_effective_from_idx" ON "sak_config"("effective_from");

-- Project: indexes for status filtering and createdAt ordering
CREATE INDEX "projects_status_idx" ON "projects"("status");
CREATE INDEX "projects_created_at_idx" ON "projects"("created_at");

-- Holding: compound index for user + status (portfolio active holdings)
CREATE INDEX "holdings_user_id_status_idx" ON "holdings"("user_id", "status");
