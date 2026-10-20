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
