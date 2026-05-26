import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
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
  Calculator,
  ChevronDown,
  Plus
} from 'lucide-react';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOficinaOpen, setIsOficinaOpen] = useState(true);
  const [isFinancialOpen, setIsFinancialOpen] = useState(true);
  const [isFleetOpen, setIsFleetOpen] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

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
        } else if (response.status === 401) {
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

  // Helper to check if a route is active
  const isActive = (path: string) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 h-16 w-full border-b border-border bg-card/85 backdrop-blur-md flex items-center justify-between px-6 shrink-0 transition-all duration-200">
        <div className="flex items-center gap-8">
          {/* Logo / Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-primary/20 group-hover:scale-105 transition-transform duration-200">
              O
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight leading-none bg-gradient-to-r from-foreground via-foreground/95 to-primary bg-clip-text text-transparent group-hover:text-primary transition-colors duration-200">
                Gestão da Oficina
              </span>
              <span className="text-[10px] text-muted-foreground/80 font-medium leading-none mt-0.5">
                Suzano IT
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {/* Oficina Dropdown */}
            <div className="relative group">
              <button 
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  isActive('/quotes') || location.pathname === '/' || isActive('/clients') || isActive('/suppliers') || isActive('/collaborators')
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                <Wrench size={16} />
                <span>Oficina</span>
                <ChevronDown size={14} className="transition-transform group-hover:rotate-180 duration-200" />
              </button>
              
              <div className="absolute top-full left-0 mt-1.5 w-60 bg-card border border-border shadow-xl rounded-xl p-1.5 flex flex-col gap-0.5 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-150 z-50">
                <Link to="/" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${location.pathname === '/' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'}`}>
                  <LayoutDashboard size={16} />
                  <span>Painel Geral</span>
                </Link>
                <Link to="/quotes/new" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/quotes/new') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'}`}>
                  <FileText size={16} />
                  <span>Novo Orçamento</span>
                </Link>
                <Link to="/quotes" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/quotes') && !location.pathname.includes('/new') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'}`}>
                  <FileText size={16} />
                  <span>Orçamentos</span>
                </Link>
                <Link to="/clients" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/clients') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'}`}>
                  <Users size={16} />
                  <span>Clientes</span>
                </Link>
                <Link to="/suppliers" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/suppliers') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'}`}>
                  <Building size={16} />
                  <span>Fornecedores</span>
                </Link>
                <Link to="/collaborators" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/collaborators') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'}`}>
                  <UserCheck size={16} />
                  <span>Colaboradores</span>
                </Link>
              </div>
            </div>

            {/* Financeiro Dropdown */}
            <div className="relative group">
              <button 
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  isActive('/financial')
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                <DollarSign size={16} />
                <span>Financeiro</span>
                <ChevronDown size={14} className="transition-transform group-hover:rotate-180 duration-200" />
              </button>
              
              <div className="absolute top-full left-0 mt-1.5 w-60 bg-card border border-border shadow-xl rounded-xl p-1.5 flex flex-col gap-0.5 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-150 z-50">
                <Link to="/financial/dashboard" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/financial/dashboard') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'}`}>
                  <LayoutDashboard size={16} />
                  <span>Painel Geral</span>
                </Link>
                <Link to="/financial/payables" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/financial/payables') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'}`}>
                  <TrendingDown size={16} className="text-red-500" />
                  <span>Contas a Pagar</span>
                </Link>
                <Link to="/financial/receivables" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/financial/receivables') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'}`}>
                  <TrendingUp size={16} className="text-emerald-500" />
                  <span>Contas a Receber</span>
                </Link>
                <Link to="/financial/approvals" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/financial/approvals') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'}`}>
                  <CheckSquare size={16} className="text-amber-500" />
                  <span>Aprovações</span>
                </Link>
                <Link to="/financial/reports" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/financial/reports') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'}`}>
                  <BarChart3 size={16} className="text-blue-500" />
                  <span>Relatórios</span>
                </Link>
                <Link to="/financial/accountant" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/financial/accountant') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'}`}>
                  <Calculator size={16} className="text-violet-500" />
                  <span>Visão do Contador</span>
                </Link>
              </div>
            </div>

            {/* Frotas Dropdown */}
            <div className="relative group">
              <button 
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  isActive('/fleet')
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                <Truck size={16} />
                <span>Frotas</span>
                <ChevronDown size={14} className="transition-transform group-hover:rotate-180 duration-200" />
              </button>
              
              <div className="absolute top-full left-0 mt-1.5 w-60 bg-card border border-border shadow-xl rounded-xl p-1.5 flex flex-col gap-0.5 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-150 z-50">
                <Link to="/fleet/dashboard" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/fleet/dashboard') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'}`}>
                  <LayoutDashboard size={16} />
                  <span>Painel Geral</span>
                </Link>
                <Link to="/fleet/vehicles" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/fleet/vehicles') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'}`}>
                  <Truck size={16} />
                  <span>Veículos</span>
                </Link>
                <Link to="/fleet/preventive" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/fleet/preventive') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'}`}>
                  <Calendar size={16} />
                  <span>Preventiva</span>
                </Link>
                <Link to="/fleet/workshops" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/fleet/workshops') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'}`}>
                  <Wrench size={16} />
                  <span>Oficinas</span>
                </Link>
              </div>
            </div>

            {/* Configurações Dropdown */}
            <div className="relative group">
              <button 
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  isActive('/settings') || isActive('/users')
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                <Settings size={16} />
                <span>Configurações</span>
                <ChevronDown size={14} className="transition-transform group-hover:rotate-180 duration-200" />
              </button>
              
              <div className="absolute top-full right-0 lg:left-0 mt-1.5 w-60 bg-card border border-border shadow-xl rounded-xl p-1.5 flex flex-col gap-0.5 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-150 z-50">
                <Link to="/users" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/users') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'}`}>
                  <Users size={16} />
                  <span>Usuários</span>
                </Link>
                <Link to="/settings/oficina" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/settings/oficina') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'}`}>
                  <Building size={16} />
                  <span>Dados da Oficina</span>
                </Link>
                <Link to="/settings/emissoras" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/settings/emissoras') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'}`}>
                  <Building size={16} />
                  <span>Empresas Emissoras</span>
                </Link>
                <Link to="/settings/email" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive('/settings/email') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary/60 text-foreground/80 hover:text-foreground'}`}>
                  <Mail size={16} />
                  <span>Config. E-mail</span>
                </Link>
              </div>
            </div>
          </nav>
        </div>

        {/* Right Side Info & Logout */}
        <div className="flex items-center gap-4">
          {/* Quick Quote Button */}
          <Link 
            to="/quotes/new"
            className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-primary to-indigo-600 rounded-lg hover:from-primary/95 hover:to-indigo-600/95 shadow-md shadow-primary/15 hover:shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98] duration-150"
          >
            <Plus size={14} />
            <span>Novo Orçamento</span>
          </Link>

          {/* Hamburger Menu (Mobile Only) */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -mr-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground lg:hidden transition-colors"
            title="Abrir menu"
          >
            <Menu size={20} />
          </button>

          {/* User Details */}
          {user && (
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-foreground leading-none mb-0.5">{user.name}</span>
              <span className="text-[10px] text-muted-foreground font-medium">{user.email}</span>
            </div>
          )}

          {/* Avatar Profile with dropdown for Logout */}
          <div className="relative group/avatar">
            <button 
              className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm hover:bg-primary/25 transition-all duration-150"
              title={user ? `${user.name} (${user.email})` : 'Usuário'}
            >
              {user ? user.name.charAt(0).toUpperCase() : 'U'}
            </button>
            
            {/* Quick Profile Actions Menu */}
            <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border shadow-xl rounded-xl p-1.5 flex flex-col gap-0.5 opacity-0 scale-95 pointer-events-none group-hover/avatar:opacity-100 group-hover/avatar:scale-100 group-hover/avatar:pointer-events-auto transition-all duration-150 z-50">
              <div className="px-3 py-2 border-b border-border/40 mb-1 lg:hidden">
                <p className="text-xs font-bold text-foreground truncate">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 w-full text-left rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors text-sm font-medium"
              >
                <LogOut size={16} />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

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
                <Link 
                  to="/" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                >
                  <LayoutDashboard size={16} className="text-muted-foreground" />
                  <span>Painel Geral</span>
                </Link>
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
                <Link 
                  to="/clients" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                >
                  <Users size={16} className="text-muted-foreground" />
                  <span>Clientes</span>
                </Link>
                <Link 
                  to="/suppliers" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                >
                  <Building size={16} className="text-muted-foreground" />
                  <span>Fornecedores</span>
                </Link>
                <Link 
                  to="/collaborators" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                >
                  <UserCheck size={16} className="text-muted-foreground" />
                  <span>Colaboradores</span>
                </Link>
              </div>
            )}
          </div>

          {/* Categoria 2: Gestão Financeira */}
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
                  to="/financial/accountant" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                >
                  <Calculator size={16} className="text-violet-500" />
                  <span>Visão do Contador</span>
                </Link>
              </div>
            )}
          </div>

          {/* Categoria 3: Gestão de Frotas */}
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

          {/* Categoria 4: Configurações & Administração */}
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
                  to="/settings/oficina" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                >
                  <Building size={16} className="text-muted-foreground" />
                  <span>Dados da Oficina</span>
                </Link>
                <Link 
                  to="/settings/emissoras" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                >
                  <Building size={16} className="text-muted-foreground" />
                  <span>Empresas Emissoras</span>
                </Link>
                <Link 
                  to="/settings/email" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors text-sm"
                >
                  <Mail size={16} className="text-muted-foreground" />
                  <span>Config. E-mail</span>
                </Link>
              </div>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-border flex flex-col gap-3">
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

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-auto bg-muted/20 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
