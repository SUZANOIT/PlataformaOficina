import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, FileText, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { QuotePdfTemplate } from '../components/QuotePdfTemplate';
import { PDF_VIEWER_DOCUMENT, PDF_VIEWER_READY, renderElementToPdfBlob } from '../hooks/useGeneratePdf';

interface LoadedDocument {
  blob: Blob;
  filename: string;
  title: string;
}

interface DocumentViewerProps {
  /** Título exibido enquanto o documento carrega. */
  initialTitle?: string;
  /** Carrega o documento quando a aba é aberta diretamente (sem a tela de origem). */
  loadFallback?: () => Promise<LoadedDocument>;
  /** Mensagem quando não há documento e não existe carregamento direto. */
  unavailableMessage?: string;
}

/**
 * Aba de visualização de PDF com URL legível (ex.: /orcamentos/1542/pdf).
 * Recebe o PDF da tela que o gerou (mesma origem) ou, quando suportado,
 * carrega o documento pela API, que aplica as permissões de acesso.
 */
export function DocumentViewer({ initialTitle = 'Documento', loadFallback, unavailableMessage }: DocumentViewerProps) {
  const [doc, setDoc] = useState<{ url: string; filename: string; title: string } | null>(null);
  const [status, setStatus] = useState<'waiting' | 'loading' | 'ready' | 'error' | 'unavailable'>('waiting');
  const [error, setError] = useState('');
  const received = useRef(false);

  useEffect(() => { document.title = doc?.title || initialTitle; }, [doc, initialTitle]);

  useEffect(() => {
    let url = '';
    const show = (d: LoadedDocument) => {
      url = URL.createObjectURL(d.blob);
      setDoc({ url, filename: d.filename, title: d.title });
      setStatus('ready');
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.opener) return;
      if (event.data?.type !== PDF_VIEWER_DOCUMENT || !(event.data.blob instanceof Blob)) return;
      received.current = true;
      show(event.data);
    };
    window.addEventListener('message', onMessage);

    // Avisa a tela de origem que a aba está pronta para receber o PDF
    const ping = () => window.opener?.postMessage({ type: PDF_VIEWER_READY }, window.location.origin);
    ping();
    const interval = setInterval(ping, 250);

    // Sem documento da tela de origem: carrega direto (quando suportado)
    const timeout = setTimeout(async () => {
      clearInterval(interval);
      if (received.current) return;
      if (!loadFallback) { setStatus('unavailable'); return; }
      setStatus('loading');
      try {
        show(await loadFallback());
      } catch (e: any) {
        setError(e?.response?.status === 404 ? 'Documento não encontrado ou sem permissão de acesso.' : (e?.response?.data?.error || 'Não foi possível carregar o documento.'));
        setStatus('error');
      }
    }, window.opener ? 2500 : 0);

    return () => {
      window.removeEventListener('message', onMessage);
      clearInterval(interval);
      clearTimeout(timeout);
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen flex-col bg-muted/40">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <FileText size={18} className="shrink-0 text-primary" />
          <h1 className="truncate text-sm font-semibold text-foreground">{doc?.title || initialTitle}</h1>
        </div>
        {doc && (
          <a href={doc.url} download={doc.filename} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Download size={15} /> Baixar PDF
          </a>
        )}
      </header>
      <main className="flex flex-1 items-center justify-center">
        {status === 'ready' && doc ? (
          <iframe title={doc.title} src={doc.url} className="h-full w-full border-0" />
        ) : status === 'error' || status === 'unavailable' ? (
          <p className="max-w-md px-6 text-center text-sm text-muted-foreground">
            {status === 'error' ? error : (unavailableMessage || 'Este documento é gerado na tela de origem. Volte à tela anterior e gere o PDF novamente.')}
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Carregando documento…</p>
        )}
      </main>
    </div>
  );
}

/** /documento/:nome — PDFs gerados em tela (guincho, guias, adiantamentos). */
export function GenericDocumentViewer() {
  const { nome } = useParams();
  return <DocumentViewer initialTitle={(nome || 'documento').replace(/-/g, ' ')} />;
}

/**
 * /orcamentos/:numero/pdf (oficina) e /portal/orcamentos/:numero/pdf (gestor de frota).
 * Acesso direto busca o orçamento pelo número na API correspondente, que só
 * devolve orçamentos da própria oficina (oficina) ou da própria empresa (portal).
 */
export function QuotePdfViewer({ source }: { source: 'oficina' | 'portal' }) {
  const { numero } = useParams();
  const [quote, setQuote] = useState<any>(null);
  const templateRef = useRef<HTMLDivElement>(null);
  const resolver = useRef<((d: LoadedDocument) => void) | null>(null);
  const rejecter = useRef<((e: any) => void) | null>(null);

  useEffect(() => {
    if (!quote || !templateRef.current || !resolver.current) return;
    const filename = `orcamento-${quote.numeroOrcamento}.pdf`;
    renderElementToPdfBlob(templateRef.current, filename)
      .then(blob => resolver.current?.({ blob, filename, title: `Orçamento #${quote.numeroOrcamento}` }))
      .catch(e => rejecter.current?.(e));
  }, [quote]);

  const loadFallback = () => new Promise<LoadedDocument>((resolve, reject) => {
    if (!numero || !/^\d+$/.test(numero)) { reject({ response: { status: 404 } }); return; }
    resolver.current = resolve;
    rejecter.current = reject;
    const path = source === 'portal' ? `/portal-gestor/orcamentos/${numero}` : `/quotes/${numero}`;
    api.get(path).then(r => setQuote(r.data)).catch(reject);
  });

  return (
    <>
      <DocumentViewer initialTitle={`Orçamento #${numero}`} loadFallback={loadFallback} />
      {quote && (
        <div className="absolute left-[-9999px] top-[-9999px]" aria-hidden="true">
          <QuotePdfTemplate ref={templateRef} data={quote} company={quote.company} />
        </div>
      )}
    </>
  );
}
