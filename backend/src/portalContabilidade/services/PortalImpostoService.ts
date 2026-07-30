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

  async bulkUpload(
    userId: string,
    competencia: string,
    tipoImposto: string,
    vencimento: string,
    files: Express.Multer.File[]
  ) {
    const resultados = {
      sucesso: [] as any[],
      erros: [] as any[],
    };

    const regexCnpj = /\b\d{14}\b/; // Busca exatos 14 números seguidos

    for (const file of files) {
      try {
        // Tenta achar o CNPJ no nome original do arquivo
        const nomeArquivoSemMascara = file.originalname.replace(/\D/g, '');
        const match = nomeArquivoSemMascara.match(regexCnpj);

        if (!match) {
          resultados.erros.push({
            arquivo: file.originalname,
            motivo: 'CNPJ não encontrado no nome do arquivo.',
          });
          continue;
        }

        const cnpjEncontrado = match[0];

        // Busca a empresa
        const company = await prisma.company.findFirst({
          where: { cnpjSemMascara: cnpjEncontrado },
        });

        if (!company) {
          resultados.erros.push({
            arquivo: file.originalname,
            motivo: `Empresa com CNPJ ${cnpjEncontrado} não localizada no sistema.`,
          });
          continue;
        }

        // Cria o imposto para a empresa
        const imposto = await prisma.portalImposto.create({
          data: {
            companyId: company.id,
            competencia,
            tipoImposto,
            valor: 0, // Valor zerado, contabilidade pode ajustar depois se necessário
            vencimento: new Date(vencimento),
            createdBy: userId,
            status: 'Enviado',
            observacao: 'Gerado via importação em lote.',
          },
        });

        const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

        const uploadResult = await S3Service.uploadImpostoFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          imposto.id,
          imposto.competencia
        );

        await prisma.portalImpostoAnexo.create({
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
            acao: 'IMPORTACAO_LOTE',
            descricao: `Boleto importado em lote e imposto gerado.`,
          }
        });

        resultados.sucesso.push({
          arquivo: file.originalname,
          empresa: company.razaoSocial,
          impostoId: imposto.id,
        });
      } catch (error: any) {
        resultados.erros.push({
          arquivo: file.originalname,
          motivo: error.message || 'Erro inesperado.',
        });
      }
    }

    return resultados;
  }
}
