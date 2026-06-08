import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, RefreshCw, X, Eye, Ban, Calendar, User, DollarSign, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from '../../utils/toast.helper';

export function NfeImport() {
  const [activeView, setActiveView] = useState<'import' | 'history'>('import');
  
  // History list
  const [history, setHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedNfe, setSelectedNfe] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Ingestion workflow states
  const [isReadingXml, setIsReadingXml] = useState(false);
  const [xmlText, setXmlText] = useState('');
  const [nfeResult, setNfeResult] = useState<any>(null);
  const [gerarContasPagar, setGerarContasPagar] = useState(true);

  // Tax lookup options (to link new products)
  const [municipalTaxes, setMunicipalTaxes] = useState<any[]>([]);
  const [estadualTaxes, setEstadualTaxes] = useState<any[]>([]);
  const [federalTaxes, setFederalTaxes] = useState<any[]>([]);

  const token = localStorage.getItem('token');

  const fetchHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const response = await fetch('/fiscal/nfe', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setHistory(await response.json());
      }
    } catch (error) {
      console.error('Failed to load imports history', error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const fetchTaxes = async () => {
    try {
      const [munRes, estRes, fedRes] = await Promise.all([
        fetch('/fiscal/tributacao/municipal', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/fiscal/tributacao/estadual', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/fiscal/tributacao/federal', { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);

      if (munRes.ok) setMunicipalTaxes(await munRes.json());
      if (estRes.ok) setEstadualTaxes(await estRes.json());
      if (fedRes.ok) setFederalTaxes(await fedRes.json());
    } catch (error) {
      console.error('Failed to load tax rules', error);
    }
  };

  useEffect(() => {
    if (activeView === 'history') {
      fetchHistory();
    } else {
      fetchTaxes();
    }
  }, [activeView]);

  // Handle XML upload
  const handleXmlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/xml' && !file.name.endsWith('.xml')) {
      toast.error('Por favor, selecione um arquivo XML válido.');
      return;
    }

    setIsReadingXml(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setXmlText(text);

      try {
        const response = await fetch('/fiscal/nfe/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ xmlContent: text })
        });

        if (response.ok) {
          const result = await response.json();
          // Initialize item choices
          const itemsWithChoices = result.items.map((item: any) => ({
            ...item,
            createProduct: !item.productId, // default to create if not found
            tributacaoMunicipalId: '',
            tributacaoEstadualId: '',
            tributacaoFederalId: ''
          }));
          setNfeResult({ ...result, items: itemsWithChoices });
          toast.success('XML lido com sucesso! Revise os dados abaixo.');
        } else {
          handleApiError(response, 'Falha ao validar XML.');
        }
      } catch (error) {
        console.error('Upload error', error);
        toast.error('Erro de conexão ao enviar XML.');
      } finally {
        setIsReadingXml(false);
      }
    };
    reader.readAsText(file);
  };

  // Modify individual item resolution
  const handleItemPropertyChange = (index: number, field: string, value: any) => {
    if (!nfeResult) return;
    const newItems = [...nfeResult.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setNfeResult({ ...nfeResult, items: newItems });
  };

  // Confirm Ingestion
  const handleConfirmImport = async () => {
    if (!nfeResult) return;

    // Check if any unmatched item lacks createProduct or a link
    const hasUnresolved = nfeResult.items.some((item: any) => !item.productId && !item.createProduct);
    if (hasUnresolved) {
      toast.error('Todos os itens da nota precisam ser associados a um produto ou marcados para cadastro.');
      return;
    }

    const payload = {
      chaveAcesso: nfeResult.chaveAcesso,
      numeroNf: nfeResult.numeroNf,
      serie: nfeResult.serie,
      dataEmissao: nfeResult.dataEmissao,
      naturezaOperacao: nfeResult.naturezaOperacao,
      valorProdutos: nfeResult.valorProdutos,
      valorFrete: nfeResult.valorFrete,
      valorSeguro: nfeResult.valorSeguro,
      valorDesconto: nfeResult.valorDesconto,
      valorTotal: nfeResult.valorTotal,
      xmlOriginal: xmlText,
      supplier: nfeResult.supplier,
      items: nfeResult.items,
      gerarContasPagar
    };

    try {
      const response = await fetch('/fiscal/nfe/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 201) {
        toast.success('Nota Fiscal importada e estoque atualizado com sucesso!');
        setNfeResult(null);
        setXmlText('');
        setActiveView('history');
      } else {
        handleApiError(response, 'Erro ao confirmar importação.');
      }
    } catch (error) {
      console.error('Confirmation error', error);
      toast.error('Erro de conexão ao consolidar.');
    }
  };

  // View individual history NFe details
  const handleViewDetails = async (id: string) => {
    try {
      const response = await fetch(`/fiscal/nfe/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setSelectedNfe(await response.json());
        setIsDetailModalOpen(true);
      } else {
        toast.error('Erro ao carregar detalhes.');
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Cancel NFe (admin only)
  const handleCancelNfe = async (id: string, number: string) => {
    if (!window.confirm(`ATENÇÃO: Deseja cancelar a importação da NF-e Nº ${number}? Isso registrará um log de auditoria.`)) {
      return;
    }

    try {
      const response = await fetch(`/fiscal/nfe/${id}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Importação cancelada com sucesso!');
        setIsDetailModalOpen(false);
        fetchHistory();
      } else {
        handleApiError(response, 'Erro ao cancelar importação. Verifique suas permissões.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro de conexão.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Importação de Notas Fiscais</h1>
          <p className="text-muted-foreground text-sm">Gerencie a entrada de mercadorias no estoque via XML fiscal.</p>
        </div>
        <div className="flex bg-muted p-1 rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setActiveView('import')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeView === 'import' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Importar XML
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeView === 'history' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Histórico de Notas
          </button>
        </div>
      </div>

      {activeView === 'import' ? (
        <div className="space-y-6">
          {!nfeResult ? (
            /* Step 1: Upload XML */
            <div className="bg-card border border-border border-dashed rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-primary/5 text-primary flex items-center justify-center rounded-full mx-auto">
                <Upload size={32} />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">Selecione o arquivo da NF-e</h3>
                <p className="text-muted-foreground text-sm mt-1">Insira o arquivo XML original emitido pelo seu fornecedor.</p>
              </div>
              <div className="pt-2">
                <label className="bg-primary text-primary-foreground hover:bg-primary/90 transition px-5 py-2.5 rounded-lg font-semibold cursor-pointer shadow inline-flex items-center gap-2">
                  <Upload size={16} />
                  <span>Escolher Arquivo XML</span>
                  <input
                    type="file"
                    accept=".xml"
                    onChange={handleXmlUpload}
                    className="hidden"
                    disabled={isReadingXml}
                  />
                </label>
              </div>
              {isReadingXml && (
                <div className="flex items-center justify-center gap-2 text-primary text-sm font-semibold pt-2">
                  <RefreshCw className="animate-spin" size={16} />
                  <span>Processando XML do fornecedor...</span>
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Review & Resolution */
            <div className="space-y-6">
              {/* Warnings and alerts */}
              <div className="grid grid-cols-1 gap-3">
                {nfeResult.isDuplicate && (
                  <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl text-rose-600 flex gap-3 items-start">
                    <AlertTriangle className="flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-bold text-sm">Chave de Acesso Duplicada</h4>
                      <p className="text-xs mt-1">Este documento fiscal já foi importado anteriormente no sistema. Verifique a chave de acesso.</p>
                    </div>
                  </div>
                )}
                {!nfeResult.isCnpjMatch && (
                  <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-amber-600 flex gap-3 items-start">
                    <AlertTriangle className="flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-bold text-sm">Divergência de CNPJ do Destinatário</h4>
                      <p className="text-xs mt-1">O CNPJ de destino da nota ({nfeResult.destCnpj}) difere do CNPJ cadastrado nesta empresa ({nfeResult.companyCnpj}).</p>
                    </div>
                  </div>
                )}
              </div>

              {/* NFe Header metadata */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <FileText className="text-primary" size={20} />
                    <span>Detalhes do Cabeçalho da NF-e</span>
                  </h3>
                  <span className="text-xs font-mono bg-muted border border-border px-2 py-1 rounded">Chave: {nfeResult.chaveAcesso}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-foreground">
                  <div>
                    <span className="text-muted-foreground block text-xs">Número da Nota</span>
                    <span className="font-bold">{nfeResult.numeroNf} - Série {nfeResult.serie || 'Única'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Data de Emissão</span>
                    <span className="font-semibold">{new Date(nfeResult.dataEmissao).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Natureza da Operação</span>
                    <span className="font-semibold">{nfeResult.naturezaOperacao || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Valor Total da Nota</span>
                    <span className="font-bold text-primary text-base">R$ {nfeResult.valorTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Supplier Info */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <h3 className="font-bold text-foreground">Fornecedor Emitente</h3>
                  {nfeResult.supplier.id ? (
                    <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-xs font-semibold">Fornecedor Cadastrado</span>
                  ) : (
                    <span className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full text-xs font-semibold">Novo Cadastro Automático</span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-foreground">
                  <div>
                    <span className="text-muted-foreground block text-xs">Razão Social</span>
                    <span className="font-semibold">{nfeResult.supplier.razaoSocial}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">CNPJ</span>
                    <span className="font-mono">{nfeResult.supplier.cnpj}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Cidade / Estado</span>
                    <span>{nfeResult.supplier.cidade || '-'} - {nfeResult.supplier.estado || ''}</span>
                  </div>
                </div>
              </div>

              {/* Items Resolution Table */}
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/20">
                  <h3 className="font-bold text-foreground">Resolução de Produtos e Estoque</h3>
                  <p className="text-xs text-muted-foreground">Mapeie os itens do XML com os produtos do seu catálogo.</p>
                </div>
          <div className="w-full">
            <table className="w-full text-left border-collapse table-fixed break-words">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-muted-foreground text-sm">
                  <th className="p-4 font-medium w-4/12 md:w-3/12">Item XML (Cód / Descrição)</th>
                  <th className="p-4 font-medium text-center hidden md:table-cell w-2/12">Quant / Unitário</th>
                  <th className="p-4 font-medium w-4/12 md:w-3/12">Status no Catálogo</th>
                  <th className="p-4 font-medium w-4/12 md:w-4/12">Configuração Fiscal (Caso Novo)</th>
                </tr>
              </thead>
              <tbody>
                {nfeResult.items.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-border hover:bg-muted/10 transition-colors">
                    <td className="p-4 truncate">
                      <div className="font-semibold text-foreground text-sm truncate">{item.descricao}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">
                        Cód: {item.codigoProduto} {item.codigoBarras && `| EAN: ${item.codigoBarras}`}
                      </div>
                      <div className="md:hidden mt-1 text-xs font-semibold text-foreground truncate">
                        {item.quantidade} ({item.unidade || 'UN'}) - R$ {item.valorUnitario.toFixed(2)}
                      </div>
                    </td>
                    <td className="p-4 text-center text-sm text-foreground hidden md:table-cell truncate">
                      <div className="truncate">{item.quantidade} ({item.unidade || 'UN'})</div>
                      <div className="text-xs text-muted-foreground font-semibold truncate">R$ {item.valorUnitario.toFixed(2)}</div>
                    </td>
                    <td className="p-4 truncate">
                      {item.productId ? (
                        <div className="space-y-1 truncate">
                          <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded text-xs font-semibold block w-fit truncate">
                            Vinculado Automático
                          </span>
                          <div className="text-[10px] text-muted-foreground truncate">{item.productDescricao}</div>
                        </div>
                      ) : (
                        <div className="space-y-2 truncate">
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              id={`create-${idx}`}
                              checked={item.createProduct}
                              onChange={(e) => handleItemPropertyChange(idx, 'createProduct', e.target.checked)}
                              className="w-4 h-4 rounded text-primary border-border focus:ring-primary shrink-0"
                            />
                            <label htmlFor={`create-${idx}`} className="text-xs font-semibold text-foreground cursor-pointer truncate">
                              Cadastrar como Novo Produto
                            </label>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="p-4 truncate">
                      {item.createProduct && !item.productId ? (
                        <div className="space-y-1 truncate">
                          <select
                            value={item.tributacaoEstadualId}
                            onChange={(e) => handleItemPropertyChange(idx, 'tributacaoEstadualId', e.target.value)}
                            className="w-full bg-background border border-border px-2 py-1 rounded text-xs focus:border-primary focus:outline-none truncate"
                          >
                            <option value="">Regra Estadual (ICMS)...</option>
                            {estadualTaxes.map(tax => (
                              <option key={tax.id} value={tax.id} className="truncate">{tax.codigo} ({tax.aliquotaIcms}%)</option>
                            ))}
                          </select>
                          <select
                            value={item.tributacaoFederalId}
                            onChange={(e) => handleItemPropertyChange(idx, 'tributacaoFederalId', e.target.value)}
                            className="w-full bg-background border border-border px-2 py-1 rounded text-xs focus:border-primary focus:outline-none truncate"
                          >
                            <option value="">Regra Federal (IPI/PIS/COF)...</option>
                            {federalTaxes.map(tax => (
                              <option key={tax.id} value={tax.id} className="truncate">{tax.codigo}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic truncate">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
              </div>

              {/* Finance Automation Option */}
              <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                    <DollarSign className="text-primary" size={16} /> Integração Financeira Automática
                  </h4>
                  <p className="text-xs text-muted-foreground">Gerar lançamento de Contas a Pagar para este fornecedor (vencimento em 30 dias).</p>
                </div>
                <input
                  type="checkbox"
                  checked={gerarContasPagar}
                  onChange={(e) => setGerarContasPagar(e.target.checked)}
                  className="w-5 h-5 rounded text-primary border-border focus:ring-primary"
                />
              </div>

              {/* Footer Confirmation Controls */}
              <div className="flex justify-between items-center pt-4 border-t border-border">
                <button
                  onClick={() => { setNfeResult(null); setXmlText(''); }}
                  className="flex items-center gap-2 border border-border px-4 py-2 rounded-lg text-foreground hover:bg-muted font-semibold text-sm transition"
                >
                  <ArrowLeft size={16} /> Voltar / Cancelar
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={nfeResult.isDuplicate}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-bold shadow hover:bg-primary/90 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Confirmar Importação de Itens</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* View History Log */
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="w-full">
              <table className="w-full text-left border-collapse table-fixed break-words">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground text-sm">
                    <th className="p-4 font-medium w-4/12 sm:w-3/12 lg:w-2/12">Nº / Série</th>
                    <th className="p-4 font-medium w-4/12 sm:w-4/12 md:w-3/12 lg:w-4/12">Fornecedor</th>
                    <th className="p-4 font-medium hidden sm:table-cell w-3/12 md:w-2/12">Emissão</th>
                    <th className="p-4 font-medium w-4/12 sm:w-3/12 md:w-2/12 lg:w-2/12">Valor</th>
                    <th className="p-4 font-medium hidden md:table-cell w-2/12 lg:w-1/12">Status</th>
                    <th className="p-4 font-medium hidden sm:table-cell w-1/12 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {isHistoryLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-primary font-semibold">
                        <RefreshCw className="animate-spin inline mr-2" size={16} /> Carregando histórico...
                      </td>
                    </tr>
                  ) : history.map((nfe) => (
                    <tr key={nfe.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="p-4 truncate">
                        <div className="font-bold text-foreground truncate">Nº {nfe.numeroNf}</div>
                        <div className="text-xs text-muted-foreground font-mono truncate">Série: {nfe.serie || 'Única'}</div>
                      </td>
                      <td className="p-4 text-sm text-foreground truncate">
                        {nfe.supplier?.razaoSocial || 'Fornecedor Excluído'}
                      </td>
                      <td className="p-4 text-sm text-foreground hidden sm:table-cell truncate">
                        {new Date(nfe.dataEmissao).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4 text-sm font-semibold text-foreground truncate">
                        R$ {nfe.valorTotal.toFixed(2)}
                      </td>
                      <td className="p-4 text-sm hidden md:table-cell truncate">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold truncate block w-fit ${
                          nfe.status === 'IMPORTADO' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                        }`}>
                          {nfe.status}
                        </span>
                      </td>
                      <td className="p-4 text-center hidden sm:table-cell truncate">
                        <button
                          onClick={() => handleViewDetails(nfe.id)}
                          className="p-1.5 bg-muted text-foreground hover:bg-secondary rounded transition shrink-0 inline-flex items-center justify-center"
                          title="Visualizar Detalhes"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && !isHistoryLoading && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        Nenhuma nota fiscal foi importada ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedNfe && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 relative">
            <button onClick={() => setIsDetailModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1">
              <X size={18} />
            </button>
            
            <div className="p-6 border-b border-border bg-muted/20 mr-8">
              <h3 className="text-lg font-bold text-foreground">
                NF-e Consolidada Nº {selectedNfe.numeroNf} - Série {selectedNfe.serie || 'Única'}
              </h3>
              <p className="text-xs text-muted-foreground font-mono mt-1">Chave: {selectedNfe.chaveAcesso}</p>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border border-border">
                <div className="flex gap-2.5 items-center">
                  <User className="text-primary" size={18} />
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-bold">Fornecedor</span>
                    <span className="text-xs font-semibold text-foreground">{selectedNfe.supplier?.razaoSocial}</span>
                  </div>
                </div>
                <div className="flex gap-2.5 items-center">
                  <Calendar className="text-primary" size={18} />
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-bold">Emissão</span>
                    <span className="text-xs font-semibold text-foreground">{new Date(selectedNfe.dataEmissao).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <div className="flex gap-2.5 items-center">
                  <DollarSign className="text-emerald-500" size={18} />
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-bold">Valor Total</span>
                    <span className="text-xs font-bold text-foreground">R$ {selectedNfe.valorTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Itens da Nota Fiscal</h4>
                <div className="border border-border rounded-lg w-full">
                  <table className="w-full text-left border-collapse table-fixed break-words">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border text-[11px] text-muted-foreground uppercase font-bold">
                        <th className="p-3 w-4/12 sm:w-4/12">Item / Código</th>
                        <th className="p-3 text-center hidden sm:table-cell w-2/12">Quant</th>
                        <th className="p-3 text-right hidden sm:table-cell w-2/12">Unitário</th>
                        <th className="p-3 text-right w-3/12 sm:w-2/12">Total</th>
                        <th className="p-3 w-5/12 sm:w-2/12">Impostos XML</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedNfe.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-border text-xs text-foreground last:border-0 hover:bg-muted/10 transition-colors">
                          <td className="p-3 truncate">
                            <div className="font-semibold truncate">{item.descricao}</div>
                            <div className="text-[10px] text-muted-foreground font-mono truncate">XML Ref: {item.codigoProduto}</div>
                            <div className="sm:hidden text-[10px] mt-1 font-semibold text-foreground truncate">
                              {item.quantidade} ({item.unidade || 'UN'}) x R$ {item.valorUnitario.toFixed(2)}
                            </div>
                          </td>
                          <td className="p-3 text-center hidden sm:table-cell truncate">{item.quantidade} ({item.unidade || 'UN'})</td>
                          <td className="p-3 text-right hidden sm:table-cell truncate">R$ {item.valorUnitario.toFixed(2)}</td>
                          <td className="p-3 text-right font-semibold truncate">R$ {item.valorTotal.toFixed(2)}</td>
                          <td className="p-3 text-[10px] text-muted-foreground space-y-0.5 font-mono truncate">
                            {item.icmsValor > 0 && <div className="truncate">ICMS: R$ {item.icmsValor.toFixed(2)} ({item.icmsAliquota}%)</div>}
                            {item.ipiValor > 0 && <div className="truncate">IPI: R$ {item.ipiValor.toFixed(2)} ({item.ipiAliquota}%)</div>}
                            {item.icmsValor <= 0 && item.ipiValor <= 0 && <span className="italic truncate">Isento/Não inf.</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cancellation trigger for administrator role */}
              {selectedNfe.status !== 'CANCELADO' && (
                <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-rose-600 text-xs uppercase tracking-wider flex items-center gap-1">
                      <Ban size={14} /> Zona de Risco
                    </h5>
                    <p className="text-[11px] text-muted-foreground">Cancelar esta importação irá reverter o status para CANCELADO nas auditorias fiscais.</p>
                  </div>
                  <button
                    onClick={() => handleCancelNfe(selectedNfe.id, selectedNfe.numeroNf)}
                    className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 transition text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow"
                  >
                    <Ban size={12} />
                    <span>Cancelar Importação</span>
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-4 flex justify-end bg-muted/10 p-6">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-muted hover:bg-secondary border border-border rounded-lg text-foreground text-xs font-semibold transition"
              >
                Fechar Painel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
