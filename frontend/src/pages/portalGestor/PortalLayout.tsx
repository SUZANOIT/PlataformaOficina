import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Truck, CheckSquare, Wrench, Package,
  Paperclip, DollarSign, IdCard, KeyRound, LogOut, Menu, X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { formatCnpj } from './ui';

const MENU = [
  { to: '/portal', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/portal/empresa', label: 'Cadastro da Empresa', icon: Building2 },
  { to: '/portal/veiculos', label: 'Meus Veículos', icon: Truck },
  { to: '/portal/ordens-servico', label: 'Ordens de Serviço', icon: CheckSquare },
  { to: '/portal/manutencao', label: 'Manutenção', icon: Wrench },
  { to: '/portal/pecas', label: 'Peças Utilizadas', icon: Package },
  { to: '/portal/documentos', label: 'Documentos', icon: Paperclip },
  { to: '/portal/financeiro', label: 'Finanças / DRE', icon: DollarSign },
  { to: '/portal/motoristas', label: 'Motoristas', icon: IdCard },
  { to: '/portal/meu-acesso', label: 'Meu Acesso', icon: KeyRound },
];

/** Layout exclusivo do Portal do Gestor de Frota (cliente PJ). */
export function PortalLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const empresa = user?.cliente?.empresa || user?.cliente?.nome || user?.nome;

  const nav = (
    <nav aria-label="Portal do Gestor de Frota" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
      {MENU.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
        >
          <Icon size={17} aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  const brand = (
    <div className="border-b border-border px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-primary">Portal do Gestor de Frota</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground" title={empresa}>{empresa}</p>
      <p className="text-xs text-muted-foreground">{formatCnpj(user?.cliente?.cnpj)}</p>
      {user?.oficina?.nome && <p className="mt-2 truncate text-xs text-muted-foreground">Oficina: {user.oficina.nome}</p>}
    </div>
  );

  const footer = (
    <div className="border-t border-border p-3">
      <button
        type="button"
        onClick={() => logout()}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <LogOut size={17} aria-hidden="true" /> Sair
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        {brand}
        {nav}
        {footer}
      </aside>

      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-primary">Portal do Gestor</p>
          <p className="truncate text-sm font-semibold">{empresa}</p>
        </div>
        <button type="button" aria-label={open ? 'Fechar menu' : 'Abrir menu'} onClick={() => setOpen(!open)} className="rounded-lg p-2 hover:bg-muted">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-card shadow-xl">
            {brand}
            {nav}
            {footer}
          </aside>
        </div>
      )}

      <div className="flex min-h-[calc(100vh-57px)] flex-col lg:ml-64 lg:min-h-screen">
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
        <footer className="border-t border-border px-4 py-4 text-center text-xs tracking-wide text-muted-foreground sm:px-6 lg:px-8">
          Desenvolvido por <span className="font-semibold text-foreground">Suzano IT</span>
        </footer>
      </div>
    </div>
  );
}
