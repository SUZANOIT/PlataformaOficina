import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Search, User, Phone, Mail, Award, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export function Collaborators() {
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<any>(null);
  
  // Form states
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [cargo, setCargo] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [dataAdmissao, setDataAdmissao] = useState('');
  const [salario, setSalario] = useState('');
  const [status, setStatus] = useState('ATIVO');
  const [observacoes, setObservacoes] = useState('');

  const fetchCollaborators = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/registry/collaborators', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCollaborators(data);
      }
    } catch (error) {
      console.error("Failed to load collaborators", error);
    }
  };

  useEffect(() => {
    fetchCollaborators();
  }, []);

  const handleOpenCreateModal = () => {
    setSelectedCollaborator(null);
    setNome('');
    setCpf('');
    setTelefone('');
    setWhatsapp('');
    setEmail('');
    setCargo('');
    setDepartamento('');
    
    // Default to today
    const todayStr = new Date().toISOString().substring(0, 10);
    setDataAdmissao(todayStr);
    setSalario('');
    setStatus('ATIVO');
    setObservacoes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (collab: any) => {
    setSelectedCollaborator(collab);
    setNome(collab.nome || '');
    setCpf(collab.cpf || '');
    setTelefone(collab.telefone || '');
    setWhatsapp(collab.whatsapp || '');
    setEmail(collab.email || '');
    setCargo(collab.cargo || '');
    setDepartamento(collab.departamento || '');
    setDataAdmissao(collab.dataAdmissao ? collab.dataAdmissao.substring(0, 10) : '');
    setSalario(collab.salario !== null && collab.salario !== undefined ? String(collab.salario) : '');
    setStatus(collab.status || 'ATIVO');
    setObservacoes(collab.observacoes || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCollaborator(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome) {
      toast.error('O nome do colaborador é obrigatório.');
      return;
    }

    const payload = {
      nome,
      cpf: cpf || null,
      telefone: telefone || null,
      whatsapp: whatsapp || null,
      email: email || null,
      cargo: cargo || null,
      departamento: departamento || null,
      dataAdmissao: dataAdmissao ? new Date(dataAdmissao).toISOString() : null,
      salario: salario ? parseFloat(salario) : null,
      status,
      observacoes: observacoes || null
    };

    try {
      const token = localStorage.getItem('token');
      const url = selectedCollaborator ? `/registry/collaborators/${selectedCollaborator.id}` : '/registry/collaborators';
      const method = selectedCollaborator ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(selectedCollaborator ? 'Colaborador atualizado com sucesso!' : 'Colaborador cadastrado com sucesso!');
        handleCloseModal();
        fetchCollaborators();
      } else {
        const errData = await response.json();
        toast.error(errData.error || 'Erro ao salvar dados do colaborador.');
      }
    } catch (error) {
      console.error('Failed to save collaborator', error);
      toast.error('Erro de conexão ao salvar.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza de que deseja excluir o colaborador "${name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/registry/collaborators/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Colaborador excluído com sucesso!');
        fetchCollaborators();
      } else {
        toast.error('Erro ao excluir colaborador.');
      }
    } catch (error) {
      console.error('Failed to delete collaborator', error);
      toast.error('Erro de conexão ao excluir.');
    }
  };

  const filteredCollaborators = collaborators.filter(collab => {
    const search = searchTerm.toLowerCase();
    return (
      collab.nome?.toLowerCase().includes(search) ||
      collab.cargo?.toLowerCase().includes(search) ||
      collab.departamento?.toLowerCase().includes(search) ||
      collab.cpf?.includes(search) ||
      collab.email?.toLowerCase().includes(search)
    );
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Colaboradores</h1>
          <p className="text-muted-foreground text-sm">Gerenciamento completo do quadro de colaboradores da empresa.</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow hover:bg-primary/90 transition w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>Novo Colaborador</span>
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, cargo, departamento, CPF..."
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
                <th className="p-4 font-medium">Nome / Cargo</th>
                <th className="p-4 font-medium">CPF</th>
                <th className="p-4 font-medium">Contato</th>
                <th className="p-4 font-medium">Admissão / Salário</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredCollaborators.map((collab) => (
                <tr key={collab.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {collab.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{collab.nome}</div>
                        {collab.cargo && <div className="text-xs text-muted-foreground flex items-center gap-1"><Award size={12} /> {collab.cargo} {collab.departamento ? `- ${collab.departamento}` : ''}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-foreground">
                    {collab.cpf ? (
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded border border-border">{collab.cpf}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">Não informado</span>
                    )}
                  </td>
                  <td className="p-4 text-xs space-y-1">
                    {collab.email && <div className="flex items-center gap-1 text-muted-foreground"><Mail size={12} /> {collab.email}</div>}
                    {collab.telefone && <div className="flex items-center gap-1 text-muted-foreground"><Phone size={12} /> {collab.telefone}</div>}
                  </td>
                  <td className="p-4 text-xs space-y-1">
                    {collab.dataAdmissao && <div className="flex items-center gap-1 text-muted-foreground"><Calendar size={12} /> Admissão: {new Date(collab.dataAdmissao).toLocaleDateString('pt-BR')}</div>}
                    {collab.salario !== null && collab.salario !== undefined && <div className="flex items-center gap-1 text-emerald-600 font-bold"><DollarSign size={12} /> {formatCurrency(collab.salario)}</div>}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      collab.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {collab.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleOpenEditModal(collab)}
                        className="p-1.5 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(collab.id, collab.nome)}
                        className="p-1.5 bg-rose-500/10 text-rose-600 rounded hover:bg-rose-500/20 transition"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCollaborators.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Nenhum colaborador cadastrado ou localizado com estes filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Listagem Mobile */}
      <div className="block md:hidden space-y-4">
        {filteredCollaborators.map((collab) => (
          <div key={collab.id} className="bg-card border border-border p-4 rounded-xl space-y-3 shadow-sm hover:border-primary/30 transition">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">
                {collab.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground truncate">{collab.nome}</h4>
                {collab.cargo && <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><Award size={10} /> {collab.cargo}</p>}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                collab.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'
              }`}>
                {collab.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <div className="text-xs space-y-1.5 bg-muted/30 p-2.5 rounded-lg border border-border/50">
              {collab.cpf && <div className="font-mono text-[10px]"><span className="text-muted-foreground font-sans">CPF: </span>{collab.cpf}</div>}
              {collab.email && <div className="truncate flex items-center gap-1 text-muted-foreground"><Mail size={10} /> {collab.email}</div>}
              {collab.telefone && <div className="flex items-center gap-1 text-muted-foreground"><Phone size={10} /> {collab.telefone}</div>}
              {collab.dataAdmissao && <div className="flex items-center gap-1 text-muted-foreground"><Calendar size={10} /> Admissão: {new Date(collab.dataAdmissao).toLocaleDateString('pt-BR')}</div>}
              {collab.salario !== null && collab.salario !== undefined && <div className="flex items-center gap-1 text-emerald-600 font-bold"><DollarSign size={10} /> {formatCurrency(collab.salario)}</div>}
            </div>

            <div className="flex justify-between items-center pt-2.5 border-t border-border/50">
              <span className="text-[10px] text-muted-foreground">Criado em: {new Date(collab.createdAt).toLocaleDateString('pt-BR')}</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenEditModal(collab)}
                  className="p-1.5 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition"
                >
                  <Edit size={12} />
                </button>
                <button 
                  onClick={() => handleDelete(collab.id, collab.nome)}
                  className="p-1.5 bg-rose-500/10 text-rose-600 rounded hover:bg-rose-500/20 transition"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredCollaborators.length === 0 && (
          <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-xl">
            Nenhum colaborador cadastrado.
          </div>
        )}
      </div>

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
              <div className="flex items-center gap-2">
                <User className="text-primary" size={22} />
                <h3 className="text-lg font-bold text-foreground">
                  {selectedCollaborator ? 'Editar Colaborador' : 'Novo Colaborador'}
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
              
              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Nome Completo <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">CPF</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm font-mono"
                  />
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
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">WhatsApp</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Informações Profissionais */}
              <div className="border-t border-border pt-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Informações de Contrato e Cargo</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Cargo / Função</label>
                    <input
                      type="text"
                      placeholder="Ex: Mecânico Chefe, Auxiliar"
                      value={cargo}
                      onChange={(e) => setCargo(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Departamento</label>
                    <input
                      type="text"
                      placeholder="Ex: Oficina, Administrativo"
                      value={departamento}
                      onChange={(e) => setDepartamento(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Data de Admissão</label>
                    <input
                      type="date"
                      value={dataAdmissao}
                      onChange={(e) => setDataAdmissao(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Salário Inicial (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={salario}
                      onChange={(e) => setSalario(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                    >
                      <option value="ATIVO">Ativo</option>
                      <option value="INATIVO">Inativo</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Observações</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Informações adicionais, observações sobre o perfil ou contratação..."
                  className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm h-20 resize-none"
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
                  className="bg-primary text-primary-foreground px-5 py-2 rounded-lg font-semibold shadow hover:bg-primary/90 transition text-sm"
                >
                  {selectedCollaborator ? 'Atualizar Colaborador' : 'Cadastrar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
