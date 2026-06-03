import { useState, useEffect, useRef } from 'react';
import { 
  FileText, UploadCloud, Search, Calendar, RefreshCw, Trash2, Edit3, Download, 
  History, ShieldAlert, AlertCircle, FileCode, Tag, DollarSign, X, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from '../../utils/toast.helper';

interface FiscalDoc {
  id: string;
  numeroDocumento: string;
  chaveAcesso: string | null;
  tipo: 'XML' | 'PDF';
  nomeArquivo: string;
  dataEmissao: string | null;
  valorTotal: number;
  emitenteNome: string | null;
  emitenteCnpj: string | null;
  destinatarioNome: string | null;
  destinatarioCnpj: string | null;
  status: string;
  fileUrl: string | null;
  createdAt: string;
}

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userProfile: string;
  action: string;
  details: string;
  ipAddress: string | null;
  createdAt: string;
}

interface DashboardStats {
  xmlCount: number;
  pdfCount: number;
  totalValue: number;
  estimatedTaxes: number;
  statusCounts: Array<{ status: string; count: number }>;
}

export function FiscalDocuments() {
  const [user, setUser] = useState<any>(null);
  const [documents, setDocuments] = useState<FiscalDoc[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    xmlCount: 0,
    pdfCount: 0,
    totalValue: 0,
    estimatedTaxes: 0,
    statusCounts: []
  });

  const [loading, setLoading] = useState(true);
  const [showAudits, setShowAudits] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'XML' | 'PDF'>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<FiscalDoc | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields for Edit
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [emitenteNome, setEmitenteNome] = useState('');
  const [emitenteCnpj, setEmitenteCnpj] = useState('');
  const [destinatarioNome, setDestinatarioNome] = useState('');
  const [destinatarioCnpj, setDestinatarioCnpj] = useState('');
  const [valorTotal, setValorTotal] = useState(0);
  const [statusVal, setStatusVal] = useState('IMPORTADO');

  // File Upload states
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        toast.error('Sessão expirada. Faça login novamente.');
      }
    } catch (error) {
      console.error('Failed to fetch user permissions', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Build query string
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (typeFilter !== 'ALL') params.append('tipo', typeFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const [docsRes, statsRes, auditsRes] = await Promise.all([
        fetch(`/fiscal/documents?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/fiscal/dashboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/fiscal/audits', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (auditsRes.ok) {
        const auditsData = await auditsRes.json();
        setAudits(auditsData);
      }
    } catch (error) {
      console.error('Failed to load fiscal dashboard data', error);
      toast.error('Erro ao conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchUser();
    };
    init();
  }, []);

  useEffect(() => {
    if (user && (user.roleAdmin || user.roleContabilidade)) {
      fetchData();
    }
  }, [user, searchTerm, typeFilter, statusFilter, startDate, endDate]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleZipClick = () => {
    zipInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isZip = false) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);
    const token = localStorage.getItem('token');

    // Filter invalid files
    const validFiles = filesArray.filter(file => {
      const name = file.name.toLowerCase();
      if (isZip) {
        return name.endsWith('.zip');
      }
      return name.endsWith('.xml') || name.endsWith('.pdf');
    });

    if (validFiles.length === 0) {
      toast.error(isZip ? 'Selecione um arquivo ZIP válido.' : 'Envie apenas arquivos XML ou PDF.');
      return;
    }

    toast.info(`Iniciando importação de ${validFiles.length} arquivo(s)...`);

    try {
      const preparedFiles: Array<{ fileName: string; fileType: string; fileContent: string }> = [];

      for (const file of validFiles) {
        setUploadProgress(prev => ({ ...prev, [file.name]: 20 }));
        
        // Convert to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });

        setUploadProgress(prev => ({ ...prev, [file.name]: 60 }));

        preparedFiles.push({
          fileName: file.name,
          fileType: file.type || (file.name.endsWith('.xml') ? 'text/xml' : 'application/pdf'),
          fileContent: base64
        });

        setUploadProgress(prev => ({ ...prev, [file.name]: 90 }));
      }

      const response = await fetch('/fiscal/documents/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          files: preparedFiles,
          isZip,
          batchName: isZip ? validFiles[0].name : `Lote - ${new Date().toLocaleDateString()}`
        })
      });

      if (response.ok) {
        toast.success(isZip ? 'ZIP importado e descompactado com sucesso!' : 'Documentos fiscais importados com sucesso!');
        fetchData();
      } else {
        handleApiError(response, 'Falha ao importar documentos.');
      }
    } catch (err) {
      console.error('File reading / uploading failed', err);
      toast.error('Erro ao ler arquivos locais.');
    } finally {
      setUploadProgress({});
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (zipInputRef.current) zipInputRef.current.value = '';
    }
  };

  const handleEditClick = (doc: FiscalDoc) => {
    if (user?.roleContabilidade && !user?.roleAdmin) {
      toast.error('Perfil de Contabilidade não possui permissão para alterar documentos.');
      return;
    }
    setSelectedDoc(doc);
    setNumeroDocumento(doc.numeroDocumento || '');
    setEmitenteNome(doc.emitenteNome || '');
    setEmitenteCnpj(doc.emitenteCnpj || '');
    setDestinatarioNome(doc.destinatarioNome || '');
    setDestinatarioCnpj(doc.destinatarioCnpj || '');
    setValorTotal(doc.valorTotal || 0);
    setStatusVal(doc.status || 'IMPORTADO');
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    if (isSubmitting) return;
    setIsSubmitting(true);

    const token = localStorage.getItem('token');
    const payload = {
      numeroDocumento,
      emitenteNome,
      emitenteCnpj,
      destinatarioNome,
      destinatarioCnpj,
      valorTotal,
      status: statusVal
    };

    try {
      const response = await fetch(`/fiscal/documents/${selectedDoc.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success('Documento fiscal atualizado com sucesso!');
        setIsEditModalOpen(false);
        fetchData();
      } else {
        handleApiError(response, 'Erro ao atualizar documento.');
      }
    } catch (error) {
      console.error('Failed to update fiscal doc', error);
      toast.error('Erro de conexão ao salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, docNum: string) => {
    if (user?.roleContabilidade && !user?.roleAdmin) {
      toast.error('Perfil de Contabilidade não possui permissão para excluir documentos.');
      return;
    }

    if (!window.confirm(`Deseja realmente excluir o documento fiscal "${docNum}"? Esta operação é definitiva.`)) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/fiscal/documents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Documento fiscal excluído com sucesso.');
        fetchData();
      } else {
        toast.error('Erro ao excluir documento.');
      }
    } catch (error) {
      console.error('Failed to delete fiscal doc', error);
      toast.error('Erro de conexão ao excluir.');
    }
  };

  const handleDownloadIndividual = async (id: string, fileName: string) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/fiscal/documents/${id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(`Download de "${fileName}" registrado com sucesso.`);

        // Trigger browser file download
        const blob = new Blob([data.xmlContent || 'Simulated Document Content'], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = data.nomeArquivo;
        link.click();
      } else {
        toast.error('Erro ao fazer download do documento.');
      }
    } catch (error) {
      console.error('Failed downloading individual doc', error);
    }
  };

  const handleDownloadBatch = async () => {
    if (selectedIds.length === 0) {
      toast.warning('Selecione ao menos um documento para exportação em lote.');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/fiscal/documents/download-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids: selectedIds })
      });

      if (response.ok) {
        await response.json();
        toast.success(`Exportação em lote concluída para ${selectedIds.length} arquivos.`);
        
        // Trigger simulated batch zip download
        const blob = new Blob(['Simulated Zip Package containing batch documents'], { type: 'application/zip' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `exportacao-lote-fiscal-${Date.now()}.zip`;
        link.click();
        
        setSelectedIds([]);
      } else {
        toast.error('Erro ao efetuar download em lote.');
      }
    } catch (error) {
      console.error('Failed batch download', error);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(documents.map(d => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Profile-based views
  const isAdmin = user?.roleAdmin;
  const isContabilidade = user?.roleContabilidade;

  // Unauthorised overlay UI
  if (user && !isAdmin && !isContabilidade) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
        <div className="bg-destructive/10 text-destructive p-4 rounded-full mb-4 shadow-inner">
          <ShieldAlert size={48} className="animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          A <strong>Central de Documentos Fiscais</strong> é de uso restrito de administradores e perfis vinculados ao setor contábil. Por favor, contate o administrador do sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header and Quick Buttons */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Central de Documentos Fiscais
            {isAdmin && <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider flex items-center gap-1"><ShieldCheck size={10} /> Admin</span>}
            {isContabilidade && !isAdmin && <span className="text-[10px] bg-violet-500/10 text-violet-500 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider flex items-center gap-1"><Tag size={10} /> Contabilidade</span>}
          </h1>
          <p className="text-muted-foreground text-sm">Painel de gerenciamento, extração contábil de XMLs e auditoria de arquivos fiscais.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Actions */}
          <input 
            type="file" 
            ref={fileInputRef} 
            multiple 
            onChange={(e) => handleFileChange(e, false)}
            accept=".xml,.pdf"
            className="hidden" 
          />
          <input 
            type="file" 
            ref={zipInputRef} 
            onChange={(e) => handleFileChange(e, true)}
            accept=".zip"
            className="hidden" 
          />

          <button
            onClick={handleUploadClick}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow hover:bg-primary/90 transition text-sm flex-1 sm:flex-initial"
          >
            <UploadCloud size={16} />
            <span>Upload XML / PDF</span>
          </button>

          <button
            onClick={handleZipClick}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium shadow hover:bg-indigo-700 transition text-sm flex-1 sm:flex-initial"
          >
            <FileCode size={16} />
            <span>Importar ZIP</span>
          </button>

          <button
            onClick={() => setShowAudits(!showAudits)}
            className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground border border-border px-4 py-2 rounded-lg font-medium hover:bg-secondary/80 transition text-sm flex-1 sm:flex-initial"
          >
            <History size={16} />
            <span>Auditoria</span>
          </button>
        </div>
      </div>

      {/* Progress Monitor */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-2 animate-in fade-in duration-200">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Processando Importações</h4>
          <div className="space-y-1.5">
            {Object.entries(uploadProgress).map(([fileName, progress]) => (
              <div key={fileName} className="flex items-center justify-between text-xs gap-4">
                <span className="text-foreground truncate max-w-xs">{fileName}</span>
                <div className="flex-1 max-w-md bg-muted rounded-full h-2 overflow-hidden border border-border/50">
                  <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="font-mono text-muted-foreground text-right w-8">{progress}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid of Indicator Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total XML */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex items-center justify-between hover:border-blue-500/20 transition-all hover:scale-[1.01]">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-semibold">Total de XMLs</p>
            <h3 className="text-2xl font-black text-foreground font-mono">{stats.xmlCount}</h3>
            <p className="text-[10px] text-muted-foreground">NF-e e CT-e mapeados</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <FileCode size={20} />
          </div>
        </div>

        {/* Total PDF */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex items-center justify-between hover:border-emerald-500/20 transition-all hover:scale-[1.01]">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-semibold">Total de PDFs</p>
            <h3 className="text-2xl font-black text-foreground font-mono">{stats.pdfCount}</h3>
            <p className="text-[10px] text-muted-foreground">Recibos e faturas</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <FileText size={20} />
          </div>
        </div>

        {/* Total Financial Volume */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex items-center justify-between hover:border-violet-500/20 transition-all hover:scale-[1.01]">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-semibold">Volume Total Mapeado</p>
            <h3 className="text-2xl font-black text-foreground font-mono">
              R$ {stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-muted-foreground">Soma de todos os documentos</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center">
            <DollarSign size={20} />
          </div>
        </div>

        {/* Taxes Estimation */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex items-center justify-between hover:border-amber-500/20 transition-all hover:scale-[1.01]">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-semibold">Tributação Estimada (12%)</p>
            <h3 className="text-2xl font-black text-foreground font-mono text-amber-500">
              R$ {stats.estimatedTaxes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-muted-foreground">Projeção de impostos</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <DollarSign size={20} />
          </div>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Left Side: Filters / Search */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-card border border-border p-5 rounded-xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 pb-3 border-b border-border">
              Filtros de Pesquisa
            </h3>

            {/* Keyword Search */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Buscar no Documento</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Número, emitente, chave..."
                  className="w-full bg-background border border-border pl-9 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-primary text-foreground"
                />
              </div>
            </div>

            {/* Type Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Tipo de Documento</label>
              <div className="grid grid-cols-3 gap-1 bg-muted p-0.5 rounded-lg border border-border/50">
                {(['ALL', 'XML', 'PDF'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`py-1 rounded-md text-[10px] font-black uppercase transition ${
                      typeFilter === t 
                        ? 'bg-card text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t === 'ALL' ? 'Todos' : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-background border border-border px-3 py-1.5 rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
              >
                <option value="ALL">Todos os Status</option>
                <option value="IMPORTADO">Importado</option>
                <option value="PROCESSADO">Processado</option>
                <option value="VALIDADO">Validado</option>
                <option value="ERRO">Inconsistente</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                <Calendar size={12} /> Período de Emissão
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-background border border-border px-2 py-1.5 rounded-lg text-[10px] text-foreground focus:outline-none focus:border-primary"
                />
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-background border border-border px-2 py-1.5 rounded-lg text-[10px] text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Clear Button */}
            <button
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('ALL');
                setStatusFilter('ALL');
                setStartDate('');
                setEndDate('');
              }}
              className="w-full bg-secondary text-secondary-foreground py-1.5 rounded-lg text-xs font-semibold hover:bg-secondary/80 transition flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={12} />
              Limpar Filtros
            </button>
          </div>

          {/* Action on selected */}
          {selectedIds.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl shadow-sm space-y-3 animate-in slide-in-from-bottom-2 duration-200">
              <p className="text-xs text-foreground font-semibold">
                {selectedIds.length} {selectedIds.length === 1 ? 'documento selecionado' : 'documentos selecionados'}
              </p>
              <button
                onClick={handleDownloadBatch}
                className="w-full bg-primary text-primary-foreground py-1.5 rounded-lg text-xs font-semibold hover:bg-primary/90 transition flex items-center justify-center gap-2"
              >
                <Download size={14} />
                Download em Lote (ZIP)
              </button>
            </div>
          )}
        </div>

        {/* Right Side: List / Audits Toggle Grid */}
        <div className="xl:col-span-3 space-y-4">
          
          {/* Toggle Audits / List View */}
          {showAudits ? (
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-3 duration-250">
              <div className="p-5 border-b border-border flex justify-between items-center bg-muted/20">
                <div className="flex items-center gap-2">
                  <History className="text-primary" size={20} />
                  <h3 className="text-sm font-bold text-foreground">Histórico de Auditoria Fiscal</h3>
                </div>
                <button 
                  onClick={() => setShowAudits(false)}
                  className="text-xs bg-secondary text-secondary-foreground px-3 py-1 rounded-md border border-border hover:bg-secondary/80 transition font-semibold"
                >
                  Voltar para Documentos
                </button>
              </div>

              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted border-b border-border text-muted-foreground uppercase font-bold text-[10px]">
                      <th className="p-4">Data / Hora</th>
                      <th className="p-4">Usuário</th>
                      <th className="p-4">Perfis</th>
                      <th className="p-4">Ação</th>
                      <th className="p-4">Detalhes</th>
                      <th className="p-4">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audits.map((a) => (
                      <tr key={a.id} className="border-b border-border hover:bg-muted/10">
                        <td className="p-4 text-muted-foreground whitespace-nowrap">
                          {new Date(a.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-4 font-semibold text-foreground">
                          {a.userName} <span className="block text-[10px] font-normal text-muted-foreground">{a.userEmail}</span>
                        </td>
                        <td className="p-4">
                          <span className="bg-secondary text-secondary-foreground border border-border/80 px-2 py-0.5 rounded-full text-[9px] font-bold">
                            {a.userProfile}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-primary">
                          {a.action}
                        </td>
                        <td className="p-4 text-foreground/80 max-w-xs truncate" title={a.details}>
                          {a.details}
                        </td>
                        <td className="p-4 text-muted-foreground font-mono">
                          {a.ipAddress || '-'}
                        </td>
                      </tr>
                    ))}
                    {audits.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          Nenhum log de auditoria fiscal encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-200 relative">
              {loading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                  <RefreshCw className="animate-spin text-primary" size={24} />
                </div>
              )}
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted border-b border-border text-muted-foreground text-[10px] font-bold uppercase">
                      <th className="p-4 w-10">
                        <input 
                          type="checkbox" 
                          checked={documents.length > 0 && selectedIds.length === documents.length}
                          onChange={handleSelectAll}
                          className="rounded focus:ring-primary border-border cursor-pointer w-4 h-4"
                        />
                      </th>
                      <th className="p-4">Documento</th>
                      <th className="p-4">Emitente</th>
                      <th className="p-4">Destinatário</th>
                      <th className="p-4">Valor</th>
                      <th className="p-4">Data Emissão</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((d) => (
                      <tr key={d.id} className="border-b border-border hover:bg-muted/15 transition-colors">
                        <td className="p-4">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.includes(d.id)}
                            onChange={() => handleToggleSelect(d.id)}
                            className="rounded focus:ring-primary border-border cursor-pointer w-4 h-4"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                              d.tipo === 'XML' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'
                            }`}>
                              {d.tipo === 'XML' ? <FileCode size={16} /> : <FileText size={16} />}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{d.numeroDocumento}</div>
                              <div className="text-[10px] text-muted-foreground truncate max-w-[150px]" title={d.nomeArquivo}>
                                {d.nomeArquivo}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-foreground truncate max-w-[150px]" title={d.emitenteNome || ''}>
                            {d.emitenteNome}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">{d.emitenteCnpj}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-foreground truncate max-w-[150px]" title={d.destinatarioNome || ''}>
                            {d.destinatarioNome}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">{d.destinatarioCnpj}</div>
                        </td>
                        <td className="p-4 font-mono font-bold text-foreground">
                          R$ {d.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {d.dataEmissao ? new Date(d.dataEmissao).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            d.status === 'VALIDADO' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                            d.status === 'PROCESSADO' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
                            d.status === 'ERRO' ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' :
                            'bg-muted text-muted-foreground border border-border'
                          }`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDownloadIndividual(d.id, d.nomeArquivo)}
                              className="p-1.5 bg-secondary text-secondary-foreground border border-border rounded hover:bg-secondary/80 transition"
                              title="Download"
                            >
                              <Download size={12} />
                            </button>
                            <button
                              onClick={() => handleEditClick(d)}
                              disabled={isContabilidade && !isAdmin}
                              className="p-1.5 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                              title={isContabilidade && !isAdmin ? 'Apenas Administradores podem editar' : 'Editar'}
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(d.id, d.numeroDocumento)}
                              disabled={isContabilidade && !isAdmin}
                              className="p-1.5 bg-rose-500/10 text-rose-600 rounded hover:bg-rose-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                              title={isContabilidade && !isAdmin ? 'Apenas Administradores podem excluir' : 'Excluir'}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {documents.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          Nenhum documento fiscal encontrado ou importado com estes filtros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog (Admin Only) */}
      {isEditModalOpen && selectedDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 relative my-8">
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/50 transition z-50"
            >
              <X size={18} />
            </button>
            <div className="p-5 border-b border-border bg-muted/20 flex items-center gap-2">
              <Edit3 className="text-primary" size={20} />
              <h3 className="text-base font-bold text-foreground">Editar Informações Fiscais</h3>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              {selectedDoc.tipo === 'XML' && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-[11px] text-amber-600 flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Atenção:</strong> Modificar metadados de arquivos XML pode gerar divergências com a Receita Federal. O documento original de XML não será alterado, apenas a sua representação e indexação no sistema.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Número do Documento</label>
                  <input 
                    type="text" 
                    value={numeroDocumento}
                    onChange={(e) => setNumeroDocumento(e.target.value)}
                    required
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Valor Total (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={valorTotal}
                    onChange={(e) => setValorTotal(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Emitente (Razão Social)</label>
                <input 
                  type="text" 
                  value={emitenteNome}
                  onChange={(e) => setEmitenteNome(e.target.value)}
                  required
                  className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">CNPJ do Emitente</label>
                  <input 
                    type="text" 
                    value={emitenteCnpj}
                    onChange={(e) => setEmitenteCnpj(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">CNPJ do Destinatário</label>
                  <input 
                    type="text" 
                    value={destinatarioCnpj}
                    onChange={(e) => setDestinatarioCnpj(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Destinatário (Razão Social)</label>
                <input 
                  type="text" 
                  value={destinatarioNome}
                  onChange={(e) => setDestinatarioNome(e.target.value)}
                  required
                  className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Status do Documento</label>
                  <select
                    value={statusVal}
                    onChange={(e) => setStatusVal(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="IMPORTADO">IMPORTADO</option>
                    <option value="PROCESSADO">PROCESSADO</option>
                    <option value="VALIDADO">VALIDADO</option>
                    <option value="ERRO">ERRO</option>
                  </select>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="border-t border-border pt-4 flex justify-end gap-3 bg-muted/10 -mx-6 -mb-6 p-6">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground px-5 py-2 rounded-lg font-semibold shadow hover:bg-primary/90 transition text-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
