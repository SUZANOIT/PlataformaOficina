import { useEffect, useState } from 'react';
import { 
  Shield, 
  Users, 
  FileText, 
  HardDrive, 
  Calendar, 
  CheckCircle, 
  CreditCard,
  ArrowUpRight
} from 'lucide-react';
import { useBreadcrumbs } from '../context/BreadcrumbContext';
import { toast } from 'sonner';

interface PlanDetails {
  nome: string;
  limiteUsuarios: number;
  limiteOsMes: number;
  preco: number;
}

interface CompanyInfo {
  id: string;
  nome: string;
  cnpj: string;
  email: string | null;
  telefone: string | null;
  plano: string;
  statusAssinatura: string;
  dataVencimento: string | null;
  activeModules: string[];
  planDetails: PlanDetails | null;
  activeUsersCount: number;
  osCountThisMonth: number;
}

export function MyPlan() {
  useBreadcrumbs([{ label: 'Configurações', path: '#' }, { label: 'Meu Plano' }]);
  
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch('/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.company) {
          setCompany(data.company);
        }
      } else {
        toast.error('Erro ao carregar dados do plano.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro de conexão ao carregar plano.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground">Carregando dados da assinatura...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-sm">Nenhuma empresa associada a esta conta.</p>
      </div>
    );
  }

  const isMaster = company.id === 'mca-padrao-company-uuid-000000000001';
  
  const userPct = company.planDetails ? (company.activeUsersCount / company.planDetails.limiteUsuarios) * 100 : 0;
  const osPct = company.planDetails ? (company.osCountThisMonth / company.planDetails.limiteOsMes) * 100 : 0;

  // Full module name mapping for display
  const moduleNameMap: Record<string, string> = {
    clientes: 'Clientes e Contatos',
    veiculos: 'Controle de Veículos',
    plataformas: 'Plataformas de OS',
    ordens_servico: 'Ordens de Serviço',
    orcamentos: 'Gestão de Orçamentos',
    dashboard_basico: 'Dashboard Operacional',
    contas_receber: 'Contas a Receber',
    contas_pagar: 'Contas a Pagar',
    fluxo_caixa: 'Fluxo de Caixa',
    estoque: 'Controle de Estoque',
    fornecedores: 'Gestão de Fornecedores',
    xml: 'Leitura de XML',
    documentos: 'Central de Documentos',
    emissao_fiscal: 'Emissão de Notas Fiscais',
    rede_credenciada: 'Rede Credenciada',
    rh: 'Gestão de Colaboradores (RH)',
    adiantamentos: 'Adiantamento Salarial',
    aprovacao_niveis: 'Aprovação por Alçada',
    auditoria: 'Trilha de Auditoria',
    multiempresa: 'Suporte Multiempresa',
    api: 'Integrações via API',
    bi: 'Business Intelligence',
    integracoes: 'Módulo de Integrações',
    whatsapp: 'Disparo via WhatsApp',
    receitaws: 'Consulta CNPJ ReceitaWS',
    fipe: 'Tabela FIPE Integrada'
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meu Plano</h1>
        <p className="text-sm text-muted-foreground">Monitore o consumo dos recursos contratados e detalhes do faturamento da sua assinatura.</p>
      </div>

      {/* Subscription Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gradient-to-r from-primary/90 to-primary text-primary-foreground p-6 rounded-2xl shadow-md space-y-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Plano {isMaster ? 'Master Platform Owner' : company.plano}
              </span>
              <h2 className="text-2xl font-bold mt-2">{company.nome}</h2>
              <p className="text-xs text-white/80 font-mono mt-1">CNPJ: {company.cnpj}</p>
            </div>
            
            <div className="text-right">
              <span className="text-xs text-white/70 block">Valor Mensal</span>
              <span className="text-3xl font-extrabold">
                {isMaster ? 'Grátis' : company.planDetails ? formatCurrency(company.planDetails.preco) : 'R$ 0,00'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4 text-xs">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-white/80" />
              <div>
                <span className="text-white/60 block">Status da Assinatura</span>
                <span className="font-bold uppercase tracking-wide">
                  {isMaster ? 'ATIVA (ILIMITADA)' : company.statusAssinatura}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-white/80" />
              <div>
                <span className="text-white/60 block">Próximo Vencimento</span>
                <span className="font-bold">
                  {isMaster ? 'Sem Vencimento' : company.dataVencimento ? new Date(company.dataVencimento).toLocaleDateString('pt-BR') : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade / Contact Support Card */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <h3 className="text-sm font-bold text-foreground">Precisa de mais recursos?</h3>
            <p className="text-xs text-muted-foreground leading-normal">
              Faça um upgrade no seu plano para liberar mais usuários, maior volume de ordens de serviço e módulos adicionais de inteligência e automação.
            </p>
          </div>

          <a 
            href="https://wa.me/5511999999999" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full py-2 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 duration-100 shadow-xs"
          >
            <span>Solicitar Upgrade</span>
            <ArrowUpRight size={14} />
          </a>
        </div>
      </div>

      {/* Usage Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Users Usage */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-primary" />
              <span className="text-xs font-bold text-foreground">Usuários Ativos</span>
            </div>
            <span className="text-xs font-mono font-bold text-foreground">
              {company.activeUsersCount} / {isMaster ? '∞' : company.planDetails?.limiteUsuarios || 2}
            </span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              style={{ width: `${isMaster ? 10 : Math.min(userPct, 100)}%` }} 
              className={`h-full rounded-full transition-all duration-300 ${
                userPct >= 90 && !isMaster ? 'bg-rose-500' : userPct >= 75 && !isMaster ? 'bg-amber-500' : 'bg-primary'
              }`}
            />
          </div>

          <p className="text-[10px] text-muted-foreground leading-normal">
            {isMaster 
              ? 'Licença Enterprise Master com limite ilimitado de usuários.'
              : `Você está utilizando ${(userPct).toFixed(0)}% do limite contratado do seu plano.`}
          </p>
        </div>

        {/* OS Usage */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              <span className="text-xs font-bold text-foreground">OS Criadas no Mês</span>
            </div>
            <span className="text-xs font-mono font-bold text-foreground">
              {company.osCountThisMonth} / {isMaster ? '∞' : company.planDetails?.limiteOsMes || 200}
            </span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              style={{ width: `${isMaster ? 5 : Math.min(osPct, 100)}%` }} 
              className={`h-full rounded-full transition-all duration-300 ${
                osPct >= 90 && !isMaster ? 'bg-rose-500' : osPct >= 75 && !isMaster ? 'bg-amber-500' : 'bg-primary'
              }`}
            />
          </div>

          <p className="text-[10px] text-muted-foreground leading-normal">
            {isMaster
              ? 'Criação de ordens de serviço ilimitada ativa.'
              : `Renova automaticamente no primeiro dia do próximo mês.`}
          </p>
        </div>

        {/* Storage Usage (Mocked / Optional feature) */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <HardDrive size={16} className="text-primary" />
              <span className="text-xs font-bold text-foreground">Armazenamento</span>
            </div>
            <span className="text-xs font-mono font-bold text-foreground">
              {isMaster ? '154 MB / ∞' : '154 MB / 5 GB'}
            </span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              style={{ width: isMaster ? '2%' : '3%' }} 
              className="h-full rounded-full bg-primary"
            />
          </div>

          <p className="text-[10px] text-muted-foreground leading-normal">
            Utilizado para guardar orçamentos em PDF, fotos de veículos e documentos fiscais.
          </p>
        </div>
      </div>

      {/* Modules Licensed */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">Recursos e Módulos Habilitados</h3>
          <p className="text-xs text-muted-foreground">Veja a lista de módulos licenciados para uso no seu painel operacional.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {company.activeModules.map(moduleKey => (
            <div 
              key={moduleKey} 
              className="p-3 border border-border/80 bg-muted/20 hover:bg-muted/40 transition rounded-xl flex items-center gap-2"
            >
              <CheckCircle size={16} className="text-emerald-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-semibold text-foreground block truncate">
                  {moduleNameMap[moduleKey] || moduleKey}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground uppercase">{moduleKey}</span>
              </div>
            </div>
          ))}
          {company.activeModules.length === 0 && (
            <p className="text-xs text-muted-foreground italic col-span-full">Nenhum módulo ativo.</p>
          )}
        </div>
      </div>
    </div>
  );
}
