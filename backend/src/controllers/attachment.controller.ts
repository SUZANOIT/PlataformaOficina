import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { S3Service } from '../services/s3.service';

const ALLOWED_MIME_TYPES = {
  'NF_PDF': ['application/pdf'],
  'NF_XML': ['text/xml', 'application/xml'],
  'COMPROVANTE_CIELO': ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
};

export const AttachmentController = {
  async upload(req: Request, res: Response) {
    try {
      const quoteId = req.params.id as string;
      const { tipo } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      }

      if (!['NF_PDF', 'NF_XML', 'COMPROVANTE_CIELO'].includes(tipo)) {
        return res.status(400).json({ error: 'Tipo de anexo inválido.' });
      }

      const allowedMimes = ALLOWED_MIME_TYPES[tipo as keyof typeof ALLOWED_MIME_TYPES];
      if (!allowedMimes.includes(file.mimetype)) {
        return res.status(400).json({ error: 'Formato de arquivo não suportado para este tipo.' });
      }

      const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
      if (!quote) {
        return res.status(404).json({ error: 'Orçamento não encontrado.' });
      }

      const userId = (req as any).userId || 'Sistema';
      const userName = (req as any).userName || 'Sistema';
      const ip = req.ip || req.connection.remoteAddress || 'Desconhecido';

      // Se for comprovante Cielo, deve haver apenas um. Apagamos o antigo.
      if (tipo === 'COMPROVANTE_CIELO') {
        const oldComprovante = await prisma.anexoNF.findFirst({
          where: { quoteId, tipo: 'COMPROVANTE_CIELO' }
        });

        if (oldComprovante) {
          try {
            await S3Service.deleteFile(oldComprovante.arquivo);
            await prisma.anexoNF.delete({ where: { id: oldComprovante.id } });
            
            await prisma.quoteHistory.create({
              data: {
                quoteId,
                companyId: quote.companyId,
                userId,
                userName,
                action: 'ANEXO_EXCLUIDO',
                description: `Comprovante Cielo antigo substituído: ${oldComprovante.nomeOriginal}. IP: ${ip}`,
              }
            });
          } catch (e) {
            console.error('Erro ao substituir comprovante antigo:', e);
          }
        }
      }

      // Faz upload para o S3
      const uploadResult = await S3Service.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        quote.numeroOrcamento || quote.id
      );

      // Salva no banco de dados
      const anexo = await prisma.anexoNF.create({
        data: {
          quoteId,
          tipo,
          nomeOriginal: file.originalname,
          arquivo: uploadResult.key,
          bucket: uploadResult.bucket,
          contentType: uploadResult.contentType,
          tamanho: uploadResult.size,
          usuarioUpload: userName,
        }
      });

      // Registra Auditoria
      await prisma.quoteHistory.create({
        data: {
          quoteId,
          companyId: quote.companyId,
          userId,
          userName,
          action: 'ANEXO_ADICIONADO',
          description: `Anexo ${tipo} adicionado: ${file.originalname} (${uploadResult.key}). Tamanho: ${uploadResult.size} bytes. IP: ${ip}`,
        }
      });

      return res.status(201).json(anexo);
    } catch (error: any) {
      console.error('Erro no upload de anexo:', error);
      return res.status(500).json({ error: error.message || 'Erro interno ao realizar upload.' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const quoteId = req.params.id as string;
      const attachmentId = req.params.attachmentId as string;

      const anexo = await prisma.anexoNF.findUnique({
        where: { id: attachmentId, quoteId }
      });

      if (!anexo) {
        return res.status(404).json({ error: 'Anexo não encontrado.' });
      }

      // Deleta do S3
      await S3Service.deleteFile(anexo.arquivo);

      // Remove do Banco
      await prisma.anexoNF.delete({ where: { id: attachmentId } });

      const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
      const userId = (req as any).userId || 'Sistema';
      const userName = (req as any).userName || 'Sistema';
      const ip = req.ip || req.connection.remoteAddress || 'Desconhecido';

      if (quote) {
        await prisma.quoteHistory.create({
          data: {
            quoteId,
            companyId: quote.companyId,
            userId,
            userName,
            action: 'ANEXO_EXCLUIDO',
            description: `Anexo ${anexo.tipo} excluído: ${anexo.nomeOriginal} (${anexo.arquivo}). IP: ${ip}`,
          }
        });
      }

      return res.status(204).send();
    } catch (error: any) {
      console.error('Erro ao excluir anexo:', error);
      return res.status(500).json({ error: 'Erro interno ao excluir anexo.' });
    }
  },

  async list(req: Request, res: Response) {
    try {
      const quoteId = req.params.id as string;

      const anexos = await prisma.anexoNF.findMany({
        where: { quoteId },
        orderBy: { createdAt: 'desc' }
      });

      // Vamos retornar o endpoint para download via presigned URL ou se o frontend sabe montar.
      // O S3Service poderia gerar uma Presigned URL se o bucket for privado.
      // Mas para a URL pública (storageapi), normalmente usa-se: endpoint/bucket/key
      const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT || 'https://t3.storageapi.dev';
      const STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'adaptable-room-82ltb57u7j';

      const anexosComUrl = anexos.map(anexo => ({
        ...anexo,
        url: `${STORAGE_ENDPOINT}/${STORAGE_BUCKET}/${anexo.arquivo}`
      }));

      return res.json(anexosComUrl);
    } catch (error: any) {
      console.error('Erro ao listar anexos:', error);
      return res.status(500).json({ error: 'Erro interno ao listar anexos.' });
    }
  }
};
