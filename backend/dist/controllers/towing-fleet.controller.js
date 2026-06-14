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
    marca: zod_1.z.string().optional().nullable(),
    modelo: zod_1.z.string(),
    ano: zod_1.z.coerce.number().optional().nullable(),
    tipo: zod_1.z.string().optional(),
    towingTypeId: zod_1.z.string().optional().nullable(),
    capacidade: zod_1.z.string().optional().nullable(),
    eixos: zod_1.z.coerce.number().optional().nullable(),
    consumoMedio: zod_1.z.coerce.number().optional().nullable(),
    status: zod_1.z.string().default('ATIVO'),
    rntrcNumero: zod_1.z.string().optional().nullable(),
    rntrcStatus: zod_1.z.string().optional().nullable(),
    rntrcValidade: zod_1.z.string().optional().nullable().transform((str) => str ? new Date(str) : undefined),
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
    async updateDriver(req, res) {
        try {
            const companyId = req.companyId;
            const id = req.params.id;
            const data = driverSchema.parse(req.body);
            const existing = await prisma_1.prisma.towingDriver.findFirst({
                where: { id, companyId }
            });
            if (!existing) {
                return res.status(404).json({ error: 'Motorista não encontrado' });
            }
            const driver = await prisma_1.prisma.towingDriver.update({
                where: { id },
                data
            });
            return res.json(driver);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError)
                return res.status(400).json({ error: error.errors });
            return res.status(500).json({ error: 'Internal error' });
        }
    },
    async deleteDriver(req, res) {
        try {
            const companyId = req.companyId;
            const id = req.params.id;
            const existing = await prisma_1.prisma.towingDriver.findFirst({
                where: { id, companyId }
            });
            if (!existing) {
                return res.status(404).json({ error: 'Motorista não encontrado' });
            }
            await prisma_1.prisma.towingDriver.delete({
                where: { id }
            });
            return res.status(204).send();
        }
        catch (error) {
            return res.status(500).json({ error: 'Internal error' });
        }
    },
    // --- VEHICLES ---
    async listVehicles(req, res) {
        try {
            const companyId = req.companyId;
            const vehicles = await prisma_1.prisma.towingVehicle.findMany({
                where: { companyId },
                include: {
                    towingType: true,
                    company: {
                        select: {
                            razaoSocial: true,
                            nomeFantasia: true
                        }
                    }
                },
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
            const parsedData = vehicleSchema.parse(req.body);
            let tipo = parsedData.tipo || '';
            if (parsedData.towingTypeId) {
                const towingType = await prisma_1.prisma.towingType.findFirst({
                    where: { id: parsedData.towingTypeId, companyId }
                });
                if (towingType) {
                    tipo = towingType.name;
                }
            }
            const vehicle = await prisma_1.prisma.towingVehicle.create({
                data: {
                    placa: parsedData.placa,
                    marca: parsedData.marca,
                    modelo: parsedData.modelo,
                    ano: parsedData.ano,
                    tipo,
                    towingTypeId: parsedData.towingTypeId,
                    capacidade: parsedData.capacidade,
                    eixos: parsedData.eixos,
                    consumoMedio: parsedData.consumoMedio,
                    status: parsedData.status,
                    rntrcNumero: parsedData.rntrcNumero,
                    rntrcStatus: parsedData.rntrcStatus,
                    rntrcValidade: parsedData.rntrcValidade,
                    companyId
                },
                include: {
                    towingType: true,
                    company: {
                        select: {
                            razaoSocial: true,
                            nomeFantasia: true
                        }
                    }
                }
            });
            return res.status(201).json(vehicle);
        }
        catch (error) {
            console.error(error);
            if (error instanceof zod_1.z.ZodError)
                return res.status(400).json({ error: error.errors });
            return res.status(500).json({ error: 'Internal error' });
        }
    },
    async updateVehicle(req, res) {
        try {
            const companyId = req.companyId;
            const id = req.params.id;
            const parsedData = vehicleSchema.parse(req.body);
            const existing = await prisma_1.prisma.towingVehicle.findFirst({
                where: { id, companyId }
            });
            if (!existing) {
                return res.status(404).json({ error: 'Veículo não encontrado' });
            }
            let tipo = parsedData.tipo || existing.tipo;
            if (parsedData.towingTypeId) {
                const towingType = await prisma_1.prisma.towingType.findFirst({
                    where: { id: parsedData.towingTypeId, companyId }
                });
                if (towingType) {
                    tipo = towingType.name;
                }
            }
            const vehicle = await prisma_1.prisma.towingVehicle.update({
                where: { id },
                data: {
                    placa: parsedData.placa,
                    marca: parsedData.marca,
                    modelo: parsedData.modelo,
                    ano: parsedData.ano,
                    tipo,
                    towingTypeId: parsedData.towingTypeId,
                    capacidade: parsedData.capacidade,
                    eixos: parsedData.eixos,
                    consumoMedio: parsedData.consumoMedio,
                    status: parsedData.status,
                    rntrcNumero: parsedData.rntrcNumero,
                    rntrcStatus: parsedData.rntrcStatus,
                    rntrcValidade: parsedData.rntrcValidade,
                },
                include: {
                    towingType: true,
                    company: {
                        select: {
                            razaoSocial: true,
                            nomeFantasia: true
                        }
                    }
                }
            });
            return res.json(vehicle);
        }
        catch (error) {
            console.error(error);
            if (error instanceof zod_1.z.ZodError)
                return res.status(400).json({ error: error.errors });
            return res.status(500).json({ error: 'Internal error' });
        }
    },
    async deleteVehicle(req, res) {
        try {
            const companyId = req.companyId;
            const id = req.params.id;
            const existing = await prisma_1.prisma.towingVehicle.findFirst({
                where: { id, companyId }
            });
            if (!existing) {
                return res.status(404).json({ error: 'Veículo não encontrado' });
            }
            await prisma_1.prisma.towingVehicle.delete({
                where: { id }
            });
            return res.status(204).send();
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal error' });
        }
    },
    // --- TOWING TYPES (AUTO-SEED ON DEMAND) ---
    async listTypes(req, res) {
        try {
            const companyId = req.companyId;
            let types = await prisma_1.prisma.towingType.findMany({
                where: { companyId },
                orderBy: { name: 'asc' }
            });
            if (types.length === 0) {
                const defaults = ["Plataforma leve", "Plataforma pesada", "Lança", "Munck", "Prancha"];
                await prisma_1.prisma.towingType.createMany({
                    data: defaults.map(name => ({
                        name,
                        companyId
                    }))
                });
                types = await prisma_1.prisma.towingType.findMany({
                    where: { companyId },
                    orderBy: { name: 'asc' }
                });
            }
            return res.json(types);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal error' });
        }
    }
};
