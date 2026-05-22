import { useState, useEffect } from 'react';
import { Wrench, Plus, Search, User, Phone, Mail, MapPin, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function FleetWorkshops() {
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  const [editingWorkshopId, setEditingWorkshopId] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    nome: '',
    cnpj: '',
    responsavel: '',
    telefone: '',
    whatsapp: '',
    email: '',
    endereco: '',
    servicosRealizados: '',
    observacoes: ''
  });

  const fetchWorkshops = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/fleet/workshops', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWorkshops(data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar oficinas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkshops();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingWorkshopId(null);
    setForm({
      nome: '',
      cnpj: '',
      responsavel: '',
      telefone: '',
      whatsapp: '',
      email: '',
      endereco: '',
      servicosRealizados: '',
      observacoes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (workshop: any) => {
    setEditingWorkshopId(workshop.id);
    setForm({
      nome: workshop.nome || '',
      cnpj: workshop.cnpj || '',
      responsavel: workshop.responsavel || '',
      telefone: workshop.telefone || '',
      whatsapp: workshop.whatsapp || '',
      email: workshop.email || '',
      endereco: workshop.endereco || '',
      servicosRealizados: workshop.servicosRealizados || '',
      observacoes: workshop.observacoes || ''
    });
    setIsModalOpen(true);
  };

  const handleLookupCnpj = async () => {
    const cnpjClean = form.cnpj.replace(/\D/g, "");
    if (!cnpjClean) {
      toast.warning('Digite um CNPJ para pesquisar.');
      return;
    }

    setIsCnpjLoading(true);
    try {
      const res = await fetch(`/api/cnpj/${cnpjClean}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ERROR') {
          toast.error(data.message || 'CNPJ não encontrado.');
          return;
        }

        setForm((prev) => ({
          ...prev,
          nome: data.nome || prev.nome,
          email: data.email || prev.email,
          telefone: data.telefone || prev.telefone,
          endereco: data.logradouro 
            ? `${data.logradouro}, ${data.numero || ''} ${data.complemento || ''} - ${data.bairro || ''}, ${data.municipio || ''}/${data.uf || ''}` 
            : prev.endereco,
          servicosRealizados: data.atividade_principal?.[0]?.text || prev.servicosRealizados
        }));
        toast.success('Dados da oficina preenchidos automaticamente!');
      } else {
        toast.error('Erro ao consultar CNPJ.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao consultar CNPJ.');
    } finally {
      setIsCnpjLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome) {
      toast.warning('O nome da oficina é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const method = editingWorkshopId ? 'PUT' : 'POST';
      const url = editingWorkshopId ? `/fleet/workshops/${editingWorkshopId}` : '/fleet/workshops';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        toast.success(editingWorkshopId ? 'Oficina atualizada!' : 'Oficina cadastrada!');
        setIsModalOpen(false);
        fetchWorkshops();
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Erro ao salvar oficina.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja excluir esta oficina credenciada?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/fleet/workshops/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Oficina excluída!');
        fetchWorkshops();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredWorkshops = workshops.filter((w) => {
    const term = searchTerm.toLowerCase();
    return (
      w.nome.toLowerCase().includes(term) ||
      (w.cnpj || '').includes(term) ||
      (w.responsavel || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">Oficinas Credenciadas</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie os parceiros credenciados para reparos da frota.</p>
        </div>
        
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
        >
          <Plus size={18} />
          Cadastrar Oficina
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative w-full md:w-96">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Buscar por nome, CNPJ ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Grid list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div>
        </div>
      ) : filteredWorkshops.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-100 dark:border-gray-700">
          <Wrench size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">Nenhuma oficina encontrada</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkshops.map((w) => (
            <div
              key={w.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex flex-col justify-between hover:shadow-md transition"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-lg">
                      <Wrench size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-gray-800 dark:text-white leading-tight">{w.nome}</h4>
                      <span className="text-xs text-gray-400">CNPJ: {w.cnpj ? w.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2.5">
                    <User size={15} className="text-gray-400" />
                    <span>{w.responsavel || 'Responsável não informado'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone size={15} className="text-gray-400" />
                    <span>{w.telefone || w.whatsapp || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Mail size={15} className="text-gray-400" />
                    <span className="truncate">{w.email || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MapPin size={15} className="text-gray-400" />
                    <span className="truncate">{w.endereco || '—'}</span>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-xs space-y-1">
                  <span className="font-bold text-gray-700 dark:text-gray-300 uppercase block">Serviços Realizados</span>
                  <p className="text-gray-600 dark:text-gray-400 line-clamp-2">{w.servicosRealizados || 'Geral'}</p>
                </div>
              </div>

              <div className="flex gap-2 border-t border-gray-100 dark:border-gray-700 mt-5 pt-4">
                <button
                  onClick={() => handleOpenEditModal(w)}
                  className="flex-1 py-2 text-xs font-semibold bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg transition"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(w.id)}
                  className="py-2 px-3 text-xs font-semibold hover:bg-rose-50 hover:text-rose-600 border border-transparent rounded-lg transition"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation & Edition Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
              <h2 className="text-lg font-bold">{editingWorkshopId ? 'Editar Oficina' : 'Cadastrar Oficina'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white/85 hover:text-white transition">
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20 flex gap-3 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">CNPJ da Oficina</label>
                  <input
                    type="text"
                    placeholder="Somente números"
                    value={form.cnpj}
                    onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                    className="w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleLookupCnpj}
                  disabled={isCnpjLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                >
                  {isCnpjLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Sparkles size={15} />
                  )}
                  Consultar CNPJ
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Nome Fantasia / Razão Social *</label>
                <input
                  type="text"
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Responsável</label>
                  <input
                    type="text"
                    value={form.responsavel}
                    onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">E-mail</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Telefone</label>
                  <input
                    type="text"
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">WhatsApp</label>
                  <input
                    type="text"
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Endereço Completo</label>
                <input
                  type="text"
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Serviços Realizados</label>
                <input
                  type="text"
                  placeholder="Ex: Motor, Câmbio, Suspensão, Elétrica, Pintura..."
                  value={form.servicosRealizados}
                  onChange={(e) => setForm({ ...form, servicosRealizados: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Observações gerais</label>
                <textarea
                  rows={2}
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Check size={15} />
                  )}
                  Salvar Oficina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
