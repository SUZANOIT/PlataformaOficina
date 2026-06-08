import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SaaSAPIService } from '../../services/saas';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Edit3, 
  Ban, 
  FileText, 
  Download, 
  Lock, 
  History,
  Check,
  AlertTriangle,
  X
} from 'lucide-react';
import { toast } from 'sonner';

export function Tenants() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [planId, setPlanId] = useState('all');

  // Modals
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState<string | null>(null);

  // Form Fields
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tenant Form
  const [formData, setFormData] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    email: '',
    telefone: '',
    responsavel: '',
    planoId: '',
    status: 'Trial',
    limiteUsuarios: 5,
    limiteVeiculos: 100,
    limiteOficinas: 3,
    limiteOs: 100,
    adminName: '',
    adminEmail: '',
    adminPassword: ''
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [tenantsData, plansData] = await Promise.all([
        SaaSAPIService.listTenants({ search, status, planId }),
        SaaSAPIService.listPlans()
      ]);
      setTenants(tenantsData);
      setPlans(plansData);
      
      if (plansData.length > 0 && !formData.planoId) {
        setFormData(prev => ({ ...prev, planoId: plansData[0].id }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados dos tenants.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Detect trigger from dashboard quick action
    if (searchParams.get('action') === 'new') {
      setIsCreateOpen(true);
      searchParams.delete('action');
      setSearchParams(searchParams);
    }
  }, [status, planId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.razaoSocial || !formData.cnpj || !formData.email || !formData.responsavel || !formData.adminEmail || !formData.adminPassword) {
      toast.error('Preencha todos os campos obrigatórios do formulário.');
      return;
    }

    setIsSubmitting(true);
    try {
      await SaaSAPIService.createTenant(formData);
      toast.success('Empresa (Tenant) e Administrador criados com sucesso!');
      setIsCreateOpen(false);
      // Reset form
      setFormData({
        razaoSocial: '',
        nomeFantasia: '',
        cnpj: '',
        email: '',
        telefone: '',
        responsavel: '',
        planoId: plans[0]?.id || '',
        status: 'Trial',
        limiteUsuarios: 5,
        limiteVeiculos: 100,
        limiteOficinas: 3,
        limiteOs: 100,
        adminName: '',
        adminEmail: '',
        adminPassword: ''
      });
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Erro ao cadastrar tenant.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    setIsSubmitting(true);
    try {
      await SaaSAPIService.updateTenant(selectedTenant.id, selectedTenant);
      toast.success('Dados cadastrais da empresa atualizados!');
      setIsEditOpen(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Erro ao atualizar tenant.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant || !newPassword) return;

    setIsSubmitting(true);
    try {
      await SaaSAPIService.resetTenantAdminPassword(selectedTenant.id, newPassword);
      toast.success('Senha do administrador redefinida!');
      setIsResetOpen(false);
      setNewPassword('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Erro ao redefinir senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (tenant: any, action: 'block' | 'suspend' | 'reactivate') => {
    try {
      if (action === 'block') {
        await SaaSAPIService.blockTenant(tenant.id);
        toast.warning(`Empresa ${tenant.razaoSocial} bloqueada.`);
      } else if (action === 'suspend') {
        await SaaSAPIService.suspendTenant(tenant.id);
        toast.warning(`Empresa ${tenant.razaoSocial} suspensa.`);
      } else {
        await SaaSAPIService.reactivateTenant(tenant.id);
        toast.success(`Empresa ${tenant.razaoSocial} reativada.`);
      }
      setIsActionMenuOpen(null);
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Erro ao alterar status do tenant.');
    }
  };

  const handleOpenHistory = async (tenant: any) => {
    setSelectedTenant(tenant);
    setIsHistoryOpen(true);
    try {
      const logs = await SaaSAPIService.getTenantHistory(tenant.id);
      setHistoryLogs(logs);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao buscar logs de auditoria.');
    }
  };

  // Exportar dados como CSV
  const handleExportCSV = () => {
    if (tenants.length === 0) return;
    const headers = ['Razao Social', 'Nome Fantasia', 'CNPJ', 'Email', 'Telefone', 'Responsavel', 'Status', 'Plano Atual', 'Vencimento'];
    const rows = tenants.map(t => [
      t.razaoSocial,
      t.nomeFantasia || '',
      t.cnpj,
      t.email,
      t.telefone || '',
      t.responsavel,
      t.status,
      t.plan?.nome || 'Nenhum',
      t.dataVencimento ? new Date(t.dataVencimento).toLocaleDateString('pt-BR') : ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tenants_saas_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Relatório CSV gerado e baixado!');
  };

  // Exportar dados como PDF (Simulado através de documento estruturado para impressão)
  const handleExportPDF = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Ativa': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Trial': return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
      case 'Suspensa': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Bloqueada': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider">Gestão de Empresas (Tenants)</h2>
          <p className="text-xs text-slate-400">Gerenciamento cadastral, bloqueios e alteração de planos dos clientes SaaS.</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-950/20 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs border border-slate-800 transition flex-1 sm:flex-none"
          >
            <Download size={14} />
            <span>CSV</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-950/20 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs border border-slate-800 transition flex-1 sm:flex-none"
          >
            <FileText size={14} />
            <span>Imprimir</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-500 hover:bg-indigo-400 active:scale-98 text-slate-950 font-extrabold rounded-xl text-xs transition shadow-lg shadow-indigo-500/10 flex-1 sm:flex-none"
          >
            <Plus size={14} />
            <span>Nova Empresa</span>
          </button>
        </div>
      </div>

      {/* Filters Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pesquisar Empresa</label>
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Razão social, CNPJ, e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status Assinatura</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
            >
              <option value="all">Todos os Status</option>
              <option value="Ativa">Ativa</option>
              <option value="Trial">Trial</option>
              <option value="Suspensa">Suspensa</option>
              <option value="Bloqueada">Bloqueada</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Plano Atual</label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
            >
              <option value="all">Todos os Planos</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {/* Tenants Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : tenants.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            Nenhuma empresa cadastrada no SaaS com os filtros selecionados.
          </div>
        ) : (
          <div className="w-full">
            <table className="w-full text-left border-collapse table-fixed break-words">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-950/20">
                  <th className="p-4 w-5/12 sm:w-3/12 lg:w-3/12">Razão Social / CNPJ</th>
                  <th className="p-4 w-4/12 sm:w-3/12 lg:w-2/12">Responsável</th>
                  <th className="p-4 hidden md:table-cell w-2/12">Plano / Vencimento</th>
                  <th className="p-4 hidden lg:table-cell w-2/12">Uso de Recursos</th>
                  <th className="p-4 hidden sm:table-cell w-2/12 lg:w-1/12">Status</th>
                  <th className="p-4 w-3/12 sm:w-2/12 lg:w-2/12 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-xs">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-800/10">
                    <td className="p-4 font-bold text-slate-200 truncate">
                      <div className="truncate">{tenant.razaoSocial}</div>
                      <div className="text-[10px] text-slate-500 font-semibold truncate">{tenant.nomeFantasia || '-'}</div>
                      <div className="text-[9px] font-mono text-slate-500 mt-0.5 truncate">{tenant.cnpj}</div>
                      <div className="sm:hidden mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getStatusBadge(tenant.status)} truncate block w-fit`}>
                          {tenant.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400 font-semibold truncate">
                      <div className="truncate">{tenant.responsavel}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">{tenant.telefone || tenant.email}</div>
                    </td>
                    <td className="p-4 hidden md:table-cell truncate">
                      <span className="inline-block px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-extrabold truncate max-w-full">
                        {tenant.plan?.nome || 'Nenhum'}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-1 font-medium truncate">
                        Renovação: {tenant.dataVencimento ? new Date(tenant.dataVencimento).toLocaleDateString('pt-BR') : 'Sem data'}
                      </div>
                    </td>
                    <td className="p-4 text-slate-400 hidden lg:table-cell">
                      <div className="grid grid-cols-2 gap-x-2 text-[10px] font-medium truncate">
                        <span className="truncate">Usuários: <strong className="text-slate-200">{tenant.usersCount}/{tenant.limiteUsuarios}</strong></span>
                        <span className="truncate">Veículos: <strong className="text-slate-200">{tenant.vehiclesCount}/{tenant.limiteVeiculos}</strong></span>
                        <span className="truncate">Oficinas: <strong className="text-slate-200">{tenant.workshopsCount}/{tenant.limiteOficinas}</strong></span>
                        <span className="truncate">O.S: <strong className="text-slate-200">{tenant.osCount}/{tenant.limiteOs}</strong></span>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell truncate">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusBadge(tenant.status)} truncate block w-fit`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="p-4 text-center relative">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap sm:flex-nowrap">
                        <button
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setIsEditOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0"
                          title="Editar Cadastro"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleOpenHistory(tenant)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0"
                          title="Histórico / Auditoria"
                        >
                          <History size={13} />
                        </button>

                        {/* Dropdown Menu Toggle */}
                        <div className="relative">
                          <button
                            onClick={() => setIsActionMenuOpen(isActionMenuOpen === tenant.id ? null : tenant.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0"
                          >
                            <MoreVertical size={13} />
                          </button>

                          {isActionMenuOpen === tenant.id && (
                            <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl z-20 p-1 divide-y divide-slate-800 text-left">
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    setSelectedTenant(tenant);
                                    setIsResetOpen(true);
                                    setIsActionMenuOpen(null);
                                  }}
                                  className="flex items-center gap-2.5 w-full px-3 py-2 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 hover:text-slate-100 rounded-lg transition"
                                >
                                  <Lock size={12} className="text-slate-500 shrink-0" />
                                  <span className="truncate">Resetar Senha</span>
                                </button>
                              </div>

                              <div className="py-1 space-y-0.5">
                                {tenant.status !== 'Ativa' && (
                                  <button
                                    onClick={() => handleStatusChange(tenant, 'reactivate')}
                                    className="flex items-center gap-2.5 w-full px-3 py-2 text-[11px] font-semibold text-emerald-400 hover:bg-slate-800 hover:text-emerald-300 rounded-lg transition"
                                  >
                                    <Check size={12} className="shrink-0" />
                                    <span className="truncate">Reativar Empresa</span>
                                  </button>
                                )}
                                {tenant.status !== 'Suspensa' && (
                                  <button
                                    onClick={() => handleStatusChange(tenant, 'suspend')}
                                    className="flex items-center gap-2.5 w-full px-3 py-2 text-[11px] font-semibold text-amber-400 hover:bg-slate-800 hover:text-amber-300 rounded-lg transition"
                                  >
                                    <AlertTriangle size={12} className="shrink-0" />
                                    <span className="truncate">Suspender</span>
                                  </button>
                                )}
                                {tenant.status !== 'Bloqueada' && (
                                  <button
                                    onClick={() => handleStatusChange(tenant, 'block')}
                                    className="flex items-center gap-2.5 w-full px-3 py-2 text-[11px] font-semibold text-rose-400 hover:bg-slate-800 hover:text-rose-300 rounded-lg transition"
                                  >
                                    <Ban size={12} className="shrink-0" />
                                    <span className="truncate">Bloquear Empresa</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE TENANT MODAL (Wizard) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl border border-slate-800 bg-slate-900 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-base font-black text-white uppercase tracking-wider mb-4">Adicionar Nova Empresa (Tenant)</h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4 overflow-y-auto flex-1 pr-2 scrollbar-thin">
              {/* Seção 1: Dados da Empresa */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-1">1. Dados da Empresa</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Razão Social *</label>
                    <input
                      type="text"
                      value={formData.razaoSocial}
                      onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                      placeholder="Ex: Oficina do João Ltda"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nome Fantasia</label>
                    <input
                      type="text"
                      value={formData.nomeFantasia}
                      onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
                      placeholder="Ex: Oficina do João"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CNPJ *</label>
                    <input
                      type="text"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      placeholder="00.000.000/0001-00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">E-mail Comercial *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contato@empresa.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Telefone</label>
                    <input
                      type="text"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Responsável *</label>
                    <input
                      type="text"
                      value={formData.responsavel}
                      onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                      placeholder="João da Silva"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Plano e Limites */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-1">2. Plano e Limites de Uso</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Plano Contratado *</label>
                    <select
                      value={formData.planoId}
                      onChange={(e) => setFormData({ ...formData, planoId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                    >
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.nome} - {p.valorMensal.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}/mês</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status *</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                    >
                      <option value="Trial">Trial (Teste)</option>
                      <option value="Ativa">Ativa (Paga)</option>
                      <option value="Suspensa">Suspensa</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Limite Usuários</label>
                    <input
                      type="number"
                      value={formData.limiteUsuarios}
                      onChange={(e) => setFormData({ ...formData, limiteUsuarios: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Limite Veículos</label>
                    <input
                      type="number"
                      value={formData.limiteVeiculos}
                      onChange={(e) => setFormData({ ...formData, limiteVeiculos: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Limite Oficinas</label>
                    <input
                      type="number"
                      value={formData.limiteOficinas}
                      onChange={(e) => setFormData({ ...formData, limiteOficinas: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Limite OS Mensal</label>
                    <input
                      type="number"
                      value={formData.limiteOs}
                      onChange={(e) => setFormData({ ...formData, limiteOs: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Administrador Master Local */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-1">3. Administrador Master (Acesso Local da Oficina)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nome Completo *</label>
                    <input
                      type="text"
                      value={formData.adminName}
                      onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                      placeholder="Ex: João da Silva Admin"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">E-mail de Login *</label>
                    <input
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      placeholder="admin@oficinajoao.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Senha Provisória *</label>
                    <input
                      type="password"
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                      placeholder="Mínimo 6 dígitos"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black rounded-xl text-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Cadastrar Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TENANT MODAL */}
      {isEditOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl border border-slate-800 bg-slate-900 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-base font-black text-white uppercase tracking-wider mb-4">Editar Cadastro da Empresa</h3>

            <form onSubmit={handleEditSubmit} className="space-y-4 overflow-y-auto pr-2 scrollbar-thin">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Razão Social</label>
                  <input
                    type="text"
                    value={selectedTenant.razaoSocial}
                    onChange={(e) => setSelectedTenant({ ...selectedTenant, razaoSocial: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nome Fantasia</label>
                  <input
                    type="text"
                    value={selectedTenant.nomeFantasia || ''}
                    onChange={(e) => setSelectedTenant({ ...selectedTenant, nomeFantasia: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CNPJ</label>
                  <input
                    type="text"
                    value={selectedTenant.cnpj}
                    onChange={(e) => setSelectedTenant({ ...selectedTenant, cnpj: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">E-mail Comercial</label>
                  <input
                    type="email"
                    value={selectedTenant.email}
                    onChange={(e) => setSelectedTenant({ ...selectedTenant, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Telefone</label>
                  <input
                    type="text"
                    value={selectedTenant.telefone || ''}
                    onChange={(e) => setSelectedTenant({ ...selectedTenant, telefone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Responsável</label>
                  <input
                    type="text"
                    value={selectedTenant.responsavel}
                    onChange={(e) => setSelectedTenant({ ...selectedTenant, responsavel: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Plano Atual</label>
                  <select
                    value={selectedTenant.planoId || ''}
                    onChange={(e) => setSelectedTenant({ ...selectedTenant, planoId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</label>
                  <select
                    value={selectedTenant.status}
                    onChange={(e) => setSelectedTenant({ ...selectedTenant, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  >
                    <option value="Trial">Trial</option>
                    <option value="Ativa">Ativa</option>
                    <option value="Suspensa">Suspensa</option>
                    <option value="Bloqueada">Bloqueada</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Limite Usuários</label>
                  <input
                    type="number"
                    value={selectedTenant.limiteUsuarios}
                    onChange={(e) => setSelectedTenant({ ...selectedTenant, limiteUsuarios: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Limite Veículos</label>
                  <input
                    type="number"
                    value={selectedTenant.limiteVeiculos}
                    onChange={(e) => setSelectedTenant({ ...selectedTenant, limiteVeiculos: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Limite Oficinas</label>
                  <input
                    type="number"
                    value={selectedTenant.limiteOficinas}
                    onChange={(e) => setSelectedTenant({ ...selectedTenant, limiteOficinas: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Limite OS</label>
                  <input
                    type="number"
                    value={selectedTenant.limiteOs}
                    onChange={(e) => setSelectedTenant({ ...selectedTenant, limiteOs: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Data de Expiração/Vencimento</label>
                  <input
                    type="date"
                    value={selectedTenant.dataVencimento ? selectedTenant.dataVencimento.split('T')[0] : ''}
                    onChange={(e) => setSelectedTenant({ ...selectedTenant, dataVencimento: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black rounded-xl text-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isResetOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-sm border border-slate-800 bg-slate-900 rounded-2xl shadow-2xl p-6">
            <button
              onClick={() => setIsResetOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-base font-black text-white uppercase tracking-wider mb-2">Resetar Senha do Admin</h3>
            <p className="text-[11px] text-slate-400 mb-4">
              Define uma nova senha provisória para o administrador master local da empresa <strong>{selectedTenant.razaoSocial}</strong>.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nova Senha Provisória</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetOpen(false)}
                  className="px-3.5 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black rounded-xl text-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Processando...' : 'Confirmar Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY MODAL (Auditoria logs) */}
      {isHistoryOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-xl border border-slate-800 bg-slate-900 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[80vh]">
            <button
              onClick={() => setIsHistoryOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-base font-black text-white uppercase tracking-wider mb-2">Histórico de Auditoria</h3>
            <p className="text-[11px] text-slate-400 mb-4">
              Histórico de ações administrativas realizadas sobre a empresa <strong>{selectedTenant.razaoSocial}</strong>.
            </p>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-800 pr-2 scrollbar-thin">
              {historyLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 font-semibold">
                  Sem logs de auditoria registrados para esta empresa.
                </div>
              ) : (
                historyLogs.map((log) => (
                  <div key={log.id} className="py-3 text-xs space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                      <span className="text-indigo-400 uppercase tracking-wider">{log.acao}</span>
                      <span className="font-mono text-slate-500">{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-slate-200 font-semibold">{log.detalhes}</p>
                    <div className="text-[10px] text-slate-500 font-medium">
                      Efetuado por: <span className="font-bold">{log.usuario}</span> | IP: {log.ip || '-'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
