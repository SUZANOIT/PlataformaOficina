"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TowingQuoteController = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const audit_logger_1 = require("../utils/audit.logger");
const createTowingQuoteSchema = zod_1.z.object({
    clienteNome: zod_1.z.string().optional(),
    clienteEmpresa: zod_1.z.string().optional(),
    clienteTelefone: zod_1.z.string().optional(),
    clienteEmail: zod_1.z.string().optional(),
    clienteDoc: zod_1.z.string().optional(),
    origemCep: zod_1.z.string().optional(),
    origemEndereco: zod_1.z.string().optional(),
    origemNumero: zod_1.z.string().optional(),
    origemComplemento: zod_1.z.string().optional(),
    origemCidade: zod_1.z.string().optional(),
    origemEstado: zod_1.z.string().optional(),
    destinoCep: zod_1.z.string().optional(),
    destinoEndereco: zod_1.z.string().optional(),
    destinoNumero: zod_1.z.string().optional(),
    destinoComplemento: zod_1.z.string().optional(),
    destinoCidade: zod_1.z.string().optional(),
    destinoEstado: zod_1.z.string().optional(),
    distanciaKm: zod_1.z.coerce.number().optional(),
    tempoEstimadoMin: zod_1.z.coerce.number().optional(),
    veiculoPlaca: zod_1.z.string().optional(),
    veiculoMarca: zod_1.z.string().optional(),
    veiculoModelo: zod_1.z.string().optional(),
    veiculoAno: zod_1.z.string().optional(),
    veiculoCor: zod_1.z.string().optional(),
    veiculoChassi: zod_1.z.string().optional(),
    veiculoValorAproximado: zod_1.z.coerce.number().optional().nullable(),
    tipoGuincho: zod_1.z.string().optional(),
    driverId: zod_1.z.string().optional().nullable(),
    vehicleId: zod_1.z.string().optional().nullable(),
    taxaSaida: zod_1.z.coerce.number().optional().default(0),
    valorKm: zod_1.z.coerce.number().optional().default(0),
    horasParadas: zod_1.z.coerce.number().optional().default(0),
    valorHoraParada: zod_1.z.coerce.number().optional().default(0),
    pedagios: zod_1.z.coerce.number().optional().default(0),
    qtdPedagios: zod_1.z.coerce.number().optional().default(0),
    pedagiosDetalhes: zod_1.z.any().optional(),
    despesasExtras: zod_1.z.coerce.number().optional().default(0),
    descontos: zod_1.z.coerce.number().optional().default(0),
    acrescimos: zod_1.z.coerce.number().optional().default(0),
    impostos: zod_1.z.coerce.number().optional().default(0),
    valorTotal: zod_1.z.coerce.number().optional().default(0),
    observacoes: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    // Validação ANTT
    anttTipoCarga: zod_1.z.string().optional(),
    anttEixos: zod_1.z.coerce.number().optional().nullable(),
    anttComposicao: zod_1.z.boolean().optional(),
    anttAltoDesempenho: zod_1.z.boolean().optional(),
    anttRetornoVazio: zod_1.z.boolean().optional(),
    anttPisoMinimo: zod_1.z.coerce.number().optional(),
});
exports.TowingQuoteController = {
    async list(req, res) {
        try {
            const companyId = req.companyId;
            const quotes = await prisma_1.prisma.towingQuote.findMany({
                where: { companyId },
                include: {
                    driver: true,
                    vehicle: true,
                    guiaTransporte: {
                        include: {
                            audits: {
                                orderBy: { createdAt: 'desc' }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            return res.json(quotes);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async getDashboardStats(req, res) {
        try {
            const companyId = req.companyId;
            const quotes = await prisma_1.prisma.towingQuote.findMany({
                where: { companyId }
            });
            const totalQuotes = quotes.length;
            const totalRevenue = quotes.reduce((acc, q) => acc + q.valorTotal, 0);
            const ticketMedio = totalQuotes > 0 ? totalRevenue / totalQuotes : 0;
            const totalKm = quotes.reduce((acc, q) => acc + (q.distanciaKm || 0), 0);
            const closedQuotes = quotes.filter(q => q.status === 'Aprovado' || q.status === 'Concluído');
            const closedRevenue = closedQuotes.reduce((acc, q) => acc + q.valorTotal, 0);
            // ANTT Stats
            const quotesWithAntt = quotes.filter(q => q.anttPisoMinimo && q.anttPisoMinimo > 0);
            const avgAnttFloor = quotesWithAntt.length > 0 ? quotesWithAntt.reduce((acc, q) => acc + q.anttPisoMinimo, 0) / quotesWithAntt.length : 0;
            let belowAntt = 0;
            let aboveAntt = 0;
            let totalDiff = 0;
            quotesWithAntt.forEach(q => {
                const diff = q.valorTotal - q.anttPisoMinimo;
                totalDiff += diff;
                if (q.valorTotal < q.anttPisoMinimo) {
                    belowAntt++;
                }
                else {
                    aboveAntt++;
                }
            });
            const avgAnttDiff = quotesWithAntt.length > 0 ? totalDiff / quotesWithAntt.length : 0;
            return res.json({
                totalQuotes,
                totalRevenue,
                ticketMedio,
                totalKm,
                closedQuotes: closedQuotes.length,
                closedRevenue,
                anttStats: {
                    avgAnttFloor,
                    avgAnttDiff,
                    belowAntt,
                    aboveAntt
                }
            });
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async show(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId;
            const quote = await prisma_1.prisma.towingQuote.findUnique({
                where: { id },
                include: {
                    driver: true,
                    vehicle: true,
                    guiaTransporte: {
                        include: {
                            audits: {
                                orderBy: { createdAt: 'desc' }
                            }
                        }
                    }
                }
            });
            if (!quote || quote.companyId !== companyId) {
                return res.status(404).json({ error: 'Quote not found' });
            }
            return res.json(quote);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async create(req, res) {
        try {
            const companyId = req.companyId;
            const userId = req.userId;
            const data = createTowingQuoteSchema.parse(req.body);
            const company = await prisma_1.prisma.company.findUnique({
                where: { id: companyId }
            });
            const isCurio = company && ((company.razaoSocial || '').toLowerCase().includes('curio') ||
                (company.razaoSocial || '').toLowerCase().includes('curió') ||
                (company.nomeFantasia || '').toLowerCase().includes('curio') ||
                (company.nomeFantasia || '').toLowerCase().includes('curió'));
            // A sequence format: ORC-GUI-2026-XXXXXX is handled using the DB autoincrement ID
            const quote = await prisma_1.prisma.towingQuote.create({
                data: {
                    ...data,
                    status: isCurio ? 'Cobertura' : (data.status || 'Orçamento'),
                    companyId,
                    userId,
                }
            });
            // Update formatted number
            const ano = quote.createdAt.getFullYear();
            const numFormatado = `ORC-GUI-${ano}-${quote.numeroOrcamento.toString().padStart(6, '0')}`;
            const updatedQuote = await prisma_1.prisma.towingQuote.update({
                where: { id: quote.id },
                data: { numeroFormatado: numFormatado }
            });
            // Automatic GuiaTransporte Generation
            if (updatedQuote.status === 'Aprovado') {
                const guia = await prisma_1.prisma.guiaTransporte.create({
                    data: {
                        orcamentoId: updatedQuote.id,
                        clienteId: updatedQuote.clientId,
                        valorTotal: updatedQuote.valorTotal,
                        status: 'APROVADO',
                    }
                });
                const anoGuia = guia.createdAt.getFullYear();
                const numGuiaFormatado = `GT-${anoGuia}-${guia.numeroGuia.toString().padStart(6, '0')}`;
                await prisma_1.prisma.guiaTransporte.update({
                    where: { id: guia.id },
                    data: { numeroFormatado: numGuiaFormatado }
                });
                await prisma_1.prisma.guiaTransporteAudit.create({
                    data: {
                        guiaTransporteId: guia.id,
                        acao: 'APROVAÇÃO_ORÇAMENTO',
                        detalhes: `Orçamento de guincho ${numFormatado} criado e aprovado. Guia ${numGuiaFormatado} gerada automaticamente.`
                    }
                });
            }
            audit_logger_1.AuditLogger.log(userId, companyId, 'CREATE_TOWING_QUOTE', `Orçamento de guincho ${numFormatado} criado`, 'SUCCESS');
            return res.status(201).json(updatedQuote);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async update(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId;
            const userId = req.userId;
            const data = createTowingQuoteSchema.parse(req.body);
            const existingQuote = await prisma_1.prisma.towingQuote.findUnique({
                where: { id }
            });
            if (!existingQuote || existingQuote.companyId !== companyId) {
                return res.status(404).json({ error: 'Quote not found' });
            }
            const company = await prisma_1.prisma.company.findUnique({
                where: { id: companyId }
            });
            const isCurio = company && ((company.razaoSocial || '').toLowerCase().includes('curio') ||
                (company.razaoSocial || '').toLowerCase().includes('curió') ||
                (company.nomeFantasia || '').toLowerCase().includes('curio') ||
                (company.nomeFantasia || '').toLowerCase().includes('curió'));
            const updatedQuote = await prisma_1.prisma.towingQuote.update({
                where: { id },
                data: {
                    ...data,
                    status: isCurio ? 'Cobertura' : (data.status || existingQuote.status),
                }
            });
            // Automatic GuiaTransporte Generation Hook on Update
            if (updatedQuote.status === 'Aprovado') {
                const existingGuia = await prisma_1.prisma.guiaTransporte.findUnique({
                    where: { orcamentoId: updatedQuote.id }
                });
                if (!existingGuia) {
                    const guia = await prisma_1.prisma.guiaTransporte.create({
                        data: {
                            orcamentoId: updatedQuote.id,
                            clienteId: updatedQuote.clientId,
                            valorTotal: updatedQuote.valorTotal,
                            status: 'APROVADO',
                        }
                    });
                    const anoGuia = guia.createdAt.getFullYear();
                    const numGuiaFormatado = `GT-${anoGuia}-${guia.numeroGuia.toString().padStart(6, '0')}`;
                    await prisma_1.prisma.guiaTransporte.update({
                        where: { id: guia.id },
                        data: { numeroFormatado: numGuiaFormatado }
                    });
                    await prisma_1.prisma.guiaTransporteAudit.create({
                        data: {
                            guiaTransporteId: guia.id,
                            acao: 'APROVAÇÃO_ORÇAMENTO',
                            detalhes: `Orçamento de guincho ${updatedQuote.numeroFormatado} aprovado. Guia ${numGuiaFormatado} gerada automaticamente.`
                        }
                    });
                }
            }
            audit_logger_1.AuditLogger.log(userId, companyId, 'UPDATE_TOWING_QUOTE', `Orçamento de guincho ${existingQuote.numeroFormatado} atualizado`, 'SUCCESS');
            return res.json(updatedQuote);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async delete(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId;
            const userId = req.userId;
            const existingQuote = await prisma_1.prisma.towingQuote.findUnique({
                where: { id }
            });
            if (!existingQuote || existingQuote.companyId !== companyId) {
                return res.status(404).json({ error: 'Quote not found' });
            }
            await prisma_1.prisma.towingQuote.delete({
                where: { id }
            });
            audit_logger_1.AuditLogger.log(userId, companyId, 'DELETE_TOWING_QUOTE', `Orçamento de guincho ${existingQuote.numeroFormatado} deletado`, 'SUCCESS');
            return res.status(204).send();
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
};
