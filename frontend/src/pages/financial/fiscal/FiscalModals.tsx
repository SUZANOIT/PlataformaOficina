import { useMemo, useState } from 'react';
import { X, Download, Eye, Search } from 'lucide-react';
import { ModalFooterActions } from '../../../components/ui/ModalFooterActions';
import type { UnifiedDoc } from './types';
import { TIPOS_DOCUMENTO, TIPO_BADGE_COLOR, formatCurrency } from './types';
import {
  countMonthDocumentsByTipo,
  filterMonthDocuments,
  sumMonthDocuments,
  type MonthTipoFiltro,
} from './monthDocs';

function TipoBadge({ tipo }: { tipo: UnifiedDoc['tipoDocumento'] }) {
  const label = TIPOS_DOCUMENTO.find(t => t.value === tipo)?.label || tipo;
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${TIPO_BADGE_COLOR[tipo]}`}>
      {label}
    </span>
  );
}

interface MonthModalProps {
  mesLabel: string;
  docs: UnifiedDoc[];
  loading: boolean;
  onClose: () => void;
  onSelectDoc: (doc: UnifiedDoc) => void;
  onDownload: (doc: UnifiedDoc) => void;
}

const MONTH_TIPO_FILTROS: { value: MonthTipoFiltro; label: string }[] = [
  { value: 'TODOS', label: 'Todas' },
  ...TIPOS_DOCUMENTO.map((tipo) => ({ value: tipo.value, label: tipo.label })),
];

export function MonthDetailsModal({ mesLabel, docs, loading, onClose, onSelectDoc, onDownload }: MonthModalProps) {
  const [tipoFiltro, setTipoFiltro] = useState<MonthTipoFiltro>('TODOS');
  const [busca, setBusca] = useState('');
  const counts = useMemo(() => countMonthDocumentsByTipo(docs), [docs]);
  const visibleDocs = useMemo(() => filterMonthDocuments(docs, tipoFiltro, busca), [docs, tipoFiltro, busca]);
  const totais = useMemo(() => sumMonthDocuments(visibleDocs), [visibleDocs]);
  const tipoAtivo = MONTH_TIPO_FILTROS.find((item) => item.value === tipoFiltro)?.label ?? 'Todas';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="month-docs-title"
        className="bg-card border border-border w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-border bg-muted/10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="month-docs-title" className="font-bold text-foreground text-sm">Documentos — {mesLabel}</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {loading ? 'Carregando notas do mês' : `${visibleDocs.length} de ${docs.length} notas · ${tipoAtivo}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-border flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tipo de nota">
            {MONTH_TIPO_FILTROS.map((tipo) => {
              const active = tipoFiltro === tipo.value;
              return (
                <button
                  key={tipo.value}
                  type="button"
                  aria-pressed={active}
                  disabled={loading}
                  onClick={() => setTipoFiltro(tipo.value)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold border transition disabled:opacity-50 ${
                    active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {tipo.label}
                  <span className="ml-1 tabular-nums">{counts[tipo.value]}</span>
                </button>
              );
            })}
          </div>
          <div className="relative lg:ml-auto lg:w-72">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Nota, cliente ou fornecedor"
              disabled={loading}
              className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm disabled:opacity-50"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 border-b border-border">
          <MonthTotal label="Bruto" value={formatCurrency(totais.bruto)} />
          <MonthTotal label="Líquido" value={formatCurrency(totais.liquido)} />
          <MonthTotal label="Impostos" value={formatCurrency(totais.impostos)} highlight />
        </div>

        <div className="overflow-auto flex-1 bg-card">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium">Carregando documentos...</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/30 sticky top-0 z-10">
                <tr>
                  <th className="p-3 text-left font-semibold text-muted-foreground">Nota</th>
                  <th className="p-3 text-left font-semibold text-muted-foreground">Tipo</th>
                  <th className="p-3 text-left font-semibold text-muted-foreground">Cliente / Fornecedor</th>
                  <th className="p-3 text-left font-semibold text-muted-foreground">Emissão</th>
                  <th className="p-3 text-right font-semibold text-muted-foreground">Valor Bruto</th>
                  <th className="p-3 text-right font-semibold text-muted-foreground">Líquido</th>
                  <th className="p-3 text-right font-semibold text-muted-foreground">Impostos</th>
                  <th className="p-3 text-left font-semibold text-muted-foreground">Status</th>
                  <th className="p-3 text-center font-semibold text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visibleDocs.map(doc => {
                  const parte = doc.tipoDocumento === 'ENTRADA'
                    ? doc.fornecedorNome || doc.clienteNome
                    : doc.clienteNome || doc.fornecedorNome;
                  return (
                    <tr key={`${doc.source}-${doc.id}`} className="border-t border-border hover:bg-muted/10">
                      <td className="p-3 font-semibold text-foreground">
                        <div className="flex flex-col">
                          <span>NF {doc.numeroNota}</span>
                          {doc.serie && <span className="text-[10px] text-muted-foreground font-semibold uppercase">Série {doc.serie}</span>}
                        </div>
                      </td>
                      <td className="p-3"><TipoBadge tipo={doc.tipoDocumento} /></td>
                      <td className="p-3 max-w-[220px]">
                        <div className="truncate" title={parte || ''}>{parte || '—'}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap text-muted-foreground">
                        {doc.dataEmissao ? new Date(doc.dataEmissao).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums">{formatCurrency(doc.valorBruto)}</td>
                      <td className="p-3 text-right font-mono tabular-nums">{formatCurrency(doc.valorLiquido)}</td>
                      <td className="p-3 text-right font-mono tabular-nums text-destructive">{formatCurrency(doc.valorImpostos)}</td>
                      <td className="p-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          doc.status === 'EMITIDA' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                          doc.status === 'CANCELADA' ? 'bg-destructive/10 text-destructive' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={() => onSelectDoc(doc)} className="p-1 hover:bg-muted rounded text-primary" title="Ver detalhes">
                            <Eye size={14} />
                          </button>
                          {doc.xmlRecebido && (
                            <button type="button" onClick={() => onDownload(doc)} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground" title="Download XML">
                              <Download size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!visibleDocs.length && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      {docs.length
                        ? 'Nenhuma nota encontrada com esse filtro.'
                        : 'Nenhum documento encontrado neste mês.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <ModalFooterActions
          onCancel={onClose}
          cancelLabel="Fechar"
          hidePrimary
        />
      </div>
    </div>
  );
}

function MonthTotal({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="px-4 py-2.5 text-center border-r border-border last:border-r-0">
      <p className="text-[10px] font-bold text-muted-foreground uppercase">{label}</p>
      <p className={`text-sm font-mono font-bold mt-0.5 ${highlight ? 'text-destructive' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}

interface DocModalProps {
  doc: UnifiedDoc;
  onClose: () => void;
  onDownload: (doc: UnifiedDoc) => void;
}

export function DocumentDetailModal({ doc, onClose, onDownload }: DocModalProps) {
  const taxes = [
    { label: 'ICMS', value: doc.icms ?? 0 },
    { label: 'IPI', value: doc.ipi ?? 0 },
    { label: 'PIS', value: doc.pis ?? 0 },
    { label: 'COFINS', value: doc.cofins ?? 0 },
    { label: 'ISS', value: doc.iss ?? 0 },
    { label: 'IRPJ', value: doc.irpj ?? 0 },
    { label: 'CSLL', value: doc.csll ?? 0 }
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <div>
            <h2 className="text-lg font-bold">NF {doc.numeroNota}</h2>
            <div className="mt-1"><TipoBadge tipo={doc.tipoDocumento} /></div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Série" value={doc.serie || '—'} />
            <Field label="Status" value={doc.status} />
            <Field label="Data Emissão" value={doc.dataEmissao ? new Date(doc.dataEmissao).toLocaleDateString('pt-BR') : '—'} />
            <Field label="Origem" value={doc.origemNota} />
            <Field label="Cliente" value={doc.clienteNome || '—'} />
            <Field label="Fornecedor" value={doc.fornecedorNome || '—'} />
            <Field label="Fluxo" value={doc.fluxoFinanceiro === 'SAIDA' ? 'Saída (Receita)' : 'Entrada (Compra)'} />
            <Field label="Responsável" value={doc.usuarioResponsavel || '—'} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <ValueCard label="Valor Bruto" value={formatCurrency(doc.valorBruto)} />
            <ValueCard label="Valor Líquido" value={formatCurrency(doc.valorLiquido)} />
            <ValueCard label="Total Impostos" value={formatCurrency(doc.valorImpostos)} highlight />
          </div>

          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Detalhamento de Impostos</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {taxes.map(t => (
                <div key={t.label} className="bg-muted/30 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-muted-foreground font-bold">{t.label}</p>
                  <p className="text-xs font-mono font-bold">{formatCurrency(t.value)}</p>
                </div>
              ))}
            </div>
          </div>

          {doc.chaveAcesso && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Chave de Acesso</p>
              <p className="text-[11px] font-mono break-all bg-muted/30 p-3 rounded-lg">{doc.chaveAcesso}</p>
            </div>
          )}

          {doc.xmlRecebido && (
            <div className="pt-2">
              <button
                onClick={() => onDownload(doc)}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
              >
                <Download size={16} /> Baixar XML
              </button>
            </div>
          )}
        </div>

        <ModalFooterActions
          onCancel={onClose}
          cancelLabel="Fechar"
          hidePrimary
        />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase">{label}</p>
      <p className="text-sm mt-0.5">{value}</p>
    </div>
  );
}

function ValueCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 border ${highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'}`}>
      <p className="text-[10px] text-muted-foreground font-bold">{label}</p>
      <p className="text-sm font-black font-mono mt-1">{value}</p>
    </div>
  );
}
