"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentController = void 0;
const prisma_1 = require("../lib/prisma");
const s3_service_1 = require("../services/s3.service");
const ALLOWED_MIME_TYPES = {
    'NF_PDF': ['application/pdf'],
    'NF_XML': ['text/xml', 'application/xml'],
    'COMPROVANTE_CIELO': ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'],
    'NF_PECA': ['application/pdf', 'text/xml', 'application/xml'],
    'NF_SERVICO': ['application/pdf', 'text/xml', 'application/xml'],
    'COMPROVANTE_POS': ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
};
exports.AttachmentController = {
    async upload(req, res) {
        try {
            const quoteId = req.params.id;
            const { tipo, valor } = req.body;
            const file = req.file;
            const parsedValor = valor ? parseFloat(valor.toString().replace(',', '.')) : null;
            if (!file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            }
            if (!Object.keys(ALLOWED_MIME_TYPES).includes(tipo)) {
                return res.status(400).json({ error: 'Tipo de anexo inválido.' });
            }
            const allowedMimes = ALLOWED_MIME_TYPES[tipo];
            if (!allowedMimes.includes(file.mimetype)) {
                return res.status(400).json({ error: 'Formato de arquivo não suportado para este tipo.' });
            }
            const quote = await prisma_1.prisma.quote.findUnique({
                where: { id: quoteId },
                include: { items: true }
            });
            if (!quote) {
                return res.status(404).json({ error: 'Orçamento não encontrado.' });
            }
            // Validação do Valor da NF com o Valor da OS
            if (parsedValor !== null && parsedValor !== undefined) {
                if (tipo === 'NF_PECA') {
                    const totalPecas = quote.items.filter(i => i.tipo === 'Peça').reduce((acc, i) => acc + i.valorTotal, 0);
                    if (Math.abs(totalPecas - parsedValor) > 0.1) {
                        return res.status(400).json({ error: `Valor divergente. O total de Peças na OS é R$ ${totalPecas.toFixed(2).replace('.', ',')}` });
                    }
                }
                else if (tipo === 'NF_SERVICO') {
                    const totalServicos = quote.items.filter(i => i.tipo === 'Serviço').reduce((acc, i) => acc + i.valorTotal, 0);
                    if (Math.abs(totalServicos - parsedValor) > 0.1) {
                        return res.status(400).json({ error: `Valor divergente. O total de Serviços na OS é R$ ${totalServicos.toFixed(2).replace('.', ',')}` });
                    }
                }
                else if (tipo === 'COMPROVANTE_POS') {
                    if (Math.abs(quote.total - parsedValor) > 0.1) {
                        return res.status(400).json({ error: `Valor divergente. O total da OS é R$ ${quote.total.toFixed(2).replace('.', ',')}` });
                    }
                }
            }
            const userId = req.userId || 'Sistema';
            const userName = req.userName || 'Sistema';
            const ip = req.ip || req.connection.remoteAddress || 'Desconhecido';
            // Se for comprovante Cielo ou POS, deve haver apenas um. Apagamos o antigo.
            if (tipo === 'COMPROVANTE_CIELO' || tipo === 'COMPROVANTE_POS') {
                const oldComprovante = await prisma_1.prisma.anexoNF.findFirst({
                    where: { quoteId, tipo: { in: ['COMPROVANTE_CIELO', 'COMPROVANTE_POS'] } }
                });
                if (oldComprovante) {
                    try {
                        await s3_service_1.S3Service.deleteFile(oldComprovante.arquivo);
                        await prisma_1.prisma.anexoNF.delete({ where: { id: oldComprovante.id } });
                        await prisma_1.prisma.quoteHistory.create({
                            data: {
                                quoteId,
                                companyId: quote.companyId,
                                userId,
                                userName,
                                action: 'ANEXO_EXCLUIDO',
                                description: `Comprovante Cielo antigo substituído: ${oldComprovante.nomeOriginal}. IP: ${ip}`,
                            }
                        });
                    }
                    catch (e) {
                        console.error('Erro ao substituir comprovante antigo:', e);
                    }
                }
            }
            // Faz upload para o S3
            const uploadResult = await s3_service_1.S3Service.uploadFile(file.buffer, file.originalname, file.mimetype, quote.numeroOrcamento || quote.id);
            // Salva no banco de dados
            const anexo = await prisma_1.prisma.anexoNF.create({
                data: {
                    quoteId,
                    tipo,
                    nomeOriginal: file.originalname,
                    arquivo: uploadResult.key,
                    bucket: uploadResult.bucket,
                    contentType: uploadResult.contentType,
                    tamanho: uploadResult.size,
                    valor: parsedValor,
                    etag: uploadResult.etag,
                    usuarioUpload: userName,
                }
            });
            // Registra Auditoria
            await prisma_1.prisma.quoteHistory.create({
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
        }
        catch (error) {
            console.error('Erro no upload de anexo:', error);
            return res.status(500).json({ error: error.message || 'Erro interno ao realizar upload.' });
        }
    },
    async delete(req, res) {
        try {
            const quoteId = req.params.id;
            const attachmentId = req.params.attachmentId;
            const anexo = await prisma_1.prisma.anexoNF.findUnique({
                where: { id: attachmentId, quoteId }
            });
            if (!anexo) {
                return res.status(404).json({ error: 'Anexo não encontrado.' });
            }
            // Deleta do S3
            await s3_service_1.S3Service.deleteFile(anexo.arquivo);
            // Remove do Banco
            await prisma_1.prisma.anexoNF.delete({ where: { id: attachmentId } });
            const quote = await prisma_1.prisma.quote.findUnique({ where: { id: quoteId } });
            const userId = req.userId || 'Sistema';
            const userName = req.userName || 'Sistema';
            const ip = req.ip || req.connection.remoteAddress || 'Desconhecido';
            if (quote) {
                await prisma_1.prisma.quoteHistory.create({
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
        }
        catch (error) {
            console.error('Erro ao excluir anexo:', error);
            return res.status(500).json({ error: 'Erro interno ao excluir anexo.' });
        }
    },
    async list(req, res) {
        try {
            const quoteId = req.params.id;
            const anexos = await prisma_1.prisma.anexoNF.findMany({
                where: { quoteId },
                orderBy: { createdAt: 'desc' }
            });
            const anexosComUrl = await Promise.all(anexos.map(async (anexo) => {
                let presignedUrl = '';
                try {
                    presignedUrl = await s3_service_1.S3Service.getPresignedUrl(anexo.arquivo);
                }
                catch (e) {
                    console.error(`Erro gerando pre-signed URL para ${anexo.arquivo}`, e);
                }
                return {
                    ...anexo,
                    url: presignedUrl || `${process.env.STORAGE_ENDPOINT || 'https://t3.storageapi.dev'}/${process.env.STORAGE_BUCKET || 'adaptable-room-82ltb57u7j'}/${anexo.arquivo}`
                };
            }));
            return res.json(anexosComUrl);
        }
        catch (error) {
            console.error('Erro ao listar anexos:', error);
            return res.status(500).json({ error: 'Erro interno ao listar anexos.' });
        }
    }
};
