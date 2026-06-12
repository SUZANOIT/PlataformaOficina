import React, { useEffect, useState } from 'react';
import { X, Search, Download, FileText, FileDown, FileUp, Loader2, CheckCircle2, Clock, History, Ban, User, Info, DollarSign } from 'lucide-react';

interface HistoryEvent {
  id: string;
  quoteId: string;
  userName: string;
  action: string;
  description: string;
  details: string | null;
  createdAt: string;
}

interface QuoteHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteId: string;
  numeroOrcamento?: number | null;
}

const actionColors: Record<string, string> = {
  'CRIADO': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'STATUS_ALTERADO': 'bg-blue-100 text-blue-800 border-blue-200',
  'PECA_ADICIONADA': 'bg-amber-100 text-amber-800 border-amber-200',
  'PECA_REMOVIDA': 'bg-red-100 text-red-800 border-red-200',
  'PECA_MODIFICADA': 'bg-orange-100 text-orange-800 border-orange-200',
  'SERVICO_ADICIONADO': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'SERVICO_REMOVIDO': 'bg-rose-100 text-rose-800 border-rose-200',
  'SERVICO_MODIFICADO': 'bg-violet-100 text-violet-800 border-violet-200',
  'OBSERVACAO_ALTERADA': 'bg-slate-100 text-slate-800 border-slate-200',
  'VALOR_ALTERADO': 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  'EDITADO': 'bg-gray-100 text-gray-800 border-gray-200',
};

const actionIcons: Record<string, any> = {
  'CRIADO': <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  'STATUS_ALTERADO': <Clock className="w-4 h-4 text-blue-600" />,
  'PECA_ADICIONADA': <FileUp className="w-4 h-4 text-amber-600" />,
  'PECA_REMOVIDA': <FileDown className="w-4 h-4 text-red-600" />,
  'PECA_MODIFICADA': <History className="w-4 h-4 text-orange-600" />,
  'SERVICO_ADICIONADO': <FileUp className="w-4 h-4 text-indigo-600" />,
  'SERVICO_REMOVIDO': <FileDown className="w-4 h-4 text-rose-600" />,
  'SERVICO_MODIFICADO': <History className="w-4 h-4 text-violet-600" />,
  'OBSERVACAO_ALTERADA': <Info className="w-4 h-4 text-slate-600" />,
  'VALOR_ALTERADO': <DollarSign className="w-4 h-4 text-fuchsia-600" />,
  'EDITADO': <History className="w-4 h-4 text-gray-600" />,
};

