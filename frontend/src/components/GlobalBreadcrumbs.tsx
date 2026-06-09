import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useBreadcrumbContext } from '../context/BreadcrumbContext';
import type { BreadcrumbItem } from '../context/BreadcrumbContext';

// Safe lookup map for lucide icons to avoid dynamic resolution issues
const iconMap: Record<string, React.ComponentType<any>> = {
  LayoutDashboard: Icons.LayoutDashboard,
  FileText: Icons.FileText,
  Users: Icons.Users,
  Building: Icons.Building,
  UserCheck: Icons.UserCheck,
  Settings: Icons.Settings,
  Mail: Icons.Mail,
  DollarSign: Icons.DollarSign,
  TrendingDown: Icons.TrendingDown,
  TrendingUp: Icons.TrendingUp,
  CheckSquare: Icons.CheckSquare,
  BarChart3: Icons.BarChart3,
  Calculator: Icons.Calculator,
  Truck: Icons.Truck,
  Calendar: Icons.Calendar,
  Wrench: Icons.Wrench,
  Home: Icons.Home
};

export function GlobalBreadcrumbs() {
  const location = useLocation();
  const { extraItems } = useBreadcrumbContext();
  const pathname = location.pathname;

  // 1. Resolve base breadcrumbs based on the active path
  const baseItems: BreadcrumbItem[] = [];

  // Always put the dashboard as the starting anchor
  baseItems.push({ label: 'Dashboard', path: '/', icon: 'LayoutDashboard' });

  if (pathname.startsWith('/quotes')) {
    baseItems.push({ label: 'Orçamentos', path: '/quotes', icon: 'FileText' });
    if (pathname === '/quotes/new') {
      baseItems.push({ label: 'Novo Orçamento', path: '/quotes/new' });
    } else if (pathname.includes('/edit/')) {
      baseItems.push({ label: 'Editar Orçamento' });
    }
  } else if (pathname === '/clients') {
    baseItems.push({ label: 'Clientes', path: '/clients', icon: 'Users' });
  } else if (pathname === '/suppliers') {
    baseItems.push({ label: 'Fornecedores', path: '/suppliers', icon: 'Building' });
  } else if (pathname === '/collaborators') {
    baseItems.push({ label: 'Colaboradores', path: '/collaborators', icon: 'UserCheck' });
  } else if (pathname.startsWith('/settings') || pathname === '/users') {
    baseItems.push({ label: 'Configurações', icon: 'Settings' });
    if (pathname === '/users') {
      baseItems.push({ label: 'Usuários', path: '/users', icon: 'Users' });
    } else if (pathname === '/settings/email') {
      baseItems.push({ label: 'Config. E-mail', path: '/settings/email', icon: 'Mail' });
    } else if (pathname === '/settings/oficina') {
      baseItems.push({ label: 'Dados da Oficina', path: '/settings/oficina', icon: 'Building' });
    } else if (pathname === '/settings/emissoras') {
      baseItems.push({ label: 'Empresas Emissoras', path: '/settings/emissoras', icon: 'Building' });
    }
  } else if (pathname.startsWith('/financial')) {
    baseItems.push({ label: 'Financeiro', icon: 'DollarSign' });
    if (pathname === '/financial/dashboard') {
      baseItems.push({ label: 'Painel Geral', path: '/financial/dashboard', icon: 'LayoutDashboard' });
    } else if (pathname === '/financial/payables') {
      baseItems.push({ label: 'Contas a Pagar', path: '/financial/payables', icon: 'TrendingDown' });
    } else if (pathname === '/financial/receivables') {
      baseItems.push({ label: 'Contas a Receber', path: '/financial/receivables', icon: 'TrendingUp' });
    } else if (pathname === '/financial/approvals') {
      baseItems.push({ label: 'Aprovações', path: '/financial/approvals', icon: 'CheckSquare' });
    } else if (pathname === '/financial/reports') {
      baseItems.push({ label: 'Relatórios', path: '/financial/reports', icon: 'BarChart3' });
    } else if (pathname === '/financial/accountant') {
      baseItems.push({ label: 'Visão do Contador', path: '/financial/accountant', icon: 'Calculator' });
    } else if (pathname === '/financial/fiscal-documents') {
      baseItems.push({ label: 'Central de Documentos Fiscais', path: '/financial/fiscal-documents', icon: 'FileText' });
    }
  } else if (pathname.startsWith('/accounting')) {
    baseItems.push({ label: 'Contabilidade', icon: 'FileText' });
    if (pathname === '/accounting/fiscal-documents') {
      baseItems.push({ label: 'Documentos Fiscais', path: '/accounting/fiscal-documents', icon: 'FileText' });
    } else if (pathname === '/accounting/xml-export') {
      baseItems.push({ label: 'Exportação XML Contabilidade', path: '/accounting/xml-export', icon: 'FileText' });
    }
  } else if (pathname.startsWith('/fleet')) {
    baseItems.push({ label: 'Frotas', icon: 'Truck' });
    if (pathname === '/fleet/dashboard') {
      baseItems.push({ label: 'Painel Geral', path: '/fleet/dashboard', icon: 'LayoutDashboard' });
    } else if (pathname === '/fleet/vehicles') {
      baseItems.push({ label: 'Veículos', path: '/fleet/vehicles', icon: 'Truck' });
    } else if (pathname.startsWith('/fleet/vehicles/') && pathname !== '/fleet/vehicles') {
      baseItems.push({ label: 'Veículos', path: '/fleet/vehicles', icon: 'Truck' });
      baseItems.push({ label: 'Detalhes' });
    } else if (pathname === '/fleet/preventive') {
      baseItems.push({ label: 'Preventiva', path: '/fleet/preventive', icon: 'Calendar' });
    } else if (pathname === '/fleet/workshops') {
      baseItems.push({ label: 'Oficinas', path: '/fleet/workshops', icon: 'Wrench' });
    }
  }

  // Combine resolved base items with stack-based dynamic/modal extra items
  const allItems = [...baseItems, ...extraItems];

  // If we are at root dashboard, don't show trailing duplicates
  const finalItems = allItems.filter((item, idx) => {
    if (item.label === 'Dashboard' && idx > 0) return false;
    return true;
  });

  if (finalItems.length <= 1 && pathname === '/') {
    // Hidden or super clean on the root dashboard landing page
    return null;
  }

  return (
    <nav 
      aria-label="Breadcrumb" 
      className="mb-5 flex items-center justify-between px-4 py-2.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-md shadow-sm transition-all duration-200"
    >
      {/* Desktop Version */}
      <ol className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        {finalItems.map((item, idx) => {
          const isLast = idx === finalItems.length - 1;
          const IconComponent = item.icon ? iconMap[item.icon] : null;

          return (
            <React.Fragment key={idx}>
              {idx > 0 && (
                <Icons.ChevronRight size={13} className="text-muted-foreground/45 shrink-0" />
              )}
              <li className="flex items-center">
                {isLast ? (
                  <span className="flex items-center gap-1.5 text-foreground font-bold tracking-tight py-0.5 px-2 rounded-md bg-secondary/40">
                    {IconComponent && <IconComponent size={14} className="text-primary" />}
                    <span>{item.label}</span>
                  </span>
                ) : item.path ? (
                  <Link 
                    to={item.path} 
                    className="flex items-center gap-1.5 hover:text-primary hover:bg-secondary/60 py-0.5 px-2 rounded-md transition-all duration-150"
                  >
                    {IconComponent && <IconComponent size={14} className="text-muted-foreground/70" />}
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <span className="flex items-center gap-1.5 py-0.5 px-2 text-muted-foreground/75 cursor-default">
                    {IconComponent && <IconComponent size={14} className="text-muted-foreground/70" />}
                    <span>{item.label}</span>
                  </span>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>

      {/* Mobile Version (Smart level collapsing: "Dashboard > ... > ActivePage") */}
      <ol className="flex md:hidden items-center gap-1 text-[11px] font-bold text-muted-foreground overflow-x-auto scrollbar-none w-full py-0.5">
        {(() => {
          // Dynamic mobile compression
          const getMobileItems = () => {
            if (finalItems.length <= 3) return finalItems;
            const first = finalItems[0];
            const lastTwo = finalItems.slice(-2);
            return [
              first,
              { label: '...', isCollapsed: true } as BreadcrumbItem,
              ...lastTwo
            ];
          };

          const mobileItems = getMobileItems();

          return mobileItems.map((item, idx) => {
            const isLast = idx === mobileItems.length - 1;
            const IconComponent = item.icon ? iconMap[item.icon] : null;

            return (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <Icons.ChevronRight size={11} className="text-muted-foreground/40 shrink-0" />
                )}
                <li className="flex items-center shrink-0">
                  {isLast ? (
                    <span className="text-foreground bg-secondary/40 py-0.5 px-1.5 rounded font-black max-w-[120px] truncate">
                      {item.label}
                    </span>
                  ) : item.isCollapsed ? (
                    <span className="px-1 text-muted-foreground/40 font-bold" title="Caminho intermediário ocultado">
                      ...
                    </span>
                  ) : item.path ? (
                    <Link 
                      to={item.path} 
                      className="hover:text-primary transition-colors py-0.5 px-1 rounded hover:bg-secondary/40 flex items-center gap-1"
                    >
                      {IconComponent && <IconComponent size={12} className="text-muted-foreground/70" />}
                      <span>{item.label}</span>
                    </Link>
                  ) : (
                    <span className="py-0.5 px-1">
                      {item.label}
                    </span>
                  )}
                </li>
              </React.Fragment>
            );
          });
        })()}
      </ol>
    </nav>
  );
}
