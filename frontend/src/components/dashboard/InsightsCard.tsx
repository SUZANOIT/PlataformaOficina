import React from 'react';
import { Sparkles } from 'lucide-react';
import type { ClientDashboardResponse } from '../../types/clientDashboard';

interface InsightsCardProps {
  data: ClientDashboardResponse;
}

export const InsightsCard: React.FC<InsightsCardProps> = ({ data }) => {
  const generateInsights = () => {
    const insights = [];

    // Revenue Growth
    if (data.kpis.revenueGrowth > 0) {
      insights.push(`O cliente aumentou o faturamento em ${data.kpis.revenueGrowth.toFixed(1)}% em relação ao período anterior.`);
    } else if (data.kpis.revenueGrowth < 0) {
      insights.push(`O faturamento do cliente sofreu uma redução de ${Math.abs(data.kpis.revenueGrowth).toFixed(1)}% em relação ao período anterior.`);
    }

    // Ticket Growth
    if (data.kpis.ticketGrowth > 0) {
      insights.push(`O ticket médio teve um incremento positivo de ${data.kpis.ticketGrowth.toFixed(1)}%.`);
    }

    // Top Month
    if (data.monthlyData && data.monthlyData.length > 0) {
      const bestMonth = [...data.monthlyData].sort((a, b) => b.receita - a.receita)[0];
      if (bestMonth.receita > 0) {
        insights.push(`O mês de ${bestMonth.mes} de ${bestMonth.ano} obteve a maior receita agregada.`);
      }
    }

    // Ranking
    if (data.ranking.position > 0 && data.ranking.position <= 10) {
      insights.push(`Excelente! Este cliente está entre os Top ${data.ranking.position <= 5 ? '5' : '10'} maiores faturamentos da empresa.`);
    }

    // Services
    if (data.revenueByService && data.revenueByService.length > 0) {
      const topService = data.revenueByService[0];
      if (topService.value > 0) {
        insights.push(`A maior parte da receita foi gerada por serviços de ${topService.name}.`);
      }
    }

    return insights;
  };

  const insights = generateInsights();

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="bg-card/80 border border-border/50 p-6 rounded-3xl shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>
      
      <h4 className="text-sm font-bold text-foreground mb-6 flex items-center gap-3 relative z-10">
        <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500">
          <Sparkles size={20} />
        </div>
        Insights Automáticos
      </h4>
      
      <ul className="space-y-4 relative z-10">
        {insights.map((insight, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0"></div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {insight}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};
