import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Search, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from '../../../utils/toast.helper';
import { ModalFooterActions } from '../../../components/ui/ModalFooterActions';

export function FederalTaxes() {
  const [taxes, setTaxes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTax, setSelectedTax] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cstPis, setCstPis] = useState('');
  const [cstCofins, setCstCofins] = useState('');
  const [cstIpi, setCstIpi] = useState('');
  const [aliquotaPis, setAliquotaPis] = useState<number>(0);
  const [aliquotaCofins, setAliquotaCofins] = useState<number>(0);
  const [aliquotaIpi, setAliquotaIpi] = useState<number>(0);
  const [naturezaReceita, setNaturezaReceita] = useState('');
  const [status, setStatus] = useState('ATIVO');

  const token = localStorage.getItem('token');

  const fetchTaxes = async () => {
    try {
      const response = await fetch('/fiscal/tributacao/federal', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setTaxes(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch federal taxes', error);
      toast.error('Erro ao carregar regras de tributação federal.');
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  const handleOpenCreateModal = () => {
    setSelectedTax(null);
    setCodigo('');
    setDescricao('');
    setCstPis('');
    setCstCofins('');
    setCstIpi('');
    setAliquotaPis(0);
    setAliquotaCofins(0);
    setAliquotaIpi(0);
    setNaturezaReceita('');
    setStatus('ATIVO');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tax: any) => {
    setSelectedTax(tax);
    setCodigo(tax.codigo);
    setDescricao(tax.descricao);
    setCstPis(tax.cstPis || '');
    setCstCofins(tax.cstCofins || '');
    setCstIpi(tax.cstIpi || '');
    setAliquotaPis(tax.aliquotaPis || 0);
    setAliquotaCofins(tax.aliquotaCofins || 0);
    setAliquotaIpi(tax.aliquotaIpi || 0);
    setNaturezaReceita(tax.naturezaReceita || '');
    setStatus(tax.status || 'ATIVO');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTax(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!codigo || !descricao) {
      toast.error('Código e Descrição são campos obrigatórios.');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    const payload = {
      codigo,
      descricao,
      cstPis: cstPis || null,
      cstCofins: cstCofins || null,
      cstIpi: cstIpi || null,
      aliquotaPis: Number(aliquotaPis),
      aliquotaCofins: Number(aliquotaCofins),
      aliquotaIpi: Number(aliquotaIpi),
      naturezaReceita: naturezaReceita || null,
      status,
    };

    try {
      const url = selectedTax ? `/fiscal/tributacao/federal/${selectedTax.id}` : '/fiscal/tributacao/federal';
      const method = selectedTax ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(selectedTax ? 'Tributação federal atualizada!' : 'Tributação federal cadastrada!');
        handleCloseModal();
        fetchTaxes();
      } else {
        handleApiError(response, 'Erro ao salvar regra federal.');
      }
    } catch (error) {
      console.error('Failed to save tax', error);
      handleApiError(error, 'Erro de conexão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Deseja excluir a regra federal "${code}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/fiscal/tributacao/federal/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Regra excluída com sucesso!');
        fetchTaxes();
      } else {
        handleApiError(response, 'Não foi possível excluir. O registro pode estar vinculado a produtos.');
      }
    } catch (error) {
      console.error('Failed to delete tax', error);
      toast.error('Erro de conexão ao excluir.');
    }
  };

  const filteredTaxes = taxes.filter(tax => {
    const search = searchTerm.toLowerCase();
    return (
      tax.codigo.toLowerCase().includes(search) ||
      tax.descricao.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tributação Federal</h1>
          <p className="text-muted-foreground text-sm">Gerencie as alíquotas de impostos federais (PIS, COFINS, IPI) e seus respectivos CSTs.</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow hover:bg-primary/90 transition w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>Nova Regra Federal</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Buscar por código ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-background border border-border pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-primary text-sm"
          />
        </div>
      </div>

      {/* Table grid */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground text-sm">
                <th className="p-4 font-medium">Código</th>
                <th className="p-4 font-medium">Descrição</th>
                <th className="p-4 font-medium">PIS</th>
                <th className="p-4 font-medium">COFINS</th>
                <th className="p-4 font-medium">IPI</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTaxes.map((tax) => (
                <tr key={tax.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="p-4 font-bold text-foreground">{tax.codigo}</td>
                  <td className="p-4 text-sm text-foreground">
                    <div>{tax.descricao}</div>
                    {tax.naturezaReceita && <div className="text-[10px] text-muted-foreground">Nat. Receita: {tax.naturezaReceita}</div>}
                  </td>
                  <td className="p-4 text-sm text-foreground">
                    <div className="font-semibold">{tax.aliquotaPis}%</div>
                    {tax.cstPis && <div className="text-[10px] text-muted-foreground font-mono">CST: {tax.cstPis}</div>}
                  </td>
                  <td className="p-4 text-sm text-foreground">
                    <div className="font-semibold">{tax.aliquotaCofins}%</div>
                    {tax.cstCofins && <div className="text-[10px] text-muted-foreground font-mono">CST: {tax.cstCofins}</div>}
                  </td>
                  <td className="p-4 text-sm text-foreground">
                    <div className="font-semibold">{tax.aliquotaIpi}%</div>
                    {tax.cstIpi && <div className="text-[10px] text-muted-foreground font-mono">CST: {tax.cstIpi}</div>}
                  </td>
                  <td className="p-4 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      tax.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                    }`}>
                      {tax.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleOpenEditModal(tax)}
                        className="p-1.5 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(tax.id, tax.codigo)}
                        className="p-1.5 bg-rose-500/10 text-rose-600 rounded hover:bg-rose-500/20 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTaxes.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Nenhuma regra cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 relative">
            <button onClick={handleCloseModal} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1">
              <X size={18} />
            </button>
            <div className="p-6 border-b border-border flex items-center gap-2 bg-muted/20">
              <Percent className="text-primary" size={20} />
              <h3 className="text-lg font-bold text-foreground">
                {selectedTax ? 'Editar Regra Federal' : 'Nova Regra Federal'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-semibold text-foreground">Código *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: PIS-COF-AL"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-semibold text-foreground">Descrição *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Alíquota Básica Fed. (PIS/COFINS)"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* PIS */}
              <div className="border-t border-border pt-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">PIS</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">CST PIS</label>
                    <input
                      type="text"
                      placeholder="Ex: 01"
                      value={cstPis}
                      onChange={(e) => setCstPis(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Alíquota PIS (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={aliquotaPis}
                      onChange={(e) => setAliquotaPis(Number(e.target.value))}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* COFINS */}
              <div className="border-t border-border pt-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">COFINS</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">CST COFINS</label>
                    <input
                      type="text"
                      placeholder="Ex: 01"
                      value={cstCofins}
                      onChange={(e) => setCstCofins(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Alíquota COFINS (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={aliquotaCofins}
                      onChange={(e) => setAliquotaCofins(Number(e.target.value))}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* IPI */}
              <div className="border-t border-border pt-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">IPI</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">CST IPI</label>
                    <input
                      type="text"
                      placeholder="Ex: 49"
                      value={cstIpi}
                      onChange={(e) => setCstIpi(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Alíquota IPI (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={aliquotaIpi}
                      onChange={(e) => setAliquotaIpi(Number(e.target.value))}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-3 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Cód. Natureza da Receita</label>
                  <input
                    type="text"
                    placeholder="Ex: 999"
                    value={naturezaReceita}
                    onChange={(e) => setNaturezaReceita(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="ATIVO">ATIVO</option>
                    <option value="INATIVO">INATIVO</option>
                  </select>
                </div>
              </div>

              <ModalFooterActions
                onCancel={handleCloseModal}
                primaryLabel={selectedTax ? 'Atualizar' : 'Cadastrar'}
                loading={isSubmitting}
                primaryType="submit"
                flush
              />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
