import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Search, Building, Phone, Mail, MapPin, Globe, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from '../utils/toast.helper';

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground text-sm">Gerenciamento completo de parceiros e clientes da oficina.</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow hover:bg-primary/90 transition w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, empresa, CNPJ ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-background border border-border pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-primary text-sm"
          />
        </div>
      </div>

      {/* Listagem Desktop/Tablet */}
      <div className="hidden md:block bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground text-sm">
                <th className="p-4 font-medium">Nome / Empresa</th>
                <th className="p-4 font-medium">Documento</th>
                <th className="p-4 font-medium">Contato</th>
                <th className="p-4 font-medium">Localização</th>
                <th className="p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr key={client.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {client.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{client.nome}</div>
                        {client.empresa && <div className="text-xs text-muted-foreground flex items-center gap-1"><Building size={12} /> {client.empresa}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-foreground">
                    {client.cnpj ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] text-muted-foreground font-black uppercase">
                          {client.cnpj.replace(/\D/g, '').length === 11 ? 'CPF' : 'CNPJ'}
                        </span>
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded border border-border w-fit">{client.cnpj}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">Não informado</span>
                    )}
                  </td>
                  <td className="p-4 text-xs space-y-1">
                    {client.email && <div className="flex items-center gap-1 text-muted-foreground"><Mail size={12} /> {client.email}</div>}
                    {client.telefone && <div className="flex items-center gap-1 text-muted-foreground"><Phone size={12} /> {client.telefone}</div>}
                  </td>
                  <td className="p-4 text-xs">
                    {client.cidade ? (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin size={12} /> {client.cidade} - {client.estado || ''}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleOpenEditModal(client)}
                        className="p-1.5 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(client.id, client.nome)}
                        className="p-1.5 bg-rose-500/10 text-rose-600 rounded hover:bg-rose-500/20 transition"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Nenhum cliente cadastrado ou localizado com estes filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Listagem Mobile */}
      <div className="block md:hidden space-y-4">
        {filteredClients.map((client) => (
          <div key={client.id} className="bg-card border border-border p-4 rounded-xl space-y-3 shadow-sm hover:border-primary/30 transition">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">
                {client.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground truncate">{client.nome}</h4>
                {client.empresa && <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><Building size={10} /> {client.empresa}</p>}
              </div>
            </div>

            <div className="text-xs space-y-1.5 bg-muted/30 p-2.5 rounded-lg border border-border/50">
              {client.cnpj && (
                <div className="font-mono text-[10px]">
                  <span className="text-muted-foreground font-sans">
                    {client.cnpj.replace(/\D/g, '').length === 11 ? 'CPF: ' : 'CNPJ: '}
                  </span>
                  {client.cnpj}
                </div>
              )}
              {client.email && <div className="truncate flex items-center gap-1 text-muted-foreground"><Mail size={10} /> {client.email}</div>}
              {client.telefone && <div className="flex items-center gap-1 text-muted-foreground"><Phone size={10} /> {client.telefone}</div>}
              {client.cidade && <div className="flex items-center gap-1 text-muted-foreground"><MapPin size={10} /> {client.cidade} - {client.estado}</div>}
            </div>

            <div className="flex justify-between items-center pt-2.5 border-t border-border/50">
              <span className="text-[10px] text-muted-foreground">Criado em: {new Date(client.createdAt).toLocaleDateString('pt-BR')}</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenEditModal(client)}
                  className="p-1.5 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition"
                >
                  <Edit size={12} />
                </button>
                <button 
                  onClick={() => handleDelete(client.id, client.nome)}
                  className="p-1.5 bg-rose-500/10 text-rose-600 rounded hover:bg-rose-500/20 transition"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredClients.length === 0 && (
          <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-xl">
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
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/50 transition z-50 animate-in fade-in duration-300"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
              <div className="flex items-center gap-2 mr-8">
                <Building className="text-primary" size={22} />
                <h3 className="text-lg font-bold text-foreground">
                  {selectedClient ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
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
              
              {/* Seletor Tipo de Pessoa */}
              <div className="flex justify-center gap-6 pb-4 border-b border-border">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-foreground">
                  <input
                    type="radio"
                    name="tipoPessoa"
                    checked={tipoPessoa === 'PF'}
                    onChange={() => {
                      setTipoPessoa('PF');
                      setEmpresa('');
                    }}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                  />
                  Pessoa Física (CPF)
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-foreground">
                  <input
                    type="radio"
                    name="tipoPessoa"
                    checked={tipoPessoa === 'PJ'}
                    onChange={() => setTipoPessoa('PJ')}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                  />
                  Pessoa Jurídica (CNPJ)
                </label>
              </div>

              {/* Seção CNPJ Lookup (Somente para PJ) */}
              {tipoPessoa === 'PJ' && (
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Globe size={14} /> CONSULTA AUTOMÁTICA CNPJ (RECEITA FEDERAL)
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Digite o CNPJ para preenchimento (ex: 00000000000191)"
                        value={cnpj}
                        onChange={(e) => setCnpj(e.target.value)}
                        className="w-full bg-background border border-border pl-3 pr-4 py-2 rounded-lg focus:outline-none focus:border-primary text-sm font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isLoadingCNPJ}
                      onClick={handleCNPJLookup}
                      className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold shadow hover:bg-primary/90 transition text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {isLoadingCNPJ ? 'Buscando...' : 'Consultar CNPJ'}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Insira apenas números. O sistema consultará a Receita Federal e auto-preencherá Razão Social, Fantasia, Contatos e Endereço.
                  </p>
                </div>
              )}

              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    {tipoPessoa === 'PF' ? 'Nome Completo *' : 'Razão Social *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                  />
                </div>
                {tipoPessoa === 'PF' ? (
                  <div className="space-y-1 animate-in fade-in duration-200">
                    <label className="text-xs font-semibold text-foreground">CPF</label>
                    <input
                      type="text"
                      placeholder="Digite o CPF (ex: 000.000.000-00)"
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm font-mono"
                    />
                  </div>
                ) : (
                  <div className="space-y-1 animate-in fade-in duration-200">
                    <label className="text-xs font-semibold text-foreground">Nome Fantasia / Empresa</label>
                    <input
                      type="text"
                      value={empresa}
                      onChange={(e) => setEmpresa(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Contatos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Telefone</label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="border-t border-border pt-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Informações de Endereço</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                   <div className="space-y-1 md:col-span-1 relative">
                    <label className="text-xs font-semibold text-foreground flex justify-between items-center">
                      <span>CEP</span>
                      {isLoadingCEP && <span className="text-[10px] text-primary animate-pulse font-medium">Buscando...</span>}
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
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-3">
                    <label className="text-xs font-semibold text-foreground">Logradouro (Rua, Av, etc.)</label>
                    <input
                      type="text"
                      value={logradouro}
                      onChange={(e) => setLogradouro(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Número</label>
                    <input
                      type="text"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Complemento</label>
                    <input
                      type="text"
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Bairro</label>
                    <input
                      type="text"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Cidade</label>
                    <input
                      type="text"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Estado (UF)</label>
                    <input
                      type="text"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Detalhes Adicionais da Consulta */}
              {(atividadePrincipal || dataSituacao) && (
                <div className="bg-muted/40 p-4 rounded-xl border border-border text-xs space-y-2 mt-4">
                  <div className="font-bold text-muted-foreground uppercase">Ficha Cadastral Complementar</div>
                  {dataSituacao && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-semibold">Situação:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        dataSituacao === 'ATIVA' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        <CheckCircle size={10} /> {dataSituacao}
                      </span>
                    </div>
                  )}
                  {atividadePrincipal && (
                    <div>
                      <span className="text-muted-foreground font-semibold">Atividade Principal:</span>
                      <p className="text-foreground mt-0.5">{atividadePrincipal}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Botões */}
              <div className="border-t border-border pt-4 flex justify-end gap-3 bg-muted/10 -mx-6 -mb-6 p-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground px-5 py-2 rounded-lg font-semibold shadow hover:bg-primary/90 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? 'Salvando...' : (selectedClient ? 'Atualizar Cliente' : 'Cadastrar Cliente')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
