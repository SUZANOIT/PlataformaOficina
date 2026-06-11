import { useState, useEffect } from 'react';
import { SaaSAPIService } from '../../services/saas';
import { 
  BellRing, 
  Send, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Calendar,
  X,
  Plus,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { ModalFooterActions } from '../../components/ui/ModalFooterActions';

export function Notificacoes() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);

  // Form fields
  const [formData, setFormData] = useState({
    titulo: '',
    mensagem: '',
    tipo: 'INFO' as 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR',
    prioridade: 'MEDIA' as 'ALTA' | 'MEDIA' | 'BAIXA',
    expiraEm: '',
    targetType: 'ALL' as 'ALL' | 'COMPANY' | 'ROLE',
    targetCompanyId: '',
    targetRole: ''
  });

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await SaaSAPIService.listNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar notificações.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTenants = async () => {
    try {
      const data = await SaaSAPIService.listTenants();
      setTenants(data);
    } catch (err) {
      console.error('Erro ao carregar empresas', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    loadTenants();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo || !formData.mensagem) {
      toast.error('Título e mensagem são obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      await SaaSAPIService.createNotification({
        titulo: formData.titulo,
        mensagem: formData.mensagem,
        tipo: formData.tipo,
        prioridade: formData.prioridade,
        expiraEm: formData.expiraEm ? new Date(formData.expiraEm).toISOString() : null,
        targetCompanyId: formData.targetType === 'COMPANY' && formData.targetCompanyId ? formData.targetCompanyId : null,
        targetRole: formData.targetType === 'ROLE' && formData.targetRole ? formData.targetRole : null
      });
      toast.success('Alerta global disparado com sucesso!');
      setIsComposerOpen(false);
      setFormData({
        titulo: '',
        mensagem: '',
        tipo: 'INFO',
        prioridade: 'MEDIA',
        expiraEm: '',
        targetType: 'ALL',
        targetCompanyId: '',
        targetRole: ''
      });
      loadNotifications();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Erro ao disparar alerta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await SaaSAPIService.markNotificationAsRead(id);
      toast.success('Leitura do alerta confirmada!');
      loadNotifications();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Erro ao marcar alerta como lido.');
    }
  };

  const getAlertIcon = (tipo: string) => {
    switch (tipo) {
      case 'INFO': return <Info size={16} className="text-sky-400" />;
      case 'WARNING': return <AlertTriangle size={16} className="text-amber-400" />;
      case 'SUCCESS': return <CheckCircle size={16} className="text-emerald-400" />;
      case 'ERROR': return <XCircle size={16} className="text-rose-400" />;
      default: return <BellRing size={16} className="text-slate-400" />;
    }
  };

  const getAlertBorder = (tipo: string) => {
    switch (tipo) {
      case 'INFO': return 'border-sky-500/20 bg-sky-500/5 hover:border-sky-500/30';
      case 'WARNING': return 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/30';
      case 'SUCCESS': return 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/30';
      case 'ERROR': return 'border-rose-500/20 bg-rose-500/5 hover:border-rose-500/30';
      default: return 'border-slate-800 bg-slate-900/50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider">Alertas & Notificações Gerais</h2>
          <p className="text-xs text-slate-400">Emita notificações pop-up, avisos de manutenção, avisos financeiros ou anúncios para todas as oficinas operacionais.</p>
        </div>

        <button
          onClick={() => setIsComposerOpen(true)}
          className="flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-500 hover:bg-indigo-400 active:scale-98 text-slate-950 font-extrabold rounded-xl text-xs transition shadow-lg shadow-indigo-500/10 w-full sm:w-auto"
        >
          <Plus size={14} />
          <span>Emitir Alerta</span>
        </button>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs font-semibold">
          Nenhuma notificação emitida.
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif) => (
            <div 
              key={notif.id} 
              className={`border rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 transition duration-300 ${getAlertBorder(notif.tipo)}`}
            >
              <div className="flex gap-3.5 items-start">
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-850 h-fit shrink-0 mt-0.5">
                  {getAlertIcon(notif.tipo)}
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-white flex items-center gap-2 flex-wrap">
                    {notif.titulo}
                    <span className="text-[9px] text-slate-500 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-850">
                      {notif.tipo}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                      notif.prioridade === 'ALTA' ? 'text-rose-400 bg-rose-950/20 border-rose-500/20' :
                      notif.prioridade === 'BAIXA' ? 'text-sky-400 bg-sky-950/20 border-sky-500/20' :
                      'text-amber-400 bg-amber-950/20 border-amber-500/20'
                    }`}>
                      {notif.prioridade === 'ALTA' ? 'Alta' : notif.prioridade === 'BAIXA' ? 'Baixa' : 'Média'}
                    </span>
                    {notif.expiraEm && new Date(notif.expiraEm) < new Date() && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded border text-slate-500 bg-slate-950 border-slate-850 uppercase">
                        Expirado
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">{notif.mensagem}</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0 justify-center mt-2 md:mt-0">
                <div className="flex items-center gap-2">
                  {notif.lida ? (
                    <span className="text-[9px] font-extrabold text-slate-500 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-850 uppercase">
                      Lida
                    </span>
                  ) : (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      <span className="text-[9px] font-extrabold text-amber-400 bg-amber-950/20 px-2.5 py-1 rounded-full border border-amber-500/15 uppercase">
                        Pendente
                      </span>
                    </>
                  )}
                </div>
                
                <div className="text-[10px] text-slate-500 font-mono font-bold flex items-center gap-1.5">
                  <Calendar size={12} className="text-slate-600" />
                  <span>{new Date(notif.createdAt).toLocaleString('pt-BR')}</span>
                </div>

                {!notif.lida && (
                  <button
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="mt-1 flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-indigo-400 hover:text-indigo-300 font-bold border border-indigo-500/15 hover:border-indigo-500/35 rounded-lg text-[10px] transition active:scale-95"
                  >
                    <Check size={11} />
                    <span>Confirmar Leitura</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* COMPOSER MODAL */}
      {isComposerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-md border border-slate-800 bg-slate-900 rounded-2xl shadow-2xl p-6">
            <button
              onClick={() => setIsComposerOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-base font-black text-white uppercase tracking-wider mb-4">Compor Alerta Global</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Título do Alerta *</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Instabilidade no gateway Pix / Atualização do Sistema"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipo de Notificação *</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                >
                  <option value="INFO">Informação (Azul)</option>
                  <option value="WARNING">Alerta/Aviso (Amarelo)</option>
                  <option value="SUCCESS">Sucesso/Aviso Positivo (Verde)</option>
                  <option value="ERROR">Erro/Crítico (Vermelho)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Prioridade *</label>
                  <select
                    value={formData.prioridade}
                    onChange={(e) => setFormData({ ...formData, prioridade: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  >
                    <option value="ALTA">Alta</option>
                    <option value="MEDIA">Média</option>
                    <option value="BAIXA">Baixa</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expira em (opcional)</label>
                  <input
                    type="datetime-local"
                    value={formData.expiraEm}
                    onChange={(e) => setFormData({ ...formData, expiraEm: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-3 p-3 bg-slate-950/50 border border-slate-800 rounded-xl">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Público Alvo *</label>
                  <select
                    value={formData.targetType}
                    onChange={(e) => setFormData({ ...formData, targetType: e.target.value as any, targetCompanyId: '', targetRole: '' })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  >
                    <option value="ALL">Todas as Empresas (Global)</option>
                    <option value="COMPANY">Empresa Específica</option>
                    <option value="ROLE">Nível de Acesso Específico</option>
                  </select>
                </div>

                {formData.targetType === 'COMPANY' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selecione a Empresa *</label>
                    <select
                      value={formData.targetCompanyId}
                      onChange={(e) => setFormData({ ...formData, targetCompanyId: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                      required
                    >
                      <option value="">Selecione...</option>
                      {tenants.map(t => (
                        <option key={t.companyId || t.id} value={t.companyId || t.id}>{t.razaoSocial} ({t.cnpj})</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.targetType === 'ROLE' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selecione o Perfil *</label>
                    <select
                      value={formData.targetRole}
                      onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                      required
                    >
                      <option value="">Selecione...</option>
                      <option value="Administrador">Administrador</option>
                      <option value="Orçamentista">Orçamentista</option>
                      <option value="Contabilidade">Contabilidade</option>
                      <option value="Mecânico">Mecânico</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mensagem Completa *</label>
                <textarea
                  value={formData.mensagem}
                  onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                  placeholder="Descreva o comunicado em detalhes. Esta mensagem será exibida na tela inicial dos workshops..."
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all resize-none"
                  required
                />
              </div>

              <ModalFooterActions
                onCancel={() => setIsComposerOpen(false)}
                primaryLabel="Disparar"
                primaryIcon={<Send size={12} />}
                loading={isSubmitting}
                loadingLabel="Enviando..."
                primaryType="submit"
                embedded
              />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
