import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Search, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from '../../../utils/toast.helper';

export function EstadualTaxes() {
  const [taxes, setTaxes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTax, setSelectedTax] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [uf, setUf] = useState('');
  const [cfop, setCfop] = useState('');
  const [cstIcms, setCstIcms] = useState('');
  const [csosn, setCsosn] = useState('');
  const [aliquotaIcms, setAliquotaIcms] = useState<number>(0);
  const [fcp, setFcp] = useState<number>(0);
  const [difal, setDifal] = useState<number>(0);
  const [observacao, setObservacao] = useState('');
  const [status, setStatus] = useState('ATIVO');

  const token = localStorage.getItem('token');

  const fetchTaxes = async () => {
    try {
      const response = await fetch('/fiscal/tributacao/estadual', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setTaxes(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch estadual taxes', error);
      toast.error('Erro ao carregar regras de tributação estadual.');
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  const handleOpenCreateModal = () => {
    setSelectedTax(null);
    setCodigo('');
    setDescricao('');
    setUf('');
    setCfop('');
    setCstIcms('');
    setCsosn('');
    setAliquotaIcms(0);
    setFcp(0);
    setDifal(0);
    setObservacao('');
    setStatus('ATIVO');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tax: any) => {
    setSelectedTax(tax);
    setCodigo(tax.codigo);
    setDescricao(tax.descricao);
    setUf(tax.uf || '');
    setCfop(tax.cfop || '');
    setCstIcms(tax.cstIcms || '');
    setCsosn(tax.csosn || '');
    setAliquotaIcms(tax.aliquotaIcms || 0);
    setFcp(tax.fcp || 0);
    setDifal(tax.difal || 0);
    setObservacao(tax.observacao || '');
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
      uf: uf || null,
      cfop: cfop || null,
      cstIcms: cstIcms || null,
      csosn: csosn || null,
      aliquotaIcms: Number(aliquotaIcms),
      fcp: Number(fcp),
      difal: Number(difal),
      observacao: observacao || null,
      status,
    };

    try {
      const url = selectedTax ? `/fiscal/tributacao/estadual/${selectedTax.id}` : '/fiscal/tributacao/estadual';
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
        toast.success(selectedTax ? 'Tributação estadual atualizada!' : 'Tributação estadual cadastrada!');
        handleCloseModal();
        fetchTaxes();
      } else {
        handleApiError(response, 'Erro ao salvar regra estadual.');
      }
    } catch (error) {
      console.error('Failed to save tax', error);
      handleApiError(error, 'Erro de conexão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Deseja excluir a regra estadual "${code}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/fiscal/tributacao/estadual/${id}`, {
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
      tax.descricao.toLowerCase().includes(search) ||
      (tax.uf && tax.uf.toLowerCase().includes(search))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tributação Estadual</h1>
          <p className="text-muted-foreground text-sm">Configure as alíquotas de ICMS, CST/CSOSN, FCP e DIFAL para cada estado (UF).</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow hover:bg-primary/90 transition w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>Nova Regra Estadual</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Buscar por código, descrição ou estado (UF)..."
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
                <th className="p-4 font-medium">Código / UF</th>
                <th className="p-4 font-medium">Descrição</th>
                <th className="p-4 font-medium">Alíquota ICMS</th>
                <th className="p-4 font-medium">CST / CSOSN</th>
                <th className="p-4 font-medium">FCP / DIFAL</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTaxes.map((tax) => (
                <tr key={tax.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-foreground">{tax.codigo}</div>
                    <div className="text-xs text-muted-foreground">Estado: {tax.uf || 'Todos'}</div>
                  </td>
                  <td className="p-4 text-sm text-foreground">
                    <div>{tax.descricao}</div>
                    {tax.cfop && <div className="text-[10px] text-muted-foreground font-mono">CFOP: {tax.cfop}</div>}
                  </td>
                  <td className="p-4 text-sm font-semibold text-foreground flex items-center gap-1">
                    <Percent size={14} className="text-orange-500" /> {tax.aliquotaIcms}%
                  </td>
                  <td className="p-4 text-sm font-mono text-foreground space-y-0.5">
                    {tax.cstIcms && <div>CST: {tax.cstIcms}</div>}
                    {tax.csosn && <div>CSOSN: {tax.csosn}</div>}
                    {!tax.cstIcms && !tax.csosn && <span className="text-muted-foreground italic text-xs">Não definido</span>}
                  </td>
                  <td className="p-4 text-xs text-muted-foreground space-y-0.5">
                    <div>FCP: {tax.fcp}%</div>
                    <div>DIFAL: {tax.difal}%</div>
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
                {selectedTax ? 'Editar Regra Estadual' : 'Nova Regra Estadual'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-semibold text-foreground">Código *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: ICMS-SP"
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
                    placeholder="Ex: ICMS Normal SP 18%"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">UF (Estado)</label>
                  <input
                    type="text"
                    placeholder="Ex: SP"
                    maxLength={2}
                    value={uf}
                    onChange={(e) => setUf(e.target.value.toUpperCase())}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">CFOP Entrada</label>
                  <input
                    type="text"
                    placeholder="Ex: 1102"
                    value={cfop}
                    onChange={(e) => setCfop(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Alíquota ICMS (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={aliquotaIcms}
                    onChange={(e) => setAliquotaIcms(Number(e.target.value))}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">CST ICMS (Normal)</label>
                  <input
                    type="text"
                    placeholder="Ex: 00"
                    value={cstIcms}
                    onChange={(e) => setCstIcms(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">CSOSN (Simples)</label>
                  <input
                    type="text"
                    placeholder="Ex: 102"
                    value={csosn}
                    onChange={(e) => setCsosn(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Alíquota FCP (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fcp}
                    onChange={(e) => setFcp(Number(e.target.value))}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Alíquota DIFAL (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={difal}
                    onChange={(e) => setDifal(Number(e.target.value))}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Observações Fiscais</label>
                <textarea
                  placeholder="Ex: Alíquota reduzida conforme decreto..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
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

              <div className="border-t border-border pt-4 flex justify-end gap-3 bg-muted/10 -mx-6 -mb-6 p-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground px-5 py-2 rounded-lg font-semibold shadow hover:bg-primary/90 transition text-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : (selectedTax ? 'Atualizar' : 'Cadastrar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
