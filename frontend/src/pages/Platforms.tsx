import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Search, Building, Phone, Mail, User, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { platformService } from '../services/platformService';
import { useBreadcrumbs } from '../context/BreadcrumbContext';

export function Platforms() {
  useBreadcrumbs([{ label: 'Plataformas de Gestão' }]);

  const [platforms, setPlatforms] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Loaders
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<any>(null);

  // Form Fields
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [status, setStatus] = useState<'ATIVO' | 'INATIVO'>('ATIVO');
  const [observacoes, setObservacoes] = useState('');
  const [endereco, setEndereco] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cep, setCep] = useState('');

  const fetchPlatforms = async () => {
    setIsLoadingList(true);
    try {
      const res = await platformService.list({
        search: searchTerm,
        status: statusFilter,
        page,
        limit: 10
      });
      setPlatforms(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotal(res.total || 0);
    } catch (error) {
      console.error('Error fetching platforms:', error);
      toast.error('Erro ao carregar plataformas de gestão.');
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    fetchPlatforms();
  }, [searchTerm, statusFilter, page]);

  const handleOpenCreateModal = () => {
    setSelectedPlatform(null);
    setRazaoSocial('');
    setNomeFantasia('');
    setCnpj('');
    setTelefone('');
    setEmail('');
    setResponsavel('');
    setStatus('ATIVO');
    setObservacoes('');
    setEndereco('');
    setCidade('');
    setEstado('');
    setCep('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (platform: any) => {
    setSelectedPlatform(platform);
    setRazaoSocial(platform.razaoSocial || '');
    setNomeFantasia(platform.nomeFantasia || '');
    setCnpj(platform.cnpj || '');
    setTelefone(platform.telefone || '');
    setEmail(platform.email || '');
    setResponsavel(platform.responsavel || '');
    setStatus(platform.status || 'ATIVO');
    setObservacoes(platform.observacoes || '');
    setEndereco(platform.endereco || '');
    setCidade(platform.cidade || '');
    setEstado(platform.estado || '');
    setCep(platform.cep || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPlatform(null);
  };

  const handleCNPJLookup = async () => {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) {
      toast.error('Informe um CNPJ válido com 14 dígitos para consulta.');
      return;
    }

    setIsLoadingCNPJ(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/cnpj/${cleaned}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ERROR') {
          toast.error(data.message || 'CNPJ não localizado na base da Receita Federal.');
        } else {
          setRazaoSocial(data.nome || '');
          setNomeFantasia(data.fantasia || data.nome || '');
          setEmail(data.email || '');
          setTelefone(data.telefone || '');
          setCep(data.cep || '');
          
          const street = [data.logradouro, data.numero, data.complemento].filter(Boolean).join(', ');
          const district = data.bairro ? ` - ${data.bairro}` : '';
          setEndereco(street + district);
          
          setCidade(data.municipio || '');
          setEstado(data.uf || '');
          toast.success('CNPJ localizado! Dados cadastrais importados com sucesso.');
        }
      } else {
        toast.error('Erro ao conectar ao serviço de busca de CNPJ.');
      }
    } catch (error) {
      console.error('CNPJ lookup error:', error);
      toast.error('Erro na consulta automática do CNPJ.');
    } finally {
      setIsLoadingCNPJ(false);
    }
  };

  const handleCEPLookup = async (cepVal: string) => {
    const cleaned = cepVal.replace(/\D/g, '');
    if (cleaned.length !== 8) return;

    setIsLoadingCEP(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      if (response.ok) {
        const data = await response.json();
        if (data.erro) {
          toast.error('CEP não localizado.');
        } else {
          const formattedAddress = [data.logradouro, data.bairro].filter(Boolean).join(', ');
          setEndereco(formattedAddress);
          setCidade(data.localidade || '');
          setEstado(data.uf || '');
          toast.success('Endereço autocompletado via CEP!');
        }
      }
    } catch (error) {
      console.error('CEP lookup error:', error);
    } finally {
      setIsLoadingCEP(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!razaoSocial || !nomeFantasia || !cnpj || !telefone || !email || !responsavel) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const payload = {
      razaoSocial,
      nomeFantasia,
      cnpj,
      telefone,
      email,
      responsavel,
      status,
      observacoes,
      endereco,
      cidade,
      estado,
      cep
    };

    setIsSaving(true);
    try {
      if (selectedPlatform) {
        await platformService.update(selectedPlatform.id, payload);
        toast.success('Plataforma de gestão atualizada com sucesso!');
      } else {
        await platformService.create(payload);
        toast.success('Plataforma de gestão cadastrada com sucesso!');
      }
      handleCloseModal();
      fetchPlatforms();
    } catch (error: any) {
      console.error('Error saving platform:', error);
      const errMsg = error.response?.data?.error || 'Erro ao salvar os dados da plataforma.';
      toast.error(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a plataforma "${name}"?`)) {
      return;
    }

    try {
      await platformService.delete(id);
      toast.success('Plataforma excluída com sucesso!');
      fetchPlatforms();
    } catch (error: any) {
      console.error('Error deleting platform:', error);
      toast.error('Erro ao excluir plataforma. Verifique se existem orçamentos vinculados.');
    }
  };

  // CNPJ Format Mask
  const handleCNPJChange = (value: string) => {
    const rawValue = value.replace(/\D/g, '');
    let masked = rawValue;
    if (rawValue.length > 2) masked = rawValue.substring(0, 2) + '.' + rawValue.substring(2);
    if (rawValue.length > 5) masked = masked.substring(0, 6) + '.' + rawValue.substring(5);
    if (rawValue.length > 8) masked = masked.substring(0, 10) + '/' + rawValue.substring(8);
    if (rawValue.length > 12) masked = masked.substring(0, 15) + '-' + rawValue.substring(12, 14);
    setCnpj(masked.substring(0, 18));
  };

  // Telefone Format Mask
  const handlePhoneChange = (value: string) => {
    const rawValue = value.replace(/\D/g, '');
    let masked = rawValue;
    if (rawValue.length > 0) masked = '(' + rawValue;
    if (rawValue.length > 2) masked = masked.substring(0, 3) + ') ' + rawValue.substring(2);
    if (rawValue.length > 7) {
      if (rawValue.length === 11) {
        masked = masked.substring(0, 10) + '-' + rawValue.substring(7);
      } else {
        masked = masked.substring(0, 9) + '-' + rawValue.substring(6);
      }
    }
    setTelefone(masked.substring(0, 15));
  };

  // CEP Format Mask
  const handleCEPChange = (value: string) => {
    const rawValue = value.replace(/\D/g, '');
    let masked = rawValue;
    if (rawValue.length > 5) masked = rawValue.substring(0, 5) + '-' + rawValue.substring(5, 8);
    setCep(masked.substring(0, 9));
    if (rawValue.length === 8) {
      handleCEPLookup(rawValue);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card border border-border rounded-xl p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building className="h-6 w-6 text-primary" />
            Cadastro de Plataformas de Gestão
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cadastre e gerencie as plataformas externas de frotas e integration utilizadas pelos seus clientes.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/95 text-primary-foreground px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm text-sm"
        >
          <Plus className="h-4 w-4" />
          Cadastrar Plataforma
        </button>
      </div>

      {/* Filters Area */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card border border-border rounded-xl p-4 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por Nome Fantasia, Razão Social ou CNPJ..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary transition-all"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="ATIVO">Ativas</option>
            <option value="INATIVO">Inativas</option>
          </select>
        </div>
      </div>

      {/* Listing Grid / Table */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        {isLoadingList ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <span className="text-muted-foreground text-sm font-medium">Buscando registros de plataformas...</span>
          </div>
        ) : platforms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-4">
              <Building className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">Nenhuma plataforma cadastrada</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">
              {searchTerm || statusFilter !== 'TODOS' 
                ? 'Nenhum resultado corresponde aos filtros de busca aplicados.' 
                : 'Cadastre a primeira plataforma de frotas externa para poder selecioná-la nos orçamentos.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">Nome Fantasia / Razão</th>
                  <th className="px-6 py-4">CNPJ</th>
                  <th className="px-6 py-4">Responsável</th>
                  <th className="px-6 py-4">Contatos</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {platforms.map((platform) => (
                  <tr key={platform.id} className="hover:bg-muted/10 transition-colors group">
                    <td className="px-6 py-4.5">
                      <div className="font-medium text-foreground">{platform.nomeFantasia}</div>
                      <div className="text-xs text-muted-foreground font-normal mt-0.5">{platform.razaoSocial}</div>
                    </td>
                    <td className="px-6 py-4.5 font-mono text-xs tracking-wider text-muted-foreground">
                      {platform.cnpj}
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <User className="h-3.5 w-3.5 text-muted-foreground/60" />
                        {platform.responsavel}
                      </div>
                    </td>
                    <td className="px-6 py-4.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-foreground font-normal">
                        <Phone className="h-3 w-3 text-muted-foreground/60" />
                        {platform.telefone}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3 text-muted-foreground/60" />
                        {platform.email}
                      </div>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.75 rounded-full text-xs font-semibold ${
                        platform.status === 'ATIVO' 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${platform.status === 'ATIVO' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {platform.status}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(platform)}
                          title="Editar plataforma"
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(platform.id, platform.nomeFantasia)}
                          title="Excluir plataforma"
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  Mostrando <strong className="font-semibold text-foreground">{platforms.length}</strong> de <strong className="font-semibold text-foreground">{total}</strong> plataformas
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary disabled:opacity-50 disabled:pointer-events-none transition-all"
                  >
                    Anterior
                  </button>
                  {Array.from({ length: totalPages }).map((_, index) => {
                    const pageIndex = index + 1;
                    return (
                      <button
                        key={pageIndex}
                        onClick={() => setPage(pageIndex)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                          page === pageIndex
                            ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                            : 'border border-border hover:bg-secondary text-muted-foreground'
                        }`}
                      >
                        {pageIndex}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary disabled:opacity-50 disabled:pointer-events-none transition-all"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Register/Edit Dialog (Drawer/Modal Layout) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
            
            {/* ABSOLUTE CLOSE BUTTON (Top Right Corner with padding protection) */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 z-50 p-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all shadow-xs border border-border/40"
              title="Fechar tela"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            {/* Modal Header */}
            <div className="p-6 border-b border-border mr-12">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Building className="h-5.5 w-5.5 text-primary" />
                {selectedPlatform ? 'Editar Plataforma de Gestão' : 'Nova Plataforma de Gestão'}
              </h2>
              <p className="text-muted-foreground text-xs mt-1">
                Insira as informações cadastrais. Use a consulta rápida de CNPJ para autopreenchimento.
              </p>
            </div>

            {/* Form Scroll Area */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* CNPJ Input & Public Search Button */}
              <div className="bg-muted/30 p-4 border border-border/60 rounded-lg space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Consulta Rápida Receita Federal
                </h3>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">CNPJ da Plataforma *</label>
                    <input
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={cnpj}
                      onChange={(e) => handleCNPJChange(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary font-mono"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCNPJLookup}
                    disabled={isLoadingCNPJ || cnpj.replace(/\D/g, '').length !== 14}
                    className="bg-primary hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-xs h-[38px] flex items-center gap-1.5"
                  >
                    {isLoadingCNPJ ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Consultar CNPJ'}
                  </button>
                </div>
              </div>

              {/* Main Fields Block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Nome Fantasia *</label>
                  <input
                    type="text"
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Razão Social *</label>
                  <input
                    type="text"
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Responsável na Empresa *</label>
                  <input
                    type="text"
                    placeholder="Ex: João da Silva"
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Telefone *</label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={telefone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">E-mail de Contato *</label>
                  <input
                    type="email"
                    placeholder="comercial@plataforma.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              {/* Address Block */}
              <div className="space-y-4 pt-2 border-t border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  Endereço e Localização
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">CEP (Busca Automática)</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="00000-000"
                        value={cep}
                        onChange={(e) => handleCEPChange(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary pr-8"
                      />
                      {isLoadingCEP && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 text-primary animate-spin" />}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Endereço (Rua, Nº, Bairro)</label>
                    <input
                      type="text"
                      placeholder="Rua das Acácias, 123 - Centro"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Cidade</label>
                    <input
                      type="text"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado (UF)</label>
                    <input
                      type="text"
                      maxLength={2}
                      placeholder="SP"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value.toUpperCase())}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Status and Notes Block */}
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Status da Integração *</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'ATIVO' | 'INATIVO')}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
                      required
                    >
                      <option value="ATIVO">ATIVO</option>
                      <option value="INATIVO">INATIVO</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Observações Internas</label>
                    <textarea
                      placeholder="Observações ou particularidades técnicas de faturamento da plataforma..."
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      rows={2}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-border hover:bg-secondary text-foreground text-sm font-semibold rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-primary hover:bg-primary/95 disabled:opacity-75 text-primary-foreground px-5 py-2 rounded-lg font-semibold text-sm transition-all shadow-sm flex items-center gap-1.5"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {selectedPlatform ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
