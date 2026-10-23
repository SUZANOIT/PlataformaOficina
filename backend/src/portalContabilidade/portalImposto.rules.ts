export const TIPOS_IMPOSTO = [
  'DAS',
  'Simples Nacional',
  'FGTS',
  'INSS',
  'IRRF',
  'PIS',
  'COFINS',
  'CSLL',
  'ICMS',
  'ISS',
  'IPI',
  'DARF',
  'GPS',
  'GARE',
  'Outros',
] as const;

export const STATUS_IMPOSTO = [
  'Aguardando envio',
  'Enviado',
  'Recebido',
  'Pago',
  'Em atraso',
  'Reenviado',
  'Cancelado',
] as const;

export const MAX_PDF_BYTES = 20 * 1024 * 1024;

export interface PortalRoleFlags {
  admin: boolean;
  contabilidade: boolean;
  contasPagar: boolean;
  contasReceber: boolean;
}

export interface PortalAccess {
  canRead: boolean;
  canManage: boolean;
  scope: 'all' | 'company';
}

export function resolvePortalAccess(flags: PortalRoleFlags): PortalAccess {
  const canManage = flags.admin || flags.contabilidade;
  const canRead = canManage || flags.contasPagar || flags.contasReceber;
  return {
    canRead,
    canManage,
    scope: canManage ? 'all' : 'company',
  };
}

