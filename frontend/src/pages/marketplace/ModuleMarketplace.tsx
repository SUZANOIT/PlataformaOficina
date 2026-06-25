import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Wrench,
  Truck,
  DollarSign,
  Users,
  BarChart3,
  Building2,
  CheckCircle2,
  Lock,
  Zap,
  ArrowRight,
  Sparkles,
  Link2,
  Star,
  ShoppingCart,
  Package,
  ExternalLink,
} from 'lucide-react';

// ─── Module Registry ─────────────────────────────────────────────────────────

interface ModuleDef {
  chave: string;
  nome: string;
  descricao: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  planos: string[]; // quais planos incluem este módulo
  integracoes: string[]; // chaves dos módulos que integra
  recursos: string[];
  rota: string;
}

const MODULE_DEFS: ModuleDef[] = [
  {
    chave: 'oficina',
    nome: 'Gestão de Oficina',
    descricao: 'Orçamentos, ordens de serviço, aprovações e faturamento da oficina mecânica.',
    icon: <Wrench size={28} />,
    color: 'text-blue-500',
    gradient: 'from-blue-500/10 to-blue-600/5',
    planos: ['Starter', 'Professional', 'Business', 'Enterprise'],
    integracoes: ['financeiro', 'frotas', 'contabilidade', 'rh'],
    recursos: [
      'Orçamentos ilimitados',
      'Controle de status de OS',
      'Mecânicos vinculados',
      'Histórico de veículos',
      'Relatório de faturamento',
    ],
    rota: '/',
  },
  {
    chave: 'guincho',
    nome: 'Gestão de Guincho',
    descricao: 'Controle de atendimentos, frota de guinchos, motoristas e tabelas ANTT.',
    icon: <Truck size={28} />,
    color: 'text-amber-500',
    gradient: 'from-amber-500/10 to-amber-600/5',
    planos: ['Business', 'Enterprise'],
    integracoes: ['financeiro', 'frotas', 'oficina'],
    recursos: [
      'Orçamentos com ANTT',
      'Controle de frota',
      'Gestão de motoristas',
      'Tabelas de frete',
      'Guia de transporte',
    ],
    rota: '/towing/dashboard',
  },
  {
    chave: 'financeiro',
    nome: 'Gestão Financeira',
    descricao: 'Contas a pagar, contas a receber, fluxo de caixa e conciliação bancária.',
    icon: <DollarSign size={28} />,
    color: 'text-emerald-500',
    gradient: 'from-emerald-500/10 to-emerald-600/5',
    planos: ['Professional', 'Business', 'Enterprise'],
    integracoes: ['oficina', 'guincho', 'rh', 'contabilidade'],
    recursos: [
      'Contas a pagar e receber',
      'Fluxo de caixa',
      'Aprovações por alçada',
      'Relatórios financeiros',
      'Categorias personalizadas',
    ],
    rota: '/financial/dashboard',
  },
  {
    chave: 'rh',
    nome: 'Recursos Humanos',
    descricao: 'Gestão de colaboradores, controle de ausências e folha de descontos.',
    icon: <Users size={28} />,
    color: 'text-violet-500',
    gradient: 'from-violet-500/10 to-violet-600/5',
    planos: ['Business', 'Enterprise'],
    integracoes: ['financeiro', 'frotas', 'oficina'],
    recursos: [
      'Cadastro de colaboradores',
      'Controle de ausências',
      'Folha de descontos',
      'Adiantamentos salariais',
      'Vinculação com mecânicos',
    ],
    rota: '/collaborators',
  },
  {
    chave: 'frotas',
    nome: 'Gestão de Frotas',
    descricao: 'Controle de veículos, manutenção preventiva e gestão da frota completa.',
    icon: <Building2 size={28} />,
    color: 'text-indigo-500',
    gradient: 'from-indigo-500/10 to-indigo-600/5',
    planos: ['Professional', 'Business', 'Enterprise'],
    integracoes: ['oficina', 'financeiro', 'rh', 'guincho'],
    recursos: [
      'Cadastro de veículos',
      'Manutenção preventiva',
      'Histórico de eventos',
      'Troca de óleo e câmbio',
      'Gestão de oficinas',
    ],
    rota: '/fleet/dashboard',
  },
  {
    chave: 'contabilidade',
    nome: 'Contabilidade',
    descricao: 'Importação de NF-e, portal do contador, tributação e documentos fiscais.',
    icon: <BarChart3 size={28} />,
    color: 'text-rose-500',
    gradient: 'from-rose-500/10 to-rose-600/5',
    planos: ['Business', 'Enterprise'],
    integracoes: ['financeiro', 'oficina'],
    recursos: [
      'Importação de NF-e',
      'Portal do contador externo',
      'Tributação e alíquotas',
      'Documentos fiscais',
      'Exportação XML',
    ],
    rota: '/accounting/xml-export',
  },
];

