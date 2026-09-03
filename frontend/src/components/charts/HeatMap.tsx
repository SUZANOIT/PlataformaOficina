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

  const getIntensityClass = (revenue: number) => {
    if (revenue === 0) return 'bg-slate-100 border border-slate-200';
    const ratio = revenue / maxRevenue;
    if (ratio > 0.8) return 'bg-emerald-500 shadow-sm shadow-emerald-500/30 border border-emerald-600';
    if (ratio > 0.6) return 'bg-emerald-500/80 border border-emerald-500/90';
    if (ratio > 0.4) return 'bg-emerald-500/60 border border-emerald-500/70';
    if (ratio > 0.2) return 'bg-emerald-500/40 border border-emerald-500/50';
    return 'bg-emerald-500/20 border border-emerald-500/30';
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="text-left w-max">
        {/* Header (Months) */}
        <div className="grid grid-cols-[50px_repeat(12,minmax(36px,1fr))] md:grid-cols-[60px_repeat(12,minmax(48px,1fr))] gap-2 md:gap-3 mb-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-end pr-2">Ano</div>
          {months.map(m => (
            <div key={m} className="text-center text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider">{m}</div>
          ))}
        </div>

        {/* Rows (Years) */}
        {years.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Nenhum dado financeiro para exibir no mapa de calor.
          </div>
        ) : (
          years.map(year => {
            const yearData = data.filter(d => d.ano === year);
            return (
              <div key={year} className="grid grid-cols-[50px_repeat(12,minmax(36px,1fr))] md:grid-cols-[60px_repeat(12,minmax(48px,1fr))] gap-2 md:gap-3 mb-3 items-center">
                <div className="text-xs md:text-sm font-black text-muted-foreground text-right pr-2">{year}</div>
                
                {months.map((_, i) => {
                  const cellData = yearData.find(d => d.mesIndex === i);
                  const revenue = cellData ? cellData.receita : 0;
                  const count = cellData ? cellData.quantidade : 0;
                  
                  return (
                    <div key={i} className="flex justify-center group relative">
                      <div 
                        className={`w-8 h-8 md:w-11 md:h-11 rounded-lg transition-all duration-300 hover:ring-4 hover:ring-emerald-500/20 hover:scale-110 hover:z-10 cursor-pointer flex items-center justify-center ${getIntensityClass(revenue)}`}
                      >
                        {revenue > 0 && maxRevenue > 0 && (revenue / maxRevenue > 0.6) && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white/50"></div>
                        )}
                      </div>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-max px-4 py-3 bg-slate-900 text-white text-xs rounded-xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all pointer-events-none z-[100] shadow-2xl origin-bottom">
                        <div className="font-black mb-1.5 text-[13px] border-b border-white/10 pb-1.5">
                          {months[i]} de {year}
                        </div>
                        <div className="flex justify-between gap-4 items-center">
                          <span className="text-white/70 font-medium">Receita:</span>
                          <span className="font-bold text-emerald-400">{formatCurrency(revenue)}</span>
                        </div>
                        <div className="flex justify-between gap-4 items-center mt-0.5">
                          <span className="text-white/70 font-medium">Ordens:</span>
                          <span className="font-bold">{count}</span>
                        </div>
                        
                        {/* Tooltip Arrow */}
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="w-full max-w-[600px] mt-8 pt-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-4 px-4">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Intensidade Financeira</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-2">Menor</span>
          <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200"></div>
          <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/30"></div>
          <div className="w-6 h-6 rounded-md bg-emerald-500/40 border border-emerald-500/50"></div>
          <div className="w-6 h-6 rounded-md bg-emerald-500/60 border border-emerald-500/70"></div>
          <div className="w-6 h-6 rounded-md bg-emerald-500/80 border border-emerald-500/90"></div>
          <div className="w-6 h-6 rounded-md bg-emerald-500 shadow-sm shadow-emerald-500/30 border border-emerald-600"></div>
          <span className="text-xs font-medium text-muted-foreground ml-2">Maior</span>
        </div>
      </div>
    </div>
  );
};
