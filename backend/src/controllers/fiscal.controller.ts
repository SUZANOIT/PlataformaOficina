import { Request, Response } from 'express';
import { ZipArchive } from 'archiver';
import { prisma, basePrisma } from '../lib/prisma';
import { z } from 'zod';
import {
  decodeBase64Content,
  deleteFiscalFile,
  readFiscalFile,
  saveFiscalFile
} from '../services/fiscalFile.service';
import { parseFiscalXml } from '../services/fiscalXmlParser.service';
import {
  buildAccountingXmlEntries,
  documentsToCsvRows,
  fetchUnifiedDocuments,
  getAccountingSummary,
  getAvailableYears,
  getFiscalDashboard,
  getMonthDetails,
  searchClients,
  searchSuppliers
} from '../services/fiscalDashboard.service';
import { parseFiscalFilters } from '../utils/fiscalFilters.util';
import * as XLSX from 'xlsx';

// IP extraction helper
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0];
    return ip.trim();
  }
  return req.socket.remoteAddress || req.ip || '127.0.0.1';
}

// Log writer helper
async function writeFiscalAudit(req: Request, user: any, action: string, details: string) {
  try {
    const profiles: string[] = [];
    if (user.roleAdmin) profiles.push('ADMINISTRADOR');
    if (user.roleContabilidade) profiles.push('CONTABILIDADE');
    if (user.roleContasPagar) profiles.push('CONTAS_A_PAGAR');
    if (user.roleContasReceber) profiles.push('CONTAS_A_RECEBER');
    if (user.roleOrcamentista) profiles.push('ORCAMENTISTA');
    if (profiles.length === 0) profiles.push(user.role || 'USER');

    await prisma.fiscalAudit.create({
      data: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userProfile: profiles.join(', '),
        action,
        details,
        ipAddress: getClientIp(req),
        companyId: (req as any).companyId || null
      }
    });
  } catch (err) {
    console.error('Falha ao escrever log de auditoria fiscal:', err);
  }
}

const updateDocSchema = z.object({
  numeroDocumento: z.string().optional(),
  emitenteNome: z.string().optional(),
  emitenteCnpj: z.string().optional(),
  destinatarioNome: z.string().optional(),
  destinatarioCnpj: z.string().optional(),
  valorTotal: z.number().optional(),
  status: z.string().optional()
});

async function findDuplicateFiscalNote(companyId: string, chaveAcesso: string) {
  const [existingFiscal, existingNfe] = await Promise.all([
    basePrisma.fiscalDocument.findFirst({
      where: { companyId, chaveAcesso },
      select: { id: true, numeroDocumento: true, nomeArquivo: true }
    }),
    basePrisma.nfeImport.findUnique({
      where: { chaveAcesso },
      select: { id: true, numeroNf: true }
    })
  ]);

  if (existingFiscal) {
    return {
      source: 'FiscalDocument' as const,
      numero: existingFiscal.numeroDocumento,
      fileName: existingFiscal.nomeArquivo
    };
  }

  if (existingNfe) {
    return {
      source: 'NfeImport' as const,
      numero: existingNfe.numeroNf,
      fileName: null
    };
  }

  return null;
}

