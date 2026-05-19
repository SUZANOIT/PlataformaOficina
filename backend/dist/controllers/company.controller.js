"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyController = void 0;
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
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async create(req, res) {
        try {
            const data = createCompanySchema.parse(req.body);
            const company = await prisma_1.prisma.company.create({ data });
            return res.status(201).json(company);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
};
