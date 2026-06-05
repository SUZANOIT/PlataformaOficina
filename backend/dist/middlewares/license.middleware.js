"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkLicense = checkLicense;
const prisma_1 = require("../lib/prisma");
function checkLicense(moduleKey) {
    return async (req, res, next) => {
        try {
            const companyId = req.companyId;
            if (!companyId) {
                return res.status(401).json({ error: 'Empresa não identificada na requisição.' });
            }
            // Buscar empresa, seu plano e licenças individuais
            const company = await prisma_1.prisma.company.findUnique({
                where: { id: companyId },
                include: {
                    plan: true,
                    moduleLicenses: {
                        where: { ativa: true },
                        include: { module: true }
                    }
                }
            });
            if (!company) {
                return res.status(404).json({ error: 'Empresa não encontrada.' });
            }
            // 1. Se possuir uma licença explícita e ativa para o módulo, libera o acesso
            const hasExplicitLicense = company.moduleLicenses.some(ml => ml.module.chave === moduleKey);
            if (hasExplicitLicense) {
                return next();
            }
            // 2. Se não possuir licença avulsa, verifica de acordo com a hierarquia do plano contratado
            const planName = company.plan?.nome;
            if (!planName) {
                return res.status(403).json({
                    error: 'Este recurso não está disponível no seu plano atual.',
                    code: 'PLAN_LIMIT_REACHED'
                });
            }
            // Módulos inclusos em cada nível de plano
            const planModules = {
                Start: ['clientes', 'veiculos', 'plataformas', 'ordens_servico', 'orcamentos', 'dashboard_basico'],
                Professional: [
                    'clientes', 'veiculos', 'plataformas', 'ordens_servico', 'orcamentos', 'dashboard_basico',
                    'contas_receber', 'contas_pagar', 'fluxo_caixa', 'estoque', 'fornecedores', 'xml', 'documentos'
                ],
                Business: [
                    'clientes', 'veiculos', 'plataformas', 'ordens_servico', 'orcamentos', 'dashboard_basico',
                    'contas_receber', 'contas_pagar', 'fluxo_caixa', 'estoque', 'fornecedores', 'xml', 'documentos',
                    'emissao_fiscal', 'rede_credenciada', 'rh', 'adiantamentos', 'aprovacao_niveis', 'auditoria'
                ],
                Enterprise: [
                    'clientes', 'veiculos', 'plataformas', 'ordens_servico', 'orcamentos', 'dashboard_basico',
                    'contas_receber', 'contas_pagar', 'fluxo_caixa', 'estoque', 'fornecedores', 'xml', 'documentos',
                    'emissao_fiscal', 'rede_credenciada', 'rh', 'adiantamentos', 'aprovacao_niveis', 'auditoria',
                    'multiempresa', 'api', 'bi', 'integracoes', 'whatsapp', 'receitaws', 'fipe'
                ]
            };
            const allowedModules = planModules[planName] || [];
            if (allowedModules.includes(moduleKey)) {
                return next();
            }
            return res.status(403).json({
                error: 'Este recurso não está disponível no seu plano atual.',
                code: 'PLAN_LIMIT_REACHED'
            });
        }
        catch (error) {
            console.error('Erro ao verificar licença:', error);
            return res.status(500).json({ error: 'Erro interno ao validar licença.' });
        }
    };
}
