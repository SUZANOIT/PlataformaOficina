import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Truck, MapPin, DollarSign, Save, Calculator, Car, User } from 'lucide-react';
import { towingService } from '../../services/towing.service';
import { googleMapsService } from '../../services/google-maps.service';
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
    observacoes: ''
  });

  const [rates, setRates] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    towingService.listRates().then(setRates).catch(console.error);
    api.get('/registry/clients').then(res => setClients(res.data)).catch(console.error);
    if (isEditing) {
      towingService.getQuote(id).then(setFormData).catch(console.error);
    }
  }, [id, isEditing]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => {
      const next = { ...prev, [field]: value };
      
      // Auto-update rates based on guincho selection
      if (field === 'tipoGuincho') {
        const rate = rates.find(r => r.tipoGuincho === value);
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
      return next;
    });
  };

  const calculateRoute = async () => {
    const origin = `${formData.origemEndereco}, ${formData.origemNumero}, ${formData.origemCidade} - ${formData.origemEstado}`;
    const destination = `${formData.destinoEndereco}, ${formData.destinoNumero}, ${formData.destinoCidade} - ${formData.destinoEstado}`;

    setIsCalculating(true);
    try {
      const { distanceKm, durationMin } = await googleMapsService.getDistanceMatrix(origin, destination);
      setFormData((prev: any) => ({ ...prev, distanciaKm: distanceKm, tempoEstimadoMin: durationMin }));
      toast.success(`Rota calculada: ${distanceKm.toFixed(2)} km (${durationMin} min)`);
    } catch (error) {
      toast.error('Erro ao calcular rota');
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
      
    setFormData((prev: any) => prev.valorTotal === total ? prev : { ...prev, valorTotal: total });
  }, [
    formData.taxaSaida, formData.distanciaKm, formData.valorKm, 
    formData.horasParadas, formData.valorHoraParada, formData.pedagios, 
    formData.despesasExtras, formData.acrescimos, formData.descontos
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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="text-primary" /> 
          {isEditing ? 'Editar Orçamento de Guincho' : 'Novo Orçamento de Guincho'}
        </h1>
        <div className="flex gap-2">
          <button onClick={() => navigate('/towing/quotes')} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} className="bg-primary text-white px-4 py-2 rounded flex items-center gap-2">
            <Save size={16} /> Salvar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cliente, Origem e Destino */}
        <div className="space-y-6">
          <div className="bg-card border p-4 rounded shadow-sm">
            <h2 className="font-semibold flex items-center gap-2 mb-4"><User /> Dados do Cliente</h2>
            <div className="grid grid-cols-2 gap-3">
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
          <div className="bg-card border p-4 rounded shadow-sm">
            <h2 className="font-semibold flex items-center gap-2 mb-4"><MapPin /> Origem</h2>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="CEP" value={formData.origemCep} onChange={e => handleChange('origemCep', e.target.value)} className="input-field" />
              <input placeholder="Cidade" value={formData.origemCidade} onChange={e => handleChange('origemCidade', e.target.value)} className="input-field" />
              <input placeholder="Endereço" value={formData.origemEndereco} onChange={e => handleChange('origemEndereco', e.target.value)} className="input-field col-span-2" />
              <input placeholder="Número" value={formData.origemNumero} onChange={e => handleChange('origemNumero', e.target.value)} className="input-field" />
              <input placeholder="Estado" value={formData.origemEstado} onChange={e => handleChange('origemEstado', e.target.value)} className="input-field" />
            </div>
          </div>

          <div className="bg-card border p-4 rounded shadow-sm">
            <h2 className="font-semibold flex items-center gap-2 mb-4"><MapPin /> Destino</h2>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="CEP" value={formData.destinoCep} onChange={e => handleChange('destinoCep', e.target.value)} className="input-field" />
              <input placeholder="Cidade" value={formData.destinoCidade} onChange={e => handleChange('destinoCidade', e.target.value)} className="input-field" />
              <input placeholder="Endereço" value={formData.destinoEndereco} onChange={e => handleChange('destinoEndereco', e.target.value)} className="input-field col-span-2" />
              <input placeholder="Número" value={formData.destinoNumero} onChange={e => handleChange('destinoNumero', e.target.value)} className="input-field" />
              <input placeholder="Estado" value={formData.destinoEstado} onChange={e => handleChange('destinoEstado', e.target.value)} className="input-field" />
            </div>
          </div>

          <button onClick={calculateRoute} disabled={isCalculating} className="w-full bg-blue-600 text-white py-2 rounded flex items-center justify-center gap-2">
            <Calculator size={16} /> {isCalculating ? 'Calculando...' : 'Calcular Rota e Distância'}
          </button>
          
          <div className="flex gap-4 p-4 bg-muted rounded">
            <div><span className="text-xs text-muted-foreground block">Distância KM</span><strong className="text-lg">{formData.distanciaKm} km</strong></div>
            <div><span className="text-xs text-muted-foreground block">Tempo Estimado</span><strong className="text-lg">{formData.tempoEstimadoMin} min</strong></div>
          </div>
        </div>

        {/* Informações do Guincho e Financeiro */}
        <div className="space-y-6">
          <div className="bg-card border p-4 rounded shadow-sm">
            <h2 className="font-semibold flex items-center gap-2 mb-4"><Car /> Veículo e Guincho</h2>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Placa do Veículo" value={formData.veiculoPlaca} onChange={e => handleChange('veiculoPlaca', e.target.value)} className="input-field" />
              <input placeholder="Marca/Modelo" value={formData.veiculoModelo} onChange={e => handleChange('veiculoModelo', e.target.value)} className="input-field" />
              <input 
                list="guincho-list"
                placeholder="Tipo de Guincho (Selecione ou Digite)" 
                value={formData.tipoGuincho} 
                onChange={e => handleChange('tipoGuincho', e.target.value)} 
                className="input-field col-span-2" 
              />
              <datalist id="guincho-list">
                {rates.map(r => <option key={r.id} value={r.tipoGuincho} />)}
              </datalist>
            </div>
          </div>

          <div className="bg-card border p-4 rounded shadow-sm">
            <h2 className="font-semibold flex items-center gap-2 mb-4"><DollarSign /> Composição Financeira</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label>Taxa de Saída</label>
                <input type="number" value={formData.taxaSaida} onChange={e => handleChange('taxaSaida', e.target.value)} className="input-field w-full" />
              </div>
              <div>
                <label>Valor por KM</label>
                <input type="number" value={formData.valorKm} onChange={e => handleChange('valorKm', e.target.value)} className="input-field w-full" />
              </div>
              <div>
                <label>Horas Paradas</label>
                <input type="number" value={formData.horasParadas} onChange={e => handleChange('horasParadas', e.target.value)} className="input-field w-full" />
              </div>
              <div>
                <label>Valor Hora Parada</label>
                <input type="number" value={formData.valorHoraParada} onChange={e => handleChange('valorHoraParada', e.target.value)} className="input-field w-full" />
              </div>
              <div>
                <label>Pedágios / Extras</label>
                <input type="number" value={formData.pedagios} onChange={e => handleChange('pedagios', e.target.value)} className="input-field w-full" />
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-green-50 text-green-900 rounded border border-green-200">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total Estimado:</span>
                <span>R$ {Number(formData.valorTotal).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
