export const QUOTE_STATUS_OPTIONS = [
  'Aguardando Aprovação',
  'Aprovado',
  'Aguardando Pagamento',
  'Emitir Nota Fiscal',
  'Cobertura',
  'Pago',
  'Cancelado'
] as const;

export type QuoteStatus = typeof QUOTE_STATUS_OPTIONS[number];
