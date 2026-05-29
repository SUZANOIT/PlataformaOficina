"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistryController = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const audit_logger_1 = require("../utils/audit.logger");
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
    status: zod_1.z.string().default('ATIVO'),
    observacoes: zod_1.z.string().optional().nullable(),
    oficinaId: zod_1.z.string().optional().nullable(),
});
exports.RegistryController = {
    // CLIENTS CRUD
    async listClients(req, res) {
        try {
            const { search } = req.query;
            const whereClause = {};
            if (search) {
                whereClause.OR = [
                    { nome: { contains: search, mode: 'insensitive' } },
                    { empresa: { contains: search, mode: 'insensitive' } },
                    { cnpj: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
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
                            }
                        }
                    });
                    if (duplicate) {
                        audit_logger_1.AuditLogger.log(userId, companyId, 'CREATE_CLIENT', `Attempted duplicate client CNPJ: ${data.cnpj}`, 'DUPLICATE_ATTEMPT');
                        return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
                    }
                }
            }
            const client = await prisma_1.prisma.client.create({
                data,
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
            if (data.cnpj) {
                const cleanedCnpj = data.cnpj.replace(/\D/g, '');
                if (cleanedCnpj) {
                    const duplicate = await prisma_1.prisma.client.findFirst({
                        where: {
                            cnpj: {
                                contains: cleanedCnpj
                            },
                            id: { not: id }
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
                data,
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
    // SUPPLIERS CRUD
    async listSuppliers(req, res) {
        try {
            const { search } = req.query;
            const whereClause = {};
            if (search) {
                whereClause.OR = [
                    { razaoSocial: { contains: search, mode: 'insensitive' } },
                    { nomeFantasia: { contains: search, mode: 'insensitive' } },
                    { cnpj: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
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
                        cnpjSemMascara
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
            let cnpjSemMascara = data.cnpj ? data.cnpj.replace(/\D/g, '') : null;
            if (cnpjSemMascara) {
                const duplicate = await prisma_1.prisma.supplier.findFirst({
                    where: {
                        cnpjSemMascara,
                        id: { not: id }
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
            const whereClause = {};
            if (search) {
                whereClause.OR = [
                    { nome: { contains: search, mode: 'insensitive' } },
                    { cpf: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { cargo: { contains: search, mode: 'insensitive' } },
                    { departamento: { contains: search, mode: 'insensitive' } },
                ];
            }
            const collaborators = await prisma_1.prisma.collaborator.findMany({
                where: whereClause,
                include: {
                    oficina: true
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
                        cpfSemMascara
                    }
                });
                if (duplicate) {
                    audit_logger_1.AuditLogger.log(userId, companyId, 'CREATE_COLLABORATOR', `Attempted duplicate collaborator CPF: ${data.cpf}`, 'DUPLICATE_ATTEMPT');
                    return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
                }
            }
            const collaborator = await prisma_1.prisma.collaborator.create({
                data: {
                    ...data,
                    cpfSemMascara,
                    dataAdmissao: data.dataAdmissao ? new Date(data.dataAdmissao) : null,
                    oficinaId: data.oficinaId || null
                },
                include: {
                    oficina: true
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
            let cpfSemMascara = data.cpf ? data.cpf.replace(/\D/g, '') : null;
            if (cpfSemMascara) {
                const duplicate = await prisma_1.prisma.collaborator.findFirst({
                    where: {
                        cpfSemMascara,
                        id: { not: id }
                    }
                });
                if (duplicate) {
                    audit_logger_1.AuditLogger.log(userId, companyId, 'UPDATE_COLLABORATOR', `Attempted duplicate collaborator CPF update: ${data.cpf}`, 'DUPLICATE_ATTEMPT');
                    return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
                }
            }
            const collaborator = await prisma_1.prisma.collaborator.update({
                where: { id },
                data: {
                    ...data,
                    cpfSemMascara,
                    dataAdmissao: data.dataAdmissao ? new Date(data.dataAdmissao) : null,
                    oficinaId: data.oficinaId || null
                },
                include: {
                    oficina: true
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
