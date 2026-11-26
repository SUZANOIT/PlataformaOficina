/**
 * Regras de exibição da lista de Ordens de Serviço do Portal do Cliente.
 * Só interface: os status internos do sistema continuam os mesmos.
 */

/** Únicos filtros de status oferecidos ao cliente (o valor é o status interno). */
export const PORTAL_OS_STATUS_FILTERS = [
  { value: 'Aguardando Aprovação', label: 'Aguardando aprovação' },
  { value: 'Emitir Nota Fiscal', label: 'Emitir nota fiscal' },
  { value: 'Pago', label: 'Pagas' },
] as const;

/**
 * Opções do select de status. Se a tela foi aberta com outro status na URL
 * (ex.: link "Ver as OS somadas" do Dashboard), ele aparece só enquanto estiver selecionado.
 */
export function statusFilterOptions(current: string): { value: string; label: string }[] {
  const base: { value: string; label: string }[] = PORTAL_OS_STATUS_FILTERS.map(o => ({ ...o }));
  if (current && current !== 'all' && !base.some(o => o.value === current)) base.push({ value: current, label: current });
  return base;
}

/** O botão "Aprovar OS" aparece somente para OS aguardando aprovação. */
export const canApproveOs = (os: { aguardandoAprovacao?: boolean } | null | undefined) => !!os?.aguardandoAprovacao;

const PART_TYPES = ['peça', 'peca', 'produto'];
export const isPartItem = (tipo?: string | null) => PART_TYPES.includes((tipo || '').trim().toLowerCase());

/** Separa os itens da OS em serviços e peças/materiais (mesma classificação do backend). */
export function splitOsItems<T extends { tipo?: string | null }>(items: T[] = []) {
  return {
    pecas: items.filter(i => isPartItem(i.tipo)),
    servicos: items.filter(i => !isPartItem(i.tipo)),
  };
}
