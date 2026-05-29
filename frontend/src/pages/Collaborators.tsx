import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, X, Search, User, Phone, Mail, Award, Calendar, DollarSign, Coins, Printer, History } from 'lucide-react';
import { toast } from 'sonner';
import { useGeneratePdf } from '../hooks/useGeneratePdf';
import { AdvancePdfTemplate } from '../components/AdvancePdfTemplate';
import { handleApiError } from '../utils/toast.helper';

export function Collaborators() {
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Advances modal state
  const [companies, setCompanies] = useState<any[]>([]);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [currentCollabForAdvance, setCurrentCollabForAdvance] = useState<any>(null);
  const [advances, setAdvances] = useState<any[]>([]);
  const [loadingAdvances, setLoadingAdvances] = useState(false);

  // New advance form state
  const [isCreateAdvanceFormOpen, setIsCreateAdvanceFormOpen] = useState(false);
  const [advanceValor, setAdvanceValor] = useState('');
  const [advanceFormaPagamento, setAdvanceFormaPagamento] = useState('PIX');
  const [advanceData, setAdvanceData] = useState(new Date().toISOString().substring(0, 10));
  const [advanceObservacoes, setAdvanceObservacoes] = useState('');
  const [advanceOficinaId, setAdvanceOficinaId] = useState('');
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [savingAdvance, setSavingAdvance] = useState(false);

  // PDF Ref & states
  const [selectedAdvanceForPdf, setSelectedAdvanceForPdf] = useState<any>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const { generatePdf } = useGeneratePdf();
  
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
  const [oficinaId, setOficinaId] = useState('');

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

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/companies', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error("Failed to load companies", error);
    }
  };

  const fetchWorkshops = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/fleet/workshops', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setWorkshops(data);
      }
    } catch (error) {
      console.error("Failed to load workshops", error);
    }
  };

  useEffect(() => {
    fetchCollaborators();
    fetchCompanies();
    fetchWorkshops();
  }, []);

  const fetchAdvances = async (collabId: string) => {
    setLoadingAdvances(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/registry/collaborators/${collabId}/advances`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAdvances(data);
      } else {
        toast.error("Erro ao carregar adiantamentos.");
      }
    } catch (error) {
      console.error("Failed to load advances", error);
      toast.error("Erro de conexão ao carregar adiantamentos.");
    } finally {
      setLoadingAdvances(false);
    }
  };

  const handleOpenAdvanceModal = (collab: any) => {
    setCurrentCollabForAdvance(collab);
    setAdvances([]);
    setIsAdvanceModalOpen(true);
    setIsCreateAdvanceFormOpen(false);
    // Reset form fields
    setAdvanceValor('');
    setAdvanceFormaPagamento('PIX');
    setAdvanceData(new Date().toISOString().substring(0, 10));
    setAdvanceObservacoes('');
    setAdvanceOficinaId(collab.oficinaId || '');
    
    fetchAdvances(collab.id);
  };

  const handleSaveAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceValor || parseFloat(advanceValor) <= 0) {
      toast.error("Por favor, insira um valor válido para o adiantamento.");
      return;
    }

    setSavingAdvance(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        valor: parseFloat(advanceValor),
        formaPagamento: advanceFormaPagamento,
        data: advanceData ? new Date(advanceData).toISOString() : null,
        observacoes: advanceObservacoes || null,
        oficinaId: advanceOficinaId || null
      };

      const response = await fetch(`/registry/collaborators/${currentCollabForAdvance.id}/advances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const newAdvance = await response.json();
        toast.success("Adiantamento cadastrado com sucesso!");
        
        // Clear form
        setAdvanceValor('');
        setAdvanceFormaPagamento('PIX');
        setAdvanceData(new Date().toISOString().substring(0, 10));
        setAdvanceObservacoes('');
        setAdvanceOficinaId(currentCollabForAdvance?.oficinaId || '');
        setIsCreateAdvanceFormOpen(false);

        // Refresh advances list
        await fetchAdvances(currentCollabForAdvance.id);

        // Auto trigger PDF generation for this new advance!
        handleDownloadPdf(newAdvance);
      } else {
        const errData = await response.json();
        toast.error(errData.error || "Erro ao cadastrar adiantamento.");
      }
    } catch (error) {
      console.error("Failed to save advance", error);
      toast.error("Erro de conexão ao salvar adiantamento.");
    } finally {
      setSavingAdvance(false);
    }
  };

  const handleToggleAdvanceStatus = async (advanceId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PENDENTE' ? 'DESCONTADO_EM_FOLHA' : 'PENDENTE';
    const message = newStatus === 'DESCONTADO_EM_FOLHA' 
      ? 'Deseja marcar este adiantamento como "Descontado em Folha"?'
      : 'Deseja reverter o adiantamento para "Pendente"?';

    if (!window.confirm(message)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/registry/collaborators/advances/${advanceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast.success("Status atualizado com sucesso!");
        fetchAdvances(currentCollabForAdvance.id);
      } else {
        toast.error("Erro ao atualizar status.");
      }
    } catch (error) {
      console.error("Failed to update status", error);
      toast.error("Erro de conexão.");
    }
  };

  const handleDeleteAdvance = async (advanceId: string) => {
    if (!window.confirm("Tem certeza de que deseja excluir este adiantamento? Esta ação também removerá o lançamento financeiro associado.")) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/registry/collaborators/advances/${advanceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success("Adiantamento excluído com sucesso!");
        fetchAdvances(currentCollabForAdvance.id);
      } else {
        toast.error("Erro ao excluir adiantamento.");
      }
    } catch (error) {
      console.error("Failed to delete advance", error);
      toast.error("Erro de conexão.");
    }
  };

  const handleDownloadPdf = async (advance: any) => {
    // Set active advance
    setSelectedAdvanceForPdf(advance);
    
    // Wait for the DOM to update so the PDF template renders off-screen
    setTimeout(async () => {
      if (!pdfRef.current) {
        toast.error("Erro ao preparar documento de comprovante.");
        return;
      }

      const fileName = `Comprovante_Adiantamento_${advance.numeroComprovante}.pdf`;
      try {
        const success = await generatePdf(pdfRef.current, fileName);
        if (success) {
          toast.success("Comprovante baixado com sucesso!");
          
          // Log pdf generation in backend history logs
          const token = localStorage.getItem('token');
          await fetch(`/registry/collaborators/advances/${advance.id}/pdf`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ fileName })
          });
          
          // Refresh list to show new log in print history
          fetchAdvances(currentCollabForAdvance.id);
        } else {
          toast.error("Falha ao gerar o PDF.");
        }
      } catch (error) {
        console.error("Failed to generate PDF receipt", error);
        toast.error("Erro ao gerar arquivo PDF.");
      }
    }, 450);
  };

  const handleOpenCreateModal = () => {
    setSelectedCollaborator(null);
    setNome('');
    setCpf('');
    setTelefone('');
    setWhatsapp('');
    setEmail('');
    setCargo('');
    setDepartamento('');
    setOficinaId('');
    
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
    setOficinaId(collab.oficinaId || '');
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

    if (isSubmitting) return;
    setIsSubmitting(true);

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
      observacoes: observacoes || null,
      oficinaId: oficinaId || null
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
        handleApiError(response, 'Erro ao salvar dados do colaborador.');
      }
    } catch (error) {
      console.error('Failed to save collaborator', error);
      handleApiError(error, 'Erro de conexão ao salvar.');
    } finally {
      setIsSubmitting(false);
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
                        {collab.oficina && (
                          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                            🏢 Oficina: {collab.oficina.nome}
                          </div>
                        )}
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
                        onClick={() => handleOpenAdvanceModal(collab)}
                        className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded hover:bg-emerald-500/20 transition"
                        title="Adiantamentos Salariais"
                      >
                        <Coins size={14} />
                      </button>
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
                {collab.oficina && (
                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5 truncate">
                    🏢 Oficina: {collab.oficina.nome}
                  </p>
                )}
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
                  onClick={() => handleOpenAdvanceModal(collab)}
                  className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded hover:bg-emerald-500/20 transition"
                  title="Adiantamentos"
                >
                  <Coins size={12} />
                </button>
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

                <div className="space-y-1 mt-3">
                  <label className="text-xs font-semibold text-foreground">Oficina Vinculada *</label>
                  <select
                    required
                    value={oficinaId}
                    onChange={(e) => setOficinaId(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm text-foreground"
                  >
                    <option value="">Selecione a oficina vinculada...</option>
                    {workshops.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.nome}
                      </option>
                    ))}
                  </select>
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
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground px-5 py-2 rounded-lg font-semibold shadow hover:bg-primary/90 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? 'Salvando...' : (selectedCollaborator ? 'Atualizar Colaborador' : 'Cadastrar Colaborador')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gestão de Adiantamentos Salariais */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
              <div className="flex items-center gap-2">
                <Coins className="text-emerald-500 animate-pulse" size={22} />
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Gestão de Adiantamentos Salariais
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Colaborador: <span className="font-semibold text-foreground">{currentCollabForAdvance?.nome}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsAdvanceModalOpen(false)}
                className="p-1.5 hover:bg-muted rounded-lg transition text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Employee Summary Card */}
              <div className="bg-gradient-to-r from-muted/65 to-muted/25 border border-border p-5 rounded-2xl flex flex-wrap gap-8 justify-between items-center text-sm shadow-inner">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80 block">CPF</span>
                  <span className="font-mono font-bold text-foreground bg-background border border-border/60 px-2.5 py-1 rounded-lg text-xs shadow-3xs">
                    {currentCollabForAdvance?.cpf || 'Não informado'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80 block">Cargo</span>
                  <div className="flex items-center gap-1.5 text-foreground font-semibold text-xs">
                    <Award size={13} className="text-primary/70" />
                    <span>{currentCollabForAdvance?.cargo || 'Não informado'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80 block">Departamento</span>
                  <span className="font-semibold text-foreground text-xs">{currentCollabForAdvance?.departamento || 'Não informado'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80 block">Salário Base</span>
                  <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl shadow-3xs">
                    <DollarSign size={13} className="text-emerald-500" />
                    <span className="font-black text-emerald-600 text-xs">
                      {currentCollabForAdvance?.salario !== null && currentCollabForAdvance?.salario !== undefined
                        ? formatCurrency(currentCollabForAdvance.salario)
                        : 'Não informado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action and Form Row */}
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-emerald-500 rounded"></span>
                  Histórico de Lançamentos
                  <span className="bg-emerald-500/15 text-emerald-600 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {advances.length}
                  </span>
                </h4>
                {!isCreateAdvanceFormOpen && (
                  <button
                    onClick={() => setIsCreateAdvanceFormOpen(true)}
                    className="flex items-center gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 duration-150"
                  >
                    <Plus size={14} /> Novo Adiantamento
                  </button>
                )}
              </div>

              {/* Create Advance Form */}
              {isCreateAdvanceFormOpen && (
                <form onSubmit={handleSaveAdvance} className="bg-card border border-emerald-500/30 p-6 rounded-2xl space-y-4 shadow-lg animate-in slide-in-from-top-4 duration-200">
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <h5 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Registrar Novo Adiantamento
                    </h5>
                    <button
                      type="button"
                      onClick={() => setIsCreateAdvanceFormOpen(false)}
                      className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2 py-1 rounded hover:bg-muted transition"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        Valor (R$) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={advanceValor}
                        onChange={(e) => setAdvanceValor(e.target.value)}
                        placeholder="Ex: 500.00"
                        className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        Forma de Pagamento *
                      </label>
                      <select
                        required
                        value={advanceFormaPagamento}
                        onChange={(e) => setAdvanceFormaPagamento(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary text-foreground"
                      >
                        <option value="PIX">PIX</option>
                        <option value="Transferência Bancária">Transferência Bancária</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        Data do Adiantamento *
                      </label>
                      <input
                        type="date"
                        required
                        value={advanceData}
                        onChange={(e) => setAdvanceData(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        Oficina Vinculada *
                      </label>
                      <select
                        required
                        value={advanceOficinaId}
                        onChange={(e) => setAdvanceOficinaId(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary text-foreground"
                      >
                        <option value="">Selecione uma oficina...</option>
                        {workshops.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      Observações / Justificativa
                    </label>
                    <textarea
                      value={advanceObservacoes}
                      onChange={(e) => setAdvanceObservacoes(e.target.value)}
                      placeholder="Indique observações relevantes ou motivo..."
                      rows={2}
                      className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary text-foreground resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateAdvanceFormOpen(false)}
                      className="px-4 py-2 bg-muted text-foreground text-xs font-bold rounded-lg hover:bg-muted/80 transition"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={savingAdvance}
                      className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
                    >
                      {savingAdvance ? 'Salvando...' : 'Salvar e Gerar Comprovante'}
                    </button>
                  </div>
                </form>
              )}

              {/* Advances History Table */}
              <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-xs">
                {loadingAdvances ? (
                  <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-3">
                    <span className="animate-spin text-emerald-500 text-xl font-bold">↻</span>
                    <span>Carregando histórico...</span>
                  </div>
                ) : advances.length === 0 ? (
                  <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
                    <p className="font-semibold text-foreground">Nenhum registro encontrado</p>
                    <p className="text-xs">Nenhum adiantamento salarial registrado para este colaborador.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted/65 border-b border-border text-muted-foreground font-semibold">
                          <th className="py-4 px-5 font-bold">Emissão / Comprovante</th>
                          <th className="py-4 px-5 font-bold">Valor</th>
                          <th className="py-4 px-5 font-bold">Forma de Pagamento</th>
                          <th className="py-4 px-5 font-bold">Oficina</th>
                          <th className="py-4 px-5 font-bold">Status</th>
                          <th className="py-4 px-5 font-bold">Lançamento / Histórico</th>
                          <th className="py-4 px-5 font-bold text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {advances.map((adv) => (
                          <tr key={adv.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-2">
                                <Calendar size={13} className="text-muted-foreground" />
                                <span className="font-bold text-foreground text-xs">
                                  {new Date(adv.data).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              <span className="inline-block bg-muted/80 border border-border/80 px-2 py-0.5 rounded text-[10px] text-muted-foreground font-mono font-semibold tracking-tight mt-1.5">
                                {adv.numeroComprovante}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 font-sans">
                              <span className="inline-block bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 rounded-lg text-emerald-600 font-extrabold text-xs">
                                {formatCurrency(adv.valor)}
                              </span>
                            </td>
                            <td className="py-3.5 px-5">
                              <span className="inline-block bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                {adv.formaPagamento}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-foreground text-xs font-bold">
                              {adv.oficina ? (
                                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                                  <span>🏢</span>
                                  <span>{adv.oficina.nome}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 font-normal italic">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-5">
                              <button
                                onClick={() => handleToggleAdvanceStatus(adv.id, adv.status)}
                                className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 shadow-2xs hover:scale-102 cursor-pointer ${
                                  adv.status === 'DESCONTADO_EM_FOLHA' 
                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                                    : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                }`}
                                title="Clique para alterar status"
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  adv.status === 'DESCONTADO_EM_FOLHA' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                                }`}></span>
                                <span>{adv.status === 'DESCONTADO_EM_FOLHA' ? 'Descontado' : 'Pendente'}</span>
                              </button>
                            </td>
                            <td className="py-3.5 px-5 text-muted-foreground text-[10px]">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1">
                                  <User size={12} className="text-muted-foreground/75" />
                                  <span>Por: <span className="font-semibold text-foreground">{adv.responsavel}</span></span>
                                </div>
                                {adv.pdfs && adv.pdfs.length > 0 ? (
                                  <span className="text-[9px] text-slate-400 flex items-center gap-1 font-semibold">
                                    <History size={10} /> {adv.pdfs.length} via(s) gerada(s)
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-amber-500/90 flex items-center gap-1 font-semibold">
                                    ⚠️ Nunca gerado
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <div className="flex gap-2.5 justify-end">
                                <button
                                  onClick={() => handleDownloadPdf(adv)}
                                  className="p-2 bg-slate-500/10 text-slate-600 rounded-xl hover:bg-slate-500/20 transition hover:scale-105 active:scale-95 duration-100"
                                  title="Baixar Comprovante (PDF)"
                                >
                                  <Printer size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteAdvance(adv.id)}
                                  className="p-2 bg-rose-500/10 text-rose-600 rounded-xl hover:bg-rose-500/20 transition hover:scale-105 active:scale-95 duration-100"
                                  title="Excluir Adiantamento"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end bg-muted/20">
              <button
                type="button"
                onClick={() => setIsAdvanceModalOpen(false)}
                className="px-4 py-2 bg-muted text-foreground font-semibold rounded-xl hover:bg-muted/80 transition text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Container invisível para geração do PDF */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        {selectedAdvanceForPdf && (
          <AdvancePdfTemplate
            ref={pdfRef}
            advance={selectedAdvanceForPdf}
            collaborator={currentCollabForAdvance}
            company={companies.find(c => c.id === currentCollabForAdvance?.companyId) || companies[0]}
          />
        )}
      </div>
    </div>
  );
}
