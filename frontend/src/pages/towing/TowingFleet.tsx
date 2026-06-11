import { useState, useEffect } from 'react';
import { Truck, Save } from 'lucide-react';
import { towingService } from '../../services/towing.service';
import { toast } from 'sonner';

export function TowingFleet() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    id: '',
    placa: '',
    modelo: '',
    tipo: '',
    capacidade: '',
    status: 'ATIVO',
    rntrcNumero: '',
    rntrcStatus: '',
    rntrcValidade: ''
  });

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const data = await towingService.listVehicles();
      setVehicles(data);
    } catch (error) {
      toast.error('Erro ao carregar veículos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.id) {
        // Implementar update se necessário
        toast.info('A funcionalidade de edição será implementada em breve.');
        return;
      } else {
        await towingService.createVehicle(formData);
        toast.success('Veículo cadastrado com sucesso!');
      }
      loadVehicles();
      setFormData({
        id: '', placa: '', modelo: '', tipo: '', capacidade: '', 
        status: 'ATIVO', rntrcNumero: '', rntrcStatus: '', rntrcValidade: ''
      });
    } catch (error) {
      toast.error('Erro ao salvar veículo');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="text-primary" />
          Frota de Guinchos
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-card border rounded-xl p-4 shadow-sm h-fit">
          <h2 className="font-semibold mb-4 text-lg">Novo Veículo</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Placa *</label>
              <input 
                value={formData.placa}
                onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})}
                className="w-full bg-background border rounded-lg py-2 px-3 focus:border-primary focus:outline-none text-sm"
                placeholder="ABC-1234"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Marca/Modelo *</label>
              <input 
                value={formData.modelo}
                onChange={e => setFormData({...formData, modelo: e.target.value})}
                className="w-full bg-background border rounded-lg py-2 px-3 focus:border-primary focus:outline-none text-sm"
                placeholder="Ex: VW Delivery 9.170"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Tipo (Plataforma, etc) *</label>
              <input 
                value={formData.tipo}
                onChange={e => setFormData({...formData, tipo: e.target.value})}
                className="w-full bg-background border rounded-lg py-2 px-3 focus:border-primary focus:outline-none text-sm"
                placeholder="Ex: Plataforma Hidráulica"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Registro ANTT (RNTRC)</label>
              <input 
                value={formData.rntrcNumero}
                onChange={e => setFormData({...formData, rntrcNumero: e.target.value})}
                className="w-full bg-background border rounded-lg py-2 px-3 focus:border-primary focus:outline-none text-sm"
                placeholder="Número do registro"
              />
            </div>
            <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg flex items-center justify-center gap-2">
              <Save size={16} /> Salvar
            </button>
          </form>
        </div>

        <div className="md:col-span-2 bg-card border rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-medium">Placa</th>
                <th className="px-4 py-3 font-medium">Modelo</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">RNTRC</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vehicles.map(v => (
                <tr key={v.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-primary">{v.placa}</td>
                  <td className="px-4 py-3">{v.modelo}</td>
                  <td className="px-4 py-3">{v.tipo}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.rntrcNumero || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${v.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {v.status}
                    </span>
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-muted-foreground">Nenhum veículo cadastrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
