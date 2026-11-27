import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuditLogger } from '../utils/audit.logger';
import { buildVehicleSections } from '../services/vehicleDetails.service';
import { MAINTENANCE_EVENT_TYPES, parsePeriodDays, summarizeMaintenance } from '../services/vehicleMaintenanceStatus';
import { isServiceOrderStatus } from '../portalGestor/portalGestor.financials';
import { costWindowStart, monthlyCostsByVehicle, parseCostMonths } from '../services/vehicleMonthlyCosts';

// Formats for Zod validation
const createVehicleSchema = z.object({
  clienteId: z.string(),
  placa: z.string().transform((val) => val.toUpperCase().replace(/[\s-]/g, "")),
  renavam: z.string().optional().nullable(),
  chassi: z.string().optional().nullable(),
  vin: z.string().optional().nullable(),
  frota: z.string().optional().nullable(),
  subfrota: z.string().optional().nullable(),
  prefixo: z.string().optional().nullable(),
  marca: z.string(),
  modelo: z.string(),
  versao: z.string().optional().nullable(),
  anoFabricacao: z.number().int(),
  anoModelo: z.number().int(),
  cor: z.string().optional().nullable(),
  combustivel: z.string().optional().nullable(),
  tipoVeiculo: z.string().optional().nullable(),
  kmAtual: z.number().int().default(0),
  status: z.string().default('ATIVO'),
  observacoes: z.string().optional().nullable(),
});

const createWorkshopSchema = z.object({
  nome: z.string(),
  cnpj: z.string().transform((val) => val.replace(/\D/g, "")),
  responsavel: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  servicosRealizados: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  banco: z.string().optional().nullable(),
  agencia: z.string().optional().nullable(),
  contaCorrente: z.string().optional().nullable(),
  tipoConta: z.string().optional().nullable(),
  chavePix: z.string().optional().nullable(),
  favorecido: z.string().optional().nullable(),
  cpfCnpjFavorecido: z.string().optional().nullable(),
});

const createOilMotorSchema = z.object({
  veiculoId: z.string(),
  dataTroca: z.string().transform((val) => new Date(val)),
  kmTroca: z.number().int(),
  tipoOleo: z.string().optional().nullable(),
  quantidade: z.number().optional().nullable(),
  proximaTrocaKm: z.number().int(),
  proximaTrocaData: z.string().transform((val) => new Date(val)),
  oficinaId: z.string(),
  valor: z.number(),
  observacoes: z.string().optional().nullable(),
});

const createOilGearSchema = z.object({
  veiculoId: z.string(),
  tipoCambio: z.string(), // MANUAL, AUTOMATICO, CVT
  dataTroca: z.string().transform((val) => new Date(val)),
  kmTroca: z.number().int(),
  oleoUtilizado: z.string().optional().nullable(),
  quantidade: z.number().optional().nullable(),
  proximaTrocaKm: z.number().int(),
  proximaTrocaData: z.string().transform((val) => new Date(val)),
  oficinaId: z.string(),
  valor: z.number(),
  observacoes: z.string().optional().nullable(),
});

const createEventSchema = z.object({
  veiculoId: z.string(),
  tipo: z.string(), // TROCA_OLEO_MOTOR, TROCA_OLEO_CAMBIO, REVISAO, MANUTENCAO, KM, ABASTECIMENTO, MULTA, SINISTRO, ALTERACAO
  data: z.string().transform((val) => new Date(val)),
  km: z.number().int().optional().nullable(),
  descricao: z.string(),
  valor: z.number().optional().nullable(),
  oficinaId: z.string().optional().nullable(),
});

