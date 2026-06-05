-- Migration: V8__controle_licencas.sql
-- Objetivo: Criar função PL/pgSQL para validar licenciamento de módulos e planos no banco de dados.

CREATE OR REPLACE FUNCTION check_company_license(p_company_id TEXT, p_module_key VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
  v_has_license BOOLEAN;
BEGIN
  -- 1. Verifica se a licença é ativa para o módulo na tabela de ModuleLicense
  SELECT EXISTS (
    SELECT 1 
    FROM "ModuleLicense" ml
    JOIN "Module" m ON ml."moduleId" = m."id"
    WHERE ml."companyId" = p_company_id AND m."chave" = p_module_key AND ml."ativa" = TRUE
  ) INTO v_has_license;
  
  -- 2. Se não tiver licença explícita, verifica se está inclusa no plano contratado da empresa
  IF NOT v_has_license THEN
    SELECT EXISTS (
      SELECT 1
      FROM "Company" c
      JOIN "Plan" p ON c."plano_id" = p."id"
      WHERE c."id" = p_company_id AND (
        -- Enterprise tem tudo
        p."nome" = 'Enterprise' OR
        (p."nome" = 'Business' AND p_module_key IN (
          'clientes', 'veiculos', 'plataformas', 'ordens_servico', 'orcamentos', 'dashboard_basico',
          'contas_receber', 'contas_pagar', 'fluxo_caixa', 'estoque', 'fornecedores', 'xml', 'documentos',
          'emissao_fiscal', 'rede_credenciada', 'rh', 'adiantamentos', 'aprovacao_niveis', 'auditoria'
        )) OR
        (p."nome" = 'Professional' AND p_module_key IN (
          'clientes', 'veiculos', 'plataformas', 'ordens_servico', 'orcamentos', 'dashboard_basico',
          'contas_receber', 'contas_pagar', 'fluxo_caixa', 'estoque', 'fornecedores', 'xml', 'documentos'
        )) OR
        (p."nome" = 'Start' AND p_module_key IN (
          'clientes', 'veiculos', 'plataformas', 'ordens_servico', 'orcamentos', 'dashboard_basico'
        ))
      )
    ) INTO v_has_license;
  END IF;
  
  RETURN v_has_license;
END;
$$ LANGUAGE plpgsql;
