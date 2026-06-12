import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Truck, MapPin, DollarSign, Save, Calculator, Car, User, Scale, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { towingService } from '../../services/towing.service';
import { googleMapsService } from '../../services/google-maps.service';
import { anttService } from '../../services/antt.service';
import { api } from '../../services/api';
import { toast } from 'sonner';

export function CreateTowingQuote() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [formData, setFormData] = useState<any>({
    clienteNome: '',
    clienteEmpresa: '',
    clienteTelefone: '',
    clienteEmail: '',
    origemCep: '',
    origemEndereco: '',
    origemNumero: '',
    origemCidade: '',
    origemEstado: '',
    destinoCep: '',
    destinoEndereco: '',
    destinoNumero: '',
    destinoCidade: '',
    destinoEstado: '',
    distanciaKm: 0,
    tempoEstimadoMin: 0,
    veiculoPlaca: '',
    veiculoMarca: '',
    veiculoModelo: '',
    veiculoCor: '',
    tipoGuincho: '',
    taxaSaida: 0,
    valorKm: 0,
    horasParadas: 0,
    valorHoraParada: 0,
    pedagios: 0,
    despesasExtras: 0,
    descontos: 0,
    acrescimos: 0,
    valorTotal: 0,
    observacoes: '',

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
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeMap, setRouteMap] = useState<{ origin: string; destination: string } | null>(null);

  useEffect(() => {
    towingService.listRates().then(setRates).catch(console.error);
    towingService.listVehicles().then(setVehicles).catch(console.error);
    api.get('/registry/clients').then(res => setClients(res.data)).catch(console.error);
    if (isEditing) {
      towingService.getQuote(id).then(setFormData).catch(console.error);
    }
  }, [id, isEditing]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => {
      const next = { ...prev, [field]: value };
      
      // Auto-update rates based on guincho selection (from vehicle type or direct type)
      if (field === 'tipoGuincho') {
        // Try to match vehicle plate first
        const vehicle = vehicles.find(v => v.placa === value || v.tipo === value);
        const rateType = vehicle ? vehicle.tipo : value;
        const rate = rates.find(r => r.tipoGuincho === rateType);
        
        if (rate) {
          next.taxaSaida = rate.taxaSaida;
          next.valorKm = rate.valorKm;
          next.valorHoraParada = rate.valorHoraParada;
        }
      }

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

  const calculateRoute = async () => {
    if (!formData.tipoGuincho) {
      toast.error('Selecione um caminhão (pela placa) antes de calcular a rota.');
      return;
    }
    const selectedVehicle = vehicles.find((v: any) => v.placa === formData.tipoGuincho);
    if (!selectedVehicle) {
      toast.error('Caminhão não encontrado na frota. Selecione um veículo válido.');
      return;
    }

    const origin = `${formData.origemEndereco}, ${formData.origemNumero}, ${formData.origemCidade} - ${formData.origemEstado}`;
    const destination = `${formData.destinoEndereco}, ${formData.destinoNumero}, ${formData.destinoCidade} - ${formData.destinoEstado}`;

    if (!formData.origemEndereco || !formData.origemCidade || !formData.destinoEndereco || !formData.destinoCidade) {
      toast.error('Preencha os dados de origem e destino corretamente.');
      return;
    }

    setIsCalculating(true);
    try {
      const { distanceKm, durationMin, tollCost } = await googleMapsService.computeRouteWithTolls(origin, destination);
      
      const eixos = selectedVehicle.eixos || 2;
      const baseTollPerAxle = tollCost / 2; // O Google estima o pedágio para um veículo padrão de 2 eixos
      const finalToll = baseTollPerAxle * eixos;

      setFormData((prev: any) => ({ 
        ...prev, 
        distanciaKm: distanceKm, 
        tempoEstimadoMin: durationMin,
        pedagios: finalToll,
        qtdPedagios: tollCost > 0 ? 1 : 0
      }));
      setRouteMap({ origin, destination });
      toast.success(`Rota calculada: ${distanceKm.toFixed(2)} km (${durationMin} min). Pedágios: R$ ${finalToll.toFixed(2)}`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao calcular rota.');
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    // Recalculate totals
    const total = 
      Number(formData.taxaSaida || 0) + 
      (Number(formData.distanciaKm || 0) * Number(formData.valorKm || 0)) + 
      (Number(formData.horasParadas || 0) * Number(formData.valorHoraParada || 0)) + 
      Number(formData.pedagios || 0) + 
      Number(formData.despesasExtras || 0) + 
      Number(formData.acrescimos || 0) - 
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
    formData.despesasExtras, formData.acrescimos, formData.descontos,
    formData.anttTipoCarga, formData.anttEixos, formData.anttComposicao,
    formData.anttAltoDesempenho, formData.anttRetornoVazio
  ]);

  const handleSave = async () => {
    try {
      if (isEditing) {
        await towingService.updateQuote(id, formData);
        toast.success('Orçamento atualizado!');
      } else {
        const res = await towingService.createQuote(formData);
        toast.success('Orçamento criado!');
        navigate(`/towing/quotes/${res.id}`);
      }
    } catch (error) {
      toast.error('Erro ao salvar orçamento');
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <div className="flex justify-between items-center bg-card p-3 rounded shadow-sm border">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Truck className="text-primary" /> 
          {isEditing ? 'Editar Orçamento de Guincho' : 'Novo Orçamento de Guincho'}
        </h1>
        <div className="flex gap-2">
          <button onClick={() => navigate('/towing/quotes')} className="btn-secondary text-sm">Cancelar</button>
          <button onClick={handleSave} className="bg-primary text-white px-4 py-2 rounded flex items-center gap-2 text-sm">
            <Save size={16} /> Salvar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Coluna 1: Cliente e Rotas */}
        <div className="space-y-4">
          <div className="bg-card border p-3 rounded shadow-sm text-sm">
            <h2 className="font-semibold flex items-center gap-2 mb-3"><User size={16} /> Dados do Cliente</h2>
            <div className="grid grid-cols-2 gap-2">
              <input 
                list="client-list"
                placeholder="Nome do Cliente (Selecione ou Digite novo)" 
                value={formData.clienteNome} 
                onChange={e => handleChange('clienteNome', e.target.value)} 
                className="input-field col-span-2" 
              />
              <datalist id="client-list">
                {clients.map(c => <option key={c.id} value={c.nome || c.nomeFantasia}>{c.cpfCnpj}</option>)}
              </datalist>
              <input placeholder="Telefone" value={formData.clienteTelefone} onChange={e => handleChange('clienteTelefone', e.target.value)} className="input-field" />
              <input placeholder="Email" value={formData.clienteEmail} onChange={e => handleChange('clienteEmail', e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="bg-card border p-3 rounded shadow-sm text-sm">
            <h2 className="font-semibold flex items-center gap-2 mb-3"><MapPin size={16} /> Origem</h2>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="CEP" value={formData.origemCep} onChange={e => handleChange('origemCep', e.target.value)} className="input-field" />
              <input placeholder="Cidade" value={formData.origemCidade} onChange={e => handleChange('origemCidade', e.target.value)} className="input-field" />
              <input placeholder="Endereço" value={formData.origemEndereco} onChange={e => handleChange('origemEndereco', e.target.value)} className="input-field col-span-2" />
              <input placeholder="Número" value={formData.origemNumero} onChange={e => handleChange('origemNumero', e.target.value)} className="input-field" />
              <input placeholder="Estado" value={formData.origemEstado} onChange={e => handleChange('origemEstado', e.target.value)} className="input-field" />
            </div>
          </div>

          <div className="bg-card border p-3 rounded shadow-sm text-sm">
            <h2 className="font-semibold flex items-center gap-2 mb-3"><MapPin size={16} /> Destino</h2>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="CEP" value={formData.destinoCep} onChange={e => handleChange('destinoCep', e.target.value)} className="input-field" />
              <input placeholder="Cidade" value={formData.destinoCidade} onChange={e => handleChange('destinoCidade', e.target.value)} className="input-field" />
              <input placeholder="Endereço" value={formData.destinoEndereco} onChange={e => handleChange('destinoEndereco', e.target.value)} className="input-field col-span-2" />
              <input placeholder="Número" value={formData.destinoNumero} onChange={e => handleChange('destinoNumero', e.target.value)} className="input-field" />
              <input placeholder="Estado" value={formData.destinoEstado} onChange={e => handleChange('destinoEstado', e.target.value)} className="input-field" />
            </div>
          </div>

          <button onClick={calculateRoute} disabled={isCalculating} className="w-full bg-blue-600 text-white py-2 rounded flex items-center justify-center gap-2 text-sm">
            <Calculator size={16} /> {isCalculating ? 'Calculando...' : 'Calcular Rota e Distância'}
          </button>
          
          <div className="flex gap-4 p-3 bg-muted rounded">
            <div><span className="text-[10px] text-muted-foreground block">Distância KM</span><strong className="text-base">{formData.distanciaKm} km</strong></div>
            <div><span className="text-[10px] text-muted-foreground block">Tempo Estimado</span><strong className="text-base">{formData.tempoEstimadoMin} min</strong></div>
          </div>
        </div>

        {/* Coluna 2: Veículo e ANTT */}
        <div className="space-y-4">
          <div className="bg-card border p-3 rounded shadow-sm text-sm">
            <h2 className="font-semibold flex items-center gap-2 mb-3"><Car size={16} /> Veículo e Guincho</h2>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Placa do Veículo" value={formData.veiculoPlaca} onChange={e => handleChange('veiculoPlaca', e.target.value)} className="input-field" />
              <input placeholder="Marca/Modelo" value={formData.veiculoModelo} onChange={e => handleChange('veiculoModelo', e.target.value)} className="input-field" />
              <input 
                list="guincho-list"
                placeholder="Selecione o Veículo da Frota ou Digite" 
                value={formData.tipoGuincho} 
                onChange={e => handleChange('tipoGuincho', e.target.value)} 
                className="input-field col-span-2" 
              />
              <datalist id="guincho-list">
                {vehicles.map(v => <option key={v.id} value={v.placa}>{v.tipo} ({v.marca})</option>)}
                {rates.map(r => <option key={r.id} value={r.tipoGuincho} />)}
              </datalist>
            </div>
          </div>

          <div className="bg-card border p-3 rounded shadow-sm">
            <h2 className="font-semibold flex items-center gap-2 mb-3"><Scale size={16} /> Validação de Frete ANTT</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="col-span-2 md:col-span-1">
                <label className="font-semibold text-muted-foreground uppercase">Tipo de Carga</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="checkbox" id="anttRetornoVazio" checked={formData.anttRetornoVazio} onChange={e => handleChange('anttRetornoVazio', e.target.checked)} />
                <label htmlFor="anttRetornoVazio">Retorno Vazio</label>
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <input type="checkbox" id="anttAltoDesempenho" checked={formData.anttAltoDesempenho} onChange={e => handleChange('anttAltoDesempenho', e.target.checked)} />
                <label htmlFor="anttAltoDesempenho">Alto Desempenho</label>
              </div>
              
              <div className="flex items-center gap-2 mt-1 col-span-2">
                <input type="checkbox" id="anttComposicao" checked={formData.anttComposicao} onChange={e => handleChange('anttComposicao', e.target.checked)} />
                <label htmlFor="anttComposicao">Composição Veicular</label>
              </div>
            </div>
            {formData.anttPisoMinimo > 0 && formData.valorTotal < formData.anttPisoMinimo && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 text-red-800 rounded flex gap-2 items-start text-xs">
                <AlertTriangle className="shrink-0" size={14} />
                <p>O valor está abaixo do piso mínimo da ANTT.</p>
              </div>
            )}
            {formData.anttPisoMinimo > 0 && formData.valorTotal >= formData.anttPisoMinimo && (
              <div className="mt-3 p-2 bg-green-50 border border-green-200 text-green-800 rounded flex gap-2 items-center text-xs">
                <CheckCircle2 className="shrink-0" size={14} />
                <p>Valor compatível com o piso ANTT.</p>
              </div>
            )}
          </div>
        </div>

        {/* Coluna 3: Financeiro */}
        <div className="space-y-4">
          <div className="bg-card border p-3 rounded shadow-sm">
            <h2 className="font-semibold flex items-center gap-2 mb-3"><DollarSign size={16} /> Composição Financeira</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label>Taxa de Saída</label>
                <input type="number" value={formData.taxaSaida} onChange={e => handleChange('taxaSaida', e.target.value)} className="input-field w-full py-1" />
              </div>
              <div>
                <label>Valor por KM</label>
                <input type="number" value={formData.valorKm} onChange={e => handleChange('valorKm', e.target.value)} className="input-field w-full py-1" />
              </div>
              <div>
                <label>Horas Paradas</label>
                <input type="number" value={formData.horasParadas} onChange={e => handleChange('horasParadas', e.target.value)} className="input-field w-full py-1" />
              </div>
              <div>
                <label>Valor Hora Parada</label>
                <input type="number" value={formData.valorHoraParada} onChange={e => handleChange('valorHoraParada', e.target.value)} className="input-field w-full py-1" />
              </div>
              <div>
                <label>Pedágios / Extras</label>
                <input type="number" value={formData.pedagios} onChange={e => handleChange('pedagios', e.target.value)} className="input-field w-full py-1" />
              </div>
              <div>
                <label>Descontos</label>
                <input type="number" value={formData.descontos} onChange={e => handleChange('descontos', e.target.value)} className="input-field w-full py-1" />
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-muted rounded border border-border">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-muted-foreground">Orçamento Calculado:</span>
                <span className="font-semibold">R$ {Number(formData.valorTotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-muted-foreground">Piso Mínimo ANTT:</span>
                <span className="font-semibold">R$ {Number(formData.anttPisoMinimo).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-border/50">
                <span className="font-bold">Total Final:</span>
                <span className="font-bold text-base text-green-600">
                  R$ {(formData.valorTotal).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Rota e Mapa */}
      {routeMap && (
        <div className="bg-card border p-4 rounded shadow-sm">
          <h2 className="font-semibold flex items-center gap-2 mb-4"><MapPin size={16} /> Mapa da Rota e Resumo</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-64 lg:h-full bg-muted rounded overflow-hidden min-h-[300px]">
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
            <div className="flex flex-col justify-center space-y-3 bg-secondary/20 p-4 rounded border">
              <h3 className="font-bold border-b pb-2">Resumo da Rota</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Origem:</span>
                <strong className="text-right ml-4">{routeMap.origin}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Destino:</span>
                <strong className="text-right ml-4">{routeMap.destination}</strong>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">Distância Total:</span>
                <strong>{Number(formData.distanciaKm || 0).toFixed(2)} km</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tempo Estimado:</span>
                <strong>{formData.tempoEstimadoMin} min</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor dos Pedágios:</span>
                <strong>R$ {Number(formData.pedagios || 0).toFixed(2)}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Caminhão Utilizado:</span>
                <strong>{formData.tipoGuincho}</strong>
              </div>
              <div className="flex justify-between text-sm border-t pt-2 mt-2">
                <span className="font-bold text-muted-foreground">Valor Total da Viagem:</span>
                <strong className="text-green-600 text-lg">R$ {Number(formData.valorTotal || 0).toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
