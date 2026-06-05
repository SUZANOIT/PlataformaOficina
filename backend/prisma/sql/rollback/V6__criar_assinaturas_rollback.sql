-- Rollback: V6__criar_assinaturas_rollback.sql
-- Objetivo: Excluir tabelas de assinaturas, licenciamentos, faturas e históricos.

DROP TABLE IF EXISTS "SubscriptionHistory";
DROP TABLE IF EXISTS "Payment";
DROP TABLE IF EXISTS "ModuleLicense";
DROP TABLE IF EXISTS "Subscription";
