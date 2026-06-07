import { useState, useEffect } from 'react';
import { SaaSAPIService } from '../../services/saas';
import { 
  Settings2, 
  Mail, 
  Save, 
  Sparkles,
  Sliders
} from 'lucide-react';
import { toast } from 'sonner';

export function Configuracoes() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  // SMTP Settings
  const [smtpConfig, setSmtpConfig] = useState({
    host: 'smtp.sendgrid.net',
    port: 587,
    username: 'apikey',
    password: '••••••••••••••••••••••',
    sender: 'no-reply@suzanoit.com.br'
  });

  // Trial / Trial Settings
  const [trialConfig, setTrialConfig] = useState({
    durationDays: 14,
    autoSuspend: true,
    requireCreditCard: false
  });

  // Default Limits for New Signups
  const [defaultLimits, setDefaultLimits] = useState({
    users: 5,
    vehicles: 100,
    workshops: 3,
    os: 100
  });

  // System Branding Settings
  const [brandingConfig, setBrandingConfig] = useState({
    systemName: 'SuzanoIT Gestão de Oficina',
    logoUrl: '',
    supportEmail: 'suporte@suzanoit.com.br',
    accentColor: '#6366f1'
  });

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await SaaSAPIService.getSettings();
      
      if (data.smtp_config) setSmtpConfig(data.smtp_config);
      if (data.trial_config) setTrialConfig(data.trial_config);
      if (data.default_limits) setDefaultLimits(data.default_limits);
      if (data.branding_config) setBrandingConfig(data.branding_config);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar configurações globais.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSection = async (key: string, value: any) => {
    setIsSaving(key);
    try {
      await SaaSAPIService.saveSetting(key, value);
      toast.success('Configurações atualizadas com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Erro ao salvar configurações.');
    } finally {
      setIsSaving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        <p className="text-xs text-slate-400">Obtendo parâmetros do servidor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-lg font-black text-white uppercase tracking-wider">Configurações Globais</h2>
        <p className="text-xs text-slate-400">Configure os parâmetros gerais do ecossistema SaaS, limites para novas oficinas, SMTP de e-mails de cobrança e trial.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Trial configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Sparkles size={14} className="text-indigo-400" />
              Período de Testes (Trial)
            </h3>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dias Inclusos de Trial</label>
                <input
                  type="number"
                  value={trialConfig.durationDays}
                  onChange={(e) => setTrialConfig({ ...trialConfig, durationDays: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="flex items-center gap-2.5 bg-slate-950 p-2.5 rounded-xl border border-slate-850 h-10">
                  <input
                    type="checkbox"
                    id="autoSuspend"
                    checked={trialConfig.autoSuspend}
                    onChange={(e) => setTrialConfig({ ...trialConfig, autoSuspend: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-800 text-indigo-500 focus:ring-indigo-500"
                  />
                  <label htmlFor="autoSuspend" className="text-xs font-bold text-slate-300 cursor-pointer">
                    Bloquear acesso da oficina se expirar
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 bg-slate-950 p-2.5 rounded-xl border border-slate-850 h-10">
                  <input
                    type="checkbox"
                    id="requireCreditCard"
                    checked={trialConfig.requireCreditCard}
                    onChange={(e) => setTrialConfig({ ...trialConfig, requireCreditCard: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-800 text-indigo-500 focus:ring-indigo-500"
                  />
                  <label htmlFor="requireCreditCard" className="text-xs font-bold text-slate-300 cursor-pointer">
                    Exigir cartão de crédito para cadastrar trial
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end shrink-0">
            <button
              onClick={() => handleSaveSection('trial_config', trialConfig)}
              disabled={isSaving === 'trial_config'}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black rounded-xl text-xs transition disabled:opacity-50"
            >
              <Save size={14} />
              <span>{isSaving === 'trial_config' ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>

        {/* Default Limits configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Sliders size={14} className="text-indigo-400" />
              Limites Padrão para Novos Cadastros
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Limite de Usuários</label>
                <input
                  type="number"
                  value={defaultLimits.users}
                  onChange={(e) => setDefaultLimits({ ...defaultLimits, users: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Limite de Veículos</label>
                <input
                  type="number"
                  value={defaultLimits.vehicles}
                  onChange={(e) => setDefaultLimits({ ...defaultLimits, vehicles: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Limite de Oficinas</label>
                <input
                  type="number"
                  value={defaultLimits.workshops}
                  onChange={(e) => setDefaultLimits({ ...defaultLimits, workshops: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Limite OS Mensal</label>
                <input
                  type="number"
                  value={defaultLimits.os}
                  onChange={(e) => setDefaultLimits({ ...defaultLimits, os: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end shrink-0">
            <button
              onClick={() => handleSaveSection('default_limits', defaultLimits)}
              disabled={isSaving === 'default_limits'}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black rounded-xl text-xs transition disabled:opacity-50"
            >
              <Save size={14} />
              <span>{isSaving === 'default_limits' ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>

        {/* SMTP E-mail Configurations */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Mail size={14} className="text-indigo-400" />
              Configuração de SMTP (Notificações e Faturas)
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Servidor Host SMTP</label>
                <input
                  type="text"
                  value={smtpConfig.host}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Porta SMTP</label>
                <input
                  type="number"
                  value={smtpConfig.port}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, port: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-bold">Usuário SMTP</label>
                <input
                  type="text"
                  value={smtpConfig.username}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Senha SMTP</label>
                <input
                  type="password"
                  value={smtpConfig.password}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Remetente Oficial</label>
                <input
                  type="email"
                  value={smtpConfig.sender}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, sender: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end shrink-0">
            <button
              onClick={() => handleSaveSection('smtp_config', smtpConfig)}
              disabled={isSaving === 'smtp_config'}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black rounded-xl text-xs transition disabled:opacity-50"
            >
              <Save size={14} />
              <span>{isSaving === 'smtp_config' ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>

        {/* Branding Configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Settings2 size={14} className="text-indigo-400" />
              Configurações de Branding e Suporte
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nome da Plataforma</label>
                <input
                  type="text"
                  value={brandingConfig.systemName}
                  onChange={(e) => setBrandingConfig({ ...brandingConfig, systemName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">E-mail de Suporte Técnico</label>
                <input
                  type="email"
                  value={brandingConfig.supportEmail}
                  onChange={(e) => setBrandingConfig({ ...brandingConfig, supportEmail: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">URL Logo (Imagens PNG/SVG)</label>
                <input
                  type="text"
                  value={brandingConfig.logoUrl}
                  onChange={(e) => setBrandingConfig({ ...brandingConfig, logoUrl: e.target.value })}
                  placeholder="https://suaempresa.com.br/logo.svg"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end shrink-0">
            <button
              onClick={() => handleSaveSection('branding_config', brandingConfig)}
              disabled={isSaving === 'branding_config'}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black rounded-xl text-xs transition disabled:opacity-50"
            >
              <Save size={14} />
              <span>{isSaving === 'branding_config' ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