export const QuoteHistoryModal: React.FC<QuoteHistoryModalProps> = ({ isOpen, onClose, quoteId, numeroOrcamento }) => {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  useEffect(() => {
    if (isOpen && quoteId) {
      fetchHistory();
    }
  }, [isOpen, quoteId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/quotes/${quoteId}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredHistory = history.filter(event => {
    const matchesSearch = 
      event.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.details && event.details.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesAction = filterAction === 'ALL' || event.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const exportToCSV = () => {
    const headers = ['Data', 'Usuario', 'Acao', 'Descricao', 'Detalhes'];
    const rows = filteredHistory.map(h => [
      new Date(h.createdAt).toLocaleString('pt-BR'),
      h.userName,
      h.action,
      h.description,
      h.details || ''
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(';') + "\n"
      + rows.map(e => e.join(';')).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `historico_orcamento_${numeroOrcamento || quoteId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const renderDetails = (event: HistoryEvent) => {
    if (!event.details) return null;
    try {
      const details = JSON.parse(event.details);
      
      if (event.action === 'STATUS_ALTERADO') {
        return (
          <div className="mt-2 text-sm bg-white p-3 rounded border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <span className="font-medium">De:</span>
              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">{details.de}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="font-medium">Para:</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">{details.para}</span>
            </div>
          </div>
        );
      }

      if (event.action.includes('ADICIONADA') || event.action.includes('REMOVIDA') || event.action.includes('ADICIONADO') || event.action.includes('REMOVIDO')) {
        return (
          <div className="mt-2 text-sm bg-white p-3 rounded border border-slate-100 shadow-sm space-y-1">
            {details.codigo && <div><span className="font-medium text-slate-500">Código:</span> {details.codigo}</div>}
            <div><span className="font-medium text-slate-500">Descrição:</span> {details.descricao}</div>
            <div className="flex gap-4 mt-2">
              <div><span className="font-medium text-slate-500">Qtd:</span> {details.quantidade}</div>
              <div><span className="font-medium text-slate-500">Valor Unit.:</span> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(details.valorUnitario || 0)}</div>
            </div>
          </div>
        );
      }

      if (event.action.includes('MODIFICADA') || event.action.includes('MODIFICADO')) {
         return (
          <div className="mt-2 text-sm bg-white p-3 rounded border border-slate-100 shadow-sm space-y-1">
            <div><span className="font-medium text-slate-500">Item:</span> {details.descricaoDe || details.descricao}</div>
            {details.quantidadeDe !== undefined && (
              <div className="mt-1">
                <span className="font-medium text-slate-500">Quantidade:</span> {details.quantidadeDe} ➜ <span className="font-semibold text-slate-700">{details.quantidadePara}</span>
              </div>
            )}
            {details.valorDe !== undefined && (
              <div className="mt-1">
                <span className="font-medium text-slate-500">Valor:</span> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(details.valorDe)} ➜ <span className="font-semibold text-slate-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(details.valorPara)}</span>
              </div>
            )}
          </div>
         );
      }

      return (
        <pre className="mt-2 text-xs bg-slate-50 p-2 rounded overflow-x-auto text-slate-600 border border-slate-100">
          {JSON.stringify(details, null, 2)}
        </pre>
      );
    } catch (e) {
      return <div className="mt-2 text-xs text-slate-500">{event.details}</div>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-center bg-black/50 backdrop-blur-sm print-bg-white print:static print:h-auto print:w-auto print:bg-white print:p-0">
      <div className="w-full h-[90vh] sm:h-[85vh] sm:w-[600px] bg-slate-50 sm:rounded-xl shadow-2xl flex flex-col transform transition-all print:h-auto print:w-full print:shadow-none">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200 bg-white sm:rounded-t-xl flex items-center justify-between print:hidden">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              Histórico do Orçamento #{numeroOrcamento}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Total de alterações: <span className="font-semibold text-slate-700">{history.length}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex-shrink-0 p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row gap-3 print:hidden">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar histórico..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow bg-slate-50 hover:bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 hover:bg-white cursor-pointer"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            >
              <option value="ALL">Todas Ações</option>
              <option value="CRIADO">Criação</option>
              <option value="STATUS_ALTERADO">Status</option>
              <option value="PECA_ADICIONADA">Peças (+)</option>
              <option value="PECA_REMOVIDA">Peças (-)</option>
              <option value="SERVICO_ADICIONADO">Serviços (+)</option>
            </select>
            <button onClick={exportToCSV} title="Exportar CSV" className="p-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors bg-white">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={handlePrint} title="Imprimir" className="p-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors bg-white">
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
              <p>Carregando trilha de auditoria...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Ban className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-medium text-slate-600">Nenhum evento encontrado</p>
              <p className="text-sm mt-1">Não há registros de histórico para este filtro.</p>
            </div>
          ) : (
            <div className="relative pl-4 sm:pl-6 border-l-2 border-indigo-100/60 space-y-8 pb-8">
              {filteredHistory.map((event) => (
                <div key={event.id} className="relative">
                  <div className={`absolute -left-[21px] sm:-left-[29px] top-1 w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-slate-50 ${actionColors[event.action] || 'bg-slate-100 text-slate-500 border-slate-200'} border`}>
                    {actionIcons[event.action] || <Info className="w-4 h-4" />}
                  </div>
                  
                  <div className="pl-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 gap-1 sm:gap-0">
                      <span className="text-xs font-semibold text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded w-fit">
                        {new Date(event.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <User className="w-3.5 h-3.5" />
                        <span className="font-medium truncate max-w-[150px]">{event.userName}</span>
                      </div>
                    </div>
                    
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mt-2">
                      {event.description}
                    </h3>
                    
                    {renderDetails(event)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
