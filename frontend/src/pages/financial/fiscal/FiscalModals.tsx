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
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">Documentos — {mesLabel}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {docs.length} nota(s) · {formatCurrency(totalValor)} · Impostos {formatCurrency(totalImpostos)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground animate-pulse">Carregando documentos...</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/40 sticky top-0">
                <tr>
                  <th className="p-3 text-left">Nota</th>
                  <th className="p-3 text-left">Tipo</th>
                  <th className="p-3 text-left">Cliente / Fornecedor</th>
                  <th className="p-3 text-left">Emissão</th>
                  <th className="p-3 text-right">Valor Bruto</th>
                  <th className="p-3 text-right">Líquido</th>
                  <th className="p-3 text-right">Impostos</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {docs.map(doc => (
                  <tr key={`${doc.source}-${doc.id}`} className="border-t border-border hover:bg-muted/10">
                    <td className="p-3 font-semibold">
                      NF {doc.numeroNota}
                      {doc.serie && <span className="text-muted-foreground font-normal"> · Série {doc.serie}</span>}
                    </td>
                    <td className="p-3"><TipoBadge tipo={doc.tipoDocumento} /></td>
                    <td className="p-3 max-w-[180px] truncate" title={doc.clienteNome || doc.fornecedorNome || ''}>
                      {doc.clienteNome || doc.fornecedorNome || '—'}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {doc.dataEmissao ? new Date(doc.dataEmissao).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="p-3 text-right font-mono">{formatCurrency(doc.valorBruto)}</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(doc.valorLiquido)}</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(doc.valorImpostos)}</td>
                    <td className="p-3">{doc.status}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => onSelectDoc(doc)} className="p-1.5 hover:bg-muted rounded" title="Detalhes">
                          <Eye size={14} />
                        </button>
                        {doc.xmlRecebido && (
                          <button onClick={() => onDownload(doc)} className="p-1.5 hover:bg-muted rounded" title="Download XML">
                            <Download size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!docs.length && (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-muted-foreground">
                      Nenhum documento neste mês.
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
