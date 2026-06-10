import { useState, useEffect } from 'react';
import { BellRing, Check, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface AlertItem {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  prioridade: 'ALTA' | 'MEDIA' | 'BAIXA';
  createdAt: string;
  expiraEm: string | null;
  lida: boolean;
}

const PRIORITY_CONFIG: Record<string, { label: string; badge: string; border: string }> = {
  ALTA: {
    label: 'Alta',
    badge: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    border: 'border-l-rose-500'
  },
  MEDIA: {
    label: 'Média',
    badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    border: 'border-l-amber-500'
  },
  BAIXA: {
    label: 'Baixa',
    badge: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
    border: 'border-l-sky-500'
  }
};

export function AlertsWidget() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch('/notifications/active', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
        if (data.length > 1) {
          setIsExpanded(false);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar alertas e comunicados', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      setMarkingId(id);
      const token = localStorage.getItem('token');
      const response = await fetch(`/notifications/${id}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, lida: true } : a));
        toast.success('Alerta marcado como lido.');
      } else {
        toast.error('Erro ao marcar alerta como lido.');
      }
    } catch (error) {
      console.error('Erro ao marcar alerta como lido', error);
      toast.error('Erro de conexão ao marcar leitura.');
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div 
        className="p-6 border-b border-border flex items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <BellRing className="text-primary shrink-0" size={20} />
        <h2 className="text-lg font-semibold truncate">Alertas e Comunicados</h2>
        
        <div className="ml-auto flex items-center gap-3">
          {alerts.some(a => !a.lida) && (
            <span className="text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2 py-0.5 rounded-full">
              {alerts.filter(a => !a.lida).length} não lido(s)
            </span>
          )}
          {isExpanded ? (
            <ChevronUp size={20} className="text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown size={20} className="text-muted-foreground shrink-0" />
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhum registro encontrado.
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[280px] overflow-y-auto scrollbar-thin">
              {alerts.map((alert) => {
                const priority = PRIORITY_CONFIG[alert.prioridade] || PRIORITY_CONFIG.MEDIA;
                return (
                  <div
                    key={alert.id}
                    className={`p-3 sm:p-4 border-l-4 ${priority.border} ${alert.lida ? 'opacity-60' : ''} flex flex-col sm:flex-row sm:items-start justify-between gap-3`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground truncate">{alert.titulo}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priority.badge}`}>
                          Prioridade {priority.label}
                        </span>
                        {alert.lida && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border uppercase">
                            Lido
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{alert.mensagem}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                        <Calendar size={12} />
                        <span>Publicado em {new Date(alert.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>

                    {!alert.lida && (
                      <button
                        onClick={() => handleMarkAsRead(alert.id)}
                        disabled={markingId === alert.id}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition disabled:opacity-50"
                      >
                        <Check size={13} />
                        <span>{markingId === alert.id ? 'Salvando...' : 'Lido'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

