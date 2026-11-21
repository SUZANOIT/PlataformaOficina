/**
 * Montagem das seções do cockpit do veículo (Orçamentos, OS, Manutenção, Peças,
 * Documentos e Finanças/DRE) a partir dos dados já carregados.
 *
 * Usado por:
 *  - Gestão de Frotas (fleetController.getVehicleDetails) com audience 'admin'
 *  - Portal do Gestor de Frota com audience 'portal', que remove dados internos
 *    da oficina (contas a pagar, anexos de fornecedores e custo de compra de peças).
 */

export type VehicleDetailsAudience = 'admin' | 'portal';

// Status que caracterizam uma Ordem de Serviço (mesma regra do cockpit da frota)
export const OS_STATUSES = ['Aprovado', 'Emitir Nota Fiscal', 'Cobertura', 'Pago'];
export const BILLED_STATUSES = ['Pago', 'Aprovado', 'Emitir Nota Fiscal', 'Cobertura'];

export const isOrdemServico = (q: { status: string; osExterna?: string | null }) =>
  OS_STATUSES.includes(q.status) || !!q.osExterna;

/** Remove campos internos (custo de compra do fornecedor) dos itens de um orçamento. */
export function sanitizeQuoteItemForPortal(item: any) {
  const { valorCompraFornecedor, ...rest } = item;
  return rest;
}

/** Remove relações e campos internos de um orçamento antes de enviar ao portal. */
export function sanitizeQuoteForPortal(q: any) {
  const {
    linkedPayables,
    financialReceivables,
    linkedReceivables,
    company,
    mecanico,
    mecanicoId,
    isCloned,
    clonedFromId,
    history,
    ...rest
  } = q;
  return {
    ...rest,
    items: (q.items || []).map(sanitizeQuoteItemForPortal),
  };
}

