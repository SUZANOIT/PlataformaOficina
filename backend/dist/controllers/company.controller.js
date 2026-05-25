"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyController = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const createCompanySchema = zod_1.z.object({
    razaoSocial: zod_1.z.string(),
    nomeFantasia: zod_1.z.string().optional(),
    cnpj: zod_1.z.string(),
    cnpjSemMascara: zod_1.z.string(),
    inscricaoEstadual: zod_1.z.string().optional(),
});
const updateCompanySchema = zod_1.z.object({
    razaoSocial: zod_1.z.string().optional(),
    nomeFantasia: zod_1.z.string().optional().nullable(),
    cnpj: zod_1.z.string().optional(),
    cnpjSemMascara: zod_1.z.string().optional(),
    inscricaoEstadual: zod_1.z.string().optional().nullable(),
    endereco: zod_1.z.string().optional().nullable(),
    telefone: zod_1.z.string().optional().nullable(),
    whatsapp: zod_1.z.string().optional().nullable(),
    email: zod_1.z.string().optional().nullable(),
    logo: zod_1.z.string().optional().nullable(),
    regimeTributario: zod_1.z.string().optional().nullable(),
});
const budgetCompanyCreateSchema = zod_1.z.object({
    razaoSocial: zod_1.z.string(),
    nomeFantasia: zod_1.z.string().optional().nullable(),
    cnpj: zod_1.z.string(),
    cnpjSemMascara: zod_1.z.string(),
    inscricaoEstadual: zod_1.z.string().optional().nullable(),
    endereco: zod_1.z.string().optional().nullable(),
    telefone: zod_1.z.string().optional().nullable(),
    whatsapp: zod_1.z.string().optional().nullable(),
    email: zod_1.z.string().optional().nullable(),
    logo: zod_1.z.string().optional().nullable(),
    regimeTributario: zod_1.z.string().optional().nullable(),
});
exports.CompanyController = {
    async list(req, res) {
        try {
            const { scope } = req.query;
            const companyId = req.companyId;
            const companies = await prisma_1.prisma.company.findMany();
            if (scope === 'orcamento') {
                const budgetCompanies = companies.filter(c => {
                    const isMySub = c.parentCompanyId === companyId;
                    const isGlobalDefault = !c.parentCompanyId && (c.razaoSocial.toLowerCase().includes('curio') ||
                        c.razaoSocial.toLowerCase().includes('curió') ||
                        c.nomeFantasia?.toLowerCase().includes('curio') ||
                        c.nomeFantasia?.toLowerCase().includes('curió') ||
                        c.razaoSocial.toLowerCase().includes('mca') ||
                        c.nomeFantasia?.toLowerCase().includes('mca'));
                    return isMySub || isGlobalDefault;
                });
                return res.json(budgetCompanies);
            }
            // Standard listing: return only sub-companies for this tenant
            const filtered = companies.filter(c => c.parentCompanyId === companyId);
            return res.json(filtered);
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                console.error('Prisma error in company.list:', error.code, error.message);
                return res.status(500).json({ error: 'Database error', code: error.code });
            }
            console.error('Error in company.list:', error);
            return res.status(500).json({
                error: 'Internal server error',
                details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
            });
        }
    },
    async create(req, res) {
        try {
            const data = createCompanySchema.parse(req.body);
            const company = await prisma_1.prisma.company.create({ data });
            console.log(`Company created: ${company.razaoSocial} (id=${company.id})`);
            return res.status(201).json(company);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    return res.status(400).json({ error: 'Company with this CNPJ already exists' });
                }
                console.error('Prisma error in company.create:', error.code, error.message);
                return res.status(500).json({ error: 'Database error', code: error.code });
            }
            console.error('Error in company.create:', error);
            return res.status(500).json({
                error: 'Internal server error',
                details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
            });
        }
    },
    async getMyCompany(req, res) {
        try {
            const companyId = req.companyId;
            if (!companyId) {
                return res.status(400).json({ error: 'User is not associated with any company' });
            }
            const company = await prisma_1.prisma.company.findUnique({
                where: { id: companyId }
            });
            if (!company) {
                return res.status(404).json({ error: 'Company not found' });
            }
            return res.json(company);
        }
        catch (error) {
            console.error('Error in getMyCompany:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async updateMyCompany(req, res) {
        try {
            const companyId = req.companyId;
            if (!companyId) {
                return res.status(400).json({ error: 'User is not associated with any company' });
            }
            // Check if user is ADMIN or ADMINISTRADOR
            const role = req.role;
            if (role !== 'ADMIN' && role !== 'ADMINISTRADOR') {
                return res.status(403).json({ error: 'Only administrators can update workshop profiles' });
            }
            // Validate request body
            const data = updateCompanySchema.parse(req.body);
            const company = await prisma_1.prisma.company.update({
                where: { id: companyId },
                data,
            });
            console.log(`Company updated: ${company.razaoSocial} (id=${company.id})`);
            return res.json(company);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error('Error in updateMyCompany:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    // CRUD for sub-companies (Budget emission profiles)
    async listBudgetCompanies(req, res) {
        try {
            const companyId = req.companyId;
            const budgetCompanies = await prisma_1.prisma.company.findMany({
                where: { parentCompanyId: companyId }
            });
            return res.json(budgetCompanies);
        }
        catch (error) {
            console.error('Error in listBudgetCompanies:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async createBudgetCompany(req, res) {
        try {
            const companyId = req.companyId;
            const data = budgetCompanyCreateSchema.parse(req.body);
            const budgetCompany = await prisma_1.prisma.company.create({
                data: {
                    ...data,
                    parentCompanyId: companyId
                }
            });
            console.log(`Budget Company created: ${budgetCompany.razaoSocial} under owner ${companyId}`);
            return res.status(201).json(budgetCompany);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    return res.status(400).json({ error: 'CNPJ already exists' });
                }
            }
            console.error('Error in createBudgetCompany:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async updateBudgetCompany(req, res) {
        try {
            const companyId = req.companyId;
            const id = req.params.id;
            const data = updateCompanySchema.parse(req.body);
            // Verify ownership before update
            const existing = await prisma_1.prisma.company.findFirst({
                where: { id, parentCompanyId: companyId }
            });
            if (!existing) {
                return res.status(404).json({ error: 'Budget company not found or access denied' });
            }
            const updated = await prisma_1.prisma.company.update({
                where: { id },
                data
            });
            console.log(`Budget Company updated: ${updated.razaoSocial} (id=${updated.id})`);
            return res.json(updated);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error('Error in updateBudgetCompany:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async deleteBudgetCompany(req, res) {
        try {
            const companyId = req.companyId;
            const id = req.params.id;
            // Verify ownership before delete
            const existing = await prisma_1.prisma.company.findFirst({
                where: { id, parentCompanyId: companyId }
            });
            if (!existing) {
                return res.status(404).json({ error: 'Budget company not found or access denied' });
            }
            await prisma_1.prisma.company.delete({
                where: { id }
            });
            console.log(`Budget Company deleted: (id=${id})`);
            return res.status(204).send();
        }
        catch (error) {
            console.error('Error in deleteBudgetCompany:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
};
