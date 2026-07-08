import { X, Download, Eye } from 'lucide-react';
import { ModalFooterActions } from '../../../components/ui/ModalFooterActions';
import type { UnifiedDoc } from './types';
import { TIPOS_DOCUMENTO, TIPO_BADGE_COLOR, formatCurrency } from './types';

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

export function MonthDetailsModal({ mesLabel, docs, loading, onClose, onSelectDoc, onDownload }: MonthModalProps) {
  const totalValor = docs.reduce((s, d) => s + d.valorTotal, 0);
  const totalImpostos = docs.reduce((s, d) => s + d.valorImpostos, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-gradient-to-r from-card to-muted/20 border-b border-border rounded-t-2xl">
          <div>
            <h2 className="text-xl font-black text-foreground">Documentos — {mesLabel}</h2>
            <div className="flex flex-wrap gap-2 mt-3">
              <div className="px-2.5 py-1 rounded-md bg-muted text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-foreground/40"></span>
                {docs.length} Notas
              </div>
              <div className="px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                Bruto: {formatCurrency(totalValor)}
              </div>
              <div className="px-2.5 py-1 rounded-md bg-destructive/10 text-destructive text-[11px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive"></span>
                Impostos: {formatCurrency(totalImpostos)}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 mt-4 md:mt-0 rounded-xl bg-card border border-border shadow-sm hover:bg-muted transition-colors self-start md:self-auto">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-auto flex-1 bg-card">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium animate-pulse">Carregando documentos...</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 sticky top-0 backdrop-blur-md z-10 shadow-sm">
                <tr>
                  <th className="p-4 text-left text-[10px] uppercase font-black tracking-wider text-muted-foreground">Nota</th>
                  <th className="p-4 text-left text-[10px] uppercase font-black tracking-wider text-muted-foreground">Tipo</th>
                  <th className="p-4 text-left text-[10px] uppercase font-black tracking-wider text-muted-foreground">Cliente / Fornecedor</th>
                  <th className="p-4 text-left text-[10px] uppercase font-black tracking-wider text-muted-foreground">Emissão</th>
                  <th className="p-4 text-right text-[10px] uppercase font-black tracking-wider text-muted-foreground">Valor Bruto</th>
                  <th className="p-4 text-right text-[10px] uppercase font-black tracking-wider text-muted-foreground">Líquido</th>
                  <th className="p-4 text-right text-[10px] uppercase font-black tracking-wider text-muted-foreground">Impostos</th>
                  <th className="p-4 text-left text-[10px] uppercase font-black tracking-wider text-muted-foreground">Status</th>
                  <th className="p-4 text-center text-[10px] uppercase font-black tracking-wider text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {docs.map(doc => (
                  <tr key={`${doc.source}-${doc.id}`} className="hover:bg-muted/30 transition-colors group">
                    <td className="p-4 font-bold text-foreground">
                      <div className="flex flex-col">
                        <span>NF {doc.numeroNota}</span>
                        {doc.serie && <span className="text-[10px] text-muted-foreground font-semibold uppercase">Série {doc.serie}</span>}
                      </div>
                    </td>
                    <td className="p-4"><TipoBadge tipo={doc.tipoDocumento} /></td>
                    <td className="p-4 max-w-[200px]">
                      <div className="truncate font-medium text-foreground" title={doc.clienteNome || doc.fornecedorNome || ''}>
                        {doc.clienteNome || doc.fornecedorNome || '—'}
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap text-muted-foreground font-medium text-xs">
                      {doc.dataEmissao ? new Date(doc.dataEmissao).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="p-4 text-right font-mono font-bold tabular-nums text-foreground">{formatCurrency(doc.valorBruto)}</td>
                    <td className="p-4 text-right font-mono font-bold tabular-nums text-foreground">{formatCurrency(doc.valorLiquido)}</td>
                    <td className="p-4 text-right font-mono font-bold tabular-nums text-destructive">{formatCurrency(doc.valorImpostos)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                        doc.status === 'EMITIDA' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                        doc.status === 'CANCELADA' ? 'bg-destructive/10 text-destructive' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onSelectDoc(doc)} className="p-2 hover:bg-background hover:shadow-sm border border-transparent hover:border-border rounded-lg transition-all text-primary" title="Ver Detalhes">
                          <Eye size={16} />
                        </button>
                        {doc.xmlRecebido && (
                          <button onClick={() => onDownload(doc)} className="p-2 hover:bg-background hover:shadow-sm border border-transparent hover:border-border rounded-lg transition-all text-muted-foreground hover:text-foreground" title="Download XML">
                            <Download size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!docs.length && (
                  <tr>
                    <td colSpan={9} className="p-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <X size={24} className="text-muted-foreground/50" />
                        </div>
                        <p className="text-muted-foreground font-medium">Nenhum documento encontrado neste mês.</p>
                      </div>
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
          flush
        />
      </div>
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
