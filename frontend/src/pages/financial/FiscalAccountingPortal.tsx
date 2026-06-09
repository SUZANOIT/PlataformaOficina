import { useState, useEffect, useCallback } from 'react';
import { Archive, Download, FileCode, RefreshCw, ShieldCheck, Tag } from 'lucide-react';
import { toast } from 'sonner';
import type { AccountingSummaryData, TipoDocumentoFiscal } from './fiscal/types';
import {
  MESES, TIPOS_DOCUMENTO, TIPO_PASTA_LABEL, formatCurrency, buildFilterParams
} from './fiscal/types';

export function FiscalAccountingPortal() {
  const [user, setUser] = useState<any>(null);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [data, setData] = useState<AccountingSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const token = () => localStorage.getItem('token');
  const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

  const fetchUser = async () => {
    const res = await fetch('/auth/me', { headers: authHeaders() });
    if (res.ok) setUser(await res.json());
  };

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/fiscal/documents/accounting/summary?ano=${ano}`, { headers: authHeaders() });
      if (res.ok) setData(await res.json());
      else toast.error('Erro ao carregar resumo contábil.');
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  }, [ano]);

  useEffect(() => { fetchUser(); }, []);
  useEffect(() => {
    if (user?.roleAdmin || user?.roleContabilidade) fetchSummary();
  }, [user, fetchSummary]);

  const downloadXmlPack = async (opts: { mes?: number; tiposDocumento?: TipoDocumentoFiscal[]; label: string }) => {
    const key = `${opts.mes || 'ano'}-${opts.tiposDocumento?.join(',') || 'todos'}`;
    setDownloading(key);
    try {
      const params = buildFilterParams({
        ano,
        mes: opts.mes,
        tiposDocumento: opts.tiposDocumento || [],
        status: [],
        cliente: '',
        fornecedor: '',
        numeroNota: '',
        chaveFiscal: '',
        dataInicial: '',
        dataFinal: '',
        search: '',
        page: 1,
        pageSize: 20
      });
      const res = await fetch(`/fiscal/documents/export/xml-pack?${params}`, { headers: authHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Nenhum XML disponível para download.');
        return;
      }
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `xmls-fiscais-${opts.label}-${ano}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success(`Download iniciado: ${opts.label}`);
    } catch {
      toast.error('Erro ao gerar pacote de XMLs.');
    } finally {
      setDownloading(null);
    }
  };

  if (!user) return null;
  if (!user.roleAdmin && !user.roleContabilidade) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Acesso restrito a perfis Admin ou Contabilidade.
      </div>
    );
  }

  const yearOptions = data?.availableYears?.length
    ? data.availableYears
    : [new Date().getFullYear(), new Date().getFullYear() - 1];

  const totalAno = data?.summary.reduce((s, m) => s + m.totalDocumentos, 0) || 0;
  const totalXmlAno = data?.summary.reduce((s, m) => s + m.totalComXml, 0) || 0;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Portal Contabilidade Externa
            {user.roleAdmin && (
              <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full uppercase font-bold">
                <ShieldCheck size={10} className="inline" /> Admin
              </span>
            )}
            {user.roleContabilidade && !user.roleAdmin && (
              <span className="text-[10px] bg-violet-500/10 text-violet-500 px-2 py-0.5 rounded-full uppercase font-bold">
                <Tag size={10} className="inline" /> Contabilidade
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Download de XMLs organizados por mês e tipo de NF — Entradas, Saídas e Serviços
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Ano</label>
            <select
              value={ano}
              onChange={e => setAno(parseInt(e.target.value, 10))}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={fetchSummary} className="flex items-center gap-2 bg-secondary border border-border px-3 py-2 rounded-lg text-sm">
            <RefreshCw size={14} /> Atualizar
          </button>
          <button
            onClick={() => downloadXmlPack({ label: 'ano-completo' })}
            disabled={!!downloading || totalXmlAno === 0}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Archive size={16} />
            {downloading === 'ano-todos' ? 'Gerando ZIP...' : `Baixar Ano ${ano} Completo`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Documentos no Ano" value={String(totalAno)} />
        <StatCard label="Com XML Disponível" value={String(totalXmlAno)} />
        <StatCard label="Meses com Movimento" value={String(data?.summary.length || 0)} />
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <FileCode size={16} /> Download Rápido por Tipo (Ano {ano})
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {TIPOS_DOCUMENTO.map(tipo => {
            const qtd = data?.summary.reduce((s, m) => s + m.tipos[tipo.value].comXml, 0) || 0;
            return (
              <button
                key={tipo.value}
                disabled={!!downloading || qtd === 0}
                onClick={() => downloadXmlPack({ tiposDocumento: [tipo.value], label: tipo.value.toLowerCase() })}
                className="flex flex-col items-start gap-1 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/20 transition text-left disabled:opacity-40"
              >
                <span className="text-xs font-bold">{tipo.label}</span>
                <span className="text-[10px] text-muted-foreground">{qtd} XML(s)</span>
                <Download size={14} className="mt-1 text-primary" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-bold">Download Mês a Mês</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Estrutura do ZIP: <code className="text-[10px]">{ano}/01-Janeiro/Entradas/chave.xml</code>
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center animate-pulse text-muted-foreground">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="p-3 text-left">Mês</th>
                  {TIPOS_DOCUMENTO.map(t => (
                    <th key={t.value} className="p-3 text-center">{t.label}</th>
                  ))}
                  <th className="p-3 text-center">Total</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {MESES.map(mesInfo => {
                  const row = data?.summary.find(s => s.mes === mesInfo.value);
                  if (!row) {
                    return (
                      <tr key={mesInfo.value} className="border-t border-border/50 opacity-40">
                        <td className="p-3 font-semibold">{mesInfo.label}</td>
                        {TIPOS_DOCUMENTO.map(t => (
                          <td key={t.value} className="p-3 text-center text-muted-foreground">—</td>
                        ))}
                        <td className="p-3 text-center">0</td>
                        <td className="p-3 text-center">—</td>
                      </tr>
                    );
                  }

                  const monthKey = `${row.mes}-todos`;
                  return (
                    <tr key={row.mes} className="border-t border-border hover:bg-muted/10">
                      <td className="p-3 font-semibold">{mesInfo.label}</td>
                      {TIPOS_DOCUMENTO.map(t => {
                        const cell = row.tipos[t.value];
                        return (
                          <td key={t.value} className="p-3 text-center">
                            {cell.quantidade > 0 ? (
                              <div className="inline-flex flex-col items-center gap-0.5">
                                <span className="font-bold">{cell.quantidade}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{formatCurrency(cell.valorTotal)}</span>
                                {cell.comXml > 0 && (
                                  <button
                                    disabled={!!downloading}
                                    onClick={() => downloadXmlPack({
                                      mes: row.mes,
                                      tiposDocumento: [t.value],
                                      label: `${row.mes}-${t.value}`
                                    })}
                                    className="text-[10px] text-primary font-bold hover:underline flex items-center gap-0.5 mt-0.5"
                                    title={`Baixar XMLs de ${TIPO_PASTA_LABEL[t.value]} — ${mesInfo.label}`}
                                  >
                                    <Download size={10} /> {cell.comXml} XML
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-3 text-center font-bold">{row.totalDocumentos}</td>
                      <td className="p-3 text-center">
                        {row.totalComXml > 0 && (
                          <button
                            disabled={!!downloading}
                            onClick={() => downloadXmlPack({ mes: row.mes, label: `mes-${row.mes}` })}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 disabled:opacity-50"
                          >
                            <Download size={12} />
                            {downloading === monthKey ? '...' : 'Mês completo'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-[10px] font-bold text-muted-foreground uppercase">{label}</p>
      <p className="text-2xl font-black font-mono mt-1">{value}</p>
    </div>
  );
}
