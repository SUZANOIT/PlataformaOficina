import { useState, useRef, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, FileDown, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { quoteService } from '../services/quoteService';
import { QuotePdfTemplate } from '../components/QuotePdfTemplate';
import { useGeneratePdf } from '../hooks/useGeneratePdf';

type QuoteFormValues = {
  companyId: string;
  client: {
    nome: string;
    empresa: string;
    cnpj?: string;
    telefone: string;
    email: string;
    cidade: string;
    estado: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cep?: string;
    dataSituacao?: string;
    atividadePrincipal?: string;
  };
  condicaoPagamento: string;
  parcelas?: number;
  valorParcela?: number;
  validade: string;
  garantia: string;
  prazoExecucao: string;
  items: {
    descricao: string;
    quantidade: number;
    valorUnitario: number;
  }[];
  observacao?: string;
};

const condicoesPagamento = [
  'À vista', '7 dias', '14 dias', '21 dias', '28 dias', '30 dias', '45 dias', '60 dias', 'Parcelado'
];

export function CreateQuote() {
  const [companies, setCompanies] = useState<any[]>([]);
  const pdfRef = useRef<HTMLDivElement>(null);
  const { generatePdf, isGeneratingPdf } = useGeneratePdf();

  // Load companies
  useState(() => {
    const fetchCompanies = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/companies', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setCompanies(data);
        }
      } catch (error) {
        console.error("Failed to load companies", error);
      }
    };
    fetchCompanies();
  });
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const cloneId = searchParams.get('clone');
  const isEditing = !!id;

  const { register, control, watch, handleSubmit, setValue, reset } = useForm<QuoteFormValues>({
    defaultValues: {
      items: [{ descricao: '', quantidade: 1, valorUnitario: 0 }],
      validade: 'Proposta válida por 7 dias',
      garantia: 'Garantia de 90 dias',
      prazoExecucao: '5 dias úteis',
      observacao: ''
    }
  });

  // Load quote for edit or clone
  useEffect(() => {
    const fetchQuote = async () => {
      const quoteId = id || cloneId;
      if (!quoteId) return;

      try {
        const data = await quoteService.getQuote(quoteId);
        
        const formData: any = {
          companyId: isEditing ? data.companyId : '', // Se for clone, obriga a escolher nova empresa
          client: data.client,
          condicaoPagamento: data.condicaoPagamento,
          parcelas: data.parcelas,
          valorParcela: data.valorParcela,
          validade: data.validade,
          garantia: data.garantia,
          prazoExecucao: data.prazoExecucao,
          observacao: data.observacao || '',
          items: data.items.map((i: any) => ({
            descricao: i.descricao,
            quantidade: i.quantidade,
            valorUnitario: i.valorUnitario,
          }))
        };
        
        reset(formData);
      } catch (error) {
        toast.error('Erro ao carregar os dados do orçamento.');
        console.error(error);
      }
    };
    
    fetchQuote();
  }, [id, cloneId, reset, isEditing]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchItems = watch('items');
  const watchCondicao = watch('condicaoPagamento');

  const subtotal = watchItems.reduce((acc, item) => acc + (Number(item.quantidade) * Number(item.valorUnitario)), 0);
  const total = subtotal; // no future adding discounts or taxes yet

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleCnpjSearch = async () => {
    const cnpj = watch('client.cnpj')?.replace(/\D/g, '');
    if (!cnpj || cnpj.length !== 14) {
      alert('CNPJ inválido (deve conter 14 dígitos)');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/cnpj/${cnpj}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'ERROR') {
        alert(data.message);
        return;
      }
      
      setValue('client.nome', data.nome);
      setValue('client.empresa', data.fantasia || data.nome);
      setValue('client.logradouro', data.logradouro);
      setValue('client.numero', data.numero);
      setValue('client.complemento', data.complemento);
      setValue('client.bairro', data.bairro);
      setValue('client.cidade', data.municipio);
      setValue('client.estado', data.uf);
      setValue('client.cep', data.cep);
      setValue('client.email', data.email);
      setValue('client.telefone', data.telefone);
      setValue('client.dataSituacao', data.data_situacao);
      if (data.atividade_principal && data.atividade_principal.length > 0) {
        setValue('client.atividadePrincipal', data.atividade_principal[0].text);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao buscar CNPJ');
    }
  };

  const onSubmit = async (data: QuoteFormValues) => {
    try {
      const payload = {
        ...data,
        items: data.items.map(item => ({
           ...item,
           quantidade: Number(item.quantidade),
           valorUnitario: Number(item.valorUnitario),
           valorTotal: Number(item.quantidade) * Number(item.valorUnitario)
        })),
        subtotal,
        total
      };

      toast.loading(isEditing ? 'Atualizando orçamento...' : 'Salvando orçamento...', { id: 'save-quote' });
      
      let savedData;
      if (isEditing) {
        savedData = await quoteService.updateQuote(id, payload);
        toast.success('Orçamento atualizado com sucesso!', { id: 'save-quote' });
      } else {
        savedData = await quoteService.saveQuote(payload);
        toast.success('Orçamento salvo com sucesso!', { id: 'save-quote' });
        // Se foi um clone, podemos redirecionar pro Edit ou manter na tela
        if (cloneId) {
          navigate(`/quotes/edit/${savedData.id}`, { replace: true });
        }
      }
      
      toast.loading('Gerando PDF...', { id: 'pdf-toast' });
      await generatePdf(pdfRef.current, `orcamento-${data.client.nome || 'novo'}.pdf`);
      toast.success('PDF gerado com sucesso!', { id: 'pdf-toast' });

    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar o orçamento', { id: 'save-quote' });
      console.error(error);
    }
  };

  const handleGeneratePDF = async () => {
    const data = watch();
    toast.loading('Gerando PDF...', { id: 'pdf-toast' });
    try {
      await generatePdf(pdfRef.current, `orcamento-${data.client.nome || 'novo'}.pdf`);
      toast.success('PDF gerado com sucesso!', { id: 'pdf-toast' });
    } catch (error) {
      toast.error('Houve um erro ao gerar o PDF.', { id: 'pdf-toast' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 print:max-w-none print:p-0">
      
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditing ? 'Editar Orçamento' : cloneId ? 'Clonar Orçamento' : 'Novo Orçamento'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Altere os dados abaixo para atualizar o orçamento.' : 'Preencha os dados para gerar um novo orçamento.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isGeneratingPdf}
            className="px-4 py-2 border border-border bg-card rounded-lg hover:bg-muted font-medium transition disabled:opacity-50"
          >
            {isEditing ? 'Atualizar' : 'Salvar'}
          </button>
          <button 
            type="button"
            onClick={handleGeneratePDF}
            disabled={isGeneratingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition shadow-sm disabled:opacity-50"
          >
            {isGeneratingPdf ? <Loader2 size={20} className="animate-spin" /> : <FileDown size={20} />}
            Gerar PDF
          </button>
        </div>
      </div>

      <form className="space-y-8" id="quote-form">
        
        {/* Section 1: Empresa */}
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm">1</span>
            Emitente
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Selecione a Empresa</label>
              <select 
                {...register('companyId')}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Selecione...</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.razaoSocial} ({c.cnpj})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Cliente */}
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm">2</span>
            Dados do Cliente
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2 lg:col-span-3">
              <label className="text-sm font-medium">Buscar por CNPJ</label>
              <div className="flex gap-2">
                <input 
                  {...register('client.cnpj')}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, '');
                    if (v.length <= 14) {
                      v = v.replace(/^(\d{2})(\d)/, '$1.$2');
                      v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                      v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
                      v = v.replace(/(\d{4})(\d)/, '$1-$2');
                    }
                    e.target.value = v;
                    register('client.cnpj').onChange(e);
                  }}
                  className="w-full md:w-1/3 px-4 py-2 bg-input/50 border border-border rounded-lg"
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
                <button 
                  type="button" 
                  onClick={handleCnpjSearch}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition"
                >
                  <Search size={18} />
                  Buscar
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Cliente/Razão Social</label>
              <input 
                {...register('client.nome')}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
                placeholder="Ex: João da Silva"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome Fantasia (Opcional)</label>
              <input 
                {...register('client.empresa')}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
                placeholder="Ex: Tech Solutions"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefone</label>
              <input 
                {...register('client.telefone')}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, '');
                  if (v.length <= 11) {
                    v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
                    v = v.replace(/(\d)(\d{4})$/, '$1-$2');
                  }
                  e.target.value = v;
                  register('client.telefone').onChange(e);
                }}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail</label>
              <input 
                type="email"
                {...register('client.email')}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
                placeholder="cliente@email.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">CEP</label>
              <input 
                {...register('client.cep')}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium">Logradouro</label>
              <input 
                {...register('client.logradouro')}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Número</label>
              <input 
                {...register('client.numero')}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Complemento</label>
              <input 
                {...register('client.complemento')}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bairro</label>
              <input 
                {...register('client.bairro')}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cidade</label>
              <input 
                {...register('client.cidade')}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <select 
                {...register('client.estado')}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              >
                <option value="">Selecione...</option>
                <option value="SP">São Paulo</option>
                <option value="RJ">Rio de Janeiro</option>
                <option value="MG">Minas Gerais</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Itens */}
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm">3</span>
              Itens do Orçamento
            </h2>
          </div>
          
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto relative rounded-md border border-border">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur shadow-sm">
                <tr className="border-b border-border text-muted-foreground text-sm">
                  <th className="p-3 font-medium w-[45%]">Descrição do Item</th>
                  <th className="p-3 font-medium w-[15%]">Qtd</th>
                  <th className="p-3 font-medium w-[20%]">Valor Unit. (R$)</th>
                  <th className="p-3 font-medium w-[15%]">Total</th>
                  <th className="p-3 font-medium w-[5%]"></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const qty = Number(watchItems[index]?.quantidade || 0);
                  const price = Number(watchItems[index]?.valorUnitario || 0);
                  const lineTotal = qty * price;

                  return (
                    <tr key={field.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                      <td className="p-2">
                        <input 
                          {...register(`items.${index}.descricao`)}
                          className="w-full px-3 py-2 bg-input/50 border border-border rounded-md text-sm"
                          placeholder="Descrição do serviço/produto"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="number"
                          min="1"
                          {...register(`items.${index}.quantidade`)}
                          className="w-full px-3 py-2 bg-input/50 border border-border rounded-md text-sm text-center"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="number"
                          step="0.01"
                          {...register(`items.${index}.valorUnitario`)}
                          className="w-full px-3 py-2 bg-input/50 border border-border rounded-md text-sm text-right"
                        />
                      </td>
                      <td className="p-2 text-right font-medium">
                        {formatCurrency(lineTotal)}
                      </td>
                      <td className="p-2 text-center">
                        <button 
                          type="button" 
                          onClick={() => remove(index)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-between items-center border-t border-border pt-4">
            <button 
              type="button"
              onClick={() => append({ descricao: '', quantidade: 1, valorUnitario: 0 })}
              className="flex items-center gap-2 px-4 py-2 text-sm text-primary font-medium hover:bg-primary/10 rounded-lg transition-colors"
            >
              <Plus size={16} /> Adicionar Item
            </button>

            <div className="text-right">
              <p className="text-muted-foreground">Total Geral</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
            </div>
          </div>
        </div>

        {/* Section 4: Condições e Informações Extras */}
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm">4</span>
            Condições e Observações
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Condição de Pagamento</label>
              <select 
                {...register('condicaoPagamento')}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              >
                <option value="">Selecione...</option>
                {condicoesPagamento.map(cp => (
                  <option key={cp} value={cp}>{cp}</option>
                ))}
              </select>
            </div>

            {watchCondicao === 'Parcelado' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Qtd. Parcelas</label>
                  <input 
                    type="number"
                    {...register('parcelas')}
                    className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valor por Parcela (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    {...register('valorParcela')}
                    className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Validade da Proposta</label>
              <input 
                {...register('validade')}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Garantia</label>
              <input 
                {...register('garantia')}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prazo de Execução</label>
              <input 
                {...register('prazoExecucao')}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              />
            </div>
            
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">Observações</label>
              <textarea 
                {...register('observacao')}
                rows={3}
                placeholder="Adicione informações adicionais que aparecerão no final do orçamento..."
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>

      </form>
      
      <div className="absolute left-[-9999px] top-[-9999px]" aria-hidden="true">
        <QuotePdfTemplate 
          ref={pdfRef} 
          data={watch()} 
          company={companies.find(c => c.id === watch('companyId'))} 
        />
      </div>
    </div>
  );
}
