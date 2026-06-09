import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import {
  UploadCloud, RefreshCw, Download, History, FileCode, DollarSign, Files,
  ChevronDown, ChevronRight, TrendingUp, TrendingDown, Filter, FileSpreadsheet,
  BarChart3, ShieldCheck, Tag, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from '../../utils/toast.helper';
import type { DashboardData, FiscalFilters, UnifiedDoc } from './fiscal/types';
import { MESES, STATUS_OPTIONS, TIPOS_DOCUMENTO, buildFilterParams, formatCurrency, yearFromChaveAcesso } from './fiscal/types';

const defaultFilters = (): FiscalFilters => ({
  ano: new Date().getFullYear(),
  tiposDocumento: [],
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

function BarChart({ data, keys, colors }: {
  data: Array<Record<string, string | number>>;
  keys: string[];
  colors: string[];
}) {
  const max = Math.max(...data.flatMap(d => keys.map(k => Number(d[k] || 0))), 1);
  return (
    <div className="flex items-end gap-2 h-48 overflow-x-auto pb-2">
      {data.map((row, i) => (
        <div key={i} className="flex flex-col items-center gap-1 min-w-[60px]">
          <div className="flex items-end gap-0.5 h-36">
            {keys.map((key, ki) => (
              <div
                key={key}
                className="w-3 rounded-t-sm transition-all"
                style={{
                  height: `${(Number(row[key] || 0) / max) * 100}%`,
                  backgroundColor: colors[ki],
                  minHeight: Number(row[key]) > 0 ? '4px' : '0'
                }}
                title={`${key}: ${formatCurrency(Number(row[key] || 0))}`}
              />
            ))}
          </div>
          <span className="text-[9px] text-muted-foreground truncate max-w-[56px]">{row.mes as string}</span>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({ title, qtd, valor, taxes, color }: {
  title: string; qtd: number; valor: number; taxes?: string; color: string;
}) {
  return (
    <div className={`bg-card border border-border p-4 rounded-xl shadow-sm hover:border-${color}-500/30 transition-all`}>
      <p className="text-xs text-muted-foreground font-semibold">{title}</p>
      <h3 className="text-xl font-black font-mono mt-1">{qtd} <span className="text-sm font-normal text-muted-foreground">notas</span></h3>
      <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(valor)}</p>
      {taxes && <p className="text-[10px] text-muted-foreground mt-2">{taxes}</p>}
    </div>
  );
}

export function FiscalDocuments() {
  const [user, setUser] = useState<any>(null);
  const [filters, setFilters] = useState<FiscalFilters>(defaultFilters());
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'painel' | 'importacao' | 'auditoria'>('painel');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [monthDetails, setMonthDetails] = useState<UnifiedDoc[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [clientSuggestions, setClientSuggestions] = useState<any[]>([]);
  const [supplierSuggestions, setSupplierSuggestions] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const token = () => localStorage.getItem('token');
  const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

  const fetchUser = async () => {
    const res = await fetch('/auth/me', { headers: authHeaders() });
    if (res.ok) setUser(await res.json());
  };

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildFilterParams(filters);
      const res = await fetch(`/fiscal/documents/dashboard-full?${params}`, { headers: authHeaders() });
      if (res.ok) {
        setDashboard(await res.json());
      } else {
        handleApiError(res, 'Erro ao carregar dashboard fiscal.');
      }
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchAudits = async () => {
    const res = await fetch('/fiscal/audits', { headers: authHeaders() });
    if (res.ok) setAudits(await res.json());
  };

  useEffect(() => { fetchUser(); }, []);
  useEffect(() => {
    if (user?.roleAdmin || user?.roleContabilidade) {
      fetchDashboard();
      fetchAudits();
    }
  }, [user, fetchDashboard]);

  const updateFilter = (patch: Partial<FiscalFilters>) => {
    setFilters(prev => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  };

  const toggleTipo = (tipo: FiscalFilters['tiposDocumento'][number]) => {
    setFilters(prev => ({
      ...prev,
      tiposDocumento: prev.tiposDocumento.includes(tipo)
        ? prev.tiposDocumento.filter(t => t !== tipo)
        : [...prev.tiposDocumento, tipo],
      page: 1
    }));
  };

  const toggleStatus = (st: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(st) ? prev.status.filter(s => s !== st) : [...prev.status, st],
      page: 1
    }));
  };

  const searchClients = async (q: string) => {
    if (q.length < 2) return setClientSuggestions([]);
    const res = await fetch(`/fiscal/documents/clients/search?q=${encodeURIComponent(q)}`, { headers: authHeaders() });
    if (res.ok) setClientSuggestions(await res.json());
  };

  const searchSuppliers = async (q: string) => {
    if (q.length < 2) return setSupplierSuggestions([]);
    const res = await fetch(`/fiscal/documents/suppliers/search?q=${encodeURIComponent(q)}`, { headers: authHeaders() });
    if (res.ok) setSupplierSuggestions(await res.json());
  };

  const expandMonth = async (row: { ano: number; mes: number; mesLabel: string }) => {
    const key = `${row.ano}-${row.mes}`;
    if (expandedMonth === key) { setExpandedMonth(null); return; }
    setExpandedMonth(key);
    const params = buildFilterParams({ ...filters, ano: row.ano, mes: row.mes });
    const res = await fetch(`/fiscal/documents/month/${row.ano}/${row.mes}/details?${params}`, { headers: authHeaders() });
    if (res.ok) setMonthDetails(await res.json());
  };

  const exportFile = async (type: 'csv' | 'excel') => {
    const params = buildFilterParams(filters);
    const url = `/fiscal/documents/export/${type}?${params}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) { toast.error(`Erro ao exportar ${type.toUpperCase()}.`); return; }
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = type === 'csv' ? `fiscal-${Date.now()}.csv` : `dashboard-fiscal-${Date.now()}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success(`Exportação ${type === 'csv' ? 'CSV' : 'Excel'} concluída.`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isZip = false) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;
    const filesArray = Array.from(fileList);
    const validFiles = filesArray.filter(f => isZip ? f.name.toLowerCase().endsWith('.zip') : f.name.toLowerCase().endsWith('.xml'));
    if (!validFiles.length) {
      toast.error(isZip ? 'Selecione um ZIP válido.' : 'Envie apenas XML de NF-e.');
      return;
    }
    try {
      const prepared = await Promise.all(validFiles.map(async file => {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        return { fileName: file.name, fileType: 'text/xml', fileContent: base64 };
      }));
      const res = await fetch('/fiscal/documents/upload', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: prepared, isZip, batchName: `Lote ${new Date().toLocaleDateString()}` })
      });
      if (res.ok) {
        const result = await res.json();
        const uploadYear = result.documents?.[0]?.dataEmissao
          ? new Date(result.documents[0].dataEmissao).getFullYear()
          : filters.ano;
        toast.success('Importação concluída.');
        setFilters(prev => ({ ...prev, ano: uploadYear, mes: undefined, page: 1 }));
        if (activeTab !== 'painel') setActiveTab('importacao');
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409 && data.code === 'DUPLICATE_KEY') {
          const dupYear = yearFromChaveAcesso(data.chaveAcesso);
          toast.warning(data.error || 'NF-e já importada anteriormente.', {
            description: dupYear
              ? `Altere o filtro para o ano ${dupYear} para visualizar a nota.`
              : data.chaveAcesso ? `Chave: ${data.chaveAcesso}` : undefined,
            duration: 8000
          });
          if (dupYear) {
            setFilters(prev => ({ ...prev, ano: dupYear, mes: undefined, page: 1 }));
          }
        } else {
          handleApiError(res, data.error || 'Falha na importação.');
        }
      }
    } catch {
      toast.error('Erro ao importar arquivos.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (zipInputRef.current) zipInputRef.current.value = '';
    }
  };

  const downloadXml = async (id: string, fileName: string) => {
    const res = await fetch(`/fiscal/documents/${id}/download`, { headers: authHeaders() });
    if (!res.ok) { toast.error('Erro no download.'); return; }
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  };

  const deleteDoc = async (id: string) => {
    if (!confirm('Excluir este documento fiscal?')) return;
    const res = await fetch(`/fiscal/documents/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) { toast.success('Documento excluído.'); fetchDashboard(); }
    else toast.error('Erro ao excluir.');
  };

  if (!user) return null;
  if (!user.roleAdmin && !user.roleContabilidade) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Acesso restrito a perfis Admin ou Contabilidade.
      </div>
    );
  }

  const cards = dashboard?.cards;
  const imp = dashboard?.impostosPainel;
  const ind = dashboard?.indicadores;
  const yearOptions = dashboard?.availableYears?.length
    ? dashboard.availableYears
    : [new Date().getFullYear(), new Date().getFullYear() - 1];
  const showYearHint = dashboard && dashboard.pagination.total === 0
    && dashboard.availableYears.some(y => y !== filters.ano);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Documentos Fiscais
            {user.roleAdmin && <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full uppercase font-bold"><ShieldCheck size={10} className="inline" /> Admin</span>}
            {user.roleContabilidade && !user.roleAdmin && <span className="text-[10px] bg-violet-500/10 text-violet-500 px-2 py-0.5 rounded-full uppercase font-bold"><Tag size={10} className="inline" /> Contabilidade</span>}
          </h1>
          <p className="text-sm text-muted-foreground">Dashboard Fiscal, Financeiro e Tributário — NF Entrada, Saída, Serviço e Peças</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportFile('excel')} className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button onClick={() => exportFile('csv')} className="flex items-center gap-2 bg-secondary border border-border px-3 py-2 rounded-lg text-sm font-medium hover:bg-secondary/80">
            <Download size={16} /> CSV
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium">
            <UploadCloud size={16} /> Upload XML
          </button>
          <button onClick={() => zipInputRef.current?.click()} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium">
            <FileCode size={16} /> Importar ZIP
          </button>
          <input ref={fileInputRef} type="file" accept=".xml" multiple className="hidden" onChange={e => handleFileUpload(e, false)} />
          <input ref={zipInputRef} type="file" accept=".zip" className="hidden" onChange={e => handleFileUpload(e, true)} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {(['painel', 'importacao', 'auditoria'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition ${activeTab === tab ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}>
            {tab === 'painel' ? 'Painel Gerencial' : tab === 'importacao' ? 'Documentos' : 'Auditoria'}
          </button>
        ))}
      </div>

      {activeTab === 'painel' && (
        <>
          {showYearHint && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-foreground">
                Nenhum documento encontrado em <strong>{filters.ano}</strong>.
                Existem notas fiscais em: {dashboard!.availableYears.filter(y => y !== filters.ano).join(', ')}.
              </p>
              <button
                onClick={() => {
                  const alt = dashboard!.availableYears.find(y => y !== filters.ano);
                  if (alt) updateFilter({ ano: alt, mes: undefined });
                }}
                className="text-xs font-bold bg-amber-500 text-white px-3 py-1.5 rounded-lg whitespace-nowrap"
              >
                Ver ano {dashboard!.availableYears.find(y => y !== filters.ano)}
              </button>
            </div>
          )}

          {/* Filtros */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 text-sm font-bold">
              <Filter size={16} /> Filtros Avançados
              {showFilters ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Ano *</label>
                  <select value={filters.ano} onChange={e => updateFilter({ ano: parseInt(e.target.value), mes: undefined })}
                    className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm">
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Mês</label>
                  <select value={filters.mes || ''} onChange={e => updateFilter({ mes: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm">
                    <option value="">Todos</option>
                    {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Número da Nota</label>
                  <input value={filters.numeroNota} onChange={e => updateFilter({ numeroNota: e.target.value })}
                    className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Chave Fiscal</label>
                  <input value={filters.chaveFiscal} onChange={e => updateFilter({ chaveFiscal: e.target.value })}
                    className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm" />
                </div>
                <div className="relative">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Cliente</label>
                  <input value={filters.cliente} onChange={e => { updateFilter({ cliente: e.target.value }); searchClients(e.target.value); }}
                    className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm" />
                  {clientSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full bg-card border border-border rounded-lg mt-1 shadow-lg max-h-32 overflow-y-auto">
                      {clientSuggestions.map(c => (
                        <button key={c.id} className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted"
                          onClick={() => { updateFilter({ cliente: c.nome }); setClientSuggestions([]); }}>
                          {c.nome} {c.cnpj && `(${c.cnpj})`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Fornecedor</label>
                  <input value={filters.fornecedor} onChange={e => { updateFilter({ fornecedor: e.target.value }); searchSuppliers(e.target.value); }}
                    className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm" />
                  {supplierSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full bg-card border border-border rounded-lg mt-1 shadow-lg max-h-32 overflow-y-auto">
                      {supplierSuggestions.map(s => (
                        <button key={s.id} className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted"
                          onClick={() => { updateFilter({ fornecedor: s.razaoSocial }); setSupplierSuggestions([]); }}>
                          {s.razaoSocial}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Data Inicial</label>
                  <input type="date" value={filters.dataInicial} onChange={e => updateFilter({ dataInicial: e.target.value })}
                    className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Data Final</label>
                  <input type="date" value={filters.dataFinal} onChange={e => updateFilter({ dataFinal: e.target.value })}
                    className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm" />
                </div>
                <div className="lg:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Tipo de Documento</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {TIPOS_DOCUMENTO.map(t => (
                      <button key={t.value} onClick={() => toggleTipo(t.value)}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold border transition ${filters.tiposDocumento.includes(t.value) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Status</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {STATUS_OPTIONS.map(st => (
                      <button key={st} onClick={() => toggleStatus(st)}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold border transition ${filters.status.includes(st) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="lg:col-span-4 flex gap-2">
                  <button onClick={fetchDashboard} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">
                    <RefreshCw size={14} /> Aplicar Filtros
                  </button>
                  <button onClick={() => setFilters(defaultFilters())} className="px-4 py-2 rounded-lg text-sm border border-border">
                    Limpar
                  </button>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
              {[1,2,3,4,5,6].map(n => <div key={n} className="h-28 bg-muted/20 rounded-xl" />)}
            </div>
          ) : dashboard && (
            <>
              {/* Cards Resumo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                <SummaryCard title="NF Entrada" qtd={cards!.entrada.quantidade} valor={cards!.entrada.valorTotal}
                  taxes={`ICMS ${formatCurrency(cards!.entrada.icms)} | IPI ${formatCurrency(cards!.entrada.ipi)} | PIS ${formatCurrency(cards!.entrada.pis)} | COFINS ${formatCurrency(cards!.entrada.cofins)}`} color="blue" />
                <SummaryCard title="NF Saída" qtd={cards!.saida.quantidade} valor={cards!.saida.valorTotal}
                  taxes={`Impostos ${formatCurrency(cards!.saida.impostos)}`} color="green" />
                <SummaryCard title="NF Serviço" qtd={cards!.servico.quantidade} valor={cards!.servico.valorTotal}
                  taxes={`ISS ${formatCurrency(cards!.servico.iss)}`} color="violet" />
                <SummaryCard title="NF Peças" qtd={cards!.pecas.quantidade} valor={cards!.pecas.valorTotal}
                  taxes={`ICMS ${formatCurrency(cards!.pecas.icms)} | IPI ${formatCurrency(cards!.pecas.ipi)}`} color="amber" />
                <div className="bg-card border border-border p-4 rounded-xl">
                  <p className="text-xs text-muted-foreground font-semibold">Total Impostos</p>
                  <p className="text-xl font-black font-mono mt-2">{formatCurrency(cards!.totalImpostos)}</p>
                </div>
                <div className="bg-card border border-border p-4 rounded-xl">
                  <p className="text-xs text-muted-foreground font-semibold">Resultado Bruto</p>
                  <p className={`text-xl font-black font-mono mt-2 ${cards!.resultadoBruto >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {formatCurrency(cards!.resultadoBruto)}
                  </p>
                </div>
              </div>

              {/* Indicadores Gerenciais */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: 'Ticket Médio Serviços', value: formatCurrency(ind!.ticketMedioServicos) },
                  { label: 'Ticket Médio Peças', value: formatCurrency(ind!.ticketMedioPecas) },
                  { label: 'Ticket Médio Geral', value: formatCurrency(ind!.ticketMedioGeral) },
                  { label: 'Margem Bruta', value: formatCurrency(ind!.margemBruta) },
                  { label: '% Impostos', value: `${ind!.percentualImpostos.toFixed(1)}%` },
                  { label: 'Crescimento Mensal', value: `${ind!.crescimentoMensal >= 0 ? '+' : ''}${ind!.crescimentoMensal.toFixed(1)}%`, icon: ind!.crescimentoMensal >= 0 ? TrendingUp : TrendingDown }
                ].map(item => (
                  <div key={item.label} className="bg-card border border-border p-3 rounded-xl text-center">
                    <p className="text-[10px] text-muted-foreground font-semibold">{item.label}</p>
                    <p className="text-sm font-black font-mono mt-1 flex items-center justify-center gap-1">
                      {item.icon && <item.icon size={14} className={ind!.crescimentoMensal >= 0 ? 'text-emerald-500' : 'text-red-500'} />}
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Painel Impostos */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><DollarSign size={16} /> Painel de Impostos</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                  {[
                    { k: 'ISS', v: imp!.iss }, { k: 'ICMS', v: imp!.icms }, { k: 'IPI', v: imp!.ipi },
                    { k: 'PIS', v: imp!.pis }, { k: 'COFINS', v: imp!.cofins }, { k: 'IRPJ', v: imp!.irpj },
                    { k: 'CSLL', v: imp!.csll }, { k: 'Total', v: imp!.total }
                  ].map(t => (
                    <div key={t.k} className="text-center p-2 bg-muted/30 rounded-lg">
                      <p className="text-[10px] font-bold text-muted-foreground">{t.k}</p>
                      <p className="text-xs font-black font-mono">{formatCurrency(t.v)}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-3">
                  Percentual sobre faturamento: <strong>{imp!.percentualFaturamento.toFixed(2)}%</strong>
                </p>
              </div>

              {/* Resumo Mensal */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border"><h3 className="text-sm font-bold">Resumo Mensal</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="p-3 text-left">Mês</th>
                        <th className="p-3 text-right">NF Entrada</th>
                        <th className="p-3 text-right">Valor Entrada</th>
                        <th className="p-3 text-right">NF Serviço</th>
                        <th className="p-3 text-right">Valor Serviço</th>
                        <th className="p-3 text-right">NF Peças</th>
                        <th className="p-3 text-right">Valor Peças</th>
                        <th className="p-3 text-right">NF Saída</th>
                        <th className="p-3 text-right">Valor Saída</th>
                        <th className="p-3 text-right">Impostos</th>
                        <th className="p-3 text-right">Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.resumoMensal.map(row => (
                        <Fragment key={`${row.ano}-${row.mes}`}>
                          <tr className="border-t border-border hover:bg-muted/10 cursor-pointer"
                            onClick={() => expandMonth(row)}>
                            <td className="p-3 font-semibold flex items-center gap-1">
                              {expandedMonth === `${row.ano}-${row.mes}` ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                              {row.mesLabel}
                            </td>
                            <td className="p-3 text-right">{row.entrada.qtd}</td>
                            <td className="p-3 text-right font-mono">{formatCurrency(row.entrada.valor)}</td>
                            <td className="p-3 text-right">{row.servico.qtd}</td>
                            <td className="p-3 text-right font-mono">{formatCurrency(row.servico.valor)}</td>
                            <td className="p-3 text-right">{row.pecas.qtd}</td>
                            <td className="p-3 text-right font-mono">{formatCurrency(row.pecas.valor)}</td>
                            <td className="p-3 text-right">{row.saida.qtd}</td>
                            <td className="p-3 text-right font-mono">{formatCurrency(row.saida.valor)}</td>
                            <td className="p-3 text-right font-mono">{formatCurrency(row.impostos)}</td>
                            <td className={`p-3 text-right font-mono font-bold ${row.resultado >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {formatCurrency(row.resultado)}
                            </td>
                          </tr>
                          {expandedMonth === `${row.ano}-${row.mes}` && monthDetails.map(doc => (
                            <tr key={doc.id} className="bg-muted/5 border-t border-border/50 text-[10px]">
                              <td className="p-2 pl-8" colSpan={2}>NF {doc.numeroNota} {doc.serie && `Série ${doc.serie}`}</td>
                              <td className="p-2">{doc.tipoDocumento}</td>
                              <td className="p-2" colSpan={2}>{doc.clienteNome || doc.fornecedorNome || '—'}</td>
                              <td className="p-2">{doc.dataEmissao ? new Date(doc.dataEmissao).toLocaleDateString('pt-BR') : '—'}</td>
                              <td className="p-2 font-mono">{formatCurrency(doc.valorBruto)}</td>
                              <td className="p-2 font-mono">{formatCurrency(doc.valorLiquido)}</td>
                              <td className="p-2 font-mono">{formatCurrency(doc.valorImpostos)}</td>
                              <td className="p-2">{doc.status}</td>
                              <td className="p-2 truncate max-w-[120px]" title={doc.chaveAcesso || ''}>{doc.chaveAcesso?.slice(-8) || '—'}</td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                      {!dashboard.resumoMensal.length && (
                        <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">Nenhum dado para o período selecionado.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-xl p-4">
                  <h4 className="text-xs font-bold mb-3 flex items-center gap-1"><BarChart3 size={14} /> Faturamento (Serviços, Peças, Saídas)</h4>
                  <BarChart data={dashboard.charts.faturamento} keys={['servicos', 'pecas', 'saidas']} colors={['#8b5cf6', '#f59e0b', '#10b981']} />
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <h4 className="text-xs font-bold mb-3 flex items-center gap-1"><BarChart3 size={14} /> Compras (Entradas)</h4>
                  <BarChart data={dashboard.charts.compras} keys={['entradas']} colors={['#3b82f6']} />
                </div>
                <div className="bg-card border border-border rounded-xl p-4 lg:col-span-2">
                  <h4 className="text-xs font-bold mb-3 flex items-center gap-1"><BarChart3 size={14} /> Comparativo Financeiro</h4>
                  <BarChart data={dashboard.charts.comparativo} keys={['receitas', 'compras', 'impostos', 'resultado']} colors={['#10b981', '#3b82f6', '#ef4444', '#8b5cf6']} />
                </div>
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'importacao' && dashboard && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h3 className="text-sm font-bold flex items-center gap-2"><Files size={16} /> Documentos Importados</h3>
            <span className="text-xs text-muted-foreground">{dashboard.pagination.total} registros</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="p-3 text-left">Nota</th>
                  <th className="p-3 text-left">Tipo</th>
                  <th className="p-3 text-left">Emitente/Fornecedor</th>
                  <th className="p-3 text-left">Data</th>
                  <th className="p-3 text-right">Valor</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.documentos.map(doc => (
                  <tr key={doc.id} className="border-t border-border hover:bg-muted/10">
                    <td className="p-3 font-semibold">{doc.numeroNota}</td>
                    <td className="p-3"><span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[10px] font-bold">{doc.tipoDocumento}</span></td>
                    <td className="p-3">{doc.fornecedorNome || doc.clienteNome || '—'}</td>
                    <td className="p-3">{doc.dataEmissao ? new Date(doc.dataEmissao).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(doc.valorTotal)}</td>
                    <td className="p-3">{doc.status}</td>
                    <td className="p-3 text-center flex justify-center gap-1">
                      {doc.source === 'FiscalDocument' && (
                        <>
                          <button onClick={() => downloadXml(doc.id, doc.nomeArquivo || `${doc.numeroNota}.xml`)}
                            className="p-1 hover:bg-muted rounded" title="Download XML">
                            <Download size={14} />
                          </button>
                          {user.roleAdmin && (
                            <button onClick={() => deleteDoc(doc.id)} className="p-1 hover:bg-red-500/10 text-red-500 rounded" title="Excluir">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {dashboard.pagination.totalPages > 1 && (
            <div className="p-4 border-t border-border flex justify-center gap-2">
              <button disabled={filters.page <= 1} onClick={() => updateFilter({ page: filters.page - 1 })}
                className="px-3 py-1 rounded border border-border text-xs disabled:opacity-40">Anterior</button>
              <span className="text-xs self-center">Página {filters.page} de {dashboard.pagination.totalPages}</span>
              <button disabled={filters.page >= dashboard.pagination.totalPages} onClick={() => updateFilter({ page: filters.page + 1 })}
                className="px-3 py-1 rounded border border-border text-xs disabled:opacity-40">Próxima</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'auditoria' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border"><h3 className="text-sm font-bold flex items-center gap-2"><History size={16} /> Auditoria Fiscal</h3></div>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 sticky top-0">
                <tr>
                  <th className="p-3 text-left">Data</th>
                  <th className="p-3 text-left">Usuário</th>
                  <th className="p-3 text-left">Ação</th>
                  <th className="p-3 text-left">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {audits.map(a => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="p-3 whitespace-nowrap">{new Date(a.createdAt).toLocaleString('pt-BR')}</td>
                    <td className="p-3">{a.userName}</td>
                    <td className="p-3"><span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-bold">{a.action}</span></td>
                    <td className="p-3 text-muted-foreground truncate max-w-md">{a.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
