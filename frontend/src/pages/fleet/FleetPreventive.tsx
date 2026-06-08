import { useState, useEffect } from 'react';
import { Plus, Wrench, ShieldAlert, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function FleetPreventive() {
  const [activeTab, setActiveTab] = useState<'motor' | 'cambio'>('motor');
  const [motorChanges, setMotorChanges] = useState<any[]>([]);
  const [gearChanges, setGearChanges] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [workshops, setWorkshops] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Modals
  const [isMotorModalOpen, setIsMotorModalOpen] = useState(false);
  const [isGearModalOpen, setIsGearModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms
  const [motorForm, setMotorForm] = useState({
    veiculoId: '',
    dataTroca: new Date().toISOString().substring(0, 10),
    kmTroca: 0,
    tipoOleo: '',
    quantidade: 4.5,
    proximaTrocaKm: 10000,
    proximaTrocaData: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().substring(0, 10),
    oficinaId: '',
    valor: 0,
    observacoes: ''
  });

  const [gearForm, setGearForm] = useState({
    veiculoId: '',
    tipoCambio: 'AUTOMATICO', // MANUAL, AUTOMATICO, CVT
    dataTroca: new Date().toISOString().substring(0, 10),
    kmTroca: 0,
    oleoUtilizado: '',
    quantidade: 6.0,
    proximaTrocaKm: 50000,
    proximaTrocaData: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().substring(0, 10),
    oficinaId: '',
    valor: 0,
    observacoes: ''
  });

  const [selectedMotorOwnerId, setSelectedMotorOwnerId] = useState('');
  const [selectedGearOwnerId, setSelectedGearOwnerId] = useState('');

  const uniqueOwners = Array.from(
    new Map(
      vehicles
        .filter((v) => v.client)
        .map((v) => [v.client.id, v.client])
    ).values()
  ) as any[];

  const filteredMotorVehicles = selectedMotorOwnerId
    ? vehicles.filter((v) => v.client?.id === selectedMotorOwnerId)
    : vehicles;

  const filteredGearVehicles = selectedGearOwnerId
    ? vehicles.filter((v) => v.client?.id === selectedGearOwnerId)
    : vehicles;

  const handleMotorOwnerChange = (ownerId: string) => {
    setSelectedMotorOwnerId(ownerId);
    const filtered = ownerId 
      ? vehicles.filter((v) => v.client?.id === ownerId) 
      : vehicles;
    
    if (filtered.length > 0) {
      setMotorForm((prev) => ({ ...prev, veiculoId: filtered[0].id }));
    } else {
      setMotorForm((prev) => ({ ...prev, veiculoId: '' }));
    }
  };

  const handleGearOwnerChange = (ownerId: string) => {
    setSelectedGearOwnerId(ownerId);
    const filtered = ownerId 
      ? vehicles.filter((v) => v.client?.id === ownerId) 
      : vehicles;
    
    if (filtered.length > 0) {
      setGearForm((prev) => ({ ...prev, veiculoId: filtered[0].id }));
    } else {
      setGearForm((prev) => ({ ...prev, veiculoId: '' }));
    }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [resMotor, resGear, resVehicles, resWorkshops] = await Promise.all([
        fetch('/fleet/preventive/motor', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/fleet/preventive/gear', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/fleet/vehicles', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/fleet/workshops', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (resMotor.ok) setMotorChanges(await resMotor.json());
      if (resGear.ok) setGearChanges(await resGear.json());
      if (resVehicles.ok) {
        const vData = await resVehicles.json();
        setVehicles(vData);
        if (vData.length > 0) {
          setMotorForm((prev) => ({ ...prev, veiculoId: vData[0].id }));
          setGearForm((prev) => ({ ...prev, veiculoId: vData[0].id }));
        }
      }
      if (resWorkshops.ok) {
        const wData = await resWorkshops.json();
        setWorkshops(wData);
        if (wData.length > 0) {
          setMotorForm((prev) => ({ ...prev, oficinaId: wData[0].id }));
          setGearForm((prev) => ({ ...prev, oficinaId: wData[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados de preventiva.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateMotorChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motorForm.veiculoId || !motorForm.oficinaId) {
      toast.warning('Selecione o veículo e a oficina.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/fleet/preventive/motor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...motorForm,
          kmTroca: Number(motorForm.kmTroca),
          proximaTrocaKm: Number(motorForm.proximaTrocaKm),
          quantidade: motorForm.quantidade > 0 ? Number(motorForm.quantidade) : null,
          valor: Number(motorForm.valor)
        })
      });

      if (res.ok) {
        toast.success('Troca de óleo do motor registrada com sucesso!');
        setIsMotorModalOpen(false);
        fetchData();
      } else {
        toast.error('Erro ao salvar troca de óleo.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGearChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gearForm.veiculoId || !gearForm.oficinaId) {
      toast.warning('Selecione o veículo e a oficina.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/fleet/preventive/gear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...gearForm,
          kmTroca: Number(gearForm.kmTroca),
          proximaTrocaKm: Number(gearForm.proximaTrocaKm),
          quantidade: gearForm.quantidade > 0 ? Number(gearForm.quantidade) : null,
          valor: Number(gearForm.valor)
        })
      });

      if (res.ok) {
        toast.success('Troca de óleo do câmbio registrada com sucesso!');
        setIsGearModalOpen(false);
        fetchData();
      } else {
        toast.error('Erro ao salvar troca de óleo.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getOilChangeStatus = (currentKm: number, nextKm: number, nextDateStr: string) => {
    const nextDate = new Date(nextDateStr);
    const now = new Date();
    
    if (currentKm >= nextKm || now > nextDate) {
      return { label: 'Atrasado', color: 'bg-rose-500 text-white', indicator: 'text-rose-500' };
    }
    
    if (nextKm - currentKm <= 1000) {
      return { label: 'Próximo da Troca', color: 'bg-amber-500 text-white', indicator: 'text-amber-500' };
    }

    return { label: 'Em dia', color: 'bg-green-500 text-white', indicator: 'text-green-500' };
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Aggregated Counters
  const motorAlerts = motorChanges.filter((m) => {
    const status = getOilChangeStatus(m.veiculo.kmAtual, m.proximaTrocaKm, m.proximaTrocaData);
    return status.label === 'Atrasado';
  }).length;

  const gearAlerts = gearChanges.filter((g) => {
    const status = getOilChangeStatus(g.veiculo.kmAtual, g.proximaTrocaKm, g.proximaTrocaData);
    return status.label === 'Atrasado';
  }).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">Manutenção Preventiva</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Monitore e registre a troca de óleo de motor e câmbio.</p>
        </div>
        
        <button
          onClick={() => activeTab === 'motor' ? setIsMotorModalOpen(true) : setIsGearModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
        >
          <Plus size={18} />
          Registrar Troca de Óleo
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('motor')}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition -mb-px flex items-center gap-2 ${
            activeTab === 'motor'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          Óleo de Motor
          {motorAlerts > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">{motorAlerts}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('cambio')}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition -mb-px flex items-center gap-2 ${
            activeTab === 'cambio'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          Óleo de Câmbio
          {gearAlerts > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">{gearAlerts}</span>
          )}
        </button>
      </div>

      {/* Summary Alert Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider block">Status Geral</span>
            <span className="text-lg font-bold text-gray-800 dark:text-white block">Óleos Lançados</span>
            <span className="text-xs text-indigo-500 font-medium">Controle de Vida Útil</span>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-3 rounded-lg">
            <Sparkles size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider block">Motor</span>
            <span className="text-lg font-bold text-gray-800 dark:text-white block">{motorChanges.length} Trocas</span>
            <span className={`text-xs font-semibold ${motorAlerts > 0 ? 'text-rose-500' : 'text-green-500'}`}>
              {motorAlerts} veículos atrasados
            </span>
          </div>
          <div className={`p-3 rounded-lg ${motorAlerts > 0 ? 'bg-rose-50 text-rose-600' : 'bg-green-50 text-green-600'}`}>
            <ShieldAlert size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider block">Câmbio</span>
            <span className="text-lg font-bold text-gray-800 dark:text-white block">{gearChanges.length} Trocas</span>
            <span className={`text-xs font-semibold ${gearAlerts > 0 ? 'text-rose-500' : 'text-green-500'}`}>
              {gearAlerts} veículos atrasados
            </span>
          </div>
          <div className={`p-3 rounded-lg ${gearAlerts > 0 ? 'bg-rose-50 text-rose-600' : 'bg-green-50 text-green-600'}`}>
            <Wrench size={20} />
          </div>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div>
        </div>
      ) : activeTab === 'motor' ? (
        /* MOTOR OIL LIST */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="w-full">
            <table className="w-full text-left border-collapse text-sm table-fixed break-words">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 font-bold uppercase tracking-wider text-xs border-b border-gray-100 dark:border-gray-700">
                  <th className="p-4 w-4/12 md:w-3/12 lg:w-2/12">Veículo / Placa</th>
                  <th className="p-4 hidden md:table-cell w-2/12 lg:w-1/12">KM Troca</th>
                  <th className="p-4 w-4/12 md:w-3/12 lg:w-2/12">Óleo Utilizado</th>
                  <th className="p-4 hidden sm:table-cell w-3/12 md:w-2/12">Próxima Troca</th>
                  <th className="p-4 hidden lg:table-cell w-2/12">Oficina / Responsável</th>
                  <th className="p-4 hidden lg:table-cell w-1/12">Valor</th>
                  <th className="p-4 w-4/12 sm:w-3/12 md:w-2/12 text-center md:text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {motorChanges.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">Nenhum registro de troca de óleo de motor encontrado.</td>
                  </tr>
                ) : (
                  motorChanges.map((m) => {
                    const status = getOilChangeStatus(m.veiculo.kmAtual, m.proximaTrocaKm, m.proximaTrocaData);
                    return (
                      <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition">
                        <td className="p-4 font-bold text-gray-800 dark:text-white truncate">
                          <span className="block truncate">{m.veiculo.marca} {m.veiculo.modelo}</span>
                          <span className="text-xs text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded font-black mt-0.5 inline-block truncate">{m.veiculo.placa}</span>
                        </td>
                        <td className="p-4 font-semibold hidden md:table-cell truncate">{m.kmTroca.toLocaleString('pt-BR')} KM</td>
                        <td className="p-4 text-gray-600 dark:text-gray-400 truncate">
                          <span className="block font-semibold truncate">{m.tipoOleo || '—'}</span>
                          <span className="text-xs text-gray-400 truncate">{m.quantidade ? `${m.quantidade} L` : ''}</span>
                        </td>
                        <td className="p-4 hidden sm:table-cell truncate">
                          <span className="block font-bold truncate">{m.proximaTrocaKm.toLocaleString('pt-BR')} KM</span>
                          <span className="text-xs text-gray-400 truncate">{new Date(m.proximaTrocaData).toLocaleDateString('pt-BR')}</span>
                        </td>
                        <td className="p-4 text-gray-600 dark:text-gray-400 font-medium hidden lg:table-cell truncate">{m.oficina?.nome || '—'}</td>
                        <td className="p-4 font-bold text-gray-800 dark:text-white hidden lg:table-cell truncate">{formatCurrency(m.valor)}</td>
                        <td className="p-4 text-center md:text-left truncate">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase truncate block w-fit mx-auto md:mx-0 ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GEAR OIL LIST */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="w-full">
            <table className="w-full text-left border-collapse text-sm table-fixed break-words">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 font-bold uppercase tracking-wider text-xs border-b border-gray-100 dark:border-gray-700">
                  <th className="p-4 w-4/12 md:w-3/12 lg:w-2/12">Veículo / Placa</th>
                  <th className="p-4 hidden lg:table-cell w-1/12">Câmbio</th>
                  <th className="p-4 hidden md:table-cell w-2/12 lg:w-1/12">KM Troca</th>
                  <th className="p-4 w-4/12 md:w-3/12 lg:w-2/12">Óleo Utilizado</th>
                  <th className="p-4 hidden sm:table-cell w-3/12 md:w-2/12">Próxima Troca</th>
                  <th className="p-4 hidden lg:table-cell w-2/12">Oficina</th>
                  <th className="p-4 hidden xl:table-cell w-1/12">Valor</th>
                  <th className="p-4 w-4/12 sm:w-3/12 md:w-2/12 text-center md:text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {gearChanges.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400">Nenhum registro de troca de óleo de câmbio encontrado.</td>
                  </tr>
                ) : (
                  gearChanges.map((g) => {
                    const status = getOilChangeStatus(g.veiculo.kmAtual, g.proximaTrocaKm, g.proximaTrocaData);
                    return (
                      <tr key={g.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition">
                        <td className="p-4 font-bold text-gray-800 dark:text-white truncate">
                          <span className="block truncate">{g.veiculo.marca} {g.veiculo.modelo}</span>
                          <span className="text-xs text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded font-black mt-0.5 inline-block truncate">{g.veiculo.placa}</span>
                        </td>
                        <td className="p-4 font-bold text-indigo-700 dark:text-indigo-400 text-xs uppercase hidden lg:table-cell truncate">{g.tipoCambio}</td>
                        <td className="p-4 font-semibold hidden md:table-cell truncate">{g.kmTroca.toLocaleString('pt-BR')} KM</td>
                        <td className="p-4 text-gray-600 dark:text-gray-400 truncate">
                          <span className="block font-semibold truncate">{g.oleoUtilizado || '—'}</span>
                          <span className="text-xs text-gray-400 truncate">{g.quantidade ? `${g.quantidade} L` : ''}</span>
                        </td>
                        <td className="p-4 hidden sm:table-cell truncate">
                          <span className="block font-bold truncate">{g.proximaTrocaKm.toLocaleString('pt-BR')} KM</span>
                          <span className="text-xs text-gray-400 truncate">{new Date(g.proximaTrocaData).toLocaleDateString('pt-BR')}</span>
                        </td>
                        <td className="p-4 text-gray-600 dark:text-gray-400 font-medium hidden lg:table-cell truncate">{g.oficina?.nome || '—'}</td>
                        <td className="p-4 font-bold text-gray-800 dark:text-white hidden xl:table-cell truncate">{formatCurrency(g.valor)}</td>
                        <td className="p-4 text-center md:text-left truncate">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase truncate block w-fit mx-auto md:mx-0 ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Motor Oil Change Modal */}
      {isMotorModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
              <h2 className="text-lg font-bold">Registrar Troca de Óleo do Motor</h2>
              <button onClick={() => setIsMotorModalOpen(false)} className="text-white/85 hover:text-white transition">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateMotorChange} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Proprietário (Cliente)</label>
                <select
                  value={selectedMotorOwnerId}
                  onChange={(e) => handleMotorOwnerChange(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">Todos os Clientes / Frotas</option>
                  {uniqueOwners.map((owner) => (
                    <option key={owner.id} value={owner.id}>{owner.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Veículo da Frota *</label>
                <select
                  required
                  value={motorForm.veiculoId}
                  onChange={(e) => setMotorForm({ ...motorForm, veiculoId: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione o Veículo</option>
                  {filteredMotorVehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.marca} {v.modelo} [{v.placa}]</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Data da Troca *</label>
                  <input
                    type="date"
                    required
                    value={motorForm.dataTroca}
                    onChange={(e) => setMotorForm({ ...motorForm, dataTroca: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Quilometragem da Troca *</label>
                  <input
                    type="number"
                    required
                    value={motorForm.kmTroca}
                    onChange={(e) => setMotorForm({ ...motorForm, kmTroca: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Tipo de Óleo Utilizado</label>
                  <input
                    type="text"
                    placeholder="Ex: 5W30 Sintético"
                    value={motorForm.tipoOleo}
                    onChange={(e) => setMotorForm({ ...motorForm, tipoOleo: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Quantidade (Litros)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={motorForm.quantidade}
                    onChange={(e) => setMotorForm({ ...motorForm, quantidade: parseFloat(e.target.value) || 4.5 })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Próxima Troca (KM) *</label>
                  <input
                    type="number"
                    required
                    value={motorForm.proximaTrocaKm}
                    onChange={(e) => setMotorForm({ ...motorForm, proximaTrocaKm: parseInt(e.target.value) || 10000 })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Próxima Troca (Data) *</label>
                  <input
                    type="date"
                    required
                    value={motorForm.proximaTrocaData}
                    onChange={(e) => setMotorForm({ ...motorForm, proximaTrocaData: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Oficina Responsável *</label>
                  <select
                    required
                    value={motorForm.oficinaId}
                    onChange={(e) => setMotorForm({ ...motorForm, oficinaId: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecione a Oficina</option>
                    {workshops.map((w) => (
                      <option key={w.id} value={w.id}>{w.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Valor Lançado (BRL)</label>
                  <input
                    type="number"
                    value={motorForm.valor}
                    onChange={(e) => setMotorForm({ ...motorForm, valor: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Observações gerais</label>
                <textarea
                  rows={2}
                  value={motorForm.observacoes}
                  onChange={(e) => setMotorForm({ ...motorForm, observacoes: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsMotorModalOpen(false)}
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
                    <Check size={16} />
                  )}
                  Salvar Troca
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gear Oil Change Modal */}
      {isGearModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
              <h2 className="text-lg font-bold">Registrar Troca de Óleo do Câmbio</h2>
              <button onClick={() => setIsGearModalOpen(false)} className="text-white/85 hover:text-white transition">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateGearChange} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Proprietário (Cliente)</label>
                <select
                  value={selectedGearOwnerId}
                  onChange={(e) => handleGearOwnerChange(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">Todos os Clientes / Frotas</option>
                  {uniqueOwners.map((owner) => (
                    <option key={owner.id} value={owner.id}>{owner.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Veículo da Frota *</label>
                <select
                  required
                  value={gearForm.veiculoId}
                  onChange={(e) => setGearForm({ ...gearForm, veiculoId: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione o Veículo</option>
                  {filteredGearVehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.marca} {v.modelo} [{v.placa}]</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Tipo de Câmbio *</label>
                  <select
                    required
                    value={gearForm.tipoCambio}
                    onChange={(e) => setGearForm({ ...gearForm, tipoCambio: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="MANUAL">Manual</option>
                    <option value="AUTOMATICO">Automático</option>
                    <option value="CVT">CVT</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400 font-medium">KM da Troca *</label>
                  <input
                    type="number"
                    required
                    value={gearForm.kmTroca}
                    onChange={(e) => setGearForm({ ...gearForm, kmTroca: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Data da Troca *</label>
                  <input
                    type="date"
                    required
                    value={gearForm.dataTroca}
                    onChange={(e) => setGearForm({ ...gearForm, dataTroca: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Óleo Utilizado</label>
                  <input
                    type="text"
                    placeholder="Ex: ATF Dexron VI"
                    value={gearForm.oleoUtilizado}
                    onChange={(e) => setGearForm({ ...gearForm, oleoUtilizado: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Próxima Troca (KM) *</label>
                  <input
                    type="number"
                    required
                    value={gearForm.proximaTrocaKm}
                    onChange={(e) => setGearForm({ ...gearForm, proximaTrocaKm: parseInt(e.target.value) || 50000 })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400 font-medium">Próxima Troca (Data) *</label>
                  <input
                    type="date"
                    required
                    value={gearForm.proximaTrocaData}
                    onChange={(e) => setGearForm({ ...gearForm, proximaTrocaData: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Oficina Responsável *</label>
                  <select
                    required
                    value={gearForm.oficinaId}
                    onChange={(e) => setGearForm({ ...gearForm, oficinaId: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecione a Oficina</option>
                    {workshops.map((w) => (
                      <option key={w.id} value={w.id}>{w.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Valor Lançado (BRL)</label>
                  <input
                    type="number"
                    value={gearForm.valor}
                    onChange={(e) => setGearForm({ ...gearForm, valor: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Observações gerais</label>
                <textarea
                  rows={2}
                  value={gearForm.observacoes}
                  onChange={(e) => setGearForm({ ...gearForm, observacoes: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsGearModalOpen(false)}
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
                    <Check size={16} />
                  )}
                  Salvar Troca
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
