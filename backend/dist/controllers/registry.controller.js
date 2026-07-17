"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistryController = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const audit_logger_1 = require("../utils/audit.logger");
const clientDashboard_service_1 = require("../services/clientDashboard.service");
const clientSchema = zod_1.z.object({
    nome: zod_1.z.string(),
    empresa: zod_1.z.string().optional().nullable(),
    cnpj: zod_1.z.string().optional().nullable(),
    telefone: zod_1.z.string().optional().nullable(),
    email: zod_1.z.string().optional().nullable(),
    cidade: zod_1.z.string().optional().nullable(),
    estado: zod_1.z.string().optional().nullable(),
    logradouro: zod_1.z.string().optional().nullable(),
    numero: zod_1.z.string().optional().nullable(),
    complemento: zod_1.z.string().optional().nullable(),
    bairro: zod_1.z.string().optional().nullable(),
    cep: zod_1.z.string().optional().nullable(),
    dataSituacao: zod_1.z.string().optional().nullable(),
    atividadePrincipal: zod_1.z.string().optional().nullable(),
});
const supplierSchema = zod_1.z.object({
    razaoSocial: zod_1.z.string(),
    nomeFantasia: zod_1.z.string().optional().nullable(),
    cnpj: zod_1.z.string().optional().nullable(),
    cnpjSemMascara: zod_1.z.string().optional().nullable(),
    telefone: zod_1.z.string().optional().nullable(),
    email: zod_1.z.string().optional().nullable(),
    logradouro: zod_1.z.string().optional().nullable(),
    numero: zod_1.z.string().optional().nullable(),
    complemento: zod_1.z.string().optional().nullable(),
    bairro: zod_1.z.string().optional().nullable(),
    cep: zod_1.z.string().optional().nullable(),
    cidade: zod_1.z.string().optional().nullable(),
    estado: zod_1.z.string().optional().nullable(),
    dataSituacao: zod_1.z.string().optional().nullable(),
    atividadePrincipal: zod_1.z.string().optional().nullable(),
});
const collaboratorSchema = zod_1.z.object({
    nome: zod_1.z.string(),
    cpf: zod_1.z.string().optional().nullable(),
    telefone: zod_1.z.string().optional().nullable(),
    whatsapp: zod_1.z.string().optional().nullable(),
    email: zod_1.z.string().optional().nullable(),
    cargo: zod_1.z.string().optional().nullable(),
    departamento: zod_1.z.string().optional().nullable(),
    dataAdmissao: zod_1.z.string().optional().nullable(),
    salario: zod_1.z.number().optional().nullable(),
    cargaHoraria: zod_1.z.number().optional().nullable(),
    valorHora: zod_1.z.number().optional().nullable(),
    status: zod_1.z.string().default('ATIVO'),
    observacoes: zod_1.z.string().optional().nullable(),
    oficinaId: zod_1.z.string().optional().nullable(),
    companyId: zod_1.z.string().optional().nullable(),
});
exports.RegistryController = {
    // CLIENTS CRUD
    async listClients(req, res) {
        try {
            const { search } = req.query;
            const companyId = req.companyId || null;
            // Auto-deduplicate clients for the current company
            try {
                const allClients = await prisma_1.prisma.client.findMany({
                    where: { companyId },
                    include: { quotes: true }
                });
                const groups = {};
                for (const client of allClients) {
                    let key = '';
                    if (client.cnpj && client.cnpj.trim().replace(/\D/g, '').length === 14) {
                        key = `cnpj_${client.cnpj.trim().replace(/\D/g, '')}`;
                    }
                    else if (client.email && client.email.trim().includes('@')) {
                        key = `email_${client.email.trim().toLowerCase()}`;
                    }
                    else {
                        key = `nome_${client.nome.trim().toLowerCase()}`;
                    }
                    if (!groups[key]) {
                        groups[key] = [];
                    }
                    groups[key].push(client);
                }
                for (const [key, group] of Object.entries(groups)) {
                    if (group.length <= 1)
                        continue;
                    const survivor = group.reduce((prev, curr) => {
                        if (curr.quotes.length > prev.quotes.length)
                            return curr;
                        if (curr.quotes.length < prev.quotes.length)
                            return prev;
                        const prevScore = (prev.cnpj ? 1 : 0) + (prev.email ? 1 : 0) + (prev.telefone ? 1 : 0) + (prev.cidade ? 1 : 0);
                        const currScore = (curr.cnpj ? 1 : 0) + (curr.email ? 1 : 0) + (curr.telefone ? 1 : 0) + (curr.cidade ? 1 : 0);
                        return currScore > prevScore ? curr : prev;
                    });
                    const duplicates = group.filter(c => c.id !== survivor.id);
                    for (const duplicate of duplicates) {
                        if (duplicate.quotes.length > 0) {
                            await prisma_1.prisma.quote.updateMany({
                                where: { clientId: duplicate.id, companyId },
                                data: { clientId: survivor.id }
                            });
                        }
                        await prisma_1.prisma.client.delete({
                            where: { id: duplicate.id }
                        });
                    }
                }
            }
            catch (dedupError) {
                console.error('Error in client auto-deduplication:', dedupError);
            }
            const whereClause = { companyId };
            if (search) {
                whereClause.AND = [
                    { companyId },
                    {
                        OR: [
                            { nome: { contains: search, mode: 'insensitive' } },
                            { empresa: { contains: search, mode: 'insensitive' } },
                            { cnpj: { contains: search, mode: 'insensitive' } },
                            { email: { contains: search, mode: 'insensitive' } },
                        ]
                    }
                ];
            }
            const clients = await prisma_1.prisma.client.findMany({
                where: whereClause,
                orderBy: { nome: 'asc' },
            });
            return res.json(clients);
        }
        catch (error) {
            console.error('Error listing clients:', error);
            return res.status(500).json({ error: 'Erro ao listar clientes' });
        }
    },
    async createClient(req, res) {
        try {
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            const data = clientSchema.parse(req.body);
            if (data.cnpj) {
                const cleanedCnpj = data.cnpj.replace(/\D/g, '');
                if (cleanedCnpj) {
                    const duplicate = await prisma_1.prisma.client.findFirst({
                        where: {
                            cnpj: {
                                contains: cleanedCnpj
                            },
                            companyId
                        }
                    });
                    if (duplicate) {
                        audit_logger_1.AuditLogger.log(userId, companyId, 'CREATE_CLIENT', `Attempted duplicate client CNPJ: ${data.cnpj}`, 'DUPLICATE_ATTEMPT');
                        return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
                    }
                }
            }
            const client = await prisma_1.prisma.client.create({
                data: {
                    ...data,
                    companyId
                },
            });
            audit_logger_1.AuditLogger.log(userId, companyId, 'CREATE_CLIENT', `Created client: ${client.nome} (${client.id})`, 'SUCCESS');
            return res.status(201).json(client);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error('Error creating client:', error);
            return res.status(500).json({ error: 'Erro ao criar cliente' });
        }
    },
    async updateClient(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            const data = clientSchema.parse(req.body);
            const existing = await prisma_1.prisma.client.findFirst({
                where: { id, companyId }
            });
            if (!existing) {
                return res.status(403).json({ error: 'Acesso negado para este cliente.' });
            }
            if (data.cnpj) {
                const cleanedCnpj = data.cnpj.replace(/\D/g, '');
                if (cleanedCnpj) {
                    const duplicate = await prisma_1.prisma.client.findFirst({
                        where: {
                            cnpj: {
                                contains: cleanedCnpj
                            },
                            id: { not: id },
                            companyId
                        }
                    });
                    if (duplicate) {
                        audit_logger_1.AuditLogger.log(userId, companyId, 'UPDATE_CLIENT', `Attempted duplicate client CNPJ update: ${data.cnpj}`, 'DUPLICATE_ATTEMPT');
                        return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
                    }
                }
            }
            const client = await prisma_1.prisma.client.update({
                where: { id },
                data: {
                    ...data,
                    companyId
                },
            });
            audit_logger_1.AuditLogger.log(userId, companyId, 'UPDATE_CLIENT', `Updated client: ${client.nome} (${client.id})`, 'SUCCESS');
            return res.json(client);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error('Error updating client:', error);
            return res.status(500).json({ error: 'Erro ao atualizar cliente' });
        }
    },
    async deleteClient(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId || null;
            const existing = await prisma_1.prisma.client.findFirst({
                where: { id, companyId }
            });
            if (!existing) {
                return res.status(403).json({ error: 'Acesso negado para este cliente.' });
            }
            await prisma_1.prisma.client.delete({
                where: { id },
            });
            return res.status(204).send();
        }
        catch (error) {
            console.error('Error deleting client:', error);
            return res.status(500).json({ error: 'Erro ao excluir cliente' });
        }
    },
    async getClientRevenue(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId || null;
            const startDateQuery = req.query.startDate;
            const endDateQuery = req.query.endDate;
            const prevStartDateQuery = req.query.prevStartDate;
            const prevEndDateQuery = req.query.prevEndDate;
            const currentYear = new Date().getFullYear();
            const startDate = startDateQuery ? new Date(startDateQuery) : new Date(`${currentYear}-01-01T00:00:00.000Z`);
            const endDate = endDateQuery ? new Date(endDateQuery) : new Date(`${currentYear}-12-31T23:59:59.999Z`);
            const prevStartDate = prevStartDateQuery ? new Date(prevStartDateQuery) : new Date(`${currentYear - 1}-01-01T00:00:00.000Z`);
            const prevEndDate = prevEndDateQuery ? new Date(prevEndDateQuery) : new Date(`${currentYear - 1}-12-31T23:59:59.999Z`);
            const existing = await prisma_1.prisma.client.findFirst({
                where: { id, companyId }
            });
            if (!existing) {
                return res.status(403).json({ error: 'Acesso negado para este cliente.' });
            }
            const service = new clientDashboard_service_1.ClientDashboardService(companyId, id);
            const dashboardData = await service.getDashboardData({ startDate, endDate, prevStartDate, prevEndDate });
            return res.json(dashboardData);
        }
        catch (error) {
            console.error('Error fetching client revenue:', error);
            return res.status(500).json({ error: 'Erro ao buscar receita do cliente', details: error.message, stack: error.stack });
        }
    },
    async deduplicateClients(req, res) {
        try {
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            const clients = await prisma_1.prisma.client.findMany({
                where: { companyId },
                include: { quotes: true }
            });
            const groups = {};
            for (const client of clients) {
                let key = '';
                if (client.cnpj && client.cnpj.trim().replace(/\D/g, '').length === 14) {
                    key = `cnpj_${client.cnpj.trim().replace(/\D/g, '')}`;
                }
                else if (client.email && client.email.trim().includes('@')) {
                    key = `email_${client.email.trim().toLowerCase()}`;
                }
                else {
                    key = `nome_${client.nome.trim().toLowerCase()}`;
                }
                if (!groups[key]) {
                    groups[key] = [];
                }
                groups[key].push(client);
            }
            let groupsUnified = 0;
            let duplicatesDeleted = 0;
            for (const [key, group] of Object.entries(groups)) {
                if (group.length <= 1)
                    continue;
                const survivor = group.reduce((prev, curr) => {
                    if (curr.quotes.length > prev.quotes.length)
                        return curr;
                    if (curr.quotes.length < prev.quotes.length)
                        return prev;
                    const prevScore = (prev.cnpj ? 1 : 0) + (prev.email ? 1 : 0) + (prev.telefone ? 1 : 0) + (prev.cidade ? 1 : 0);
                    const currScore = (curr.cnpj ? 1 : 0) + (curr.email ? 1 : 0) + (curr.telefone ? 1 : 0) + (curr.cidade ? 1 : 0);
                    return currScore > prevScore ? curr : prev;
                });
                const duplicates = group.filter(c => c.id !== survivor.id);
                for (const duplicate of duplicates) {
                    if (duplicate.quotes.length > 0) {
                        await prisma_1.prisma.quote.updateMany({
                            where: { clientId: duplicate.id, companyId },
                            data: { clientId: survivor.id }
                        });
                    }
                    await prisma_1.prisma.client.delete({
                        where: { id: duplicate.id }
                    });
                    duplicatesDeleted++;
                }
                groupsUnified++;
            }
            if (typeof audit_logger_1.AuditLogger !== 'undefined' && audit_logger_1.AuditLogger.log) {
                audit_logger_1.AuditLogger.log(userId, companyId, 'DEDUPLICATE_CLIENTS', `Deduplicated clients: unified ${groupsUnified} groups, deleted ${duplicatesDeleted} duplicates`, 'SUCCESS');
            }
            return res.json({ message: 'Deduplicação concluída com sucesso', groupsUnified, duplicatesDeleted });
        }
        catch (error) {
            console.error('Error deduplicating clients:', error);
            return res.status(500).json({ error: 'Erro ao deduplicar clientes' });
        }
    },
    // SUPPLIERS CRUD
    async listSuppliers(req, res) {
        try {
            const { search } = req.query;
            const companyId = req.companyId || null;
            const whereClause = { companyId };
            if (search) {
                whereClause.AND = [
                    { companyId },
                    {
                        OR: [
                            { razaoSocial: { contains: search, mode: 'insensitive' } },
                            { nomeFantasia: { contains: search, mode: 'insensitive' } },
                            { cnpj: { contains: search, mode: 'insensitive' } },
                            { email: { contains: search, mode: 'insensitive' } },
                        ]
                    }
                ];
            }
            const suppliers = await prisma_1.prisma.supplier.findMany({
                where: whereClause,
                orderBy: { razaoSocial: 'asc' },
            });
            return res.json(suppliers);
        }
        catch (error) {
            console.error('Error listing suppliers:', error);
            return res.status(500).json({ error: 'Erro ao listar fornecedores' });
        }
    },
    async createSupplier(req, res) {
        try {
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            const data = supplierSchema.parse(req.body);
            let cnpjSemMascara = data.cnpj ? data.cnpj.replace(/\D/g, '') : null;
            if (cnpjSemMascara) {
                const duplicate = await prisma_1.prisma.supplier.findFirst({
                    where: {
                        cnpjSemMascara,
                        companyId
                    }
                });
                if (duplicate) {
                    audit_logger_1.AuditLogger.log(userId, companyId, 'CREATE_SUPPLIER', `Attempted duplicate supplier CNPJ: ${data.cnpj}`, 'DUPLICATE_ATTEMPT');
                    return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
                }
            }
            const supplier = await prisma_1.prisma.supplier.create({
                data: {
                    ...data,
                    cnpjSemMascara,
                    companyId
                },
            });
            audit_logger_1.AuditLogger.log(userId, companyId, 'CREATE_SUPPLIER', `Created supplier: ${supplier.razaoSocial} (${supplier.id})`, 'SUCCESS');
            return res.status(201).json(supplier);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error('Error creating supplier:', error);
            return res.status(500).json({ error: 'Erro ao criar fornecedor' });
        }
    },
    async updateSupplier(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            const data = supplierSchema.parse(req.body);
            const existing = await prisma_1.prisma.supplier.findFirst({
                where: { id, companyId }
            });
            if (!existing) {
                return res.status(403).json({ error: 'Acesso negado para este fornecedor.' });
            }
            let cnpjSemMascara = data.cnpj ? data.cnpj.replace(/\D/g, '') : null;
            if (cnpjSemMascara) {
                const duplicate = await prisma_1.prisma.supplier.findFirst({
                    where: {
                        cnpjSemMascara,
                        id: { not: id },
                        companyId
                    }
                });
                if (duplicate) {
                    audit_logger_1.AuditLogger.log(userId, companyId, 'UPDATE_SUPPLIER', `Attempted duplicate supplier CNPJ update: ${data.cnpj}`, 'DUPLICATE_ATTEMPT');
                    return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
                }
            }
            const supplier = await prisma_1.prisma.supplier.update({
                where: { id },
                data: {
                    ...data,
                    cnpjSemMascara,
                    companyId
                },
            });
            audit_logger_1.AuditLogger.log(userId, companyId, 'UPDATE_SUPPLIER', `Updated supplier: ${supplier.razaoSocial} (${supplier.id})`, 'SUCCESS');
            return res.json(supplier);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error('Error updating supplier:', error);
            return res.status(500).json({ error: 'Erro ao atualizar fornecedor' });
        }
    },
    async deleteSupplier(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId || null;
            const existing = await prisma_1.prisma.supplier.findFirst({
                where: { id, companyId }
            });
            if (!existing) {
                return res.status(403).json({ error: 'Acesso negado para este fornecedor.' });
            }
            await prisma_1.prisma.supplier.delete({
                where: { id },
            });
            return res.status(204).send();
        }
        catch (error) {
            console.error('Error deleting supplier:', error);
            return res.status(500).json({ error: 'Erro ao excluir fornecedor' });
        }
    },
    // COLLABORATORS CRUD
    async listCollaborators(req, res) {
        try {
            const { search } = req.query;
            const companyId = req.companyId || null;
            const whereClause = { companyId };
            if (search) {
                whereClause.AND = [
                    { companyId },
                    {
                        OR: [
                            { nome: { contains: search, mode: 'insensitive' } },
                            { cpf: { contains: search, mode: 'insensitive' } },
                            { email: { contains: search, mode: 'insensitive' } },
                            { cargo: { contains: search, mode: 'insensitive' } },
                            { departamento: { contains: search, mode: 'insensitive' } },
                        ]
                    }
                ];
            }
            const collaborators = await prisma_1.prisma.collaborator.findMany({
                where: whereClause,
                include: {
                    oficina: true,
                    company: true,
                    advances: {
                        include: {
                            oficina: true
                        }
                    }
                },
                orderBy: { nome: 'asc' },
            });
            return res.json(collaborators);
        }
        catch (error) {
            console.error('Error listing collaborators:', error);
            return res.status(500).json({ error: 'Erro ao listar colaboradores' });
        }
    },
    async createCollaborator(req, res) {
        try {
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            const data = collaboratorSchema.parse(req.body);
            let cpfSemMascara = data.cpf ? data.cpf.replace(/\D/g, '') : null;
            if (cpfSemMascara) {
                const duplicate = await prisma_1.prisma.collaborator.findFirst({
                    where: {
                        cpfSemMascara,
                        companyId
                    }
                });
                if (duplicate) {
                    audit_logger_1.AuditLogger.log(userId, companyId, 'CREATE_COLLABORATOR', `Attempted duplicate collaborator CPF: ${data.cpf}`, 'DUPLICATE_ATTEMPT');
                    return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
                }
            }
            let targetOficinaId = null;
            if (data.oficinaId) {
                const oficinaExists = await prisma_1.prisma.oficina.findFirst({
                    where: { id: data.oficinaId, companyId }
                });
                if (oficinaExists) {
                    targetOficinaId = data.oficinaId;
                }
            }
            let valorHora = null;
            if (data.salario && data.cargaHoraria && data.cargaHoraria > 0) {
                valorHora = data.salario / data.cargaHoraria;
            }
            const collaborator = await prisma_1.prisma.collaborator.create({
                data: {
                    ...data,
                    cpfSemMascara,
                    dataAdmissao: data.dataAdmissao ? new Date(data.dataAdmissao) : null,
                    oficinaId: targetOficinaId,
                    companyId,
                    valorHora
                },
                include: {
                    oficina: true,
                    company: true
                }
            });
            audit_logger_1.AuditLogger.log(userId, companyId, 'CREATE_COLLABORATOR', `Created collaborator: ${collaborator.nome} (${collaborator.id})`, 'SUCCESS');
            return res.status(201).json(collaborator);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error('Error creating collaborator:', error);
            return res.status(500).json({ error: 'Erro ao criar colaborador' });
        }
    },
    async updateCollaborator(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            const data = collaboratorSchema.parse(req.body);
            const existing = await prisma_1.prisma.collaborator.findFirst({
                where: { id, companyId }
            });
            if (!existing) {
                return res.status(403).json({ error: 'Acesso negado para este colaborador.' });
            }
            let cpfSemMascara = data.cpf ? data.cpf.replace(/\D/g, '') : null;
            if (cpfSemMascara) {
                const duplicate = await prisma_1.prisma.collaborator.findFirst({
                    where: {
                        cpfSemMascara,
                        id: { not: id },
                        companyId
                    }
                });
                if (duplicate) {
                    audit_logger_1.AuditLogger.log(userId, companyId, 'UPDATE_COLLABORATOR', `Attempted duplicate collaborator CPF update: ${data.cpf}`, 'DUPLICATE_ATTEMPT');
                    return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
                }
            }
            let targetOficinaId = null;
            if (data.oficinaId) {
                const oficinaExists = await prisma_1.prisma.oficina.findFirst({
                    where: { id: data.oficinaId, companyId }
                });
                if (oficinaExists) {
                    targetOficinaId = data.oficinaId;
                }
            }
            let valorHora = null;
            if (data.salario && data.cargaHoraria && data.cargaHoraria > 0) {
                valorHora = data.salario / data.cargaHoraria;
            }
            const collaborator = await prisma_1.prisma.collaborator.update({
                where: { id },
                data: {
                    ...data,
                    cpfSemMascara,
                    dataAdmissao: data.dataAdmissao ? new Date(data.dataAdmissao) : null,
                    oficinaId: targetOficinaId,
                    companyId,
                    valorHora
                },
                include: {
                    oficina: true,
                    company: true
                }
            });
            audit_logger_1.AuditLogger.log(userId, companyId, 'UPDATE_COLLABORATOR', `Updated collaborator: ${collaborator.nome} (${collaborator.id})`, 'SUCCESS');
            return res.json(collaborator);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error('Error updating collaborator:', error);
            return res.status(500).json({ error: 'Erro ao atualizar colaborador' });
        }
    },
    async deleteCollaborator(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId || null;
            const existing = await prisma_1.prisma.collaborator.findFirst({
                where: { id, companyId }
            });
            if (!existing) {
                return res.status(403).json({ error: 'Acesso negado para este colaborador.' });
            }
            await prisma_1.prisma.collaborator.delete({
                where: { id },
            });
            return res.status(204).send();
        }
        catch (error) {
            console.error('Error deleting collaborator:', error);
            return res.status(500).json({ error: 'Erro ao excluir colaborador' });
        }
    },
};