// Integration labels for display
const MODULE_NAMES: Record<string, string> = {
  oficina: 'Oficina',
  guincho: 'Guincho',
  financeiro: 'Financeiro',
  rh: 'RH',
  frotas: 'Frotas',
  contabilidade: 'Contabilidade',
};

export function ModuleMarketplace() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [plano, setPlano] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [filter, setFilter] = useState<'todos' | 'ativos' | 'disponiveis'>('todos');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          setActiveModules(data.company?.activeModules || []);
          setPlano(data.company?.plano || '');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const isModuleActive = (chave: string) => activeModules.includes(chave);
  const isModuleInPlan = (mod: ModuleDef) => mod.planos.includes(plano);

  const handleActivateRequest = async (chave: string) => {
    setRequesting(chave);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/modules/request-activation', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleKey: chave }),
      });
      if (res.ok) {
        toast.success('Solicitação enviada! Nossa equipe entrará em contato em breve.', { duration: 5000 });
      } else {
        toast.error('Erro ao enviar solicitação. Tente novamente.');
      }
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setRequesting(null);
    }
  };

  const filteredModules = MODULE_DEFS.filter((m) => {
    if (filter === 'ativos') return isModuleActive(m.chave);
    if (filter === 'disponiveis') return !isModuleActive(m.chave) && isModuleInPlan(m);
    return true;
  });

  const activeCount = MODULE_DEFS.filter((m) => isModuleActive(m.chave)).length;
  const availableCount = MODULE_DEFS.filter((m) => !isModuleActive(m.chave) && isModuleInPlan(m)).length;
  const integrationCount = MODULE_DEFS.filter((m) => isModuleActive(m.chave))
    .flatMap((m) => m.integracoes.filter((i) => isModuleActive(i)))
    .filter((v, i, a) => a.indexOf(v) === i).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* ── Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-border rounded-2xl p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Package size={20} className="text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Central de Serviços</span>
            </div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
              Módulos da Plataforma
            </h1>
            <p className="text-muted-foreground mt-2 max-w-lg">
              Gerencie os módulos contratados. Cada módulo funciona de forma independente e se integra automaticamente aos demais quando ativado.
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            <div className="bg-card border border-border rounded-xl px-4 py-2 text-sm">
              <span className="text-muted-foreground">Plano atual: </span>
              <span className="font-bold text-primary">{plano || 'Não definido'}</span>
            </div>
            <button
              onClick={() => navigate('/settings/my-plan')}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <ExternalLink size={13} /> Ver detalhes do plano
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="relative z-10 grid grid-cols-3 gap-4 mt-6">
          <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-extrabold text-emerald-500">{activeCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5 font-medium">Módulos Ativos</div>
          </div>
          <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-extrabold text-blue-500">{availableCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5 font-medium">Disponíveis no Plano</div>
          </div>
          <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-extrabold text-violet-500">{integrationCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5 font-medium">Integrações Ativas</div>
          </div>
        </div>
      </div>

      {/* ── Integrações Ativas Banner ── */}
      {activeCount >= 2 && (
        <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-5 flex items-start gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 shrink-0">
            <Zap size={22} />
          </div>
          <div>
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <span>Integrações automáticas ativas</span>
              <span className="text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                {activeCount} módulos
              </span>
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Com múltiplos módulos ativos, os dados fluem automaticamente entre eles.
              Ao aprovar um orçamento, o financeiro é atualizado. Ao finalizar um atendimento de guincho, o histórico do veículo é registrado.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {MODULE_DEFS.filter((m) => isModuleActive(m.chave)).map((m) => (
                <button
                  key={m.chave}
                  onClick={() => navigate(m.rota)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/40 transition ${m.color}`}
                >
                  {m.icon && <span className="scale-75">{m.icon}</span>}
                  {m.nome}
                  <ArrowRight size={12} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['todos', 'ativos', 'disponiveis'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
              filter === f
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
            }`}
          >
            {f === 'todos' && 'Todos os Módulos'}
            {f === 'ativos' && `Ativos (${activeCount})`}
            {f === 'disponiveis' && `Disponíveis no Plano (${availableCount})`}
          </button>
        ))}
      </div>

      {/* ── Module Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredModules.map((mod) => {
          const active = isModuleActive(mod.chave);
          const inPlan = isModuleInPlan(mod);
          const isRequesting = requesting === mod.chave;

          return (
            <div
              key={mod.chave}
              className={`relative bg-card border rounded-2xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md group ${
                active ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border'
              }`}
            >
              {/* Top gradient strip */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${mod.gradient} opacity-80`} />

              {/* Active badge */}
              {active && (
                <div className="absolute top-4 right-4 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded-full">
                  <CheckCircle2 size={11} />
                  ATIVO
                </div>
              )}
              {!active && !inPlan && (
                <div className="absolute top-4 right-4 flex items-center gap-1 bg-muted text-muted-foreground text-[10px] font-bold px-2 py-1 rounded-full border border-border">
                  <Lock size={11} />
                  UPGRADE
                </div>
              )}
              {!active && inPlan && (
                <div className="absolute top-4 right-4 flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-full">
                  <Star size={11} />
                  DISPONÍVEL
                </div>
              )}

              <div className="p-6 space-y-4">
                {/* Icon + Name */}
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${mod.gradient} ${mod.color} shrink-0`}>
                    {mod.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base">{mod.nome}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{mod.descricao}</p>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-1.5">
                  {mod.recursos.map((rec) => (
                    <li key={rec} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 size={12} className={active ? 'text-emerald-500' : 'text-muted-foreground/50'} />
                      {rec}
                    </li>
                  ))}
                </ul>

                {/* Integrations */}
                {mod.integracoes.length > 0 && (
                  <div className="border-t border-border pt-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Link2 size={12} className="text-muted-foreground" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Integra com
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {mod.integracoes.map((intKey) => {
                        const integrationActive = isModuleActive(intKey);
                        return (
                          <span
                            key={intKey}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              integrationActive
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                                : 'bg-muted border-border text-muted-foreground'
                            }`}
                          >
                            {integrationActive && '✓ '}
                            {MODULE_NAMES[intKey] || intKey}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div className="pt-2">
                  {active ? (
                    <button
                      onClick={() => navigate(mod.rota)}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition`}
                    >
                      Acessar módulo
                      <ArrowRight size={15} />
                    </button>
                  ) : inPlan ? (
                    <button
                      onClick={() => handleActivateRequest(mod.chave)}
                      disabled={isRequesting}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 border-primary text-primary hover:bg-primary/5 transition disabled:opacity-60"
                    >
                      {isRequesting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-primary" />
                      ) : (
                        <>
                          <ShoppingCart size={15} />
                          Solicitar ativação
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/settings/my-plan')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-muted text-muted-foreground hover:bg-muted/80 transition border border-border"
                    >
                      <Sparkles size={15} />
                      Fazer upgrade do plano
                    </button>
                  )}
                </div>
              </div>

              {/* Planos disponíveis */}
              <div className="px-6 pb-5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground font-medium">Planos:</span>
                  {mod.planos.map((p) => (
                    <span
                      key={p}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                        p === plano
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-muted border-border text-muted-foreground'
                      }`}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredModules.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Nenhum módulo encontrado para este filtro.</p>
        </div>
      )}
    </div>
  );
}
