import { useState, useEffect } from 'react';
import { Truck, Plus, Search, Edit, Trash2, X, Eye, ChevronLeft, ChevronRight, Save, Building, Scale } from 'lucide-react';
import { towingService } from '../../services/towing.service';
import { api } from '../../services/api';
import { authStorage } from '../../utils/auth';
import { toast } from 'sonner';

export function TowingFleet() {
  const user = authStorage.getUser();
  const isAdmin = user?.role === 'ADMIN' || user?.roleAdmin === true;

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [towingTypes, setTowingTypes] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Sorting States
  const [sortField, setSortField] = useState('placa');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    placa: '',
    marca: '',
    modelo: '',
    ano: '',
    towingTypeId: '',
    capacidade: '',
    eixos: '',
    consumoMedio: '',
    status: 'ATIVO',
    rntrcNumero: '',
    rntrcStatus: '',
    rntrcValidade: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vehiclesData, typesData] = await Promise.all([
        towingService.listVehicles(),
        towingService.listTowingTypes()
      ]);
      setVehicles(vehiclesData);
      setTowingTypes(typesData);

      if (isAdmin) {
        const compRes = await api.get('/companies');
        setCompanies(compRes.data);
      }
    } catch (error) {
      toast.error('Erro ao carregar dados da frota');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setSelectedVehicle(null);
    setFormData({
      id: '',
      placa: '',
      marca: '',
      modelo: '',
      ano: '',
      towingTypeId: towingTypes[0]?.id || '',
      capacidade: '',
      eixos: '2',
      consumoMedio: '',
      status: 'ATIVO',
      rntrcNumero: '',
      rntrcStatus: 'ATIVO',
      rntrcValidade: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setFormData({
      id: vehicle.id,
      placa: vehicle.placa || '',
      marca: vehicle.marca || '',
      modelo: vehicle.modelo || '',
      ano: vehicle.ano ? String(vehicle.ano) : '',
      towingTypeId: vehicle.towingTypeId || '',
      capacidade: vehicle.capacidade || '',
      eixos: vehicle.eixos ? String(vehicle.eixos) : '2',
      consumoMedio: vehicle.consumoMedio ? String(vehicle.consumoMedio) : '',
      status: vehicle.status || 'ATIVO',
      rntrcNumero: vehicle.rntrcNumero || '',
      rntrcStatus: vehicle.rntrcStatus || 'ATIVO',
      rntrcValidade: vehicle.rntrcValidade ? new Date(vehicle.rntrcValidade).toISOString().split('T')[0] : ''
    });
    setIsModalOpen(true);
  };

  const handleOpenViewModal = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setIsViewModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsModalOpen(false);
    setIsViewModalOpen(false);
    setSelectedVehicle(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.placa || !formData.modelo) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        ano: formData.ano ? Number(formData.ano) : null,
        eixos: formData.eixos ? Number(formData.eixos) : null,
        consumoMedio: formData.consumoMedio ? Number(formData.consumoMedio) : null,
        rntrcValidade: formData.rntrcValidade || null
      };

      if (formData.id) {
        await towingService.updateVehicle(formData.id, payload);
        toast.success('Veículo atualizado com sucesso!');
      } else {
        await towingService.createVehicle(payload);
        toast.success('Veículo cadastrado com sucesso!');
      }
      loadData();
      handleCloseModals();
    } catch (error: any) {
      const errMsg = error.response?.data?.error || 'Erro ao salvar veículo';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (vehicle: any) => {
    if (window.confirm(`Tem certeza que deseja excluir o veículo de placa ${vehicle.placa}?`)) {
      try {
        await towingService.deleteVehicle(vehicle.id);
        toast.success('Veículo excluído com sucesso!');
        loadData();
      } catch (error) {
        toast.error('Erro ao excluir veículo');
      }
    }
  };

  // Sorting helper
  const handleSort = (field: string) => {
    const isAsc = sortField === field && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(field);
  };

  // Search and Filters Logic
  const filteredVehicles = vehicles.filter(v => {
    const query = searchTerm.toLowerCase();
    const matchesSearch = 
      v.placa?.toLowerCase().includes(query) ||
      v.modelo?.toLowerCase().includes(query) ||
      v.marca?.toLowerCase().includes(query);

    const matchesType = !typeFilter || v.towingTypeId === typeFilter;
    const matchesCompany = !companyFilter || v.companyId === companyFilter;

    return matchesSearch && matchesType && matchesCompany;
  });

  // Sorting Logic
  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === 'towingType') {
      aVal = a.towingType?.name || '';
      bVal = b.towingType?.name || '';
    } else if (sortField === 'company') {
      aVal = a.company?.razaoSocial || '';
      bVal = b.company?.razaoSocial || '';
    }

    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;

    if (typeof aVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    } else {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
  });

  // Pagination Logic
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, companyFilter]);

  const totalPages = Math.ceil(sortedVehicles.length / itemsPerPage);
  const paginatedVehicles = sortedVehicles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="text-primary" />
            Frota de Guinchos
          </h1>
          <p className="text-muted-foreground text-sm">Gerencie os caminhões guincho e veículos de socorro da frota.</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-semibold shadow hover:bg-primary/95 transition w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>Novo Veículo</span>
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Buscar por placa, marca ou modelo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-background border border-border pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-primary text-sm"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Filtro Tipo de Guincho */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-background border border-border px-3 py-2 rounded-lg focus:outline-none focus:border-primary text-sm min-w-[160px] text-foreground"
          >
            <option value="">Todos os Tipos</option>
            {towingTypes.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>

          {/* Filtro Empresa/Tenant (Apenas Admins) */}
          {isAdmin && (
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="bg-background border border-border px-3 py-2 rounded-lg focus:outline-none focus:border-primary text-sm min-w-[200px] text-foreground"
            >
              <option value="">Todas as Empresas</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.nomeFantasia || company.razaoSocial}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Grid Desktop */}
      <div className="hidden md:block bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border text-muted-foreground text-xs uppercase font-semibold">
              <th onClick={() => handleSort('placa')} className="p-4 cursor-pointer hover:bg-muted/30 select-none">Placa</th>
              <th onClick={() => handleSort('marca')} className="p-4 cursor-pointer hover:bg-muted/30 select-none">Marca</th>
              <th onClick={() => handleSort('modelo')} className="p-4 cursor-pointer hover:bg-muted/30 select-none">Modelo</th>
              <th onClick={() => handleSort('ano')} className="p-4 cursor-pointer hover:bg-muted/30 select-none text-center">Ano</th>
              <th onClick={() => handleSort('towingType')} className="p-4 cursor-pointer hover:bg-muted/30 select-none">Tipo de Guincho</th>
              <th onClick={() => handleSort('capacidade')} className="p-4 cursor-pointer hover:bg-muted/30 select-none">Capacidade</th>
              {isAdmin && <th onClick={() => handleSort('company')} className="p-4 cursor-pointer hover:bg-muted/30 select-none">Empresa</th>}
              <th onClick={() => handleSort('status')} className="p-4 cursor-pointer hover:bg-muted/30 select-none text-center">Status</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} className="p-8 text-center text-muted-foreground">Carregando veículos da frota...</td>
              </tr>
            ) : paginatedVehicles.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} className="p-8 text-center text-muted-foreground">Nenhum veículo encontrado.</td>
              </tr>
            ) : (
              paginatedVehicles.map((v) => (
                <tr key={v.id} className="border-b border-border hover:bg-muted/20 transition-colors text-sm">
                  <td className="p-4 font-mono font-bold text-primary">{v.placa}</td>
                  <td className="p-4">{v.marca || '-'}</td>
                  <td className="p-4 font-medium">{v.modelo}</td>
                  <td className="p-4 text-center">{v.ano || '-'}</td>
                  <td className="p-4">
                    <span className="bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 rounded text-xs font-semibold">
                      {v.towingType?.name || v.tipo || '-'}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">{v.capacidade || '-'}</td>
                  {isAdmin && (
                    <td className="p-4 text-xs max-w-[180px] truncate">
                      <div className="font-semibold text-slate-700">{v.company?.nomeFantasia || v.company?.razaoSocial}</div>
                    </td>
                  )}
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      v.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                    }`}>
                      {v.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1.5 justify-end">
                      <button 
                        onClick={() => handleOpenViewModal(v)}
                        className="p-1.5 bg-secondary text-muted-foreground rounded hover:bg-muted transition"
                        title="Visualizar"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        onClick={() => handleOpenEditModal(v)}
                        className="p-1.5 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(v)}
                        className="p-1.5 bg-rose-500/10 text-rose-600 rounded hover:bg-rose-500/20 transition"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Grid Mobile (Cards) */}
      <div className="block md:hidden space-y-4">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-xl">Carregando frota...</div>
        ) : paginatedVehicles.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-xl">Nenhum veículo encontrado.</div>
        ) : (
          paginatedVehicles.map((v) => (
            <div key={v.id} className="bg-card border border-border p-4 rounded-xl space-y-3 shadow-sm hover:border-primary/30 transition">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-mono font-black text-primary text-base">{v.placa}</h4>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{v.marca ? `${v.marca} ` : ''}{v.modelo}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  v.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                }`}>
                  {v.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="text-xs space-y-1 bg-muted/40 p-2.5 rounded-lg border border-border/50">
                {v.ano && <div><span className="text-muted-foreground">Ano:</span> <span className="font-semibold">{v.ano}</span></div>}
                <div>
                  <span className="text-muted-foreground">Tipo:</span>{' '}
                  <span className="font-semibold text-primary">{v.towingType?.name || v.tipo || '-'}</span>
                </div>
                {v.capacidade && <div><span className="text-muted-foreground">Capacidade:</span> <span className="font-semibold">{v.capacidade}</span></div>}
                {isAdmin && (
                  <div className="truncate">
                    <span className="text-muted-foreground">Empresa:</span>{' '}
                    <span className="font-semibold">{v.company?.nomeFantasia || v.company?.razaoSocial}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                <button 
                  onClick={() => handleOpenViewModal(v)}
                  className="p-1.5 bg-secondary text-muted-foreground rounded hover:bg-muted transition text-xs flex items-center gap-1"
                >
                  <Eye size={12} /> Detalhes
                </button>
                <button 
                  onClick={() => handleOpenEditModal(v)}
                  className="p-1.5 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition text-xs flex items-center gap-1"
                >
                  <Edit size={12} /> Editar
                </button>
                <button 
                  onClick={() => handleDelete(v)}
                  className="p-1.5 bg-rose-500/10 text-rose-600 rounded hover:bg-rose-500/20 transition text-xs flex items-center gap-1"
                >
                  <Trash2 size={12} /> Excluir
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Paginação */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-card border border-border p-4 rounded-xl shadow-sm gap-4">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            Mostrando <span className="font-medium text-foreground">{((currentPage - 1) * itemsPerPage) + 1}</span> a{' '}
            <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, filteredVehicles.length)}</span> de{' '}
            <span className="font-medium text-foreground">{filteredVehicles.length}</span> veículos
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition text-foreground"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium px-3 text-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition text-foreground"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8 relative">
            <button 
              onClick={handleCloseModals}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/50 transition z-50"
            >
              <X size={18} />
            </button>
            <div className="p-6 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <Truck className="text-primary" size={22} />
                <h3 className="text-lg font-bold text-foreground">
                  {formData.id ? 'Editar Veículo de Guincho' : 'Cadastrar Novo Guincho'}
                </h3>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Placa <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: ABC-1234"
                    value={formData.placa}
                    onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm uppercase font-mono font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Tipo de Guincho <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={formData.towingTypeId}
                    onChange={(e) => setFormData({ ...formData, towingTypeId: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm text-foreground"
                  >
                    {towingTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Marca</label>
                  <input
                    type="text"
                    placeholder="Ex: Mercedes-Benz"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Modelo <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Accelo 815"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Ano</label>
                  <input
                    type="number"
                    placeholder="Ex: 2020"
                    value={formData.ano}
                    onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm text-foreground"
                  >
                    <option value="ATIVO">Ativo</option>
                    <option value="INATIVO">Inativo</option>
                    <option value="MANUTENCAO">Em Manutenção</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Capacidade Carga (Kg)</label>
                  <input
                    type="text"
                    placeholder="Ex: 4000 Kg"
                    value={formData.capacidade}
                    onChange={(e) => setFormData({ ...formData, capacidade: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Número de Eixos</label>
                  <input
                    type="number"
                    placeholder="Ex: 2"
                    value={formData.eixos}
                    onChange={(e) => setFormData({ ...formData, eixos: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Consumo Médio (Km/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 5.5"
                    value={formData.consumoMedio}
                    onChange={(e) => setFormData({ ...formData, consumoMedio: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4 mt-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Scale size={14} className="text-primary" /> Credenciamento ANTT / RNTRC
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide">Número do Registro</label>
                    <input
                      type="text"
                      placeholder="Número RNTRC"
                      value={formData.rntrcNumero}
                      onChange={(e) => setFormData({ ...formData, rntrcNumero: e.target.value })}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide">Status Registro</label>
                    <select
                      value={formData.rntrcStatus}
                      onChange={(e) => setFormData({ ...formData, rntrcStatus: e.target.value })}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm text-foreground"
                    >
                      <option value="ATIVO">Ativo</option>
                      <option value="PENDENTE">Pendente</option>
                      <option value="VENCIDO">Vencido</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide">Validade Registro</label>
                    <input
                      type="date"
                      value={formData.rntrcValidade}
                      onChange={(e) => setFormData({ ...formData, rntrcValidade: e.target.value })}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={handleCloseModals}
                  className="px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-muted text-foreground transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                  <Save size={16} />
                  <span>{submitting ? 'Salvando...' : 'Salvar Veículo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visualização Detalhada */}
      {isViewModalOpen && selectedVehicle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 relative">
            <button 
              onClick={handleCloseModals}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/50 transition z-50"
            >
              <X size={18} />
            </button>
            <div className="p-6 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <Truck className="text-primary" size={22} />
                <h3 className="text-lg font-bold text-foreground">Ficha do Veículo Guincho</h3>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-sm">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Placa do Veículo</span>
                  <div className="font-mono text-2xl font-black text-slate-800 tracking-wider mt-0.5">{selectedVehicle.placa}</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  selectedVehicle.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                }`}>
                  {selectedVehicle.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block">Marca / Fabricante</span>
                  <span className="font-bold text-foreground text-sm mt-0.5 block">{selectedVehicle.marca || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block">Modelo</span>
                  <span className="font-bold text-foreground text-sm mt-0.5 block">{selectedVehicle.modelo}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block">Ano</span>
                  <span className="font-semibold text-foreground text-sm mt-0.5 block">{selectedVehicle.ano || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block">Tipo de Guincho</span>
                  <span className="font-semibold text-primary text-sm mt-0.5 block">
                    {selectedVehicle.towingType?.name || selectedVehicle.tipo}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block">Capacidade de Carga</span>
                  <span className="font-semibold text-foreground text-sm mt-0.5 block">{selectedVehicle.capacidade || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block">Número de Eixos</span>
                  <span className="font-semibold text-foreground text-sm mt-0.5 block">{selectedVehicle.eixos || '2'} eixos</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block">Consumo Médio</span>
                  <span className="font-semibold text-foreground text-sm mt-0.5 block">
                    {selectedVehicle.consumoMedio ? `${selectedVehicle.consumoMedio} Km/L` : 'Não informado'}
                  </span>
                </div>
                {isAdmin && (
                  <div className="col-span-2 border-t pt-3 flex items-start gap-2">
                    <Building size={16} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground block">Empresa Emitente</span>
                      <span className="font-bold text-foreground text-xs mt-0.5 block">
                        {selectedVehicle.company?.razaoSocial} ({selectedVehicle.company?.cnpj})
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {(selectedVehicle.rntrcNumero) && (
                <div className="border-t border-border pt-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Scale size={14} className="text-primary" /> Credenciamento ANTT / RNTRC
                  </h4>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-6 bg-slate-50 border p-3 rounded-lg text-xs">
                    <div className="col-span-2">
                      <span className="text-muted-foreground font-semibold">Número do Registro:</span>{' '}
                      <span className="font-bold text-slate-800">{selectedVehicle.rntrcNumero}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-semibold">Status:</span>{' '}
                      <span className="font-bold text-slate-800">{selectedVehicle.rntrcStatus || 'ATIVO'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-semibold">Validade:</span>{' '}
                      <span className="font-bold text-slate-800">
                        {selectedVehicle.rntrcValidade ? new Date(selectedVehicle.rntrcValidade).toLocaleDateString('pt-BR') : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={handleCloseModals}
                  className="px-5 py-2 bg-secondary text-foreground hover:bg-muted border border-border rounded-lg text-sm font-semibold transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
