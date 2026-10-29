import { describe, expect, it } from 'vitest';
import type { UnifiedDoc } from './types';
import { countMonthDocumentsByTipo, filterMonthDocuments, sumMonthDocuments } from './monthDocs';

function doc(partial: Partial<UnifiedDoc> & Pick<UnifiedDoc, 'id' | 'tipoDocumento' | 'numeroNota'>): UnifiedDoc {
  return {
    source: 'FiscalDocument',
    serie: '1',
    chaveAcesso: null,
    clienteNome: null,
    fornecedorNome: null,
    dataEmissao: '2026-09-15T19:14:46.000Z',
    valorBruto: 0,
    valorLiquido: 0,
    valorImpostos: 0,
    valorTotal: 0,
    status: 'EMITIDA',
    origemNota: 'XML',
    usuarioResponsavel: null,
    xmlRecebido: true,
    ...partial,
  };
}

const docs = [
  doc({ id: '1', tipoDocumento: 'SAIDA', numeroNota: '162', clienteNome: 'QFROTAS SISTEMAS LTDA', valorBruto: 8178.75, valorLiquido: 8178.75, valorImpostos: 204.47 }),
  doc({ id: '2', tipoDocumento: 'ENTRADA', numeroNota: '780468', fornecedorNome: 'MSAM Distribuidora de Pecas Ltda', valorBruto: 783.71, valorLiquido: 783.71, valorImpostos: 19.59, chaveAcesso: '35260904935166000150550010007804681461064667' }),
  doc({ id: '3', tipoDocumento: 'SERVICO', numeroNota: '900', clienteNome: 'Oficina Centro', valorBruto: 100, valorLiquido: 95, valorImpostos: 5 }),
];

describe('documentos do mês', () => {
  it('separa notas de entrada, saída e serviço', () => {
    expect(filterMonthDocuments(docs, 'ENTRADA', '').map((item) => item.numeroNota)).toEqual(['780468']);
    expect(filterMonthDocuments(docs, 'SAIDA', '').map((item) => item.numeroNota)).toEqual(['162']);
    expect(filterMonthDocuments(docs, 'SERVICO', '').map((item) => item.numeroNota)).toEqual(['900']);
    expect(filterMonthDocuments(docs, 'TODOS', '')).toHaveLength(3);
  });

  it('busca por número, parte e chave sem misturar o tipo escolhido', () => {
    expect(filterMonthDocuments(docs, 'TODOS', 'msam').map((item) => item.numeroNota)).toEqual(['780468']);
    expect(filterMonthDocuments(docs, 'SAIDA', '780468')).toEqual([]);
    expect(filterMonthDocuments(docs, 'ENTRADA', '461064667')).toHaveLength(1);
  });

  it('soma e conta só o conjunto filtrado', () => {
    const entradas = filterMonthDocuments(docs, 'ENTRADA', '');
    expect(sumMonthDocuments(entradas)).toEqual({ bruto: 783.71, liquido: 783.71, impostos: 19.59 });
    expect(countMonthDocumentsByTipo(docs)).toEqual({ TODOS: 3, ENTRADA: 1, SAIDA: 1, SERVICO: 1 });
  });
});
