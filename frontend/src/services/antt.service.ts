// antt.service.ts
// Estimativa de Frete Mínimo ANTT (Coeficientes Simulados Baseados em Tabela Lotação Geral)
// Em produção, isso deve ser substituído por integração via API externa.

type ChargeType = 'Carga Geral' | 'Granel Sólido' | 'Granel Líquido' | 'Frigorificada' | 'Perigosa' | 'Neogranel' | 'Veículos';

export const anttService = {
  calculateFloor(km: number, eixos: number, chargeType: ChargeType, isEmptyReturn: boolean, hasHighPerformance: boolean, isComposition: boolean): number {
    if (!km || km <= 0 || !eixos || eixos < 2) return 0;

    // Coeficientes Base por Tipo de Carga (Simulado)
    // CC = Coeficiente de Carga/Descarga (Fixo R$)
    // CCD = Coeficiente de Custo de Deslocamento (R$/km)
    let cc = 0;
    let ccd = 0;

    switch (chargeType) {
      case 'Veículos':
        cc = 180.00;
        ccd = 2.80;
        break;
      case 'Carga Geral':
        cc = 150.00;
        ccd = 2.50;
        break;
      case 'Frigorificada':
      case 'Perigosa':
        cc = 220.00;
        ccd = 3.20;
        break;
      default:
        cc = 160.00;
        ccd = 2.60;
    }

    // Fator multiplicador de eixos (quanto mais eixos, maior o custo operacional)
    // Ex: 2 eixos = 1.0 (base), 3 eixos = 1.2, 4 eixos = 1.4...
    const axisFactor = 1 + ((eixos - 2) * 0.2);

    // Cálculo Básico
    let totalCcd = (km * ccd) * axisFactor;
    let totalCc = cc * axisFactor;

    // Adicionais/Descontos Regulatórios
    if (isEmptyReturn) {
      // Se tiver retorno vazio obrigatório (frete de retorno não garantido), cobra-se a volta (estimativa +70% do CCD)
      totalCcd += (km * ccd * 0.7) * axisFactor;
    }

    if (hasHighPerformance) {
      // Alto Desempenho (menor tempo de viagem, mas maior desgaste) +10%
      totalCcd *= 1.1;
    }

    if (isComposition) {
      // Composição Veicular (ex: bitrem) encarece
      totalCc *= 1.15;
    }

    const finalFloor = totalCcd + totalCc;
    return Number(finalFloor.toFixed(2));
  }
};
