import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export interface ModalFooterActionsProps {
  onCancel: () => void;
  onPrimary?: () => void;
  primaryLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  loadingLabel?: string;
  primaryType?: 'submit' | 'button';
  hidePrimary?: boolean;
  disabled?: boolean;
  primaryIcon?: ReactNode;
  flush?: boolean;
  embedded?: boolean;
  className?: string;
  formId?: string;
}

const cancelBtnClass =
  'inline-flex items-center justify-center gap-2 min-w-[100px] h-10 px-5 rounded-lg text-sm font-semibold ' +
  'border border-border bg-background text-foreground ' +
  'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
  'disabled:opacity-50 disabled:pointer-events-none transition-colors ' +
  'w-full sm:w-auto';

const primaryBtnClass =
  'inline-flex items-center justify-center gap-2 min-w-[100px] h-10 px-5 rounded-lg text-sm font-semibold ' +
  'bg-primary text-primary-foreground hover:bg-primary/90 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
  'disabled:opacity-50 disabled:pointer-events-none transition-colors ' +
  'w-full sm:w-auto';

export function ModalFooterActions({
  onCancel,
  onPrimary,
  primaryLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  loading = false,
  loadingLabel = 'Salvando...',
  primaryType = 'button',
  hidePrimary = false,
  disabled = false,
  primaryIcon,
  flush = false,
  embedded = false,
  className = '',
  formId,
}: ModalFooterActionsProps) {
  const isPrimaryDisabled = disabled || loading;

  const wrapperClass = embedded
    ? 'pt-4 border-t border-border'
    : flush
      ? 'bg-muted/10 -mx-6 -mb-6 px-6 py-4'
      : 'px-4 sm:px-6 py-4 bg-muted/10';

  return (
    <div
      className={[
        'flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 shrink-0 border-t border-border',
        wrapperClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button type="button" onClick={onCancel} className={cancelBtnClass}>
        {cancelLabel}
      </button>
      {!hidePrimary && (
        <button
          type={primaryType}
          onClick={primaryType === 'button' ? onPrimary : undefined}
          disabled={isPrimaryDisabled}
          className={primaryBtnClass}
          form={formId}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{loadingLabel}</span>
            </>
          ) : (
            <>
              {primaryIcon}
              {primaryLabel}
            </>
          )}
        </button>
      )}
    </div>
  );
}
