export type TaxSummary = {
  municipal: number;
  estadual: number;
  federal: number;
  total: number;
  percentual: number;
};

export type TaxItem = {
  tipo: string; // 'Peça' ou 'Mão de Obra' / 'Serviço'
  quantidade: number;
  valorUnitario: number;
};

export const calculateTaxes = (items: TaxItem[], activeTaxes: any[]): TaxSummary => {
  let municipal = 0;
  let estadual = 0;
  let federal = 0;

  const municipalTaxes = activeTaxes.filter(t => t.esfera === 'MUNICIPAL' && t.status === 'ATIVO');
  const estadualTaxes = activeTaxes.filter(t => t.esfera === 'ESTADUAL' && t.status === 'ATIVO');
  const federalTaxes = activeTaxes.filter(t => t.esfera === 'FEDERAL' && t.status === 'ATIVO');

  let totalSubtotal = 0;

  items.forEach(item => {
    const isService = item.tipo === 'Mão de Obra' || item.tipo === 'Serviço';
    const isProduct = item.tipo === 'Peça' || item.tipo === 'Produto';
    
    const qty = Number(item.quantidade) || 0;
    const price = Number(item.valorUnitario) || 0;
    const itemTotal = qty * price;
    
    totalSubtotal += itemTotal;

    if (itemTotal <= 0) return;

    if (isService) {
      // ISS (Municipal)
      municipalTaxes.forEach(tax => {
        const rate = Number(tax.aliquotaIss) || 0;
        municipal += itemTotal * (rate / 100);
      });
      // PIS/COFINS (Federal) - Assumindo que PIS/COFINS aplicam para serviços se preenchidos
      federalTaxes.forEach(tax => {
        const ratePis = Number(tax.aliquotaPis) || 0;
        const rateCofins = Number(tax.aliquotaCofins) || 0;
        federal += itemTotal * ((ratePis + rateCofins) / 100);
      });
    }

    if (isProduct) {
      // ICMS (Estadual)
      estadualTaxes.forEach(tax => {
        const rateIcms = Number(tax.aliquotaIcms) || 0;
        estadual += itemTotal * (rateIcms / 100);
      });
      // PIS/COFINS/IPI (Federal)
      federalTaxes.forEach(tax => {
        const ratePis = Number(tax.aliquotaPis) || 0;
        const rateCofins = Number(tax.aliquotaCofins) || 0;
        const rateIpi = Number(tax.aliquotaIpi) || 0;
        federal += itemTotal * ((ratePis + rateCofins + rateIpi) / 100);
      });
    }
  });

  const total = municipal + estadual + federal;
  const percentual = totalSubtotal > 0 ? (total / totalSubtotal) * 100 : 0;

  return {
    municipal,
    estadual,
    federal,
    total,
    percentual
  };
};
