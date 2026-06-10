import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Search, Percent, Building2, Map, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from '../../../utils/toast.helper';
import { ModalFooterActions } from '../../../components/ui/ModalFooterActions';

export function Taxes() {
  const [taxes, setTaxes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [esferaFilter, setEsferaFilter] = useState('TODAS');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTax, setSelectedTax] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [esfera, setEsfera] = useState('MUNICIPAL');
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState('ATIVO');
  
  // Municipal
  const [municipio, setMunicipio] = useState('');
  const [codigoServico, setCodigoServico] = useState('');
  const [aliquotaIss, setAliquotaIss] = useState<number>(0);
  const [retencaoIss, setRetencaoIss] = useState(false);
  const [situacaoTributaria, setSituacaoTributaria] = useState('01');

  // Estadual
  const [uf, setUf] = useState('');
  const [cfop, setCfop] = useState('');
  const [cstIcms, setCstIcms] = useState('');
  const [csosn, setCsosn] = useState('');
  const [aliquotaIcms, setAliquotaIcms] = useState<number>(0);
  const [fcp, setFcp] = useState<number>(0);
  const [difal, setDifal] = useState<number>(0);
  const [observacao, setObservacao] = useState('');

  // Federal
  const [cstPis, setCstPis] = useState('');
  const [cstCofins, setCstCofins] = useState('');
  const [cstIpi, setCstIpi] = useState('');
  const [aliquotaPis, setAliquotaPis] = useState<number>(0);
  const [aliquotaCofins, setAliquotaCofins] = useState<number>(0);
  const [aliquotaIpi, setAliquotaIpi] = useState<number>(0);
  const [naturezaReceita, setNaturezaReceita] = useState('');

  const token = localStorage.getItem('token');

  const fetchTaxes = async () => {
    try {
      const response = await fetch('/fiscal/tributacao', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setTaxes(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch taxes', error);
      toast.error('Erro ao carregar regras de tributação.');
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  const handleOpenCreateModal = () => {
    setSelectedTax(null);
    setEsfera('MUNICIPAL');
    setCodigo('');
    setDescricao('');
    setStatus('ATIVO');
    
    // Reset specific fields
    setMunicipio(''); setCodigoServico(''); setAliquotaIss(0); setRetencaoIss(false); setSituacaoTributaria('01');
    setUf(''); setCfop(''); setCstIcms(''); setCsosn(''); setAliquotaIcms(0); setFcp(0); setDifal(0); setObservacao('');
    setCstPis(''); setCstCofins(''); setCstIpi(''); setAliquotaPis(0); setAliquotaCofins(0); setAliquotaIpi(0); setNaturezaReceita('');
    
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tax: any) => {
    setSelectedTax(tax);
    setEsfera(tax.esfera);
    setCodigo(tax.codigo);
    setDescricao(tax.descricao);
    setStatus(tax.status);
    
    // Set specific fields
    if (tax.esfera === 'MUNICIPAL') {
      setMunicipio(tax.municipio || '');
      setCodigoServico(tax.codigoServico || '');
      setAliquotaIss(tax.aliquotaIss || 0);
      setRetencaoIss(tax.retencaoIss || false);
      setSituacaoTributaria(tax.situacaoTributaria || '01');
    } else if (tax.esfera === 'ESTADUAL') {
      setUf(tax.uf || '');
      setCfop(tax.cfop || '');
      setCstIcms(tax.cstIcms || '');
      setCsosn(tax.csosn || '');
      setAliquotaIcms(tax.aliquotaIcms || 0);
      setFcp(tax.fcp || 0);
      setDifal(tax.difal || 0);
      setObservacao(tax.observacao || '');
    } else if (tax.esfera === 'FEDERAL') {
      setCstPis(tax.cstPis || '');
      setCstCofins(tax.cstCofins || '');
      setCstIpi(tax.cstIpi || '');
      setAliquotaPis(tax.aliquotaPis || 0);
      setAliquotaCofins(tax.aliquotaCofins || 0);
      setAliquotaIpi(tax.aliquotaIpi || 0);
      setNaturezaReceita(tax.naturezaReceita || '');
    }

    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTax(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!codigo || !descricao || !esfera) {
      toast.error('Esfera, Código e Descrição são campos obrigatórios.');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    const payload: any = {
      esfera,
      codigo,
      descricao,
      status,
    };

    if (esfera === 'MUNICIPAL') {
      payload.municipio = municipio || null;
      payload.codigoServico = codigoServico || null;
      payload.aliquotaIss = Number(aliquotaIss);
      payload.retencaoIss = retencaoIss;
      payload.situacaoTributaria = situacaoTributaria || null;
    } else if (esfera === 'ESTADUAL') {
      payload.uf = uf || null;
      payload.cfop = cfop || null;
      payload.cstIcms = cstIcms || null;
      payload.csosn = csosn || null;
      payload.aliquotaIcms = Number(aliquotaIcms);
      payload.fcp = Number(fcp);
      payload.difal = Number(difal);
      payload.observacao = observacao || null;
    } else if (esfera === 'FEDERAL') {
      payload.cstPis = cstPis || null;
      payload.cstCofins = cstCofins || null;
      payload.cstIpi = cstIpi || null;
      payload.aliquotaPis = Number(aliquotaPis);
      payload.aliquotaCofins = Number(aliquotaCofins);
      payload.aliquotaIpi = Number(aliquotaIpi);
      payload.naturezaReceita = naturezaReceita || null;
    }

    try {
      const url = selectedTax ? `/fiscal/tributacao/${selectedTax.id}` : '/fiscal/tributacao';
      const method = selectedTax ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(selectedTax ? 'Tributação atualizada!' : 'Tributação cadastrada!');
        handleCloseModal();
        fetchTaxes();
      } else {
        handleApiError(response, 'Erro ao salvar regra.');
      }
    } catch (error) {
      console.error('Failed to save tax', error);
      handleApiError(error, 'Erro de conexão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Deseja excluir a regra "${code}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/fiscal/tributacao/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Regra excluída com sucesso!');
        fetchTaxes();
      } else {
        handleApiError(response, 'Não foi possível excluir. O registro pode estar vinculado a produtos.');
      }
    } catch (error) {
      console.error('Failed to delete tax', error);
      toast.error('Erro de conexão ao excluir.');
    }
  };

  const filteredTaxes = taxes.filter(tax => {
    const search = searchTerm.toLowerCase();
    const matchSearch = tax.codigo.toLowerCase().includes(search) || tax.descricao.toLowerCase().includes(search);
    const matchEsfera = esferaFilter === 'TODAS' || tax.esfera === esferaFilter;
    return matchSearch && matchEsfera;
  });

  const totais = {
    MUNICIPAL: taxes.filter(t => t.esfera === 'MUNICIPAL').length,
    ESTADUAL: taxes.filter(t => t.esfera === 'ESTADUAL').length,
    FEDERAL: taxes.filter(t => t.esfera === 'FEDERAL').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tributação</h1>
          <p className="text-muted-foreground text-sm">Gerencie todas as regras de tributação Municipais, Estaduais e Federais.</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow hover:bg-primary/90 transition w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>Nova Tributação</span>
        </button>
      </div>

      {/* Cards Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Municipais</p>
            <h3 className="text-2xl font-bold">{totais.MUNICIPAL}</h3>
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center">
            <Map size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Estaduais</p>
            <h3 className="text-2xl font-bold">{totais.ESTADUAL}</h3>
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center">
            <Landmark size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Federais</p>
            <h3 className="text-2xl font-bold">{totais.FEDERAL}</h3>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Buscar por código ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-background border border-border pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-primary text-sm"
          />
        </div>
        <div className="w-full md:w-64">
          <select
            value={esferaFilter}
            onChange={(e) => setEsferaFilter(e.target.value)}
            className="w-full bg-background border border-border px-4 py-2 rounded-lg focus:outline-none focus:border-primary text-sm"
          >
            <option value="TODAS">Todas as Esferas</option>
            <option value="MUNICIPAL">Municipal</option>
            <option value="ESTADUAL">Estadual</option>
            <option value="FEDERAL">Federal</option>
          </select>
        </div>
      </div>

      {/* Table grid */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground text-sm">
                <th className="p-4 font-medium">Código</th>
                <th className="p-4 font-medium">Descrição</th>
                <th className="p-4 font-medium">Esfera</th>
                <th className="p-4 font-medium">Alíquota Principal</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTaxes.map((tax) => {
                let aliquota = 0;
                let nomeAliquota = '';
                if (tax.esfera === 'MUNICIPAL') { aliquota = tax.aliquotaIss || 0; nomeAliquota = 'ISS'; }
                if (tax.esfera === 'ESTADUAL') { aliquota = tax.aliquotaIcms || 0; nomeAliquota = 'ICMS'; }
                if (tax.esfera === 'FEDERAL') { aliquota = tax.aliquotaPis || 0; nomeAliquota = 'PIS'; } // Exemplo

                return (
                  <tr key={tax.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-bold text-foreground">{tax.codigo}</td>
                    <td className="p-4 text-sm text-foreground">{tax.descricao}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        tax.esfera === 'MUNICIPAL' ? 'bg-blue-500/10 text-blue-600' :
                        tax.esfera === 'ESTADUAL' ? 'bg-amber-500/10 text-amber-600' :
                        'bg-emerald-500/10 text-emerald-600'
                      }`}>
                        {tax.esfera}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-semibold text-foreground flex items-center gap-1">
                      <Percent size={14} className="text-muted-foreground" /> {aliquota}% <span className="text-xs text-muted-foreground ml-1">({nomeAliquota})</span>
                    </td>
                    <td className="p-4 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tax.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                      }`}>
                        {tax.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(tax)}
                          className="p-1.5 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(tax.id, tax.codigo)}
                          className="p-1.5 bg-rose-500/10 text-rose-600 rounded hover:bg-rose-500/20 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredTaxes.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Nenhuma regra cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 relative max-h-[90vh] flex flex-col">
            <button onClick={handleCloseModal} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 z-10">
              <X size={18} />
            </button>
            <div className="p-6 border-b border-border flex items-center gap-2 bg-muted/20 shrink-0">
              <Percent className="text-primary" size={20} />
              <h3 className="text-lg font-bold text-foreground">
                {selectedTax ? 'Editar Tributação' : 'Nova Tributação'}
              </h3>
            </div>

            <div className="overflow-y-auto p-6 flex-1">
              <form id="tax-form" onSubmit={handleSubmit} className="space-y-4">
                
                {/* Campos Gerais */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-border pb-4">
                  <div className="space-y-1 col-span-1">
                    <label className="text-xs font-semibold text-foreground">Esfera *</label>
                    <select
                      value={esfera}
                      onChange={(e) => setEsfera(e.target.value)}
                      disabled={!!selectedTax}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                    >
                      <option value="MUNICIPAL">Municipal</option>
                      <option value="ESTADUAL">Estadual</option>
                      <option value="FEDERAL">Federal</option>
                    </select>
                  </div>
                  <div className="space-y-1 col-span-1">
                    <label className="text-xs font-semibold text-foreground">Código *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: ISS-SP"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1 col-span-1">
                    <label className="text-xs font-semibold text-foreground">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                    >
                      <option value="ATIVO">ATIVO</option>
                      <option value="INATIVO">INATIVO</option>
                    </select>
                  </div>
                  <div className="space-y-1 col-span-full">
                    <label className="text-xs font-semibold text-foreground">Descrição *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: ISS Padrão São Paulo"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Campos Específicos MUNICIPAL */}
                {esfera === 'MUNICIPAL' && (
                  <div className="space-y-4 animate-in fade-in pt-2">
                    <h4 className="text-sm font-bold text-blue-500 mb-2">Parâmetros Municipais</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Município</label>
                        <input type="text" value={municipio} onChange={(e) => setMunicipio(e.target.value)} className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Cód. Serviço (LC 116)</label>
                        <input type="text" value={codigoServico} onChange={(e) => setCodigoServico(e.target.value)} className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Alíquota ISS (%)</label>
                        <input type="number" step="0.01" value={aliquotaIss} onChange={(e) => setAliquotaIss(Number(e.target.value))} className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Situação Tributária</label>
                        <input type="text" value={situacaoTributaria} onChange={(e) => setSituacaoTributaria(e.target.value)} className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm" />
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-muted/40 p-3 rounded-lg border border-border/80">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground">Retenção de ISS</span>
                        <span className="text-[10px] text-muted-foreground">Exige retenção pelo tomador</span>
                      </div>
                      <input type="checkbox" checked={retencaoIss} onChange={(e) => setRetencaoIss(e.target.checked)} className="w-4 h-4 rounded text-primary border-border" />
                    </div>
                  </div>
                )}

                {/* Campos Específicos ESTADUAL */}
                {esfera === 'ESTADUAL' && (
                  <div className="space-y-4 animate-in fade-in pt-2">
                    <h4 className="text-sm font-bold text-amber-500 mb-2">Parâmetros Estaduais</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1 col-span-1">
                        <label className="text-xs font-semibold text-foreground">UF</label>
                        <input type="text" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value)} className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm uppercase" />
                      </div>
                      <div className="space-y-1 col-span-1">
                        <label className="text-xs font-semibold text-foreground">CFOP</label>
                        <input type="text" value={cfop} onChange={(e) => setCfop(e.target.value)} className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-1 col-span-1">
                        <label className="text-xs font-semibold text-foreground">CST ICMS</label>
                        <input type="text" value={cstIcms} onChange={(e) => setCstIcms(e.target.value)} className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-1 col-span-1">
                        <label className="text-xs font-semibold text-foreground">CSOSN</label>
                        <input type="text" value={csosn} onChange={(e) => setCsosn(e.target.value)} className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-1 col-span-1">
                        <label className="text-xs font-semibold text-foreground">Alíquota ICMS (%)</label>
                        <input type="number" step="0.01" value={aliquotaIcms} onChange={(e) => setAliquotaIcms(Number(e.target.value))} className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-1 col-span-1">
                        <label className="text-xs font-semibold text-foreground">FCP (%)</label>
                        <input type="number" step="0.01" value={fcp} onChange={(e) => setFcp(Number(e.target.value))} className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-1 col-span-1">
                        <label className="text-xs font-semibold text-foreground">DIFAL (%)</label>
                        <input type="number" step="0.01" value={difal} onChange={(e) => setDifal(Number(e.target.value))} className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Observações Fiscais</label>
                      <input type="text" value={observacao} onChange={(e) => setObservacao(e.target.value)} className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm" />
                    </div>
                  </div>
                )}

                {/* Campos Específicos FEDERAL */}
                {esfera === 'FEDERAL' && (
                  <div className="space-y-4 animate-in fade-in pt-2">
                    <h4 className="text-sm font-bold text-emerald-500 mb-2">Parâmetros Federais</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">CST PIS</label>
                        <input type="text" value={cstPis} onChange={(e) => setCstPis(e.target.value)} className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">CST COFINS</label>
                        <input type="text" value={cstCofins} onChange={(e) => setCstCofins(e.target.value)} className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">CST IPI</label>
                        <input type="text" value={cstIpi} onChange={(e) => setCstIpi(e.target.value)} className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Alíquota PIS (%)</label>
                        <input type="number" step="0.01" value={aliquotaPis} onChange={(e) => setAliquotaPis(Number(e.target.value))} className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Alíquota COFINS (%)</label>
                        <input type="number" step="0.01" value={aliquotaCofins} onChange={(e) => setAliquotaCofins(Number(e.target.value))} className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Alíquota IPI (%)</label>
                        <input type="number" step="0.01" value={aliquotaIpi} onChange={(e) => setAliquotaIpi(Number(e.target.value))} className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-1 col-span-full">
                        <label className="text-xs font-semibold text-foreground">Natureza da Receita</label>
                        <input type="text" value={naturezaReceita} onChange={(e) => setNaturezaReceita(e.target.value)} className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm" />
                      </div>
                    </div>
                  </div>
                )}

              </form>
            </div>
            
            <div className="shrink-0 p-6 border-t border-border">
              <ModalFooterActions
                onCancel={handleCloseModal}
                primaryLabel={selectedTax ? 'Atualizar' : 'Cadastrar'}
                loading={isSubmitting}
                formId="tax-form"
                primaryType="submit"
                flush
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
