import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { GlobalBreadcrumbs } from './GlobalBreadcrumbs';
import { 
  LayoutDashboard, 
  FileText, 
  LogOut, 
  Mail, 
  Users, 
  Menu, 
  X, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CheckSquare, 
  BarChart3,
  Wrench,
  Settings,
  Building,
  Truck,
  Calendar,
  UserCheck,
  Tag,
  CreditCard,
  Package,
  Percent,
  ArrowLeftRight
} from 'lucide-react';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOficinaOpen, setIsOficinaOpen] = useState(true);
  const [isFinancialOpen, setIsFinancialOpen] = useState(true);
  const [isContabilidadeOpen, setIsContabilidadeOpen] = useState(true);
  const [isFleetOpen, setIsFleetOpen] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isRhOpen, setIsRhOpen] = useState(true);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch('/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else if (response.status === 401 || response.status === 403 || response.status === 404) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário logado', error);
      }
    };
    
    fetchMe();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const hasSaaSToken = !!localStorage.getItem('saas_token');

  const handleReturnToSaaS = () => {
    localStorage.removeItem('token');
    navigate('/administracao/empresas');
  };

  const hasModule = (moduleKey: string) => {
    if (!user) return true;
    if (user.companyId === 'mca-padrao-company-uuid-000000000001') return true;
    if (user.activeModules) {
      return user.activeModules.includes(moduleKey);
    }
    return true;
  };

  const isContabilidadeOnly = !!user?.roleContabilidade
    && !user?.roleAdmin
    && !user?.roleOrcamentista
    && !user?.roleContasPagar
    && !user?.roleContasReceber
    && !user?.roleRh
    && !user?.roleColaborador;

  // Usuários cujo único nível de acesso é Orçamentista só podem acessar Orçamentos
  const isOrcamentistaOnly = !!user?.roleOrcamentista
    && !user?.roleAdmin
    && !user?.roleContabilidade
    && !user?.roleContasPagar
    && !user?.roleContasReceber
    && !user?.roleRh
    && !user?.roleColaborador;

  useEffect(() => {
    if (isContabilidadeOnly && location.pathname !== '/accounting/xml-export') {
      navigate('/accounting/xml-export', { replace: true });
    }
    
    if (isOrcamentistaOnly) {
      const isAllowed = location.pathname.startsWith('/quotes');
      if (!isAllowed) {
        navigate('/quotes', { replace: true });
      }
    }
  }, [isContabilidadeOnly, isOrcamentistaOnly, location.pathname, navigate]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar (Drawer) */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <h1 className="text-xl font-bold text-primary">Gestão da Oficina</h1>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-3 overflow-y-auto">
          {/* Categoria 1: Gestão da Oficina */}
          {!isContabilidadeOnly && (
          <div>
            <button 
              onClick={() => setIsOficinaOpen(!isOficinaOpen)}
              className="flex items-center justify-between px-3 py-2 w-full text-left rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-3">
                <Wrench size={20} className="text-primary" />
                <span className="font-semibold text-foreground text-sm">Gestão da Oficina</span>
              </div>
              <span className="text-[10px] transition-transform duration-200" style={{ transform: isOficinaOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
            </button>
            
            {isOficinaOpen && (
              <div className="pl-4 mt-1 space-y-1 border-l border-border/40 ml-5 animate-in slide-in-from-top-1 duration-150">
                {!isOrcamentistaOnly && (
                  <Link 
                    to="/" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <LayoutDashboard size={16} className="text-muted-foreground" />
                    <span>Painel Geral</span>
                  </Link>
                )}
                <Link 
                  to="/quotes/new" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                >
                  <FileText size={16} className="text-muted-foreground" />
                  <span>Novo Orçamento</span>
                </Link>
                <Link 
                  to="/quotes" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                >
                  <FileText size={16} className="text-muted-foreground" />
                  <span>Orçamentos</span>
                </Link>
                {!isOrcamentistaOnly && hasModule('clientes') && (
                  <Link 
                    to="/clients" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <Users size={16} className="text-muted-foreground" />
                    <span>Clientes</span>
                  </Link>
                )}
                {!isOrcamentistaOnly && hasModule('fornecedores') && (
                  <Link 
                    to="/suppliers" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <Building size={16} className="text-muted-foreground" />
                    <span>Fornecedores</span>
                  </Link>
                )}
                {!isOrcamentistaOnly && hasModule('clientes') && (
                  <Link 
                    to="/platforms" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <Building size={16} className="text-muted-foreground" />
                    <span>Plataformas de Gestão</span>
                  </Link>
                )}
                {!isOrcamentistaOnly && hasModule('fiscal') && (
                  <Link 
                    to="/products" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <Package size={16} className="text-muted-foreground" />
                    <span>Produtos</span>
                  </Link>
                )}
              </div>
            )}
          </div>
          )}
                   {/* Categoria 2: Gestão Financeira */}
          {!isContabilidadeOnly && !isOrcamentistaOnly && hasModule('financeiro') && (
            <div className="pt-2 border-t border-border/40">
              <button 
                onClick={() => setIsFinancialOpen(!isFinancialOpen)}
                className="flex items-center justify-between px-3 py-2 w-full text-left rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-3">
                  <DollarSign size={20} className="text-primary" />
                  <span className="font-semibold text-foreground text-sm">Gestão Financeira</span>
                </div>
                <span className="text-[10px] transition-transform duration-200" style={{ transform: isFinancialOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
              </button>
              
              {isFinancialOpen && (
                <div className="pl-4 mt-1 space-y-1 border-l border-border/40 ml-5 animate-in slide-in-from-top-1 duration-150">
                  <Link 
                    to="/financial/dashboard" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <LayoutDashboard size={16} className="text-muted-foreground" />
                    <span>Painel Geral</span>
                  </Link>
                  <Link 
                    to="/financial/payables" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <TrendingDown size={16} className="text-red-500" />
                    <span>Contas a Pagar</span>
                  </Link>
                  <Link 
                    to="/financial/receivables" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <TrendingUp size={16} className="text-emerald-500" />
                    <span>Contas a Receber</span>
                  </Link>
                  <Link 
                    to="/financial/approvals" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <CheckSquare size={16} className="text-amber-500" />
                    <span>Aprovações</span>
                  </Link>
                  <Link 
                    to="/financial/reports" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <BarChart3 size={16} className="text-blue-500" />
                    <span>Relatórios</span>
                  </Link>
                  <Link 
                    to="/financial/categories" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <Tag size={16} className="text-violet-500" />
                    <span>Categorias</span>
                  </Link>
                  {user?.roleAdmin && (
                    <Link 
                      to="/financial/fiscal-documents" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                    >
                      <FileText size={16} className="text-blue-500" />
                      <span>Central de Documentos Fiscais</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Categoria 2.5: Contabilidade */}
          {!isOrcamentistaOnly && user?.roleContabilidade && hasModule('fiscal') && (
            <div className="pt-2 border-t border-border/40">
              <button 
                onClick={() => setIsContabilidadeOpen(!isContabilidadeOpen)}
                className="flex items-center justify-between px-3 py-2 w-full text-left rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-primary" />
                  <span className="font-semibold text-foreground text-sm">Contabilidade</span>
                </div>
                <span className="text-[10px] transition-transform duration-200" style={{ transform: isContabilidadeOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
              </button>
              
              {isContabilidadeOpen && (
                <div className="pl-4 mt-1 space-y-1 border-l border-border/40 ml-5 animate-in slide-in-from-top-1 duration-150">
                  <Link 
                    to="/accounting/xml-export" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <FileText size={16} className="text-violet-500" />
                    <span>Portal Contabilidade Externa</span>
                  </Link>
                  {user?.roleAdmin && (
                    <>
                      <Link 
                        to="/accounting/fiscal-documents" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                      >
                        <FileText size={16} className="text-blue-500" />
                        <span>Documentos Fiscais</span>
                      </Link>
                      <Link 
                        to="/accounting/nfe-import" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                      >
                        <FileText size={16} className="text-emerald-500" />
                        <span>Notas Fiscais de Entrada</span>
                      </Link>
                      <Link 
                        to="/accounting/taxes" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                      >
                        <Percent size={16} className="text-amber-500" />
                        <span>Tributação</span>
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Categoria 2.7: Recursos Humanos */}
          {!isContabilidadeOnly && hasModule('rh') && (user?.roleAdmin || user?.roleRh || user?.roleColaborador || user?.roleContasPagar || user?.roleContasReceber) && (
            <div className="pt-2 border-t border-border/40">
              <button 
                onClick={() => setIsRhOpen(!isRhOpen)}
                className="flex items-center justify-between px-3 py-2 w-full text-left rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-3">
                  <UserCheck size={20} className="text-primary" />
                  <span className="font-semibold text-foreground text-sm">Recursos Humanos</span>
                </div>
                <span className="text-[10px] transition-transform duration-200" style={{ transform: isRhOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
              </button>
              
              {isRhOpen && (
                <div className="pl-4 mt-1 space-y-1 border-l border-border/40 ml-5 animate-in slide-in-from-top-1 duration-150">
                  {hasModule('colaboradores') && (
                    <Link 
                      to="/collaborators" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                    >
                      <UserCheck size={16} className="text-muted-foreground" />
                      <span>Colaboradores</span>
                    </Link>
                  )}
                  {(user?.roleAdmin || user?.roleRh || user?.roleColaborador) && (
                    <Link 
                      to="/rh/absences" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                    >
                      <Calendar size={16} className="text-blue-500" />
                      <span>Controle de Ausências</span>
                    </Link>
                  )}
                  {(user?.roleAdmin || user?.roleRh || user?.roleContasPagar || user?.roleContasReceber) && (
                    <Link 
                      to="/rh/closing" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                    >
                      <CheckSquare size={16} className="text-green-500" />
                      <span>Folha de Descontos</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Categoria 3: Gestão de Frotas */}
          {!isContabilidadeOnly && hasModule('frotas') && (
            <div className="pt-2 border-t border-border/40">
              <button 
                onClick={() => setIsFleetOpen(!isFleetOpen)}
                className="flex items-center justify-between px-3 py-2 w-full text-left rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Truck size={20} className="text-primary" />
                  <span className="font-semibold text-foreground text-sm">Gestão de Frotas</span>
                </div>
                <span className="text-[10px] transition-transform duration-200" style={{ transform: isFleetOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
              </button>
              
              {isFleetOpen && (
                <div className="pl-4 mt-1 space-y-1 border-l border-border/40 ml-5 animate-in slide-in-from-top-1 duration-150">
                  <Link 
                    to="/fleet/dashboard" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <LayoutDashboard size={16} className="text-muted-foreground" />
                    <span>Painel Geral</span>
                  </Link>
                  <Link 
                    to="/fleet/vehicles" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <Truck size={16} className="text-muted-foreground" />
                    <span>Veículos</span>
                  </Link>
                  <Link 
                    to="/fleet/preventive" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <Calendar size={16} className="text-muted-foreground" />
                    <span>Preventiva</span>
                  </Link>
                  <Link 
                    to="/fleet/workshops" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <Wrench size={16} className="text-muted-foreground" />
                    <span>Oficinas</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Categoria 3: Configurações & Administração */}
          {!isContabilidadeOnly && (
          <div className="pt-2 border-t border-border/40">
            <button 
              onClick={() => setIsAdminOpen(!isAdminOpen)}
              className="flex items-center justify-between px-3 py-2 w-full text-left rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings size={20} className="text-primary" />
                <span className="font-semibold text-foreground text-sm">Configurações</span>
              </div>
              <span className="text-[10px] transition-transform duration-200" style={{ transform: isAdminOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
            </button>
            
            {isAdminOpen && (
              <div className="pl-4 mt-1 space-y-1 border-l border-border/40 ml-5 animate-in slide-in-from-top-1 duration-150">
                <Link 
                  to="/users" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                >
                  <Users size={16} className="text-muted-foreground" />
                  <span>Usuários</span>
                </Link>
                <Link 
                  to="/settings/email" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                >
                  <Mail size={16} className="text-muted-foreground" />
                  <span>Config. E-mail</span>
                </Link>
                <Link 
                  to="/settings/my-plan" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                >
                  <CreditCard size={16} className="text-muted-foreground" />
                  <span>Meu Plano</span>
                </Link>
              </div>
            )}
          </div>
          )}

        </nav>

        <div className="p-4 border-t border-border flex flex-col gap-3">
          
          {hasSaaSToken && !isContabilidadeOnly && (
            <button 
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleReturnToSaaS();
              }}
              className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-md hover:bg-primary/10 hover:text-primary transition-colors text-sm font-medium border border-primary/20 bg-primary/5"
            >
              <ArrowLeftRight size={20} />
              <span>Voltar ao SaaS</span>
            </button>
          )}
          
          <button 
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleLogout();
            }}
            className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-sm font-medium"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
          
          <div className="text-center text-[10px] text-muted-foreground/60 tracking-wider pt-2 border-t border-border/40">
            Desenvolvido por <span className="font-semibold text-primary/80">Suzano IT</span>
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-card border-r border-border shadow-sm flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <h1 className="text-xl font-bold text-primary">Gestão da Oficina</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-3 overflow-y-auto">
          {/* Categoria 1: Gestão da Oficina */}
          {!isContabilidadeOnly && (
          <div>
            <button 
              onClick={() => setIsOficinaOpen(!isOficinaOpen)}
              className="flex items-center justify-between px-3 py-2 w-full text-left rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-3">
                <Wrench size={20} className="text-primary" />
                <span className="font-semibold text-foreground text-sm">Gestão da Oficina</span>
              </div>
              <span className="text-[10px] transition-transform duration-200" style={{ transform: isOficinaOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
            </button>
            
            {isOficinaOpen && (
              <div className="pl-4 mt-1 space-y-1 border-l border-border/40 ml-5 animate-in slide-in-from-top-1 duration-150">
                {!isOrcamentistaOnly && (
                  <Link 
                    to="/" 
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <LayoutDashboard size={16} className="text-muted-foreground" />
                    <span>Painel Geral</span>
                  </Link>
                )}
                <Link 
                  to="/quotes/new" 
                  className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                >
                  <FileText size={16} className="text-muted-foreground" />
                  <span>Novo Orçamento</span>
                </Link>
                <Link 
                  to="/quotes" 
                  className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                >
                  <FileText size={16} className="text-muted-foreground" />
                  <span>Orçamentos</span>
                </Link>
                {!isOrcamentistaOnly && hasModule('clientes') && (
                  <Link 
                    to="/clients" 
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <Users size={16} className="text-muted-foreground" />
                    <span>Clientes</span>
                  </Link>
                )}
                {!isOrcamentistaOnly && hasModule('fornecedores') && (
                  <Link 
                    to="/suppliers" 
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <Building size={16} className="text-muted-foreground" />
                    <span>Fornecedores</span>
                  </Link>
                )}
                {!isOrcamentistaOnly && hasModule('clientes') && (
                  <Link 
                    to="/platforms" 
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <Building size={16} className="text-muted-foreground" />
                    <span>Plataformas de Gestão</span>
                  </Link>
                )}
                {!isOrcamentistaOnly && hasModule('fiscal') && (
                  <Link 
                    to="/products" 
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <Package size={16} className="text-muted-foreground" />
                    <span>Produtos</span>
                  </Link>
                )}
              </div>
            )}
          </div>
          )}

          {/* Categoria 2: Gestão Financeira */}
          {!isContabilidadeOnly && !isOrcamentistaOnly && hasModule('financeiro') && (
            <div className="pt-2 border-t border-border/40">
              <button 
                onClick={() => setIsFinancialOpen(!isFinancialOpen)}
                className="flex items-center justify-between px-3 py-2 w-full text-left rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-3">
                  <DollarSign size={20} className="text-primary" />
                  <span className="font-semibold text-foreground text-sm">Gestão Financeira</span>
                </div>
                <span className="text-[10px] transition-transform duration-200" style={{ transform: isFinancialOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
              </button>
              
              {isFinancialOpen && (
                <div className="pl-4 mt-1 space-y-1 border-l border-border/40 ml-5 animate-in slide-in-from-top-1 duration-150">
                  <Link 
                    to="/financial/dashboard" 
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <LayoutDashboard size={16} className="text-muted-foreground" />
                    <span>Painel Geral</span>
                  </Link>
                  <Link 
                    to="/financial/payables" 
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <TrendingDown size={16} className="text-red-500" />
                    <span>Contas a Pagar</span>
                  </Link>
                  <Link 
                    to="/financial/receivables" 
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <TrendingUp size={16} className="text-emerald-500" />
                    <span>Contas a Receber</span>
                  </Link>
                  <Link 
                    to="/financial/approvals" 
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <CheckSquare size={16} className="text-amber-500" />
                    <span>Aprovações</span>
                  </Link>
                  <Link 
                    to="/financial/reports" 
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <BarChart3 size={16} className="text-blue-500" />
                    <span>Relatórios</span>
                  </Link>
                  <Link 
                    to="/financial/categories" 
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <Tag size={16} className="text-violet-500" />
                    <span>Categorias</span>
                  </Link>
                  {user?.roleAdmin && (
                    <Link 
                      to="/financial/fiscal-documents" 
                      className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                    >
                      <FileText size={16} className="text-blue-500" />
                      <span>Central de Documentos Fiscais</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Categoria 2.5: Contabilidade */}
          {!isOrcamentistaOnly && user?.roleContabilidade && hasModule('fiscal') && (
            <div className="pt-2 border-t border-border/40">
              <button 
                onClick={() => setIsContabilidadeOpen(!isContabilidadeOpen)}
                className="flex items-center justify-between px-3 py-2 w-full text-left rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-primary" />
                  <span className="font-semibold text-foreground text-sm">Contabilidade</span>
                </div>
                <span className="text-[10px] transition-transform duration-200" style={{ transform: isContabilidadeOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
              </button>
              
              {isContabilidadeOpen && (
                <div className="pl-4 mt-1 space-y-1 border-l border-border/40 ml-5 animate-in slide-in-from-top-1 duration-150">
                  <Link 
                    to="/accounting/xml-export" 
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <FileText size={16} className="text-violet-500" />
                    <span>Portal Contabilidade Externa</span>
                  </Link>
                  {user?.roleAdmin && (
                    <>
                      <Link 
                        to="/accounting/fiscal-documents" 
                        className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                      >
                        <FileText size={16} className="text-blue-500" />
                        <span>Documentos Fiscais</span>
                      </Link>
                      <Link 
                        to="/accounting/nfe-import" 
                        className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                      >
                        <FileText size={16} className="text-emerald-500" />
                        <span>Notas Fiscais de Entrada</span>
                      </Link>
                      <Link 
                        to="/accounting/taxes" 
                        className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                      >
                        <Percent size={16} className="text-amber-500" />
                        <span>Tributação</span>
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Categoria 2.7: Recursos Humanos */}
          {!isContabilidadeOnly && !isOrcamentistaOnly && hasModule('rh') && (user?.roleAdmin || user?.roleRh || user?.roleColaborador || user?.roleContasPagar || user?.roleContasReceber) && (
            <div className="pt-2 border-t border-border/40">
              <button 
                onClick={() => setIsRhOpen(!isRhOpen)}
                className="flex items-center justify-between px-3 py-2 w-full text-left rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-3">
                  <UserCheck size={20} className="text-primary" />
                  <span className="font-semibold text-foreground text-sm">Recursos Humanos</span>
                </div>
                <span className="text-[10px] transition-transform duration-200" style={{ transform: isRhOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
              </button>
              
              {isRhOpen && (
                <div className="pl-4 mt-1 space-y-1 border-l border-border/40 ml-5 animate-in slide-in-from-top-1 duration-150">
                  {hasModule('colaboradores') && (
                    <Link 
                      to="/collaborators" 
                      className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                    >
                      <UserCheck size={16} className="text-muted-foreground" />
                      <span>Colaboradores</span>
                    </Link>
                  )}
                  {(user?.roleAdmin || user?.roleRh || user?.roleColaborador) && (
                    <Link 
                      to="/rh/absences" 
                      className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                    >
                      <Calendar size={16} className="text-blue-500" />
                      <span>Controle de Ausências</span>
                    </Link>
                  )}
                  {(user?.roleAdmin || user?.roleRh || user?.roleContasPagar || user?.roleContasReceber) && (
                    <Link 
                      to="/rh/closing" 
                      className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                    >
                      <CheckSquare size={16} className="text-green-500" />
                      <span>Folha de Descontos</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Categoria 3: Gestão de Frotas */}
          {!isContabilidadeOnly && !isOrcamentistaOnly && hasModule('frotas') && (
            <div className="pt-2 border-t border-border/40">
              <button 
                onClick={() => setIsFleetOpen(!isFleetOpen)}
                className="flex items-center justify-between px-3 py-2 w-full text-left rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Truck size={20} className="text-primary" />
                  <span className="font-semibold text-foreground text-sm">Gestão de Frotas</span>
                </div>
                <span className="text-[10px] transition-transform duration-200" style={{ transform: isFleetOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
              </button>
              
              {isFleetOpen && (
                <div className="pl-4 mt-1 space-y-1 border-l border-border/40 ml-5 animate-in slide-in-from-top-1 duration-150">
                  <Link 
                    to="/fleet/dashboard" 
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <LayoutDashboard size={16} className="text-muted-foreground" />
                    <span>Painel Geral</span>
                  </Link>
                  <Link 
                    to="/fleet/vehicles" 
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <Truck size={16} className="text-muted-foreground" />
                    <span>Veículos</span>
                  </Link>
                  <Link 
                    to="/fleet/preventive" 
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <Calendar size={16} className="text-muted-foreground" />
                    <span>Preventiva</span>
                  </Link>
                  <Link 
                    to="/fleet/workshops" 
                    className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                  >
                    <Wrench size={16} className="text-muted-foreground" />
                    <span>Oficinas</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Categoria 3: Configurações & Administração */}
          {!isContabilidadeOnly && !isOrcamentistaOnly && (
          <div className="pt-2 border-t border-border/40">
            <button 
              onClick={() => setIsAdminOpen(!isAdminOpen)}
              className="flex items-center justify-between px-3 py-2 w-full text-left rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings size={20} className="text-primary" />
                <span className="font-semibold text-foreground text-sm">Configurações</span>
              </div>
              <span className="text-[10px] transition-transform duration-200" style={{ transform: isAdminOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
            </button>
            
            {isAdminOpen && (
              <div className="pl-4 mt-1 space-y-1 border-l border-border/40 ml-5 animate-in slide-in-from-top-1 duration-150">
                <Link 
                  to="/users" 
                  className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                >
                  <Users size={16} className="text-muted-foreground" />
                  <span>Usuários</span>
                </Link>
                <Link 
                  to="/settings/email" 
                  className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                >
                  <Mail size={16} className="text-muted-foreground" />
                  <span>Config. E-mail</span>
                </Link>
                <Link 
                  to="/settings/my-plan" 
                  className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                >
                  <CreditCard size={16} className="text-muted-foreground" />
                  <span>Meu Plano</span>
                </Link>
              </div>
            )}
          </div>
          )}

        </nav>

        <div className="p-4 border-t border-border flex flex-col gap-3">

          {hasSaaSToken && !isContabilidadeOnly && (
            <button 
              onClick={handleReturnToSaaS}
              className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-md hover:bg-primary/10 hover:text-primary transition-colors text-sm font-medium border border-primary/20 bg-primary/5"
            >
              <ArrowLeftRight size={20} />
              <span>Voltar ao SaaS</span>
            </button>
          )}

          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-sm font-medium"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
          
          <div className="text-center text-[10px] text-muted-foreground/60 tracking-wider pt-2 border-t border-border/40">
            Desenvolvido por <span className="font-semibold text-primary/80">Suzano IT</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground lg:hidden transition-colors"
              title="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-base sm:text-lg font-medium">Painel de Controle</h2>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-semibold text-foreground leading-none mb-0.5">{user.name}</span>
                <span className="text-[10px] text-muted-foreground">{user.email}</span>
              </div>
            )}
            <div 
              className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm cursor-pointer hover:bg-primary/30 transition duration-150"
              title={user ? `${user.name} (${user.email})` : 'Usuário'}
            >
              {user ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-muted/30">
          <GlobalBreadcrumbs />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
