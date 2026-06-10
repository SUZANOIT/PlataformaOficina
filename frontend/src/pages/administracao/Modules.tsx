import { useState, useEffect } from 'react';
import { SaaSAPIService } from '../../services/saas';
import { 
  Boxes, 
  Building, 
  Save, 
  Wrench,
  Truck,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

export function Modules() {
  const [modules, setModules] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'catalog' | 'licensing'>('catalog');
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  // Licensing forms state for the selected tenant
  const [licensingState, setLicensingState] = useState<Record<string, {
    active: boolean;
    valorAdicionalCobrado: number;
    configuracao: string;
  }>>({});

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [modulesData, tenantsData] = await Promise.all([
        SaaSAPIService.listModules(),
        SaaSAPIService.listTenants()
      ]);
      setModules(modulesData);
      setTenants(tenantsData);

      if (tenantsData.length > 0) {
        setSelectedTenantId(tenantsData[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar os módulos ou empresas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update selected tenant object and form state
  useEffect(() => {
    if (!selectedTenantId) return;
    const tenant = tenants.find(t => t.id === selectedTenantId);
    if (!tenant) return;

    // Build the initial licensing state for the selected tenant
    const initialState: Record<string, any> = {};
    modules.forEach(m => {
      // Find if this module is already active in tenant
      const activeModule = tenant.tenantModules?.find((tm: any) => tm.moduleId === m.id);
      initialState[m.id] = {
        active: activeModule ? activeModule.ativo : false,
        valorAdicionalCobrado: activeModule ? activeModule.valorAdicionalCobrado : 0,
        configuracao: activeModule ? activeModule.configuracao : '{}'
      };
    });
    setLicensingState(initialState);
  }, [selectedTenantId, tenants, modules]);

  const handleToggleModule = (moduleId: string, checked: boolean) => {
    setLicensingState(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        active: checked
      }
    }));
  };

  const handleValueChange = (moduleId: string, val: number) => {
    setLicensingState(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        valorAdicionalCobrado: val
      }
    }));
  };

  const handleConfigChange = (moduleId: string, val: string) => {
    setLicensingState(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        configuracao: val
      }
    }));
  };

  const handleSaveLicensing = async (moduleId: string) => {
    const state = licensingState[moduleId];
    if (!state) return;

    // Validate JSON configuration
    try {
      JSON.parse(state.configuracao);
    } catch {
      toast.error('A configuração adicional precisa ser um JSON válido.');
      return;
    }

    setIsSubmitting(moduleId);
    try {
      await SaaSAPIService.toggleTenantModule({
        tenantId: selectedTenantId,
        moduleId,
        active: state.active,
        valorAdicionalCobrado: Number(state.valorAdicionalCobrado),
        configuracao: state.configuracao
      });
      toast.success('Licença de módulo atualizada com sucesso!');
      
      // Reload tenants data to sync counts
      const updatedTenants = await SaaSAPIService.listTenants();
      setTenants(updatedTenants);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Erro ao salvar licença do módulo.');
    } finally {
      setIsSubmitting(null);
    }
  };

  const getModuleIcon = (key: string) => {
    switch (key) {
      case 'oficina': return <Wrench className="text-indigo-400" size={24} />;
      case 'frotas': return <Truck className="text-emerald-400" size={24} />;
      case 'fiscal': return <FileText className="text-amber-400" size={24} />;
      default: return <Boxes className="text-slate-400" size={24} />;
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider">Marketplace de Módulos</h2>
          <p className="text-xs text-slate-400">Ative extensões opcionais, altere valores adicionais de cobrança e configure credenciais de integrações por cliente.</p>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition flex-1 sm:flex-initial ${
              activeTab === 'catalog' ? 'bg-indigo-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Boxes size={14} />
            <span>Módulos</span>
          </button>
          <button
            onClick={() => setActiveTab('licensing')}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition flex-1 sm:flex-initial ${
              activeTab === 'licensing' ? 'bg-indigo-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building size={14} />
            <span>Licenciamento</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        </div>
      ) : activeTab === 'catalog' ? (
        /* Module Catalog View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modules.map((m) => (
            <div 
              key={m.id} 
              className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between transition duration-300"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
                    {getModuleIcon(m.chave)}
                  </div>
                  <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[9px] font-mono font-bold text-slate-500">
                    key: {m.chave}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">{m.nome}</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{m.descricao || 'Sem descrição cadastrada.'}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-850 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Custo Sugerido</span>
                  <span className="text-xs font-black text-white">{formatCurrency(m.valorSugerido || 0)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Chave API / Status</span>
                  <span className="inline-block bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-extrabold mt-0.5">
                    Habilitado
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Licensing Per Tenant View */
        <div className="space-y-6">
          {/* Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div className="space-y-1">
              <h3 className="text-xs font-black uppercase text-white tracking-wider">Selecione o Cliente</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Atribua permissões operacionais e faturamento extra para uma oficina.</p>
            </div>
            
            <div className="flex items-center gap-2.5 w-full sm:w-80">
              <Building size={16} className="text-indigo-400 shrink-0" />
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.razaoSocial} ({t.cnpj})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Module List with Licensing settings */}
          <div className="space-y-4">
            {modules.map((m) => {
              const state = licensingState[m.id] || { active: false, valorAdicionalCobrado: 0, configuracao: '{}' };
              const isSaving = isSubmitting === m.id;

              return (
                <div 
                  key={m.id} 
                  className={`bg-slate-900 border rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row justify-between gap-5 transition duration-300 ${
                    state.active ? 'border-slate-800' : 'border-slate-800/40 opacity-70'
                  }`}
                >
                  {/* Column 1: Info */}
                  <div className="flex gap-4 lg:w-1/3">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 h-fit shrink-0">
                      {getModuleIcon(m.chave)}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                        {m.nome}
                        {state.active && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 block animate-ping"></span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{m.descricao}</p>
                      <div className="pt-2 text-[10px] text-slate-500">
                        Preço padrão: <strong>{formatCurrency(m.valorSugerido || 0)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Licensing configs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:w-2/3 items-end">
                    {/* Toggle Active */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Licenciamento</label>
                      <div className="flex items-center gap-2.5 bg-slate-950 p-2.5 rounded-xl border border-slate-850 h-10">
                        <input
                          type="checkbox"
                          id={`active-${m.id}`}
                          checked={state.active}
                          onChange={(e) => handleToggleModule(m.id, e.target.checked)}
                          className="rounded bg-slate-900 border-slate-800 text-indigo-500 focus:ring-indigo-500"
                        />
                        <label htmlFor={`active-${m.id}`} className="text-xs font-bold text-slate-300 cursor-pointer">
                          {state.active ? 'Módulo Ativado' : 'Desativado'}
                        </label>
                      </div>
                    </div>

                    {/* Additional Billing */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Cobrança Mensal Adicional (R$)</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-[10px] text-slate-500 font-bold">R$</span>
                        <input
                          type="number"
                          value={state.valorAdicionalCobrado}
                          onChange={(e) => handleValueChange(m.id, Number(e.target.value))}
                          disabled={!state.active}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none disabled:opacity-50 transition-all"
                        />
                      </div>
                    </div>

                    {/* Actions and Configurations */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Configuração Adicional (JSON)</label>
                      <input
                        type="text"
                        value={state.configuracao}
                        onChange={(e) => handleConfigChange(m.id, e.target.value)}
                        disabled={!state.active}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 font-mono text-[10px] text-slate-200 focus:border-indigo-500 focus:outline-none disabled:opacity-50 transition-all"
                        title="Dicionário de variáveis adicionais (Ex: Credenciais de API)"
                      />
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="flex items-center justify-end shrink-0 pt-2 lg:pt-0">
                    <button
                      onClick={() => handleSaveLicensing(m.id)}
                      disabled={isSaving}
                      className="flex items-center justify-center gap-2 w-full lg:w-auto px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black rounded-xl text-xs transition disabled:opacity-50"
                    >
                      <Save size={14} />
                      <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
