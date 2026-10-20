import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { S3Service } from '../../services/s3.service';
import {
  STATUS_IMPOSTO,
  competenciasEntre,
  duplicateMotivo,
  parseVencimento,
  processBatch,
  validateBulkFile,
  validateLoteMetadata,
} from '../portalImposto.rules';

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
  status: z.enum(STATUS_IMPOSTO),
});

const updateImpostoSchema = z.object({
  competencia: z.string().regex(/^(0[1-9]|1[0-2])\/\d{4}$/, 'Competência deve estar no formato MM/AAAA'),
  tipoImposto: z.string().min(1),
  valor: z.number().nonnegative(),
  vencimento: z.string().min(1),
});

export class PortalHttpError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface ImpostoScope {
  allCompanies: boolean;
  companyId?: string;
}

const SORT_FIELDS = ['vencimento', 'valor', 'competencia', 'status', 'createdAt'] as const;

function companyWhere(scope: ImpostoScope) {
  if (scope.allCompanies) return {};
  if (!scope.companyId) throw new PortalHttpError('Company ID é obrigatório', 400);
  return { companyId: scope.companyId };
}

function mapImposto(imposto: any) {
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

    await prisma.portalAuditoria.create({
      data: {
        companyId: validatedData.companyId,
        usuarioId: validatedData.createdBy,
        acao: 'CRIAR_IMPOSTO',
        descricao: `Imposto ${validatedData.tipoImposto} da competência ${validatedData.competencia} criado.`,
      },
    });

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

  async findAll(scope: ImpostoScope, filters: any = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
    const sortBy = SORT_FIELDS.includes(filters.sortBy) ? filters.sortBy : 'vencimento';
    const sortDir = filters.sortDir === 'asc' ? 'asc' : 'desc';

    const where: any = {
      deletedAt: null,
      ...companyWhere(scope),
    };

    const competencias = competenciasEntre(filters.competenciaDe, filters.competenciaAte);
    if (competencias) where.competencia = { in: competencias };
    if (filters.tipoImposto) where.tipoImposto = String(filters.tipoImposto);
    if (filters.status) where.status = String(filters.status);

    const vencimentoDe = filters.vencimentoDe ? parseVencimento(String(filters.vencimentoDe)) : null;
    const vencimentoAte = filters.vencimentoAte ? parseVencimento(String(filters.vencimentoAte)) : null;
    if (vencimentoDe || vencimentoAte) {
      where.vencimento = {};
      if (vencimentoDe) where.vencimento.gte = new Date(vencimentoDe.setHours(0, 0, 0, 0));
      if (vencimentoAte) where.vencimento.lte = new Date(vencimentoAte.setHours(23, 59, 59, 999));
    }

    const [total, rows] = await Promise.all([
      prisma.portalImposto.count({ where }),
      prisma.portalImposto.findMany({
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

  async findById(id: string, scope: ImpostoScope) {
    const imposto = await prisma.portalImposto.findFirst({
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

    if (!imposto) throw new PortalHttpError('Imposto não encontrado', 404);
    return { ...mapImposto(imposto), anexos: imposto.anexos, comentarios: imposto.comentarios, historico: imposto.historico };
  }

  async update(id: string, userId: string, scope: ImpostoScope, data: unknown) {
    const parsed = updateImpostoSchema.parse(data);
    const metadata = validateLoteMetadata({
      competencia: parsed.competencia,
      tipoImposto: parsed.tipoImposto,
      vencimento: parsed.vencimento,
      valor: parsed.valor,
    });
    if (!metadata.ok) throw new PortalHttpError(metadata.motivo);

    const existente = await prisma.portalImposto.findFirst({
      where: { id, deletedAt: null, ...companyWhere(scope) },
    });
    if (!existente) throw new PortalHttpError('Imposto não encontrado', 404);

    const imposto = await prisma.portalImposto.update({
      where: { id },
      data: {
        competencia: metadata.competencia,
        tipoImposto: metadata.tipoImposto,
        valor: metadata.valor,
        vencimento: metadata.vencimento,
      },
    });

    await prisma.portalHistorico.create({
      data: {
        impostoId: id,
        usuarioId: userId,
        acao: 'EDICAO',
        descricao: `Metadados atualizados. Competência ${metadata.competencia}, tipo ${metadata.tipoImposto}, valor ${metadata.valor}.`,
      },
    });

    await prisma.portalAuditoria.create({
      data: {
        companyId: existente.companyId,
        usuarioId: userId,
        acao: 'EDITAR_IMPOSTO',
        descricao: `Imposto ${id} editado sem novo upload.`,
      },
    });

    return imposto;
  }

  async updateStatus(id: string, scope: ImpostoScope, userId: string, data: z.infer<typeof updateImpostoStatusSchema>) {
    const { status } = updateImpostoStatusSchema.parse(data);

    const impostoExistente = await prisma.portalImposto.findFirst({
      where: { id, deletedAt: null, ...companyWhere(scope) },
    });
    if (!impostoExistente) throw new PortalHttpError('Imposto não encontrado', 404);

    const updateData: any = { status };
    if (status === 'Pago') updateData.pagamento = new Date();

    const imposto = await prisma.portalImposto.update({
      where: { id },
      data: updateData,
    });

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

  async remove(id: string, userId: string, scope: ImpostoScope) {
    const existente = await prisma.portalImposto.findFirst({
      where: { id, deletedAt: null, ...companyWhere(scope) },
    });
    if (!existente) throw new PortalHttpError('Imposto não encontrado', 404);

    await prisma.portalImposto.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'Cancelado' },
    });

    await prisma.portalHistorico.create({
      data: {
        impostoId: id,
        usuarioId: userId,
        acao: 'EXCLUSAO',
        descricao: 'Registro excluído logicamente. O arquivo permanece associado para auditoria.',
      },
    });

    await prisma.portalAuditoria.create({
      data: {
        companyId: existente.companyId,
        usuarioId: userId,
        acao: 'EXCLUIR_IMPOSTO',
        descricao: `Imposto ${id} marcado como excluído.`,
      },
    });

    return { ok: true };
  }

  async lancarContasPagar(id: string, userId: string, scope: ImpostoScope) {
    const imposto = await prisma.portalImposto.findFirst({
      where: { id, deletedAt: null, ...companyWhere(scope) },
    });
    if (!imposto) throw new PortalHttpError('Imposto não encontrado', 404);
    if (imposto.payableId) throw new PortalHttpError('Este imposto já foi lançado em Contas a Pagar.', 409);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const responsavel = user?.name || 'Portal Contabilidade';

    return prisma.$transaction(async (tx) => {
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
      if (vinculo.count === 0) throw new PortalHttpError('Este imposto já foi lançado em Contas a Pagar.', 409);

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

  async uploadAnexo(impostoId: string, scope: ImpostoScope, userId: string, file: Express.Multer.File) {
    const validacao = validateBulkFile(file);
    if (!validacao.ok) throw new PortalHttpError(validacao.motivo);

    const imposto = await prisma.portalImposto.findFirst({
      where: { id: impostoId, deletedAt: null, ...companyWhere(scope) },
    });
    if (!imposto) throw new PortalHttpError('Imposto não encontrado', 404);

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
      },
    });

    await prisma.portalHistorico.create({
      data: {
        impostoId: imposto.id,
        usuarioId: userId,
        acao: 'UPLOAD_ANEXO',
        descricao: `Anexo ${file.originalname} adicionado.`,
      },
    });

    return anexo;
  }

  async getArquivo(id: string, scope: ImpostoScope) {
    const imposto = await prisma.portalImposto.findFirst({
      where: { id, deletedAt: null, ...companyWhere(scope) },
      include: { anexos: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!imposto) throw new PortalHttpError('Imposto não encontrado', 404);

    const anexo = imposto.anexos[0];
    if (!anexo) throw new PortalHttpError('Nenhum arquivo associado a este imposto.', 404);

    const buffer = await S3Service.getObjectBuffer(anexo.arquivo);
    return { buffer, filename: anexo.nome, mime: anexo.tipo || 'application/pdf' };
  }

  async getArquivos(ids: string[], scope: ImpostoScope) {
    const uniqueIds = [...new Set(ids)].slice(0, 30);
    const impostos = await prisma.portalImposto.findMany({
      where: { id: { in: uniqueIds }, deletedAt: null, ...companyWhere(scope) },
      include: { anexos: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    const files: Array<{ filename: string; buffer: Buffer }> = [];
    for (const imposto of impostos) {
      const anexo = imposto.anexos[0];
      if (!anexo) continue;
      const buffer = await S3Service.getObjectBuffer(anexo.arquivo);
      files.push({ filename: anexo.nome, buffer });
    }

    if (files.length === 0) throw new PortalHttpError('Nenhum arquivo disponível para download.', 404);
    return files;
  }

  async bulkUpload(
    userId: string,
    competencia: string,
    tipoImposto: string,
    vencimento: string,
    valorInformado: unknown,
    files: Express.Multer.File[],
    fallbackCompanyId?: string
  ) {
    const metadata = validateLoteMetadata({ competencia, tipoImposto, vencimento, valor: valorInformado });
    if (!metadata.ok) throw new PortalHttpError(metadata.motivo);

    return processBatch(files, async (file) => {
      const atual = file as Express.Multer.File;
      const validacao = validateBulkFile(atual);
      if (!validacao.ok) throw new Error(validacao.motivo);

      const company =
        (validacao.cnpj
          ? await prisma.company.findFirst({ where: { cnpjSemMascara: validacao.cnpj } })
          : null) ??
        (fallbackCompanyId
          ? await prisma.company.findFirst({ where: { id: fallbackCompanyId } })
          : null);
      if (!company) {
        throw new Error('Empresa não identificada para este arquivo.');
      }

      const hash = crypto.createHash('sha256').update(atual.buffer).digest('hex');
      const duplicado = await prisma.portalImpostoAnexo.findFirst({
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
      if (duplicado) throw new Error(duplicateMotivo());

      const impostoId = crypto.randomUUID();
      const uploadResult = await S3Service.uploadImpostoFile(
        atual.buffer,
        atual.originalname,
        atual.mimetype || 'application/pdf',
        impostoId,
        metadata.competencia
      );

      try {
        await prisma.$transaction(async (tx) => {
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
      } catch (error) {
        await S3Service.deleteFile(uploadResult.key).catch(() => undefined);
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
