"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortalComentarioService = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
const createComentarioSchema = zod_1.z.object({
    impostoId: zod_1.z.string().uuid(),
    comentario: zod_1.z.string().min(1),
    anexo: zod_1.z.string().optional(),
});
class PortalComentarioService {
    async addComentario(usuarioId, companyId, data) {
        const validatedData = createComentarioSchema.parse(data);
        const imposto = await prisma.portalImposto.findFirst({
            where: { id: validatedData.impostoId, companyId },
        });
        if (!imposto)
            throw new Error('Imposto não encontrado');
        const comentario = await prisma.portalComentario.create({
            data: {
                impostoId: validatedData.impostoId,
                usuarioId: usuarioId,
                comentario: validatedData.comentario,
                anexo: validatedData.anexo,
            },
        });
        // Registrar auditoria e historico
        await prisma.portalHistorico.create({
            data: {
                impostoId: imposto.id,
                usuarioId,
                acao: 'NOVO_COMENTARIO',
                descricao: 'Um novo comentário foi adicionado.',
            },
        });
        return comentario;
    }
}
exports.PortalComentarioService = PortalComentarioService;
