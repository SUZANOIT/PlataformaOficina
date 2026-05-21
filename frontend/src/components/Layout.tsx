import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, LogOut, Mail, Users, Menu, X } from 'lucide-react';

export function Layout() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

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
          <h1 className="text-xl font-bold text-primary">Gestão de Orçamentos</h1>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link 
            to="/" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary transition-colors"
          >
            <LayoutDashboard size={20} className="text-muted-foreground" />
            <span>Dashboard</span>
          </Link>
          <Link 
            to="/quotes/new" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary transition-colors"
          >
            <FileText size={20} className="text-muted-foreground" />
            <span>Novo Orçamento</span>
          </Link>
          <Link 
            to="/users" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary transition-colors"
          >
            <Users size={20} className="text-muted-foreground" />
            <span>Usuários</span>
          </Link>
          <Link 
            to="/settings/email" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary transition-colors"
          >
            <Mail size={20} className="text-muted-foreground" />
            <span>Config. E-mail</span>
          </Link>
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

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-card border-r border-border shadow-sm flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <h1 className="text-xl font-bold text-primary">Gestão de Orçamentos</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary transition-colors">
            <LayoutDashboard size={20} className="text-muted-foreground" />
            <span>Dashboard</span>
          </Link>
          <Link to="/quotes/new" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary transition-colors">
            <FileText size={20} className="text-muted-foreground" />
            <span>Novo Orçamento</span>
          </Link>
          <Link to="/users" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary transition-colors">
            <Users size={20} className="text-muted-foreground" />
            <span>Usuários</span>
          </Link>
          <Link to="/settings/email" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary transition-colors">
            <Mail size={20} className="text-muted-foreground" />
            <span>Config. E-mail</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-border flex flex-col gap-3">
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
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              U
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-muted/30">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

