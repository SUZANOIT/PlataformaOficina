import { useState, useEffect } from 'react';
import { SaaSAPIService } from '../../services/saas';
import { 
  Layers, 
  Plus, 
  Edit3, 
  Copy, 
  CheckCircle, 
  XCircle, 
  X,
  Users,
  Wrench,
  Building,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { ModalFooterActions } from '../../components/ui/ModalFooterActions';

export function Plans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    valorMensal: 0,
    valorAnual: 0,
    limiteUsuarios: 5,
    limiteVeiculos: 100,
    limiteOficinas: 3,
    limiteOs: 100,
    beneficios: '',
    tipoPlano: 'OFICINA',
    ativo: true
  });

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const data = await SaaSAPIService.listPlans();
      setPlans(data);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar os planos SaaS.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome) {
      toast.error('Nome do plano é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    try {
      await SaaSAPIService.createPlan(formData);
      toast.success('Plano criado com sucesso!');
      setIsCreateOpen(false);
      // Reset form
      setFormData({
        nome: '',
        descricao: '',
        valorMensal: 0,
        valorAnual: 0,
        limiteUsuarios: 5,
        limiteVeiculos: 100,
        limiteOficinas: 3,
        limiteOs: 100,
        beneficios: '',
        tipoPlano: 'OFICINA',
        ativo: true
      });
      loadPlans();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Erro ao cadastrar plano.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    setIsSubmitting(true);
    try {
      await SaaSAPIService.updatePlan(selectedPlan.id, selectedPlan);
      toast.success('Plano atualizado com sucesso!');
      setIsEditOpen(false);
      loadPlans();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Erro ao atualizar plano.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await SaaSAPIService.duplicatePlan(id);
      toast.success('Plano clonado com sucesso!');
      loadPlans();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Erro ao clonar plano.');
    }
  };

  const handleToggleStatus = async (plan: any) => {
    try {
      const updatedPlan = { ...plan, ativo: !plan.ativo };
      await SaaSAPIService.updatePlan(plan.id, updatedPlan);
      toast.success(`Plano ${plan.nome} ${updatedPlan.ativo ? 'ativado' : 'desativado'} com sucesso!`);
      loadPlans();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Erro ao alterar status do plano.');
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
          <h2 className="text-lg font-black text-white uppercase tracking-wider">Planos de Assinatura</h2>
          <p className="text-xs text-slate-400">Configure os limites operacionais, valores de assinatura e benefícios dos planos.</p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-500 hover:bg-indigo-400 active:scale-98 text-slate-950 font-extrabold rounded-xl text-xs transition shadow-lg shadow-indigo-500/10 w-full sm:w-auto"
        >
          <Plus size={14} />
          <span>Criar Plano</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs font-semibold">
          Nenhum plano cadastrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`bg-slate-900 border rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden transition-all duration-300 ${
                plan.ativo ? 'border-slate-800 hover:border-indigo-500/50' : 'border-slate-800 opacity-60'
              }`}
            >
              {!plan.ativo && (
                <div className="absolute top-2 right-2 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[9px] font-extrabold text-slate-400">
                  Inativo
                </div>
              )}
              
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      {plan.nome} 
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {plan.tipoPlano === 'AMBOS' ? 'OFICINA + GUINCHO' : plan.tipoPlano === 'GUINCHO_PROVIDER' ? 'GUINCHO' : 'OFICINA'}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-1 min-h-[32px] line-clamp-2">{plan.descricao || 'Sem descrição'}</p>
                  </div>
                  <Layers className={`shrink-0 ${plan.ativo ? 'text-indigo-400' : 'text-slate-500'}`} size={20} />
                </div>

                {/* Preços */}
                <div className="py-2 border-y border-slate-850 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Mensal</span>
                    <span className="text-sm font-black text-white">{formatCurrency(plan.valorMensal)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Anual</span>
                    <span className="text-sm font-black text-emerald-400">{formatCurrency(plan.valorAnual)}</span>
                  </div>
                </div>

                {/* Limites de uso */}
                <div className="space-y-2.5 pt-2">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Limites inclusos</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Users size={12} className="text-indigo-400" />
                      <span>{plan.limiteUsuarios} Usuários</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Wrench size={12} className="text-indigo-400" />
                      <span>{plan.limiteVeiculos} Veículos</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Building size={12} className="text-indigo-400" />
                      <span>{plan.limiteOficinas} Oficinas</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <FileText size={12} className="text-indigo-400" />
                      <span>{plan.limiteOs} O.S / mês</span>
                    </div>
                  </div>
                </div>

                {/* Benefícios */}
                {plan.beneficios && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Benefícios extra</span>
                    <p className="text-[10px] text-slate-400 leading-relaxed bg-slate-950/45 p-2 rounded-lg border border-slate-850">{plan.beneficios}</p>
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="mt-6 pt-4 border-t border-slate-850 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleStatus(plan)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition ${
                    plan.ativo 
                      ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' 
                      : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  {plan.ativo ? <XCircle size={12} /> : <CheckCircle size={12} />}
                  <span>{plan.ativo ? 'Desativar' : 'Ativar'}</span>
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDuplicate(plan.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition"
                    title="Clonar / Duplicar Plano"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPlan(plan);
                      setIsEditOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-extrabold rounded-lg text-[10px] uppercase transition"
                  >
                    <Edit3 size={12} />
                    <span>Editar</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl border border-slate-800 bg-slate-900 rounded-2xl shadow-2xl p-6 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-base font-black text-white uppercase tracking-wider mb-4">Criar Novo Plano</h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4 overflow-y-auto pr-1 scrollbar-thin">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nome do Plano *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Starter, Professional, Enterprise"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                    required
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Descrição</label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Resumo do plano para exibição..."
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all resize-none"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipo de Serviços Inclusos *</label>
                  <select
                    value={formData.tipoPlano}
                    onChange={(e) => setFormData({ ...formData, tipoPlano: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  >
                    <option value="OFICINA">Apenas Oficina</option>
                    <option value="GUINCHO_PROVIDER">Apenas Guincho</option>
                    <option value="AMBOS">Oficina e Guincho (Ambos)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Preço Mensal (R$) *</label>
                  <input
                    type="number"
                    value={formData.valorMensal}
                    onChange={(e) => setFormData({ ...formData, valorMensal: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Preço Anual (R$) *</label>
                  <input
                    type="number"
                    value={formData.valorAnual}
                    onChange={(e) => setFormData({ ...formData, valorAnual: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Limite de Usuários</label>
                  <input
                    type="number"
                    value={formData.limiteUsuarios}
                    onChange={(e) => setFormData({ ...formData, limiteUsuarios: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Limite de Veículos</label>
                  <input
                    type="number"
                    value={formData.limiteVeiculos}
                    onChange={(e) => setFormData({ ...formData, limiteVeiculos: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Limite de Oficinas</label>
                  <input
                    type="number"
                    value={formData.limiteOficinas}
                    onChange={(e) => setFormData({ ...formData, limiteOficinas: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Limite OS Mensal</label>
                  <input
                    type="number"
                    value={formData.limiteOs}
                    onChange={(e) => setFormData({ ...formData, limiteOs: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Benefícios Extra (separados por vírgula)</label>
                  <input
                    type="text"
                    value={formData.beneficios}
                    onChange={(e) => setFormData({ ...formData, beneficios: e.target.value })}
                    placeholder="Ex: Suporte 24h, Multi-filiais, Telemetria Premium"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <ModalFooterActions
                onCancel={() => setIsCreateOpen(false)}
                primaryLabel="Criar Plano"
                loading={isSubmitting}
                loadingLabel="Criando..."
                primaryType="submit"
                embedded
              />
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl border border-slate-800 bg-slate-900 rounded-2xl shadow-2xl p-6 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-base font-black text-white uppercase tracking-wider mb-4">Editar Plano</h3>

            <form onSubmit={handleEditSubmit} className="space-y-4 overflow-y-auto pr-1 scrollbar-thin">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nome do Plano *</label>
                  <input
                    type="text"
                    value={selectedPlan.nome}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, nome: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                    required
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Descrição</label>
                  <textarea
                    value={selectedPlan.descricao || ''}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, descricao: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all resize-none"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipo de Serviços Inclusos *</label>
                  <select
                    value={selectedPlan.tipoPlano || 'OFICINA'}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, tipoPlano: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  >
                    <option value="OFICINA">Apenas Oficina</option>
                    <option value="GUINCHO_PROVIDER">Apenas Guincho</option>
                    <option value="AMBOS">Oficina e Guincho (Ambos)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Preço Mensal (R$) *</label>
                  <input
                    type="number"
                    value={selectedPlan.valorMensal}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, valorMensal: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Preço Anual (R$) *</label>
                  <input
                    type="number"
                    value={selectedPlan.valorAnual}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, valorAnual: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Limite de Usuários</label>
                  <input
                    type="number"
                    value={selectedPlan.limiteUsuarios}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, limiteUsuarios: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Limite de Veículos</label>
                  <input
                    type="number"
                    value={selectedPlan.limiteVeiculos}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, limiteVeiculos: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Limite de Oficinas</label>
                  <input
                    type="number"
                    value={selectedPlan.limiteOficinas}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, limiteOficinas: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Limite OS Mensal</label>
                  <input
                    type="number"
                    value={selectedPlan.limiteOs}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, limiteOs: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Benefícios Extra (separados por vírgula)</label>
                  <input
                    type="text"
                    value={selectedPlan.beneficios || ''}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, beneficios: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1 col-span-2 flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="edit-ativo"
                    checked={selectedPlan.ativo}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, ativo: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-500 focus:ring-indigo-500"
                  />
                  <label htmlFor="edit-ativo" className="text-xs font-bold text-slate-300 cursor-pointer">Plano Ativo e Disponível para Novas Empresas</label>
                </div>
              </div>

              <ModalFooterActions
                onCancel={() => setIsEditOpen(false)}
                primaryLabel="Salvar Alterações"
                loading={isSubmitting}
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