export function buildVehicleSections(vehicle: any, quotes: any[], audience: VehicleDetailsAudience = 'admin') {
  const isPortal = audience === 'portal';

  const orcamentosRaw = quotes.filter(q => !isOrdemServico(q));
  const ordensServicoRaw = quotes.filter(q => isOrdemServico(q));

  // Histórico de manutenção: combine trocas de óleo and general events
  const manutencoes = [
    ...(vehicle.trocasOleoMotor || []).map((t: any) => ({
      id: t.id,
      tipo: 'TROCA_OLEO_MOTOR',
      data: t.dataTroca,
      km: t.kmTroca,
      descricao: `Troca de Óleo do Motor (${t.tipoOleo || 'N/A'}) - Oficina: ${t.oficina?.nome || 'MCA'}`,
      valor: t.valor,
      proximaTroca: `Próxima: ${t.proximaTrocaKm} KM ou ${t.proximaTrocaData.toLocaleDateString('pt-BR')}`
    })),
    ...(vehicle.trocasOleoCambio || []).map((t: any) => ({
      id: t.id,
      tipo: 'TROCA_OLEO_CAMBIO',
      data: t.dataTroca,
      km: t.kmTroca,
      descricao: `Troca de Óleo do Câmbio (${t.tipoCambio}) - Oficina: ${t.oficina?.nome || 'MCA'}`,
      valor: t.valor,
      proximaTroca: `Próxima: ${t.proximaTrocaKm} KM ou ${t.proximaTrocaData.toLocaleDateString('pt-BR')}`
    })),
    ...(vehicle.events || []).map((e: any) => ({
      id: e.id,
      tipo: e.tipo,
      data: e.data,
      km: e.km,
      descricao: e.descricao,
      valor: e.valor || 0,
      proximaTroca: null as any
    }))
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  // Peças utilizadas: extract items from quotes/OS where tipo is "Peça" or "Peca"
  const pecas: any[] = [];
  const pecasSet = new Set<string>();

  quotes.forEach(q => {
    (q.items || []).forEach((item: any) => {
      if (item.tipo && (item.tipo.toLowerCase() === 'peça' || item.tipo.toLowerCase() === 'peca')) {
        const key = `${item.descricao.toLowerCase()}_${item.valorUnitario}`;
        if (!pecasSet.has(key)) {
          pecasSet.add(key);
          pecas.push({
            descricao: item.descricao,
            codigoPeca: item.codigoPeca || null,
            tipoPeca: item.tipoPeca || null,
            quantidade: item.quantidade,
            valorUnitario: item.valorUnitario,
            valorTotal: item.valorTotal,
            data: q.createdAt,
            numeroOrcamento: q.numeroOrcamento,
            status: q.status
          });
        } else {
          // Aggregate quantity/totals
          const existing = pecas.find(p => p.descricao.toLowerCase() === item.descricao.toLowerCase() && p.valorUnitario === item.valorUnitario);
          if (existing) {
            existing.quantidade += item.quantidade;
            existing.valorTotal += item.valorTotal;
          }
        }
      }
    });
  });

  // Anexos e documentos: gather from financial payables/receivables linked to quotes
  const documentos: any[] = [];
  const docUrls = new Set<string>();

  const pushDoc = (att: any, origem: string) => {
    if (docUrls.has(att.fileUrl)) return;
    docUrls.add(att.fileUrl);
    documentos.push({
      id: att.id,
      nome: att.fileName,
      tipo: att.fileType,
      url: att.fileUrl,
      origem,
      data: att.createdAt
    });
  };

  quotes.forEach(q => {
    (q.financialReceivables || []).forEach((r: any) => {
      (r.attachments || []).forEach((att: any) => pushDoc(att, `Recebível #${r.numeroRecebimento} - ${r.descricao}`));
    });

    (q.linkedReceivables || []).forEach((link: any) => {
      (link.receivable?.attachments || []).forEach((att: any) =>
        pushDoc(att, `Recebível #${link.receivable.numeroRecebimento} - ${link.receivable.descricao}`));
    });

    // Anexos de Contas a Pagar são documentos internos da oficina (NF de fornecedor etc.)
    if (!isPortal) {
      (q.linkedPayables || []).forEach((link: any) => {
        (link.payable?.attachments || []).forEach((att: any) =>
          pushDoc(att, `Contas a Pagar #${link.payable.numeroLancamento} - ${link.payable.descricao}`));
      });
    }
  });

  // Histórico financeiro: Payables and Receivables
  const financeiro: any[] = [];

  quotes.forEach(q => {
    (q.financialReceivables || []).forEach((r: any) => {
      financeiro.push({
        id: r.id,
        tipo: 'RECEITA',
        numero: r.numeroRecebimento,
        descricao: r.descricao,
        valor: r.valor,
        vencimento: r.vencimento,
        dataLiquidacao: r.dataRecebimento,
        status: r.status
      });
    });

    (q.linkedReceivables || []).forEach((link: any) => {
      financeiro.push({
        id: link.receivable.id,
        tipo: 'RECEITA',
        numero: link.receivable.numeroRecebimento,
        descricao: link.receivable.descricao,
        valor: link.valorVinculado,
        vencimento: link.receivable.vencimento,
        dataLiquidacao: link.receivable.dataRecebimento,
        status: link.receivable.status
      });
    });

    // Contas a Pagar = custo interno da oficina: nunca exibido no portal
    if (!isPortal) {
      (q.linkedPayables || []).forEach((link: any) => {
        financeiro.push({
          id: link.payable.id,
          tipo: 'DESPESA',
          numero: link.payable.numeroLancamento,
          descricao: link.payable.descricao,
          valor: link.valorVinculado,
          vencimento: link.payable.vencimento,
          dataLiquidacao: link.payable.dataPagamento,
          status: link.payable.status
        });
      });
    }

    // Fallback faturamento: If the quote has no direct receivables and no linked receivables, but it is an approved or paid quote,
    // we add the quote itself as a faturamento entry so that it does not show R$ 0,00.
    if ((q.financialReceivables || []).length === 0 && (q.linkedReceivables || []).length === 0 && BILLED_STATUSES.includes(q.status)) {
      financeiro.push({
        id: `quote-${q.id}`,
        tipo: 'RECEITA',
        numero: q.numeroOrcamento,
        descricao: `Faturamento ref. Orçamento #${q.numeroOrcamento} (${q.status})`,
        valor: q.total,
        vencimento: q.updatedAt,
        dataLiquidacao: q.updatedAt,
        status: q.status === 'Pago' ? 'RECEBIDA' : 'PENDENTE'
      });
    }
  });

  // Add maintenance events that have a cost (valor) to the financial history as DESPESA
  // (somente na Gestão de Frotas; o Portal do Gestor mostra apenas os valores das OS)
  manutencoes.forEach(m => {
    if (!isPortal && m.valor > 0) {
      financeiro.push({
        id: m.id,
        tipo: 'DESPESA_MANUTENCAO',
        numero: null,
        descricao: m.descricao,
        valor: m.valor,
        vencimento: m.data,
        dataLiquidacao: m.data,
        status: 'PAGO'
      });
    }
  });

  financeiro.sort((a, b) => new Date(b.vencimento).getTime() - new Date(a.vencimento).getTime());

  const orcamentos = isPortal ? orcamentosRaw.map(sanitizeQuoteForPortal) : orcamentosRaw;
  const ordensServico = isPortal ? ordensServicoRaw.map(sanitizeQuoteForPortal) : ordensServicoRaw;

  return { orcamentos, ordensServico, manutencoes, pecas, documentos, financeiro };
}
