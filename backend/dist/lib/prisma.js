"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.basePrisma = exports.prisma = void 0;
const client_1 = require("@prisma/client");
const tenant_context_1 = require("./tenant-context");
const basePrisma = new client_1.PrismaClient();
exports.basePrisma = basePrisma;
const modelsWithCompanyId = [
    'User', 'Client', 'Supplier', 'Collaborator', 'Vehicle', 'TaxSetting',
    'EmailConfig', 'Quote', 'FinancialPayable', 'FinancialReceivable',
    'PlataformaGestao', 'FinancialCategory', 'FiscalDocument', 'Oficina',
    'Subscription', 'ModuleLicense', 'AbsenceHistory', 'AbsenceAudit'
];
let cachedCurioCompanyId = null;
async function getCurioCompanyId() {
    if (cachedCurioCompanyId)
        return cachedCurioCompanyId;
    try {
        const curio = await basePrisma.company.findFirst({
            where: {
                OR: [
                    { razaoSocial: { contains: 'curio', mode: 'insensitive' } },
                    { nomeFantasia: { contains: 'curio', mode: 'insensitive' } },
                    { razaoSocial: { contains: 'curió', mode: 'insensitive' } },
                    { nomeFantasia: { contains: 'curió', mode: 'insensitive' } }
                ]
            },
            select: { id: true }
        });
        if (curio) {
            cachedCurioCompanyId = curio.id;
        }
    }
    catch (err) {
        console.error('Error fetching Curio company ID in prisma extension:', err);
    }
    return cachedCurioCompanyId;
}
exports.prisma = basePrisma.$extends({
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                const context = tenant_context_1.tenantContext.getStore();
                // Se não houver contexto de tenant ou se o modelo não tiver companyId, executa a query normalmente
                if (!context || !context.companyId || !modelsWithCompanyId.includes(model)) {
                    return query(args);
                }
                const companyId = context.companyId;
                const anyArgs = args;
                const curioCompanyId = await getCurioCompanyId();
                const isBypassedModel = model === 'Quote' || model === 'Vehicle';
                const allowedCompanyIds = isBypassedModel && curioCompanyId
                    ? [companyId, curioCompanyId]
                    : [companyId];
                // Injeta filtros de leitura
                if (operation === 'findFirst' ||
                    operation === 'findMany' ||
                    operation === 'count' ||
                    operation === 'aggregate' ||
                    operation === 'groupBy') {
                    anyArgs.where = anyArgs.where || {};
                    anyArgs.where.companyId = isBypassedModel && curioCompanyId
                        ? { in: allowedCompanyIds }
                        : companyId;
                }
                // Converte findUnique para findFirst do basePrisma para aceitar filtro de companyId sem erro de índice único
                if (operation === 'findUnique') {
                    anyArgs.where = anyArgs.where || {};
                    anyArgs.where.companyId = isBypassedModel && curioCompanyId
                        ? { in: allowedCompanyIds }
                        : companyId;
                    return basePrisma[model].findFirst(anyArgs);
                }
                // Injeta companyId no create
                if (operation === 'create') {
                    anyArgs.data = anyArgs.data || {};
                    const passedCompanyId = anyArgs.data.companyId;
                    const isWritingToCurio = curioCompanyId && passedCompanyId === curioCompanyId;
                    if (!(isBypassedModel && isWritingToCurio)) {
                        anyArgs.data.companyId = companyId;
                    }
                }
                // Injeta companyId no createMany
                if (operation === 'createMany') {
                    if (anyArgs.data) {
                        if (Array.isArray(anyArgs.data)) {
                            anyArgs.data = anyArgs.data.map((item) => {
                                const passedCompanyId = item.companyId;
                                const isWritingToCurio = curioCompanyId && passedCompanyId === curioCompanyId;
                                if (isBypassedModel && isWritingToCurio) {
                                    return item;
                                }
                                return { ...item, companyId };
                            });
                        }
                        else {
                            const passedCompanyId = anyArgs.data.companyId;
                            const isWritingToCurio = curioCompanyId && passedCompanyId === curioCompanyId;
                            if (!(isBypassedModel && isWritingToCurio)) {
                                anyArgs.data.companyId = companyId;
                            }
                        }
                    }
                }
                // Impede tenant-hopping no update
                if (operation === 'update' || operation === 'updateMany') {
                    if (anyArgs.data) {
                        delete anyArgs.data.companyId;
                    }
                }
                // Injeta filtros no updateMany/deleteMany
                if (operation === 'updateMany' || operation === 'deleteMany') {
                    anyArgs.where = anyArgs.where || {};
                    anyArgs.where.companyId = isBypassedModel && curioCompanyId
                        ? { in: allowedCompanyIds }
                        : companyId;
                }
                // Validação estrita de posse para mutações individuais (update e delete)
                if (operation === 'update' || operation === 'delete') {
                    // Busca o registro na base usando o basePrisma (evita loops)
                    const existing = await basePrisma[model].findFirst({
                        where: {
                            ...anyArgs.where,
                            companyId: isBypassedModel && curioCompanyId
                                ? { in: allowedCompanyIds }
                                : companyId
                        }
                    });
                    if (!existing) {
                        throw new Error(`Registro não encontrado no tenant ativo ou acesso não autorizado.`);
                    }
                }
                return query(anyArgs);
            }
        }
    }
});
