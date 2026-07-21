import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Clock, 
  Search,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { ModalFooterActions } from '../../components/ui/ModalFooterActions';

interface WorkSchedule {
  id: string;
  name: string;
  type: string;
  entryTime: string | null;
  exitTime: string | null;
  intervalStart: string | null;
  intervalEnd: string | null;
}

export function WorkSchedules() {
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterName, setFilterName] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('8_HOURS');
  const [formEntryTime, setFormEntryTime] = useState('');
  const [formExitTime, setFormExitTime] = useState('');
  const [formIntervalStart, setFormIntervalStart] = useState('');
  const [formIntervalEnd, setFormIntervalEnd] = useState('');

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await api.get('/hr/work-schedules');
      setSchedules(response.data);
    } catch (error) {
      toast.error('Erro ao carregar as escalas de trabalho');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleOpenModal = (schedule?: WorkSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormName(schedule.name);
      setFormType(schedule.type);
      setFormEntryTime(schedule.entryTime || '');
      setFormExitTime(schedule.exitTime || '');
      setFormIntervalStart(schedule.intervalStart || '');
      setFormIntervalEnd(schedule.intervalEnd || '');
    } else {
      setEditingSchedule(null);
      setFormName('');
      setFormType('8_HOURS');
      setFormEntryTime('');
      setFormExitTime('');
      setFormIntervalStart('');
      setFormIntervalEnd('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSchedule(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formType) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setSubmitting(true);
    const payload = {
      name: formName,
      type: formType,
      entryTime: formEntryTime || null,
      exitTime: formExitTime || null,
      intervalStart: formIntervalStart || null,
      intervalEnd: formIntervalEnd || null
    };

    try {
      if (editingSchedule) {
        await api.put(`/hr/work-schedules/${editingSchedule.id}`, payload);
        toast.success('Escala atualizada com sucesso');
      } else {
        await api.post('/hr/work-schedules', payload);
        toast.success('Escala criada com sucesso');
      }
      fetchSchedules();
      handleCloseModal();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar escala de trabalho');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta escala de trabalho?')) {
      try {
        await api.delete(`/hr/work-schedules/${id}`);
        toast.success('Escala excluída com sucesso');
        fetchSchedules();
      } catch (error: any) {
        toast.error('Erro ao excluir escala de trabalho');
      }
    }
  };

  const formatScheduleType = (type: string) => {
    switch (type) {
      case '8_HOURS': return '8 Horas (Comercial)';
      case '12x36': return '12x36';
      case 'CUSTOM': return 'Personalizado';
      case 'ON_CALL': return 'Sobreaviso';
      default: return type;
    }
  };

  const filteredSchedules = schedules.filter(s =>
    s.name.toLowerCase().includes(filterName.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="h-6 w-6 text-emerald-600" />
            Escalas de Trabalho
          </h1>
          <p className="text-gray-500 mt-1">Gerencie as jornadas e escalas de trabalho dos colaboradores</p>
        </div>
        
        <button
          onClick={() => handleOpenModal()}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Nova Escala
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Buscar por Nome</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Digite o nome da escala..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma escala encontrada</h3>
          <p className="text-gray-500">
            Você ainda não possui escalas de trabalho cadastradas ou nenhuma corresponde à sua busca.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Horário (Entrada - Saída)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Intervalo
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSchedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{schedule.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {formatScheduleType(schedule.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {schedule.entryTime && schedule.exitTime 
                        ? `${schedule.entryTime} às ${schedule.exitTime}` 
                        : 'N/A'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {schedule.intervalStart && schedule.intervalEnd 
                        ? `${schedule.intervalStart} às ${schedule.intervalEnd}` 
                        : 'N/A'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleOpenModal(schedule)}
                        className="text-emerald-600 hover:text-emerald-900 mr-4"
                        title="Editar"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(schedule.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Excluir"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={handleCloseModal}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-emerald-600" />
                    </div>
                    <h3 className="text-xl leading-6 font-semibold text-gray-900" id="modal-title">
                      {editingSchedule ? 'Editar Escala' : 'Nova Escala'}
                    </h3>
                  </div>
                  <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-500 transition-colors">
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="px-4 py-5 sm:p-6 bg-gray-50/50 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Escala *</label>
                    <input
                      type="text"
                      required
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Ex: Comercial, Plantão 12x36"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Escala *</label>
                    <select
                      required
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                    >
                      <option value="8_HOURS">8 Horas (Comercial)</option>
                      <option value="12x36">12x36</option>
                      <option value="CUSTOM">Personalizado</option>
                      <option value="ON_CALL">Sobreaviso</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Horário de Entrada</label>
                      <input
                        type="time"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                        value={formEntryTime}
                        onChange={(e) => setFormEntryTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Horário de Saída</label>
                      <input
                        type="time"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                        value={formExitTime}
                        onChange={(e) => setFormExitTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Início do Intervalo</label>
                      <input
                        type="time"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                        value={formIntervalStart}
                        onChange={(e) => setFormIntervalStart(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fim do Intervalo</label>
                      <input
                        type="time"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                        value={formIntervalEnd}
                        onChange={(e) => setFormIntervalEnd(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                
                <ModalFooterActions 
                  onCancel={handleCloseModal}
                  loading={submitting}
                  primaryLabel="Salvar"
                  loadingLabel="Salvando..."
                  primaryType="submit"
                />
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