export const fleetController = {
  // ==========================================
  // LAZY-LOAD TREE ACTIONS
  // ==========================================
  async listClientsTree(req: Request, res: Response) {
    try {
      const { search, placa, chassi, status, startDate, endDate } = req.query as any;

      // Base query for clients: we only want active clients or based on general search
      const whereClause: Prisma.ClientWhereInput = {};

      if (search) {
        whereClause.OR = [
          { nome: { contains: search, mode: 'insensitive' } },
          { empresa: { contains: search, mode: 'insensitive' } },
          { cnpj: { contains: search, mode: 'insensitive' } },
        ];
      }

      // If vehicle-specific filters are provided, we should only return clients who own matching vehicles
      const vehicleWhere: Prisma.VehicleWhereInput = {};
      let hasVehicleFilter = false;

      if (placa) {
        vehicleWhere.placa = { contains: placa.toUpperCase().replace(/[\s-]/g, ""), mode: 'insensitive' };
        hasVehicleFilter = true;
      }
      if (chassi) {
        vehicleWhere.chassi = { contains: chassi, mode: 'insensitive' };
        hasVehicleFilter = true;
      }
      if (status) {
        if (status !== 'all') {
          vehicleWhere.status = status;
          hasVehicleFilter = true;
        }
      } else {
        // By default, only active vehicles
        vehicleWhere.status = 'ATIVO';
        hasVehicleFilter = true;
      }

      if (startDate || endDate) {
        const dateFilter: Prisma.DateTimeFilter = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);
        
        vehicleWhere.OR = [
          { createdAt: dateFilter },
          { events: { some: { data: dateFilter } } }
        ];
        hasVehicleFilter = true;
      }

      // Only filter client entities if there is an explicit vehicle attribute search (plate, chassis, or date range)
      // This prevents clients with 0 vehicles from being hidden by default when status is 'ATIVO'
      let hasExplicitVehicleSearch = false;
      if (placa || chassi || startDate || endDate) {
        hasExplicitVehicleSearch = true;
      }

      if (hasExplicitVehicleSearch) {
        whereClause.veiculos = {
          some: vehicleWhere
        };
      }

      const clients = await prisma.client.findMany({
        where: whereClause,
        orderBy: { nome: 'asc' },
        select: {
          id: true,
          nome: true,
          empresa: true,
          cnpj: true,
          status: true,
          _count: {
            select: {
              veiculos: {
                where: vehicleWhere
              }
            }
          }
        }
      });

      const dbClients = await prisma.client.findMany({ select: { id: true } });
      const dbClientIds = new Set(dbClients.map(c => c.id));
      
      const allVehicles = await prisma.vehicle.findMany({
        select: {
          id: true,
          placa: true,
          chassi: true,
          renavam: true,
          vin: true,
          clienteId: true
        }
      });

      const normalizePlate = (p: string) => p.toUpperCase().replace(/[\s-]/g, "");
      const plateCounts = new Map<string, number>();
      const chassiCounts = new Map<string, number>();
      const renavamCounts = new Map<string, number>();
      const vinCounts = new Map<string, number>();
      
      allVehicles.forEach(v => {
        const p = normalizePlate(v.placa);
        plateCounts.set(p, (plateCounts.get(p) || 0) + 1);
        if (v.chassi) {
          const c = v.chassi.trim();
          if (c) chassiCounts.set(c, (chassiCounts.get(c) || 0) + 1);
        }
        if (v.renavam) {
          const r = v.renavam.trim();
          if (r) renavamCounts.set(r, (renavamCounts.get(r) || 0) + 1);
        }
        if (v.vin) {
          const vi = v.vin.trim();
          if (vi) vinCounts.set(vi, (vinCounts.get(vi) || 0) + 1);
        }
      });

      const orphanVehicles = allVehicles.filter(v => !dbClientIds.has(v.clienteId));
      const duplicateVehicles = allVehicles.filter(v => {
        const p = normalizePlate(v.placa);
        return (plateCounts.get(p) || 0) > 1 || 
               (v.chassi ? (chassiCounts.get(v.chassi.trim()) || 0) > 1 : false) ||
               (v.renavam ? (renavamCounts.get(v.renavam.trim()) || 0) > 1 : false);
      });

      const totalInconsistencies = orphanVehicles.length + duplicateVehicles.length;

      const formattedClients: any[] = clients.map(c => ({
        id: c.id,
        nome: c.nome,
        empresa: c.empresa,
        cnpj: c.cnpj,
        status: c.status,
        _count: c._count
      }));

      if (totalInconsistencies > 0) {
        formattedClients.push({
          id: 'audit-orphans',
          nome: '⚠️ Auditoria de Frota',
          empresa: 'Registros com Inconsistências',
          cnpj: '',
          status: 'ATIVO',
          _count: {
            veiculos: totalInconsistencies
          }
        });
      }

      return res.json(formattedClients);
    } catch (error) {
      console.error('[Fleet] Erro listClientsTree:', error);
      return res.status(500).json({ error: 'Erro ao listar árvore de clientes' });
    }
  },

  async getClientFleet(req: Request, res: Response) {
    try {
      const { clientId } = req.params as any;
      const { search, placa, chassi, status, startDate, endDate } = req.query as any;

      const dbClients = await prisma.client.findMany({ select: { id: true } });
      const dbClientIds = new Set(dbClients.map(c => c.id));

      const allVehiclesForAudit = await prisma.vehicle.findMany({
        select: {
          id: true,
          placa: true,
          chassi: true,
          renavam: true,
          vin: true,
          clienteId: true
        }
      });

      const normalizePlate = (p: string) => p.toUpperCase().replace(/[\s-]/g, "");
      const plateCounts = new Map<string, number>();
      const chassiCounts = new Map<string, number>();
      const renavamCounts = new Map<string, number>();
      const vinCounts = new Map<string, number>();
      
      allVehiclesForAudit.forEach(v => {
        const p = normalizePlate(v.placa);
        plateCounts.set(p, (plateCounts.get(p) || 0) + 1);
        if (v.chassi) {
          const c = v.chassi.trim();
          if (c) chassiCounts.set(c, (chassiCounts.get(c) || 0) + 1);
        }
        if (v.renavam) {
          const r = v.renavam.trim();
          if (r) renavamCounts.set(r, (renavamCounts.get(r) || 0) + 1);
        }
        if (v.vin) {
          const vi = v.vin.trim();
          if (vi) vinCounts.set(vi, (vinCounts.get(vi) || 0) + 1);
        }
      });

      let vehicles;

      if (clientId === 'audit-orphans') {
        const orphanIds = allVehiclesForAudit.filter(v => !dbClientIds.has(v.clienteId)).map(v => v.id);
        const duplicateIds = allVehiclesForAudit.filter(v => {
          const p = normalizePlate(v.placa);
          return (plateCounts.get(p) || 0) > 1 || 
                 (v.chassi ? (chassiCounts.get(v.chassi.trim()) || 0) > 1 : false) ||
                 (v.renavam ? (renavamCounts.get(v.renavam.trim()) || 0) > 1 : false);
        }).map(v => v.id);

        const targetIds = Array.from(new Set([...orphanIds, ...duplicateIds]));

        vehicles = await prisma.vehicle.findMany({
          where: {
            id: { in: targetIds }
          },
          orderBy: [{ subfrota: 'asc' }, { placa: 'asc' }],
          include: {
            client: true,
            events: {
              orderBy: { data: 'desc' },
              take: 1
            },
            trocasOleoMotor: {
              orderBy: { dataTroca: 'desc' },
              take: 1
            },
            trocasOleoCambio: {
              orderBy: { dataTroca: 'desc' },
              take: 1
            }
          }
        });
      } else {
        const vehicleWhere: Prisma.VehicleWhereInput = {
          clienteId: clientId
        };

        if (placa) {
          vehicleWhere.placa = { contains: placa.toUpperCase().replace(/[\s-]/g, ""), mode: 'insensitive' };
        }
        if (chassi) {
          vehicleWhere.chassi = { contains: chassi, mode: 'insensitive' };
        }
        if (status) {
          if (status !== 'all') {
            vehicleWhere.status = status;
          }
        } else {
          vehicleWhere.status = 'ATIVO';
        }

        if (startDate || endDate) {
          const dateFilter: Prisma.DateTimeFilter = {};
          if (startDate) dateFilter.gte = new Date(startDate);
          if (endDate) dateFilter.lte = new Date(endDate);

          vehicleWhere.OR = [
            { createdAt: dateFilter },
            { events: { some: { data: dateFilter } } }
          ];
        }

        vehicles = await prisma.vehicle.findMany({
          where: vehicleWhere,
          orderBy: [{ subfrota: 'asc' }, { placa: 'asc' }],
          include: {
            client: true,
            events: {
              orderBy: { data: 'desc' },
              take: 1
            },
            trocasOleoMotor: {
              orderBy: { dataTroca: 'desc' },
              take: 1
            },
            trocasOleoCambio: {
              orderBy: { dataTroca: 'desc' },
              take: 1
            }
          }
        });
      }

      const formattedVehicles = vehicles.map(v => {
        const eventDates = [
          v.events[0]?.data,
          v.trocasOleoMotor[0]?.dataTroca,
          v.trocasOleoCambio[0]?.dataTroca
        ].filter(Boolean) as Date[];
        
        const lastServiceDate = eventDates.length > 0 
          ? new Date(Math.max(...eventDates.map(d => d.getTime())))
          : null;

        const hasDupPlate = (plateCounts.get(normalizePlate(v.placa)) || 0) > 1;
        const hasDupChassi = v.chassi ? (chassiCounts.get(v.chassi.trim()) || 0) > 1 : false;
        const hasDupRenavam = v.renavam ? (renavamCounts.get(v.renavam.trim()) || 0) > 1 : false;
        const isOrphan = !dbClientIds.has(v.clienteId);

        const auditAlerts = [];
        if (isOrphan) auditAlerts.push('Órfão (sem cliente válido)');
        if (hasDupPlate) auditAlerts.push('Placa duplicada');
        if (hasDupChassi) auditAlerts.push('Chassi duplicado');
        if (hasDupRenavam) auditAlerts.push('Renavam duplicado');

        return {
          id: v.id,
          placa: v.placa,
          chassi: v.chassi,
          renavam: v.renavam,
          marca: v.marca,
          modelo: v.modelo,
          ano: v.anoModelo,
          anoFabricacao: v.anoFabricacao,
          quilometragem: v.kmAtual,
          status: v.status,
          clienteId: v.clienteId,
          clienteNome: v.client?.nome || '—',
          subfrota: v.subfrota || null,
          frota: v.frota || null,
          dataUltimoServico: lastServiceDate,
          auditAlerts,
          isOrphan,
          isDuplicate: hasDupPlate || hasDupChassi || hasDupRenavam
        };
      });

      return res.json(formattedVehicles);
    } catch (error) {
      console.error('[Fleet] Erro getClientFleet:', error);
      return res.status(500).json({ error: 'Erro ao carregar frota do cliente' });
    }
  },

  async getVehicleDetails(req: Request, res: Response) {
    try {
      const { vehicleId } = req.params as any;

      const dbClients = await prisma.client.findMany({ select: { id: true } });
      const dbClientIds = new Set(dbClients.map(c => c.id));

      const allVehiclesForAudit = await prisma.vehicle.findMany({
        select: {
          id: true,
          placa: true,
          chassi: true,
          renavam: true,
          vin: true,
          clienteId: true
        }
      });

      const normalizePlate = (p: string) => p.toUpperCase().replace(/[\s-]/g, "");
      const plateCounts = new Map<string, number>();
      const chassiCounts = new Map<string, number>();
      const renavamCounts = new Map<string, number>();
      const vinCounts = new Map<string, number>();
      
      allVehiclesForAudit.forEach(v => {
        const p = normalizePlate(v.placa);
        plateCounts.set(p, (plateCounts.get(p) || 0) + 1);
        if (v.chassi) {
          const c = v.chassi.trim();
          if (c) chassiCounts.set(c, (chassiCounts.get(c) || 0) + 1);
        }
        if (v.renavam) {
          const r = v.renavam.trim();
          if (r) renavamCounts.set(r, (renavamCounts.get(r) || 0) + 1);
        }
        if (v.vin) {
          const vi = v.vin.trim();
          if (vi) vinCounts.set(vi, (vinCounts.get(vi) || 0) + 1);
        }
      });

      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        include: {
          client: true,
          events: {
            orderBy: { data: 'desc' }
          },
          trocasOleoMotor: {
            orderBy: { dataTroca: 'desc' },
            include: { oficina: true }
          },
          trocasOleoCambio: {
            orderBy: { dataTroca: 'desc' },
            include: { oficina: true }
          }
        }
      });

      if (!vehicle) {
        return res.status(404).json({ error: 'Veículo não encontrado' });
      }

      // Fetch all quotes related to this vehicle's plate
      const quotes = await prisma.quote.findMany({
        where: {
          veiculoPlaca: {
            equals: vehicle.placa,
            mode: 'insensitive'
          }
        },
        include: {
          items: true,
          financialReceivables: {
            include: { attachments: true }
          },
          linkedPayables: {
            include: {
              payable: {
                include: { attachments: true }
              }
            }
          },
          linkedReceivables: {
            include: {
              receivable: {
                include: { attachments: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Seções do cockpit (regra compartilhada com o Portal do Gestor de Frota)
      const { orcamentos, ordensServico, manutencoes, pecas, documentos, financeiro } =
        buildVehicleSections(vehicle, quotes, 'admin');

      // Format basic vehicle data
      const hasDupPlate = (plateCounts.get(normalizePlate(vehicle.placa)) || 0) > 1;
      const hasDupChassi = vehicle.chassi ? (chassiCounts.get(vehicle.chassi.trim()) || 0) > 1 : false;
      const hasDupRenavam = vehicle.renavam ? (renavamCounts.get(vehicle.renavam.trim()) || 0) > 1 : false;
      const isOrphan = !dbClientIds.has(vehicle.clienteId);

      const auditAlerts = [];
      if (isOrphan) auditAlerts.push('Órfão (sem cliente válido)');
      if (hasDupPlate) auditAlerts.push('Placa duplicada');
      if (hasDupChassi) auditAlerts.push('Chassi duplicado');
      if (hasDupRenavam) auditAlerts.push('Renavam duplicado');

      const infoCadastral = {
        id: vehicle.id,
        placa: vehicle.placa,
        chassi: vehicle.chassi,
        renavam: vehicle.renavam,
        vin: vehicle.vin,
        frota: vehicle.frota,
        subfrota: vehicle.subfrota,
        prefixo: vehicle.prefixo,
        marca: vehicle.marca,
        modelo: vehicle.modelo,
        versao: vehicle.versao,
        anoFabricacao: vehicle.anoFabricacao,
        anoModelo: vehicle.anoModelo,
        cor: vehicle.cor,
        combustivel: vehicle.combustivel,
        tipoVeiculo: vehicle.tipoVeiculo,
        kmAtual: vehicle.kmAtual,
        status: vehicle.status,
        observacoes: vehicle.observacoes,
        auditAlerts,
        isOrphan,
        isDuplicate: hasDupPlate || hasDupChassi || hasDupRenavam,
        cliente: vehicle.client ? {
          id: vehicle.client.id,
          nome: vehicle.client.nome,
          empresa: vehicle.client.empresa,
          cnpj: vehicle.client.cnpj,
          telefone: vehicle.client.telefone,
          email: vehicle.client.email
        } : null
      };

      return res.json({
        infoCadastral,
        orcamentos,
        ordensServico,
        manutencoes,
        pecas,
        documentos,
        financeiro
      });
    } catch (error) {
      console.error('[Fleet] Erro getVehicleDetails:', error);
      return res.status(500).json({ error: 'Erro ao carregar detalhes do veículo' });
    }
  },

  // ==========================================
  // CLIENTS ACTIONS
  // ==========================================
  async listClients(req: Request, res: Response) {
    try {
      const clients = await prisma.client.findMany({
        orderBy: { nome: 'asc' },
        include: {
          veiculos: true,
        },
      });
      return res.json(clients);
    } catch (error) {
      console.error('[Fleet] Erro listClients:', error);
      return res.status(500).json({ error: 'Erro ao listar clientes' });
    }
  },

  async updateClientStatus(req: Request, res: Response) {
    try {
      const { id } = req.params as any;
      const { status, whatsapp } = req.body;
      const client = await prisma.client.update({
        where: { id },
        data: {
          status: status || 'ATIVO',
          whatsapp: whatsapp || null,
        },
      });
      return res.json(client);
    } catch (error) {
      console.error('[Fleet] Erro updateClientStatus:', error);
      return res.status(500).json({ error: 'Erro ao atualizar dados do cliente' });
    }
  },

  // ==========================================
  // VEHICLES CRUD
  // ==========================================
  async listVehicles(req: Request, res: Response) {
    try {
      const vehicles = await prisma.vehicle.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          client: true,
        },
      });
      return res.json(vehicles);
    } catch (error) {
      console.error('[Fleet] Erro listVehicles:', error);
      return res.status(500).json({ error: 'Erro ao listar veículos' });
    }
  },

  async getVehicle(req: Request, res: Response) {
    try {
      const { id } = req.params as any;
      const vehicle = await prisma.vehicle.findUnique({
        where: { id },
        include: {
          client: true,
          trocasOleoMotor: {
            include: { oficina: true },
            orderBy: { dataTroca: 'desc' },
          },
          trocasOleoCambio: {
            include: { oficina: true },
            orderBy: { dataTroca: 'desc' },
          },
          events: {
            orderBy: { data: 'desc' },
          },
        },
      });

      if (!vehicle) {
        return res.status(404).json({ error: 'Veículo não encontrado' });
      }

      return res.json(vehicle);
    } catch (error) {
      console.error('[Fleet] Erro getVehicle:', error);
      return res.status(500).json({ error: 'Erro ao obter veículo' });
    }
  },

  async createVehicle(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;
      const data = createVehicleSchema.parse(req.body);

      // Check duplicate plate
      const existing = await prisma.vehicle.findUnique({
        where: { placa: data.placa },
      });

      if (existing) {
        AuditLogger.log(userId, companyId, 'CREATE_VEHICLE', `Attempted duplicate vehicle plate: ${data.placa}`, 'DUPLICATE_ATTEMPT');
        return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
      }

      const vehicle = await prisma.vehicle.create({
        data,
        include: { client: true },
      });

      // Register initial KM event
      await prisma.vehicleEvent.create({
        data: {
          veiculoId: vehicle.id,
          tipo: 'KM',
          data: new Date(),
          km: vehicle.kmAtual,
          descricao: `Cadastro inicial do veículo com KM atual de ${vehicle.kmAtual}`,
        },
      });

      AuditLogger.log(userId, companyId, 'CREATE_VEHICLE', `Created vehicle: ${vehicle.placa} (${vehicle.id})`, 'SUCCESS');
      return res.status(201).json(vehicle);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors });
      }
      console.error('[Fleet] Erro createVehicle:', error);
      return res.status(500).json({ error: 'Erro ao criar veículo' });
    }
  },

  async updateVehicle(req: Request, res: Response) {
    try {
      const { id } = req.params as any;
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;
      const data = createVehicleSchema.partial().parse(req.body);

      const oldVehicle = await prisma.vehicle.findUnique({ where: { id } });
      if (!oldVehicle) {
        return res.status(404).json({ error: 'Veículo não encontrado' });
      }

      if (data.placa && data.placa !== oldVehicle.placa) {
        const duplicate = await prisma.vehicle.findUnique({
          where: { placa: data.placa }
        });
        if (duplicate) {
          AuditLogger.log(userId, companyId, 'UPDATE_VEHICLE', `Attempted duplicate vehicle plate update: ${data.placa}`, 'DUPLICATE_ATTEMPT');
          return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
        }
      }

      const vehicle = await prisma.vehicle.update({
        where: { id },
        data,
        include: { client: true },
      });

      // Register event if status or KM changed
      if (data.kmAtual && data.kmAtual !== oldVehicle.kmAtual) {
        await prisma.vehicleEvent.create({
          data: {
            veiculoId: vehicle.id,
            tipo: 'KM',
            data: new Date(),
            km: data.kmAtual,
            descricao: `Atualização de quilometragem: de ${oldVehicle.kmAtual} para ${data.kmAtual} KM`,
          },
        });
      }

      if (data.status && data.status !== oldVehicle.status) {
        await prisma.vehicleEvent.create({
          data: {
            veiculoId: vehicle.id,
            tipo: 'ALTERACAO',
            data: new Date(),
            descricao: `Alteração de status do veículo: de "${oldVehicle.status}" para "${data.status}"`,
          },
        });
      }

      AuditLogger.log(userId, companyId, 'UPDATE_VEHICLE', `Updated vehicle: ${vehicle.placa} (${vehicle.id})`, 'SUCCESS');
      return res.json(vehicle);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors });
      }
      console.error('[Fleet] Erro updateVehicle:', error);
      return res.status(500).json({ error: 'Erro ao atualizar veículo' });
    }
  },

  async deleteVehicle(req: Request, res: Response) {
    try {
      const { id } = req.params as any;
      
      const vehicle = await prisma.vehicle.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              quotes: true,
              events: true,
              trocasOleoMotor: true,
              trocasOleoCambio: true
            }
          }
        }
      });

      if (!vehicle) {
        return res.status(404).json({ error: 'Veículo não encontrado' });
      }

      const totalHistory = 
        vehicle._count.quotes + 
        vehicle._count.events + 
        vehicle._count.trocasOleoMotor + 
        vehicle._count.trocasOleoCambio;

      if (totalHistory > 0) {
        return res.status(400).json({ 
          error: 'Este veículo possui histórico de orçamentos, ordens de serviço ou manutenções e não pode ser excluído. Você pode apenas inativá-lo.',
          code: 'CANNOT_DELETE_WITH_HISTORY'
        });
      }

      await prisma.vehicle.delete({ where: { id } });
      return res.json({ message: 'Veículo excluído com sucesso' });
    } catch (error) {
      console.error('[Fleet] Erro deleteVehicle:', error);
      return res.status(500).json({ error: 'Erro ao excluir veículo' });
    }
  },

  // ==========================================
  // PLATE LOOKUP
  // ==========================================
  async lookupPlate(req: Request, res: Response) {
    try {
      const { placa } = req.params as any;
      if (!placa) {
        return res.status(400).json({ error: 'Placa é obrigatória' });
      }

      const normalizedPlaca = String(placa).toUpperCase().replace(/[\s-]/g, "");

      // Validate plate standard formats (old: AAA1234, Mercosul: AAA1A23)
      const validPlate = /^[A-Z]{3}[0-9]{4}$|^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(normalizedPlaca);
      if (!validPlate) {
        return res.status(400).json({ error: 'Placa com formato inválido. Use AAA1234 ou AAA1A23.' });
      }

      // 1. Check local cache
      const cache = await prisma.consultaPlaca.findUnique({
        where: { placa: normalizedPlaca },
      });

      if (cache) {
        console.log(`[Fleet] Placa ${normalizedPlaca} encontrada no cache.`);
        return res.json(JSON.parse(cache.retornoApi));
      }

      // 2. Try external integration with placas.app.br
      const email = process.env.PLACAS_API_EMAIL || '';
      const password = process.env.PLACAS_API_PASSWORD || '';
      
      let vehicleData: any = null;

      if (email && password) {
        try {
          console.log(`[Fleet] Buscando placa ${normalizedPlaca} via API externa...`);
          const authRes = await fetch("https://placas.app.br/api/v1/authenticate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          if (authRes.ok) {
            const authData = (await authRes.json()) as any;
            const token = authData.token || authData.access_token || (authData.data && authData.data.token);
            if (token) {
              const lookupRes = await fetch("https://placas.app.br/api/v1/placas/numero", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ placa: normalizedPlaca }),
              });

              if (lookupRes.ok) {
                const apiData = (await lookupRes.json()) as any;
                const data = apiData.data || apiData;
                if (data.marca || data.modelo) {
                  vehicleData = {
                    placa: normalizedPlaca,
                    marca: data.marca || '',
                    modelo: data.modelo || '',
                    versao: data.versao || '',
                    anoFabricacao: Number(data.ano_fabricacao) || Number(data.ano) || 2020,
                    anoModelo: Number(data.ano_modelo) || Number(data.ano) || 2020,
                    cor: data.cor || '',
                    combustivel: data.combustivel || '',
                    tipoVeiculo: data.tipo_veiculo || '',
                    chassi: data.chassi || '',
                    renavam: data.renavam || '',
                    kmAtual: 0,
                  };
                }
              }
            }
          }
        } catch (apiErr) {
          console.error('[Fleet] Falha na consulta de placa externa:', apiErr);
        }
      }

      // 3. Sandbox Sandbox Fallback
      if (!vehicleData) {
        console.log(`[Fleet] Usando Sandbox Mock para placa ${normalizedPlaca}.`);
        const brands = ['Volkswagen', 'Chevrolet', 'Ford', 'Fiat', 'Toyota', 'Honda', 'Hyundai'];
        const modelsByBrand: Record<string, string[]> = {
          'Volkswagen': ['Gol', 'Polo', 'Virtus', 'T-Cross', 'Amarok'],
          'Chevrolet': ['Onix', 'Prisma', 'Tracker', 'S10', 'Cruze'],
          'Ford': ['Ka', 'Fiesta', 'EcoSport', 'Ranger', 'Focus'],
          'Fiat': ['Uno', 'Argo', 'Cronos', 'Toro', 'Strada'],
          'Toyota': ['Corolla', 'Hilux', 'Yaris', 'Etios', 'RAV4'],
          'Honda': ['Civic', 'HR-V', 'Fit', 'City', 'WR-V'],
          'Hyundai': ['HB20', 'Creta', 'Tucson', 'Elantra', 'ix35'],
        };
        const brand = brands[normalizedPlaca.charCodeAt(0) % brands.length];
        const models = modelsByBrand[brand];
        const model = models[normalizedPlaca.charCodeAt(2) % models.length];

        vehicleData = {
          placa: normalizedPlaca,
          marca: brand,
          modelo: model,
          versao: '1.0 Flex Manual',
          anoFabricacao: 2018 + (normalizedPlaca.charCodeAt(4) % 7),
          anoModelo: 2019 + (normalizedPlaca.charCodeAt(4) % 7),
          cor: ['Branco', 'Preto', 'Prata', 'Cinza', 'Vermelho', 'Azul'][normalizedPlaca.charCodeAt(5) % 6],
          combustivel: 'Flex',
          tipoVeiculo: 'Automóvel',
          chassi: '9BWZZZ99Z' + normalizedPlaca + '12345',
          renavam: '12345678901',
          kmAtual: 12500 * (normalizedPlaca.charCodeAt(6) % 10),
        };
      }

      // 4. Save into Database Cache
      await prisma.consultaPlaca.upsert({
        where: { placa: normalizedPlaca },
        update: { retornoApi: JSON.stringify(vehicleData), dataConsulta: new Date() },
        create: { placa: normalizedPlaca, retornoApi: JSON.stringify(vehicleData) },
      });

      return res.json(vehicleData);
    } catch (error) {
      console.error('[Fleet] Erro lookupPlate:', error);
      return res.status(500).json({ error: 'Erro ao processar consulta de placa' });
    }
  },

  // ==========================================
  // WORKSHOPS CRUD
  // ==========================================
  async listWorkshops(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      let workshops = await prisma.oficina.findMany({
        where: { companyId },
        orderBy: { nome: 'asc' },
      });

      // Auto-create "MCA" if no workshops exist
      if (workshops.length === 0) {
        const mca = await prisma.oficina.create({
          data: {
            nome: "MCA",
            cnpj: "00000000000100",
            responsavel: "Administrador MCA",
            telefone: "11999999999",
            whatsapp: "11999999999",
            email: "contato@mca.com",
            endereco: "Av. Principal, 1000 - São Paulo/SP",
            servicosRealizados: "Manutenção Geral, Troca de Óleo, Revisões",
            observacoes: "Oficina Padrão MCA",
            companyId
          }
        });
        workshops = [mca];
      }

      return res.json(workshops);
    } catch (error) {
      console.error('[Fleet] Erro listWorkshops:', error);
      return res.status(500).json({ error: 'Erro ao listar oficinas' });
    }
  },

  async createWorkshop(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;
      const data = createWorkshopSchema.parse(req.body);

      const existing = await prisma.oficina.findUnique({
        where: { cnpj: data.cnpj },
      });

      if (existing) {
        AuditLogger.log(userId, companyId, 'CREATE_WORKSHOP', `Attempted duplicate workshop CNPJ: ${data.cnpj}`, 'DUPLICATE_ATTEMPT');
        return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
      }

      const workshop = await prisma.oficina.create({ data });
      AuditLogger.log(userId, companyId, 'CREATE_WORKSHOP', `Created workshop: ${workshop.nome} (${workshop.id})`, 'SUCCESS');
      return res.status(201).json(workshop);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors });
      }
      console.error('[Fleet] Erro createWorkshop:', error);
      return res.status(500).json({ error: 'Erro ao cadastrar oficina' });
    }
  },

  async updateWorkshop(req: Request, res: Response) {
    try {
      const { id } = req.params as any;
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;
      const data = createWorkshopSchema.partial().parse(req.body);

      const oldWorkshop = await prisma.oficina.findUnique({ where: { id } });
      if (!oldWorkshop) {
        return res.status(404).json({ error: 'Oficina não encontrada' });
      }

      if (data.cnpj && data.cnpj !== oldWorkshop.cnpj) {
        const duplicate = await prisma.oficina.findUnique({
          where: { cnpj: data.cnpj }
        });
        if (duplicate) {
          AuditLogger.log(userId, companyId, 'UPDATE_WORKSHOP', `Attempted duplicate workshop CNPJ update: ${data.cnpj}`, 'DUPLICATE_ATTEMPT');
          return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
        }
      }

      const workshop = await prisma.oficina.update({
        where: { id },
        data,
      });
      AuditLogger.log(userId, companyId, 'UPDATE_WORKSHOP', `Updated workshop: ${workshop.nome} (${workshop.id})`, 'SUCCESS');
      return res.json(workshop);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors });
      }
      console.error('[Fleet] Erro updateWorkshop:', error);
      return res.status(500).json({ error: 'Erro ao atualizar oficina' });
    }
  },

  async deleteWorkshop(req: Request, res: Response) {
    try {
      const { id } = req.params as any;
      await prisma.oficina.delete({ where: { id } });
      return res.json({ message: 'Oficina excluída com sucesso' });
    } catch (error) {
      console.error('[Fleet] Erro deleteWorkshop:', error);
      return res.status(500).json({ error: 'Erro ao excluir oficina' });
    }
  },

  // ==========================================
  // PREVENTIVE MAINTENANCE ANALYSIS
  // ==========================================
  async analyzePaidOilChanges(req: Request, res: Response) {
    try {
      const paidQuotes = await prisma.quote.findMany({
        where: {
          veiculoId: { not: null },
          status: 'Pago'
        },
        include: {
          items: true,
          veiculo: { include: { client: true } },
          oficina: true
        }
      });

      const oilQuotes = paidQuotes.filter(q => 
        q.items.some(i => i.descricao.toLowerCase().includes('óleo') || i.descricao.toLowerCase().includes('oleo'))
      );

      const alerts = [];

      for (const q of oilQuotes) {
        if (!q.veiculoId) continue;
        
        const osDate = new Date(q.updatedAt);
        const startDate = new Date(osDate);
        startDate.setDate(startDate.getDate() - 5);
        const endDate = new Date(osDate);
        endDate.setDate(endDate.getDate() + 5);

        const motorRecord = await prisma.trocaOleoMotor.findFirst({
          where: {
            veiculoId: q.veiculoId,
            dataTroca: {
              gte: startDate,
              lte: endDate
            }
          }
        });

        const gearRecord = await prisma.trocaOleoCambio.findFirst({
          where: {
            veiculoId: q.veiculoId,
            dataTroca: {
              gte: startDate,
              lte: endDate
            }
          }
        });

        if (!motorRecord && !gearRecord) {
          const oilItems = q.items
            .filter(i => i.descricao.toLowerCase().includes('óleo') || i.descricao.toLowerCase().includes('oleo'))
            .map(i => i.descricao)
            .join(', ');

          alerts.push({
            quoteId: q.id,
            numeroOrcamento: q.numeroOrcamento,
            dataOS: q.updatedAt,
            valorOS: q.total,
            veiculoId: q.veiculoId,
            placa: q.veiculo?.placa,
            clienteNome: q.veiculo?.client?.nome,
            oficinaId: q.oficinaId,
            oficinaNome: q.oficina?.nome,
            oilItems
          });
        }
      }

      alerts.sort((a, b) => new Date(b.dataOS).getTime() - new Date(a.dataOS).getTime());
      
      return res.json(alerts);
    } catch (error) {
      console.error('[Fleet] Erro analyzePaidOilChanges:', error);
      return res.status(500).json({ error: 'Erro ao analisar OS pagas.' });
    }
  },

  // ==========================================
  // PREVENTIVE MAINTENANCE: MOTOR OIL
  // ==========================================
  async listMotorOilChanges(req: Request, res: Response) {
    try {
      const changes = await prisma.trocaOleoMotor.findMany({
        orderBy: { dataTroca: 'desc' },
        include: {
          veiculo: { include: { client: true } },
          oficina: true,
        },
      });
      return res.json(changes);
    } catch (error) {
      console.error('[Fleet] Erro listMotorOilChanges:', error);
      return res.status(500).json({ error: 'Erro ao listar trocas de óleo de motor' });
    }
  },

  async createMotorOilChange(req: Request, res: Response) {
    try {
      const data = createOilMotorSchema.parse(req.body);

      const change = await prisma.trocaOleoMotor.create({
        data,
        include: { veiculo: true, oficina: true },
      });

      // Update KM inside Vehicle
      if (change.kmTroca > change.veiculo.kmAtual) {
        await prisma.vehicle.update({
          where: { id: change.veiculoId },
          data: { kmAtual: change.kmTroca },
        });
      }

      // Add to timeline
      await prisma.vehicleEvent.create({
        data: {
          veiculoId: change.veiculoId,
          tipo: 'TROCA_OLEO_MOTOR',
          data: change.dataTroca,
          km: change.kmTroca,
          descricao: `Troca de óleo do motor na oficina "${change.oficina.nome}". Óleo: ${change.tipoOleo || 'Não especificado'}. Proxima troca programada para ${change.proximaTrocaKm} KM ou ${change.proximaTrocaData.toLocaleDateString('pt-BR')}`,
          valor: change.valor,
          oficinaId: change.oficinaId,
        },
      });

      return res.status(201).json(change);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors });
      }
      console.error('[Fleet] Erro createMotorOilChange:', error);
      return res.status(500).json({ error: 'Erro ao registrar troca de óleo' });
    }
  },

  // ==========================================
  // PREVENTIVE MAINTENANCE: GEAR OIL
  // ==========================================
  async listGearOilChanges(req: Request, res: Response) {
    try {
      const changes = await prisma.trocaOleoCambio.findMany({
        orderBy: { dataTroca: 'desc' },
        include: {
          veiculo: { include: { client: true } },
          oficina: true,
        },
      });
      return res.json(changes);
    } catch (error) {
      console.error('[Fleet] Erro listGearOilChanges:', error);
      return res.status(500).json({ error: 'Erro ao listar trocas de óleo de câmbio' });
    }
  },

  async createGearOilChange(req: Request, res: Response) {
    try {
      const data = createOilGearSchema.parse(req.body);

      const change = await prisma.trocaOleoCambio.create({
        data,
        include: { veiculo: true, oficina: true },
      });

      // Update KM inside Vehicle
      if (change.kmTroca > change.veiculo.kmAtual) {
        await prisma.vehicle.update({
          where: { id: change.veiculoId },
          data: { kmAtual: change.kmTroca },
        });
      }

      // Add to timeline
      await prisma.vehicleEvent.create({
        data: {
          veiculoId: change.veiculoId,
          tipo: 'TROCA_OLEO_CAMBIO',
          data: change.dataTroca,
          km: change.kmTroca,
          descricao: `Troca de óleo do câmbio (${change.tipoCambio}) na oficina "${change.oficina.nome}". Óleo: ${change.oleoUtilizado || 'Não especificado'}. Proxima troca programada para ${change.proximaTrocaKm} KM ou ${change.proximaTrocaData.toLocaleDateString('pt-BR')}`,
          valor: change.valor,
          oficinaId: change.oficinaId,
        },
      });

      return res.status(201).json(change);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors });
      }
      console.error('[Fleet] Erro createGearOilChange:', error);
      return res.status(500).json({ error: 'Erro ao registrar troca de óleo de câmbio' });
    }
  },

  // ==========================================
  // TIMELINE EVENTS CRUD
  // ==========================================
  async createVehicleEvent(req: Request, res: Response) {
    try {
      const data = createEventSchema.parse(req.body);
      const event = await prisma.vehicleEvent.create({ data });

      // If KM event and higher than current, update vehicle km
      if (event.tipo === 'KM' && event.km) {
        const vehicle = await prisma.vehicle.findUnique({ where: { id: event.veiculoId } });
        if (vehicle && event.km > vehicle.kmAtual) {
          await prisma.vehicle.update({
            where: { id: event.veiculoId },
            data: { kmAtual: event.km },
          });
        }
      }

      return res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors });
      }
      console.error('[Fleet] Erro createVehicleEvent:', error);
      return res.status(500).json({ error: 'Erro ao registrar evento do veículo' });
    }
  },

  // ==========================================
  // DASHBOARD INDICATORS
  // ==========================================
  /**
   * GET /fleet/dashboard/sem-manutencao?dias=90&clienteId=
   * Veículos ativos da oficina sem manutenção no período (regra em vehicleMaintenanceStatus).
   */
  async getVehiclesWithoutMaintenance(req: Request, res: Response) {
    try {
      const dias = parsePeriodDays(req.query.dias);
      const clienteId = typeof req.query.clienteId === 'string' && req.query.clienteId ? req.query.clienteId : undefined;

      const allVehicles = await prisma.vehicle.findMany({
        select: {
          id: true, placa: true, marca: true, modelo: true, kmAtual: true, status: true, createdAt: true, clienteId: true,
          client: { select: { nome: true, empresa: true } },
        },
      });
      // Clientes com veículos ativos (opções do filtro), independentes do cliente selecionado
      const clienteNome = (v: typeof allVehicles[number]) => v.client?.empresa || v.client?.nome || '—';
      const clientes = [...new Map(
        allVehicles
          .filter(v => !['INATIVO', 'VENDIDO'].includes((v.status || '').toUpperCase()))
          .map(v => [v.clienteId, { clienteId: v.clienteId, cliente: clienteNome(v) }]),
      ).values()].sort((a, b) => a.cliente.localeCompare(b.cliente, 'pt-BR'));
      const vehicles = clienteId ? allVehicles.filter(v => v.clienteId === clienteId) : allVehicles;
      const ids = vehicles.map(v => v.id);

      const last = new Map<string, Date>();
      const keep = (id: string | null, d: Date | null | undefined) => {
        if (!id || !d) return;
        const cur = last.get(id);
        if (!cur || d > cur) last.set(id, d);
      };

      if (ids.length) {
        // Ordens de Serviço (orçamentos que viraram OS)
        const quotes = await prisma.quote.findMany({
          where: { veiculoId: { in: ids }, status: { not: 'Cancelado' } },
          select: { veiculoId: true, status: true, createdAt: true },
        });
        quotes.filter(q => isServiceOrderStatus(q.status)).forEach(q => keep(q.veiculoId, q.createdAt));

        // Revisões, manutenções e trocas de óleo registradas no veículo
        const events = await prisma.vehicleEvent.groupBy({
          by: ['veiculoId'],
          where: { veiculoId: { in: ids }, tipo: { in: MAINTENANCE_EVENT_TYPES } },
          _max: { data: true },
        });
        events.forEach(e => keep(e.veiculoId, e._max.data));
      }

      const summary = summarizeMaintenance(
        vehicles.map(v => ({
          id: v.id, placa: v.placa, marca: v.marca, modelo: v.modelo, kmAtual: v.kmAtual, status: v.status,
          createdAt: v.createdAt, clienteId: v.clienteId, clienteNome: clienteNome(v),
        })),
        last,
        dias,
      );
      return res.json({ ...summary, clienteId: clienteId || null, clientes });
    } catch (error) {
      console.error('[Fleet] Erro getVehiclesWithoutMaintenance:', error);
      return res.status(500).json({ error: 'Erro ao calcular veículos sem manutenção' });
    }
  },

  /**
   * GET /fleet/dashboard/custos-mensais?meses=3|6|12&clienteId=&veiculoId=
   * Evolução de custos mensais por veículo (só veículos da empresa).
   */
  async getMonthlyCostsByVehicle(req: Request, res: Response) {
    try {
      const meses = parseCostMonths(req.query.meses);
      const clienteId = typeof req.query.clienteId === 'string' && req.query.clienteId ? req.query.clienteId : '';
      const veiculoId = typeof req.query.veiculoId === 'string' && req.query.veiculoId ? req.query.veiculoId : '';

      const all = await prisma.vehicle.findMany({
        select: { id: true, placa: true, marca: true, modelo: true, clienteId: true, client: { select: { nome: true, empresa: true } } },
        orderBy: { placa: 'asc' },
      });
      const vehicles = all.map(v => ({
        id: v.id, placa: v.placa, marca: v.marca, modelo: v.modelo, clienteId: v.clienteId,
        cliente: v.client?.empresa || v.client?.nome || '—',
      }));
      const selected = vehicles.filter(v => (!clienteId || v.clienteId === clienteId) && (!veiculoId || v.id === veiculoId));
      const ids = selected.map(v => v.id);
      const start = costWindowStart(meses);

      const entries: { veiculoId: string; data: Date; valor: number }[] = [];
      if (ids.length) {
        const quotes = await prisma.quote.findMany({
          where: { veiculoId: { in: ids }, status: 'Pago', updatedAt: { gte: start } },
          select: { veiculoId: true, total: true, updatedAt: true },
        });
        quotes.forEach(q => q.veiculoId && entries.push({ veiculoId: q.veiculoId, data: q.updatedAt, valor: q.total || 0 }));
        const events = await prisma.vehicleEvent.findMany({
          where: { veiculoId: { in: ids }, data: { gte: start }, valor: { not: null } },
          select: { veiculoId: true, data: true, valor: true },
        });
        events.forEach(e => entries.push({ veiculoId: e.veiculoId, data: e.data, valor: e.valor || 0 }));
      }

      const clientes = [...new Map(vehicles.map(v => [v.clienteId, { clienteId: v.clienteId, cliente: v.cliente }])).values()]
        .sort((a, b) => a.cliente.localeCompare(b.cliente, 'pt-BR'));
      return res.json({
        ...monthlyCostsByVehicle(selected, entries, meses),
        clienteId: clienteId || null,
        veiculoId: veiculoId || null,
        clientes,
        opcoesVeiculos: vehicles.map(v => ({ veiculoId: v.id, placa: v.placa, modelo: `${v.marca} ${v.modelo}`, clienteId: v.clienteId })),
      });
    } catch (error) {
      console.error('[Fleet] Erro getMonthlyCostsByVehicle:', error);
      return res.status(500).json({ error: 'Erro ao calcular custos mensais por veículo' });
    }
  },

  /**
   * GET /fleet/dashboard/stats?clienteId=
   * Indicadores do Dashboard de Frotas. Com clienteId, tudo é calculado só para
   * os veículos daquele cliente. Custos sempre restritos aos veículos da empresa.
   */
  async getDashboardStats(req: Request, res: Response) {
    try {
      const clienteId = typeof req.query.clienteId === 'string' && req.query.clienteId ? req.query.clienteId : '';
      const vehicleWhere = clienteId ? { clienteId } : {};

      const [totalClients, vehicles] = await Promise.all([
        clienteId ? Promise.resolve(1) : prisma.client.count(),
        prisma.vehicle.findMany({
          where: vehicleWhere,
          select: {
            id: true, status: true, kmAtual: true,
            trocasOleoMotor: { orderBy: { dataTroca: 'desc' }, take: 1 },
            trocasOleoCambio: { orderBy: { dataTroca: 'desc' }, take: 1 },
          },
        }),
      ]);
      const ids = vehicles.map(v => v.id);
      const totalVehicles = vehicles.length;
      const activeVehicles = vehicles.filter(v => v.status === 'ATIVO').length;
      const maintenanceVehicles = vehicles.filter(v => v.status === 'EM_MANUTENCAO').length;

      // Trocas de óleo vencidas e próximas (mesma regra de antes)
      let overdues = 0;
      let approaching = 0;
      const now = new Date();
      for (const v of vehicles) {
        const lastMotor = v.trocasOleoMotor[0];
        if (lastMotor) {
          if (v.kmAtual >= lastMotor.proximaTrocaKm || now > lastMotor.proximaTrocaData) overdues++;
          else if (lastMotor.proximaTrocaKm - v.kmAtual <= 1000) approaching++;
        }
        const lastGear = v.trocasOleoCambio[0];
        if (lastGear) {
          if (v.kmAtual >= lastGear.proximaTrocaKm || now > lastGear.proximaTrocaData) overdues++;
          else if (lastGear.proximaTrocaKm - v.kmAtual <= 2000) approaching++;
        }
      }

      // Custos: eventos com valor + OS pagas, só dos veículos da empresa/cliente
      let eventsTotal = 0;
      let quotesTotal = 0;
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthlyCostsMap: Record<string, number> = {};
      for (let i = 0; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        monthlyCostsMap[`${monthNames[d.getMonth()]}/${d.getFullYear().toString().substring(2)}`] = 0;
      }
      if (ids.length) {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);
        const [eventsAgg, quotesAgg, recentEvents, recentQuotes] = await Promise.all([
          prisma.vehicleEvent.aggregate({ where: { veiculoId: { in: ids } }, _sum: { valor: true } }),
          prisma.quote.aggregate({ where: { veiculoId: { in: ids }, status: 'Pago' }, _sum: { total: true } }),
          prisma.vehicleEvent.findMany({ where: { veiculoId: { in: ids }, data: { gte: sixMonthsAgo }, valor: { not: null } }, select: { data: true, valor: true } }),
          prisma.quote.findMany({ where: { veiculoId: { in: ids }, updatedAt: { gte: sixMonthsAgo }, status: 'Pago' }, select: { updatedAt: true, total: true } }),
        ]);
        eventsTotal = eventsAgg._sum.valor || 0;
        quotesTotal = quotesAgg._sum.total || 0;
        const add = (d: Date, v: number) => {
          const key = `${monthNames[d.getMonth()]}/${d.getFullYear().toString().substring(2)}`;
          if (key in monthlyCostsMap) monthlyCostsMap[key] += v || 0;
        };
        recentEvents.forEach(e => add(new Date(e.data), e.valor || 0));
        recentQuotes.forEach(q => add(new Date(q.updatedAt), q.total || 0));
      }
      const totalCosts = eventsTotal + quotesTotal;
      const monthlyCosts = Object.entries(monthlyCostsMap).map(([month, cost]) => ({ month, cost })).reverse();

      return res.json({
        clienteId: clienteId || null,
        totalClients,
        totalVehicles,
        activeVehicles,
        maintenanceVehicles,
        trocasVencidas: overdues,
        trocasProximas: approaching,
        custosManutencao: totalCosts,
        mediaCustoKm: totalVehicles > 0 ? (totalCosts / (totalVehicles * 25000)) : 0, // Mocked average KM reference
        monthlyCosts,
      });
    } catch (error) {
      console.error('[Fleet] Erro getDashboardStats:', error);
      return res.status(500).json({ error: 'Erro ao gerar estatísticas do dashboard' });
    }
  },

  // ==========================================
  // REPORTS EXPORTS
  // ==========================================
  async getReportData(req: Request, res: Response) {
    try {
      const { type } = req.query as any; // 'preventive', 'costs_vehicle', 'costs_client', 'inactive'
      
      if (type === 'preventive') {
        const vehicles = await prisma.vehicle.findMany({
          include: {
            client: true,
            trocasOleoMotor: { orderBy: { dataTroca: 'desc' }, take: 1 },
            trocasOleoCambio: { orderBy: { dataTroca: 'desc' }, take: 1 },
          },
        });
        const report = vehicles.map((v) => {
          const lastMotor = v.trocasOleoMotor[0];
          const lastGear = v.trocasOleoCambio[0];
          return {
            placa: v.placa,
            marca: v.marca,
            modelo: v.modelo,
            cliente: v.client.nome,
            kmAtual: v.kmAtual,
            statusMotor: lastMotor 
              ? (v.kmAtual >= lastMotor.proximaTrocaKm ? 'Vencida' : 'Em Dia') 
              : 'Sem Registro',
            statusCambio: lastGear 
              ? (v.kmAtual >= lastGear.proximaTrocaKm ? 'Vencida' : 'Em Dia') 
              : 'Sem Registro',
          };
        });
        return res.json(report);
      }

      if (type === 'costs_vehicle') {
        const vehicles = await prisma.vehicle.findMany({
          include: {
            client: true,
            events: { where: { valor: { not: null } } },
          },
        });
        const report = vehicles.map((v) => {
          const total = v.events.reduce((sum, e) => sum + (e.valor || 0), 0);
          return {
            placa: v.placa,
            marca: v.marca,
            modelo: v.modelo,
            cliente: v.client.nome,
            totalGasto: total,
            quantidadeServicos: v.events.length,
          };
        });
        return res.json(report);
      }

      // Default: return all vehicles with details
      const vehicles = await prisma.vehicle.findMany({
        include: { client: true, events: true },
      });
      return res.json(vehicles);
    } catch (error) {
      console.error('[Fleet] Erro getReportData:', error);
      return res.status(500).json({ error: 'Erro ao gerar dados do relatório' });
    }
  },
};
