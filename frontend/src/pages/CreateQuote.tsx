import { useState, useRef, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, FileDown, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { quoteService } from '../services/quoteService';
import { platformService } from '../services/platformService';
import { AttachmentsUpload } from '../components/AttachmentsUpload';
import { QuotePdfTemplate } from '../components/QuotePdfTemplate';
import { QuoteHistoryModal } from '../components/QuoteHistoryModal';
import { useGeneratePdf } from '../hooks/useGeneratePdf';
import { QUOTE_STATUS_OPTIONS } from '../utils/constants';
import { ModalFooterActions } from '../components/ui/ModalFooterActions';
import { calculateTaxes } from '../utils/taxCalculator';
import { api } from '../services/api';

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
  status?: string;
  parcelas?: number;
  valorParcela?: number;
  validade: string;
  garantia: string;
  prazoExecucao: string;
  plataformaGestaoId?: string;
  osExterna?: string;
  items: {
    descricao: string;
    quantidade: number;
    valorUnitario: number;
    tipo: 'Peça' | 'Mão de Obra';
    codigoPeca?: string;
    tipoPeca?: string;
  }[];
  observacao?: string;
  veiculoMarca?: string;
  veiculoModelo?: string;
  veiculoAno?: string;
  veiculoPlaca?: string;
  veiculoPrefixo?: string;
  veiculoAnoFabricacao?: string;
  veiculoAnoModelo?: string;
  veiculoChassi?: string;
  veiculoRenavam?: string;
  veiculoFrota?: string;
  veiculoSubfrota?: string;
  veiculoHodometro?: string;
  veiculoTipo?: string;
  plataformaGestao?: any;
  oficina?: any;
  oficinaId?: string;
  mecanicoId?: string;
  notaFiscalDescricao?: string;
};

const condicoesPagamento = [
  'À vista', '7 dias', '14 dias', '21 dias', '28 dias', '30 dias', '45 dias', '60 dias', 'Parcelado'
];

// Statuses are imported from constants.ts

