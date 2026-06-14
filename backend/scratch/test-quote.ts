import { z } from 'zod';

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
  valorTotal: z.coerce.number().optional().default(0),

  observacoes: z.string().optional(),

  // Validação ANTT
  anttTipoCarga: z.string().optional(),
  anttEixos: z.coerce.number().optional().nullable(),
  anttComposicao: z.boolean().optional(),
  anttAltoDesempenho: z.boolean().optional(),
  anttRetornoVazio: z.boolean().optional(),
  anttPisoMinimo: z.coerce.number().optional(),
});

const payload = {"clienteNome":"POLICIA MILITAR DO ESTADO DE SAO PAULO","clienteEmpresa":"","clienteTelefone":"11947881630","clienteEmail":"rafaelsuzano@hotmail.com","origemCep":"04020-041","origemEndereco":"Rua Coronel Lisboa","origemNumero":"805","origemCidade":"São Paulo","origemEstado":"SP","destinoCep":"11035001","destinoEndereco":"Avenida Coronel Joaquim Montenegro","destinoNumero":"","destinoCidade":"Santos","destinoEstado":"SP","distanciaKm":78.709,"tempoEstimadoMin":82,"veiculoPlaca":"","veiculoMarca":"","veiculoModelo":"","veiculoCor":"","tipoGuincho":"BTT 7330","driverId":"2ae22255-7618-42de-b1cd-38af3e2a1895","vehicleId":"95df9b75-11c5-441a-81d6-1c2e2ac132dc","taxaSaida":"15","valorKm":"24","horasParadas":0,"valorHoraParada":0,"pedagios":38.7,"despesasExtras":0,"descontos":0,"acrescimos":0,"valorTotal":1942.7160000000001,"observacoes":"","anttTipoCarga":"Veículos","anttEixos":2,"anttComposicao":false,"anttAltoDesempenho":true,"anttRetornoVazio":false,"anttPisoMinimo":422.42,"clienteDoc":"","qtdPedagios":1};

try {
  const result = createTowingQuoteSchema.parse(payload);
  console.log("SUCCESS:", result);
} catch (err: any) {
  if (err instanceof z.ZodError) {
    console.log("ZOD ERROR:", JSON.stringify(err.errors, null, 2));
  } else {
    console.log("OTHER ERROR:", err);
  }
}
