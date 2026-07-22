import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Briefcase, 
  Search,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { ModalFooterActions } from '../../components/ui/ModalFooterActions';

interface JobRole {
  id: string;
  title: string;
  description: string | null;
  cbo: string | null;
}

export function JobRoles() {
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterName, setFilterName] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJobRole, setEditingJobRole] = useState<JobRole | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCbo, setFormCbo] = useState('');

  const fetchJobRoles = async () => {
    try {
      setLoading(true);
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const companyId = user?.companyId || '';

      const response = await api.get('/hr/job-roles', {
        params: { companyId }
      });
      setJobRoles(response.data);
    } catch (error) {
      toast.error('Erro ao carregar cargos e funções');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobRoles();
  }, []);

  const handleOpenModal = (role?: JobRole) => {
    if (role) {
      setEditingJobRole(role);
      setFormTitle(role.title);
      setFormDescription(role.description || '');
      setFormCbo(role.cbo || '');
    } else {
      setEditingJobRole(null);
      setFormTitle('');
      setFormDescription('');
      setFormCbo('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingJobRole(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setSubmitting(true);
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const companyId = user?.companyId || '';

    const payload = {
      companyId,
      title: formTitle,
      description: formDescription || null,
      cbo: formCbo || null,
    };

    try {
      if (editingJobRole) {
        await api.put(`/hr/job-roles/${editingJobRole.id}`, payload);
        toast.success('Cargo/Função atualizado com sucesso');
      } else {
        await api.post('/hr/job-roles', payload);
        toast.success('Cargo/Função criado com sucesso');
      }
      fetchJobRoles();
      handleCloseModal();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar cargo/função');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cargo/função?')) {
      try {
        await api.delete(`/hr/job-roles/${id}`);
        toast.success('Cargo/Função excluído com sucesso');
        fetchJobRoles();
      } catch (error: any) {
        toast.error('Erro ao excluir cargo/função');
      }
    }
  };

  const filteredJobRoles = jobRoles.filter(r =>
    r.title.toLowerCase().includes(filterName.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-emerald-600" />
            Cargos e Funções
          </h1>
          <p className="text-gray-500 mt-1">Gerencie os cargos, funções e CBOs dos colaboradores</p>
        </div>
        
        <button
          onClick={() => handleOpenModal()}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Novo Cargo
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
              placeholder="Digite o nome do cargo..."
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
      ) : filteredJobRoles.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum cargo encontrado</h3>
          <p className="text-gray-500">
            Você ainda não possui cargos/funções cadastrados ou nenhum corresponde à sua busca.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Título
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CBO
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredJobRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{role.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {role.cbo || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {role.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleOpenModal(role)}
                        className="text-emerald-600 hover:text-emerald-900 mr-4"
                        title="Editar"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(role.id)}
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
                      <Briefcase className="h-5 w-5 text-emerald-600" />
                    </div>
                    <h3 className="text-xl leading-6 font-semibold text-gray-900" id="modal-title">
                      {editingJobRole ? 'Editar Cargo/Função' : 'Novo Cargo/Função'}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Título do Cargo *</label>
                    <input
                      type="text"
                      required
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Ex: Motorista de Guincho, Auxiliar Administrativo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CBO (Opcional)</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                      value={formCbo}
                      onChange={(e) => setFormCbo(e.target.value)}
                      placeholder="Ex: 7823-10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição das Funções (Opcional)</label>
                    <textarea
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Descreva as principais atividades relacionadas a este cargo..."
                    />
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
