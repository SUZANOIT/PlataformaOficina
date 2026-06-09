import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { handleApiError } from '../../utils/toast.helper';
import { 
  Tag, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  TrendingDown, 
  TrendingUp, 
  Layers,
  X,
  FolderOpen
} from 'lucide-react';
import { ModalFooterActions } from '../../components/ui/ModalFooterActions';

interface Category {
  id: string;
  name: string;
  type: 'PAYABLE' | 'RECEIVABLE' | 'BOTH';
  createdAt: string;
}

export function FinancialCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PAYABLE' | 'RECEIVABLE' | 'BOTH'>('ALL');
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<'PAYABLE' | 'RECEIVABLE' | 'BOTH'>('PAYABLE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/financial/categories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw response;
      }
      
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      handleApiError(error, 'Erro ao carregar categorias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Handle open modal for create
  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setType('PAYABLE');
    setIsModalOpen(true);
  };

  // Handle open modal for edit
  const handleOpenEditModal = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setType(category.type);
    setIsModalOpen(true);
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('O nome da categoria é obrigatório.');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      
      const url = editingCategory 
        ? `/financial/categories/${editingCategory.id}`
        : '/financial/categories';
        
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, type })
      });

      if (!response.ok) {
        throw response;
      }

      toast.success(editingCategory ? 'Categoria atualizada com sucesso!' : 'Categoria criada com sucesso!');
      setIsModalOpen(false);
      fetchCategories();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      handleApiError(error, 'Erro ao salvar categoria financeira.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete handler
  const handleDelete = async (category: Category) => {
    if (!window.confirm(`Tem certeza que deseja excluir a categoria "${category.name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/financial/categories/${category.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw response;
      }

      toast.success('Categoria excluída com sucesso!');
      fetchCategories();
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      handleApiError(error, 'Não foi possível excluir a categoria.');
    }
  };

  // Filter logic
  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'ALL') return matchesSearch;
    return category.type === activeTab && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-6 rounded-2xl border border-border/60 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Tag size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Categorias Financeiras</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie e organize as categorias de lançamentos de Contas a Pagar e Contas a Receber.
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 self-start sm:self-center"
        >
          <Plus size={20} />
          <span>Nova Categoria</span>
        </button>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Pesquisar categoria..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border hover:border-border/80 focus:border-primary rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary/20 transition duration-150 text-foreground"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex items-center bg-card border border-border p-1 rounded-xl w-fit self-start">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              activeTab === 'ALL' 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setActiveTab('PAYABLE')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              activeTab === 'PAYABLE' 
                ? 'bg-red-500 text-white shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            }`}
          >
            Contas a Pagar
          </button>
          <button
            onClick={() => setActiveTab('RECEIVABLE')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              activeTab === 'RECEIVABLE' 
                ? 'bg-emerald-500 text-white shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            }`}
          >
            Contas a Receber
          </button>
          <button
            onClick={() => setActiveTab('BOTH')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              activeTab === 'BOTH' 
                ? 'bg-indigo-500 text-white shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            }`}
          >
            Ambos
          </button>
        </div>
      </div>

      {/* CATEGORIES GRID */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card/50 border border-border p-5 rounded-2xl h-36 flex flex-col justify-between animate-pulse">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted/65" />
                  <div className="space-y-2">
                    <div className="h-4 w-28 bg-muted/65 rounded-sm" />
                    <div className="h-3 w-16 bg-muted/50 rounded-sm" />
                  </div>
                </div>
                <div className="w-6 h-6 bg-muted/50 rounded-full" />
              </div>
              <div className="flex justify-end gap-2">
                <div className="w-8 h-8 bg-muted/50 rounded-lg" />
                <div className="w-8 h-8 bg-muted/50 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-2xl border border-border/60 shadow-xs text-center space-y-4">
          <div className="p-4 bg-muted rounded-full text-muted-foreground">
            <FolderOpen size={48} />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">Nenhuma categoria encontrada</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Não há nenhuma categoria cadastrada ou nenhuma corresponde ao filtro selecionado.
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary font-semibold px-4 py-2 rounded-xl transition duration-150 text-sm active:scale-95"
          >
            <Plus size={16} />
            <span>Cadastrar Categoria</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category) => {
            // Style maps by type
            const isPayable = category.type === 'PAYABLE';
            const isReceivable = category.type === 'RECEIVABLE';

            let cardStyles = '';
            let iconContainer = null;
            let badgeText = '';
            let badgeStyles = '';

            if (isPayable) {
              cardStyles = 'border-red-500/20 bg-red-500/[0.01] hover:bg-red-500/[0.03] hover:border-red-500/40';
              iconContainer = <div className="p-2.5 bg-red-500/10 text-red-500 rounded-xl"><TrendingDown size={20} /></div>;
              badgeText = 'A Pagar';
              badgeStyles = 'bg-red-500/10 text-red-500 border border-red-500/20';
            } else if (isReceivable) {
              cardStyles = 'border-emerald-500/20 bg-emerald-500/[0.01] hover:bg-emerald-500/[0.03] hover:border-emerald-500/40';
              iconContainer = <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl"><TrendingUp size={20} /></div>;
              badgeText = 'A Receber';
              badgeStyles = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
            } else {
              cardStyles = 'border-indigo-500/20 bg-indigo-500/[0.01] hover:bg-indigo-500/[0.03] hover:border-indigo-500/40';
              iconContainer = <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl"><Layers size={20} /></div>;
              badgeText = 'Ambos';
              badgeStyles = 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20';
            }

            return (
              <div 
                key={category.id} 
                className={`flex flex-col justify-between p-5 bg-card border rounded-2xl shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md group ${cardStyles}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {iconContainer}
                    <div>
                      <h3 className="font-bold text-foreground group-hover:text-primary transition duration-150 text-base">{category.name}</h3>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold mt-1 uppercase tracking-wider ${badgeStyles}`}>
                        {badgeText}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/40 mt-5 pt-3">
                  <span className="text-[10px] text-muted-foreground">
                    Criado em {new Date(category.createdAt).toLocaleDateString()}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditModal(category)}
                      className="p-2 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                      title="Editar Categoria"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(category)}
                      className="p-2 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-lg transition-colors"
                      title="Excluir Categoria"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => { if (!isSubmitting) setIsModalOpen(false); }}
          />

          {/* Dialog Container */}
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl relative z-10 overflow-hidden transform scale-100 transition-all duration-300 animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/60 bg-muted/40">
              <div>
                <h3 className="font-bold text-lg text-foreground">
                  {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </h3>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {editingCategory ? 'Modifique os dados da categoria selecionada.' : 'Cadastre uma nova categoria de fluxo de caixa.'}
                </p>
              </div>
              <button
                disabled={isSubmitting}
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Nome da Categoria *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Peças / Estoque, Aluguel"
                    disabled={isSubmitting}
                    className="w-full bg-background border border-border hover:border-border/80 focus:border-primary rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary/20 transition text-foreground"
                    required
                    autoFocus
                  />
                </div>

                {/* Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Tipo de Categoria *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    disabled={isSubmitting}
                    className="w-full bg-background border border-border hover:border-border/80 focus:border-primary rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary/20 transition text-foreground"
                  >
                    <option value="PAYABLE">Contas a Pagar (Despesas)</option>
                    <option value="RECEIVABLE">Contas a Receber (Receitas)</option>
                    <option value="BOTH">Ambos</option>
                  </select>
                </div>
              </div>

              <ModalFooterActions
                onCancel={() => setIsModalOpen(false)}
                primaryLabel="Salvar Categoria"
                loading={isSubmitting}
                primaryType="submit"
              />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
