"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortalImpostoService = exports.PortalHttpError = void 0;
const zod_1 = require("zod");
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../../lib/prisma");
const s3_service_1 = require("../../services/s3.service");
const portalImposto_rules_1 = require("../portalImposto.rules");
const createImpostoSchema = zod_1.z.object({
    companyId: zod_1.z.string().uuid(),
    competencia: zod_1.z.string().regex(/^\d{2}\/\d{4}$/, 'Competência deve estar no formato MM/AAAA'),
    tipoImposto: zod_1.z.string().min(1),
    valor: zod_1.z.number().positive(),
    vencimento: zod_1.z.string().datetime(),
    observacao: zod_1.z.string().optional(),
    createdBy: zod_1.z.string().uuid().optional(),
});
const updateImpostoStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(portalImposto_rules_1.STATUS_IMPOSTO),
});
const updateImpostoSchema = zod_1.z.object({
    competencia: zod_1.z.string().regex(/^(0[1-9]|1[0-2])\/\d{4}$/, 'Competência deve estar no formato MM/AAAA'),
    tipoImposto: zod_1.z.string().min(1),
    valor: zod_1.z.number().nonnegative(),
    vencimento: zod_1.z.string().min(1),
});
class PortalHttpError extends Error {
    status;
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}
exports.PortalHttpError = PortalHttpError;
const SORT_FIELDS = ['vencimento', 'valor', 'competencia', 'status', 'createdAt'];
function companyWhere(scope) {
    if (scope.allCompanies)
        return {};
    if (!scope.companyId)
        throw new PortalHttpError('Company ID é obrigatório', 400);
    return { companyId: scope.companyId };
}
function mapImposto(imposto) {
    const anexo = imposto.anexos?.[0];
    return {
        id: imposto.id,
        companyId: imposto.companyId,
        cnpj: imposto.company?.cnpj || imposto.company?.cnpjSemMascara || '',
        cnpjSemMascara: imposto.company?.cnpjSemMascara || '',
        razaoSocial: imposto.company?.razaoSocial || '',
        competencia: imposto.competencia,
        tipoImposto: imposto.tipoImposto,
        vencimento: imposto.vencimento,
        valor: imposto.valor,
        status: imposto.status,
        observacao: imposto.observacao,
        arquivoNome: anexo?.nome || '',
        anexoId: anexo?.id || null,
        payableId: imposto.payableId || null,
        createdAt: imposto.createdAt,
    };
}
class PortalImpostoService {
    async create(data) {
        const validatedData = createImpostoSchema.parse(data);
        const imposto = await prisma_1.prisma.portalImposto.create({
            data: {
                companyId: validatedData.companyId,
                competencia: validatedData.competencia,
                tipoImposto: validatedData.tipoImposto,
                valor: validatedData.valor,
                vencimento: new Date(validatedData.vencimento),
                observacao: validatedData.observacao,
                createdBy: validatedData.createdBy,
                status: 'Aguardando envio',
            },
        });
        await prisma_1.prisma.portalAuditoria.create({
            data: {
                companyId: validatedData.companyId,
                usuarioId: validatedData.createdBy,
                acao: 'CRIAR_IMPOSTO',
                descricao: `Imposto ${validatedData.tipoImposto} da competência ${validatedData.competencia} criado.`,
            },
        });
        await prisma_1.prisma.portalHistorico.create({
            data: {
                impostoId: imposto.id,
                usuarioId: validatedData.createdBy,
                acao: 'CRIACAO',
                descricao: 'Registro de imposto criado no sistema.',
            },
        });
        return imposto;
    }
    async findAll(scope, filters = {}) {
        const page = Math.max(1, Number(filters.page) || 1);
        const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
        const sortBy = SORT_FIELDS.includes(filters.sortBy) ? filters.sortBy : 'vencimento';
        const sortDir = filters.sortDir === 'asc' ? 'asc' : 'desc';
        const where = {
            deletedAt: null,
            ...companyWhere(scope),
        };
        const competencias = (0, portalImposto_rules_1.competenciasEntre)(filters.competenciaDe, filters.competenciaAte);
        if (competencias)
            where.competencia = { in: competencias };
        if (filters.tipoImposto)
            where.tipoImposto = String(filters.tipoImposto);
        if (filters.status)
            where.status = String(filters.status);
        const vencimentoDe = filters.vencimentoDe ? (0, portalImposto_rules_1.parseVencimento)(String(filters.vencimentoDe)) : null;
        const vencimentoAte = filters.vencimentoAte ? (0, portalImposto_rules_1.parseVencimento)(String(filters.vencimentoAte)) : null;
        if (vencimentoDe || vencimentoAte) {
            where.vencimento = {};
            if (vencimentoDe)
                where.vencimento.gte = new Date(vencimentoDe.setHours(0, 0, 0, 0));
            if (vencimentoAte)
                where.vencimento.lte = new Date(vencimentoAte.setHours(23, 59, 59, 999));
        }
        const [total, rows] = await Promise.all([
            prisma_1.prisma.portalImposto.count({ where }),
            prisma_1.prisma.portalImposto.findMany({
                where,
                include: {
                    company: { select: { cnpj: true, cnpjSemMascara: true, razaoSocial: true } },
                    anexos: { orderBy: { createdAt: 'desc' }, take: 1 },
                },
                orderBy: { [sortBy]: sortDir },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);
        return {
            items: rows.map(mapImposto),
            total,
            page,
            pageSize,
        };
    }
    async findById(id, scope) {
        const imposto = await prisma_1.prisma.portalImposto.findFirst({
            where: { id, deletedAt: null, ...companyWhere(scope) },
            include: {
                company: { select: { cnpj: true, cnpjSemMascara: true, razaoSocial: true } },
                anexos: { orderBy: { createdAt: 'desc' } },
                comentarios: {
                    include: { usuario: { select: { name: true, email: true } } },
                    orderBy: { createdAt: 'desc' },
                },
                historico: {
                    include: { usuario: { select: { name: true, email: true } } },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!imposto)
            throw new PortalHttpError('Imposto não encontrado', 404);
        return { ...mapImposto(imposto), anexos: imposto.anexos, comentarios: imposto.comentarios, historico: imposto.historico };
    }
    async update(id, userId, scope, data) {
        const parsed = updateImpostoSchema.parse(data);
        const metadata = (0, portalImposto_rules_1.validateLoteMetadata)({
            competencia: parsed.competencia,
            tipoImposto: parsed.tipoImposto,
            vencimento: parsed.vencimento,
            valor: parsed.valor,
        });
        if (!metadata.ok)
            throw new PortalHttpError(metadata.motivo);
        const existente = await prisma_1.prisma.portalImposto.findFirst({
            where: { id, deletedAt: null, ...companyWhere(scope) },
        });
        if (!existente)
            throw new PortalHttpError('Imposto não encontrado', 404);
        const imposto = await prisma_1.prisma.portalImposto.update({
            where: { id },
            data: {
                competencia: metadata.competencia,
                tipoImposto: metadata.tipoImposto,
                valor: metadata.valor,
                vencimento: metadata.vencimento,
            },
        });
        await prisma_1.prisma.portalHistorico.create({
            data: {
                impostoId: id,
                usuarioId: userId,
                acao: 'EDICAO',
                descricao: `Metadados atualizados. Competência ${metadata.competencia}, tipo ${metadata.tipoImposto}, valor ${metadata.valor}.`,
            },
        });
        await prisma_1.prisma.portalAuditoria.create({
            data: {
                companyId: existente.companyId,
                usuarioId: userId,
                acao: 'EDITAR_IMPOSTO',
                descricao: `Imposto ${id} editado sem novo upload.`,
            },
        });
        return imposto;
    }
    async updateStatus(id, scope, userId, data) {
        const { status } = updateImpostoStatusSchema.parse(data);
        const impostoExistente = await prisma_1.prisma.portalImposto.findFirst({
            where: { id, deletedAt: null, ...companyWhere(scope) },
        });
        if (!impostoExistente)
            throw new PortalHttpError('Imposto não encontrado', 404);
        const updateData = { status };
        if (status === 'Pago')
            updateData.pagamento = new Date();
        const imposto = await prisma_1.prisma.portalImposto.update({
            where: { id },
            data: updateData,
        });
        await prisma_1.prisma.portalHistorico.create({
            data: {
                impostoId: imposto.id,
                usuarioId: userId,
                acao: 'MUDANCA_STATUS',
                descricao: `Status alterado de ${impostoExistente.status} para ${status}.`,
            },
        });
        return imposto;
    }
    async remove(id, userId, scope) {
        const existente = await prisma_1.prisma.portalImposto.findFirst({
            where: { id, deletedAt: null, ...companyWhere(scope) },
        });
        if (!existente)
            throw new PortalHttpError('Imposto não encontrado', 404);
        await prisma_1.prisma.portalImposto.update({
            where: { id },
            data: { deletedAt: new Date(), status: 'Cancelado' },
        });
        await prisma_1.prisma.portalHistorico.create({
            data: {
                impostoId: id,
                usuarioId: userId,
                acao: 'EXCLUSAO',
                descricao: 'Registro excluído logicamente. O arquivo permanece associado para auditoria.',
            },
        });
        await prisma_1.prisma.portalAuditoria.create({
            data: {
                companyId: existente.companyId,
                usuarioId: userId,
                acao: 'EXCLUIR_IMPOSTO',
                descricao: `Imposto ${id} marcado como excluído.`,
            },
        });
        return { ok: true };
    }
    async lancarContasPagar(id, userId, scope) {
        const imposto = await prisma_1.prisma.portalImposto.findFirst({
            where: { id, deletedAt: null, ...companyWhere(scope) },
        });
        if (!imposto)
            throw new PortalHttpError('Imposto não encontrado', 404);
        if (imposto.payableId)
            throw new PortalHttpError('Este imposto já foi lançado em Contas a Pagar.', 409);
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        const responsavel = user?.name || 'Portal Contabilidade';
        return prisma_1.prisma.$transaction(async (tx) => {
            const payable = await tx.financialPayable.create({
                data: {
                    companyId: imposto.companyId,
                    fornecedor: `Guia ${imposto.tipoImposto}`,
                    categoria: 'Impostos',
                    centroCusto: 'Administrativo',
                    descricao: `Imposto ${imposto.tipoImposto} - competência ${imposto.competencia}`,
                    valor: imposto.valor,
                    dataEmissao: new Date(),
                    vencimento: imposto.vencimento,
                    formaPagamento: 'Boleto',
                    responsavel,
                    status: 'PENDENTE',
                    observacoes: `Lançado a partir do Portal Contabilidade (imposto ${imposto.id}).`,
                    responsavel_lancamento_id: userId,
                    responsavel_lancamento_nome: responsavel,
                },
            });
            const vinculo = await tx.portalImposto.updateMany({
                where: { id, payableId: null },
                data: { payableId: payable.id },
            });
            if (vinculo.count === 0)
                throw new PortalHttpError('Este imposto já foi lançado em Contas a Pagar.', 409);
            await tx.portalHistorico.create({
                data: {
                    impostoId: id,
                    usuarioId: userId,
                    acao: 'CONTAS_PAGAR',
                    descricao: `Lançado em Contas a Pagar (lançamento ${payable.numeroLancamento}) com vencimento copiado do imposto.`,
                },
            });
            await tx.portalAuditoria.create({
                data: {
                    companyId: imposto.companyId,
                    usuarioId: userId,
                    acao: 'LANCAR_CONTAS_PAGAR',
                    descricao: `Imposto ${id} lançado em Contas a Pagar (${payable.id}).`,
                },
            });
            return { payableId: payable.id, numeroLancamento: payable.numeroLancamento };
        });
    }
    async uploadAnexo(impostoId, scope, userId, file) {
        const validacao = (0, portalImposto_rules_1.validateBulkFile)(file);
        if (!validacao.ok)
            throw new PortalHttpError(validacao.motivo);
        const imposto = await prisma_1.prisma.portalImposto.findFirst({
            where: { id: impostoId, deletedAt: null, ...companyWhere(scope) },
        });
        if (!imposto)
            throw new PortalHttpError('Imposto não encontrado', 404);
        const hash = crypto_1.default.createHash('sha256').update(file.buffer).digest('hex');
        const uploadResult = await s3_service_1.S3Service.uploadImpostoFile(file.buffer, file.originalname, file.mimetype, imposto.id, imposto.competencia);
        const anexo = await prisma_1.prisma.portalImpostoAnexo.create({
            data: {
                impostoId: imposto.id,
                nome: file.originalname,
                arquivo: uploadResult.key,
                tipo: file.mimetype,
                tamanho: uploadResult.size,
                hash,
                uploadedBy: userId,
            },
        });
        await prisma_1.prisma.portalHistorico.create({
            data: {
                impostoId: imposto.id,
                usuarioId: userId,
                acao: 'UPLOAD_ANEXO',
                descricao: `Anexo ${file.originalname} adicionado.`,
            },
        });
        return anexo;
    }
    async getArquivo(id, scope) {
        const imposto = await prisma_1.prisma.portalImposto.findFirst({
            where: { id, deletedAt: null, ...companyWhere(scope) },
            include: { anexos: { orderBy: { createdAt: 'desc' }, take: 1 } },
        });
        if (!imposto)
            throw new PortalHttpError('Imposto não encontrado', 404);
        const anexo = imposto.anexos[0];
        if (!anexo)
            throw new PortalHttpError('Nenhum arquivo associado a este imposto.', 404);
        const buffer = await s3_service_1.S3Service.getObjectBuffer(anexo.arquivo);
        return { buffer, filename: anexo.nome, mime: anexo.tipo || 'application/pdf' };
    }
    async getArquivos(ids, scope) {
        const uniqueIds = [...new Set(ids)].slice(0, 30);
        const impostos = await prisma_1.prisma.portalImposto.findMany({
            where: { id: { in: uniqueIds }, deletedAt: null, ...companyWhere(scope) },
            include: { anexos: { orderBy: { createdAt: 'desc' }, take: 1 } },
        });
        const files = [];
        for (const imposto of impostos) {
            const anexo = imposto.anexos[0];
            if (!anexo)
                continue;
            const buffer = await s3_service_1.S3Service.getObjectBuffer(anexo.arquivo);
            files.push({ filename: anexo.nome, buffer });
        }
        if (files.length === 0)
            throw new PortalHttpError('Nenhum arquivo disponível para download.', 404);
        return files;
    }
    async bulkUpload(userId, competencia, tipoImposto, vencimento, valorInformado, files, fallbackCompanyId) {
        const metadata = (0, portalImposto_rules_1.validateLoteMetadata)({ competencia, tipoImposto, vencimento, valor: valorInformado });
        if (!metadata.ok)
            throw new PortalHttpError(metadata.motivo);
        return (0, portalImposto_rules_1.processBatch)(files, async (file) => {
            const atual = file;
            const validacao = (0, portalImposto_rules_1.validateBulkFile)(atual);
            if (!validacao.ok)
                throw new Error(validacao.motivo);
            const company = (validacao.cnpj
                ? await prisma_1.prisma.company.findFirst({ where: { cnpjSemMascara: validacao.cnpj } })
                : null) ??
                (fallbackCompanyId
                    ? await prisma_1.prisma.company.findFirst({ where: { id: fallbackCompanyId } })
                    : null);
            if (!company) {
                throw new Error('Empresa não identificada para este arquivo.');
            }
            const hash = crypto_1.default.createHash('sha256').update(atual.buffer).digest('hex');
            const duplicado = await prisma_1.prisma.portalImpostoAnexo.findFirst({
                where: {
                    hash,
                    imposto: {
                        companyId: company.id,
                        competencia: metadata.competencia,
                        tipoImposto: metadata.tipoImposto,
                        deletedAt: null,
                    },
                },
            });
            if (duplicado)
                throw new Error((0, portalImposto_rules_1.duplicateMotivo)());
            const impostoId = crypto_1.default.randomUUID();
            const uploadResult = await s3_service_1.S3Service.uploadImpostoFile(atual.buffer, atual.originalname, atual.mimetype || 'application/pdf', impostoId, metadata.competencia);
            try {
                await prisma_1.prisma.$transaction(async (tx) => {
                    await tx.portalImposto.create({
                        data: {
                            id: impostoId,
                            companyId: company.id,
                            competencia: metadata.competencia,
                            tipoImposto: metadata.tipoImposto,
                            valor: metadata.valor,
                            vencimento: metadata.vencimento,
                            createdBy: userId,
                            status: 'Enviado',
                            observacao: 'Gerado via importação em lote.',
                        },
                    });
                    await tx.portalImpostoAnexo.create({
                        data: {
                            impostoId,
                            nome: atual.originalname,
                            arquivo: uploadResult.key,
                            tipo: atual.mimetype || 'application/pdf',
                            tamanho: uploadResult.size,
                            hash,
                            uploadedBy: userId,
                        },
                    });
                    await tx.portalHistorico.create({
                        data: {
                            impostoId,
                            usuarioId: userId,
                            acao: 'IMPORTACAO_LOTE',
                            descricao: `Boleto importado em lote no valor de ${metadata.valor}.`,
                        },
                    });
                    await tx.portalAuditoria.create({
                        data: {
                            companyId: company.id,
                            usuarioId: userId,
                            acao: 'IMPORTACAO_LOTE',
                            descricao: `Imposto ${metadata.tipoImposto} ${metadata.competencia} criado para ${company.razaoSocial}.`,
                        },
                    });
                });
            }
            catch (error) {
                await s3_service_1.S3Service.deleteFile(uploadResult.key).catch(() => undefined);
                throw error;
            }
            return {
                arquivo: atual.originalname,
                empresa: company.razaoSocial,
                cnpj: company.cnpj,
                impostoId,
                valor: metadata.valor,
            };
        });
    }
}
exports.PortalImpostoService = PortalImpostoService;
