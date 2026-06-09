export type TipoDocumentoFiscal = 'ENTRADA' | 'SAIDA' | 'SERVICO';

export interface FiscalFilters {
  ano: number;
  mes?: number;
  tiposDocumento: TipoDocumentoFiscal[];
  status: string[];
  cliente: string;
  fornecedor: string;
  numeroNota: string;
  chaveFiscal: string;
  dataInicial: string;
  dataFinal: string;
  search: string;
  page: number;
  pageSize: number;
}

export interface TypeSummary {
  quantidade: number;
  valorTotal: number;
  icms: number;
  ipi: number;
  pis: number;
  cofins: number;
  iss: number;
  impostos: number;
}

export interface MonthlyRow {
  ano: number;
  mes: number;
  mesLabel: string;
  entrada: { qtd: number; valor: number };
  saida: { qtd: number; valor: number };
  servico: { qtd: number; valor: number };
  impostos: number;
  receitas: number;
  compras: number;
  resultado: number;
}

export interface UnifiedDoc {
  id: string;
  source: string;
  numeroNota: string;
  serie: string | null;
  tipoDocumento: TipoDocumentoFiscal;
  fluxoFinanceiro?: 'ENTRADA' | 'SAIDA';
  chaveAcesso: string | null;
  clienteNome: string | null;
  fornecedorNome: string | null;
  dataEmissao: string | null;
  valorBruto: number;
  valorLiquido: number;
  valorImpostos: number;
  valorTotal: number;
  icms?: number;
  ipi?: number;
  pis?: number;
  cofins?: number;
  iss?: number;
  irpj?: number;
  csll?: number;
  status: string;
  origemNota: string;
  usuarioResponsavel: string | null;
  xmlRecebido: boolean;
  nomeArquivo?: string;
}

export interface AccountingTypeCell {
  quantidade: number;
  valorTotal: number;
  comXml: number;
}

export interface AccountingMonthRow {
  ano: number;
  mes: number;
  mesLabel: string;
  tipos: Record<TipoDocumentoFiscal, AccountingTypeCell>;
  totalDocumentos: number;
  totalComXml: number;
}

export interface AccountingSummaryData {
  ano: number;
  summary: AccountingMonthRow[];
  availableYears: number[];
}

export const TIPO_PASTA_LABEL: Record<TipoDocumentoFiscal, string> = {
  ENTRADA: 'Entradas',
  SAIDA: 'Saídas',
  SERVICO: 'Serviços'
};

export const TIPO_BADGE_COLOR: Record<TipoDocumentoFiscal, string> = {
  ENTRADA: 'bg-blue-500/10 text-blue-600',
  SAIDA: 'bg-emerald-500/10 text-emerald-600',
  SERVICO: 'bg-violet-500/10 text-violet-600'
};

export interface DashboardData {
  cards: {
    entrada: TypeSummary;
    saida: TypeSummary;
    servico: TypeSummary;
    totalImpostos: number;
    resultadoBruto: number;
  };
  impostosPainel: {
    iss: number;
    icms: number;
    ipi: number;
    pis: number;
    cofins: number;
    irpj: number;
    csll: number;
    total: number;
    percentualFaturamento: number;
  };
  indicadores: {
    ticketMedioServicos: number;
    ticketMedioSaida: number;
    ticketMedioGeral: number;
    margemBruta: number;
    percentualImpostos: number;
    crescimentoMensal: number;
  };
  resumoMensal: MonthlyRow[];
  charts: {
    faturamento: Array<{ mes: string; servicos: number; saidas: number }>;
    compras: Array<{ mes: string; entradas: number }>;
    impostos: Array<{ mes: string; iss: number; icms: number; ipi: number; pis: number; cofins: number; irpj: number; csll: number }>;
    comparativo: Array<{ mes: string; receitas: number; compras: number; impostos: number; resultado: number }>;
  };
  documentos: UnifiedDoc[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  availableYears: number[];
  filteredAno: number;
}

export const TIPOS_DOCUMENTO: { value: TipoDocumentoFiscal; label: string }[] = [
  { value: 'ENTRADA', label: 'NF Entrada' },
  { value: 'SAIDA', label: 'NF Saída' },
  { value: 'SERVICO', label: 'NF Serviço' }
];

export const STATUS_OPTIONS = [
  'EMITIDA', 'CANCELADA', 'INUTILIZADA', 'PENDENTE', 'REJEITADA'
];

export const MESES = [
  { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' }, { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' }, { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' }, { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' }
];

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function yearFromChaveAcesso(chaveAcesso?: string | null): number | null {
  if (!chaveAcesso || chaveAcesso.length < 4) return null;
  const yy = parseInt(chaveAcesso.substring(2, 4), 10);
  if (Number.isNaN(yy)) return null;
  return 2000 + yy;
}

export function buildFilterParams(filters: FiscalFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set('ano', String(filters.ano));
  if (filters.mes) params.set('mes', String(filters.mes));
  if (filters.tiposDocumento.length) params.set('tiposDocumento', filters.tiposDocumento.join(','));
  if (filters.status.length) params.set('status', filters.status.join(','));
  if (filters.cliente) params.set('cliente', filters.cliente);
  if (filters.fornecedor) params.set('fornecedor', filters.fornecedor);
  if (filters.numeroNota) params.set('numeroNota', filters.numeroNota);
  if (filters.chaveFiscal) params.set('chaveFiscal', filters.chaveFiscal);
  if (filters.dataInicial) params.set('dataInicial', filters.dataInicial);
  if (filters.dataFinal) params.set('dataFinal', filters.dataFinal);
  if (filters.search) params.set('search', filters.search);
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));
  return params;
}
