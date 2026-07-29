import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { S3Service } from '../../services/s3.service';
import crypto from 'crypto';

const prisma = new PrismaClient();

const createImpostoSchema = z.object({
  companyId: z.string().uuid(),
  competencia: z.string().regex(/^\d{2}\/\d{4}$/, 'Competência deve estar no formato MM/AAAA'),
  tipoImposto: z.string().min(1),
  valor: z.number().positive(),
  vencimento: z.string().datetime(),
  observacao: z.string().optional(),
  createdBy: z.string().uuid().optional(),
});

const updateImpostoStatusSchema = z.object({
  status: z.enum([
    'Aguardando envio',
    'Enviado',
    'Recebido',
    'Pago',
    'Em atraso',
    'Reenviado',
    'Cancelado',
  ]),
});

export class PortalImpostoService {
  async create(data: z.infer<typeof createImpostoSchema>) {
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

  async findAll(companyId: string, filters: any = {}) {
    const where: any = { companyId };

    if (filters.competencia) where.competencia = filters.competencia;
    if (filters.tipoImposto) where.tipoImposto = filters.tipoImposto;
    if (filters.status) where.status = filters.status;

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

  async findById(id: string, companyId: string) {
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

    if (!imposto) throw new Error('Imposto não encontrado');
    return imposto;
  }

  async updateStatus(id: string, companyId: string, userId: string, data: z.infer<typeof updateImpostoStatusSchema>) {
    const { status } = updateImpostoStatusSchema.parse(data);
    
    const impostoExistente = await prisma.portalImposto.findFirst({ where: { id, companyId } });
    if (!impostoExistente) throw new Error('Imposto não encontrado');

    const updateData: any = { status };
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

  async uploadAnexo(impostoId: string, companyId: string, userId: string, file: Express.Multer.File) {
    const imposto = await prisma.portalImposto.findFirst({ where: { id: impostoId, companyId } });
    if (!imposto) throw new Error('Imposto não encontrado');

    const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    const uploadResult = await S3Service.uploadImpostoFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      imposto.id,
      imposto.competencia
    );

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
