import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

export const payrollController = {
  async getEstimate(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;
      const { month, year } = req.query;

      if (!month || !year) return res.status(400).json({ error: 'Mês e ano obrigatórios' });

      const employee = await prisma.collaborator.findUnique({
        where: { id: employeeId as string },
        include: { 
          salaryConfig: { include: { collectiveAgreement: true } },
          attendances: {
            where: {
              date: {
                gte: new Date(Number(year), Number(month) - 1, 1),
                lte: new Date(Number(year), Number(month), 0, 23, 59, 59)
              }
            }
          },
          towingQuotes: {
            where: {
              status: { in: ['Concluído', 'CONCLUIDO'] },
              updatedAt: {
                gte: new Date(Number(year), Number(month) - 1, 1),
                lte: new Date(Number(year), Number(month), 0, 23, 59, 59)
              }
            }
          }
        }
      });

      if (!employee) return res.status(404).json({ error: 'Funcionário não encontrado' });
      if (!employee.salaryConfig) return res.status(400).json({ error: 'Configuração salarial ausente' });

      const cfg = employee.salaryConfig;
      const agreement = cfg.collectiveAgreement;

      let totalNormalHours = 0;
      let totalExtra50 = 0;
      let totalExtra100 = 0;
      let totalNight = 0;

      employee.attendances.forEach((att: any) => {
        totalNormalHours += att.normalHours;
        totalExtra50 += att.extraHours50;
        totalExtra100 += att.extraHours100;
        totalNight += att.nightHours;
      });

      // Valor Hora base
      const divisor = agreement?.jornadaMensal || 220;
      const valorHora = cfg.baseSalary / divisor;

      // Adicionais
      const valExtra50 = totalExtra50 * valorHora * (1 + (agreement?.percentualHE50 || 50) / 100);
      const valExtra100 = totalExtra100 * valorHora * (1 + (agreement?.percentualHE100 || 100) / 100);
      const valNoturno = totalNight * valorHora * ((agreement?.percentualNoturno || 20) / 100);

      // Comissões Operacionais (Guinchos)
      let comissaoTotal = 0;
      let totalAtendimentos = employee.towingQuotes.length;
      let receitaTotal = 0;

      employee.towingQuotes.forEach((quote: any) => {
        receitaTotal += quote.valorTotal;
        if (cfg.valorAtendimento) comissaoTotal += cfg.valorAtendimento;
        if (cfg.valorKm && quote.distanciaKm) comissaoTotal += (cfg.valorKm * quote.distanciaKm);
        if (cfg.comissaoPercentual) comissaoTotal += (quote.valorTotal * (cfg.comissaoPercentual / 100));
      });

      const periculosidade = agreement?.percentualPericulosidade ? (cfg.baseSalary * (agreement.percentualPericulosidade / 100)) : 0;
      const insalubridade = agreement?.percentualInsalubridade ? (cfg.baseSalary * (agreement.percentualInsalubridade / 100)) : 0;

      const salarioBruto = cfg.baseSalary + valExtra50 + valExtra100 + valNoturno + comissaoTotal + periculosidade + insalubridade;

      // Estimativa simples de INSS (não preciso por faixa exata para o MVP, mas faremos 9%)
      const inss = salarioBruto * 0.09;
      const salarioLiquido = salarioBruto - inss;

      return res.json({
        resumo: {
          salarioBase: cfg.baseSalary,
          horasNormaisTrabalhadas: totalNormalHours,
          horasExtras50: totalExtra50,
          valorExtras50: valExtra50,
          horasExtras100: totalExtra100,
          valorExtras100: valExtra100,
          horasNoturnas: totalNight,
          valorNoturno: valNoturno,
          comissaoTotal,
          periculosidade,
          insalubridade,
          salarioBruto,
          descontos: inss,
          salarioLiquido
        },
        producao: {
          atendimentos: totalAtendimentos,
          receitaGerada: receitaTotal
        }
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao gerar folha' });
    }
  }
};
