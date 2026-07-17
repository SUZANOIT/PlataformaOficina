import React from 'react';
import { formatCurrency } from '../../utils/formatters';

interface HeatMapProps {
  data: {
    mes: string;
    receita: number;
    quantidade: number;
    ano: number;
    mesIndex: number;
  }[];
}

export const HeatMap: React.FC<HeatMapProps> = ({ data }) => {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  // Group by year
  const years = Array.from(new Set(data.map(d => d.ano))).sort((a, b) => b - a); // descending
  
  const maxRevenue = Math.max(...data.map(d => d.receita), 1); // avoid div by 0

  const getIntensityColor = (revenue: number) => {
    if (revenue === 0) return 'bg-muted/30';
    const ratio = revenue / maxRevenue;
    if (ratio > 0.8) return 'bg-emerald-500';
    if (ratio > 0.5) return 'bg-emerald-400';
    if (ratio > 0.2) return 'bg-emerald-300';
    return 'bg-emerald-200';
  };

  return (
    <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
      <div className="min-w-[600px]">
        {/* Header (Months) */}
        <div className="grid grid-cols-[80px_repeat(12,48px)] gap-3 mb-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center">Ano</div>
          {months.map(m => (
            <div key={m} className="text-center text-xs font-semibold text-muted-foreground uppercase">{m}</div>
          ))}
        </div>

        {/* Rows (Years) */}
        {years.map(year => {
          const yearData = data.filter(d => d.ano === year);
          return (
            <div key={year} className="grid grid-cols-[80px_repeat(12,48px)] gap-3 mb-3 items-center">
              <div className="text-sm font-bold text-foreground">{year}</div>
              
              {months.map((_, i) => {
                const cellData = yearData.find(d => d.mesIndex === i);
                const revenue = cellData ? cellData.receita : 0;
                const count = cellData ? cellData.quantidade : 0;
                
                return (
                  <div 
                    key={i}
                    className={`h-12 w-12 rounded-xl transition-all duration-300 hover:ring-2 hover:ring-emerald-500/50 hover:scale-110 cursor-pointer relative group ${getIntensityColor(revenue)}`}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-foreground text-background text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                      <div className="font-bold mb-1">{months[i]} / {year}</div>
                      <div>Receita: <span className="font-semibold text-emerald-400">{formatCurrency(revenue)}</span></div>
                      <div>Ordens: <span className="font-semibold">{count}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
