/**
 * Regra de geração de Contas a Receber na aprovação de um orçamento parcelado.
 * Compartilhada entre a edição do orçamento pela oficina (QuoteController.update)
 * e a aprovação feita pelo cliente no Portal do Gestor de Frota.
 */
export const PENDING_QUOTE_STATUSES = ['Orçamento', 'Em Andamento', 'Aguardando Aprovação'];

export const isPendingQuoteStatus = (status?: string | null) =>
  !!status && PENDING_QUOTE_STATUSES.includes(status);

interface BuildParams {
  status: string;
  condicaoPagamento: string;
  valorEntrada?: number | null;
  parcelas?: number | null;
  total: number;
  clientNome: string;
  companyId: string;
  existingReceivablesCount: number;
  now?: Date;
}

export function buildApprovalReceivables(p: BuildParams): any[] {
  const financialReceivablesData: any[] = [];
  const isPending = isPendingQuoteStatus(p.status);

  if (!isPending && p.existingReceivablesCount === 0 && p.condicaoPagamento === 'Parcelado') {
    const currentDate = p.now || new Date();

    if (p.valorEntrada && p.valorEntrada > 0) {
      financialReceivablesData.push({
        companyId: p.companyId,
        cliente: p.clientNome,
        origem_tipo: 'ORCAMENTO',
        categoria: 'Serviços Oficina',
        descricao: `Entrada / Sinal - Orçamento de ${p.clientNome}`,
        valor: p.valorEntrada,
        dataEmissao: currentDate,
        vencimento: currentDate,
        dataRecebimento: currentDate,
        formaRecebimento: 'Dinheiro',
        responsavel: 'Sistema',
        status: 'LIQUIDADO'
      });
    }

    const numParcelasPendentes = p.parcelas || 1;
    if (numParcelasPendentes > 0) {
      const valorRestante = p.total - (p.valorEntrada || 0);
      const parcelaValor = valorRestante / numParcelasPendentes;

      for (let i = 1; i <= numParcelasPendentes; i++) {
        const vencimentoDate = new Date(currentDate);
        vencimentoDate.setDate(vencimentoDate.getDate() + (i * 30));

        let valorDaParcela = parseFloat(parcelaValor.toFixed(2));
        if (i === numParcelasPendentes) {
          const sumAnteriores = parseFloat(parcelaValor.toFixed(2)) * (numParcelasPendentes - 1);
          valorDaParcela = parseFloat((valorRestante - sumAnteriores).toFixed(2));
        }

        financialReceivablesData.push({
          companyId: p.companyId,
          cliente: p.clientNome,
          origem_tipo: 'ORCAMENTO',
          categoria: 'Serviços Oficina',
          descricao: `Parcela ${i} de ${numParcelasPendentes} - Orçamento de ${p.clientNome}`,
          valor: valorDaParcela,
          dataEmissao: currentDate,
          vencimento: vencimentoDate,
          formaRecebimento: 'A Combinar',
          responsavel: 'Sistema',
          status: 'PENDENTE'
        });
      }
    }
  }

  return financialReceivablesData;
}

/** Status final gravado no orçamento (mesma regra do QuoteController.update). */
export function resolveQuoteStatus(p: { status: string; condicaoPagamento: string; valorEntrada?: number | null; isCurio?: boolean }) {
  if (p.isCurio) return 'Cobertura';
  const isPending = isPendingQuoteStatus(p.status);
  if (!isPending && p.condicaoPagamento === 'Parcelado' && (p.valorEntrada || 0) > 0) {
    return p.status === 'Pago' ? 'Pago' : 'Parcialmente Pago';
  }
  return p.status;
}
