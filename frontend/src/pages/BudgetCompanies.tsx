import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Search, Building, Phone, Mail, MapPin, Globe, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function BudgetCompanies() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);

  // Form states
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [endereco, setEndereco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [logo, setLogo] = useState('');
  const [regimeTributario, setRegimeTributario] = useState('Simples Nacional');

  const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/companies/budget', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error("Failed to load budget companies", error);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCnpjChange = (value: string) => {
    const masked = value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
    setCnpj(masked);
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
          setRazaoSocial(data.nome || '');
          setNomeFantasia(data.fantasia || data.nome || '');
          setEmail(data.email || '');
          setTelefone(data.telefone || '');

          // Formata endereço completo
          const parts = [
            data.logradouro,
            data.numero ? `${data.numero}` : '',
            data.complemento ? `${data.complemento}` : '',
            data.bairro,
            data.municipio,
            data.uf
          ].filter(Boolean);

          const fullAddress = parts.join(', ') + (data.cep ? ` - CEP: ${data.cep}` : '');
          setEndereco(fullAddress);

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

  const handleOpenCreateModal = () => {
    setSelectedCompany(null);
    setRazaoSocial('');
    setNomeFantasia('');
    setCnpj('');
    setInscricaoEstadual('');
    setEndereco('');
    setTelefone('');
    setWhatsapp('');
    setEmail('');
    setLogo('');
    setRegimeTributario('Simples Nacional');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (comp: any) => {
    setSelectedCompany(comp);
    setRazaoSocial(comp.razaoSocial || '');
    setNomeFantasia(comp.nomeFantasia || '');
    setCnpj(comp.cnpj || '');
    setInscricaoEstadual(comp.inscricaoEstadual || '');
    setEndereco(comp.endereco || '');
    setTelefone(comp.telefone || '');
    setWhatsapp(comp.whatsapp || '');
    setEmail(comp.email || '');
    setLogo(comp.logo || '');
    setRegimeTributario(comp.regimeTributario || 'Simples Nacional');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCompany(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!razaoSocial || !cnpj) {
      toast.error('Razão Social e CNPJ são campos obrigatórios.');
      return;
    }

    setIsSaving(true);
    const payload = {
      razaoSocial,
      nomeFantasia,
      cnpj,
      cnpjSemMascara: cnpj.replace(/\D/g, ''),
      inscricaoEstadual,
      endereco,
      telefone,
      whatsapp,
      email,
      logo,
      regimeTributario
    };

    try {
      const token = localStorage.getItem('token');
      const url = selectedCompany ? `/companies/budget/${selectedCompany.id}` : '/companies/budget';
      const method = selectedCompany ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(selectedCompany ? 'Empresa do Orçamento atualizada!' : 'Empresa do Orçamento cadastrada!');
        handleCloseModal();
        fetchCompanies();
      } else {
        const errData = await response.json();
        toast.error(errData.error || 'Erro ao salvar dados da empresa.');
      }
    } catch (error) {
      console.error('Failed to save budget company', error);
      toast.error('Erro de conexão ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza de que deseja excluir a empresa emissora "${name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/companies/budget/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Empresa emissora excluída com sucesso!');
        fetchCompanies();
      } else {
        toast.error('Erro ao excluir empresa emissora.');
      }
    } catch (error) {
      console.error('Failed to delete budget company', error);
      toast.error('Erro de conexão ao excluir.');
    }
  };

  const filteredCompanies = companies.filter(comp => {
    const search = searchTerm.toLowerCase();
    return (
      comp.razaoSocial?.toLowerCase().includes(search) ||
      comp.nomeFantasia?.toLowerCase().includes(search) ||
      comp.cnpj?.includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building className="text-primary" />
            Empresas do Orçamento
          </h1>
          <p className="text-muted-foreground text-sm">Gerencie os perfis de emissão de orçamentos</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-semibold shadow hover:bg-primary/90 transition w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>Nova Empresa Emissora</span>
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-background border border-border pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-primary text-sm"
          />
        </div>
      </div>

      {/* Listagem Desktop */}
      <div className="hidden md:block bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground text-sm">
                <th className="p-4 font-medium">Nome / Razão Social</th>
                <th className="p-4 font-medium">CNPJ / I.E.</th>
                <th className="p-4 font-medium">Contato</th>
                <th className="p-4 font-medium">Regime</th>
                <th className="p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((comp) => (
                <tr key={comp.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {comp.logo ? (
                        <img src={comp.logo} alt="Logo" className="w-9 h-9 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                          {comp.razaoSocial.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-foreground">{comp.razaoSocial}</div>
                        {comp.nomeFantasia && <div className="text-xs text-muted-foreground">{comp.nomeFantasia}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-xs space-y-1">
                    <div>CNPJ: <span className="font-mono bg-muted px-1.5 py-0.5 rounded border border-border">{comp.cnpj}</span></div>
                    {comp.inscricaoEstadual && <div className="text-muted-foreground">I.E.: {comp.inscricaoEstadual}</div>}
                  </td>
                  <td className="p-4 text-xs space-y-1">
                    {comp.email && <div className="flex items-center gap-1 text-muted-foreground"><Mail size={12} /> {comp.email}</div>}
                    {comp.telefone && <div className="flex items-center gap-1 text-muted-foreground"><Phone size={12} /> {comp.telefone}</div>}
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                      {comp.regimeTributario || 'Simples Nacional'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenEditModal(comp)}
                        className="p-1.5 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(comp.id, comp.razaoSocial)}
                        className="p-1.5 bg-rose-500/10 text-rose-600 rounded hover:bg-rose-500/20 transition"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCompanies.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Nenhuma empresa emissora cadastrada ou localizada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Listagem Mobile */}
      <div className="block md:hidden space-y-4">
        {filteredCompanies.map((comp) => (
          <div key={comp.id} className="bg-card border border-border p-4 rounded-xl space-y-3 shadow-sm hover:border-primary/30 transition">
            <div className="flex items-start gap-3">
              {comp.logo ? (
                <img src={comp.logo} alt="Logo" className="w-9 h-9 rounded-full object-cover border border-border flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">
                  {comp.razaoSocial.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground truncate">{comp.razaoSocial}</h4>
                {comp.nomeFantasia && <p className="text-xs text-muted-foreground truncate">{comp.nomeFantasia}</p>}
              </div>
            </div>

            <div className="text-xs space-y-1.5 bg-muted/30 p-2.5 rounded-lg border border-border/50">
              <div><span className="text-muted-foreground font-sans">CNPJ: </span>{comp.cnpj}</div>
              {comp.email && <div className="truncate flex items-center gap-1 text-muted-foreground"><Mail size={10} /> {comp.email}</div>}
              {comp.telefone && <div className="flex items-center gap-1 text-muted-foreground"><Phone size={10} /> {comp.telefone}</div>}
            </div>

            <div className="flex justify-between items-center pt-2.5 border-t border-border/50">
              <span className="text-xs font-semibold text-primary">{comp.regimeTributario || 'Simples Nacional'}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenEditModal(comp)}
                  className="p-1.5 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition"
                >
                  <Edit size={12} />
                </button>
                <button
                  onClick={() => handleDelete(comp.id, comp.razaoSocial)}
                  className="p-1.5 bg-rose-500/10 text-rose-600 rounded hover:bg-rose-500/20 transition"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredCompanies.length === 0 && (
          <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-xl">
            Nenhuma empresa emissora cadastrada.
          </div>
        )}
      </div>

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
              <div className="flex items-center gap-2">
                <Building className="text-primary" size={22} />
                <h3 className="text-lg font-bold text-foreground">
                  {selectedCompany ? 'Editar Emissora' : 'Nova Emissora'}
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/50 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

              {/* Seção CNPJ Lookup */}
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3">
                <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <Globe size={14} /> CONSULTA AUTOMÁTICA CNPJ
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Digite o CNPJ para preenchimento (ex: 00000000000191)"
                    value={cnpj}
                    onChange={(e) => handleCnpjChange(e.target.value)}
                    className="flex-1 bg-background border border-border px-3 py-2 rounded-lg focus:outline-none focus:border-primary text-sm font-mono"
                  />
                  <button
                    type="button"
                    disabled={isLoadingCNPJ}
                    onClick={handleCNPJLookup}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold shadow hover:bg-primary/90 transition text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {isLoadingCNPJ ? <RefreshCw size={14} className="animate-spin" /> : 'Consultar'}
                  </button>
                </div>
              </div>

              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Razão Social *</label>
                  <input
                    type="text"
                    required
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Nome Fantasia</label>
                  <input
                    type="text"
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Inscrição Estadual</label>
                  <input
                    type="text"
                    value={inscricaoEstadual}
                    onChange={(e) => setInscricaoEstadual(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Regime Tributário</label>
                  <select
                    value={regimeTributario}
                    onChange={(e) => setRegimeTributario(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2.5 rounded-lg text-sm"
                  >
                    <option value="Simples Nacional">Simples Nacional</option>
                    <option value="Lucro Presumido">Lucro Presumido</option>
                    <option value="Lucro Real">Lucro Real</option>
                  </select>
                </div>
              </div>

              {/* Contatos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">WhatsApp</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1"><MapPin size={14} /> Endereço Completo</label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua, Número, Bairro, Cidade - UF, CEP"
                  className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                />
              </div>

              {/* Logo */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Logotipo da Oficina (URL da Imagem)</label>
                <input
                  type="text"
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  placeholder="https://suaempresa.com/logo.png"
                  className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm font-mono"
                />
              </div>

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
                  disabled={isSaving}
                  className="bg-primary text-primary-foreground px-5 py-2 rounded-lg font-semibold shadow hover:bg-primary/90 transition text-sm flex items-center gap-1.5"
                >
                  {isSaving ? 'Salvando...' : <><Save size={16} /> {selectedCompany ? 'Atualizar' : 'Cadastrar'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
