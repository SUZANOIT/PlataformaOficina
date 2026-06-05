-- Rollback: V8__controle_licencas_rollback.sql
-- Objetivo: Excluir a função check_company_license do banco de dados.

DROP FUNCTION IF EXISTS check_company_license(TEXT, VARCHAR(255));
