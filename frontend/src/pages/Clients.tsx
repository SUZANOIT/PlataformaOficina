import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Search, 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  CheckCircle,
  Users,
  User,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from '../utils/toast.helper';
import { ModalFooterActions } from '../components/ui/ModalFooterActions';

export function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form states
  const [nome, setNome] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [dataSituacao, setDataSituacao] = useState('');
  const [atividadePrincipal, setAtividadePrincipal] = useState('');
  
  const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);
  const [tipoPessoa, setTipoPessoa] = useState<'PF' | 'PJ'>('PJ');
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/registry/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error("Failed to load clients", error);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleOpenCreateModal = () => {
    setSelectedClient(null);
    setTipoPessoa('PJ');
    setNome('');
    setEmpresa('');
    setCnpj('');
    setTelefone('');
    setEmail('');
    setCep('');
    setLogradouro('');
    setNumero('');
    setComplemento('');
    setBairro('');
    setCidade('');
    setEstado('');
    setDataSituacao('');
    setAtividadePrincipal('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client: any) => {
    setSelectedClient(client);
    const docCleaned = (client.cnpj || '').replace(/\D/g, '');
    setTipoPessoa(docCleaned.length === 11 ? 'PF' : 'PJ');
    setNome(client.nome || '');
    setEmpresa(client.empresa || '');
    setCnpj(client.cnpj || '');
    setTelefone(client.telefone || '');
    setEmail(client.email || '');
    setCep(client.cep || '');
    setLogradouro(client.logradouro || '');
    setNumero(client.numero || '');
    setComplemento(client.complemento || '');
    setBairro(client.bairro || '');
    setCidade(client.cidade || '');
    setEstado(client.estado || '');
    setDataSituacao(client.dataSituacao || '');
    setAtividadePrincipal(client.atividadePrincipal || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
  };

  const handleCNPJLookup = async () => {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) {
      toast.error('O CNPJ para consulta deve conter exatamente 14 dígitos.');
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
          toast.error(data.message || 'CNPJ não encontrado ou inválido na base da Receita Federal.');
        } else {
          setNome(data.nome || '');
          setEmpresa(data.fantasia || data.nome || '');
          setEmail(data.email || '');
          setTelefone(data.telefone || '');
          setCep(data.cep || '');
          setLogradouro(data.logradouro || '');
          setNumero(data.numero || '');
          setComplemento(data.complemento || '');
          setBairro(data.bairro || '');
          setCidade(data.municipio || '');
          setEstado(data.uf || '');
          setDataSituacao(data.situacao || '');
          setAtividadePrincipal(data.atividade_principal?.[0]?.text || '');
          toast.success('CNPJ localizado! Dados cadastrais preenchidos.');
        }
      } else {
        toast.error('Erro na resposta do serviço de consulta de CNPJ.');
      }
    } catch (error) {
      console.error('Failed to lookup CNPJ', error);
      toast.error('Erro ao conectar ao serviço de CNPJ.');
    } finally {
      setIsLoadingCNPJ(false);
    }
  };
  
  const handleCEPLookup = async (cepValue: string) => {
    const cleaned = cepValue.replace(/\D/g, '');
    if (cleaned.length !== 8) return;

    setIsLoadingCEP(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      if (response.ok) {
        const data = await response.json();
        if (data.erro) {
          toast.error('CEP não localizado.');
        } else {
          setLogradouro(data.logradouro || '');
          setBairro(data.bairro || '');
          setCidade(data.localidade || '');
          setEstado(data.uf || '');
          toast.success('Endereço preenchido via CEP!');
        }
      }
    } catch (error) {
      console.error('Failed to lookup CEP', error);
      toast.error('Erro ao buscar o CEP.');
    } finally {
      setIsLoadingCEP(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome) {
      toast.error('O nome do cliente é obrigatório.');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    const payload = {
      nome,
      empresa,
      cnpj,
      telefone,
      email,
      cidade,
      estado,
      logradouro,
      numero,
      complemento,
      bairro,
      cep,
      dataSituacao,
      atividadePrincipal
    };

    try {
      const token = localStorage.getItem('token');
      const url = selectedClient ? `/registry/clients/${selectedClient.id}` : '/registry/clients';
      const method = selectedClient ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(selectedClient ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!');
        handleCloseModal();
        fetchClients();
      } else {
        handleApiError(response, 'Erro ao salvar dados do cliente.');
      }
    } catch (error) {
      console.error('Failed to save client', error);
      handleApiError(error, 'Erro de conexão ao salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza de que deseja excluir o cliente "${name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/registry/clients/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Cliente excluído com sucesso!');
        fetchClients();
      } else {
        toast.error('Erro ao excluir cliente.');
      }
    } catch (error) {
      console.error('Failed to delete client', error);
      toast.error('Erro de conexão ao excluir.');
    }
  };

  const filteredClients = clients.filter(client => {
    const search = searchTerm.toLowerCase();
    return (
      client.nome?.toLowerCase().includes(search) ||
      client.empresa?.toLowerCase().includes(search) ||
      client.cnpj?.includes(search) ||
      client.email?.toLowerCase().includes(search)
    );
  });

  const totalClients = clients.length;
  const pjClients = clients.filter(c => {
    const doc = (c.cnpj || '').replace(/\D/g, '');
    return doc.length !== 11;
  }).length;
  const pfClients = clients.filter(c => {
    const doc = (c.cnpj || '').replace(/\D/g, '');
    return doc.length === 11;
  }).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-gradient-to-r from-card to-background p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Users className="text-primary" size={26} />
            Clientes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Gerenciamento completo de parceiros, pessoas físicas e jurídicas da oficina.</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-primary/20 hover:bg-primary/95 transition duration-200 w-full sm:w-auto text-sm"
        >
          <Plus size={18} />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex items-center gap-4 hover:border-primary/20 transition-all duration-300">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total de Clientes</p>
            <h3 className="text-2xl font-black text-foreground mt-0.5">{totalClients}</h3>
          </div>
        </div>
        
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex items-center gap-4 hover:border-emerald-500/20 transition-all duration-300">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center font-bold">
            <Briefcase size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pessoa Jurídica (PJ)</p>
            <h3 className="text-2xl font-black text-foreground mt-0.5">{pjClients}</h3>
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex items-center gap-4 hover:border-blue-500/20 transition-all duration-300">
          <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center font-bold">
            <User size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pessoa Física (PF)</p>
            <h3 className="text-2xl font-black text-foreground mt-0.5">{pfClients}</h3>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Buscar por nome, empresa, documento ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-background border border-border pl-11 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition"
          />
        </div>
      </div>

      {/* Desktop/Tablet List */}
      <div className="hidden md:block bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="w-full">
          <table className="w-full text-left border-collapse table-fixed break-words">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-muted-foreground text-xs font-bold uppercase tracking-wider">
                <th className="p-4 w-4/12 lg:w-3.12">Nome / Razão Social</th>
                <th className="p-4 hidden lg:table-cell w-2/12">Documento</th>
                <th className="p-4 w-4/12 lg:w-3.5/12">Contato</th>
                <th className="p-4 hidden xl:table-cell w-3/12">Localização</th>
                <th className="p-4 w-4/12 lg:w-1.3/12 text-center lg:text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const docCleaned = (client.cnpj || '').replace(/\D/g, '');
                const isPF = docCleaned.length === 11;
                return (
                  <tr key={client.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="p-4 truncate">
                      <div className="flex items-center gap-3 truncate">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 text-sm shadow-sm ${
                          isPF ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'
                        }`}>
                          {isPF ? <User size={18} /> : <Building size={18} />}
                        </div>
                        <div className="truncate">
                          <div className="font-bold text-foreground truncate text-sm">{client.nome}</div>
                          {client.empresa && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                              <Building className="shrink-0 text-muted-foreground/75" size={12} /> 
                              <span className="truncate">{client.empresa}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-foreground hidden lg:table-cell truncate">
                      {client.cnpj ? (
                        <div className="flex flex-col gap-0.5 truncate">
                          <span className={`text-[9px] font-black uppercase tracking-wider ${
                            isPF ? 'text-blue-500' : 'text-emerald-500'
                          }`}>
                            {isPF ? 'CPF' : 'CNPJ'}
                          </span>
                          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded border border-border w-fit font-semibold">{client.cnpj}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Não informado</span>
                      )}
                    </td>
                    <td className="p-4 text-xs space-y-1.5 truncate">
                      {client.email && (
                        <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                          <Mail className="shrink-0 text-muted-foreground/70" size={13} /> 
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.telefone && (
                        <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                          <Phone className="shrink-0 text-muted-foreground/70" size={13} /> 
                          <span className="truncate">{client.telefone}</span>
                        </div>
                      )}
                      {!client.email && !client.telefone && (
                        <span className="text-muted-foreground italic text-xs">Sem contatos</span>
                      )}
                    </td>
                    <td className="p-4 text-xs hidden xl:table-cell truncate">
                      {client.cidade ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                          <MapPin className="shrink-0 text-muted-foreground/70" size={13} /> 
                          <span className="truncate font-medium">{client.cidade} - {client.estado || ''}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-center lg:justify-start">
                        <button 
                          onClick={() => handleOpenEditModal(client)}
                          className="p-2 bg-blue-500/10 text-blue-600 rounded-lg hover:bg-blue-500/20 transition shadow-sm"
                          title="Editar"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(client.id, client.nome)}
                          className="p-2 bg-rose-500/10 text-rose-600 rounded-lg hover:bg-rose-500/20 transition shadow-sm"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-muted-foreground font-medium text-sm">
                    Nenhum cliente cadastrado ou localizado com estes filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="block md:hidden space-y-4">
        {filteredClients.map((client) => {
          const docCleaned = (client.cnpj || '').replace(/\D/g, '');
          const isPF = docCleaned.length === 11;
          return (
            <div key={client.id} className="bg-card border border-border p-5 rounded-2xl space-y-4 shadow-sm hover:border-primary/30 transition duration-200">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0 text-sm shadow-sm ${
                  isPF ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'
                }`}>
                  {isPF ? <User size={18} /> : <Building size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-foreground truncate text-sm">{client.nome}</h4>
                  {client.empresa && (
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                      <Building size={11} className="text-muted-foreground/75" /> 
                      {client.empresa}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-xs space-y-2 bg-muted/40 p-3.5 rounded-xl border border-border/50">
                {client.cnpj && (
                  <div className="font-mono text-[10px] flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase tracking-wider ${
                      isPF ? 'text-blue-500' : 'text-emerald-500'
                    }`}>
                      {isPF ? 'CPF' : 'CNPJ'}:
                    </span>
                    <span className="font-semibold text-foreground">{client.cnpj}</span>
                  </div>
                )}
                {client.email && (
                  <div className="truncate flex items-center gap-2 text-muted-foreground">
                    <Mail size={12} className="text-muted-foreground/70" /> 
                    {client.email}
                  </div>
                )}
                {client.telefone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone size={12} className="text-muted-foreground/70" /> 
                    {client.telefone}
                  </div>
                )}
                {client.cidade && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin size={12} className="text-muted-foreground/70" /> 
                    {client.cidade} - {client.estado}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-border/50">
                <span className="text-[10px] text-muted-foreground font-medium">Criado em: {new Date(client.createdAt).toLocaleDateString('pt-BR')}</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenEditModal(client)}
                    className="p-2 bg-blue-500/10 text-blue-600 rounded-lg hover:bg-blue-500/20 transition shadow-sm"
                  >
                    <Edit size={13} />
                  </button>
                  <button 
                    onClick={() => handleDelete(client.id, client.nome)}
                    className="p-2 bg-rose-500/10 text-rose-600 rounded-lg hover:bg-rose-500/20 transition shadow-sm"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filteredClients.length === 0 && (
          <div className="p-10 text-center text-muted-foreground bg-card border border-border rounded-2xl font-medium text-sm">
            Nenhum cliente cadastrado.
          </div>
        )}
      </div>

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8 relative">
            <button 
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted/50 transition z-50 animate-in fade-in duration-300"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
              <div className="flex items-center gap-2.5 mr-8">
                <Building className="text-primary" size={20} />
                <h3 className="text-base font-bold text-foreground">
                  {selectedClient ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              
              {/* Resumo do Cliente (Orçamentos) se for edição */}
              {selectedClient && (
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex items-center justify-between text-sm animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <span>Total de Orçamentos cadastrados para este cliente:</span>
                  </div>
                  <span className="bg-primary text-primary-foreground font-mono font-bold px-3 py-1 rounded-full text-xs shadow-sm">
                    {selectedClient._count?.quotes || 0} {selectedClient._count?.quotes === 1 ? 'Orçamento' : 'Orçamentos'}
                  </span>
                </div>
              )}
              
              {/* Type Switcher tabs */}
              <div className="flex bg-muted p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setTipoPessoa('PJ');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                    tipoPessoa === 'PJ'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Building size={15} />
                  Pessoa Jurídica (CNPJ)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipoPessoa('PF');
                    setEmpresa('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                    tipoPessoa === 'PF'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <User size={15} />
                  Pessoa Física (CPF)
                </button>
              </div>

              {/* CNPJ Lookup for PJ */}
              {tipoPessoa === 'PJ' && (
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide">
                    <Globe size={14} /> CONSULTA AUTOMÁTICA CNPJ (RECEITA FEDERAL)
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Digite o CNPJ para preenchimento (ex: 00000000000191)"
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      className="flex-1 bg-background border border-border px-3 py-2 rounded-lg focus:outline-none focus:border-primary text-sm font-mono font-semibold"
                    />
                    <button
                      type="button"
                      disabled={isLoadingCNPJ}
                      onClick={handleCNPJLookup}
                      className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold shadow hover:bg-primary/95 transition text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {isLoadingCNPJ ? 'Buscando...' : 'Consultar'}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/90 font-medium">
                    Insira apenas números. O sistema consultará a Receita Federal e auto-preencherá Razão Social, Fantasia, Contatos e Endereço.
                  </p>
                </div>
              )}

              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                    {tipoPessoa === 'PF' ? 'Nome Completo *' : 'Razão Social *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                  />
                </div>
                {tipoPessoa === 'PF' ? (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide">CPF</label>
                    <input
                      type="text"
                      placeholder="Digite o CPF (ex: 000.000.000-00)"
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide">Nome Fantasia / Empresa</label>
                    <input
                      type="text"
                      value={empresa}
                      onChange={(e) => setEmpresa(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                    />
                  </div>
                )}
              </div>

              {/* Contatos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Telefone</label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="border-t border-border pt-4 space-y-4">
                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider">Informações de Endereço</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5 md:col-span-1 relative">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide flex justify-between items-center">
                      <span>CEP</span>
                      {isLoadingCEP && <span className="text-[10px] text-primary animate-pulse font-bold normal-case">Buscando...</span>}
                    </label>
                    <input
                      type="text"
                      placeholder="00000-000"
                      value={cep}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCep(val);
                        const cleaned = val.replace(/\D/g, '');
                        if (cleaned.length === 8) {
                          handleCEPLookup(cleaned);
                        }
                      }}
                      onBlur={() => {
                        handleCEPLookup(cep);
                      }}
                      className="w-full bg-background border border-border px-3 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-3">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide">Logradouro (Rua, Av, etc.)</label>
                    <input
                      type="text"
                      value={logradouro}
                      onChange={(e) => setLogradouro(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide">Número</label>
                    <input
                      type="text"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide">Complemento</label>
                    <input
                      type="text"
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide">Bairro</label>
                    <input
                      type="text"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide">Cidade</label>
                    <input
                      type="text"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide">Estado (UF)</label>
                    <input
                      type="text"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                    />
                  </div>
                </div>
              </div>

              {/* Detalhes Adicionais da Consulta */}
              {(atividadePrincipal || dataSituacao) && (
                <div className="bg-muted/40 p-4 rounded-xl border border-border text-xs space-y-2 mt-4">
                  <div className="font-bold text-muted-foreground uppercase tracking-wider">Ficha Cadastral Complementar</div>
                  {dataSituacao && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-semibold">Situação:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        dataSituacao === 'ATIVA' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        <CheckCircle size={10} /> {dataSituacao}
                      </span>
                    </div>
                  )}
                  {atividadePrincipal && (
                    <div>
                      <span className="text-muted-foreground font-semibold">Atividade Principal:</span>
                      <p className="text-foreground mt-0.5 leading-relaxed">{atividadePrincipal}</p>
                    </div>
                  )}
                </div>
              )}

              <ModalFooterActions
                onCancel={handleCloseModal}
                primaryLabel={selectedClient ? 'Atualizar Cliente' : 'Cadastrar Cliente'}
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
