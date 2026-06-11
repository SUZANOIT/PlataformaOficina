import { useState, useEffect } from 'react';
import { DollarSign, Save, Edit3 } from 'lucide-react';
import { towingService } from '../../services/towing.service';
import { toast } from 'sonner';

export function TowingRates() {
  const [rates, setRates] = useState<any[]>([]);
  const [, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    id: '',
    tipoGuincho: '',
    taxaSaida: 0,
    valorKm: 0,
    valorHoraParada: 0
  });

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    try {
      setLoading(true);
      const data = await towingService.listRates();
      setRates(data);
    } catch (error) {
      toast.error('Erro ao carregar taxas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await towingService.saveRate({
        tipoGuincho: formData.tipoGuincho,
        taxaSaida: Number(formData.taxaSaida),
        valorKm: Number(formData.valorKm),
        valorHoraParada: Number(formData.valorHoraParada)
      });
      toast.success('Taxa salva com sucesso!');
      loadRates();
      setFormData({ id: '', tipoGuincho: '', taxaSaida: 0, valorKm: 0, valorHoraParada: 0 });
    } catch (error) {
      toast.error('Erro ao salvar taxa');
    }
  };

  const handleEdit = (rate: any) => {
    setFormData({
      id: rate.id,
      tipoGuincho: rate.tipoGuincho,
      taxaSaida: rate.taxaSaida,
      valorKm: rate.valorKm,
      valorHoraParada: rate.valorHoraParada
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="text-primary" />
          Tabelas de Frete
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-card border rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold mb-4 text-lg">Nova Taxa / Tabela</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Tipo de Guincho</label>
              <input 
                value={formData.tipoGuincho}
                onChange={e => setFormData({...formData, tipoGuincho: e.target.value})}
                className="w-full bg-background border rounded-lg py-2 px-3 focus:border-primary focus:outline-none text-sm"
                placeholder="Ex: Leve, Pesado, Plataforma"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Taxa de Saída (R$)</label>
              <input 
                type="number"
                step="0.01"
                value={formData.taxaSaida}
                onChange={e => setFormData({...formData, taxaSaida: Number(e.target.value)})}
                className="w-full bg-background border rounded-lg py-2 px-3 focus:border-primary focus:outline-none text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Valor por KM (R$)</label>
              <input 
                type="number"
                step="0.01"
                value={formData.valorKm}
                onChange={e => setFormData({...formData, valorKm: Number(e.target.value)})}
                className="w-full bg-background border rounded-lg py-2 px-3 focus:border-primary focus:outline-none text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Valor Hora Parada (R$)</label>
              <input 
                type="number"
                step="0.01"
                value={formData.valorHoraParada}
                onChange={e => setFormData({...formData, valorHoraParada: Number(e.target.value)})}
                className="w-full bg-background border rounded-lg py-2 px-3 focus:border-primary focus:outline-none text-sm"
                required
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
                <th className="px-4 py-3 font-medium">Tipo Guincho</th>
                <th className="px-4 py-3 font-medium text-right">Saída</th>
                <th className="px-4 py-3 font-medium text-right">Por KM</th>
                <th className="px-4 py-3 font-medium text-right">Hora Parada</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rates.map(r => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{r.tipoGuincho}</td>
                  <td className="px-4 py-3 text-right">R$ {r.taxaSaida.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">R$ {r.valorKm.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">R$ {r.valorHoraParada.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleEdit(r)} className="text-slate-400 hover:text-primary p-1">
                      <Edit3 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {rates.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-muted-foreground">Nenhuma tabela cadastrada</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
