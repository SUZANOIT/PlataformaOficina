import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Activity, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { ModalFooterActions } from '../../components/ui/ModalFooterActions';

export default function VehicleDetails() {
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // New Event Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventForm, setEventForm] = useState({
    tipo: 'REVISAO', // REVISAO, MANUTENCAO, KM, ABASTECIMENTO, MULTA, SINISTRO, ALTERACAO
    data: new Date().toISOString().substring(0, 10),
    km: 0,
    descricao: '',
    valor: 0
  });

  const fetchVehicle = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/fleet/vehicles/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVehicle(data);
        setEventForm((prev) => ({ ...prev, km: data.kmAtual }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados do veículo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicle();
  }, [id]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.descricao) {
      toast.warning('Digite a descrição do evento.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/fleet/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...eventForm,
          veiculoId: id,
          valor: eventForm.valor > 0 ? Number(eventForm.valor) : null,
          km: eventForm.km > 0 ? Number(eventForm.km) : null
        })
      });

      if (res.ok) {
        toast.success('Evento registrado com sucesso na timeline!');
        setIsModalOpen(false);
        setEventForm((prev) => ({ ...prev, descricao: '', valor: 0 }));
        fetchVehicle();
      } else {
        toast.error('Erro ao salvar evento.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'TROCA_OLEO_MOTOR':
        return { label: 'Óleo Motor', color: 'bg-red-100 text-red-700 border-red-200' };
      case 'TROCA_OLEO_CAMBIO':
        return { label: 'Óleo Câmbio', color: 'bg-orange-100 text-orange-700 border-orange-200' };
      case 'REVISAO':
        return { label: 'Revisão', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'MANUTENCAO':
        return { label: 'Manutenção', color: 'bg-purple-100 text-purple-700 border-purple-200' };
      case 'KM':
        return { label: 'Quilometragem', color: 'bg-teal-100 text-teal-700 border-teal-200' };
      case 'ABASTECIMENTO':
        return { label: 'Abastecimento', color: 'bg-green-100 text-green-700 border-green-200' };
      case 'MULTA':
        return { label: 'Multa', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 'SINISTRO':
        return { label: 'Sinistro', color: 'bg-rose-100 text-rose-700 border-rose-200' };
      default:
        return { label: 'Alteração', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="p-6 text-center">
        <h3 className="text-xl font-bold text-gray-800">Veículo não encontrado</h3>
        <Link to="/fleet/vehicles" className="text-indigo-600 hover:underline mt-4 inline-block">Voltar para a frota</Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header back link */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link to="/fleet/vehicles" className="p-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 transition">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white uppercase tracking-wider">{vehicle.placa}</h1>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                vehicle.status === 'ATIVO' ? 'bg-green-500 text-white' :
                vehicle.status === 'EM_MANUTENCAO' ? 'bg-amber-500 text-white' : 'bg-gray-500 text-white'
              }`}>
                {vehicle.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{vehicle.marca} {vehicle.modelo} ({vehicle.anoModelo}) • Proprietário: {vehicle.client?.nome || '—'}</p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
        >
          <Plus size={18} />
          Registrar Evento
        </button>
      </div>

      {/* Grid: technical stats and Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side: Technical parameters & Info card */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-700">Ficha Técnica</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-gray-400 block uppercase">Renavam</span>
                <span className="font-semibold text-gray-800 dark:text-white block truncate">{vehicle.renavam || '—'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-400 block uppercase">Chassi</span>
                <span className="font-semibold text-gray-800 dark:text-white block truncate">{vehicle.chassi || '—'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-400 block uppercase">VIN</span>
                <span className="font-semibold text-gray-800 dark:text-white block truncate">{vehicle.vin || '—'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-400 block uppercase">Ano Fabricação</span>
                <span className="font-semibold text-gray-800 dark:text-white block truncate">{vehicle.anoFabricacao || '—'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-400 block uppercase">Combustível</span>
                <span className="font-semibold text-gray-800 dark:text-white block truncate">{vehicle.combustivel || '—'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-400 block uppercase">Fator de Consumo</span>
                <span className="font-semibold text-gray-800 dark:text-white block truncate">{vehicle.mediaConsumo ? `${vehicle.mediaConsumo} KM/L` : '—'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-400 block uppercase">Frota</span>
                <span className="font-semibold text-gray-800 dark:text-white block truncate">{vehicle.frota || '—'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-400 block uppercase">Subfrota</span>
                <span className="font-semibold text-gray-800 dark:text-white block truncate">{vehicle.subfrota || '—'}</span>
              </div>
            </div>

            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl space-y-2 mt-4">
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Quilometragem Acumulada</span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                  <Activity size={20} />
                  <span className="text-xl font-black">{vehicle.kmAtual?.toLocaleString('pt-BR')} KM</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side: Chronological visual timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Linha do Tempo Cronológica</h3>

          {vehicle.events?.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText size={44} className="mx-auto text-gray-300 mb-4" />
              <span>Nenhum evento histórico registrado para este veículo ainda.</span>
            </div>
          ) : (
            <div className="flow-root relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100 dark:before:bg-gray-700">
              {vehicle.events?.map((e: any) => {
                const badge = getEventBadge(e.tipo);
                return (
                  <div key={e.id} className="relative pb-8 last:pb-0">
                    {/* Circle icon on line */}
                    <div className="absolute -left-6 mt-1 flex items-center justify-center bg-white dark:bg-gray-800 border-2 border-indigo-500 rounded-full h-4 w-4">
                      <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full"></div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100/50 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${badge.color}`}>
                            {badge.label}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(e.data).toLocaleDateString('pt-BR')} • {new Date(e.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white leading-relaxed">{e.descricao}</p>
                        {e.km && (
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded w-max">
                            Hodômetro: {e.km.toLocaleString('pt-BR')} KM
                          </span>
                        )}
                      </div>

                      {e.valor && (
                        <div className="text-right whitespace-nowrap self-start">
                          <span className="text-xs text-gray-400 block">Custo Lançado</span>
                          <span className="font-extrabold text-sm text-rose-600 dark:text-rose-400">{formatCurrency(e.valor)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-[95%] max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-indigo-600 text-white flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold">Registrar Evento Histórico</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white/85 hover:text-white transition">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="p-6 space-y-4 flex-1 overflow-y-auto scrollbar-thin">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Tipo de Evento</label>
                <select
                  value={eventForm.tipo}
                  onChange={(e) => setEventForm({ ...eventForm, tipo: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="REVISAO">Revisão Preventiva</option>
                  <option value="MANUTENCAO">Manutenção Geral / Avaria</option>
                  <option value="KM">Atualização de Quilometragem</option>
                  <option value="ABASTECIMENTO">Abastecimento</option>
                  <option value="MULTA">Multa de Trânsito</option>
                  <option value="SINISTRO">Sinistro / Colisão</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Data *</label>
                  <input
                    type="date"
                    required
                    value={eventForm.data}
                    onChange={(e) => setEventForm({ ...eventForm, data: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">KM Atual</label>
                  <input
                    type="number"
                    value={eventForm.km}
                    onChange={(e) => setEventForm({ ...eventForm, km: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Valor Gasto (BRL)</label>
                <input
                  type="number"
                  step="0.01"
                  value={eventForm.valor}
                  onChange={(e) => setEventForm({ ...eventForm, valor: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Descrição do Evento *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Descreva o que ocorreu (Ex: Troca das pastilhas de freio dianteiras, ou Abastecimento de 45 litros gasolina...)"
                  value={eventForm.descricao}
                  onChange={(e) => setEventForm({ ...eventForm, descricao: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <ModalFooterActions
                onCancel={() => setIsModalOpen(false)}
                primaryLabel="Salvar Evento"
                loading={isSubmitting}
                primaryType="submit"
                flush
              />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
