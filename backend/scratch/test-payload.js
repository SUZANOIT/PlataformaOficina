const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');

const createTowingQuoteSchema = z.object({
  clienteNome: z.string().optional(),
  clienteEmpresa: z.string().optional(),
  clienteTelefone: z.string().optional(),
  clienteEmail: z.string().optional(),
  clienteDoc: z.string().optional(),

  origemCep: z.string().optional(),
  origemEndereco: z.string().optional(),
  origemNumero: z.string().optional(),
  origemComplemento: z.string().optional(),
  origemCidade: z.string().optional(),
  origemEstado: z.string().optional(),

  destinoCep: z.string().optional(),
  destinoEndereco: z.string().optional(),
  destinoNumero: z.string().optional(),
  destinoComplemento: z.string().optional(),
  destinoCidade: z.string().optional(),
  destinoEstado: z.string().optional(),

  distanciaKm: z.coerce.number().optional(),
  tempoEstimadoMin: z.coerce.number().optional(),

  veiculoPlaca: z.string().optional(),
  veiculoMarca: z.string().optional(),
  veiculoModelo: z.string().optional(),
  veiculoAno: z.string().optional(),
  veiculoCor: z.string().optional(),

  tipoGuincho: z.string().optional(),
  
  driverId: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),

  taxaSaida: z.coerce.number().optional().default(0),
  valorKm: z.coerce.number().optional().default(0),
  horasParadas: z.coerce.number().optional().default(0),
  valorHoraParada: z.coerce.number().optional().default(0),
  pedagios: z.coerce.number().optional().default(0),
  qtdPedagios: z.coerce.number().optional().default(0),
  pedagiosDetalhes: z.any().optional(),
  despesasExtras: z.coerce.number().optional().default(0),
  descontos: z.coerce.number().optional().default(0),
  acrescimos: z.coerce.number().optional().default(0),
  impostos: z.coerce.number().optional().default(0),
  valorTotal: z.coerce.number().optional().default(0),

  observacoes: z.string().optional(),
  status: z.string().optional(),

  // Validação ANTT
  anttTipoCarga: z.string().optional(),
  anttEixos: z.coerce.number().optional().nullable(),
  anttComposicao: z.boolean().optional(),
  anttAltoDesempenho: z.boolean().optional(),
  anttRetornoVazio: z.boolean().optional(),
  anttPisoMinimo: z.coerce.number().optional(),
});

const payload = {
  "clienteNome":"MONTANHEZ ALIMENTOS COMERCIAL LTDA",
  "clienteEmpresa":"",
  "clienteTelefone":"11947881630",
  "clienteEmail":"rafaelsuzano@hotmail.com",
  "clienteDoc":"",
  "origemCep":"04020-041",
  "origemEndereco":"Rua Coronel Lisboa",
  "origemNumero":"805",
  "origemComplemento":"Vila Mariana",
  "origemCidade":"São Paulo",
  "origemEstado":"SP",
  "destinoCep":"07056-010",
  "destinoEndereco":"Rua Independência",
  "destinoNumero":"",
  "destinoComplemento":"Vila Mariana",
  "destinoCidade":"Guarulhos",
  "destinoEstado":"SP",
  "distanciaKm":24.95,
  "tempoEstimadoMin":56,
  "veiculoPlaca":"AAA12",
  "veiculoMarca":"a",
  "veiculoModelo":"a1",
  "veiculoCor":"preto",
  "veiculoAno":"2022",
  "tipoGuincho":"BTT 7330",
  "towingTypeId":"8a551229-94dd-46f0-9720-6aad4150f988",
  "driverId":"2ae22255-7618-42de-b1cd-38af3e2a1895",
  "vehicleId":"95df9b75-11c5-441a-81d6-1c2e2ac132dc",
  "taxaSaida":"3",
  "valorKm":"20",
  "horasParadas":0,
  "valorHoraParada":"3",
  "pedagios":0,
  "qtdPedagios":0,
  "despesasExtras":0,
  "descontos":"22",
  "acrescimos":"2",
  "impostos":"3",
  "valorTotal":485,
  "observacoes":"","status":"Aprovado",
  "anttTipoCarga":"Veículos",
  "anttEixos":2,
  "anttComposicao":false,
  "anttAltoDesempenho":false,
  "anttRetornoVazio":false,
  "anttPisoMinimo":249.86
};

async function test() {
  try {
    // 1. Find or create company
    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({
        data: {
          razaoSocial: "Test Company",
          cnpj: "12345678000100",
          cnpjSemMascara: "12345678000100"
        }
      });
    }

    // 2. Find or create user
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: "Test User",
          email: "test@example.com",
          password: "hashedpassword",
          companyId: company.id
        }
      });
    }

    // 3. Create driver
    const driver = await prisma.towingDriver.create({
      data: {
        nome: "Test Driver",
        cpf: "CPF" + Math.random().toString().substring(2, 10),
        cnh: "123456789",
        categoria: "AE",
        validadeCnh: new Date(),
        companyId: company.id
      }
    });

    // 4. Create vehicle
    const vehicle = await prisma.towingVehicle.create({
      data: {
        placa: "PL" + Math.random().toString().substring(2, 7),
        modelo: "Accelo",
        tipo: "Plataforma",
        companyId: company.id
      }
    });

    // 5. Parse payload and replace IDs
    const modifiedPayload = {
      ...payload,
      driverId: driver.id,
      vehicleId: vehicle.id
    };

    const data = createTowingQuoteSchema.parse(modifiedPayload);
    console.log("Zod parse success");

    const quote = await prisma.towingQuote.create({
      data: {
        ...data,
        companyId: company.id,
        userId: user.id
      }
    });
    console.log("SUCCESS creating quote:", quote.id);
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
