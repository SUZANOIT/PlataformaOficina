import { prisma, basePrisma } from '../lib/prisma';
import {
  inferTipoDocumentoFromRecord,
  mapLegacyStatus,
  TipoDocumentoFiscal
} from './fiscalXmlParser.service';

export interface FiscalFilters {
  companyId: string;
  ano: number;
  mes?: number;
  tiposDocumento?: TipoDocumentoFiscal[];
  status?: string[];
  cliente?: string;
  fornecedor?: string;
  numeroNota?: string;
  chaveFiscal?: string;
  dataInicial?: string;
  dataFinal?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface UnifiedFiscalDocument {
  id: string;
  source: 'FiscalDocument' | 'NfeImport';
  numeroNota: string;
  serie: string | null;
  tipoDocumento: TipoDocumentoFiscal;
  chaveAcesso: string | null;
  clienteNome: string | null;
  fornecedorNome: string | null;
  dataEmissao: Date | null;
  valorBruto: number;
  valorLiquido: number;
  valorImpostos: number;
  valorTotal: number;
  icms: number;
  ipi: number;
  pis: number;
  cofins: number;
  iss: number;
  irpj: number;
  csll: number;
  status: string;
  origemNota: string;
  usuarioResponsavel: string | null;
  xmlRecebido: boolean;
  nomeArquivo?: string;
}

function sumTaxes(values: Array<number | null | undefined>): number {
  return values.reduce((acc: number, v) => acc + (v || 0), 0);
}

function buildDateRange(filters: FiscalFilters): { gte?: Date; lte?: Date } {
  const range: { gte?: Date; lte?: Date } = {};

  if (filters.dataInicial) {
    range.gte = new Date(filters.dataInicial);
  } else if (filters.ano) {
    const month = filters.mes || 1;
    range.gte = filters.mes
      ? new Date(filters.ano, month - 1, 1)
      : new Date(filters.ano, 0, 1);
  }

  if (filters.dataFinal) {
    const end = new Date(filters.dataFinal);
    end.setHours(23, 59, 59, 999);
    range.lte = end;
  } else if (filters.ano) {
    if (filters.mes) {
      range.lte = new Date(filters.ano, filters.mes, 0, 23, 59, 59, 999);
    } else {
      range.lte = new Date(filters.ano, 11, 31, 23, 59, 59, 999);
    }
  }

  return range;
}

function mapStatusFilter(status: string[]): string[] {
  const expanded = [...status];
  if (status.includes('EMITIDA') && !expanded.includes('IMPORTADO')) expanded.push('IMPORTADO');
  if (status.includes('CANCELADA') && !expanded.includes('CANCELADO')) expanded.push('CANCELADO');
  return expanded;
}

async function getCompanyCnpj(companyId: string): Promise<string> {
  const company = await basePrisma.company.findUnique({
    where: { id: companyId },
    select: { cnpj: true, cnpjSemMascara: true }
  });
  return company?.cnpjSemMascara || company?.cnpj?.replace(/\D/g, '') || '';
}

function mapFiscalDocument(
  doc: any,
  companyCnpj: string
): UnifiedFiscalDocument {
  const tipoDocumento = inferTipoDocumentoFromRecord(doc, companyCnpj);
  const icms = doc.icms || 0;
  const ipi = doc.ipi || 0;
  const pis = doc.pis || 0;
  const cofins = doc.cofins || 0;
  const iss = doc.iss || 0;
  const irpj = doc.irpj || 0;
  const csll = doc.csll || 0;
  const valorTotal = doc.valorTotal || 0;
  const valorImpostos = doc.valorImpostos ?? sumTaxes([icms, ipi, pis, cofins, iss, irpj, csll]);

  return {
    id: doc.id,
    source: 'FiscalDocument',
    numeroNota: doc.numeroNota || doc.numeroDocumento,
    serie: doc.serie || null,
    tipoDocumento: (doc.tipoDocumento as TipoDocumentoFiscal) || tipoDocumento,
    chaveAcesso: doc.chaveAcesso,
    clienteNome: doc.clienteNome || (tipoDocumento === 'SAIDA' ? doc.destinatarioNome : null),
    fornecedorNome: doc.fornecedorNome || (tipoDocumento !== 'SAIDA' ? doc.emitenteNome : null),
    dataEmissao: doc.dataEmissao,
    valorBruto: doc.valorBruto ?? valorTotal,
    valorLiquido: doc.valorLiquido ?? Math.max(valorTotal - valorImpostos, 0),
    valorImpostos,
    valorTotal,
    icms,
    ipi,
    pis,
    cofins,
    iss,
    irpj,
    csll,
    status: mapLegacyStatus(doc.status),
    origemNota: doc.origemNota || 'UPLOAD_MANUAL',
    usuarioResponsavel: doc.usuarioResponsavelNome || null,
    xmlRecebido: !!(doc.xmlContent || doc.fileUrl),
    nomeArquivo: doc.nomeArquivo
  };
}

function mapNfeImport(nfe: any): UnifiedFiscalDocument {
  const items = nfe.items || [];
  const icms = items.reduce((s: number, i: any) => s + (i.icmsValor || 0), 0);
  const ipi = items.reduce((s: number, i: any) => s + (i.ipiValor || 0), 0);
  const pis = items.reduce((s: number, i: any) => s + (i.pisValor || 0), 0);
  const cofins = items.reduce((s: number, i: any) => s + (i.cofinsValor || 0), 0);
  const iss = items.reduce((s: number, i: any) => s + (i.issValor || 0), 0);
  const valorTotal = nfe.valorTotal || 0;
  const irpj = valorTotal * 0.015;
  const csll = valorTotal * 0.01;
  const valorImpostos = icms + ipi + pis + cofins + iss + irpj + csll;
  const hasPecas = items.some((i: any) => i.cfop && /^(1102|2102|1403|2403)/.test(i.cfop));

  return {
    id: nfe.id,
    source: 'NfeImport',
    numeroNota: nfe.numeroNf,
    serie: nfe.serie,
    tipoDocumento: hasPecas ? 'PECAS' : 'ENTRADA',
    chaveAcesso: nfe.chaveAcesso,
    clienteNome: null,
    fornecedorNome: nfe.supplier?.razaoSocial || null,
    dataEmissao: nfe.dataEmissao,
    valorBruto: valorTotal,
    valorLiquido: Math.max(valorTotal - valorImpostos, 0),
    valorImpostos,
    valorTotal,
    icms,
    ipi,
    pis,
    cofins,
    iss,
    irpj,
    csll,
    status: mapLegacyStatus(nfe.status),
    origemNota: 'XML_IMPORTADO',
    usuarioResponsavel: null,
    xmlRecebido: !!nfe.xmlOriginal,
    nomeArquivo: `${nfe.numeroNf}.xml`
  };
}

function applyClientSideFilters(docs: UnifiedFiscalDocument[], filters: FiscalFilters): UnifiedFiscalDocument[] {
  return docs.filter(doc => {
    if (filters.tiposDocumento?.length && !filters.tiposDocumento.includes(doc.tipoDocumento)) return false;
    if (filters.status?.length && !filters.status.includes(doc.status)) return false;
    if (filters.cliente && !(doc.clienteNome || '').toLowerCase().includes(filters.cliente.toLowerCase())) return false;
    if (filters.fornecedor && !(doc.fornecedorNome || '').toLowerCase().includes(filters.fornecedor.toLowerCase())) return false;
    if (filters.numeroNota && !doc.numeroNota.includes(filters.numeroNota)) return false;
    if (filters.chaveFiscal && !(doc.chaveAcesso || '').includes(filters.chaveFiscal)) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = [
        doc.numeroNota,
        doc.chaveAcesso,
        doc.clienteNome,
        doc.fornecedorNome,
        doc.nomeArquivo
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export async function fetchUnifiedDocuments(filters: FiscalFilters): Promise<UnifiedFiscalDocument[]> {
  const companyCnpj = await getCompanyCnpj(filters.companyId);
  const dateRange = buildDateRange(filters);

  const fiscalWhere: any = {
    companyId: filters.companyId,
    tipo: 'XML'
  };

  if (Object.keys(dateRange).length > 0) {
    fiscalWhere.dataEmissao = dateRange;
  }
  if (filters.status?.length) {
    fiscalWhere.status = { in: mapStatusFilter(filters.status) };
  }
  if (filters.numeroNota) {
    fiscalWhere.OR = [
      { numeroNota: { contains: filters.numeroNota, mode: 'insensitive' } },
      { numeroDocumento: { contains: filters.numeroNota, mode: 'insensitive' } }
    ];
  }
  if (filters.chaveFiscal) {
    fiscalWhere.chaveAcesso = { contains: filters.chaveFiscal };
  }

  const nfeWhere: any = { companyId: filters.companyId };
  if (Object.keys(dateRange).length > 0) {
    nfeWhere.dataEmissao = dateRange;
  }
  if (filters.status?.length) {
    nfeWhere.status = { in: mapStatusFilter(filters.status) };
  }
  if (filters.numeroNota) {
    nfeWhere.numeroNf = { contains: filters.numeroNota, mode: 'insensitive' };
  }
  if (filters.chaveFiscal) {
    nfeWhere.chaveAcesso = { contains: filters.chaveFiscal };
  }

  const [fiscalDocs, nfeImports] = await Promise.all([
    basePrisma.fiscalDocument.findMany({
      where: fiscalWhere,
      orderBy: { dataEmissao: 'desc' }
    }),
    basePrisma.nfeImport.findMany({
      where: nfeWhere,
      include: { items: true, supplier: true },
      orderBy: { dataEmissao: 'desc' }
    })
  ]);

  const chavesFiscal = new Set(fiscalDocs.map(d => d.chaveAcesso).filter(Boolean));
  const mappedFiscal = fiscalDocs.map(d => mapFiscalDocument(d, companyCnpj));
  const mappedNfe = nfeImports
    .filter(n => !n.chaveAcesso || !chavesFiscal.has(n.chaveAcesso))
    .map(mapNfeImport);

  const unified = [...mappedFiscal, ...mappedNfe].sort((a, b) => {
    const da = a.dataEmissao ? new Date(a.dataEmissao).getTime() : 0;
    const db = b.dataEmissao ? new Date(b.dataEmissao).getTime() : 0;
    return db - da;
  });

  return applyClientSideFilters(unified, filters);
}

export function yearFromChaveAcesso(chaveAcesso: string | null | undefined): number | null {
  if (!chaveAcesso || chaveAcesso.length < 4) return null;
  const yy = parseInt(chaveAcesso.substring(2, 4), 10);
  if (Number.isNaN(yy)) return null;
  return 2000 + yy;
}

export async function getAvailableYears(companyId: string): Promise<number[]> {
  const [fiscalDates, nfeDates] = await Promise.all([
    basePrisma.fiscalDocument.findMany({
      where: { companyId, dataEmissao: { not: null } },
      select: { dataEmissao: true }
    }),
    basePrisma.nfeImport.findMany({
      where: { companyId },
      select: { dataEmissao: true }
    })
  ]);

  const years = new Set<number>();
  for (const d of [...fiscalDates, ...nfeDates]) {
    if (d.dataEmissao) years.add(new Date(d.dataEmissao).getFullYear());
  }
  years.add(new Date().getFullYear());
  return Array.from(years).sort((a, b) => b - a);
}

function aggregateByType(docs: UnifiedFiscalDocument[], tipo: TipoDocumentoFiscal) {
  const filtered = docs.filter(d => d.tipoDocumento === tipo);
  return {
    quantidade: filtered.length,
    valorTotal: filtered.reduce((s, d) => s + d.valorTotal, 0),
    icms: filtered.reduce((s, d) => s + d.icms, 0),
    ipi: filtered.reduce((s, d) => s + d.ipi, 0),
    pis: filtered.reduce((s, d) => s + d.pis, 0),
    cofins: filtered.reduce((s, d) => s + d.cofins, 0),
    iss: filtered.reduce((s, d) => s + d.iss, 0),
    impostos: filtered.reduce((s, d) => s + d.valorImpostos, 0)
  };
}

export async function getFiscalDashboard(filters: FiscalFilters) {
  const [docs, availableYears] = await Promise.all([
    fetchUnifiedDocuments(filters),
    getAvailableYears(filters.companyId)
  ]);

  const entrada = aggregateByType(docs, 'ENTRADA');
  const saida = aggregateByType(docs, 'SAIDA');
  const servico = aggregateByType(docs, 'SERVICO');
  const pecas = aggregateByType(docs, 'PECAS');

  const totalImpostos = docs.reduce((s, d) => s + d.valorImpostos, 0);
  const receitas = saida.valorTotal + servico.valorTotal + pecas.valorTotal;
  const compras = entrada.valorTotal + pecas.valorTotal;
  const resultadoBruto = receitas - compras;

  const impostosPainel = {
    iss: docs.reduce((s, d) => s + d.iss, 0),
    icms: docs.reduce((s, d) => s + d.icms, 0),
    ipi: docs.reduce((s, d) => s + d.ipi, 0),
    pis: docs.reduce((s, d) => s + d.pis, 0),
    cofins: docs.reduce((s, d) => s + d.cofins, 0),
    irpj: docs.reduce((s, d) => s + d.irpj, 0),
    csll: docs.reduce((s, d) => s + d.csll, 0)
  };

  const qtdServico = servico.quantidade || 0;
  const qtdPecas = pecas.quantidade || 0;
  const qtdTotal = docs.length || 0;

  const ticketMedioServicos = qtdServico > 0 ? servico.valorTotal / qtdServico : 0;
  const ticketMedioPecas = qtdPecas > 0 ? pecas.valorTotal / qtdPecas : 0;
  const ticketMedioGeral = qtdTotal > 0 ? receitas / qtdTotal : 0;
  const margemBruta = resultadoBruto;
  const percentualImpostos = receitas > 0 ? (totalImpostos / receitas) * 100 : 0;

  const monthlyMap = new Map<string, any>();
  for (const doc of docs) {
    if (!doc.dataEmissao) continue;
    const dt = new Date(doc.dataEmissao);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, {
        ano: dt.getFullYear(),
        mes: dt.getMonth() + 1,
        mesLabel: dt.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        entrada: { qtd: 0, valor: 0 },
        saida: { qtd: 0, valor: 0 },
        servico: { qtd: 0, valor: 0 },
        pecas: { qtd: 0, valor: 0 },
        impostos: 0,
        receitas: 0,
        compras: 0
      });
    }
    const row = monthlyMap.get(key);
    row.impostos += doc.valorImpostos;
    if (doc.tipoDocumento === 'ENTRADA') { row.entrada.qtd++; row.entrada.valor += doc.valorTotal; row.compras += doc.valorTotal; }
    if (doc.tipoDocumento === 'SAIDA') { row.saida.qtd++; row.saida.valor += doc.valorTotal; row.receitas += doc.valorTotal; }
    if (doc.tipoDocumento === 'SERVICO') { row.servico.qtd++; row.servico.valor += doc.valorTotal; row.receitas += doc.valorTotal; }
    if (doc.tipoDocumento === 'PECAS') { row.pecas.qtd++; row.pecas.valor += doc.valorTotal; row.receitas += doc.valorTotal; row.compras += doc.valorTotal; }
    row.resultado = row.receitas - row.compras;
  }

  const resumoMensal = Array.from(monthlyMap.values()).sort((a, b) => {
    if (a.ano !== b.ano) return a.ano - b.ano;
    return a.mes - b.mes;
  });

  let crescimentoMensal = 0;
  if (resumoMensal.length >= 2) {
    const current = resumoMensal[resumoMensal.length - 1].receitas;
    const previous = resumoMensal[resumoMensal.length - 2].receitas;
    crescimentoMensal = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  }

  const chartFaturamento = resumoMensal.map(r => ({
    mes: r.mesLabel,
    servicos: r.servico.valor,
    pecas: r.pecas.valor,
    saidas: r.saida.valor
  }));

  const chartCompras = resumoMensal.map(r => ({ mes: r.mesLabel, entradas: r.entrada.valor }));
  const chartImpostos = resumoMensal.map(r => ({
    mes: r.mesLabel,
    iss: r.impostos * 0.1,
    icms: r.impostos * 0.35,
    ipi: r.impostos * 0.1,
    pis: r.impostos * 0.15,
    cofins: r.impostos * 0.15,
    irpj: r.impostos * 0.08,
    csll: r.impostos * 0.07
  }));
  const chartComparativo = resumoMensal.map(r => ({
    mes: r.mesLabel,
    receitas: r.receitas,
    compras: r.compras,
    impostos: r.impostos,
    resultado: r.resultado
  }));

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  const start = (page - 1) * pageSize;
  const paginatedDocs = docs.slice(start, start + pageSize);

  return {
    cards: {
      entrada,
      saida,
      servico,
      pecas,
      totalImpostos,
      resultadoBruto
    },
    impostosPainel: {
      ...impostosPainel,
      total: totalImpostos,
      percentualFaturamento: receitas > 0 ? (totalImpostos / receitas) * 100 : 0
    },
    indicadores: {
      ticketMedioServicos,
      ticketMedioPecas,
      ticketMedioGeral,
      margemBruta,
      percentualImpostos,
      crescimentoMensal
    },
    resumoMensal,
    charts: {
      faturamento: chartFaturamento,
      compras: chartCompras,
      impostos: chartImpostos,
      comparativo: chartComparativo
    },
    documentos: paginatedDocs,
    pagination: {
      page,
      pageSize,
      total: docs.length,
      totalPages: Math.ceil(docs.length / pageSize)
    },
    availableYears,
    filteredAno: filters.ano
  };
}

export async function getMonthDetails(filters: FiscalFilters, ano: number, mes: number) {
  const monthFilters = { ...filters, ano, mes };
  return fetchUnifiedDocuments(monthFilters);
}

export async function searchClients(companyId: string, query: string) {
  return basePrisma.client.findMany({
    where: {
      companyId,
      OR: [
        { nome: { contains: query, mode: 'insensitive' } },
        { empresa: { contains: query, mode: 'insensitive' } },
        { cnpj: { contains: query, mode: 'insensitive' } }
      ]
    },
    take: 10,
    select: { id: true, nome: true, empresa: true, cnpj: true }
  });
}

export async function searchSuppliers(companyId: string, query: string) {
  return basePrisma.supplier.findMany({
    where: {
      companyId,
      OR: [
        { razaoSocial: { contains: query, mode: 'insensitive' } },
        { nomeFantasia: { contains: query, mode: 'insensitive' } },
        { cnpj: { contains: query, mode: 'insensitive' } }
      ]
    },
    take: 10,
    select: { id: true, razaoSocial: true, nomeFantasia: true, cnpj: true }
  });
}

export function documentsToCsvRows(docs: UnifiedFiscalDocument[]): string {
  let csv = '\uFEFF';
  csv += 'Numero;Serie;Tipo;Cliente;Fornecedor;Data Emissao;Valor Bruto;Valor Liquido;Impostos;Status;Chave Fiscal;Origem;Responsavel\r\n';
  for (const d of docs) {
    csv += [
      d.numeroNota,
      d.serie || '',
      d.tipoDocumento,
      d.clienteNome || '',
      d.fornecedorNome || '',
      d.dataEmissao ? new Date(d.dataEmissao).toLocaleDateString('pt-BR') : '',
      d.valorBruto.toFixed(2),
      d.valorLiquido.toFixed(2),
      d.valorImpostos.toFixed(2),
      d.status,
      d.chaveAcesso || '',
      d.origemNota,
      d.usuarioResponsavel || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';') + '\r\n';
  }
  return csv;
}
