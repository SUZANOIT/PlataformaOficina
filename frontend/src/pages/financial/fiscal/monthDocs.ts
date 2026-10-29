import type { TipoDocumentoFiscal, UnifiedDoc } from './types';

export type MonthTipoFiltro = 'TODOS' | TipoDocumentoFiscal;

export function filterMonthDocuments(
  docs: UnifiedDoc[],
  tipo: MonthTipoFiltro,
  busca: string
): UnifiedDoc[] {
  const query = busca.trim().toLowerCase();
  return docs.filter((doc) => {
    if (tipo !== 'TODOS' && doc.tipoDocumento !== tipo) return false;
    if (!query) return true;
    const haystack = [doc.numeroNota, doc.serie, doc.clienteNome, doc.fornecedorNome, doc.chaveAcesso]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function sumMonthDocuments(docs: UnifiedDoc[]) {
  return docs.reduce(
    (acc, doc) => {
      acc.bruto += doc.valorBruto;
      acc.liquido += doc.valorLiquido;
      acc.impostos += doc.valorImpostos;
      return acc;
    },
    { bruto: 0, liquido: 0, impostos: 0 }
  );
}

export function countMonthDocumentsByTipo(docs: UnifiedDoc[]): Record<MonthTipoFiltro, number> {
  return {
    TODOS: docs.length,
    ENTRADA: docs.filter((doc) => doc.tipoDocumento === 'ENTRADA').length,
    SAIDA: docs.filter((doc) => doc.tipoDocumento === 'SAIDA').length,
    SERVICO: docs.filter((doc) => doc.tipoDocumento === 'SERVICO').length,
  };
}
