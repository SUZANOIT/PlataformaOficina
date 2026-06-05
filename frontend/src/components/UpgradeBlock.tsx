import { Lock, Zap, MessageSquare } from 'lucide-react';

interface UpgradeBlockProps {
  title?: string;
  description?: string;
  limitName?: string;
  limitValue?: number | string;
}

export function UpgradeBlock({ 
  title = 'Acesso Bloqueado ou Limite Atingido', 
  description = 'Esta funcionalidade faz parte de um módulo adicional ou o limite do seu plano atual foi alcançado.', 
  limitName, 
  limitValue 
}: UpgradeBlockProps) {
  return (
    <div className="w-full py-16 px-4 flex flex-col items-center justify-center text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse"></div>
        <div className="relative bg-card border border-amber-500/40 p-5 rounded-2xl shadow-xl flex items-center justify-center">
          <Lock size={36} className="text-amber-500 animate-pulse" />
        </div>
      </div>

      <h2 className="text-2xl font-bold tracking-tight text-foreground mb-3 sm:text-3xl">
        {title}
      </h2>
      
      <p className="text-muted-foreground max-w-md text-sm sm:text-base mb-8 leading-relaxed">
        {description}
      </p>

      {limitName && limitValue !== undefined && (
        <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl max-w-xs w-full">
          <p className="text-xs uppercase tracking-wider text-amber-500 font-semibold mb-1">
            {limitName}
          </p>
          <p className="text-xl font-bold text-foreground">
            {limitValue}
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-sm">
        <a 
          href="https://wa.me/5511999999999?text=Gostaria%20de%20solicitar%20upgrade%20no%20meu%20plano%20do%20MCA%20Gest%C3%A3o" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-5 rounded-lg transition duration-200 shadow-md shadow-emerald-600/20 text-sm"
        >
          <MessageSquare size={16} />
          Falar com Suporte (WhatsApp)
        </a>
        <button 
          onClick={() => window.location.reload()} 
          className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border font-medium py-2.5 px-5 rounded-lg transition duration-200 text-sm"
        >
          <Zap size={16} className="text-amber-500" />
          Verificar Assinatura Novamente
        </button>
      </div>
    </div>
  );
}
