import { useState, useEffect } from 'react';
import { UserCheck, Save, Edit, Trash2 } from 'lucide-react';
import { towingService } from '../../services/towing.service';
import { toast } from 'sonner';

export function TowingDrivers() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    id: '',
    nome: '',
    cpf: '',
    cnh: '',
    categoria: '',
    validadeCnh: ''
  });

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const data = await towingService.listDrivers();
      setDrivers(data);
    } catch (error) {
      toast.error('Erro ao carregar motoristas');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (driver: any) => {
    setFormData({
      id: driver.id,
      nome: driver.nome || '',
      cpf: driver.cpf || '',
      cnh: driver.cnh || '',
      categoria: driver.categoria || '',
      validadeCnh: driver.validadeCnh ? new Date(driver.validadeCnh).toISOString().split('T')[0] : ''
    });
  };

  const handleCancelEdit = () => {
    setFormData({
      id: '',
      nome: '',
      cpf: '',
      cnh: '',
      categoria: '',
      validadeCnh: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        nome: formData.nome,
        cpf: formData.cpf,
        cnh: formData.cnh,
        categoria: formData.categoria,
        validadeCnh: formData.validadeCnh
      };

      if (formData.id) {
        await towingService.updateDriver(formData.id, payload);
        toast.success('Motorista atualizado com sucesso!');
      } else {
        await towingService.createDriver(payload);
        toast.success('Motorista cadastrado com sucesso!');
      }
      loadDrivers();
      handleCancelEdit();
    } catch (error) {
      toast.error('Erro ao salvar motorista');
    }
  };

  const handleDelete = async (driver: any) => {
    if (window.confirm(`Tem certeza que deseja excluir o motorista ${driver.nome}?`)) {
      try {
        await towingService.deleteDriver(driver.id);
        toast.success('Motorista excluído com sucesso!');
        loadDrivers();
        if (formData.id === driver.id) {
          handleCancelEdit();
        }
      } catch (error) {
        toast.error('Erro ao excluir motorista');
      }
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserCheck className="text-primary" />
          Motoristas de Guincho
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-card border rounded-xl p-4 shadow-sm h-fit">
          <h2 className="font-semibold mb-4 text-lg">
            {formData.id ? 'Editar Motorista' : 'Novo Motorista'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Nome Completo *</label>
              <input 
                value={formData.nome}
                onChange={e => setFormData({...formData, nome: e.target.value})}
                className="w-full bg-background border rounded-lg py-2 px-3 focus:border-primary focus:outline-none text-sm"
                placeholder="Nome do Motorista"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">CPF *</label>
              <input 
                value={formData.cpf}
                onChange={e => setFormData({...formData, cpf: e.target.value})}
                className="w-full bg-background border rounded-lg py-2 px-3 focus:border-primary focus:outline-none text-sm"
                placeholder="000.000.000-00"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">CNH *</label>
              <input 
                value={formData.cnh}
                onChange={e => setFormData({...formData, cnh: e.target.value})}
                className="w-full bg-background border rounded-lg py-2 px-3 focus:border-primary focus:outline-none text-sm"
                placeholder="Número da CNH"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Categoria</label>
                <input 
                  value={formData.categoria}
                  onChange={e => setFormData({...formData, categoria: e.target.value.toUpperCase()})}
                  className="w-full bg-background border rounded-lg py-2 px-3 focus:border-primary focus:outline-none text-sm"
                  placeholder="Ex: AE"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Validade</label>
                <input 
                  type="date"
                  value={formData.validadeCnh}
                  onChange={e => setFormData({...formData, validadeCnh: e.target.value})}
                  className="w-full bg-background border rounded-lg py-2 px-3 focus:border-primary focus:outline-none text-sm"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              {formData.id && (
                <button 
                  type="button" 
                  onClick={handleCancelEdit}
                  className="w-full bg-muted border border-border text-foreground py-2 rounded-lg hover:bg-muted/80 transition text-sm font-semibold"
                >
                  Cancelar
                </button>
              )}
              <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold">
                <Save size={16} /> Salvar
              </button>
            </div>
          </form>
        </div>

        <div className="md:col-span-2 bg-card border rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">CPF</th>
                <th className="px-4 py-3 font-medium">CNH</th>
                <th className="px-4 py-3 font-medium text-center">Categoria</th>
                <th className="px-4 py-3 font-medium">Validade CNH</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {drivers.map(d => (
                <tr key={d.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-primary">{d.nome}</td>
                  <td className="px-4 py-3">{d.cpf}</td>
                  <td className="px-4 py-3">{d.cnh}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 bg-secondary rounded text-xs font-bold">{d.categoria}</span>
                  </td>
                  <td className="px-4 py-3">
                    {new Date(d.validadeCnh).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 justify-end">
                      <button 
                        onClick={() => handleEdit(d)}
                        className="p-1.5 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(d)}
                        className="p-1.5 bg-rose-500/10 text-rose-600 rounded hover:bg-rose-500/20 transition"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {drivers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-muted-foreground">Nenhum motorista cadastrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