export function CreateQuote() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [isClonedQuote, setIsClonedQuote] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [numeroOrcamento, setNumeroOrcamento] = useState<number | null>(null);
  const [activeTaxes, setActiveTaxes] = useState<any[]>([]);
  const pdfRef = useRef<HTMLDivElement>(null);
  const pendingPdfGeneration = useRef<boolean>(false);
  const { generatePdf, isGeneratingPdf } = useGeneratePdf();

  const [isMobile, setIsMobile] = useState(false);
  const [suggestedClients, setSuggestedClients] = useState<any[]>([]);
  const [showClientsDropdown, setShowClientsDropdown] = useState(false);

  // History states
  const [lastHistoryEvent, setLastHistoryEvent] = useState<any>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Platform Integration States
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [searchPlatformTerm, setSearchPlatformTerm] = useState('');
  const [showPlatformsDropdown, setShowPlatformsDropdown] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<any>(null);

  const [workshops, setWorkshops] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);

  const { register, control, watch, handleSubmit, setValue, reset, formState: { isSubmitting } } = useForm<QuoteFormValues>({
    defaultValues: {
      items: [{ descricao: '', quantidade: 1, valorUnitario: 0, tipo: 'Peça' }],
      validade: 'Proposta válida por 7 dias',
      garantia: 'Garantia de 90 dias',
      prazoExecucao: '5 dias úteis',
      observacao: '',
      veiculoMarca: '',
      veiculoModelo: '',
      veiculoAno: '',
      veiculoPlaca: '',
      veiculoPrefixo: '',
      veiculoAnoFabricacao: '',
      veiculoAnoModelo: '',
      veiculoChassi: '',
      veiculoRenavam: '',
      veiculoFrota: '',
      veiculoSubfrota: '',
      veiculoHodometro: '',
      veiculoTipo: '',
      oficinaId: '',
      mecanicoId: '',
      status: 'Aguardando Aprovação',
      plataformaGestaoId: '',
      osExterna: '',
      notaFiscalDescricao: ''
    }
  });

  useEffect(() => {
    const fetchPlatformsList = async () => {
      try {
        const res = await platformService.list({ limit: 200 });
        setPlatforms(res.data || []);
      } catch (error) {
        console.error("Failed to load active platforms", error);
      }
    };
    const fetchWorkshopsList = async () => {
      try {
        const res = await api.get('/fleet/workshops');
        setWorkshops(res.data || []);
      } catch (error) {
        console.error("Failed to load workshops", error);
      }
    };
    const fetchCollaboratorsList = async () => {
      try {
        const res = await api.get('/registry/collaborators');
        setCollaborators(res.data || []);
      } catch (error) {
        console.error("Failed to load collaborators", error);
      }
    };
    const fetchTaxes = async () => {
      try {
        const res = await api.get('/fiscal/tributacao');
        setActiveTaxes(res.data.filter((t: any) => t.status === 'ATIVO') || []);
      } catch (error) {
        console.error("Failed to load taxes", error);
      }
    };
    fetchPlatformsList();
    fetchWorkshopsList();
    fetchCollaboratorsList();
    fetchTaxes();
  }, []);

  const taxSummary = useMemo(() => {
    return calculateTaxes(watch('items'), activeTaxes);
  }, [watch('items'), activeTaxes]);

  const handleSelectClient = (client: any) => {
    setValue('client.nome', client.nome || '');
    setValue('client.empresa', client.empresa || '');
    setValue('client.cnpj', client.cnpj || '');
    setValue('client.telefone', client.telefone || '');
    setValue('client.email', client.email || '');
    setValue('client.cep', client.cep || '');
    setValue('client.logradouro', client.logradouro || '');
    setValue('client.numero', client.numero || '');
    setValue('client.complemento', client.complemento || '');
    setValue('client.bairro', client.bairro || '');
    setValue('client.cidade', client.cidade || '');
    setValue('client.estado', client.estado || '');
    
    setShowClientsDropdown(false);
    setSuggestedClients([]);
  };


  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const cloneId = searchParams.get('clone');
  const isViewing = window.location.pathname.includes('/quotes/view/');
  const isEditing = !!id && !isViewing;
  const isCloned = !!cloneId || isClonedQuote;

  // Load companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await api.get('/companies?scope=orcamento');
        const data = response.data;
        setCompanies(data);
          if (cloneId && !isEditing && !isViewing) {
            const curio = data.find((c: any) => {
              const name = (c.razaoSocial || c.nomeFantasia || '').toLowerCase();
              return name.includes('curio') || name.includes('curió');
            });
            if (curio) {
              setValue('companyId', curio.id);
            }
          }
      } catch (error) {
        console.error("Failed to load companies", error);
      }
    };
    fetchCompanies();
  }, [cloneId, isEditing, isViewing, setValue]);


  const isInitialStatusEffect = useRef(true);

  const buildFormDataFromQuote = (data: any) => {
    let targetCompanyId = '';
    if (isEditing || isViewing) {
      targetCompanyId = data.companyId || '';
    } else if (cloneId) {
      const curio = companies.find((c: any) => {
        const name = (c.razaoSocial || c.nomeFantasia || '').toLowerCase();
        return name.includes('curio') || name.includes('curió');
      });
      if (curio) {
        targetCompanyId = curio.id;
      }
    }
    return {
      companyId: targetCompanyId,
      client: {
      nome: data.client?.nome || '',
      empresa: data.client?.empresa || '',
      cnpj: data.client?.cnpj || '',
      telefone: data.client?.telefone || '',
      email: data.client?.email || '',
      cidade: data.client?.cidade || '',
      estado: data.client?.estado || '',
      logradouro: data.client?.logradouro || '',
      numero: data.client?.numero || '',
      complemento: data.client?.complemento || '',
      bairro: data.client?.bairro || '',
      cep: data.client?.cep || '',
      dataSituacao: data.client?.dataSituacao || '',
      atividadePrincipal: data.client?.atividadePrincipal || '',
    },
    condicaoPagamento: data.condicaoPagamento,
    status: data.status || 'Aguardando Aprovação',
    parcelas: data.parcelas,
    valorParcela: !isEditing && cloneId && data.valorParcela
      ? Math.round(Number(data.valorParcela) * 1.1985 * 100) / 100
      : data.valorParcela,
    validade: data.validade,
    garantia: data.garantia,
    prazoExecucao: data.prazoExecucao,
    observacao: data.observacao || '',
    veiculoMarca: data.veiculoMarca || '',
    veiculoModelo: data.veiculoModelo || '',
    veiculoAno: data.veiculoAno || '',
    veiculoPlaca: data.veiculoPlaca || '',
    veiculoPrefixo: data.veiculoPrefixo || '',
    veiculoAnoFabricacao: data.veiculoAnoFabricacao || '',
    veiculoAnoModelo: data.veiculoAnoModelo || '',
    veiculoChassi: data.veiculoChassi || '',
    veiculoRenavam: data.veiculoRenavam || '',
    veiculoFrota: data.veiculoFrota || '',
    veiculoSubfrota: data.veiculoSubfrota || '',
    veiculoHodometro: data.veiculoHodometro || '',
    veiculoTipo: data.veiculoTipo || '',
    oficinaId: (!isEditing && cloneId) ? '' : (data.oficinaId || ''),
    mecanicoId: (!isEditing && cloneId) ? '' : (data.mecanicoId || ''),
    plataformaGestaoId: data.plataformaGestaoId || '',
    osExterna: data.osExterna || '',
    notaFiscalDescricao: data.notaFiscalDescricao || '',
    items: data.items.map((i: any) => ({
      descricao: i.descricao,
      quantidade: i.quantidade,
      valorUnitario: !isEditing && cloneId
        ? Math.round(Number(i.valorUnitario) * 1.1985 * 100) / 100
        : Number(i.valorUnitario),
      tipo: i.tipo || 'Peça',
      codigoPeca: i.codigoPeca || '',
      tipoPeca: i.tipoPeca || '',
    })),
    };
  };

  const extractApiErrorMessage = (error: any, fallback: string) => {
    const apiError = error?.response?.data?.error;
    if (Array.isArray(apiError)) {
      return apiError.map((e: any) => e.message || JSON.stringify(e)).join('; ');
    }
    if (typeof apiError === 'string' && apiError.trim()) {
      return apiError;
    }
    if (error?.message) {
      return error.message;
    }
    return fallback;
  };

  // Load quote for edit or clone
  useEffect(() => {
    const fetchQuote = async () => {
      const quoteId = id || cloneId;
      if (!quoteId) return;

      try {
        const data = await quoteService.getQuote(quoteId);
        if (isEditing || isViewing) {
          setNumeroOrcamento(data.numeroOrcamento);
          setIsClonedQuote(data.isCloned || !!data.clonedFromId);
        }

        reset(buildFormDataFromQuote(data));
        isInitialStatusEffect.current = true;
        
        if (data.history && data.history.length > 0) {
          setLastHistoryEvent(data.history[0]);
        }

        if (data.plataformaGestao) {
          setSelectedPlatform(data.plataformaGestao);
          setSearchPlatformTerm(data.plataformaGestao.nomeFantasia);
        } else {
          setSelectedPlatform(null);
          setSearchPlatformTerm('');
        }
      } catch (error) {
        toast.error('Erro ao carregar os dados do orçamento.');
        console.error(error);
      }
    };
    
    fetchQuote();
  }, [id, cloneId, reset, isEditing, isViewing]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchItems = watch('items') || [];
  const watchCondicao = watch('condicaoPagamento');

  const subtotal = watchItems.reduce((acc, item) => acc + (Number(item?.quantidade || 0) * Number(item?.valorUnitario || 0)), 0);
  const total = subtotal; // no future adding discounts or taxes yet

  const subtotalPecas = watchItems.reduce((acc, item) => {
    return item?.tipo === 'Peça' ? acc + (Number(item?.quantidade || 0) * Number(item?.valorUnitario || 0)) : acc;
  }, 0);

  const subtotalMaoDeObra = watchItems.reduce((acc, item) => {
    return item?.tipo === 'Mão de Obra' ? acc + (Number(item?.quantidade || 0) * Number(item?.valorUnitario || 0)) : acc;
  }, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleGenerateInvoiceDescription = () => {
    try {
      const data = watch();
      
      // Try to load by existing oficinaId first (crucial when editing an existing quote)
      let selectedOficina = null;
      if (data.oficinaId && workshops.length > 0) {
        selectedOficina = workshops.find(w => w.id === data.oficinaId);
      }
      
      // Automatically find matching workshop (Oficina) from selected company if not found
      const selectedCompany = companies.find(c => c.id === data.companyId);
      if (!selectedOficina && selectedCompany && workshops.length > 0) {
        const companyCnpjClean = (selectedCompany.cnpj || '').replace(/\D/g, '');
        selectedOficina = workshops.find(w => (w.cnpj || '').replace(/\D/g, '') === companyCnpjClean);
        
        if (!selectedOficina) {
          const companyName = (selectedCompany.nomeFantasia || selectedCompany.razaoSocial || '').toLowerCase();
          selectedOficina = workshops.find(w => 
            (w.nome || '').toLowerCase().includes(companyName) || 
            companyName.includes((w.nome || '').toLowerCase())
          );
        }
      }

      const osExterna = data.osExterna || 'N/A';
      const placa = data.veiculoPlaca || '';
      const prefixo = data.veiculoPrefixo || '';

      // Services and Parts lists
      const itemsList = data.items || [];
      const servicos = itemsList
        .filter(item => item?.tipo === 'Mão de Obra')
        .map(item => item?.descricao)
        .filter(Boolean)
        .join(', ');
        
      const pecas = itemsList
        .filter(item => item?.tipo === 'Peça')
        .map(item => item?.descricao)
        .filter(Boolean)
        .join(', ');

      // Mileage (Quilometragem)

      // Banking info from the automatically mapped workshop
      let bankingText = '';
      let hasBanking = false;
      
      if (selectedOficina) {
        hasBanking = !!(selectedOficina.banco || selectedOficina.agencia || selectedOficina.contaCorrente || selectedOficina.chavePix);
        if (hasBanking) {
          bankingText = `Banco: ${selectedOficina.banco || '—'}
Agência: ${selectedOficina.agencia || '—'}
Conta: ${selectedOficina.contaCorrente || '—'}`;
          if (selectedOficina.chavePix) {
            bankingText += `\nPIX: ${selectedOficina.chavePix}`;
          }
        } else {
          bankingText = 'Dados bancários da oficina não cadastrados.';
        }
        
        // Auto-set the oficinaId in form so database links it
        setValue('oficinaId', selectedOficina.id);
      } else {
        bankingText = 'Dados bancários da oficina não cadastrados.';
      }

      const hasPlatform = !!data.plataformaGestaoId || !!selectedPlatform;
      const osInternaStr = numeroOrcamento ? `${new Date().getFullYear()}-${numeroOrcamento.toString().padStart(6, '0')}` : '(A ser gerada)';
      const platformName = selectedPlatform?.nomeFantasia || selectedPlatform?.nome || 'de Gestão';
      const osText = hasPlatform ? `O.S da Plataforma ${platformName} nº ${osExterna}` : `O.S nº ${osInternaStr}`;

      const veiculoText = placa ? `, realizados no veículo placa ${placa}${prefixo ? `, prefixo ${prefixo}` : ''}` : '';
      const desc = `${osText}${veiculoText}.

SERVIÇOS EXECUTADOS:
${servicos || 'Nenhum serviço registrado.'}

PEÇAS APLICADAS:
${pecas || 'Nenhuma peça registrada.'}

DADOS BANCÁRIOS PARA PAGAMENTO:
${bankingText}`;

      setValue('notaFiscalDescricao', desc, { shouldValidate: true, shouldDirty: true });
      return { desc, hasBanking };
    } catch (e) {
      console.error('Error generating description:', e);
      toast.error('Erro ao gerar a descrição da nota.');
      return { desc: '', hasBanking: false };
    }
  };

  const watchStatus = watch('status');

  const watchOficinaId = watch('oficinaId');

  const watchCompanyId = watch('companyId');

  // Automatically set companyId when an Oficina is selected
  useEffect(() => {
    if (watchOficinaId && workshops.length > 0) {
      const selectedOficina = workshops.find(w => w.id === watchOficinaId);
      if (selectedOficina && selectedOficina.companyId) {
        setValue('companyId', selectedOficina.companyId);
      } else {
        // Fallback to the token's companyId
        try {
          const token = localStorage.getItem('token');
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.companyId) {
              setValue('companyId', payload.companyId);
            }
          }
        } catch (e) {
          console.error("Failed to parse token for companyId", e);
        }
      }
    }
  }, [watchOficinaId, workshops, setValue]);

  useEffect(() => {
    if (watchCompanyId && companies.length > 0) {
      const company = companies.find(c => c.id === watchCompanyId);
      const companyName = (company?.razaoSocial || company?.nomeFantasia || '').toLowerCase();
      if (companyName.includes('curio') || companyName.includes('curió')) {
        setValue('status', 'Cobertura');
      }
    }
  }, [watchCompanyId, companies, setValue]);

  // Generate description when status is changed to 'Aguardando Pagamento' or 'Emitir Nota Fiscal' or workshop changes
  useEffect(() => {
    if (isInitialStatusEffect.current) {
      isInitialStatusEffect.current = false;
      return;
    }
    if (watchStatus === 'Aguardando Pagamento' || watchStatus === 'Emitir Nota Fiscal') {
      const { hasBanking } = handleGenerateInvoiceDescription();
      if (!hasBanking) {
        toast.warning('Dados bancários da oficina não cadastrados.');
      } else {
        toast.success('Descrição da nota fiscal gerada com sucesso via IA!');
      }
    }
  }, [watchStatus, watchOficinaId]);

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
      if (isEditing && !id) {
        toast.error('Identificador do orçamento não encontrado.');
        return;
      }

      // Validação frontend de obrigatoriedade de peças
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        if (item.tipo === 'Peça') {
          if (!item.tipoPeca || item.tipoPeca.trim() === '') {
            toast.error(`O Tipo da Peça é obrigatório no Item #${i + 1}`);
            return;
          }
        }
      }

      const { plataformaGestao: _pg, oficina: _of, ...formData } = data as QuoteFormValues & { plataformaGestao?: unknown; oficina?: unknown };

      const payload = {
        ...formData,
        isCloned: !!cloneId || isClonedQuote,
        clonedFromId: cloneId || null,
        client: {
          nome: formData.client.nome,
          empresa: formData.client.empresa || null,
          cnpj: formData.client.cnpj || null,
          telefone: formData.client.telefone || null,
          email: formData.client.email || null,
          cidade: formData.client.cidade || null,
          estado: formData.client.estado || null,
          logradouro: formData.client.logradouro || null,
          numero: formData.client.numero || null,
          complemento: formData.client.complemento || null,
          bairro: formData.client.bairro || null,
          cep: formData.client.cep || null,
          dataSituacao: formData.client.dataSituacao || null,
          atividadePrincipal: formData.client.atividadePrincipal || null,
        },
        items: formData.items.map(item => ({
          descricao: item.descricao,
          tipo: item.tipo,
          quantidade: Number(item.quantidade),
          valorUnitario: Number(item.valorUnitario),
          valorTotal: Number(item.quantidade) * Number(item.valorUnitario),
          codigoPeca: item.tipo === 'Peça' ? item.codigoPeca?.trim() || null : null,
          tipoPeca: item.tipo === 'Peça' ? item.tipoPeca?.trim() || null : null,
        })),
        subtotal,
        total,
      };

      toast.loading(isEditing ? 'Atualizando orçamento...' : 'Salvando orçamento...', { id: 'save-quote' });
      
      let savedData: any;
      if (isEditing && id) {
        savedData = await quoteService.updateQuote(id, payload);
        reset(buildFormDataFromQuote(savedData));
        isInitialStatusEffect.current = true;
        if (savedData.plataformaGestao) {
          setSelectedPlatform(savedData.plataformaGestao);
          setSearchPlatformTerm(savedData.plataformaGestao.nomeFantasia);
        }
        toast.success('Orçamento atualizado com sucesso.', { id: 'save-quote' });
      } else {
        savedData = await quoteService.saveQuote(payload);
        setNumeroOrcamento(savedData.numeroOrcamento);
        toast.success('Orçamento salvo com sucesso!', { id: 'save-quote' });
        
        if (pendingPdfGeneration.current) {
          pendingPdfGeneration.current = false;
          // Aguarda um pequeno ciclo para a re-renderização do numeroOrcamento em tela antes do PDF
          setTimeout(() => {
            handleGeneratePDF(savedData.numeroOrcamento);
            navigate(`/quotes/edit/${savedData.id}`, { replace: true });
          }, 300);
        } else {
          navigate(`/quotes/edit/${savedData.id}`, { replace: true });
        }
      }

    } catch (error: any) {
      toast.error(
        extractApiErrorMessage(error, 'Erro ao salvar o orçamento'),
        { id: 'save-quote' }
      );
      console.error(error);
    }
  };

  const handleGeneratePDF = async (overrideNumero?: number) => {
    const data = watch();
    
    const company = companies.find(c => c.id === data.companyId);
    const companyName = company?.razaoSocial || company?.nomeFantasia || '';
    const isCurioCompany = companyName.toLowerCase().includes('curio') || companyName.toLowerCase().includes('curió');
    const companySlug = isCurioCompany ? 'curio' : 'mca';
    
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const formattedDate = `${day}_${month}_${year}`;
    
    const quoteNum = overrideNumero || numeroOrcamento;
    if (!quoteNum) {
      toast.error('Erro: Número do orçamento ausente.', { id: 'pdf-toast' });
      return;
    }
    const pdfFilename = `${quoteNum}_orcamento_${companySlug}_${formattedDate}.pdf`;

    toast.loading('Gerando PDF...', { id: 'pdf-toast' });
    try {
      await generatePdf(pdfRef.current, pdfFilename);
      toast.success('PDF gerado com sucesso!', { id: 'pdf-toast' });
    } catch (error) {
      toast.error('Houve um erro ao gerar o PDF.', { id: 'pdf-toast' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 print:max-w-none print:p-0">
      
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <span>{isViewing ? 'Visualizar Orçamento' : isEditing ? 'Editar Orçamento' : cloneId ? 'Clonar Orçamento' : 'Novo Orçamento'}</span>
            {(isViewing || isEditing) && numeroOrcamento && (
              <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-semibold rounded-lg border border-primary/20">
                OS Nº: {new Date().getFullYear()}-{numeroOrcamento.toString().padStart(6, '0')}
              </span>
            )}
          </h1>
          {lastHistoryEvent && (isViewing || isEditing) ? (
            <p className="text-muted-foreground text-sm mt-1">
              Última alteração: {new Date(lastHistoryEvent.createdAt).toLocaleString('pt-BR')} por <span className="font-medium text-foreground">{lastHistoryEvent.userName}</span>
            </p>
          ) : (
            <p className="text-muted-foreground text-sm mt-1">
              {isViewing ? 'Visualização dos detalhes do orçamento.' : isEditing ? 'Altere os dados abaixo para atualizar o orçamento.' : 'Preencha os dados para gerar um novo orçamento.'}
            </p>
          )}
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {isViewing ? (
            <button 
              type="button"
              onClick={() => navigate('/quotes')}
              className="flex-1 md:flex-none text-center px-4 py-2 border border-border bg-card rounded-lg hover:bg-muted font-medium transition"
            >
              Voltar
            </button>
          ) : (
            <button 
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isGeneratingPdf}
              className="flex-1 md:flex-none text-center px-4 py-2 border border-border bg-card rounded-lg hover:bg-muted font-medium transition disabled:opacity-50"
            >
              {isEditing ? 'Atualizar' : 'Salvar'}
            </button>
          )}
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              if (!numeroOrcamento) {
                toast.loading('Salvando orçamento para gerar número...', { id: 'pdf-toast' });
                pendingPdfGeneration.current = true;
                handleSubmit(onSubmit)();
              } else {
                handleGeneratePDF();
              }
            }}
            disabled={isGeneratingPdf || isSubmitting}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition shadow-sm disabled:opacity-50"
          >
            {isGeneratingPdf ? <Loader2 size={20} className="animate-spin" /> : <FileDown size={20} />}
            <span>Gerar PDF</span>
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
              <label className="text-sm font-medium">Selecione a Oficina Emitente</label>
              <select 
                {...register('oficinaId')}
                disabled={isViewing || isCloned}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                <option value="">Selecione...</option>
                {workshops.map(w => (
                  <option key={w.id} value={w.id}>{w.nome} ({w.cnpj})</option>
                ))}
              </select>
              {/* Hidden companyId field to satisfy schema */}
              <input type="hidden" {...register('companyId')} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mecânico Responsável</label>
              <select 
                {...register('mecanicoId')}
                disabled={isViewing}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-75"
              >
                <option value="">Selecione...</option>
                {collaborators
                  .filter(c => c.status === 'ATIVO' && (c.cargo || '').toLowerCase().includes('mecan'))
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.nome} ({c.cargo || 'Mecânico'})</option>
                  ))
                }
                {collaborators.filter(c => c.status === 'ATIVO' && !(c.cargo || '').toLowerCase().includes('mecan')).length > 0 && (
                  <>
                    <option disabled>──────────</option>
                    {collaborators
                      .filter(c => c.status === 'ATIVO' && !(c.cargo || '').toLowerCase().includes('mecan'))
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.nome} ({c.cargo || 'Colaborador'})</option>
                      ))
                    }
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Integração / Plataforma de Gestão */}
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm">2</span>
            Integração / Plataforma de Gestão
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ComboBox Busca de Plataforma */}
            <div className="space-y-2 relative">
              <label className="text-sm font-medium">Plataforma de Gestão (Busca Dinâmica)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar plataforma por Nome Fantasia, Razão ou CNPJ..."
                  value={searchPlatformTerm}
                  disabled={isViewing}
                  onChange={(e) => {
                    setSearchPlatformTerm(e.target.value);
                    setShowPlatformsDropdown(true);
                    if (!e.target.value) {
                      setSelectedPlatform(null);
                      setValue('plataformaGestaoId', '');
                    }
                  }}
                  onFocus={() => !isViewing && setShowPlatformsDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowPlatformsDropdown(false), 250);
                  }}
                  className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoComplete="off"
                />
                
                {selectedPlatform && !isViewing && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlatform(null);
                      setSearchPlatformTerm('');
                      setValue('plataformaGestaoId', '');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground font-bold p-1 bg-secondary/60 hover:bg-secondary rounded-sm transition-all text-xs"
                    title="Limpar plataforma"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown list */}
              {showPlatformsDropdown && !isViewing && (
                <div className="absolute z-50 w-full mt-1 bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-border/50 animate-in fade-in slide-in-from-top-1 duration-150">
                  {platforms
                    .filter(p => {
                      const isCurrentSelected = selectedPlatform?.id === p.id;
                      if (!isCurrentSelected && p.status !== 'ATIVO') return false;

                      const query = searchPlatformTerm.toLowerCase();
                      return (
                        p.nomeFantasia.toLowerCase().includes(query) ||
                        p.razaoSocial.toLowerCase().includes(query) ||
                        p.cnpj.replace(/\D/g, '').includes(query)
                      );
                    })
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPlatform(p);
                          setSearchPlatformTerm(p.nomeFantasia);
                          setValue('plataformaGestaoId', p.id);
                          setShowPlatformsDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-muted/70 transition-colors flex items-center justify-between gap-2 ${
                          selectedPlatform?.id === p.id ? 'bg-primary/5 font-semibold' : ''
                        }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-foreground">{p.nomeFantasia}</span>
                          <span className="text-xs text-muted-foreground font-normal">CNPJ: {p.cnpj}</span>
                        </div>
                        {p.status === 'INATIVO' && (
                          <span className="text-[10px] bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded-full font-bold">
                            Inativa (Antiga)
                          </span>
                        )}
                      </button>
                    ))}
                  {platforms.filter(p => {
                    const isCurrentSelected = selectedPlatform?.id === p.id;
                    if (!isCurrentSelected && p.status !== 'ATIVO') return false;
                    const query = searchPlatformTerm.toLowerCase();
                    return (
                      p.nomeFantasia.toLowerCase().includes(query) ||
                      p.razaoSocial.toLowerCase().includes(query) ||
                      p.cnpj.replace(/\D/g, '').includes(query)
                    );
                  }).length === 0 && (
                    <div className="px-4 py-3 text-xs text-muted-foreground text-center">
                      Nenhuma plataforma ativa encontrada.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Campo OS Externa */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Nº da OS Externa (Opcional - Máx. 100 caracteres)</label>
              <input
                type="text"
                maxLength={100}
                placeholder="Ex: OS-9874A, Seguradora X..."
                disabled={isViewing}
                {...register('osExterna')}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Cliente */}
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-0">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm">3</span>
              Dados do Cliente
            </h2>
            {(!isViewing || watch('veiculoPlaca') || watch('veiculoModelo')) && (
              <button
                type="button"
                onClick={() => setIsVehicleModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-1.5 bg-secondary hover:bg-secondary/80 border border-border text-sm font-medium rounded-lg transition-colors"
              >
                🚗 {watch('veiculoPlaca') ? `Veículo: ${watch('veiculoPlaca')}` : isViewing ? 'Visualizar Veículo' : 'Adicionar Veículo'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2 lg:col-span-3">
              <label className="text-sm font-medium">Buscar por CNPJ</label>
              <div className="flex gap-2">
                <input 
                  {...register('client.cnpj')}
                  disabled={isViewing}
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
                  className="flex-1 md:w-1/3 px-4 py-2 bg-input/50 border border-border rounded-lg"
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
                <button 
                  type="button" 
                  onClick={handleCnpjSearch}
                  disabled={isViewing}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Search size={18} />
                  Buscar
                </button>
              </div>
            </div>
            <div className="space-y-2 relative">
              <label className="text-sm font-medium">Nome do Cliente/Razão Social</label>
              <input 
                {...register('client.nome')}
                disabled={isViewing}
                onChange={async (e) => {
                  const val = e.target.value;
                  register('client.nome').onChange(e);
                  
                  if (val.trim().length >= 3) {
                    try {
                      const response = await api.get(`/registry/clients?search=${encodeURIComponent(val)}`);
                      setSuggestedClients(response.data);
                      setShowClientsDropdown(true);
                    } catch (error) {
                      console.error('Error searching clients:', error);
                    }
                  } else {
                    setSuggestedClients([]);
                    setShowClientsDropdown(false);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowClientsDropdown(false);
                  }, 200);
                }}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Ex: João da Silva"
                autoComplete="off"
              />

              {showClientsDropdown && suggestedClients.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-border/50 animate-in fade-in slide-in-from-top-1 duration-150">
                  {suggestedClients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => handleSelectClient(client)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-muted/70 transition-colors flex flex-col gap-1"
                    >
                      <span className="font-semibold text-foreground">{client.nome}</span>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        {client.empresa && <span>{client.empresa}</span>}
                        {client.cnpj && (
                          <>
                            <span className="text-border">•</span>
                            <span>CNPJ: {client.cnpj}</span>
                          </>
                        )}
                        {client.cidade && (
                          <>
                            <span className="text-border">•</span>
                            <span>{client.cidade} - {client.estado}</span>
                          </>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome Fantasia (Opcional)</label>
              <input 
                {...register('client.empresa')}
                disabled={isViewing}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
                placeholder="Ex: Tech Solutions"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefone</label>
              <input 
                {...register('client.telefone')}
                disabled={isViewing}
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
                disabled={isViewing}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
                placeholder="cliente@email.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">CEP</label>
              <input 
                {...register('client.cep')}
                disabled={isViewing}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium">Logradouro</label>
              <input 
                {...register('client.logradouro')}
                disabled={isViewing}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Número</label>
              <input 
                {...register('client.numero')}
                disabled={isViewing}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Complemento</label>
              <input 
                {...register('client.complemento')}
                disabled={isViewing}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bairro</label>
              <input 
                {...register('client.bairro')}
                disabled={isViewing}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cidade</label>
              <input 
                {...register('client.cidade')}
                disabled={isViewing}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <select 
                {...register('client.estado')}
                disabled={isViewing}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              >
                <option value="">Selecione...</option>
                <option value="SP">São Paulo</option>
                <option value="RJ">Rio de Janeiro</option>
                <option value="MG">Minas Gerais</option>
              </select>
            </div>
          </div>

          {/* Resumo do Veículo */}
          {(watch('veiculoMarca') || watch('veiculoModelo') || watch('veiculoAno') || watch('veiculoPlaca') || watch('veiculoPrefixo')) && (
            <div className="mt-6 p-4 bg-muted/30 rounded-lg flex items-center justify-between text-sm border border-border/80 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">🚗</span>
                <div>
                  <p className="font-semibold text-foreground">Veículo Vinculado</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[
                      watch('veiculoMarca'),
                      watch('veiculoModelo'),
                      watch('veiculoAno') ? `Ano ${watch('veiculoAno')}` : null,
                      watch('veiculoPlaca') ? `Placa ${watch('veiculoPlaca')}` : null,
                      watch('veiculoPrefixo') ? `Prefixo ${watch('veiculoPrefixo')}` : null
                    ].filter(Boolean).join(' • ')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(true)}
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  {isViewing ? 'Visualizar' : 'Editar'}
                </button>
                {!isViewing && (
                  <>
                    <span className="text-muted-foreground/30 text-xs">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setValue('veiculoMarca', '');
                        setValue('veiculoModelo', '');
                        setValue('veiculoAno', '');
                        setValue('veiculoPlaca', '');
                        setValue('veiculoPrefixo', '');
                      }}
                      className="text-xs text-destructive hover:underline font-semibold"
                    >
                      Remover
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Itens */}
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm">4</span>
              Itens do Orçamento
            </h2>
          </div>
          
          {isMobile ? (
            /* Visualização em Cartões (Cards) para Smartphone */
            <div className="space-y-4">
              {fields.map((field, index) => {
                const qty = Number(watchItems[index]?.quantidade || 0);
                const price = Number(watchItems[index]?.valorUnitario || 0);
                const lineTotal = qty * price;

                return (
                  <div key={field.id} className="bg-muted/5 border border-border p-4 rounded-xl space-y-3 relative">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider">Item #{index + 1}</span>
                        {watchItems[index]?.tipo === 'Peça' && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold ${
                            watchItems[index]?.codigoPeca?.trim() && watchItems[index]?.tipoPeca
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-amber-500/10 text-amber-500 animate-pulse'
                          }`}>
                            {watchItems[index]?.codigoPeca?.trim() && watchItems[index]?.tipoPeca ? '✓ OK' : '⚠ Incompleto'}
                          </span>
                        )}
                      </div>
                      {!isViewing && (
                        <button 
                          type="button" 
                          onClick={() => remove(index)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          title="Excluir Item"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Tipo</label>
                        <select
                          {...register(`items.${index}.tipo`)}
                          disabled={isViewing}
                          className="w-full px-3 py-2 bg-input/50 border border-border rounded-md text-sm"
                        >
                          <option value="Peça">Peça</option>
                          <option value="Mão de Obra">Mão de Obra</option>
                        </select>
                      </div>
                      
                      {watchItems[index]?.tipo === 'Peça' && (
                        <>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground">Código da Peça</label>
                            <input 
                              {...register(`items.${index}.codigoPeca`)}
                              disabled={isViewing}
                              className="w-full px-3 py-2 bg-input/50 border border-border rounded-md text-sm"
                              placeholder="Cód. Peça"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground">Tipo da Peça</label>
                            <select
                              {...register(`items.${index}.tipoPeca`)}
                              disabled={isViewing}
                              className="w-full px-3 py-2 bg-input/50 border border-border rounded-md text-sm"
                            >
                              <option value="">Selecione...</option>
                              <option value="Genuína">Genuína</option>
                              <option value="Original">Original</option>
                              <option value="Paralela">Paralela</option>
                              <option value="Remanufaturada">Remanufaturada</option>
                            </select>
                          </div>
                        </>
                      )}

                      <div className="col-span-2 space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Descrição</label>
                        <input 
                          {...register(`items.${index}.descricao`)}
                          disabled={isViewing}
                          className="w-full px-3 py-2 bg-input/50 border border-border rounded-md text-sm"
                          placeholder="Descrição do serviço/produto"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Qtd</label>
                        <input 
                          type="number"
                          min="1"
                          {...register(`items.${index}.quantidade`)}
                          disabled={isViewing}
                          className="w-full px-3 py-2 bg-input/50 border border-border rounded-md text-sm text-center"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Val. Unit. (R$)</label>
                        <input 
                          type="number"
                          step="0.01"
                          {...register(`items.${index}.valorUnitario`)}
                          disabled={isViewing}
                          className="w-full px-3 py-2 bg-input/50 border border-border rounded-md text-sm text-right"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t border-border/50 text-sm">
                      <span className="text-muted-foreground font-medium">Total do Item</span>
                      <span className="font-bold text-foreground">{formatCurrency(lineTotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Visualização em Tabela para Desktop e Tablet */
            <div className="overflow-x-auto scrollbar-thin relative rounded-md border border-border">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur shadow-sm">
                  <tr className="border-b border-border text-muted-foreground text-sm">
                    <th className="p-3 font-medium w-[10%]">Tipo</th>
                    <th className="p-3 font-medium w-[15%]">Código</th>
                    <th className="p-3 font-medium w-[15%]">Tipo Peça</th>
                    <th className="p-3 font-medium w-[24%]">Descrição do Item</th>
                    <th className="p-3 font-medium w-[8%]">Qtd</th>
                    <th className="p-3 font-medium w-[12%]">Valor Unit. (R$)</th>
                    <th className="p-3 font-medium w-[11%]">Total</th>
                    {!isViewing && <th className="p-3 font-medium w-[5%]"></th>}
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
                    const qty = Number(watchItems[index]?.quantidade || 0);
                    const price = Number(watchItems[index]?.valorUnitario || 0);
                    const lineTotal = qty * price;
                    const itemTipo = watchItems[index]?.tipo;

                    return (
                      <tr key={field.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                        <td className="p-2">
                          <select
                            {...register(`items.${index}.tipo`)}
                            disabled={isViewing}
                            className="w-full px-3 py-2 bg-input/50 border border-border rounded-md text-sm"
                          >
                            <option value="Peça">Peça</option>
                            <option value="Mão de Obra">Mão de Obra</option>
                          </select>
                        </td>
                        <td className="p-2">
                          {itemTipo === 'Peça' ? (
                            <div className="flex flex-col gap-1">
                              <input 
                                {...register(`items.${index}.codigoPeca`)}
                                disabled={isViewing}
                                className="w-full px-3 py-2 bg-input/50 border border-border rounded-md text-sm"
                                placeholder="Cód. Peça"
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic px-3">N/A</span>
                          )}
                        </td>
                        <td className="p-2">
                          {itemTipo === 'Peça' ? (
                            <div className="flex flex-col gap-1">
                              <select
                                {...register(`items.${index}.tipoPeca`)}
                                disabled={isViewing}
                                className="w-full px-3 py-2 bg-input/50 border border-border rounded-md text-sm"
                              >
                                <option value="">Selecione...</option>
                                <option value="Genuína">Genuína</option>
                                <option value="Original">Original</option>
                                <option value="Paralela">Paralela</option>
                                <option value="Remanufaturada">Remanufaturada</option>
                              </select>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic px-3">N/A</span>
                          )}
                        </td>
                        <td className="p-2">
                          <div className="flex flex-col gap-1">
                            <input 
                              {...register(`items.${index}.descricao`)}
                              disabled={isViewing}
                              className="w-full px-3 py-2 bg-input/50 border border-border rounded-md text-sm"
                              placeholder="Descrição do serviço/produto"
                            />
                            {itemTipo === 'Peça' && (
                              <div className="flex justify-start">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold mt-0.5 ${
                                  watchItems[index]?.codigoPeca?.trim() && watchItems[index]?.tipoPeca
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : 'bg-amber-500/10 text-amber-500 animate-pulse'
                                }`}>
                                  {watchItems[index]?.codigoPeca?.trim() && watchItems[index]?.tipoPeca ? '✓ Peça Completa' : '⚠ Código/Tipo Incompleto'}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          <input 
                            type="number"
                            min="1"
                            {...register(`items.${index}.quantidade`)}
                            disabled={isViewing}
                            className="w-full px-3 py-2 bg-input/50 border border-border rounded-md text-sm text-center"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="number"
                            step="0.01"
                            {...register(`items.${index}.valorUnitario`)}
                            disabled={isViewing}
                            className="w-full px-3 py-2 bg-input/50 border border-border rounded-md text-sm text-right"
                          />
                        </td>
                        <td className="p-2 text-right font-medium">
                          {formatCurrency(lineTotal)}
                        </td>
                        {!isViewing && (
                          <td className="p-2 text-center">
                            <button 
                              type="button" 
                              onClick={() => remove(index)}
                              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-border pt-4">
            {!isViewing && (
              <button 
                type="button"
                onClick={() => append({ descricao: '', quantidade: 1, valorUnitario: 0, tipo: 'Peça', codigoPeca: '', tipoPeca: '' })}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm text-primary font-medium hover:bg-primary/10 rounded-lg transition-colors border border-primary/10 md:border-transparent"
              >
                <Plus size={16} /> Adicionar Item
              </button>
            )}

            <div className="text-center md:text-right space-y-2 w-full md:w-auto">
              <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-6 text-sm text-muted-foreground mb-1">
                <p>Subtotal Peças: <strong className="text-foreground">{formatCurrency(subtotalPecas)}</strong></p>
                <p>Subtotal Mão de Obra: <strong className="text-foreground">{formatCurrency(subtotalMaoDeObra)}</strong></p>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-4 text-xs text-white mb-3 bg-slate-800 dark:bg-slate-900 p-2 rounded-lg border border-slate-700">
                <span>Tributos Aproximados:</span>
                <span title="Federal">Fed: {formatCurrency(taxSummary.federal)}</span>
                <span title="Estadual">Est: {formatCurrency(taxSummary.estadual)}</span>
                <span title="Municipal">Mun: {formatCurrency(taxSummary.municipal)}</span>
                <span className="font-semibold text-white">Total: {formatCurrency(taxSummary.total)} ({taxSummary.percentual.toFixed(2)}%)</span>
              </div>
              
              <p className="text-muted-foreground text-sm font-medium">Total Geral</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
            </div>
          </div>
        </div>

        {/* Section 5: Condições e Informações Extras */}
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm">5</span>
            Condições e Observações
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Condição de Pagamento</label>
              <select 
                {...register('condicaoPagamento')}
                disabled={isViewing}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              >
                <option value="">Selecione...</option>
                {condicoesPagamento.map(cp => (
                  <option key={cp} value={cp}>{cp}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status do Orçamento</label>
              <select 
                {...register('status')}
                disabled={isViewing || (() => {
                  const company = companies.find(c => c.id === watchCompanyId);
                  const companyName = (company?.razaoSocial || company?.nomeFantasia || '').toLowerCase();
                  return companyName.includes('curio') || companyName.includes('curió');
                })()}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg disabled:opacity-85 disabled:cursor-not-allowed"
              >
                {(() => {
                  const company = companies.find(c => c.id === watchCompanyId);
                  const companyName = (company?.razaoSocial || company?.nomeFantasia || '').toLowerCase();
                  const isCurio = companyName.includes('curio') || companyName.includes('curió');
                  if (isCurio) {
                    return <option value="Cobertura">Cobertura</option>;
                  }
                  return QUOTE_STATUS_OPTIONS.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ));
                })()}
              </select>
            </div>

            {watchCondicao === 'Parcelado' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Qtd. Parcelas</label>
                  <input 
                    type="number"
                    {...register('parcelas')}
                    disabled={isViewing}
                    className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valor por Parcela (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    {...register('valorParcela')}
                    disabled={isViewing}
                    className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Validade da Proposta</label>
              <input 
                {...register('validade')}
                disabled={isViewing}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Garantia</label>
              <input 
                {...register('garantia')}
                disabled={isViewing}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prazo de Execução</label>
              <input 
                {...register('prazoExecucao')}
                disabled={isViewing}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              />
            </div>
            
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">Observações</label>
              <textarea 
                {...register('observacao')}
                disabled={isViewing}
                rows={3}
                placeholder="Adicione informações adicionais que aparecerão no final do orçamento..."
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {(watchStatus === 'Aguardando Pagamento' || watchStatus === 'Emitir Nota Fiscal') && (
              <div className="md:col-span-2 space-y-4 p-5 bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/20 dark:border-teal-500/30 rounded-2xl animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <div>
                      <h3 className="text-sm font-bold text-teal-800 dark:text-teal-400">Descrição para Nota Fiscal (IA)</h3>
                      <p className="text-[11px] text-muted-foreground">Esta descrição é gerada automaticamente com base nos dados do Emitente, Veículo e OS.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateInvoiceDescription}
                    disabled={isViewing}
                    className="self-start sm:self-center px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <span>🔄</span> Regenerar Descrição
                  </button>
                </div>

                {(() => {
                  const selectedCompany = companies.find(c => c.id === watch('companyId'));
                  let selectedOficina = null;
                  if (selectedCompany && workshops.length > 0) {
                    const companyCnpjClean = (selectedCompany.cnpj || '').replace(/\D/g, '');
                    selectedOficina = workshops.find(w => (w.cnpj || '').replace(/\D/g, '') === companyCnpjClean);
                    if (!selectedOficina) {
                      const companyName = (selectedCompany.nomeFantasia || selectedCompany.razaoSocial || '').toLowerCase();
                      selectedOficina = workshops.find(w => 
                        (w.nome || '').toLowerCase().includes(companyName) || 
                        companyName.includes((w.nome || '').toLowerCase())
                      );
                    }
                  }
                  
                  const hasBanking = selectedOficina ? !!(selectedOficina.banco || selectedOficina.agencia || selectedOficina.contaCorrente || selectedOficina.chavePix) : false;
                  
                  if (!hasBanking) {
                    return (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-rose-700 dark:text-rose-400 text-xs font-semibold">
                        <span>⚠️</span>
                        <div className="space-y-0.5">
                          <p>Dados bancários da oficina não cadastrados.</p>
                          <p className="font-normal text-muted-foreground">Vincule ou adicione dados bancários para o emitente correspondente nas configurações de oficina.</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <textarea
                  {...register('notaFiscalDescricao')}
                  disabled={isViewing}
                  rows={10}
                  placeholder="Geração automática..."
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                />
              </div>
            )}
          </div>
        </div>

        {id && (
          <div className="mt-8 pt-6 border-t border-border">
            <AttachmentsUpload quoteId={id} readOnly={isViewing} />
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t border-border">
          {(isEditing || isViewing) && id ? (
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="text-sm font-medium text-primary hover:underline flex items-center gap-2"
            >
              🔍 Ver Histórico do Orçamento
            </button>
          ) : <div />}

          <div className="flex gap-3 w-full sm:w-auto">
            {!isViewing && (
              <button 
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={isGeneratingPdf}
                className="flex-1 md:flex-none text-center px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition disabled:opacity-50"
              >
                {isEditing ? 'Atualizar Orçamento' : 'Salvar Orçamento'}
              </button>
            )}
          </div>
        </div>

      </form>
      
      <QuoteHistoryModal 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
        quoteId={id as string} 
        numeroOrcamento={numeroOrcamento} 
      />
      
      <div className="absolute left-[-9999px] top-[-9999px]" aria-hidden="true">
        <QuotePdfTemplate 
          ref={pdfRef} 
          data={{ ...watch(), numeroOrcamento, taxSummary }} 
          company={companies.find(c => c.id === watch('companyId'))} 
          workshops={workshops}
        />
      </div>

      {/* Modal Veículo */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div 
            className="w-[95%] max-w-4xl bg-card border border-border rounded-xl shadow-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/10">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🚗</span>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Dados do Veículo</h3>
                  <p className="text-xs text-muted-foreground">Preencha as informações do veículo para o orçamento</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 flex-1 overflow-y-auto scrollbar-thin">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marca</label>
                  <input 
                    {...register('veiculoMarca')}
                    disabled={isViewing}
                    placeholder="Ex: Chevrolet"
                    className="w-full px-3.5 py-2 bg-input/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modelo</label>
                  <input 
                    {...register('veiculoModelo')}
                    disabled={isViewing}
                    placeholder="Ex: Onix"
                    className="w-full px-3.5 py-2 bg-input/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ano Fabr.</label>
                  <input 
                    {...register('veiculoAnoFabricacao')}
                    disabled={isViewing}
                    placeholder="Ex: 2021"
                    className="w-full px-3.5 py-2 bg-input/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ano Modelo</label>
                  <input 
                    {...register('veiculoAnoModelo')}
                    disabled={isViewing}
                    placeholder="Ex: 2022"
                    className="w-full px-3.5 py-2 bg-input/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Placa</label>
                  <input 
                    {...register('veiculoPlaca')}
                    disabled={isViewing}
                    onChange={(e) => {
                      e.target.value = e.target.value.toUpperCase();
                      register('veiculoPlaca').onChange(e);
                    }}
                    placeholder="Ex: ABC-1234"
                    className="w-full px-3.5 py-2 bg-input/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    maxLength={8}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prefixo</label>
                  <input 
                    {...register('veiculoPrefixo')}
                    disabled={isViewing}
                    placeholder="Ex: PFX-102"
                    className="w-full px-3.5 py-2 bg-input/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Frota</label>
                  <input 
                    {...register('veiculoFrota')}
                    disabled={isViewing}
                    placeholder="Ex: Frota A"
                    className="w-full px-3.5 py-2 bg-input/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subfrota</label>
                  <input 
                    {...register('veiculoSubfrota')}
                    disabled={isViewing}
                    placeholder="Ex: Subfrota B"
                    className="w-full px-3.5 py-2 bg-input/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hodômetro</label>
                  <input 
                    {...register('veiculoHodometro')}
                    disabled={isViewing}
                    placeholder="Ex: 45000"
                    className="w-full px-3.5 py-2 bg-input/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo de Veículo</label>
                  <input 
                    {...register('veiculoTipo')}
                    disabled={isViewing}
                    placeholder="Ex: Leve, Pesado..."
                    className="w-full px-3.5 py-2 bg-input/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>

            <ModalFooterActions
              onCancel={() => setIsVehicleModalOpen(false)}
              onPrimary={() => setIsVehicleModalOpen(false)}
              cancelLabel={isViewing ? 'Fechar' : 'Cancelar'}
              primaryLabel="Confirmar"
              hidePrimary={isViewing}
              flush
            />
          </div>
        </div>
      )}
    </div>
  );
}
