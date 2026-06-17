import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDanger = false
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-slide-up text-left">
        
        {/* HEADER */}
        <div className="p-4.5 border-b border-border flex justify-between items-center bg-muted/10">
          <div className="flex items-center gap-2">
            {isDanger && <AlertTriangle className="text-rose-500" size={18} />}
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wide">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-5 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {message}
          </p>
        </div>

        {/* ACTIONS */}
        <div className="p-4 border-t border-border bg-muted/5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border text-foreground hover:bg-muted text-xs font-bold rounded-lg transition"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-white text-xs font-bold rounded-lg transition ${
              isDanger 
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/10' 
                : 'bg-primary hover:bg-primary/95 shadow-primary/10'
            }`}
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
}
