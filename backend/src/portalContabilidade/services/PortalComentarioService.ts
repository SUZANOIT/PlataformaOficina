import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createComentarioSchema = z.object({
  impostoId: z.string().uuid(),
  comentario: z.string().min(1),
  anexo: z.string().optional(),
});

export class PortalComentarioService {
  async addComentario(usuarioId: string, companyId: string, data: z.infer<typeof createComentarioSchema>) {
    const validatedData = createComentarioSchema.parse(data);

    const imposto = await prisma.portalImposto.findFirst({
      where: { id: validatedData.impostoId, companyId },
    });

    if (!imposto) throw new Error('Imposto não encontrado');

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
