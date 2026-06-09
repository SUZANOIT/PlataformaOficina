import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Search, Package, DollarSign, BarChart2, Tag, Percent, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from '../utils/toast.helper';
import { ModalFooterActions } from '../components/ui/ModalFooterActions';

export function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Tax options
  const [municipalTaxes, setMunicipalTaxes] = useState<any[]>([]);
  const [estadualTaxes, setEstadualTaxes] = useState<any[]>([]);
  const [federalTaxes, setFederalTaxes] = useState<any[]>([]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'fiscal'>('geral');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form states
  const [codigo, setCodigo] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [descricao, setDescricao] = useState('');
  const [unidade, setUnidade] = useState('UN');
  const [valorCusto, setValorCusto] = useState(0);
  const [custoMedio, setCustoMedio] = useState(0);
  const [quantidadeEstoque, setQuantidadeEstoque] = useState(0);
  const [ncm, setNcm] = useState('');
  const [cest, setCest] = useState('');
  const [cfopEntrada, setCfopEntrada] = useState('');
  const [tributacaoMunicipalId, setTributacaoMunicipalId] = useState('');
  const [tributacaoEstadualId, setTributacaoEstadualId] = useState('');
  const [tributacaoFederalId, setTributacaoFederalId] = useState('');

  const token = localStorage.getItem('token');

  const fetchProducts = async () => {
    try {
      const response = await fetch('/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Failed to load products', error);
      toast.error('Erro ao carregar lista de produtos.');
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
    fetchProducts();
    fetchTaxes();
  }, []);

  const handleOpenCreateModal = () => {
    setSelectedProduct(null);
    setActiveTab('geral');
    setCodigo('');
    setCodigoBarras('');
    setDescricao('');
    setUnidade('UN');
    setValorCusto(0);
    setCustoMedio(0);
    setQuantidadeEstoque(0);
    setNcm('');
    setCest('');
    setCfopEntrada('');
    setTributacaoMunicipalId('');
    setTributacaoEstadualId('');
    setTributacaoFederalId('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: any) => {
    setSelectedProduct(product);
    setActiveTab('geral');
    setCodigo(product.codigo || '');
    setCodigoBarras(product.codigoBarras || '');
    setDescricao(product.descricao || '');
    setUnidade(product.unidade || 'UN');
    setValorCusto(product.valorCusto || 0);
    setCustoMedio(product.custoMedio || 0);
    setQuantidadeEstoque(product.quantidadeEstoque || 0);
    setNcm(product.ncm || '');
    setCest(product.cest || '');
    setCfopEntrada(product.cfopEntrada || '');
    setTributacaoMunicipalId(product.tributacaoMunicipalId || '');
    setTributacaoEstadualId(product.tributacaoEstadualId || '');
    setTributacaoFederalId(product.tributacaoFederalId || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!descricao) {
      toast.error('A descrição do produto é obrigatória.');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    const payload = {
      codigo: codigo || null,
      codigoBarras: codigoBarras || null,
      descricao,
      unidade,
      valorCusto: Number(valorCusto),
      custoMedio: Number(custoMedio),
      quantidadeEstoque: Number(quantidadeEstoque),
      ncm: ncm || null,
      cest: cest || null,
      cfopEntrada: cfopEntrada || null,
      tributacaoMunicipalId: tributacaoMunicipalId || null,
      tributacaoEstadualId: tributacaoEstadualId || null,
      tributacaoFederalId: tributacaoFederalId || null,
    };

    try {
      const url = selectedProduct ? `/products/${selectedProduct.id}` : '/products';
      const method = selectedProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(selectedProduct ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!');
        handleCloseModal();
        fetchProducts();
      } else {
        handleApiError(response, 'Erro ao salvar dados do produto.');
      }
    } catch (error) {
      console.error('Failed to save product', error);
      handleApiError(error, 'Erro de conexão ao salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, description: string) => {
    if (!window.confirm(`Tem certeza de que deseja excluir o produto "${description}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Produto excluído com sucesso!');
        fetchProducts();
      } else {
        toast.error('Erro ao excluir produto. Verifique se ele está vinculado a alguma nota fiscal importada.');
      }
    } catch (error) {
      console.error('Failed to delete product', error);
      toast.error('Erro de conexão ao excluir.');
    }
  };

  const filteredProducts = products.filter(product => {
    const search = searchTerm.toLowerCase();
    return (
      product.descricao?.toLowerCase().includes(search) ||
      product.codigo?.toLowerCase().includes(search) ||
      product.codigoBarras?.toLowerCase().includes(search) ||
      product.ncm?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Catálogo de Produtos</h1>
          <p className="text-muted-foreground text-sm">Gerencie o estoque, custos e as regras fiscais dos itens da oficina.</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow hover:bg-primary/90 transition w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>Novo Produto</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-lg">
            <Package size={24} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Itens Cadastrados</div>
            <div className="text-xl font-bold text-foreground">{products.length}</div>
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-lg">
            <BarChart2 size={24} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Quantidade Total em Estoque</div>
            <div className="text-xl font-bold text-foreground">
              {products.reduce((acc, curr) => acc + (curr.quantidadeEstoque || 0), 0).toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-lg">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Custo Total em Estoque</div>
            <div className="text-xl font-bold text-foreground">
              R$ {products.reduce((acc, curr) => acc + ((curr.quantidadeEstoque || 0) * (curr.custoMedio || curr.valorCusto || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Buscar por descrição, código de referência, código de barras, NCM..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-background border border-border pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-primary text-sm"
          />
        </div>
      </div>

      {/* Product List */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="w-full">
          <table className="w-full text-left border-collapse table-fixed break-words">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground text-sm">
                <th className="p-4 font-medium w-4/12 lg:w-3/12">Produto / Referência</th>
                <th className="p-4 font-medium w-3/12 lg:w-2/12">Estoque / Und.</th>
                <th className="p-4 font-medium w-3/12 lg:w-2/12">Custo</th>
                <th className="p-4 font-medium hidden lg:table-cell w-2/12">NCM / CEST</th>
                <th className="p-4 font-medium hidden xl:table-cell w-2/12">Tributações Vinculadas</th>
                <th className="p-4 font-medium w-2/12 lg:w-1/12 text-center lg:text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="p-4 truncate">
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                        {product.descricao.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-foreground truncate">{product.descricao}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 truncate">
                          {product.codigo && <span className="truncate">Ref: {product.codigo}</span>}
                          {product.codigoBarras && <span className="truncate">EAN: {product.codigoBarras}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-foreground truncate">
                    <span className={`font-semibold ${product.quantidadeEstoque <= 0 ? 'text-rose-500' : 'text-foreground'}`}>
                      {product.quantidadeEstoque.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">({product.unidade || 'UN'})</span>
                  </td>
                  <td className="p-4 text-sm text-foreground space-y-0.5 truncate">
                    <div className="truncate">Custo: R$ {(product.valorCusto || 0).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground truncate">Médio: R$ {(product.custoMedio || 0).toFixed(2)}</div>
                  </td>
                  <td className="p-4 text-xs text-muted-foreground space-y-0.5 font-mono hidden lg:table-cell truncate">
                    {product.ncm && <div className="truncate">NCM: {product.ncm}</div>}
                    {product.cest && <div className="truncate">CEST: {product.cest}</div>}
                    {!product.ncm && !product.cest && <span className="italic">Não informado</span>}
                  </td>
                  <td className="p-4 text-xs space-y-1 hidden xl:table-cell truncate">
                    {product.tributacaoMunicipal && (
                      <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full text-[10px] font-semibold mr-1 truncate">
                        <Percent className="shrink-0" size={10} /> <span className="truncate">ISS: {product.tributacaoMunicipal.codigo}</span>
                      </span>
                    )}
                    {product.tributacaoEstadual && (
                      <span className="inline-flex items-center gap-1 bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded-full text-[10px] font-semibold mr-1 truncate">
                        <Percent className="shrink-0" size={10} /> <span className="truncate">ICMS: {product.tributacaoEstadual.codigo}</span>
                      </span>
                    )}
                    {product.tributacaoFederal && (
                      <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-semibold truncate">
                        <Percent className="shrink-0" size={10} /> <span className="truncate">FED: {product.tributacaoFederal.codigo}</span>
                      </span>
                    )}
                    {!product.tributacaoMunicipal && !product.tributacaoEstadual && !product.tributacaoFederal && (
                      <span className="text-muted-foreground italic">Sem tributação</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2 justify-center lg:justify-start">
                      <button 
                        onClick={() => handleOpenEditModal(product)}
                        className="p-1.5 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id, product.descricao)}
                        className="p-1.5 bg-rose-500/10 text-rose-600 rounded hover:bg-rose-500/20 transition"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Nenhum produto cadastrado ou localizado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8 relative">
            <button 
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/50 transition z-50"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
              <div className="flex items-center gap-2">
                <Package className="text-primary" size={22} />
                <h3 className="text-lg font-bold text-foreground">
                  {selectedProduct ? 'Editar Produto' : 'Novo Produto'}
                </h3>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-border bg-muted/10 px-6">
              <button
                type="button"
                onClick={() => setActiveTab('geral')}
                className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'geral'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <ClipboardList size={16} /> Informações Gerais
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('fiscal')}
                className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'fiscal'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Tag size={16} /> Aba Fiscal / Tributos
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {activeTab === 'geral' ? (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Descrição do Produto <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Óleo Semissintético 15W40"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Código de Referência (ID)</label>
                      <input
                        type="text"
                        placeholder="Ex: OLE-15W40"
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1 font-mono">
                      <label className="text-xs font-semibold text-foreground">Código de Barras (EAN)</label>
                      <input
                        type="text"
                        placeholder="Ex: 7891000111222"
                        value={codigoBarras}
                        onChange={(e) => setCodigoBarras(e.target.value)}
                        className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Unidade de Medida</label>
                      <input
                        type="text"
                        placeholder="Ex: UN, LT, KG"
                        value={unidade}
                        onChange={(e) => setUnidade(e.target.value)}
                        className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border pt-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Valor de Custo (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={valorCusto}
                        onChange={(e) => setValorCusto(Number(e.target.value))}
                        className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Custo Médio (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={custoMedio}
                        onChange={(e) => setCustoMedio(Number(e.target.value))}
                        className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Quantidade em Estoque</label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        value={quantidadeEstoque}
                        onChange={(e) => setQuantidadeEstoque(Number(e.target.value))}
                        className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 text-xs text-primary mb-2">
                    Defina os códigos fiscais do produto para automação no preenchimento de notas fiscais e cálculo correto dos impostos.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1 font-mono">
                      <label className="text-xs font-semibold text-foreground font-sans">NCM (Nomenclatura Comum Mercosul)</label>
                      <input
                        type="text"
                        placeholder="Ex: 38112100"
                        value={ncm}
                        onChange={(e) => setNcm(e.target.value)}
                        className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1 font-mono">
                      <label className="text-xs font-semibold text-foreground font-sans">CEST (Código Especificador Substituição)</label>
                      <input
                        type="text"
                        placeholder="Ex: 0100100"
                        value={cest}
                        onChange={(e) => setCest(e.target.value)}
                        className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1 font-mono">
                      <label className="text-xs font-semibold text-foreground font-sans">CFOP Padrão de Entrada</label>
                      <input
                        type="text"
                        placeholder="Ex: 1102"
                        value={cfopEntrada}
                        onChange={(e) => setCfopEntrada(e.target.value)}
                        className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Associação de Regras de Tributação</h4>
                    
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Regra de Tributação Municipal (ISS)</label>
                        <select
                          value={tributacaoMunicipalId}
                          onChange={(e) => setTributacaoMunicipalId(e.target.value)}
                          className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                        >
                          <option value="">-- Selecione uma regra municipal --</option>
                          {municipalTaxes.map(tax => (
                            <option key={tax.id} value={tax.id}>{tax.codigo} - {tax.descricao} ({tax.aliquotaIss}% ISS)</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Regra de Tributação Estadual (ICMS)</label>
                        <select
                          value={tributacaoEstadualId}
                          onChange={(e) => setTributacaoEstadualId(e.target.value)}
                          className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                        >
                          <option value="">-- Selecione uma regra estadual --</option>
                          {estadualTaxes.map(tax => (
                            <option key={tax.id} value={tax.id}>{tax.codigo} - {tax.descricao} ({tax.uf || 'Todos'} / CST: {tax.cstIcms || tax.csosn || 'N/A'})</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Regra de Tributação Federal (IPI, PIS, COFINS)</label>
                        <select
                          value={tributacaoFederalId}
                          onChange={(e) => setTributacaoFederalId(e.target.value)}
                          className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                        >
                          <option value="">-- Selecione uma regra federal --</option>
                          {federalTaxes.map(tax => (
                            <option key={tax.id} value={tax.id}>{tax.codigo} - {tax.descricao} (PIS: {tax.aliquotaPis}% / COFINS: {tax.aliquotaCofins}%)</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <ModalFooterActions
                onCancel={handleCloseModal}
                primaryLabel={selectedProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                loading={isSubmitting}
                primaryType="submit"
                flush
              />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
