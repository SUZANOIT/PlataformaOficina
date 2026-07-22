import { useState, useEffect } from 'react';
import { Paperclip, Upload, Trash2, Download, Eye, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AnexoNF {
  id: string;
  tipo: string;
  nomeOriginal: string;
  arquivo: string;
  bucket: string;
  contentType: string;
  tamanho: number;
  usuarioUpload: string;
  createdAt: string;
  url: string;
}

interface AttachmentsUploadProps {
  quoteId: string;
  readOnly?: boolean;
}

export function AttachmentsUpload({ quoteId, readOnly = false }: AttachmentsUploadProps) {
  const [anexos, setAnexos] = useState<AnexoNF[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchAnexos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/quotes/${quoteId}/s3-attachments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnexos(data);
      }
    } catch (error) {
      console.error('Erro ao carregar anexos', error);
      toast.error('Erro ao carregar anexos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (quoteId) {
      fetchAnexos();
    }
  }, [quoteId]);

  const handleUpload = async (file: File, tipo: string) => {
    if (file.size > 20 * 1024 * 1024) {
      toast.error('O arquivo deve ter no máximo 20MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', tipo);

    try {
      setUploading(true);
      // Simulação de progresso, já que fetch padrão não suporta onUploadProgress facilmente
      // Usaremos XMLHttpRequest para ter progresso real
      const token = localStorage.getItem('token');
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/quotes/${quoteId}/s3-attachments`, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 201) {
          toast.success('Upload concluído com sucesso!');
          fetchAnexos();
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            toast.error(err.error || 'Erro ao realizar upload.');
          } catch {
            toast.error('Erro ao realizar upload.');
          }
        }
        setUploading(false);
        setUploadProgress(0);
      };

      xhr.onerror = () => {
        toast.error('Falha na rede durante o upload.');
        setUploading(false);
        setUploadProgress(0);
      };

      xhr.send(formData);
    } catch (error) {
      console.error('Erro no upload', error);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este anexo?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/quotes/${quoteId}/s3-attachments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Anexo excluído com sucesso.');
        setAnexos(anexos.filter(a => a.id !== id));
      } else {
        toast.error('Erro ao excluir anexo.');
      }
    } catch (error) {
      console.error('Erro ao deletar', error);
      toast.error('Erro de conexão ao excluir.');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const notasFiscais = anexos.filter(a => a.tipo.startsWith('NF_'));
  const comprovanteCielo = anexos.find(a => a.tipo === 'COMPROVANTE_CIELO');

  const renderFileRow = (anexo: AnexoNF) => (
    <div key={anexo.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-background hover:bg-muted/50 transition">
      <div className="flex items-center gap-3 overflow-hidden">
        {anexo.contentType === 'application/pdf' ? <FileText className="text-rose-500 flex-shrink-0" size={20} /> : <ImageIcon className="text-sky-500 flex-shrink-0" size={20} />}
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm font-medium truncate" title={anexo.nomeOriginal}>{anexo.nomeOriginal}</span>
          <span className="text-xs text-muted-foreground">
            {formatSize(anexo.tamanho)} • Enviado por {anexo.usuarioUpload} em {new Date(anexo.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        <a href={anexo.url} target="_blank" rel="noreferrer" className="p-1.5 text-muted-foreground hover:text-foreground bg-muted hover:bg-border rounded-md transition" title="Visualizar">
          <Eye size={16} />
        </a>
        <a href={anexo.url} download={anexo.nomeOriginal} className="p-1.5 text-muted-foreground hover:text-foreground bg-muted hover:bg-border rounded-md transition" title="Download">
          <Download size={16} />
        </a>
        {!readOnly && (
          <button onClick={() => handleDelete(anexo.id)} className="p-1.5 text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 rounded-md transition" title="Excluir">
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Paperclip className="text-primary" size={20} />
          Anexos (Notas Fiscais e Comprovantes)
        </h3>
      </div>

      {uploading && (
        <div className="p-4 border border-border rounded-lg bg-muted/20 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Fazendo upload...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-border rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        </div>
      )}

      {loading && <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Carregando anexos...</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notas Fiscais */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-foreground">Notas Fiscais</h4>
            {!readOnly && (
              <label className="cursor-pointer bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2 transition">
                <Upload size={14} /> Enviar NF
                <input 
                  type="file" 
                  className="hidden" 
                  accept="application/pdf, text/xml, application/xml"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      Array.from(e.target.files).forEach(file => {
                        const tipo = file.type.includes('xml') ? 'NF_XML' : 'NF_PDF';
                        handleUpload(file, tipo);
                      });
                    }
                  }}
                />
              </label>
            )}
          </div>
          <div className="space-y-2">
            {notasFiscais.length === 0 ? (
              <p className="text-sm text-muted-foreground italic bg-muted/10 p-4 rounded-lg border border-dashed border-border text-center">
                Nenhuma nota fiscal anexada.
              </p>
            ) : (
              notasFiscais.map(renderFileRow)
            )}
          </div>
        </div>

        {/* Comprovante Cielo */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-foreground">Comprovante POS Cielo</h4>
            {!readOnly && (
              <label className="cursor-pointer bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2 transition">
                <Upload size={14} /> {comprovanteCielo ? 'Substituir' : 'Enviar Comprovante'}
                <input 
                  type="file" 
                  className="hidden" 
                  accept="application/pdf, image/png, image/jpeg, image/jpg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file, 'COMPROVANTE_CIELO');
                  }}
                />
              </label>
            )}
          </div>
          <div className="space-y-2">
            {comprovanteCielo ? (
              renderFileRow(comprovanteCielo)
            ) : (
              <p className="text-sm text-muted-foreground italic bg-muted/10 p-4 rounded-lg border border-dashed border-border text-center">
                Nenhum comprovante anexado.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
