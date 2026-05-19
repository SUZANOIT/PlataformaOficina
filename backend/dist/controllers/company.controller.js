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
exports.CompanyController = {
    async list(req, res) {
        try {
            const companies = await prisma_1.prisma.company.findMany();
            return res.json(companies);
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
};
