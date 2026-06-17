import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { 
  Eye, Edit, CheckCircle2, XCircle, Printer, Trash2, MoreHorizontal 
} from 'lucide-react';

export interface ExtraAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

interface TableActionMenuProps {
  onView?: () => void;
  onEdit?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onPrint?: () => void;
  onDelete?: () => void;
  extraActions?: ExtraAction[];
  disabledActions?: {
    view?: boolean;
    edit?: boolean;
    approve?: boolean;
    reject?: boolean;
    print?: boolean;
    delete?: boolean;
  };
}

export function TableActionMenu({
  onView,
  onEdit,
  onApprove,
  onReject,
  onPrint,
  onDelete,
  extraActions = [],
  disabledActions = {}
}: TableActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const hasApproveOrReject = onApprove || onReject;
  const hasAnyAction = onView || onEdit || hasApproveOrReject || onPrint || onDelete || extraActions.length > 0;

  if (!hasAnyAction) return null;

  return (
    <div className="relative inline-flex items-center justify-end w-full">
      
      {/* DESKTOP ACTIONS: INLINE BUTTONS */}
      <div className="hidden md:flex items-center justify-end gap-1">
        {onView && (
          <button
            onClick={onView}
            disabled={disabledActions.view}
            className="p-1.5 bg-slate-500/10 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-500/20 hover:scale-105 transition active:scale-95 duration-100 disabled:opacity-40 disabled:pointer-events-none"
            title="Visualizar"
          >
            <Eye size={14} />
          </button>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            disabled={disabledActions.edit}
            className="p-1.5 bg-blue-500/10 text-blue-600 rounded-lg hover:bg-blue-500/20 hover:scale-105 transition active:scale-95 duration-100 disabled:opacity-40 disabled:pointer-events-none"
            title="Editar"
          >
            <Edit size={14} />
          </button>
        )}
        {onApprove && (
          <button
            onClick={onApprove}
            disabled={disabledActions.approve}
            className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500/20 hover:scale-105 transition active:scale-95 duration-100 disabled:opacity-40 disabled:pointer-events-none"
            title="Aprovar"
          >
            <CheckCircle2 size={14} />
          </button>
        )}
        {onReject && (
          <button
            onClick={onReject}
            disabled={disabledActions.reject}
            className="p-1.5 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500/20 hover:scale-105 transition active:scale-95 duration-100 disabled:opacity-40 disabled:pointer-events-none"
            title="Rejeitar"
          >
            <XCircle size={14} />
          </button>
        )}
        {onPrint && (
          <button
            onClick={onPrint}
            disabled={disabledActions.print}
            className="p-1.5 bg-indigo-500/10 text-indigo-600 rounded-lg hover:bg-indigo-500/20 hover:scale-105 transition active:scale-95 duration-100 disabled:opacity-40 disabled:pointer-events-none"
            title="Imprimir / PDF"
          >
            <Printer size={14} />
          </button>
        )}
        {extraActions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            disabled={action.disabled}
            className={`p-1.5 rounded-lg hover:scale-105 transition active:scale-95 duration-100 disabled:opacity-40 disabled:pointer-events-none ${
              action.className || 'bg-slate-500/10 text-slate-700 dark:text-slate-300 hover:bg-slate-500/20'
            }`}
            title={action.label}
          >
            {action.icon}
          </button>
        ))}
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={disabledActions.delete}
            className="p-1.5 bg-rose-500/10 text-rose-600 rounded-lg hover:bg-rose-500/20 hover:scale-105 transition active:scale-95 duration-100 disabled:opacity-40 disabled:pointer-events-none"
            title="Excluir"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* MOBILE ACTIONS: COLLAPSIBLE DROPDOWN MENU */}
      <div className="md:hidden" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 bg-muted border border-border text-foreground hover:bg-muted/80 rounded-lg transition active:scale-95"
          aria-expanded={isOpen}
          aria-haspopup="true"
          title="Opções"
        >
          <MoreHorizontal size={14} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1.5 w-48 bg-card border border-border rounded-xl shadow-lg z-55 py-1.5 origin-top-right animate-slide-up text-left">
            {onView && (
              <button
                onClick={() => { onView(); setIsOpen(false); }}
                disabled={disabledActions.view}
                className="w-full px-4 py-2 text-xs text-foreground hover:bg-muted flex items-center gap-2 transition disabled:opacity-45"
              >
                <Eye size={14} className="text-slate-500" />
                Visualizar
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => { onEdit(); setIsOpen(false); }}
                disabled={disabledActions.edit}
                className="w-full px-4 py-2 text-xs text-foreground hover:bg-muted flex items-center gap-2 transition disabled:opacity-45"
              >
                <Edit size={14} className="text-blue-500" />
                Editar
              </button>
            )}
            {onApprove && (
              <button
                onClick={() => { onApprove(); setIsOpen(false); }}
                disabled={disabledActions.approve}
                className="w-full px-4 py-2 text-xs text-foreground hover:bg-muted flex items-center gap-2 transition disabled:opacity-45"
              >
                <CheckCircle2 size={14} className="text-emerald-500" />
                Aprovar
              </button>
            )}
            {onReject && (
              <button
                onClick={() => { onReject(); setIsOpen(false); }}
                disabled={disabledActions.reject}
                className="w-full px-4 py-2 text-xs text-foreground hover:bg-muted flex items-center gap-2 transition disabled:opacity-45"
              >
                <XCircle size={14} className="text-rose-500" />
                Rejeitar
              </button>
            )}
            {onPrint && (
              <button
                onClick={() => { onPrint(); setIsOpen(false); }}
                disabled={disabledActions.print}
                className="w-full px-4 py-2 text-xs text-foreground hover:bg-muted flex items-center gap-2 transition disabled:opacity-45"
              >
                <Printer size={14} className="text-indigo-500" />
                Imprimir / PDF
              </button>
            )}
            {extraActions.map((action, index) => (
              <button
                key={index}
                onClick={() => { action.onClick(); setIsOpen(false); }}
                disabled={action.disabled}
                className="w-full px-4 py-2 text-xs text-foreground hover:bg-muted flex items-center gap-2 transition disabled:opacity-45"
              >
                <span className="shrink-0">{action.icon}</span>
                {action.label}
              </button>
            ))}
            {onDelete && (
              <div className="border-t border-border mt-1 pt-1">
                <button
                  onClick={() => { onDelete(); setIsOpen(false); }}
                  disabled={disabledActions.delete}
                  className="w-full px-4 py-2 text-xs text-rose-600 hover:bg-rose-500/10 flex items-center gap-2 transition disabled:opacity-45"
                >
                  <Trash2 size={14} className="text-rose-500" />
                  Excluir
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
