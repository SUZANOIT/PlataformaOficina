-- Rollback: V5__popular_empresa_padrao_rollback.sql
-- Objetivo: Desvincular registros da empresa padrão e excluir a empresa do banco.

UPDATE "User" SET "companyId" = NULL WHERE "companyId" = 'mca-padrao-company-uuid-000000000001';
UPDATE "Client" SET "companyId" = NULL WHERE "companyId" = 'mca-padrao-company-uuid-000000000001';
UPDATE "Supplier" SET "companyId" = NULL WHERE "companyId" = 'mca-padrao-company-uuid-000000000001';
UPDATE "Vehicle" SET "companyId" = NULL WHERE "companyId" = 'mca-padrao-company-uuid-000000000001';
UPDATE "Collaborator" SET "companyId" = NULL WHERE "companyId" = 'mca-padrao-company-uuid-000000000001';
UPDATE "TaxSetting" SET "companyId" = NULL WHERE "companyId" = 'mca-padrao-company-uuid-000000000001';
UPDATE "PlataformaGestao" SET "companyId" = NULL WHERE "companyId" = 'mca-padrao-company-uuid-000000000001';
UPDATE "Oficina" SET "companyId" = NULL WHERE "companyId" = 'mca-padrao-company-uuid-000000000001';

DELETE FROM "Company" WHERE "id" = 'mca-padrao-company-uuid-000000000001';
