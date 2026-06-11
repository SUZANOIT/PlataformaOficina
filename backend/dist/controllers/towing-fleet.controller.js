"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TowingFleetController = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const driverSchema = zod_1.z.object({
    nome: zod_1.z.string(),
    cpf: zod_1.z.string(),
    cnh: zod_1.z.string(),
    categoria: zod_1.z.string(),
    validadeCnh: zod_1.z.string().transform((str) => new Date(str)),
});
const vehicleSchema = zod_1.z.object({
    placa: zod_1.z.string(),
    modelo: zod_1.z.string(),
    tipo: zod_1.z.string(),
    capacidade: zod_1.z.string().optional(),
    status: zod_1.z.string().default('ATIVO'),
    rntrcNumero: zod_1.z.string().optional(),
    rntrcStatus: zod_1.z.string().optional(),
    rntrcValidade: zod_1.z.string().optional().transform((str) => str ? new Date(str) : undefined),
});
exports.TowingFleetController = {
    // --- DRIVERS ---
    async listDrivers(req, res) {
        try {
            const companyId = req.companyId;
            const drivers = await prisma_1.prisma.towingDriver.findMany({
                where: { companyId },
                orderBy: { nome: 'asc' }
            });
            return res.json(drivers);
        }
        catch (error) {
            return res.status(500).json({ error: 'Internal error' });
        }
    },
    async createDriver(req, res) {
        try {
            const companyId = req.companyId;
            const data = driverSchema.parse(req.body);
            const driver = await prisma_1.prisma.towingDriver.create({
                data: { ...data, companyId }
            });
            return res.status(201).json(driver);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError)
                return res.status(400).json({ error: error.errors });
            return res.status(500).json({ error: 'Internal error' });
        }
    },
    // --- VEHICLES ---
    async listVehicles(req, res) {
        try {
            const companyId = req.companyId;
            const vehicles = await prisma_1.prisma.towingVehicle.findMany({
                where: { companyId },
                orderBy: { placa: 'asc' }
            });
            return res.json(vehicles);
        }
        catch (error) {
            return res.status(500).json({ error: 'Internal error' });
        }
    },
    async createVehicle(req, res) {
        try {
            const companyId = req.companyId;
            const data = vehicleSchema.parse(req.body);
            const vehicle = await prisma_1.prisma.towingVehicle.create({
                data: { ...data, companyId }
            });
            return res.status(201).json(vehicle);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError)
                return res.status(400).json({ error: error.errors });
            return res.status(500).json({ error: 'Internal error' });
        }
    }
};
