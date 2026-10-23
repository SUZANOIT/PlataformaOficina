export const TIPOS_IMPOSTO = [
  'DAS', 'Simples Nacional', 'FGTS', 'INSS', 'IRRF',
  'PIS', 'COFINS', 'CSLL', 'ICMS', 'ISS', 'IPI', 'DARF', 'GPS', 'GARE', 'Outros',
];

export const STATUS_IMPOSTO = [
  'Aguardando envio', 'Enviado', 'Recebido', 'Pago', 'Em atraso', 'Reenviado', 'Cancelado',
];

export function apiErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
  return typeof message === 'string' && message ? message : fallback;
}
