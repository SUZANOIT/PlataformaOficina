import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TaxItemPayload {
  tipo: string;
  quantidade: number;
  valorUnitario: number;
}

export interface TaxSummaryResult {
  municipal: number;
  estadual: number;
  federal: number;
  total: number;
  percentual: number;
}

export class TaxCalculatorService {
  async calculateTaxes(companyId: string, items: TaxItemPayload[]): Promise<TaxSummaryResult> {
    const activeTaxes = await prisma.tributacao.findMany({
      where: {
        companyId,
        status: 'ATIVO'
      }
    });

    let municipal = 0;
    let estadual = 0;
    let federal = 0;
    let totalSubtotal = 0;

    const municipalTaxes = activeTaxes.filter(t => t.esfera === 'MUNICIPAL');
    const estadualTaxes = activeTaxes.filter(t => t.esfera === 'ESTADUAL');
    const federalTaxes = activeTaxes.filter(t => t.esfera === 'FEDERAL');

    items.forEach(item => {
      const isService = item.tipo === 'Mão de Obra' || item.tipo === 'Serviço';
      const isProduct = item.tipo === 'Peça' || item.tipo === 'Produto';
      
      const itemTotal = (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0);
      totalSubtotal += itemTotal;

      if (itemTotal <= 0) return;

      if (isService) {
        municipalTaxes.forEach(tax => {
          municipal += itemTotal * ((tax.aliquotaIss || 0) / 100);
        });
        federalTaxes.forEach(tax => {
          federal += itemTotal * (((tax.aliquotaPis || 0) + (tax.aliquotaCofins || 0)) / 100);
        });
      }

      if (isProduct) {
        estadualTaxes.forEach(tax => {
          estadual += itemTotal * ((tax.aliquotaIcms || 0) / 100);
        });
        federalTaxes.forEach(tax => {
          federal += itemTotal * (((tax.aliquotaPis || 0) + (tax.aliquotaCofins || 0) + (tax.aliquotaIpi || 0)) / 100);
        });
      }
    });

    const total = municipal + estadual + federal;
    const percentual = totalSubtotal > 0 ? (total / totalSubtotal) * 100 : 0;

    return { municipal, estadual, federal, total, percentual };
  }
}
