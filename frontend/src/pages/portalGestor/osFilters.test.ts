import { describe, expect, it } from 'vitest';
import { PORTAL_OS_STATUS_FILTERS, canApproveOs, splitOsItems, statusFilterOptions } from './osFilters';

describe('Portal do Cliente — filtros de status das OS', () => {
  it('oferece somente Aguardando aprovação, Emitir nota fiscal e Pagas', () => {
    expect(PORTAL_OS_STATUS_FILTERS.map(o => o.label)).toEqual(['Aguardando aprovação', 'Emitir nota fiscal', 'Pagas']);
    expect(statusFilterOptions('all').map(o => o.value)).toEqual(['Aguardando Aprovação', 'Emitir Nota Fiscal', 'Pago']);
  });

  it('Cobertura (e os demais status) não aparecem como opção do filtro', () => {
    const values = statusFilterOptions('all').map(o => o.value);
    for (const s of ['Cobertura', 'Cancelado', 'Aprovado', 'Aguardando Pagamento', 'Parcialmente Pago']) {
      expect(values).not.toContain(s);
    }
  });

  it('mantém visível o status vindo da URL enquanto estiver selecionado', () => {
    expect(statusFilterOptions('Aguardando Pagamento').map(o => o.value)).toContain('Aguardando Pagamento');
    expect(statusFilterOptions('Pago')).toHaveLength(3);
  });
});

describe('Portal do Cliente — botão Aprovar OS', () => {
  it('aparece somente para OS aguardando aprovação', () => {
    expect(canApproveOs({ aguardandoAprovacao: true })).toBe(true);
    expect(canApproveOs({ aguardandoAprovacao: false })).toBe(false);
    expect(canApproveOs({})).toBe(false);
    expect(canApproveOs(null)).toBe(false);
  });

  it('separa serviços e peças/materiais para a confirmação', () => {
    const { pecas, servicos } = splitOsItems([
      { tipo: 'Peça', d: 'Pastilha' }, { tipo: 'Mão de Obra', d: 'Troca' }, { tipo: 'Produto', d: 'Óleo' }, { tipo: 'Serviço', d: 'Alinhamento' },
    ]);
    expect(pecas.map(i => i.d)).toEqual(['Pastilha', 'Óleo']);
    expect(servicos.map(i => i.d)).toEqual(['Troca', 'Alinhamento']);
  });
});