export function parseValorBrasileiro(input: unknown): number | null {
  if (typeof input === 'number') {
    if (!Number.isFinite(input) || input <= 0) return null;
    return Math.round(input * 100) / 100;
  }

  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  let normalized = trimmed.replace(/\s/g, '').replace(/^R\$\s?/i, '');
  if (normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, '');
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

export function isValidCompetencia(value: string): boolean {
  return /^(0[1-9]|1[0-2])\/\d{4}$/.test(value);
}

const MAX_MESES_FILTRO = 240;

export function competenciasEntre(de?: string, ate?: string): string[] | null {
  const inicio = de && isValidCompetencia(de) ? de : null;
  const fim = ate && isValidCompetencia(ate) ? ate : null;
  if (!inicio && !fim) return null;

  const toIndex = (value: string) => {
    const [mes, ano] = value.split('/').map(Number);
    return ano * 12 + (mes - 1);
  };
  const first = inicio ? toIndex(inicio) : toIndex(fim!) - (MAX_MESES_FILTRO - 1);
  const last = fim ? toIndex(fim) : toIndex(inicio!) + (MAX_MESES_FILTRO - 1);
  if (first > last) return [];

  const meses: string[] = [];
  for (let index = first; index <= last && meses.length < MAX_MESES_FILTRO; index += 1) {
    const mes = String((index % 12) + 1).padStart(2, '0');
    meses.push(`${mes}/${Math.floor(index / 12)}`);
  }
  return meses;
}

export function competenciaDeData(value?: string): string | null {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(value || '');
  return match ? `${match[2]}/${match[1]}` : null;
}

export function competenciaAtual(offsetMeses = 0, hoje = new Date()): string {
  const data = new Date(hoje.getFullYear(), hoje.getMonth() + offsetMeses, 1);
  return `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
}

export interface ResumoImpostoRow {
  competencia: string;
  tipoImposto: string;
  valor: number;
  quantidade: number;
}

export function montarResumoMensal(meses: string[], rows: ResumoImpostoRow[]) {
  const tipos = Array.from(new Set(rows.map((row) => row.tipoImposto))).sort();
  const linhas = meses.map((competencia) => ({
    competencia,
    total: 0,
    quantidade: 0,
    porTipo: {} as Record<string, number>,
  }));
  const porMes = new Map(linhas.map((linha) => [linha.competencia, linha]));
  const totalPorTipo: Record<string, number> = {};

  for (const row of rows) {
    const linha = porMes.get(row.competencia);
    if (!linha) continue;
    linha.porTipo[row.tipoImposto] = (linha.porTipo[row.tipoImposto] || 0) + row.valor;
    linha.total += row.valor;
    linha.quantidade += row.quantidade;
    totalPorTipo[row.tipoImposto] = (totalPorTipo[row.tipoImposto] || 0) + row.valor;
  }

  return {
    tipos,
    linhas,
    totalPorTipo,
    total: linhas.reduce((sum, linha) => sum + linha.total, 0),
    quantidade: linhas.reduce((sum, linha) => sum + linha.quantidade, 0),
  };
}

export const MAX_ARQUIVOS_POR_ENVIO = 1;

export function parseBoleto(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (['sim', 'true', '1', 's'].includes(normalized)) return true;
  if (['nao', 'false', '0', 'n'].includes(normalized)) return false;
  return null;
}

export function validarQuantidadeArquivos(quantidade: number): string | null {
  if (quantidade === 0) return 'Nenhum arquivo enviado para importação';
  if (quantidade > MAX_ARQUIVOS_POR_ENVIO) return 'Envie apenas um arquivo por vez. A importação em lote não é permitida.';
  return null;
}

export function possuiBoleto(anexo?: { arquivo?: string | null; tipo?: string | null; nome?: string | null } | null): boolean {
  if (!anexo?.arquivo) return false;
  return /pdf/i.test(anexo.tipo || '') || /\.pdf$/i.test(anexo.nome || '');
}

export function parseVencimento(value: string): Date | null {
  if (!value || typeof value !== 'string') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isValidCnpj(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj)) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const digit = (base: string, factors: number[]) => {
    const sum = base.split('').reduce((acc, char, index) => acc + Number(char) * factors[index], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const first = digit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = digit(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cnpj.endsWith(`${first}${second}`);
}

export function extractCnpjFromFilename(filename: string): string | null {
  const match = filename.replace(/[.\-/\s]/g, '').match(/\d{14}/);
  return match ? match[0] : null;
}

export function validateBulkFile(file: { originalname: string; size: number }):
  | { ok: true; cnpj: string | null }
  | { ok: false; motivo: string } {
  if (!file.originalname) return { ok: false, motivo: 'Nome do arquivo ausente.' };
  if (!file.originalname.toLowerCase().endsWith('.pdf')) {
    return { ok: false, motivo: 'Apenas arquivos PDF são permitidos.' };
  }
  if (file.size > MAX_PDF_BYTES) return { ok: false, motivo: 'O arquivo excede o limite de 20 MB.' };

  return { ok: true, cnpj: extractCnpjFromFilename(file.originalname) };
}

export function validateLoteMetadata(input: {
  competencia?: string;
  tipoImposto?: string;
  vencimento?: string;
  valor?: unknown;
}): { ok: true; competencia: string; tipoImposto: string; vencimento: Date; valor: number } | { ok: false; motivo: string } {
  const competencia = (input.competencia || '').trim();
  const tipoImposto = (input.tipoImposto || '').trim();
  const vencimentoRaw = (input.vencimento || '').trim();

  if (!isValidCompetencia(competencia)) {
    return { ok: false, motivo: 'Competência deve estar no formato MM/AAAA.' };
  }
  if (!TIPOS_IMPOSTO.includes(tipoImposto as (typeof TIPOS_IMPOSTO)[number])) {
    return { ok: false, motivo: 'Tipo de imposto inválido.' };
  }
  const vencimento = parseVencimento(vencimentoRaw);
  if (!vencimento) return { ok: false, motivo: 'Data de vencimento inválida.' };

  const valor = parseValorBrasileiro(input.valor) ?? 0;

  return { ok: true, competencia, tipoImposto, vencimento, valor };
}

export function duplicateMotivo(): string {
  return 'Arquivo já importado para esta empresa, competência e tipo de imposto.';
}

export async function processBatch<T>(
  files: Array<{ originalname: string }>,
  handler: (file: { originalname: string }, index: number) => Promise<T>
): Promise<{ sucesso: T[]; erros: Array<{ arquivo: string; motivo: string }> }> {
  const sucesso: T[] = [];
  const erros: Array<{ arquivo: string; motivo: string }> = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    try {
      sucesso.push(await handler(file, index));
    } catch (error: any) {
      erros.push({
        arquivo: file.originalname,
        motivo: error?.message || 'Erro inesperado.',
      });
    }
  }

  return { sucesso, erros };
}
