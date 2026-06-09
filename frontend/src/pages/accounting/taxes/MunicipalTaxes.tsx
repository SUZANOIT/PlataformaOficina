import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Search, Percent, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from '../../../utils/toast.helper';
import { ModalFooterActions } from '../../../components/ui/ModalFooterActions';

export function MunicipalTaxes() {
  const [taxes, setTaxes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTax, setSelectedTax] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [codigoServico, setCodigoServico] = useState('');
  const [aliquotaIss, setAliquotaIss] = useState<number>(0);
  const [retencaoIss, setRetencaoIss] = useState(false);
  const [situacaoTributaria, setSituacaoTributaria] = useState('01');
  const [status, setStatus] = useState('ATIVO');

  const token = localStorage.getItem('token');

  const fetchTaxes = async () => {
    try {
      const response = await fetch('/fiscal/tributacao/municipal', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setTaxes(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch municipal taxes', error);
      toast.error('Erro ao carregar regras de tributação municipal.');
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  const handleOpenCreateModal = () => {
    setSelectedTax(null);
    setCodigo('');
    setDescricao('');
    setMunicipio('');
    setCodigoServico('');
    setAliquotaIss(0);
    setRetencaoIss(false);
    setSituacaoTributaria('01');
    setStatus('ATIVO');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tax: any) => {
    setSelectedTax(tax);
    setCodigo(tax.codigo);
    setDescricao(tax.descricao);
    setMunicipio(tax.municipio || '');
    setCodigoServico(tax.codigoServico || '');
    setAliquotaIss(tax.aliquotaIss || 0);
    setRetencaoIss(tax.retencaoIss || false);
    setSituacaoTributaria(tax.situacaoTributaria || '01');
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
      municipio: municipio || null,
      codigoServico: codigoServico || null,
      aliquotaIss: Number(aliquotaIss),
      retencaoIss,
      situacaoTributaria: situacaoTributaria || null,
      status,
    };

    try {
      const url = selectedTax ? `/fiscal/tributacao/municipal/${selectedTax.id}` : '/fiscal/tributacao/municipal';
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
        toast.success(selectedTax ? 'Tributação municipal atualizada!' : 'Tributação municipal cadastrada!');
        handleCloseModal();
        fetchTaxes();
      } else {
        handleApiError(response, 'Erro ao salvar regra municipal.');
      }
    } catch (error) {
      console.error('Failed to save tax', error);
      handleApiError(error, 'Erro de conexão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Deseja excluir a regra municipal "${code}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/fiscal/tributacao/municipal/${id}`, {
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
      (tax.municipio && tax.municipio.toLowerCase().includes(search))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tributação Municipal</h1>
          <p className="text-muted-foreground text-sm">Configure as alíquotas de ISS, códigos de serviço e regras de retenção municipal.</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow hover:bg-primary/90 transition w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>Nova Regra Municipal</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Buscar por código, descrição ou município..."
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
                <th className="p-4 font-medium">Código / Identificador</th>
                <th className="p-4 font-medium">Descrição</th>
                <th className="p-4 font-medium">Alíquota ISS</th>
                <th className="p-4 font-medium">Retenção na Fonte</th>
                <th className="p-4 font-medium">Localidade / Cód. Serviço</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTaxes.map((tax) => (
                <tr key={tax.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="p-4 font-bold text-foreground">{tax.codigo}</td>
                  <td className="p-4 text-sm text-foreground">{tax.descricao}</td>
                  <td className="p-4 text-sm font-semibold text-foreground flex items-center gap-1">
                    <Percent size={14} className="text-amber-500" /> {tax.aliquotaIss}%
                  </td>
                  <td className="p-4 text-sm">
                    {tax.retencaoIss ? (
                      <span className="text-emerald-500 flex items-center gap-1 font-semibold text-xs"><CheckCircle2 size={14} /> Sim</span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1 text-xs"><AlertCircle size={14} /> Não</span>
                    )}
                  </td>
                  <td className="p-4 text-xs text-muted-foreground space-y-0.5">
                    {tax.municipio && <div>Município: {tax.municipio}</div>}
                    {tax.codigoServico && <div>Serviço: {tax.codigoServico}</div>}
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
                {selectedTax ? 'Editar Regra Municipal' : 'Nova Regra Municipal'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-semibold text-foreground">Código *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: ISS-SP"
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
                    placeholder="Ex: ISS Padrão São Paulo"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Município</label>
                  <input
                    type="text"
                    placeholder="Ex: São Paulo"
                    value={municipio}
                    onChange={(e) => setMunicipio(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Código do Serviço (LC 116)</label>
                  <input
                    type="text"
                    placeholder="Ex: 14.01"
                    value={codigoServico}
                    onChange={(e) => setCodigoServico(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Alíquota ISS (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={aliquotaIss}
                    onChange={(e) => setAliquotaIss(Number(e.target.value))}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Situação Tributária (CST)</label>
                  <input
                    type="text"
                    placeholder="Ex: 01"
                    value={situacaoTributaria}
                    onChange={(e) => setSituacaoTributaria(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center bg-muted/40 p-3 rounded-lg border border-border/80">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">Retenção de ISS</span>
                  <span className="text-[10px] text-muted-foreground">Regra exige retenção do imposto pelo tomador</span>
                </div>
                <input
                  type="checkbox"
                  checked={retencaoIss}
                  onChange={(e) => setRetencaoIss(e.target.checked)}
                  className="w-4 h-4 rounded text-primary border-border focus:ring-primary"
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
