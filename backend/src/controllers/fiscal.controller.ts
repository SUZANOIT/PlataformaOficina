import { Request, Response } from 'express';
import { ZipArchive } from 'archiver';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import {
  decodeBase64Content,
  deleteFiscalFile,
  readFiscalFile,
  saveFiscalFile
} from '../services/fiscalFile.service';

// XML details extraction helper
function parseXmlData(xmlText: string) {
  try {
    const nNFM = xmlText.match(/<nNF>(\d+)<\/nNF>/i);
    const numeroDocumento = nNFM ? nNFM[1] : `NF-${Math.floor(100000 + Math.random() * 900000)}`;

    const chNFeM = xmlText.match(/<chNFe>(\d+)<\/chNFe>/i) || xmlText.match(/Id="NFe(\d+)"/i);
    const chaveAcesso = chNFeM ? chNFeM[1] : null;

    const dhEmiM = xmlText.match(/<dhEmi>([^<]+)<\/dhEmi>/i) || xmlText.match(/<dEmi>([^<]+)<\/dEmi>/i);
    const dataEmissao = dhEmiM ? new Date(dhEmiM[1]) : new Date();

    const vNFM = xmlText.match(/<vNF>([\d.]+)<\/vNF>/i);
    const valorTotal = vNFM ? parseFloat(vNFM[1]) : 0.0;

    const emitBlock = xmlText.match(/<emit>([\s\S]*?)<\/emit>/i);
    let emitenteNome = 'Emitente MOCK S.A.';
    let emitenteCnpj = '00.000.000/0001-00';
    if (emitBlock) {
      const xNomeM = emitBlock[1].match(/<xNome>([^<]+)<\/xNome>/i);
      const cnpjM = emitBlock[1].match(/<CNPJ>([^<]+)<\/CNPJ>/i);
      if (xNomeM) emitenteNome = xNomeM[1];
      if (cnpjM) emitenteCnpj = cnpjM[1];
    }

    const destBlock = xmlText.match(/<dest>([\s\S]*?)<\/dest>/i);
    let destinatarioNome = 'Destinatário MOCK S.A.';
    let destinatarioCnpj = '00.000.000/0001-99';
    if (destBlock) {
      const xNomeM = destBlock[1].match(/<xNome>([^<]+)<\/xNome>/i);
      const cnpjM = destBlock[1].match(/<CNPJ>([^<]+)<\/CNPJ>/i);
      if (xNomeM) destinatarioNome = xNomeM[1];
      if (cnpjM) destinatarioCnpj = cnpjM[1];
    }

    return {
      numeroDocumento,
      chaveAcesso,
      dataEmissao,
      valorTotal,
      emitenteNome,
      emitenteCnpj,
      destinatarioNome,
      destinatarioCnpj
    };
  } catch (error) {
    console.error('Erro ao fazer parse do XML:', error);
    return null;
  }
}

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
        ipAddress: getClientIp(req)
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

      const { search, tipo, status, startDate, endDate } = req.query as any;

      const whereClause: any = { companyId };

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

      const documents = await prisma.fiscalDocument.findMany({
        where: whereClause,
        orderBy: { dataEmissao: 'desc' }
      });

      return res.json(documents);
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

      const createdDocs: any[] = [];

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

        let docDetails: any = {
          numeroDocumento: `NF-${Math.floor(100000 + Math.random() * 900000)}`,
          chaveAcesso: null,
          dataEmissao: new Date(),
          valorTotal: 0.0,
          emitenteNome: 'Emitente não identificado',
          emitenteCnpj: '00.000.000/0001-00',
          destinatarioNome: 'Destinatário não identificado',
          destinatarioCnpj: '00.000.000/0001-99'
        };

        let storedFileUrl = f.fileUrl || null;
        const fileBuffer = decodeBase64Content(f.fileContent);
        const xmlText = fileBuffer.toString('utf8');
        const parsed = parseXmlData(xmlText);

        if (parsed) {
          docDetails = parsed;
          docDetails.xmlContent = xmlText;
        } else {
          docDetails.xmlContent = xmlText;
        }

        const saved = await saveFiscalFile(companyId, f.fileName, fileBuffer);
        storedFileUrl = saved.fileUrl;

        const doc = await prisma.fiscalDocument.create({
          data: {
            numeroDocumento: docDetails.numeroDocumento,
            chaveAcesso: docDetails.chaveAcesso,
            tipo: 'XML',
            nomeArquivo: f.fileName,
            dataEmissao: docDetails.dataEmissao,
            valorTotal: docDetails.valorTotal,
            emitenteNome: docDetails.emitenteNome,
            emitenteCnpj: docDetails.emitenteCnpj,
            destinatarioNome: docDetails.destinatarioNome,
            destinatarioCnpj: docDetails.destinatarioCnpj,
            xmlContent: docDetails.xmlContent || null,
            fileUrl: storedFileUrl,
            companyId,
            status: 'IMPORTADO'
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

      const contentType = doc.tipo === 'PDF' ? 'application/pdf' : 'application/xml';
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

      const audits = await prisma.fiscalAudit.findMany({
        orderBy: { createdAt: 'desc' }
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
  }
};
