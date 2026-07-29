"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortalImpostoService = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const s3_service_1 = require("../../services/s3.service");
const crypto_1 = __importDefault(require("crypto"));
const prisma = new client_1.PrismaClient();
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
    status: zod_1.z.enum([
        'Aguardando envio',
        'Enviado',
        'Recebido',
        'Pago',
        'Em atraso',
        'Reenviado',
        'Cancelado',
    ]),
});
class PortalImpostoService {
    async create(data) {
        const validatedData = createImpostoSchema.parse(data);
        const imposto = await prisma.portalImposto.create({
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
        // Registrar auditoria
        await prisma.portalAuditoria.create({
            data: {
                companyId: validatedData.companyId,
                usuarioId: validatedData.createdBy,
                acao: 'CRIAR_IMPOSTO',
                descricao: `Imposto ${validatedData.tipoImposto} da competência ${validatedData.competencia} criado.`,
            },
        });
        // Registrar histórico
        await prisma.portalHistorico.create({
            data: {
                impostoId: imposto.id,
                usuarioId: validatedData.createdBy,
                acao: 'CRIACAO',
                descricao: 'Registro de imposto criado no sistema.',
            },
        });
        return imposto;
    }
    async findAll(companyId, filters = {}) {
        const where = { companyId };
        if (filters.competencia)
            where.competencia = filters.competencia;
        if (filters.tipoImposto)
            where.tipoImposto = filters.tipoImposto;
        if (filters.status)
            where.status = filters.status;
        return prisma.portalImposto.findMany({
            where,
            include: {
                anexos: true,
            },
            orderBy: {
                vencimento: 'asc',
            },
        });
    }
    async findById(id, companyId) {
        const imposto = await prisma.portalImposto.findFirst({
            where: { id, companyId },
            include: {
                anexos: true,
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
            throw new Error('Imposto não encontrado');
        return imposto;
    }
    async updateStatus(id, companyId, userId, data) {
        const { status } = updateImpostoStatusSchema.parse(data);
        const impostoExistente = await prisma.portalImposto.findFirst({ where: { id, companyId } });
        if (!impostoExistente)
            throw new Error('Imposto não encontrado');
        const updateData = { status };
        if (status === 'Pago') {
            updateData.pagamento = new Date();
        }
        const imposto = await prisma.portalImposto.update({
            where: { id },
            data: updateData,
        });
        // Registrar histórico
        await prisma.portalHistorico.create({
            data: {
                impostoId: imposto.id,
                usuarioId: userId,
                acao: 'MUDANCA_STATUS',
                descricao: `Status alterado de ${impostoExistente.status} para ${status}.`,
            },
        });
        return imposto;
    }
    async uploadAnexo(impostoId, companyId, userId, file) {
        const imposto = await prisma.portalImposto.findFirst({ where: { id: impostoId, companyId } });
        if (!imposto)
            throw new Error('Imposto não encontrado');
        const hash = crypto_1.default.createHash('sha256').update(file.buffer).digest('hex');
        const uploadResult = await s3_service_1.S3Service.uploadImpostoFile(file.buffer, file.originalname, file.mimetype, imposto.id, imposto.competencia);
        const anexo = await prisma.portalImpostoAnexo.create({
            data: {
                impostoId: imposto.id,
                nome: file.originalname,
                arquivo: uploadResult.key,
                tipo: file.mimetype,
                tamanho: uploadResult.size,
                hash,
                uploadedBy: userId,
            }
        });
        await prisma.portalHistorico.create({
            data: {
                impostoId: imposto.id,
                usuarioId: userId,
                acao: 'UPLOAD_ANEXO',
                descricao: `Anexo ${file.originalname} adicionado.`,
            }
        });
        return anexo;
    }
}
exports.PortalImpostoService = PortalImpostoService;
