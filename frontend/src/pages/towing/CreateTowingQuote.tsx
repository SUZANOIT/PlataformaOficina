import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Truck, MapPin, DollarSign, Save, Calculator, Car, User, 
  Scale, AlertTriangle, CheckCircle2, FileText, Calendar, 
  Building, UserCheck, Play, ClipboardCheck
} from 'lucide-react';
import { towingService } from '../../services/towing.service';
import { googleMapsService } from '../../services/google-maps.service';
import { anttService } from '../../services/antt.service';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { authStorage } from '../../utils/auth';

export function CreateTowingQuote() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const user = authStorage.getUser();

  const [formData, setFormData] = useState<any>({
    clienteNome: '',
    clienteEmpresa: '',
    clienteTelefone: '',
    clienteEmail: '',
    clienteDoc: '',
    origemCep: '',
    origemEndereco: '',
    origemNumero: '',
    origemComplemento: '',
    origemCidade: '',
    origemEstado: '',
    destinoCep: '',
    destinoEndereco: '',
    destinoNumero: '',
    destinoComplemento: '',
    destinoCidade: '',
    destinoEstado: '',
    distanciaKm: 0,
    tempoEstimadoMin: 0,
    veiculoPlaca: '',
    veiculoMarca: '',
    veiculoModelo: '',
    veiculoCor: '',
    veiculoAno: '',
    tipoGuincho: '', // Placa do guincho da frota
    towingTypeId: '', // ID do tipo de guincho
    driverId: null,
    vehicleId: null,
    taxaSaida: 0,
    valorKm: 0,
    horasParadas: 0,
    valorHoraParada: 0,
    pedagios: 0,
    qtdPedagios: 0,
    despesasExtras: 0,
    descontos: 0,
    acrescimos: 0,
    impostos: 0,
    valorTotal: 0,
    observacoes: '',
    status: 'Orçamento',

    // ANTT
    anttTipoCarga: 'Veículos',
    anttEixos: 2,
    anttComposicao: false,
    anttAltoDesempenho: false,
    anttRetornoVazio: false,
    anttPisoMinimo: 0
  });

  const [rates, setRates] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [towingTypes, setTowingTypes] = useState<any[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeMap, setRouteMap] = useState<{ origin: string; destination: string } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    towingService.listRates().then(setRates).catch(console.error);
    towingService.listVehicles().then(setVehicles).catch(console.error);
    towingService.listDrivers().then(setDrivers).catch(console.error);
    towingService.listTowingTypes().then(setTowingTypes).catch(console.error);
    api.get('/registry/clients').then(res => setClients(res.data)).catch(console.error);

    if (isEditing) {
      towingService.getQuote(id).then(data => {
        setFormData(data);
        if (data.origemEndereco && data.destinoEndereco) {
          const origin = `${data.origemEndereco}, ${data.origemNumero || ''}, ${data.origemCidade} - ${data.origemEstado}`;
          const destination = `${data.destinoEndereco}, ${data.destinoNumero || ''}, ${data.destinoCidade} - ${data.destinoEstado}`;
          setRouteMap({ origin, destination });
        }
      }).catch(console.error);
    }
  }, [id, isEditing]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => {
      const next = { ...prev, [field]: value };
      
      // Auto-fill client details
      if (field === 'clienteNome') {
        const client = clients.find(c => c.nome === value || c.nomeFantasia === value);
        if (client) {
          next.clienteTelefone = client.telefone || '';
          next.clienteEmail = client.email || '';
          next.clienteDoc = client.cpfCnpj || '';
          next.clienteEmpresa = client.razaoSocial || client.nomeFantasia || '';
        }
      }

      // Auto-fill CEP Origem
      if (field === 'origemCep') {
        const cep = value.replace(/\D/g, '');
        if (cep.length === 8) {
          fetch(`https://viacep.com.br/ws/${cep}/json/`)
            .then(res => res.json())
            .then(data => {
              if (!data.erro) {
                setFormData((p: any) => ({
                  ...p,
                  origemEndereco: data.logradouro,
                  origemComplemento: p.origemComplemento || data.bairro, // Map Bairro to Complemento
                  origemCidade: data.localidade,
                  origemEstado: data.uf,
                }));
              }
            }).catch(console.error);
        }
      }

      // Auto-fill CEP Destino
      if (field === 'destinoCep') {
        const cep = value.replace(/\D/g, '');
        if (cep.length === 8) {
          fetch(`https://viacep.com.br/ws/${cep}/json/`)
            .then(res => res.json())
            .then(data => {
              if (!data.erro) {
                setFormData((p: any) => ({
                  ...p,
                  destinoEndereco: data.logradouro,
                  destinoComplemento: p.destinoComplemento || data.bairro, // Map Bairro to Complemento
                  destinoCidade: data.localidade,
                  destinoEstado: data.uf,
                }));
              }
            }).catch(console.error);
        }
      }

      return next;
    });
  };

  const handleVehicleChange = (placa: string) => {
    const vehicle = vehicles.find(v => v.placa === placa);
    setFormData((prev: any) => {
      const next = { ...prev, tipoGuincho: placa, vehicleId: vehicle ? vehicle.id : null };
      if (vehicle) {
        next.towingTypeId = vehicle.towingTypeId || '';
        next.anttEixos = vehicle.eixos || 2;
        // Auto-escalate driver if vehicle has one assigned (if schema/db supported, else keep current)
        // Find rate for this towing type
        const rate = rates.find(r => 
          (r.towingTypeId && r.towingTypeId === vehicle.towingTypeId) || 
          r.tipoGuincho.toLowerCase() === vehicle.towingType?.name?.toLowerCase() ||
          r.tipoGuincho.toLowerCase() === vehicle.tipo?.toLowerCase()
        );
        if (rate) {
          next.taxaSaida = rate.taxaSaida;
          next.valorKm = rate.valorKm;
          next.valorHoraParada = rate.valorHoraParada;
        }
      } else {
        next.vehicleId = null;
      }
      return next;
    });
  };

  const handleTowingTypeChange = (towingTypeId: string) => {
    const type = towingTypes.find(t => t.id === towingTypeId);
    setFormData((prev: any) => {
      const next = { ...prev, towingTypeId };
      const typeName = type?.name || '';
      
      // Find rate for this towing type
      const rate = rates.find(r => 
        (r.towingTypeId && r.towingTypeId === towingTypeId) || 
        r.tipoGuincho.toLowerCase() === typeName.toLowerCase()
      );
      if (rate) {
        next.taxaSaida = rate.taxaSaida;
        next.valorKm = rate.valorKm;
        next.valorHoraParada = rate.valorHoraParada;
      }
      return next;
    });
  };

  const calculateRoute = async () => {
    if (!formData.tipoGuincho) {
      toast.error('Selecione ou digite um veículo de guincho antes de calcular a rota.');
      return;
    }
    if (!formData.origemEndereco || !formData.origemCidade || !formData.destinoEndereco || !formData.destinoCidade) {
      toast.error('Preencha os endereços de origem e destino corretamente.');
      return;
    }

    const origin = `${formData.origemEndereco}, ${formData.origemNumero || ''}, ${formData.origemCidade} - ${formData.origemEstado}`;
    const destination = `${formData.destinoEndereco}, ${formData.destinoNumero || ''}, ${formData.destinoCidade} - ${formData.destinoEstado}`;

    setIsCalculating(true);
    try {
      const { distanceKm, durationMin, tollCost } = await googleMapsService.computeRouteWithTolls(origin, destination);
      
      const selectedVehicle = vehicles.find((v: any) => v.placa === formData.tipoGuincho);
      const eixos = selectedVehicle?.eixos || formData.anttEixos || 2;
      const baseTollPerAxle = tollCost / 2;
      const finalToll = baseTollPerAxle * eixos;
      const estimatedQtd = tollCost > 0 ? Math.max(1, Math.ceil(tollCost / 15)) : 0;

      setFormData((prev: any) => ({ 
        ...prev, 
        distanciaKm: Number(distanceKm.toFixed(2)), 
        tempoEstimadoMin: durationMin,
        pedagios: Number(finalToll.toFixed(2)),
        qtdPedagios: estimatedQtd
      }));
      setRouteMap({ origin, destination });
      toast.success(`Rota calculada com sucesso! Pedágios estimados para ${eixos} eixos.`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao calcular rota.');
    } finally {
      setIsCalculating(false);
    }
  };

  const locateOnMap = (type: 'origem' | 'destino') => {
    const address = type === 'origem' 
      ? `${formData.origemEndereco || ''}, ${formData.origemNumero || ''}, ${formData.origemCidade || ''} - ${formData.origemEstado || ''}`
      : `${formData.destinoEndereco || ''}, ${formData.destinoNumero || ''}, ${formData.destinoCidade || ''} - ${formData.destinoEstado || ''}`;
    
    if (type === 'origem' ? !formData.origemEndereco : !formData.destinoEndereco) {
      toast.error('Informe o endereço antes de localizar.');
      return;
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  useEffect(() => {
    // Recalculate totals
    const total = 
      Number(formData.taxaSaida || 0) + 
      (Number(formData.distanciaKm || 0) * Number(formData.valorKm || 0)) + 
      (Number(formData.horasParadas || 0) * Number(formData.valorHoraParada || 0)) + 
      Number(formData.pedagios || 0) + 
      Number(formData.despesasExtras || 0) + 
      Number(formData.acrescimos || 0) + 
      Number(formData.impostos || 0) - 
      Number(formData.descontos || 0);
      
    // Calculate ANTT Floor
    const anttFloor = anttService.calculateFloor(
      Number(formData.distanciaKm || 0),
      Number(formData.anttEixos || 2),
      formData.anttTipoCarga as any,
      formData.anttRetornoVazio,
      formData.anttAltoDesempenho,
      formData.anttComposicao
    );
      
    setFormData((prev: any) => {
      if (prev.valorTotal === total && prev.anttPisoMinimo === anttFloor) return prev;
      return { ...prev, valorTotal: total, anttPisoMinimo: anttFloor };
    });
  }, [
    formData.taxaSaida, formData.distanciaKm, formData.valorKm, 
    formData.horasParadas, formData.valorHoraParada, formData.pedagios, 
    formData.despesasExtras, formData.acrescimos, formData.descontos, formData.impostos,
    formData.anttTipoCarga, formData.anttEixos, formData.anttComposicao,
    formData.anttAltoDesempenho, formData.anttRetornoVazio
  ]);

  const handleSave = async (approve = false) => {
    // Business rules validation
    if (!formData.clienteNome) {
      toast.error('O cliente é obrigatório para salvar o orçamento.');
      return;
    }
    if (!formData.origemEndereco || !formData.origemCidade || !formData.origemEstado) {
      toast.error('O endereço de origem é obrigatório.');
      return;
    }
    if (!formData.destinoEndereco || !formData.destinoCidade || !formData.destinoEstado) {
      toast.error('O endereço de destino é obrigatório.');
      return;
    }
    if (!formData.veiculoModelo) {
      toast.error('O veículo a ser transportado é obrigatório.');
      return;
    }
    if (!formData.tipoGuincho) {
      toast.error('Selecione ou informe o veículo de guincho.');
      return;
    }

    if (approve) {
      if (!formData.distanciaKm || formData.distanciaKm <= 0) {
        toast.error('Não é possível aprovar o orçamento sem calcular a rota e distância.');
        return;
      }
    }

    try {
      const payload = {
        ...formData,
        status: approve ? 'Aprovado' : formData.status || 'Orçamento'
      };

      if (isEditing) {
        await towingService.updateQuote(id, payload);
        toast.success(approve ? 'Orçamento atualizado e aprovado!' : 'Orçamento atualizado com sucesso!');
      } else {
        await towingService.createQuote(payload);
        toast.success(approve ? 'Orçamento criado e aprovado!' : 'Orçamento criado com sucesso!');
      }
      navigate('/towing/quotes');
    } catch (error: any) {
      const errMsg = error.response?.data?.error || 'Erro ao salvar orçamento';
      toast.error(errMsg);
    }
  };

  const filteredVehiclesForDropdown = vehicles.filter(v => {
    if (!formData.tipoGuincho) return true;
    const query = formData.tipoGuincho.toLowerCase();
    return (
      v.placa?.toLowerCase().includes(query) ||
      v.modelo?.toLowerCase().includes(query) ||
      v.marca?.toLowerCase().includes(query) ||
      (v.towingType?.name || v.tipo || '').toLowerCase().includes(query)
    );
  });

  const selectedDriver = drivers.find(d => d.id === formData.driverId);
  const companyName = (user?.company?.nome as string) || (user?.company?.razaoSocial as string) || 'MCA Gestão de Frotas';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card border border-border p-5 rounded-2xl shadow-sm gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Truck className="text-primary" size={24} />
            <h1 className="text-xl font-bold text-foreground">
              {isEditing ? 'Editar Orçamento de Guincho' : 'Novo Orçamento de Guincho'}
            </h1>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <ClipboardCheck size={14} className="text-muted-foreground" />
              Nº: <strong className="text-foreground">
                {formData.numeroFormatado || (formData.numeroSequencial ? `ORC-GUI-${new Date(formData.createdAt || Date.now()).getFullYear()}-${formData.numeroSequencial.toString().padStart(6, '0')}` : 'Novo')}
              </strong>
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              Data/Hora: <strong className="text-foreground">
                {formData.createdAt ? new Date(formData.createdAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}
              </strong>
            </span>
            <span className="flex items-center gap-1">
              <Building size={14} />
              Empresa: <strong className="text-foreground">{companyName}</strong>
            </span>
            <span className="flex items-center gap-1">
              <UserCheck size={14} />
              Responsável: <strong className="text-foreground">{user?.nome || '—'}</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold mr-2 flex items-center justify-center ${
            formData.status === 'Aprovado' || formData.status === 'Cobertura'
              ? 'bg-emerald-500/10 text-emerald-600'
              : formData.status === 'Rejeitado'
              ? 'bg-rose-500/10 text-rose-600'
              : 'bg-blue-500/10 text-blue-600'
          }`}>
            {formData.status || 'Orçamento'}
          </span>
          <button 
            onClick={() => navigate('/towing/quotes')} 
            className="flex-1 md:flex-none px-4 py-2 border border-border text-foreground hover:bg-muted text-sm font-semibold rounded-lg transition"
          >
            Cancelar
          </button>
          <button 
            onClick={() => handleSave(false)} 
            className="flex-1 md:flex-none px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2"
          >
            <Save size={16} /> Salvar Rascunho
          </button>
          <button 
            onClick={() => handleSave(true)} 
            className="flex-1 md:flex-none px-5 py-2 bg-primary text-white hover:bg-primary/95 text-sm font-semibold rounded-lg shadow transition flex items-center justify-center gap-2"
          >
            <Play size={16} /> Salvar e Aprovar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* COLUNA ESQUERDA: FORMULÁRIOS E ROTA */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* ETAPA 1 - CLIENTE */}
          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
            <h2 className="font-bold text-foreground text-base flex items-center gap-2 border-b pb-2">
              <User className="text-primary" size={18} />
              Etapa 1 - Dados do Cliente
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Nome do Cliente *</label>
                <input 
                  list="client-list"
                  placeholder="Selecione ou digite um novo cliente" 
                  value={formData.clienteNome} 
                  onChange={e => handleChange('clienteNome', e.target.value)} 
                  className="w-full bg-background border border-border px-3.5 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                  required
                />
                <datalist id="client-list">
                  {clients.map(c => <option key={c.id} value={c.nome || c.nomeFantasia}>{c.cpfCnpj}</option>)}
                </datalist>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Telefone</label>
                <input 
                  placeholder="(00) 00000-0000" 
                  value={formData.clienteTelefone} 
                  onChange={e => handleChange('clienteTelefone', e.target.value)} 
                  className="w-full bg-background border border-border px-3.5 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Documento (CPF/CNPJ)</label>
                <input 
                  placeholder="000.000.000-00" 
                  value={formData.clienteDoc} 
                  onChange={e => handleChange('clienteDoc', e.target.value)} 
                  className="w-full bg-background border border-border px-3.5 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                />
              </div>
              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">E-mail</label>
                <input 
                  type="email"
                  placeholder="email@cliente.com.br" 
                  value={formData.clienteEmail} 
                  onChange={e => handleChange('clienteEmail', e.target.value)} 
                  className="w-full bg-background border border-border px-3.5 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                />
              </div>
            </div>
          </div>

          {/* ETAPA 2 - VEÍCULO E GUINCHO */}
          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
            <h2 className="font-bold text-foreground text-base flex items-center gap-2 border-b pb-2">
              <Car className="text-primary" size={18} />
              Etapa 2 - Veículo e Guincho
            </h2>
            
            {/* Linha Única de Configuração da Frota */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Coluna 1: Veículo da Frota */}
              <div className="relative space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Veículo da Frota *</label>
                <input 
                  type="text"
                  placeholder="Digite ou selecione placa..." 
                  value={formData.tipoGuincho} 
                  onFocus={() => setIsDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                  onChange={e => handleVehicleChange(e.target.value)} 
                  className="w-full bg-background border border-border px-3.5 py-2 rounded-lg text-sm focus:border-primary focus:outline-none uppercase font-mono font-semibold" 
                />
                {formData.tipoGuincho && (
                  <button
                    type="button"
                    onClick={() => handleVehicleChange('')}
                    className="absolute right-3 top-[32px] text-muted-foreground hover:text-foreground text-xs"
                  >
                    ✕
                  </button>
                )}
                
                {isDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-card border border-border rounded-lg shadow-lg divide-y divide-border">
                    {filteredVehiclesForDropdown.length === 0 ? (
                      <div className="p-3 text-xs text-muted-foreground text-center">
                        Nenhum veículo encontrado. Digite para personalizar.
                      </div>
                    ) : (
                      filteredVehiclesForDropdown.map((v) => (
                        <div
                          key={v.id}
                          onMouseDown={() => handleVehicleChange(v.placa)}
                          className="p-2.5 hover:bg-muted/40 cursor-pointer transition-colors text-xs flex justify-between items-center"
                        >
                          <div>
                            <span className="font-mono font-bold text-primary bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded text-[10px]">
                              {v.placa}
                            </span>
                            <span className="font-semibold text-foreground ml-2">
                              {v.marca ? `${v.marca} ` : ''}{v.modelo}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            v.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                          }`}>
                            {v.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {formData.vehicleId && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg w-fit">
                    <CheckCircle2 size={10} /> Veículo Vinculado à Frota
                  </div>
                )}
              </div>

              {/* Coluna 2: Tipo de Guincho */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Tipo de Guincho *</label>
                <select
                  value={formData.towingTypeId || ''}
                  onChange={e => handleTowingTypeChange(e.target.value)}
                  className="w-full bg-background border border-border px-3.5 py-2.5 rounded-lg text-sm focus:border-primary focus:outline-none text-foreground"
                >
                  <option value="">Selecione o tipo de guincho</option>
                  {towingTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              {/* Coluna 3: Motorista Escalado */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Motorista Escalado</label>
                <select
                  value={formData.driverId || ''}
                  onChange={e => handleChange('driverId', e.target.value || null)}
                  className="w-full bg-background border border-border px-3.5 py-2.5 rounded-lg text-sm focus:border-primary focus:outline-none text-foreground"
                >
                  <option value="">Nenhum motorista selecionado</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.nome} (CNH: {d.categoria})</option>
                  ))}
                </select>
                {selectedDriver && (
                  <div className="mt-1.5 text-[10px] text-muted-foreground flex gap-3 px-1">
                    <span>Categoria CNH: <strong className="text-foreground">{selectedDriver.categoria}</strong></span>
                    <span>Validade: <strong className="text-foreground">{selectedDriver.validadeCnh ? new Date(selectedDriver.validadeCnh).toLocaleDateString('pt-BR') : '—'}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Veículo a ser Transportado (Cliente) */}
            <div className="border-t border-border pt-4 mt-4 space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Veículo Transportado (Do Cliente)</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wide">Placa</label>
                  <input 
                    placeholder="Ex: ABC1D23" 
                    value={formData.veiculoPlaca} 
                    onChange={e => handleChange('veiculoPlaca', e.target.value.toUpperCase())} 
                    className="w-full bg-background border border-border px-3 py-1.5 rounded-lg text-xs uppercase font-mono" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wide">Marca</label>
                  <input 
                    placeholder="Ex: Toyota" 
                    value={formData.veiculoMarca} 
                    onChange={e => handleChange('veiculoMarca', e.target.value)} 
                    className="w-full bg-background border border-border px-3 py-1.5 rounded-lg text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wide">Modelo *</label>
                  <input 
                    placeholder="Ex: Corolla" 
                    value={formData.veiculoModelo} 
                    onChange={e => handleChange('veiculoModelo', e.target.value)} 
                    className="w-full bg-background border border-border px-3 py-1.5 rounded-lg text-xs" 
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wide">Ano</label>
                  <input 
                    placeholder="Ex: 2022" 
                    value={formData.veiculoAno} 
                    onChange={e => handleChange('veiculoAno', e.target.value)} 
                    className="w-full bg-background border border-border px-3 py-1.5 rounded-lg text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-wide">Cor</label>
                  <input 
                    placeholder="Ex: Prata" 
                    value={formData.veiculoCor} 
                    onChange={e => handleChange('veiculoCor', e.target.value)} 
                    className="w-full bg-background border border-border px-3 py-1.5 rounded-lg text-xs" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ETAPA 3 - ORIGEM E DESTINO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* ORIGEM */}
            <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h2 className="font-bold text-foreground text-base flex items-center gap-2">
                  <MapPin className="text-primary" size={18} />
                  Origem
                </h2>
                <button 
                  type="button" 
                  onClick={() => locateOnMap('origem')}
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                >
                  📍 Localizar no Mapa
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">CEP *</label>
                  <input 
                    placeholder="00000-000" 
                    value={formData.origemCep} 
                    onChange={e => handleChange('origemCep', e.target.value)} 
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Cidade *</label>
                  <input 
                    placeholder="Cidade" 
                    value={formData.origemCidade} 
                    onChange={e => handleChange('origemCidade', e.target.value)} 
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                  />
                </div>
                <div className="col-span-3 space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Endereço *</label>
                  <input 
                    placeholder="Rua, Avenida, etc." 
                    value={formData.origemEndereco} 
                    onChange={e => handleChange('origemEndereco', e.target.value)} 
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Número *</label>
                  <input 
                    placeholder="Nº" 
                    value={formData.origemNumero} 
                    onChange={e => handleChange('origemNumero', e.target.value)} 
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Bairro *</label>
                  <input 
                    placeholder="Bairro" 
                    value={formData.origemComplemento} 
                    onChange={e => handleChange('origemComplemento', e.target.value)} 
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Estado *</label>
                  <input 
                    placeholder="UF" 
                    value={formData.origemEstado} 
                    onChange={e => handleChange('origemEstado', e.target.value)} 
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none uppercase" 
                  />
                </div>
              </div>
            </div>

            {/* DESTINO */}
            <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h2 className="font-bold text-foreground text-base flex items-center gap-2">
                  <MapPin className="text-rose-600" size={18} />
                  Destino
                </h2>
                <button 
                  type="button" 
                  onClick={() => locateOnMap('destino')}
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                >
                  📍 Localizar no Mapa
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">CEP *</label>
                  <input 
                    placeholder="00000-000" 
                    value={formData.destinoCep} 
                    onChange={e => handleChange('destinoCep', e.target.value)} 
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Cidade *</label>
                  <input 
                    placeholder="Cidade" 
                    value={formData.destinoCidade} 
                    onChange={e => handleChange('destinoCidade', e.target.value)} 
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                  />
                </div>
                <div className="col-span-3 space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Endereço *</label>
                  <input 
                    placeholder="Rua, Avenida, etc." 
                    value={formData.destinoEndereco} 
                    onChange={e => handleChange('destinoEndereco', e.target.value)} 
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Número *</label>
                  <input 
                    placeholder="Nº" 
                    value={formData.destinoNumero} 
                    onChange={e => handleChange('destinoNumero', e.target.value)} 
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Bairro *</label>
                  <input 
                    placeholder="Bairro" 
                    value={formData.destinoComplemento} 
                    onChange={e => handleChange('destinoComplemento', e.target.value)} 
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Estado *</label>
                  <input 
                    placeholder="UF" 
                    value={formData.destinoEstado} 
                    onChange={e => handleChange('destinoEstado', e.target.value)} 
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none uppercase" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CÁLCULO DE ROTA */}
          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="font-bold text-foreground text-base flex items-center gap-2">
                <Calculator className="text-primary" size={18} />
                Cálculo de Rota e Distância
              </h2>
            </div>
            
            <div className="flex justify-center pt-2">
              <button 
                type="button"
                onClick={calculateRoute} 
                disabled={isCalculating} 
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2.5 font-bold shadow text-sm transition disabled:opacity-50 active:scale-95"
              >
                <Truck size={18} /> {isCalculating ? 'Calculando Rota...' : 'Calcular Rota e Distância'}
              </button>
            </div>

            {/* Cards de Resumo da Rota */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              <div className="bg-secondary/15 border border-border p-3.5 rounded-xl shadow-sm space-y-0.5 text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Distância Total</span>
                <div className="text-lg font-black text-primary">{formData.distanciaKm || 0} km</div>
              </div>
              <div className="bg-secondary/15 border border-border p-3.5 rounded-xl shadow-sm space-y-0.5 text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Tempo Estimado</span>
                <div className="text-lg font-black text-primary">
                  {formData.tempoEstimadoMin ? `${Math.floor(formData.tempoEstimadoMin / 60)}h ${formData.tempoEstimadoMin % 60}min` : '0 min'}
                </div>
              </div>
              <div className="bg-secondary/15 border border-border p-3.5 rounded-xl shadow-sm space-y-0.5 text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Qtd. de Pedágios</span>
                <div className="text-lg font-black text-primary">{formData.qtdPedagios || 0}</div>
              </div>
              <div className="bg-secondary/15 border border-border p-3.5 rounded-xl shadow-sm space-y-0.5 text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Valor Pedágios</span>
                <div className="text-lg font-black text-primary">R$ {Number(formData.pedagios || 0).toFixed(2)}</div>
              </div>
            </div>

            {routeMap && (
              <div className="h-72 bg-muted border border-border rounded-xl overflow-hidden mt-4 shadow-inner">
                <iframe
                  title="Google Maps Route"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://www.google.com/maps/embed/v1/directions?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyB3IJ6vI1b4ACGNZTJ7wG_1A-au_Mw2KBg'}&origin=${encodeURIComponent(routeMap.origin)}&destination=${encodeURIComponent(routeMap.destination)}&mode=driving`}
                ></iframe>
              </div>
            )}
          </div>

          {/* VALIDAÇÃO ANTT */}
          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
            <h2 className="font-bold text-foreground text-base flex items-center gap-2 border-b pb-2">
              <Scale className="text-primary" size={18} />
              Validação ANTT
            </h2>
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div className="flex flex-wrap gap-6 text-sm">
                <label className="flex items-center gap-2.5 font-semibold text-foreground cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={formData.anttRetornoVazio} 
                    onChange={e => handleChange('anttRetornoVazio', e.target.checked)}
                    className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-offset-2"
                  />
                  <span>Retorno Vazio</span>
                </label>
                <label className="flex items-center gap-2.5 font-semibold text-foreground cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={formData.anttAltoDesempenho} 
                    onChange={e => handleChange('anttAltoDesempenho', e.target.checked)}
                    className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-offset-2"
                  />
                  <span>Alto Desempenho</span>
                </label>
                <label className="flex items-center gap-2.5 font-semibold text-foreground cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={formData.anttComposicao} 
                    onChange={e => handleChange('anttComposicao', e.target.checked)}
                    className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-offset-2"
                  />
                  <span>Composição Veicular</span>
                </label>
              </div>

              {formData.anttPisoMinimo > 0 && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                  formData.valorTotal < formData.anttPisoMinimo 
                    ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' 
                    : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                }`}>
                  {formData.valorTotal < formData.anttPisoMinimo ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                  <span>Piso Mínimo ANTT: R$ {formData.anttPisoMinimo.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* COMPOSIÇÃO FINANCEIRA */}
          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
            <h2 className="font-bold text-foreground text-base flex items-center gap-2 border-b pb-2">
              <DollarSign className="text-primary" size={18} />
              Composição Financeira
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Taxa de Saída</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">R$</span>
                  <input 
                    type="number" 
                    value={formData.taxaSaida || ''} 
                    onChange={e => handleChange('taxaSaida', e.target.value)} 
                    className="w-full bg-background border border-border pl-8 pr-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Valor por KM</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">R$</span>
                  <input 
                    type="number" 
                    value={formData.valorKm || ''} 
                    onChange={e => handleChange('valorKm', e.target.value)} 
                    className="w-full bg-background border border-border pl-8 pr-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Valor Hora Parada</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">R$</span>
                  <input 
                    type="number" 
                    value={formData.valorHoraParada || ''} 
                    onChange={e => handleChange('valorHoraParada', e.target.value)} 
                    className="w-full bg-background border border-border pl-8 pr-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Qtd. Horas Paradas</label>
                <input 
                  type="number" 
                  value={formData.horasParadas || ''} 
                  onChange={e => handleChange('horasParadas', e.target.value)} 
                  className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                  placeholder="Horas"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Pedágios / Extras</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">R$</span>
                  <input 
                    type="number" 
                    value={formData.pedagios || ''} 
                    onChange={e => handleChange('pedagios', e.target.value)} 
                    className="w-full bg-background border border-border pl-8 pr-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Impostos</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">R$</span>
                  <input 
                    type="number" 
                    value={formData.impostos || ''} 
                    onChange={e => handleChange('impostos', e.target.value)} 
                    className="w-full bg-background border border-border pl-8 pr-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Acréscimos</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">R$</span>
                  <input 
                    type="number" 
                    value={formData.acrescimos || ''} 
                    onChange={e => handleChange('acrescimos', e.target.value)} 
                    className="w-full bg-background border border-border pl-8 pr-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Descontos</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">R$</span>
                  <input 
                    type="number" 
                    value={formData.descontos || ''} 
                    onChange={e => handleChange('descontos', e.target.value)} 
                    className="w-full bg-background border border-border pl-8 pr-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* OBSERVAÇÕES */}
          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
            <h2 className="font-bold text-foreground text-base flex items-center gap-2 border-b pb-2">
              <FileText className="text-primary" size={18} />
              Observações
            </h2>
            <textarea 
              placeholder="Informe observações internas, detalhes da remoção ou condições comerciais." 
              value={formData.observacoes || ''} 
              onChange={e => handleChange('observacoes', e.target.value)} 
              className="w-full min-h-[100px] bg-background border border-border rounded-xl p-3.5 text-sm focus:border-primary focus:outline-none resize-y"
            />
          </div>

        </div>

        {/* COLUNA DIREITA: RESUMO FINANCEIRO FIXO */}
        <div className="lg:col-span-1 lg:sticky lg:top-6 space-y-6">
          <div className="bg-card border border-border rounded-2xl shadow-md p-5 space-y-5">
            <h2 className="font-bold text-foreground text-base border-b pb-2 flex items-center gap-1.5">
              <DollarSign size={18} className="text-primary" />
              Resumo do Orçamento
            </h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Orçamento Base:</span>
                <span className="font-semibold text-foreground">
                  R$ {(
                    Number(formData.taxaSaida || 0) + 
                    (Number(formData.distanciaKm || 0) * Number(formData.valorKm || 0)) + 
                    (Number(formData.horasParadas || 0) * Number(formData.valorHoraParada || 0))
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Piso Mínimo ANTT:</span>
                <span className="font-semibold text-foreground">
                  R$ {Number(formData.anttPisoMinimo || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Pedágios:</span>
                <span className="font-semibold text-foreground">
                  R$ {Number(formData.pedagios || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Impostos:</span>
                <span className="font-semibold text-foreground">
                  R$ {Number(formData.impostos || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Acréscimos / Extras:</span>
                <span className="font-semibold text-foreground">
                  R$ {Number(formData.acrescimos || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground border-b border-border/50 pb-3">
                <span>Descontos:</span>
                <span className="font-semibold text-rose-600">
                  - R$ {Number(formData.descontos || 0).toFixed(2)}
                </span>
              </div>
              
              <div className="pt-2">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-foreground text-xs uppercase tracking-wider">VALOR FINAL</span>
                  <div className="text-right">
                    <span className="font-black text-2xl text-emerald-600 block">
                      R$ {Number(formData.valorTotal || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {formData.anttPisoMinimo > 0 && formData.valorTotal < formData.anttPisoMinimo && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl flex gap-2 items-start text-xs leading-relaxed font-medium">
                <AlertTriangle className="shrink-0 mt-0.5" size={14} />
                <p>O valor final está abaixo do piso mínimo ANTT estipulado para a rota (R$ {formData.anttPisoMinimo.toFixed(2)}).</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
