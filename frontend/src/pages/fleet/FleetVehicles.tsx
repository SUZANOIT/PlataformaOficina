import { useState, useEffect } from 'react';
import { Truck, Plus, Search, Eye, Edit2, Trash2, Sparkles, Check, X, Building } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { handleApiError } from '../../utils/toast.helper';

export default function FleetVehicles() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPlateLoading, setIsPlateLoading] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  // Active form tab
  const [activeTab, setActiveTab] = useState<'geral' | 'tecnico' | 'proprietario' | 'obs'>('geral');

  // Form State
  const [form, setForm] = useState({
    placa: '',
    marca: '',
    modelo: '',
    versao: '',
    anoFabricacao: new Date().getFullYear(),
    anoModelo: new Date().getFullYear(),
    cor: '',
    combustivel: 'Flex',
    categoria: 'Particular',
    tipoVeiculo: 'Automóvel',
    renavam: '',
    chassi: '',
    vin: '',
    codigoFipe: '',
    codigoInterno: '',
    frota: '',
    subfrota: '',
    municipio: '',
    uf: '',
    kmAtual: 0,
    mediaConsumo: 10.5,
    status: 'ATIVO',
    clienteId: '',
    observacoes: ''
  });

  const fetchVehicles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/fleet/vehicles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      }
    } catch (err) {
      console.error('Failed to fetch vehicles', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/fleet/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error('Failed to fetch clients', err);
    }
  };

  useEffect(() => {
    fetchVehicles();
    fetchClients();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingVehicleId(null);
    setForm({
      placa: '',
      marca: '',
      modelo: '',
      versao: '',
      anoFabricacao: new Date().getFullYear(),
      anoModelo: new Date().getFullYear(),
      cor: '',
      combustivel: 'Flex',
      categoria: 'Particular',
      tipoVeiculo: 'Automóvel',
      renavam: '',
      chassi: '',
      vin: '',
      codigoFipe: '',
      codigoInterno: '',
      frota: '',
      subfrota: '',
      municipio: '',
      uf: '',
      kmAtual: 0,
      mediaConsumo: 10.5,
      status: 'ATIVO',
      clienteId: clients[0]?.id || '',
      observacoes: ''
    });
    setActiveTab('geral');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (vehicle: any) => {
    setEditingVehicleId(vehicle.id);
    setForm({
      placa: vehicle.placa || '',
      marca: vehicle.marca || '',
      modelo: vehicle.modelo || '',
      versao: vehicle.versao || '',
      anoFabricacao: vehicle.anoFabricacao || new Date().getFullYear(),
      anoModelo: vehicle.anoModelo || new Date().getFullYear(),
      cor: vehicle.cor || '',
      combustivel: vehicle.combustivel || 'Flex',
      categoria: vehicle.categoria || 'Particular',
      tipoVeiculo: vehicle.tipoVeiculo || 'Automóvel',
      renavam: vehicle.renavam || '',
      chassi: vehicle.chassi || '',
      vin: vehicle.vin || '',
      codigoFipe: vehicle.codigoFipe || '',
      codigoInterno: vehicle.codigoInterno || '',
      frota: vehicle.frota || '',
      subfrota: vehicle.subfrota || '',
      municipio: vehicle.municipio || '',
      uf: vehicle.uf || '',
      kmAtual: vehicle.kmAtual || 0,
      mediaConsumo: vehicle.mediaConsumo || 10.5,
      status: vehicle.status || 'ATIVO',
      clienteId: vehicle.clienteId || '',
      observacoes: vehicle.observacoes || ''
    });
    setActiveTab('geral');
    setIsModalOpen(true);
  };

  const handleLookupPlate = async () => {
    const placaClean = form.placa.toUpperCase().replace(/[\s-]/g, "");
    if (!placaClean) {
      toast.warning('Digite uma placa primeiro.');
      return;
    }

    const isValid = /^[A-Z]{3}[0-9]{4}$|^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(placaClean);
    if (!isValid) {
      toast.error('Placa inválida. Digite no formato antigo AAA1234 ou Mercosul AAA1A23.');
      return;
    }

    setIsPlateLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/fleet/vehicles/lookup/${placaClean}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setForm((prev) => ({
          ...prev,
          placa: data.placa,
          marca: data.marca || prev.marca,
          modelo: data.modelo || prev.modelo,
          versao: data.versao || prev.versao,
          anoFabricacao: data.anoFabricacao || prev.anoFabricacao,
          anoModelo: data.anoModelo || prev.anoModelo,
          cor: data.cor || prev.cor,
          combustivel: data.combustivel || prev.combustivel,
          categoria: data.categoria || prev.categoria,
          tipoVeiculo: data.tipoVeiculo || prev.tipoVeiculo,
          chassi: data.chassi || prev.chassi,
          renavam: data.renavam || prev.renavam,
          municipio: data.municipio || prev.municipio,
          uf: data.uf || prev.uf,
          kmAtual: data.kmAtual || prev.kmAtual
        }));
        toast.success('Veículo consultado com sucesso!');
      } else {
        toast.error('Erro ao consultar placa. Verifique os dados ou digite manualmente.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao consultar placa.');
    } finally {
      setIsPlateLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clienteId) {
      toast.warning('Selecione um cliente proprietário.');
      return;
    }
    if (!form.placa) {
      toast.warning('Insira a placa do veículo.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const method = editingVehicleId ? 'PUT' : 'POST';
      const url = editingVehicleId ? `/fleet/vehicles/${editingVehicleId}` : '/fleet/vehicles';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        toast.success(editingVehicleId ? 'Veículo atualizado com sucesso!' : 'Veículo cadastrado com sucesso!');
        setIsModalOpen(false);
        fetchVehicles();
      } else {
        handleApiError(res, 'Erro ao salvar veículo.');
      }
    } catch (err) {
      console.error(err);
      handleApiError(err, 'Erro de conexão ao salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este veículo? Todo o histórico de preventivas e manutenções será removido permanentemente.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/fleet/vehicles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Veículo excluído com sucesso!');
        fetchVehicles();
      } else {
        toast.error('Erro ao excluir veículo.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao excluir.');
    }
  };

  const filteredVehicles = vehicles.filter((v) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      v.placa.toLowerCase().includes(term) ||
      v.modelo.toLowerCase().includes(term) ||
      v.marca.toLowerCase().includes(term) ||
      (v.client?.nome || '').toLowerCase().includes(term);

    if (statusFilter !== 'all' && v.status !== statusFilter) {
      return false;
    }

    return matchesSearch;
  });

  // Group vehicles by client
  const vehiclesByClient = filteredVehicles.reduce((groups: Record<string, { clientName: string; clientEmpresa?: string; vehicles: any[] }>, v) => {
    const clientId = v.clienteId || 'sem_cliente';
    const clientName = v.client?.nome || 'Sem Proprietário';
    const clientEmpresa = v.client?.empresa || '';
    if (!groups[clientId]) {
      groups[clientId] = {
        clientName,
        clientEmpresa,
        vehicles: []
      };
    }
    groups[clientId].vehicles.push(v);
    return groups;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">Cadastro de Veículos</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie a frota de veículos vinculada aos clientes.</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
        >
          <Plus size={18} />
          Cadastrar Veículo
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Buscar por placa, modelo, marca ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 py-2.5 px-3 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todos os Status</option>
            <option value="ATIVO">Ativo</option>
            <option value="EM_MANUTENCAO">Em Manutenção</option>
            <option value="INATIVO">Inativo</option>
            <option value="VENDIDO">Vendido</option>
          </select>
        </div>
      </div>

      {/* Grouped Clients & Associated Fleets */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      ) : Object.keys(vehiclesByClient).length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-100 dark:border-gray-700">
          <Truck size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">Nenhum veículo encontrado</h3>
          <p className="text-gray-400 mt-2">Cadastre um novo veículo ou modifique seus filtros.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(vehiclesByClient).map(([clientId, group]: [string, any]) => (
            <div
              key={clientId}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
            >
              {/* Client Group Header Banner */}
              <div className="p-6 bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-gray-700/50 dark:to-gray-700/30 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                    {group.clientName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">{group.clientName}</h3>
                    {group.clientEmpresa && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                        <Building size={12} /> {group.clientEmpresa}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-600/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-bold px-3 py-1 rounded-full text-xs">
                    {group.vehicles.length} {group.vehicles.length === 1 ? 'Veículo' : 'Veículos'}
                  </span>
                </div>
              </div>

              {/* Associated Vehicles List */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.vehicles.map((v: any) => (
                    <div
                      key={v.id}
                      className="bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200/50 dark:border-gray-700 overflow-hidden flex flex-col hover:shadow-sm transition-shadow"
                    >
                      {/* Vehicle Header */}
                      <div className="p-4 bg-gray-100 dark:bg-gray-700/60 border-b border-gray-200/50 dark:border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Truck size={16} className="text-indigo-600 dark:text-indigo-400" />
                          <h4 className="font-extrabold text-sm uppercase tracking-wider text-gray-800 dark:text-white">{v.placa}</h4>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          v.status === 'ATIVO' ? 'bg-green-500/10 text-green-600' :
                          v.status === 'EM_MANUTENCAO' ? 'bg-amber-500/10 text-amber-600' :
                          v.status === 'VENDIDO' ? 'bg-blue-500/10 text-blue-600' : 'bg-gray-500/10 text-gray-500'
                        }`}>
                          {v.status.replace("_", " ")}
                        </span>
                      </div>

                      {/* Vehicle Specs */}
                      <div className="p-4 flex-1 space-y-3 text-xs text-gray-600 dark:text-gray-300">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Modelo / Marca</span>
                          <span className="font-semibold text-gray-800 dark:text-white">{v.marca} {v.modelo}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Ano</span>
                          <span className="font-semibold text-gray-800 dark:text-white">{v.anoModelo || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Quilometragem</span>
                          <span className="font-bold text-gray-800 dark:text-white">{v.kmAtual.toLocaleString('pt-BR')} KM</span>
                        </div>
                        {(v.frota || v.subfrota) && (
                          <div className="pt-2 border-t border-gray-200/50 dark:border-gray-700 grid grid-cols-2 gap-2 text-[10px]">
                            {v.frota && (
                              <div>
                                <span className="text-gray-400 block">Frota</span>
                                <span className="font-medium truncate block text-gray-700 dark:text-gray-400">{v.frota}</span>
                              </div>
                            )}
                            {v.subfrota && (
                              <div>
                                <span className="text-gray-400 block">Subfrota</span>
                                <span className="font-medium truncate block text-gray-700 dark:text-gray-400">{v.subfrota}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="p-3 bg-gray-100/50 dark:bg-gray-700/20 border-t border-gray-200/50 dark:border-gray-700 flex justify-between items-center gap-2">
                        <Link
                          to={`/fleet/vehicles/${v.id}`}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition"
                        >
                          <Eye size={12} />
                          Histórico
                        </Link>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(v)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 transition"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(v.id)}
                            className="p-1.5 text-gray-500 hover:text-rose-600 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 transition"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation & Edition Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Truck size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{editingVehicleId ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}</h2>
                  <p className="text-indigo-200 text-xs mt-0.5">Preencha os dados técnicos ou consulte a placa.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white transition">
                <X size={24} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 px-6">
              {[
                { id: 'geral', label: 'Identificação' },
                { id: 'tecnico', label: 'Dados Técnicos' },
                { id: 'proprietario', label: 'Proprietário' },
                { id: 'obs', label: 'Observações' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3.5 px-4 font-semibold text-sm border-b-2 transition -mb-px ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: IDENTIFICATION */}
              {activeTab === 'geral' && (
                <div className="space-y-6">
                  {/* Plate Autocomplete bar */}
                  <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">Consulta Rápida de Placa</label>
                      <input
                        type="text"
                        placeholder="Ex: ABC1234 ou AAA1A23"
                        value={form.placa}
                        onChange={(e) => setForm({ ...form, placa: e.target.value })}
                        disabled={editingVehicleId !== null}
                        className="w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 font-bold uppercase placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    {editingVehicleId === null && (
                      <button
                        type="button"
                        onClick={handleLookupPlate}
                        disabled={isPlateLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                      >
                        {isPlateLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        ) : (
                          <Sparkles size={16} />
                        )}
                        Consultar Placa
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Marca *</label>
                      <input
                        type="text"
                        required
                        value={form.marca}
                        onChange={(e) => setForm({ ...form, marca: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Modelo *</label>
                      <input
                        type="text"
                        required
                        value={form.modelo}
                        onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Versão</label>
                      <input
                        type="text"
                        value={form.versao}
                        onChange={(e) => setForm({ ...form, versao: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Ano Fabricação *</label>
                      <input
                        type="number"
                        required
                        value={form.anoFabricacao}
                        onChange={(e) => setForm({ ...form, anoFabricacao: parseInt(e.target.value) || 2020 })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Ano Modelo *</label>
                      <input
                        type="number"
                        required
                        value={form.anoModelo}
                        onChange={(e) => setForm({ ...form, anoModelo: parseInt(e.target.value) || 2020 })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Cor</label>
                      <input
                        type="text"
                        value={form.cor}
                        onChange={(e) => setForm({ ...form, cor: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TECHNICAL DETAILS */}
              {activeTab === 'tecnico' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Renavam</label>
                      <input
                        type="text"
                        value={form.renavam}
                        onChange={(e) => setForm({ ...form, renavam: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Chassi</label>
                      <input
                        type="text"
                        value={form.chassi}
                        onChange={(e) => setForm({ ...form, chassi: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">VIN (Nº de Identificação)</label>
                      <input
                        type="text"
                        value={form.vin}
                        onChange={(e) => setForm({ ...form, vin: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Combustível</label>
                      <select
                        value={form.combustivel}
                        onChange={(e) => setForm({ ...form, combustivel: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Flex">Flex</option>
                        <option value="Gasolina">Gasolina</option>
                        <option value="Etanol">Etanol</option>
                        <option value="Diesel">Diesel</option>
                        <option value="Elétrico">Elétrico</option>
                        <option value="Híbrido">Híbrido</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Categoria</label>
                      <input
                        type="text"
                        value={form.categoria}
                        onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Tipo de Veículo</label>
                      <input
                        type="text"
                        value={form.tipoVeiculo}
                        onChange={(e) => setForm({ ...form, tipoVeiculo: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Código FIPE</label>
                      <input
                        type="text"
                        value={form.codigoFipe}
                        onChange={(e) => setForm({ ...form, codigoFipe: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Código Interno</label>
                      <input
                        type="text"
                        value={form.codigoInterno}
                        onChange={(e) => setForm({ ...form, codigoInterno: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">KM Atual *</label>
                      <input
                        type="number"
                        required
                        value={form.kmAtual}
                        onChange={(e) => setForm({ ...form, kmAtual: parseInt(e.target.value) || 0 })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Média Consumo (KM/L)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={form.mediaConsumo}
                        onChange={(e) => setForm({ ...form, mediaConsumo: parseFloat(e.target.value) || 10.5 })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PROPRIETARIO & FROTA */}
              {activeTab === 'proprietario' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Proprietário (Cliente Responsável) *</label>
                      <select
                        required
                        value={form.clienteId}
                        onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Selecione o Cliente</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Status Operacional *</label>
                      <select
                        required
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="ATIVO">Ativo</option>
                        <option value="EM_MANUTENCAO">Em Manutenção</option>
                        <option value="INATIVO">Inativo</option>
                        <option value="VENDIDO">Vendido</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Frota / Contrato</label>
                      <input
                        type="text"
                        placeholder="Ex: Frota Administrativo"
                        value={form.frota}
                        onChange={(e) => setForm({ ...form, frota: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Subfrota / Departamento</label>
                      <input
                        type="text"
                        placeholder="Ex: Diretoria"
                        value={form.subfrota}
                        onChange={(e) => setForm({ ...form, subfrota: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Município Emplacamento</label>
                      <input
                        type="text"
                        value={form.municipio}
                        onChange={(e) => setForm({ ...form, municipio: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">UF Emplacamento</label>
                      <input
                        type="text"
                        maxLength={2}
                        value={form.uf}
                        onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: OBSERVATIONS */}
              {activeTab === 'obs' && (
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Observações do Veículo</label>
                  <textarea
                    rows={6}
                    placeholder="Histórico prévio, avarias, revisões externas ou observações gerais..."
                    value={form.observacoes}
                    onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </form>

            {/* Modal Footer */}
            <div className="p-6 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Check size={16} />
                )}
                Salvar Veículo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
