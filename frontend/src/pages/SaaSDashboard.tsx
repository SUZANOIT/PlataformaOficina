import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Activity, 
  Search, 
  X, 
  Check, 
  Plus, 
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { useBreadcrumbs } from '../context/BreadcrumbContext';

interface Plan {
  id: string;
  nome: string;
  limiteUsuarios: number;
  limiteOsMes: number;
  preco: number;
}

interface Module {
  id: string;
  nome: string;
  chave: string;
  descricao: string;
}

interface Company {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  statusAssinatura: string;
  dataContratacao: string;
  dataVencimento: string;
  plan: Plan | null;
  moduleLicenses: Array<{
    id: string;
    moduleId: string;
    moduleName: string;
    moduleKey: string;
    ativa: boolean;
  }>;
  usersCount: number;
  activeUsersCount: number;
  osCountThisMonth: number;
}

interface Stats {
  totalCompanies: number;
  activeCompanies: number;
  totalActiveUsers: number;
  mrr: number;
  arr: number;
  churnRate: number;
  activeLicenses: number;
  planDistribution: Array<{
    planId: string;
    planName: string;
    companyCount: number;
    mrrContribution: number;
  }>;
}

export function SaaSDashboard() {
  useBreadcrumbs([{ label: 'Painel SaaS' }]);

  const [stats, setStats] = useState<Stats | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isModulesModalOpen, setIsModulesModalOpen] = useState(false);

  // Edit fields
  const [editPlanId, setEditPlanId] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editVencimento, setEditVencimento] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/saas/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading SaaS stats', error);
      toast.error('Erro ao carregar métricas do SaaS');
    }
  };

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/saas/companies', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error('Error loading companies list', error);
      toast.error('Erro ao carregar lista de empresas');
    }
  };

  const fetchPlansAndModules = async () => {
    try {
      const token = localStorage.getItem('token');
      const [plansRes, modulesRes] = await Promise.all([
        fetch('/saas/plans', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/saas/modules', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (plansRes.ok) setPlans(await plansRes.json());
      if (modulesRes.ok) setModules(await modulesRes.json());
    } catch (error) {
      console.error('Error loading plans or modules', error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([fetchStats(), fetchCompanies(), fetchPlansAndModules()]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenSubscription = (company: Company) => {
    setSelectedCompany(company);
    setEditPlanId(company.plan?.id || '');
    setEditStatus(company.statusAssinatura || 'Trial');
    setEditVencimento(company.dataVencimento ? company.dataVencimento.split('T')[0] : '');
    setIsSubscriptionModalOpen(true);
  };

  const handleOpenModules = (company: Company) => {
    setSelectedCompany(company);
    setIsModulesModalOpen(true);
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/saas/subscriptions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyId: selectedCompany.id,
          planId: editPlanId,
          statusAssinatura: editStatus,
          dataVencimento: new Date(editVencimento).toISOString()
        })
      });

      if (response.ok) {
        toast.success('Assinatura atualizada com sucesso!');
        setIsSubscriptionModalOpen(false);
        loadData();
      } else {
        const err = await response.json();
        toast.error(err.error || 'Erro ao atualizar assinatura');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro de conexão ao salvar assinatura');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleModule = async (moduleId: string) => {
    if (!selectedCompany) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/saas/licenses/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyId: selectedCompany.id,
          moduleId
        })
      });

      if (response.ok) {
        const resData = await response.json();
        toast.success(resData.message);
        
        // Update local company modules state to avoid reloading full list instantly
        setCompanies(prev => prev.map(c => {
          if (c.id !== selectedCompany.id) return c;
          
          let updatedLicenses = [...c.moduleLicenses];
          const index = updatedLicenses.findIndex(ml => ml.moduleId === moduleId);
          
          if (index !== -1) {
            updatedLicenses[index] = {
              ...updatedLicenses[index],
              ativa: resData.ativa
            };
          } else {
            const m = modules.find(mod => mod.id === moduleId);
            if (m) {
              updatedLicenses.push({
                id: Math.random().toString(),
                moduleId,
                moduleName: m.nome,
                moduleKey: m.chave,
                ativa: true
              });
            }
          }
          
          const updatedCompany = { ...c, moduleLicenses: updatedLicenses };
          setSelectedCompany(updatedCompany);
          return updatedCompany;
        }));

        fetchStats();
      } else {
        toast.error('Erro ao alterar licença do módulo');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro de conexão com o servidor');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const filteredCompanies = companies.filter(c => {
    const term = search.toLowerCase();
    const matchesSearch = 
      c.razaoSocial.toLowerCase().includes(term) ||
      (c.nomeFantasia?.toLowerCase() || '').includes(term) ||
      c.cnpj.replace(/\D/g, '').includes(term);

    const matchesStatus = statusFilter === 'all' || c.statusAssinatura === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading && !stats) {
    return (
      <div className="flex h-64 flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground">Carregando métricas do SaaS...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SaaS Administração</h1>
          <p className="text-sm text-muted-foreground">Visão geral da plataforma, faturamento de assinaturas e controle de licenças.</p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
              <Building size={24} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Empresas Ativas</p>
              <h3 className="text-2xl font-bold text-foreground">{stats.activeCompanies} / {stats.totalCompanies}</h3>
            </div>
          </div>

          <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">MRR (Faturamento Mensal)</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.mrr)}</h3>
            </div>
          </div>

          <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">ARR (Faturamento Anual)</p>
              <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(stats.arr)}</h3>
            </div>
          </div>

          <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center">
              <TrendingDown size={24} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Taxa de Churn (30 dias)</p>
              <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.churnRate.toFixed(2)}%</h3>
            </div>
          </div>
        </div>
      )}

      {/* Main Panel Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Plan Distribution */}
        {stats && (
          <div className="lg:col-span-1 bg-card border border-border rounded-xl shadow-sm p-6 space-y-4">
            <div className="border-b border-border pb-3 flex items-center gap-2">
              <Activity size={18} className="text-primary" />
              <h2 className="text-base font-semibold">Distribuição de Planos</h2>
            </div>
            
            <div className="space-y-3">
              {stats.planDistribution.map(p => (
                <div key={p.planId} className="bg-muted/30 border border-border/60 p-3 rounded-lg flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-foreground">{p.planName}</span>
                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {p.companyCount} {p.companyCount === 1 ? 'empresa' : 'empresas'}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex justify-between items-center mt-1">
                    <span>MRR Contribuído:</span>
                    <strong className="text-foreground">{formatCurrency(p.mrrContribution)}</strong>
                  </div>
                </div>
              ))}
              {stats.planDistribution.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum plano ativo cadastrado.</p>
              )}
            </div>
          </div>
        )}

        {/* Right Side: Companies Grid List */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-base font-semibold">Empresas Cadastradas</h2>
                
                <div className="flex flex-wrap items-center gap-3">
                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary transition"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="Ativa">Ativas</option>
                    <option value="Trial">Trial</option>
                    <option value="Bloqueada">Bloqueadas</option>
                    <option value="Cancelada">Canceladas</option>
                  </select>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 text-muted-foreground" size={14} />
                    <input 
                      type="text" 
                      placeholder="Buscar empresa ou CNPJ..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-primary transition w-60"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border text-muted-foreground text-xs font-semibold">
                    <th className="p-4">Razão Social / CNPJ</th>
                    <th className="p-4">Plano</th>
                    <th className="p-4">Limites (Usuários / OS)</th>
                    <th className="p-4">Assinatura</th>
                    <th className="p-4">Módulos Ativos</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredCompanies.map(c => {
                    const userPct = c.plan ? (c.activeUsersCount / c.plan.limiteUsuarios) * 100 : 0;
                    const osPct = c.plan ? (c.osCountThisMonth / c.plan.limiteOsMes) * 100 : 0;
                    
                    return (
                      <tr key={c.id} className="hover:bg-muted/10 transition-colors text-xs">
                        <td className="p-4">
                          <div className="font-semibold text-foreground">{c.razaoSocial}</div>
                          {c.nomeFantasia && <div className="text-[10px] text-slate-400 mt-0.5">{c.nomeFantasia}</div>}
                          <div className="text-[10px] text-muted-foreground font-mono mt-1">{c.cnpj}</div>
                        </td>
                        <td className="p-4 font-semibold text-foreground">
                          {c.plan?.nome || <span className="text-red-500 font-bold">Sem Plano</span>}
                          {c.plan && <div className="text-[10px] text-emerald-600 font-bold mt-0.5">{formatCurrency(c.plan.preco)}/mês</div>}
                        </td>
                        <td className="p-4 space-y-2 max-w-[180px]">
                          {c.plan ? (
                            <>
                              <div>
                                <div className="flex justify-between text-[10px] mb-0.5">
                                  <span>Usuários Ativos:</span>
                                  <strong>{c.activeUsersCount} / {c.plan.limiteUsuarios}</strong>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    style={{ width: `${Math.min(userPct, 100)}%` }} 
                                    className={`h-full rounded-full ${userPct >= 90 ? 'bg-rose-500' : userPct >= 75 ? 'bg-amber-500' : 'bg-primary'}`}
                                  />
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-[10px] mb-0.5">
                                  <span>OS este Mês:</span>
                                  <strong>{c.osCountThisMonth} / {c.plan.limiteOsMes}</strong>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    style={{ width: `${Math.min(osPct, 100)}%` }} 
                                    className={`h-full rounded-full ${osPct >= 90 ? 'bg-rose-500' : osPct >= 75 ? 'bg-amber-500' : 'bg-primary'}`}
                                  />
                                </div>
                              </div>
                            </>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">N/A</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            c.statusAssinatura === 'Ativa' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                            c.statusAssinatura === 'Trial' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                            c.statusAssinatura === 'Bloqueada' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                            'bg-slate-500/10 text-slate-600 border-slate-500/20'
                          }`}>
                            {c.statusAssinatura}
                          </span>
                          {c.dataVencimento && (
                            <div className="text-[10px] text-muted-foreground mt-1.5 font-medium">
                              Vence: {new Date(c.dataVencimento).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {c.moduleLicenses.filter(l => l.ativa).map(l => (
                              <span key={l.id} className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase">
                                {l.moduleKey}
                              </span>
                            ))}
                            {c.moduleLicenses.filter(l => l.ativa).length === 0 && (
                              <span className="text-[10px] text-muted-foreground italic">Nenhum</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1.5 justify-center">
                            <button
                              onClick={() => handleOpenSubscription(c)}
                              className="p-1.5 bg-primary/10 text-primary hover:bg-primary/25 rounded-md transition active:scale-95 duration-100 flex items-center gap-1"
                              title="Alterar Plano"
                            >
                              <CreditCard size={14} />
                              <span>Faturamento</span>
                            </button>
                            <button
                              onClick={() => handleOpenModules(c)}
                              className="p-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500/25 rounded-md transition active:scale-95 duration-100 flex items-center gap-1"
                              title="Gerenciar Módulos"
                            >
                              <Zap size={14} />
                              <span>Módulos</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredCompanies.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        Nenhuma empresa cadastrada ou compatível com os filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Edit Modal */}
      {isSubscriptionModalOpen && selectedCompany && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 relative flex flex-col">
            <button 
              onClick={() => setIsSubscriptionModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/50 transition z-50"
            >
              <X size={18} />
            </button>
            
            <div className="p-6 border-b border-border">
              <h3 className="text-base font-bold text-foreground">Gerenciar Faturamento: {selectedCompany.razaoSocial}</h3>
              <p className="text-xs text-muted-foreground mt-1">Configure o plano ativo, vencimento e o status de acesso para esta empresa.</p>
            </div>

            <form onSubmit={handleSaveSubscription}>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Plano Contratado</label>
                  <select
                    value={editPlanId}
                    onChange={(e) => setEditPlanId(e.target.value)}
                    required
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary transition"
                  >
                    <option value="" disabled>Selecione um plano...</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({formatCurrency(p.preco)}/mês - {p.limiteUsuarios} Usuários / {p.limiteOsMes} OS)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Status da Assinatura</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    required
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary transition"
                  >
                    <option value="Ativa">Ativa (Acesso Total)</option>
                    <option value="Trial">Trial (Período de Experiência)</option>
                    <option value="Bloqueada">Bloqueada (Inadimplência / Acesso Suspenso)</option>
                    <option value="Cancelada">Cancelada (Contrato Finalizado)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Data de Vencimento</label>
                  <input
                    type="date"
                    value={editVencimento}
                    onChange={(e) => setEditVencimento(e.target.value)}
                    required
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary transition"
                  />
                </div>
              </div>

              <div className="p-6 bg-muted/20 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSubscriptionModalOpen(false)}
                  className="px-4 py-2 bg-secondary text-foreground hover:bg-secondary/80 border border-border rounded-lg text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modules Management Modal */}
      {isModulesModalOpen && selectedCompany && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 relative flex flex-col">
            <button 
              onClick={() => setIsModulesModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/50 transition z-50"
            >
              <X size={18} />
            </button>
            
            <div className="p-6 border-b border-border">
              <h3 className="text-base font-bold text-foreground">Gerenciar Módulos: {selectedCompany.razaoSocial}</h3>
              <p className="text-xs text-muted-foreground mt-1">Habilite ou desabilite recursos opcionais licenciados para esta empresa.</p>
            </div>

            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {modules.map(m => {
                const license = selectedCompany.moduleLicenses.find(l => l.moduleId === m.id);
                const isActive = license ? license.ativa : false;
                
                return (
                  <div 
                    key={m.id} 
                    className={`p-3 border rounded-xl flex items-center justify-between gap-4 transition ${
                      isActive 
                        ? 'border-blue-500/30 bg-blue-500/5' 
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground">{m.nome}</span>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-400 font-mono text-[9px] px-1 rounded uppercase">
                          {m.chave}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-normal">{m.descricao || 'Sem descrição cadastrada.'}</p>
                    </div>

                    <button
                      onClick={() => handleToggleModule(m.id)}
                      className={`flex items-center justify-center p-2 rounded-lg transition active:scale-95 duration-100 ${
                        isActive
                          ? 'bg-blue-600 text-white hover:bg-blue-500'
                          : 'bg-secondary text-muted-foreground hover:bg-secondary/80 border border-border'
                      }`}
                      title={isActive ? 'Desativar Módulo' : 'Ativar Módulo'}
                    >
                      {isActive ? <Check size={16} /> : <Plus size={16} />}
                    </button>
                  </div>
                );
              })}
              {modules.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum módulo disponível no sistema.</p>
              )}
            </div>

            <div className="p-6 bg-muted/20 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setIsModulesModalOpen(false)}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-semibold transition"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