export const FiscalController = {
  // Verify access helper inside endpoints
  async verifyUserAccess(req: Request) {
    const id = (req as any).userId;
    if (!id) return null;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    if (!user.roleAdmin && !user.roleContabilidade) return null;
    return user;
  },

  async listDocuments(req: Request, res: Response) {
    try {
      const user = await FiscalController.verifyUserAccess(req);
      if (!user) {
        return res.status(403).json({ error: 'Acesso negado. Perfil não autorizado.' });
      }

      const companyId = (req as any).companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Identificador da empresa não encontrado.' });
      }

      const { search, tipo, status, startDate, endDate, page, pageSize } = req.query as any;

      const whereClause: any = { companyId, tipo: 'XML' };

      if (tipo) {
        whereClause.tipo = tipo;
      }
      if (status) {
        whereClause.status = status;
      }

      if (startDate || endDate) {
        whereClause.dataEmissao = {};
        if (startDate) {
          whereClause.dataEmissao.gte = new Date(startDate);
        }
        if (endDate) {
          whereClause.dataEmissao.lte = new Date(endDate);
        }
      }

      if (search) {
        whereClause.OR = [
          { numeroDocumento: { contains: search, mode: 'insensitive' } },
          { emitenteNome: { contains: search, mode: 'insensitive' } },
          { destinatarioNome: { contains: search, mode: 'insensitive' } },
          { chaveAcesso: { contains: search, mode: 'insensitive' } }
        ];
      }

      const currentPage = Math.max(parseInt(page || '1', 10), 1);
      const limit = Math.min(Math.max(parseInt(pageSize || '20', 10), 1), 100);
      const skip = (currentPage - 1) * limit;

      const [documents, total] = await Promise.all([
        prisma.fiscalDocument.findMany({
          where: whereClause,
          orderBy: { dataEmissao: 'desc' },
          skip,
          take: limit
        }),
        prisma.fiscalDocument.count({ where: whereClause })
      ]);

      return res.json({
        data: documents,
        pagination: {
          page: currentPage,
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error listing fiscal documents:', error);
      return res.status(500).json({ error: 'Erro ao carregar documentos fiscais.' });
    }
  },

  async uploadDocuments(req: Request, res: Response) {
    try {
      const user = await FiscalController.verifyUserAccess(req);
      if (!user) {
        return res.status(403).json({ error: 'Acesso negado. Perfil não autorizado.' });
      }

      const companyId = (req as any).companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Identificador da empresa não encontrado.' });
      }

      const { files, isZip, batchName } = req.body as { 
        files: Array<{ fileName: string; fileType: string; fileContent: string; fileUrl?: string }>;
        isZip?: boolean;
        batchName?: string;
      };

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      }

      const company = await basePrisma.company.findUnique({
        where: { id: companyId },
        select: { cnpj: true, cnpjSemMascara: true }
      });
      const companyCnpj = company?.cnpjSemMascara || company?.cnpj || '';

      const parsedFiles: Array<{
        file: typeof files[number];
        fileBuffer: Buffer;
        xmlText: string;
        docDetails: NonNullable<ReturnType<typeof parseFiscalXml>> & { xmlContent?: string };
      }> = [];

      const chavesNoLote = new Set<string>();

      for (const f of files) {
        const isXml = f.fileName.toLowerCase().endsWith('.xml')
          || f.fileType === 'text/xml'
          || f.fileType === 'application/xml';

        if (!isXml) {
          return res.status(400).json({
            error: `Arquivo "${f.fileName}" não é XML. Apenas XML de NF-e é permitido.`
          });
        }

        if (!f.fileContent) {
          return res.status(400).json({ error: `Conteúdo do arquivo "${f.fileName}" não enviado.` });
        }

        const fileBuffer = decodeBase64Content(f.fileContent);
        const xmlText = fileBuffer.toString('utf8');
        const parsed = parseFiscalXml(xmlText, companyCnpj);

        const docDetails = parsed
          ? { ...parsed, xmlContent: xmlText }
          : {
              numeroDocumento: `NF-${Math.floor(100000 + Math.random() * 900000)}`,
              numeroNota: '',
              serie: null,
              chaveAcesso: null,
              dataEmissao: new Date(),
              valorTotal: 0,
              valorBruto: 0,
              valorLiquido: 0,
              valorImpostos: 0,
              icms: 0, ipi: 0, pis: 0, cofins: 0, iss: 0, irpj: 0, csll: 0,
              emitenteNome: 'Emitente não identificado',
              emitenteCnpj: '00.000.000/0001-00',
              destinatarioNome: 'Destinatário não identificado',
              destinatarioCnpj: '00.000.000/0001-99',
              clienteNome: null,
              fornecedorNome: null,
              tipoDocumento: 'ENTRADA' as const,
              fluxoFinanceiro: 'ENTRADA' as const,
              status: 'EMITIDA',
              xmlContent: xmlText
            };

        if (docDetails.chaveAcesso) {
          if (chavesNoLote.has(docDetails.chaveAcesso)) {
            return res.status(409).json({
              error: `O arquivo "${f.fileName}" contém uma NF-e duplicada no lote enviado.`,
              code: 'DUPLICATE_KEY',
              chaveAcesso: docDetails.chaveAcesso,
              fileName: f.fileName
            });
          }

          const duplicate = await findDuplicateFiscalNote(companyId, docDetails.chaveAcesso);
          if (duplicate) {
            return res.status(409).json({
              error: `A NF-e do arquivo "${f.fileName}" já foi importada anteriormente (NF ${duplicate.numero}).`,
              code: 'DUPLICATE_KEY',
              chaveAcesso: docDetails.chaveAcesso,
              fileName: f.fileName,
              duplicateSource: duplicate.source
            });
          }

          chavesNoLote.add(docDetails.chaveAcesso);
        }

        parsedFiles.push({ file: f, fileBuffer, xmlText, docDetails });
      }

      const createdDocs: any[] = [];

      for (const { file: f, fileBuffer, xmlText, docDetails } of parsedFiles) {
        const saved = await saveFiscalFile(companyId, f.fileName, fileBuffer);
        const storedFileUrl = saved.fileUrl;

        const doc = await prisma.fiscalDocument.create({
          data: {
            numeroDocumento: docDetails.numeroDocumento,
            numeroNota: docDetails.numeroNota || docDetails.numeroDocumento,
            serie: docDetails.serie,
            chaveAcesso: docDetails.chaveAcesso,
            tipo: 'XML',
            tipoDocumento: docDetails.tipoDocumento,
            nomeArquivo: f.fileName,
            dataEmissao: docDetails.dataEmissao,
            valorTotal: docDetails.valorTotal,
            valorBruto: docDetails.valorBruto,
            valorLiquido: docDetails.valorLiquido,
            valorImpostos: docDetails.valorImpostos,
            icms: docDetails.icms,
            ipi: docDetails.ipi,
            pis: docDetails.pis,
            cofins: docDetails.cofins,
            iss: docDetails.iss,
            irpj: docDetails.irpj,
            csll: docDetails.csll,
            emitenteNome: docDetails.emitenteNome,
            emitenteCnpj: docDetails.emitenteCnpj,
            destinatarioNome: docDetails.destinatarioNome,
            destinatarioCnpj: docDetails.destinatarioCnpj,
            clienteNome: docDetails.clienteNome,
            fornecedorNome: docDetails.fornecedorNome,
            origemNota: isZip ? 'XML_IMPORTADO' : 'UPLOAD_MANUAL',
            usuarioResponsavelId: user.id,
            usuarioResponsavelNome: user.name,
            xmlContent: docDetails.xmlContent || xmlText,
            fileUrl: storedFileUrl,
            companyId,
            status: docDetails.status || 'EMITIDA'
          }
        });

        createdDocs.push(doc);
      }

      // Log audit
      let auditAction = 'UPLOAD_INDIVIDUAL';
      let auditDetails = `Uploaded file: ${files[0].fileName}`;

      if (isZip) {
        auditAction = 'IMPORTACAO_ZIP';
        auditDetails = `Imported ZIP containing ${files.length} documents. Batch name: ${batchName || 'unnamed'}`;
      } else if (files.length > 1) {
        auditAction = 'UPLOAD_EM_LOTE';
        auditDetails = `Batch uploaded ${files.length} documents. Batch name: ${batchName || 'unnamed'}`;
      } else {
        auditAction = 'UPLOAD_XML';
      }

      await writeFiscalAudit(req, user, auditAction, auditDetails);

      return res.status(201).json({
        message: 'Importação realizada com sucesso.',
        documents: createdDocs
      });
    } catch (error) {
      console.error('Error uploading fiscal documents:', error);
      return res.status(500).json({ error: 'Erro ao fazer upload dos documentos.' });
    }
  },

  async updateDocument(req: Request, res: Response) {
    try {
      const user = await FiscalController.verifyUserAccess(req);
      if (!user) {
        return res.status(403).json({ error: 'Acesso negado. Perfil não autorizado.' });
      }

      // Check restrictions for Contabilidade
      if (user.roleContabilidade && !user.roleAdmin) {
        return res.status(403).json({ 
          error: 'Acesso negado. Perfil de Contabilidade não possui permissão para alterar documentos já importados.' 
        });
      }

      const id = req.params.id as string;
      const body = updateDocSchema.parse(req.body);

      const existingDoc = await prisma.fiscalDocument.findUnique({
        where: { id }
      });

      if (!existingDoc) {
        return res.status(404).json({ error: 'Documento fiscal não encontrado.' });
      }

      // Restrição: Não pode alterar informações fiscais extraídas do XML se for XML
      if (existingDoc.tipo === 'XML') {
        // Se tentar alterar emitente, destinatario, valor ou numero
        const hasFiscalChanges = 
          (body.numeroDocumento !== undefined && body.numeroDocumento !== existingDoc.numeroDocumento) ||
          (body.emitenteNome !== undefined && body.emitenteNome !== existingDoc.emitenteNome) ||
          (body.emitenteCnpj !== undefined && body.emitenteCnpj !== existingDoc.emitenteCnpj) ||
          (body.destinatarioNome !== undefined && body.destinatarioNome !== existingDoc.destinatarioNome) ||
          (body.destinatarioCnpj !== undefined && body.destinatarioCnpj !== existingDoc.destinatarioCnpj) ||
          (body.valorTotal !== undefined && body.valorTotal !== existingDoc.valorTotal);

        if (hasFiscalChanges) {
          // Note: Even for Admin, let's keep the integrity check or allow it but log it.
          // Wait, the restriction specifically applies to "Contabilidade": "Não pode alterar informações fiscais extraídas do XML."
          // Admin can change but let's audit it. If a user is Contabilidade, they are blocked (already checked above).
        }
      }

      const updated = await prisma.fiscalDocument.update({
        where: { id },
        data: body
      });

      await writeFiscalAudit(
        req, 
        user, 
        'ALTERACAO_INFORMACOES', 
        `Updated document ID ${id} (${updated.numeroDocumento}). Changes: ${JSON.stringify(body)}`
      );

      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      console.error('Error updating fiscal document:', error);
      return res.status(500).json({ error: 'Erro ao atualizar documento.' });
    }
  },

  async deleteDocument(req: Request, res: Response) {
    try {
      const user = await FiscalController.verifyUserAccess(req);
      if (!user) {
        return res.status(403).json({ error: 'Acesso negado. Perfil não autorizado.' });
      }

      // Restrição para Contabilidade
      if (user.roleContabilidade && !user.roleAdmin) {
        return res.status(403).json({ 
          error: 'Acesso negado. Perfil de Contabilidade não possui permissão para excluir documentos.' 
        });
      }

      const id = req.params.id as string;
      const doc = await prisma.fiscalDocument.findUnique({ where: { id } });

      if (!doc) {
        return res.status(404).json({ error: 'Documento não encontrado.' });
      }

      await prisma.fiscalDocument.delete({
        where: { id }
      });

      await deleteFiscalFile(doc.fileUrl);

      await writeFiscalAudit(
        req, 
        user, 
        'EXCLUSAO_DOCUMENTOS', 
        `Deleted document ID ${id} (${doc.numeroDocumento}, File: ${doc.nomeArquivo})`
      );

      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting fiscal document:', error);
      return res.status(500).json({ error: 'Erro ao excluir documento.' });
    }
  },

  async downloadIndividual(req: Request, res: Response) {
    try {
      const user = await FiscalController.verifyUserAccess(req);
      if (!user) {
        return res.status(403).json({ error: 'Acesso negado. Perfil não autorizado.' });
      }

      const id = req.params.id as string;
      const doc = await prisma.fiscalDocument.findUnique({ where: { id } });

      if (!doc) {
        return res.status(404).json({ error: 'Documento não encontrado.' });
      }

      await writeFiscalAudit(
        req,
        user,
        'DOWNLOAD_INDIVIDUAL',
        `Downloaded individual file: ${doc.nomeArquivo} (Doc: ${doc.numeroDocumento})`
      );

      let fileBuffer = doc.fileUrl ? await readFiscalFile(doc.fileUrl) : null;

      if (!fileBuffer && doc.xmlContent) {
        fileBuffer = Buffer.from(doc.xmlContent, 'utf8');
      }

      if (!fileBuffer) {
        return res.status(404).json({ error: 'Arquivo do documento não encontrado.' });
      }

      const contentType = 'application/xml';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${doc.nomeArquivo}"`);
      return res.send(fileBuffer);
    } catch (error) {
      console.error('Error in individual download:', error);
      return res.status(500).json({ error: 'Erro ao processar download do documento.' });
    }
  },

  async downloadBatch(req: Request, res: Response) {
    try {
      const user = await FiscalController.verifyUserAccess(req);
      if (!user) {
        return res.status(403).json({ error: 'Acesso negado. Perfil não autorizado.' });
      }

      const { ids } = req.body as { ids: string[] };
      if (!ids || ids.length === 0) {
        return res.status(400).json({ error: 'Nenhum ID fornecido.' });
      }

      const docs = await prisma.fiscalDocument.findMany({
        where: { id: { in: ids } }
      });

      await writeFiscalAudit(
        req,
        user,
        'DOWNLOAD_EM_LOTE',
        `Batch downloaded ${docs.length} files. Documents: ${docs.map(d => d.numeroDocumento).join(', ')}`
      );

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="exportacao-lote-fiscal-${Date.now()}.zip"`);

      const archive = new ZipArchive({ zlib: { level: 9 } });
      archive.on('error', (err: Error) => {
        console.error('Erro ao gerar ZIP fiscal:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Erro ao gerar arquivo ZIP.' });
        }
      });

      archive.pipe(res);

      for (const doc of docs) {
        let fileBuffer = doc.fileUrl ? await readFiscalFile(doc.fileUrl) : null;
        if (!fileBuffer && doc.xmlContent) {
          fileBuffer = Buffer.from(doc.xmlContent, 'utf8');
        }
        if (fileBuffer) {
          archive.append(fileBuffer, { name: doc.nomeArquivo });
        }
      }

      await archive.finalize();
      return;
    } catch (error) {
      console.error('Error in batch download:', error);
      return res.status(500).json({ error: 'Erro ao processar download em lote.' });
    }
  },

  async listAudits(req: Request, res: Response) {
    try {
      const user = await FiscalController.verifyUserAccess(req);
      if (!user) {
        return res.status(403).json({ error: 'Acesso negado. Perfil não autorizado.' });
      }

      const companyId = (req as any).companyId;
      const audits = await basePrisma.fiscalAudit.findMany({
        where: companyId ? { companyId } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 200
      });

      return res.json(audits);
    } catch (error) {
      console.error('Error listing audits:', error);
      return res.status(500).json({ error: 'Erro ao carregar histórico de auditoria.' });
    }
  },

  async getDashboard(req: Request, res: Response) {
    try {
      const user = await FiscalController.verifyUserAccess(req);
      if (!user) {
        return res.status(403).json({ error: 'Acesso negado. Perfil não autorizado.' });
      }

      const companyId = (req as any).companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Identificador da empresa não encontrado.' });
      }

      // Gather stats for the dashboard
      const xmlCount = await prisma.fiscalDocument.count({
        where: { companyId, tipo: 'XML' }
      });

      const documentCount = await prisma.fiscalDocument.count({
        where: { companyId }
      });

      const totalValueRes = await prisma.fiscalDocument.aggregate({
        where: { companyId },
        _sum: { valorTotal: true }
      });

      const totalValue = totalValueRes._sum.valorTotal || 0;

      // Status breakdown
      const statusCounts = await prisma.fiscalDocument.groupBy({
        by: ['status'],
        where: { companyId },
        _count: { _all: true }
      });

      // Calculate sample dynamic values for dashboard visualization
      // e.g. estimated taxes (say 12%)
      const estimatedTaxes = totalValue * 0.12;

      // Log viewing dashboard
      await writeFiscalAudit(req, user, 'VISUALIZAR_DASHBOARD_CONTABIL', 'Visualized accounting/fiscal dashboard metrics');

      return res.json({
        xmlCount,
        documentCount,
        totalValue,
        estimatedTaxes,
        statusCounts: statusCounts.map((s: any) => ({
          status: s.status,
          count: s._count._all
        }))
      });
    } catch (error) {
      console.error('Error in fiscal dashboard:', error);
      return res.status(500).json({ error: 'Erro ao carregar dados do painel contábil.' });
    }
  },

  async getFullDashboard(req: Request, res: Response) {
    try {
      const user = await FiscalController.verifyUserAccess(req);
      if (!user) return res.status(403).json({ error: 'Acesso negado. Perfil não autorizado.' });

      const companyId = (req as any).companyId;
      if (!companyId) return res.status(400).json({ error: 'Identificador da empresa não encontrado.' });

      const filters = parseFiscalFilters(req, companyId);
      const dashboard = await getFiscalDashboard(filters);

      await writeFiscalAudit(req, user, 'VISUALIZAR_DASHBOARD_FISCAL', `Dashboard fiscal ${filters.ano}${filters.mes ? `/${filters.mes}` : ''}`);

      return res.json(dashboard);
    } catch (error) {
      console.error('Error in full fiscal dashboard:', error);
      return res.status(500).json({ error: 'Erro ao carregar dashboard fiscal.' });
    }
  },

  async getMonthlyDetails(req: Request, res: Response) {
    try {
      const user = await FiscalController.verifyUserAccess(req);
      if (!user) return res.status(403).json({ error: 'Acesso negado.' });

      const companyId = (req as any).companyId;
      const ano = parseInt(String(req.params.ano), 10);
      const mes = parseInt(String(req.params.mes), 10);
      const filters = parseFiscalFilters(req, companyId);

      const details = await getMonthDetails(filters, ano, mes);
      return res.json(details);
    } catch (error) {
      console.error('Error loading month details:', error);
      return res.status(500).json({ error: 'Erro ao carregar detalhes do mês.' });
    }
  },

  async autocompleteClients(req: Request, res: Response) {
    try {
      const user = await FiscalController.verifyUserAccess(req);
      if (!user) return res.status(403).json({ error: 'Acesso negado.' });
      const companyId = (req as any).companyId;
      const q = String(req.query.q || '');
      if (q.length < 2) return res.json([]);
      const results = await searchClients(companyId, q);
      return res.json(results);
    } catch (error) {
      return res.status(500).json({ error: 'Erro na busca de clientes.' });
    }
  },

  async autocompleteSuppliers(req: Request, res: Response) {
    try {
      const user = await FiscalController.verifyUserAccess(req);
      if (!user) return res.status(403).json({ error: 'Acesso negado.' });
      const companyId = (req as any).companyId;
      const q = String(req.query.q || '');
      if (q.length < 2) return res.json([]);
      const results = await searchSuppliers(companyId, q);
      return res.json(results);
    } catch (error) {
      return res.status(500).json({ error: 'Erro na busca de fornecedores.' });
    }
  },

  async exportCsv(req: Request, res: Response) {
    try {
      const user = await FiscalController.verifyUserAccess(req);
      if (!user) return res.status(403).json({ error: 'Acesso negado.' });

      const companyId = (req as any).companyId;
      const filters = parseFiscalFilters(req, companyId);
      filters.page = 1;
      filters.pageSize = 100000;

      const docs = await fetchUnifiedDocuments(filters);
      const csv = documentsToCsvRows(docs);

      await writeFiscalAudit(req, user, 'EXPORTACAO_CSV', `Exportação CSV com ${docs.length} registros`);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="documentos-fiscais-${Date.now()}.csv"`);
      return res.send(csv);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      return res.status(500).json({ error: 'Erro ao exportar CSV.' });
    }
  },

  async exportExcel(req: Request, res: Response) {
    try {
      const user = await FiscalController.verifyUserAccess(req);
      if (!user) return res.status(403).json({ error: 'Acesso negado.' });

      const companyId = (req as any).companyId;
      const filters = parseFiscalFilters(req, companyId);
      const dashboard = await getFiscalDashboard({ ...filters, page: 1, pageSize: 100000 });
      const docs = await fetchUnifiedDocuments({ ...filters, page: 1, pageSize: 100000 });

      const wb = XLSX.utils.book_new();

      const resumoSheet = XLSX.utils.json_to_sheet(dashboard.resumoMensal.map((r: any) => ({
        Mês: r.mesLabel,
        'NF Entrada (Qtd)': r.entrada.qtd,
        'Valor Entrada': r.entrada.valor,
        'NF Serviço (Qtd)': r.servico.qtd,
        'Valor Serviço': r.servico.valor,
        'NF Peças (Qtd)': r.pecas.qtd,
        'Valor Peças': r.pecas.valor,
        'NF Saída (Qtd)': r.saida.qtd,
        'Valor Saída': r.saida.valor,
        Impostos: r.impostos,
        Resultado: r.resultado
      })));
      XLSX.utils.book_append_sheet(wb, resumoSheet, 'Resumo Mensal');

      const detalheSheet = XLSX.utils.json_to_sheet(docs.map(d => ({
        'Número': d.numeroNota,
        Série: d.serie,
        Tipo: d.tipoDocumento,
        Cliente: d.clienteNome,
        Fornecedor: d.fornecedorNome,
        'Data Emissão': d.dataEmissao ? new Date(d.dataEmissao).toLocaleDateString('pt-BR') : '',
        'Valor Bruto': d.valorBruto,
        'Valor Líquido': d.valorLiquido,
        Impostos: d.valorImpostos,
        Status: d.status,
        'Chave Fiscal': d.chaveAcesso,
        Origem: d.origemNota,
        Responsável: d.usuarioResponsavel
      })));
      XLSX.utils.book_append_sheet(wb, detalheSheet, 'Detalhamento');

      const impostosSheet = XLSX.utils.json_to_sheet([
        { Imposto: 'ISS', Valor: dashboard.impostosPainel.iss },
        { Imposto: 'ICMS', Valor: dashboard.impostosPainel.icms },
        { Imposto: 'IPI', Valor: dashboard.impostosPainel.ipi },
        { Imposto: 'PIS', Valor: dashboard.impostosPainel.pis },
        { Imposto: 'COFINS', Valor: dashboard.impostosPainel.cofins },
        { Imposto: 'IRPJ', Valor: dashboard.impostosPainel.irpj },
        { Imposto: 'CSLL', Valor: dashboard.impostosPainel.csll },
        { Imposto: 'Total', Valor: dashboard.impostosPainel.total }
      ]);
      XLSX.utils.book_append_sheet(wb, impostosSheet, 'Impostos');

      const indicadoresSheet = XLSX.utils.json_to_sheet([
        { Indicador: 'Ticket Médio Serviços', Valor: dashboard.indicadores.ticketMedioServicos },
        { Indicador: 'Ticket Médio Peças', Valor: dashboard.indicadores.ticketMedioPecas },
        { Indicador: 'Ticket Médio Geral', Valor: dashboard.indicadores.ticketMedioGeral },
        { Indicador: 'Margem Bruta', Valor: dashboard.indicadores.margemBruta },
        { Indicador: '% Impostos', Valor: dashboard.indicadores.percentualImpostos },
        { Indicador: 'Crescimento Mensal %', Valor: dashboard.indicadores.crescimentoMensal }
      ]);
      XLSX.utils.book_append_sheet(wb, indicadoresSheet, 'Indicadores');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      await writeFiscalAudit(req, user, 'EXPORTACAO_EXCEL', `Exportação Excel com ${docs.length} registros`);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="dashboard-fiscal-${Date.now()}.xlsx"`);
      return res.send(buffer);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      return res.status(500).json({ error: 'Erro ao exportar Excel.' });
    }
  },

  async getAccountingSummary(req: Request, res: Response) {
    try {
      const user = await FiscalController.verifyUserAccess(req);
      if (!user) return res.status(403).json({ error: 'Acesso negado.' });

      const companyId = (req as any).companyId;
      if (!companyId) return res.status(400).json({ error: 'Identificador da empresa não encontrado.' });

      const ano = parseInt(String(req.query.ano || new Date().getFullYear()), 10);
      const [summary, availableYears] = await Promise.all([
        getAccountingSummary(companyId, ano),
        getAvailableYears(companyId)
      ]);

      return res.json({ ano, summary, availableYears });
    } catch (error) {
      console.error('Error in accounting summary:', error);
      return res.status(500).json({ error: 'Erro ao carregar resumo contábil.' });
    }
  },

  async exportAccountingXmlPack(req: Request, res: Response) {
    try {
      const user = await FiscalController.verifyUserAccess(req);
      if (!user) return res.status(403).json({ error: 'Acesso negado.' });

      const companyId = (req as any).companyId;
      if (!companyId) return res.status(400).json({ error: 'Identificador da empresa não encontrado.' });

      const filters = parseFiscalFilters(req, companyId);
      const entries = await buildAccountingXmlEntries(filters);

      if (!entries.length) {
        return res.status(404).json({ error: 'Nenhum XML encontrado para os filtros selecionados.' });
      }

      const mesLabel = filters.mes ? `-${String(filters.mes).padStart(2, '0')}` : '';
      const tiposLabel = filters.tiposDocumento?.length
        ? `-${filters.tiposDocumento.join('-')}`
        : '';
      const zipName = `xmls-fiscais-${filters.ano}${mesLabel}${tiposLabel}-${Date.now()}.zip`;

      await writeFiscalAudit(
        req,
        user,
        'EXPORTACAO_XML_CONTABILIDADE',
        `Exportação XML contabilidade: ${entries.length} arquivos (${filters.ano}${mesLabel})`
      );

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

      const archive = new ZipArchive({ zlib: { level: 9 } });
      archive.on('error', (err: Error) => {
        console.error('Erro ao gerar ZIP contabilidade:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Erro ao gerar arquivo ZIP.' });
        }
      });

      archive.pipe(res);
      for (const entry of entries) {
        archive.append(entry.buffer, { name: entry.zipPath });
      }
      await archive.finalize();
      return;
    } catch (error) {
      console.error('Error exporting accounting XML pack:', error);
      return res.status(500).json({ error: 'Erro ao exportar pacote de XMLs.' });
    }
  }
};
