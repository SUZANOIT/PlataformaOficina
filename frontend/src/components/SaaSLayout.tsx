import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useSaaSAuth } from '../hooks/useSaaSAuth';
import { 
  Building2, 
  Users2, 
  CreditCard, 
  Layers, 
  DollarSign, 
  ShieldCheck, 
  BellRing, 
  Activity, 
  Settings2, 
  LogOut, 
  Menu, 
  X, 
  LayoutDashboard,
  Boxes,
  User,
  ExternalLink
} from 'lucide-react';

interface MenuItem {
  name: string;
  path: string;
  icon: any;
  permission?: string;
}

export function SaaSLayout() {
  const { user, logout, hasPermission } = useSaaSAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const menuItems: MenuItem[] = [
    { name: 'Dashboard', path: '/administracao/dashboard', icon: LayoutDashboard },
    { name: 'Empresa', path: '/administracao/empresas', icon: Building2, permission: 'empresas' },
    { name: 'Usuários Globais', path: '/administracao/usuarios', icon: Users2, permission: 'usuarios' },
    { name: 'Planos', path: '/administracao/planos', icon: Layers, permission: 'planos' },
    { name: 'Assinaturas', path: '/administracao/assinaturas', icon: CreditCard, permission: 'assinaturas' },
    { name: 'Marketplace Módulos', path: '/administracao/modulos', icon: Boxes, permission: 'modulos' },
    { name: 'Financeiro SaaS', path: '/administracao/financeiro', icon: DollarSign, permission: 'financeiro' },
    { name: 'Auditoria', path: '/administracao/auditoria', icon: ShieldCheck, permission: 'auditoria' },
    { name: 'Notificações', path: '/administracao/notificacoes', icon: BellRing, permission: 'configuracoes' },
    { name: 'Monitoramento', path: '/administracao/monitoramento', icon: Activity, permission: 'configuracoes' },
    { name: 'Configurações Globais', path: '/administracao/configuracoes', icon: Settings2, permission: 'configuracoes' },
  ];

  const filteredMenuItems = menuItems.filter(
    item => !item.permission || hasPermission(item.permission)
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'COMERCIAL': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'FINANCEIRO': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'SUPORTE': return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
      case 'IMPLANTACAO': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      default: return 'bg-slate-500/10 text-slate-400';
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar (Desktop & Mobile) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 border-r border-slate-800 transition-transform duration-300 lg:static lg:translate-x-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header/Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-slate-900 shadow-md shadow-indigo-500/20">S</div>
            <div>
              <span className="font-extrabold text-sm tracking-wider text-white">SUZANO IT</span>
              <span className="text-[10px] block -mt-1 font-semibold text-indigo-400 uppercase">SaaS Admin</span>
            </div>
          </div>
          <button 
            className="lg:hidden p-1 rounded hover:bg-slate-800 text-slate-400"
            onClick={() => setIsMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* User Info Capsule */}
        <div className="p-4 mx-4 my-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <User size={18} />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold truncate text-slate-200">{user?.nome}</h4>
            <span className={`mt-0.5 inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-full ${getRoleColor(user?.role || '')}`}>
              {user?.role}
            </span>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-thin">
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200
                  ${isActive 
                    ? 'bg-indigo-500 text-slate-950 font-black shadow-lg shadow-indigo-500/10' 
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'}
                `}
              >
                <Icon size={16} className={isActive ? 'text-slate-950' : 'text-slate-400'} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          {/* Back to main client portal if supports support access */}
          <Link
            to="/"
            className="flex items-center justify-between w-full px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white bg-slate-950/20 hover:bg-slate-800 rounded-lg border border-slate-800 transition"
          >
            <span>Ir para Oficina</span>
            <ExternalLink size={12} />
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-xs font-bold text-red-400 hover:bg-red-950/25 hover:text-red-300 transition-colors"
          >
            <LogOut size={16} />
            <span>Sair do Painel</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/40 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div>
              <h1 className="text-sm font-black text-white uppercase tracking-wider">
                Painel Administrativo
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold block -mt-0.5">
                Suzano IT SaaS Engine v1.0
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ambiente</span>
              <span className="text-[10px] font-extrabold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 border border-indigo-500/20 rounded-md block mt-0.5">
                PRODUÇÃO
              </span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-950/80 p-6 scrollbar-thin">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
