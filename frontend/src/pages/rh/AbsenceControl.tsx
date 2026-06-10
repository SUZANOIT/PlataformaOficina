import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Search, 
  Calendar, 
  FileText, 
  Download, 
  Filter, 
  AlertCircle,
  TrendingDown, 
  CheckCircle2, 
  XCircle,
  HelpCircle,
  Clock,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { ModalFooterActions } from '../../components/ui/ModalFooterActions';

interface Collaborator {
  id: string;
  nome: string;
  salario: number;
  status: string;
}

interface Absence {
  id: string;
  collaboratorId: string;
  collaborator: {
    nome: string;
    salario: number;
  };
  dataFalta: string;
  tipo: 'JUSTIFICADA' | 'NAO_JUSTIFICADA';
  diasFalta: number;
  motivo: string | null;
  observacao: string | null;
  anexoUrl: string | null;
  anexoNome: string | null;
  responsavelNome: string;
  createdAt: string;
}

export function AbsenceControl() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [currentCollabId, setCurrentCollabId] = useState<string>('');

  // Dashboard Stats
  const [stats, setStats] = useState({
    total: 0,
    justified: 0,
    unexcused: 0,
    financialImpact: 0
  });

  // Filters state
  const [filterCollab, setFilterCollab] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'JUSTIFICADA' | 'NAO_JUSTIFICADA'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<Absence | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formCollabId, setFormCollabId] = useState('');
  const [formDataFalta, setFormDataFalta] = useState(new Date().toISOString().substring(0, 10));
  const [formTipo, setFormTipo] = useState<'JUSTIFICADA' | 'NAO_JUSTIFICADA'>('NAO_JUSTIFICADA');
  const [formDiasFalta, setFormDiasFalta] = useState<number>(1);
  const [formMotivo, setFormMotivo] = useState<string>('');
  const [formObservacao, setFormObservacao] = useState('');
  
  // Attachment variables
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [existingAnexoNome, setExistingAnexoNome] = useState<string>('');

  // Audit Log State (RH audit view)
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get('/auth/me');
      const me = response.data;
      // Admin/RH têm precedência sobre o perfil Colaborador
      if (me.roleAdmin) {
        setUserRole('ADMIN');
      } else if (me.roleRh) {
        setUserRole('RH');
      } else if (me.roleColaborador) {
        setUserRole('COLABORADOR');
        // Retrieve associated collaborator record
        const collabRes = await api.get('/registry/collaborators');
        const match = collabRes.data.find((c: any) => c.email === me.email);
        if (match) {
          setCurrentCollabId(match.id);
        }
      }
    } catch (error) {
      console.error('Failed to get current user info', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch collaborators
      const collabRes = await api.get('/registry/collaborators');
      const activeCollabs = collabRes.data.filter((c: any) => c.status !== 'INATIVO');
      setCollaborators(activeCollabs);

      // Fetch absences
      const absencesRes = await api.get('/rh/absences');
      setAbsences(absencesRes.data);

      // Fetch dashboard metrics
      const statsRes = await api.get('/rh/dashboard');
      if (statsRes.data && statsRes.data.kpis) {
        setStats({
          total: (statsRes.data.kpis.totalUnexcusedCount || 0) + (statsRes.data.kpis.totalJustifiedCount || 0),
          justified: statsRes.data.kpis.totalJustifiedCount || 0,
          unexcused: statsRes.data.kpis.totalUnexcusedCount || 0,
          financialImpact: statsRes.data.kpis.totalDiscount || 0
        });
      } else if (statsRes.data && statsRes.data.total !== undefined) {
        setStats(statsRes.data); // In case backend changes format
      }
    } catch (error) {
      console.error('Error fetching data', error);
      toast.error('Erro ao carregar dados do módulo de faltas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    fetchData();
  }, [currentCollabId, userRole]);

  // Load audit logs
  const handleOpenAuditLogs = async () => {
    try {
      setShowAuditModal(true);
      setLoadingAudit(true);
      const res = await api.get('/rh/audit-logs');
      setAuditLogs(res.data);
    } catch (error) {
      console.error('Error loading audit logs', error);
      toast.error('Erro ao carregar registros de auditoria.');
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('O arquivo não deve exceder 5MB.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      setFileBase64(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenCreateModal = () => {
    setEditingAbsence(null);
    setFormCollabId('');
    setFormDataFalta(new Date().toISOString().substring(0, 10));
    setFormTipo('NAO_JUSTIFICADA');
    setFormDiasFalta(1);
    setFormMotivo('');
    setFormObservacao('');
    setFileBase64('');
    setFileName('');
    setExistingAnexoNome('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (absence: Absence) => {
    setEditingAbsence(absence);
    setFormCollabId(absence.collaboratorId);
    setFormDataFalta(new Date(absence.dataFalta).toISOString().substring(0, 10));
    setFormTipo(absence.tipo);
    setFormDiasFalta(absence.diasFalta || 1);
    setFormMotivo(absence.motivo || '');
    setFormObservacao(absence.observacao || '');
    setFileBase64('');
    setFileName('');
    setExistingAnexoNome(absence.anexoNome || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCollabId) {
      toast.error('Selecione um colaborador.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        collaboratorId: formCollabId,
        dataFalta: formDataFalta,
        tipo: formTipo,
        diasFalta: formDiasFalta,
        motivo: formMotivo,
        observacao: formObservacao,
      };

      if (fileBase64 && fileName) {
        payload.anexoBase64 = fileBase64;
        payload.anexoNome = fileName;
      }

      if (editingAbsence) {
        await api.put(`/rh/absences/${editingAbsence.id}`, payload);
        toast.success('Falta atualizada com sucesso!');
      } else {
        await api.post('/rh/absences', payload);
        toast.success('Falta registrada com sucesso!');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error submitting form', error);
      const msg = error.response?.data?.error || 'Erro ao processar requisição';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir este registro de falta? Esta ação reverterá os descontos aplicados.')) {
      return;
    }

    try {
      await api.delete(`/rh/absences/${id}`);
      toast.success('Registro de falta excluído com sucesso!');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting absence', error);
      toast.error(error.response?.data?.error || 'Erro ao excluir falta.');
    }
  };

  // Helper to trigger download of base64 or backend served file
  const handleDownloadAttachment = async (absence: Absence) => {
    if (!absence.anexoUrl) return;
    try {
      // In a real application, we would navigate to the endpoint or fetch it.
      // Since it is saved locally, we can construct the API url.
      const fileUrl = `${api.defaults.baseURL || ''}${absence.anexoUrl}`;
      
      const link = document.createElement('a');
      link.href = fileUrl;
      link.setAttribute('download', absence.anexoNome || 'anexo');
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading attachment', error);
      toast.error('Erro ao baixar o anexo.');
    }
  };

  // Filtering logic
  const filteredAbsences = absences.filter(abs => {
    // If collaborator, only show their own absences
    if (userRole === 'COLABORADOR' && currentCollabId && abs.collaboratorId !== currentCollabId) {
      return false;
    }

    // Name search
    if (filterCollab && !abs.collaborator.nome.toLowerCase().includes(filterCollab.toLowerCase())) {
      return false;
    }

    // Start date filter
    if (filterStartDate) {
      const absDate = new Date(abs.dataFalta).toISOString().substring(0, 10);
      if (absDate < filterStartDate) return false;
    }

    // End date filter
    if (filterEndDate) {
      const absDate = new Date(abs.dataFalta).toISOString().substring(0, 10);
      if (absDate > filterEndDate) return false;
    }

    // Type filter
    if (filterType !== 'ALL' && abs.tipo !== filterType) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <UserCheck className="text-primary" size={28} />
            <span>Controle de Faltas</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Lance faltas, justifique com atestados médicos e acompanhe descontos em folha automáticos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(userRole === 'ADMIN' || userRole === 'RH') && (
            <>
              <button
                onClick={handleOpenAuditLogs}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-card border border-border/80 rounded-xl transition duration-150 hover:bg-secondary"
              >
                <Clock size={16} />
                <span>Auditoria</span>
              </button>

              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/95 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition duration-150 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus size={16} />
                <span>Registrar Falta</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/60 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total de Faltas</p>
            <h3 className="text-2xl font-bold mt-0.5">{stats.total}</h3>
          </div>
        </div>

        <div className="bg-card border border-border/60 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Justificadas</p>
            <h3 className="text-2xl font-bold mt-0.5 text-emerald-500">{stats.justified}</h3>
          </div>
        </div>

        <div className="bg-card border border-border/60 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Não Justificadas</p>
            <h3 className="text-2xl font-bold mt-0.5 text-red-500">{stats.unexcused}</h3>
          </div>
        </div>

        <div className="bg-card border border-border/60 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Impacto Financeiro</p>
            <h3 className="text-2xl font-bold mt-0.5 text-amber-500">
              R$ {(stats?.financialImpact || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-card border border-border/60 p-4 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Filter size={16} />
          <span>Filtros de Pesquisa</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {userRole !== 'COLABORADOR' && (
            <div>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Pesquisar por colaborador..."
                  value={filterCollab}
                  onChange={(e) => setFilterCollab(e.target.value)}
                  className="w-full bg-secondary/30 border border-border/70 rounded-xl py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:border-primary transition"
                />
              </div>
            </div>
          )}

          <div>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full bg-secondary/30 border border-border/70 rounded-xl py-1.5 px-3 text-sm focus:outline-none focus:border-primary transition"
              placeholder="Data Inicial"
              title="Data de Início"
            />
          </div>

          <div>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full bg-secondary/30 border border-border/70 rounded-xl py-1.5 px-3 text-sm focus:outline-none focus:border-primary transition"
              placeholder="Data Final"
              title="Data de Fim"
            />
          </div>

          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full bg-secondary/30 border border-border/70 rounded-xl py-1.5 px-3 text-sm focus:outline-none focus:border-primary transition"
            >
              <option value="ALL">Todos os Tipos</option>
              <option value="JUSTIFICADA">Justificada</option>
              <option value="NAO_JUSTIFICADA">Não Justificada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Absences Data Grid */}
      <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <span>Carregando histórico de faltas...</span>
            </div>
          ) : filteredAbsences.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <AlertCircle className="mx-auto text-muted-foreground/30 mb-2" size={40} />
              <p>Nenhuma falta registrada correspondente aos filtros.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase bg-secondary/10">
                  <th className="p-4">Colaborador</th>
                  <th className="p-4">Data da Falta</th>
                  <th className="p-4 text-center">Dias</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Motivo</th>
                  <th className="p-4">Observação</th>
                  <th className="p-4">Comprovante / Atestado</th>
                  <th className="p-4">Responsável</th>
                  {(userRole === 'ADMIN' || userRole === 'RH') && <th className="p-4 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-sm">
                {filteredAbsences.map((abs) => (
                  <tr key={abs.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="p-4 font-bold text-foreground">
                      {abs.collaborator.nome}
                    </td>
                    <td className="p-4">
                      {new Date(abs.dataFalta).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </td>
                    <td className="p-4 text-center font-bold">
                      {abs.diasFalta || 1}
                    </td>
                    <td className="p-4">
                      {abs.tipo === 'JUSTIFICADA' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Justificada
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                          Não Justificada
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-medium text-foreground">
                      {abs.motivo || <span className="opacity-40">-</span>}
                    </td>
                    <td className="p-4 max-w-xs truncate text-muted-foreground" title={abs.observacao || ''}>
                      {abs.observacao || <span className="italic opacity-40">Nenhuma</span>}
                    </td>
                    <td className="p-4">
                      {abs.anexoUrl ? (
                        <button
                          onClick={() => handleDownloadAttachment(abs)}
                          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-semibold transition"
                        >
                          <Download size={14} />
                          <span className="max-w-[120px] truncate">{abs.anexoNome || 'Visualizar'}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground/40 italic">Sem anexo</span>
                      )}
                    </td>
                    <td className="p-4 text-xs">
                      <div className="flex flex-col">
                        <span className="font-semibold text-muted-foreground">{abs.responsavelNome}</span>
                        <span className="text-[10px] opacity-65">{new Date(abs.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                    </td>
                    {(userRole === 'ADMIN' || userRole === 'RH') && (
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(abs)}
                            className="p-1.5 bg-blue-500/10 text-blue-600 rounded-lg hover:bg-blue-500/20 transition"
                            title="Editar Falta"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(abs.id)}
                            className="p-1.5 bg-rose-500/10 text-rose-600 rounded-lg hover:bg-rose-500/20 transition"
                            title="Excluir Falta"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Register/Edit Absence Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-card border border-border/80 shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-secondary/10">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Calendar className="text-primary" size={20} />
                <span>{editingAbsence ? 'Editar Registro de Falta' : 'Lançar Nova Falta'}</span>
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Colaborador</label>
                <select
                  value={formCollabId}
                  onChange={(e) => setFormCollabId(e.target.value)}
                  className="w-full bg-secondary/20 border border-border/70 rounded-xl py-2 px-3 focus:outline-none focus:border-primary transition"
                  disabled={!!editingAbsence}
                  required
                >
                  <option value="">Selecione o Colaborador...</option>
                  {collaborators.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} (Salário: R$ {(c.salario || 0).toLocaleString('pt-BR')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Data da Falta</label>
                  <input
                    type="date"
                    value={formDataFalta}
                    onChange={(e) => setFormDataFalta(e.target.value)}
                    className="w-full bg-secondary/20 border border-border/70 rounded-xl py-2 px-3 focus:outline-none focus:border-primary transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Tipo da Falta</label>
                  <select
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value as any)}
                    className="w-full bg-secondary/20 border border-border/70 rounded-xl py-2 px-3 focus:outline-none focus:border-primary transition"
                    required
                  >
                    <option value="NAO_JUSTIFICADA">Não Justificada (Desconto)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Quantidade de Dias</label>
                  <input
                    type="number"
                    min={1}
                    value={formDiasFalta}
                    onChange={(e) => setFormDiasFalta(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-secondary/20 border border-border/70 rounded-xl py-2 px-3 focus:outline-none focus:border-primary transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Motivo Principal</label>
                  <input
                    type="text"
                    value={formMotivo}
                    onChange={(e) => setFormMotivo(e.target.value)}
                    placeholder="Ex: Médico, Particular, Suspensão..."
                    className="w-full bg-secondary/20 border border-border/70 rounded-xl py-2 px-3 focus:outline-none focus:border-primary transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Observações / Motivo</label>
                <textarea
                  value={formObservacao}
                  onChange={(e) => setFormObservacao(e.target.value)}
                  placeholder="Justificativa, motivo médico ou observações adicionais..."
                  rows={3}
                  className="w-full bg-secondary/20 border border-border/70 rounded-xl py-2 px-3 focus:outline-none focus:border-primary transition text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Atestado / Documento Comprovante</label>
                <div className="mt-1 border border-dashed border-border/90 rounded-xl p-4 flex flex-col items-center justify-center bg-secondary/10 hover:bg-secondary/20 transition-all duration-150">
                  <FileText className="text-muted-foreground opacity-60 mb-2" size={24} />
                  <input
                    type="file"
                    id="absence-anexo"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  />
                  <label 
                    htmlFor="absence-anexo"
                    className="cursor-pointer px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold rounded-lg transition"
                  >
                    Selecionar Arquivo
                  </label>
                  
                  {fileName ? (
                    <span className="text-xs text-emerald-500 font-medium mt-2 max-w-xs truncate">{fileName}</span>
                  ) : existingAnexoNome ? (
                    <span className="text-xs text-muted-foreground mt-2 max-w-xs truncate">Atual: {existingAnexoNome}</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/60 mt-1.5">Arquivos permitidos: PDF, Imagens, Word (Max 5MB)</span>
                  )}
                </div>
              </div>

              <ModalFooterActions
                onCancel={() => setIsModalOpen(false)}
                primaryLabel="Salvar"
                loading={submitting}
                primaryType="submit"
                embedded
              />
            </form>
          </div>
        </div>
      )}

      {/* Audit Logs Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-card border border-border/80 shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-secondary/10">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Clock className="text-primary" size={20} />
                <span>Auditoria de Faltas e Adiantamentos</span>
              </h2>
              <button 
                onClick={() => setShowAuditModal(false)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-3">
              {loadingAudit ? (
                <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
                  <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <span>Carregando logs de auditoria...</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <HelpCircle className="mx-auto text-muted-foreground/30 mb-2" size={40} />
                  <p>Nenhum registro de auditoria encontrado.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="border border-border/50 p-4 rounded-xl space-y-2 bg-secondary/5 text-xs hover:border-primary/20 transition"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-foreground uppercase tracking-wider">{log.action.replace(/_/g, ' ')}</span>
                        <span className="text-muted-foreground">{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-1.5 text-muted-foreground">
                        <div>
                          <strong>Colaborador:</strong> {log.collaboratorName}
                        </div>
                        <div>
                          <strong>Usuário Executor:</strong> {log.usuario}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2 p-2 bg-secondary/15 rounded-lg border border-border/30">
                        <div>
                          <strong className="text-red-500 block mb-0.5">Estado Anterior:</strong>
                          <span className="font-mono text-[10px] break-all">{log.valorAnterior || 'N/A'}</span>
                        </div>
                        <div>
                          <strong className="text-emerald-500 block mb-0.5">Estado Novo:</strong>
                          <span className="font-mono text-[10px] break-all">{log.valorNovo || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <ModalFooterActions
              onCancel={() => setShowAuditModal(false)}
              cancelLabel="Fechar"
              hidePrimary
            />
          </div>
        </div>
      )}
    </div>
  );
}
