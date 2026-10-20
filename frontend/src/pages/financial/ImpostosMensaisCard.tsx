import { useEffect, useState } from 'react';
import { PortalContabilidadeService } from '../../services/portalContabilidade';

type Resumo = Awaited<ReturnType<typeof PortalContabilidadeService.getResumoMensal>>;

interface Props {
  companyId: string;
  startDate: string;
  endDate: string;
}

const CORES = ['#ef4444', '#f59e0b', '#3b82f6', '#a855f7', '#10b981', '#ec4899', '#06b6d4', '#6366f1', '#84cc16', '#6b7280'];

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export function ImpostosMensaisCard({ companyId, startDate, endDate }: Props) {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    PortalContabilidadeService.getResumoMensal({
      companyId: companyId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
      .then((data) => {
        if (active) setResumo(data);
      })
      .catch((err) => {
        if (!active) return;
        if (err.response?.status === 403) setForbidden(true);
        else setError('Não foi possível carregar os impostos.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [companyId, startDate, endDate]);

  if (forbidden) return null;

  const tipos = resumo?.tipos || [];
  const linhas = resumo?.linhas || [];
  const corDe = (tipo: string) => CORES[tipos.indexOf(tipo) % CORES.length];
  const maxMes = Math.max(...linhas.map((linha) => linha.total), 1);

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-xs lg:col-span-2">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
        <h4 className="font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
          <span className="w-1 h-4 rounded bg-red-500 inline-block"></span>
          Impostos por Competência (mês a mês por tipo)
        </h4>
        <div className="flex gap-4 text-xs">
          <span className="text-muted-foreground">Guias: <span className="font-bold text-foreground">{resumo?.quantidade ?? 0}</span></span>
          <span className="text-muted-foreground">Total: <span className="font-bold text-red-500">{formatCurrency(resumo?.total ?? 0)}</span></span>
        </div>
      </div>

      {loading ? (
        <div className="h-48 bg-muted/20 rounded-lg animate-pulse"></div>
      ) : error ? (
        <div className="flex items-center justify-center h-48 text-red-500 text-sm">{error}</div>
      ) : !resumo || resumo.quantidade === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Nenhum imposto importado no período selecionado
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative h-56 w-full flex items-end justify-around gap-1 border-b border-border/80 pb-2 pt-6 px-2 overflow-x-auto">
            {linhas.map((linha) => (
              <div key={linha.competencia} className="flex flex-col items-center gap-2 min-w-12 flex-1">
                <div className="h-40 w-full flex items-end justify-center">
                  <div
                    className="w-6 sm:w-8 flex flex-col-reverse rounded-t-md overflow-hidden"
                    style={{ height: `${linha.total > 0 ? Math.max((linha.total / maxMes) * 100, 3) : 0}%` }}
                  >
                    {tipos.filter((tipo) => linha.porTipo[tipo]).map((tipo) => (
                      <div
                        key={tipo}
                        style={{ height: `${(linha.porTipo[tipo] / linha.total) * 100}%`, backgroundColor: corDe(tipo) }}
                        title={`${tipo} ${linha.competencia}: ${formatCurrency(linha.porTipo[tipo])}`}
                      ></div>
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground font-black tracking-wider">{linha.competencia}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            {tipos.map((tipo) => (
              <div key={tipo} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: corDe(tipo) }}></span>
                <span className="text-muted-foreground font-medium">{tipo}</span>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase tracking-wider">
                  <th className="text-left py-2 pr-4 font-semibold">Competência</th>
                  {tipos.map((tipo) => (
                    <th key={tipo} className="text-right py-2 px-2 font-semibold">{tipo}</th>
                  ))}
                  <th className="text-right py-2 pl-2 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {linhas.filter((linha) => linha.quantidade > 0).map((linha) => (
                  <tr key={linha.competencia} className="border-b border-border/40">
                    <td className="py-2 pr-4 font-semibold text-foreground">{linha.competencia}</td>
                    {tipos.map((tipo) => (
                      <td key={tipo} className="text-right py-2 px-2 text-foreground">
                        {linha.porTipo[tipo] ? formatCurrency(linha.porTipo[tipo]) : '—'}
                      </td>
                    ))}
                    <td className="text-right py-2 pl-2 font-bold text-foreground">{formatCurrency(linha.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold text-foreground">
                  <td className="py-2 pr-4">Total</td>
                  {tipos.map((tipo) => (
                    <td key={tipo} className="text-right py-2 px-2">{formatCurrency(resumo.totalPorTipo[tipo] || 0)}</td>
                  ))}
                  <td className="text-right py-2 pl-2 text-red-500">{formatCurrency(resumo.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
