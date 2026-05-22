import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Search, Building, Phone, Mail, MapPin, Globe, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  
  // Form states
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
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

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/registry/suppliers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error("Failed to load suppliers", error);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleOpenCreateModal = () => {
    setSelectedSupplier(null);
    setRazaoSocial('');
    setNomeFantasia('');
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

  const handleOpenEditModal = (supplier: any) => {
    setSelectedSupplier(supplier);
    setRazaoSocial(supplier.razaoSocial || '');
    setNomeFantasia(supplier.nomeFantasia || '');
    setCnpj(supplier.cnpj || '');
    setTelefone(supplier.telefone || '');
    setEmail(supplier.email || '');
    setCep(supplier.cep || '');
    setLogradouro(supplier.logradouro || '');
    setNumero(supplier.numero || '');
    setComplemento(supplier.complemento || '');
    setBairro(supplier.bairro || '');
    setCidade(supplier.cidade || '');
    setEstado(supplier.estado || '');
    setDataSituacao(supplier.dataSituacao || '');
    setAtividadePrincipal(supplier.atividadePrincipal || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSupplier(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!razaoSocial) {
      toast.error('A razão social do fornecedor é obrigatória.');
      return;
    }

    const payload = {
      razaoSocial,
      nomeFantasia,
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
      const url = selectedSupplier ? `/registry/suppliers/${selectedSupplier.id}` : '/registry/suppliers';
      const method = selectedSupplier ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(selectedSupplier ? 'Fornecedor atualizado com sucesso!' : 'Fornecedor cadastrado com sucesso!');
        handleCloseModal();
        fetchSuppliers();
      } else {
        const errData = await response.json();
        toast.error(errData.error || 'Erro ao salvar dados do fornecedor.');
      }
    } catch (error) {
      console.error('Failed to save supplier', error);
      toast.error('Erro de conexão ao salvar.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza de que deseja excluir o fornecedor "${name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/registry/suppliers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Fornecedor excluído com sucesso!');
        fetchSuppliers();
      } else {
        toast.error('Erro ao excluir fornecedor.');
      }
    } catch (error) {
      console.error('Failed to delete supplier', error);
      toast.error('Erro de conexão ao excluir.');
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const search = searchTerm.toLowerCase();
    return (
      supplier.razaoSocial?.toLowerCase().includes(search) ||
      supplier.nomeFantasia?.toLowerCase().includes(search) ||
      supplier.cnpj?.includes(search) ||
      supplier.email?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fornecedores</h1>
          <p className="text-muted-foreground text-sm">Gerenciamento completo de fornecedores e prestadores da oficina.</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow hover:bg-primary/90 transition w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>Novo Fornecedor</span>
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Buscar por razão social, nome fantasia, CNPJ..."
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
                <th className="p-4 font-medium">Razão Social / Nome Fantasia</th>
                <th className="p-4 font-medium">Documento</th>
                <th className="p-4 font-medium">Contato</th>
                <th className="p-4 font-medium">Localização</th>
                <th className="p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {supplier.razaoSocial.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{supplier.razaoSocial}</div>
                        {supplier.nomeFantasia && <div className="text-xs text-muted-foreground flex items-center gap-1"><Building size={12} /> {supplier.nomeFantasia}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-foreground">
                    {supplier.cnpj ? (
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded border border-border">{supplier.cnpj}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">Não informado</span>
                    )}
                  </td>
                  <td className="p-4 text-xs space-y-1">
                    {supplier.email && <div className="flex items-center gap-1 text-muted-foreground"><Mail size={12} /> {supplier.email}</div>}
                    {supplier.telefone && <div className="flex items-center gap-1 text-muted-foreground"><Phone size={12} /> {supplier.telefone}</div>}
                  </td>
                  <td className="p-4 text-xs">
                    {supplier.cidade ? (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin size={12} /> {supplier.cidade} - {supplier.estado || ''}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleOpenEditModal(supplier)}
                        className="p-1.5 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(supplier.id, supplier.razaoSocial)}
                        className="p-1.5 bg-rose-500/10 text-rose-600 rounded hover:bg-rose-500/20 transition"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Nenhum fornecedor cadastrado ou localizado com estes filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Listagem Mobile */}
      <div className="block md:hidden space-y-4">
        {filteredSuppliers.map((supplier) => (
          <div key={supplier.id} className="bg-card border border-border p-4 rounded-xl space-y-3 shadow-sm hover:border-primary/30 transition">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">
                {supplier.razaoSocial.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground truncate">{supplier.razaoSocial}</h4>
                {supplier.nomeFantasia && <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><Building size={10} /> {supplier.nomeFantasia}</p>}
              </div>
            </div>

            <div className="text-xs space-y-1.5 bg-muted/30 p-2.5 rounded-lg border border-border/50">
              {supplier.cnpj && <div className="font-mono text-[10px]"><span className="text-muted-foreground font-sans">CNPJ: </span>{supplier.cnpj}</div>}
              {supplier.email && <div className="truncate flex items-center gap-1 text-muted-foreground"><Mail size={10} /> {supplier.email}</div>}
              {supplier.telefone && <div className="flex items-center gap-1 text-muted-foreground"><Phone size={10} /> {supplier.telefone}</div>}
              {supplier.cidade && <div className="flex items-center gap-1 text-muted-foreground"><MapPin size={10} /> {supplier.cidade} - {supplier.estado}</div>}
            </div>

            <div className="flex justify-between items-center pt-2.5 border-t border-border/50">
              <span className="text-[10px] text-muted-foreground">Criado em: {new Date(supplier.createdAt).toLocaleDateString('pt-BR')}</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenEditModal(supplier)}
                  className="p-1.5 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition"
                >
                  <Edit size={12} />
                </button>
                <button 
                  onClick={() => handleDelete(supplier.id, supplier.razaoSocial)}
                  className="p-1.5 bg-rose-500/10 text-rose-600 rounded hover:bg-rose-500/20 transition"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredSuppliers.length === 0 && (
          <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-xl">
            Nenhum fornecedor cadastrado.
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
                  {selectedSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
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

              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Razão Social <span className="text-red-500">*</span></label>
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
                  <div className="space-y-1 md:col-span-1">
                    <label className="text-xs font-semibold text-foreground">CEP</label>
                    <input
                      type="text"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
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
                  className="bg-primary text-primary-foreground px-5 py-2 rounded-lg font-semibold shadow hover:bg-primary/90 transition text-sm"
                >
                  {selectedSupplier ? 'Atualizar Fornecedor' : 'Cadastrar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
