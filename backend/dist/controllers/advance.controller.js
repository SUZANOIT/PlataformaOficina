"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvanceController = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const createAdvanceSchema = zod_1.z.object({
    valor: zod_1.z.number().positive(),
    formaPagamento: zod_1.z.string(),
    observacoes: zod_1.z.string().optional().nullable(),
    data: zod_1.z.string().optional().nullable(),
    oficinaId: zod_1.z.string().optional().nullable(),
});
exports.AdvanceController = {
    async listAdvances(req, res) {
        try {
            const collaboratorId = req.params.id;
            const companyId = req.companyId || null;
            // Verify collaborator exists and belongs to the company
            const collaborator = await prisma_1.prisma.collaborator.findFirst({
                where: { id: collaboratorId, companyId }
            });
            if (!collaborator) {
                return res.status(404).json({ error: 'Colaborador não encontrado' });
            }
            const advances = await prisma_1.prisma.salaryAdvance.findMany({
                where: { collaboratorId },
                include: {
                    pdfs: {
                        orderBy: { generatedAt: 'desc' }
                    },
                    payable: true,
                    oficina: true
                },
                orderBy: { data: 'desc' }
            });
            return res.json(advances);
        }
        catch (error) {
            console.error('Error listing advances:', error);
            return res.status(500).json({ error: 'Erro ao listar adiantamentos' });
        }
    },
    async createAdvance(req, res) {
        try {
            const collaboratorId = req.params.id;
            const companyId = req.companyId || null;
            const dataParsed = createAdvanceSchema.parse(req.body);
            // Verify collaborator exists and belongs to the company
            const collaborator = await prisma_1.prisma.collaborator.findFirst({
                where: { id: collaboratorId, companyId }
            });
            if (!collaborator) {
                return res.status(404).json({ error: 'Colaborador não encontrado' });
            }
            // Fetch logged-in user name
            const userId = req.userId;
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: userId }
            });
            const responsavel = user?.name || 'Sistema';
            if (!companyId) {
                return res.status(400).json({ error: 'Nenhuma empresa vinculada ao colaborador ou usuário' });
            }
            // Unique receipt ID ADV-YYYYMMDD-[4-char-random]
            const todayStr = new Date().toISOString().substring(0, 10).replace(/-/g, '');
            const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
            const numeroComprovante = `ADV-${todayStr}-${randomHex}`;
            const advanceDate = dataParsed.data ? new Date(dataParsed.data) : new Date();
            // 1. Auto-create Corresponding FinancialPayable (Contas a Pagar)
            const payable = await prisma_1.prisma.financialPayable.create({
                data: {
                    companyId,
                    fornecedor: collaborator.nome,
                    categoria: 'Adiantamento Salarial',
                    centroCusto: 'Pessoal',
                    descricao: `Adiantamento Salarial - ${collaborator.nome} (${numeroComprovante})`,
                    valor: dataParsed.valor,
                    dataEmissao: advanceDate,
                    vencimento: advanceDate,
                    dataPagamento: advanceDate,
                    formaPagamento: dataParsed.formaPagamento,
                    responsavel: responsavel,
                    status: 'PAGA', // Automatically Paid
                    observacoes: dataParsed.observacoes || 'Lançamento automático de adiantamento salarial',
                    responsavel_lancamento_id: userId || null,
                    responsavel_lancamento_nome: responsavel,
                    data_criacao: new Date()
                }
            });
            // Write audit log for the auto-created payable
            const auditChanges = [
                `Data/Hora: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
                `Usuário: ${responsavel}`,
                `Operação: Criação de Conta a Pagar (Adiantamento)`,
                `Origem: Adiantamento Salarial (${numeroComprovante})`,
                `Valor: R$ ${dataParsed.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ].join('\n');
            await prisma_1.prisma.financialAudit.create({
                data: {
                    payableId: payable.id,
                    action: 'CREATE',
                    newStatus: 'PAGA',
                    user: responsavel,
                    changes: auditChanges
                }
            });
            // Verify if the provided oficinaId is a valid Oficina record belonging to the company
            let targetOficinaId = null;
            if (dataParsed.oficinaId) {
                const oficinaExists = await prisma_1.prisma.oficina.findFirst({
                    where: { id: dataParsed.oficinaId, companyId }
                });
                if (oficinaExists) {
                    targetOficinaId = dataParsed.oficinaId;
                }
            }
            // If the provided one is not a valid Oficina, fall back to the collaborator's associated oficinaId (if valid)
            if (!targetOficinaId && collaborator.oficinaId) {
                const oficinaExists = await prisma_1.prisma.oficina.findFirst({
                    where: { id: collaborator.oficinaId, companyId }
                });
                if (oficinaExists) {
                    targetOficinaId = collaborator.oficinaId;
                }
            }
            // 2. Create SalaryAdvance
            const advance = await prisma_1.prisma.salaryAdvance.create({
                data: {
                    collaboratorId,
                    valor: dataParsed.valor,
                    formaPagamento: dataParsed.formaPagamento,
                    status: 'PENDENTE',
                    data: advanceDate,
                    responsavel: responsavel,
                    observacoes: dataParsed.observacoes || null,
                    numeroComprovante,
                    payableId: payable.id,
                    oficinaId: targetOficinaId
                },
                include: {
                    pdfs: true,
                    payable: true,
                    oficina: true
                }
            });
            return res.status(201).json(advance);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error('Error creating advance:', error);
            return res.status(500).json({ error: 'Erro ao cadastrar adiantamento' });
        }
    },
    async updateAdvanceStatus(req, res) {
        try {
            const advanceId = req.params.advanceId;
            const companyId = req.companyId || null;
            const { status } = req.body;
            if (!status || !['PENDENTE', 'DESCONTADO_EM_FOLHA'].includes(status)) {
                return res.status(400).json({ error: 'Status inválido. Use PENDENTE ou DESCONTADO_EM_FOLHA' });
            }
            const advance = await prisma_1.prisma.salaryAdvance.findUnique({
                where: { id: advanceId },
                include: { collaborator: true }
            });
            if (!advance || advance.collaborator.companyId !== companyId) {
                return res.status(404).json({ error: 'Adiantamento não encontrado' });
            }
            const updated = await prisma_1.prisma.salaryAdvance.update({
                where: { id: advanceId },
                data: { status },
                include: {
                    pdfs: true,
                    payable: true
                }
            });
            return res.json(updated);
        }
        catch (error) {
            console.error('Error updating advance status:', error);
            return res.status(500).json({ error: 'Erro ao atualizar status do adiantamento' });
        }
    },
    async deleteAdvance(req, res) {
        try {
            const advanceId = req.params.advanceId;
            const companyId = req.companyId || null;
            const advance = await prisma_1.prisma.salaryAdvance.findUnique({
                where: { id: advanceId },
                include: { collaborator: true }
            });
            if (!advance || advance.collaborator.companyId !== companyId) {
                return res.status(404).json({ error: 'Adiantamento não encontrado' });
            }
            // Delete the advance (associated payable is kept but unlinked or optionally deleted. Let's delete it too to keep clean records)
            if (advance.payableId) {
                try {
                    await prisma_1.prisma.financialPayable.delete({
                        where: { id: advance.payableId }
                    });
                }
                catch (e) {
                    console.warn('Linked payable not found or already deleted:', e);
                }
            }
            await prisma_1.prisma.salaryAdvance.delete({
                where: { id: advanceId }
            });
            return res.status(204).send();
        }
        catch (error) {
            console.error('Error deleting advance:', error);
            return res.status(500).json({ error: 'Erro ao excluir adiantamento' });
        }
    },
    async logPdfGeneration(req, res) {
        try {
            const advanceId = req.params.advanceId;
            const companyId = req.companyId || null;
            const { fileName } = req.body;
            if (!fileName) {
                return res.status(400).json({ error: 'Nome do arquivo é obrigatório' });
            }
            const advance = await prisma_1.prisma.salaryAdvance.findUnique({
                where: { id: advanceId },
                include: { collaborator: true }
            });
            if (!advance || advance.collaborator.companyId !== companyId) {
                return res.status(404).json({ error: 'Adiantamento não encontrado' });
            }
            const pdfLog = await prisma_1.prisma.salaryAdvancePdf.create({
                data: {
                    salaryAdvanceId: advanceId,
                    fileName
                }
            });
            return res.status(201).json(pdfLog);
        }
        catch (error) {
            console.error('Error logging PDF generation:', error);
            return res.status(500).json({ error: 'Erro ao salvar logs de comprovante' });
        }
    }
};
