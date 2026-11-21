import { useState } from 'react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

/** Mensagens trocadas entre a tela que gera o PDF e a aba de visualização (/…/pdf). */
export const PDF_VIEWER_READY = 'pdf-viewer-ready';
export const PDF_VIEWER_DOCUMENT = 'pdf-viewer-document';

const pdfOptions = (filename: string) => ({
  margin:       10, // margins in mm
  filename:     filename,
  image:        { type: 'jpeg' as const, quality: 0.98 },
  html2canvas:  {
    scale: 2,
    useCORS: true,
    logging: false,
    width: 718,
    windowWidth: 718,
    scrollY: 0,
    scrollX: 0
  },
  jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
  pagebreak:    { mode: ['css', 'legacy'], avoid: ['tr', '.avoid-page-break'] }
});

/** Gera o PDF de um elemento já renderizado e devolve o Blob (sem abrir aba nem baixar). */
export async function renderElementToPdfBlob(element: HTMLElement, filename = 'documento.pdf'): Promise<Blob> {
  const originalScrollY = window.scrollY;
  const originalScrollX = window.scrollX;
  window.scrollTo(0, 0);
  await new Promise(resolve => setTimeout(resolve, 300));
  try {
    const pdf = await html2pdf().set(pdfOptions(filename)).from(element).toPdf().get('pdf');
    return pdf.output('blob') as Blob;
  } finally {
    window.scrollTo(originalScrollX, originalScrollY);
  }
}

/** Nome legível para a URL da aba de visualização (ex.: "Orcamento_Guincho_0012.pdf" -> "orcamento-guincho-0012"). */
export function documentSlug(filename: string) {
  return filename
    .replace(/\.pdf$/i, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'documento';
}

/**
 * Abre a aba de visualização numa URL legível (sem o identificador "blob:…")
 * e entrega o PDF já gerado para ela, somente na mesma origem.
 */
function openViewer(blob: Blob, filename: string, viewerPath: string, title: string) {
  const viewer = window.open(viewerPath, '_blank');
  if (!viewer) return;

  const onMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== viewer) return;
    if (event.data?.type !== PDF_VIEWER_READY) return;
    viewer.postMessage({ type: PDF_VIEWER_DOCUMENT, blob, filename, title }, window.location.origin);
    window.removeEventListener('message', onMessage);
  };
  window.addEventListener('message', onMessage);
  // A aba tem até 1 minuto para carregar; depois disso ela mesma busca o documento (quando suportado)
  setTimeout(() => window.removeEventListener('message', onMessage), 60_000);
}

export interface GeneratePdfOptions {
  /** URL legível da aba de visualização, ex.: /orcamentos/1542/pdf. Padrão: /documento/<nome-do-arquivo>. */
  viewerPath?: string;
  /** Título da aba, ex.: "Orçamento #1542". Padrão: nome do arquivo. */
  title?: string;
}

export function useGeneratePdf() {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const generatePdf = async (element: HTMLElement | null, filename: string = 'orcamento.pdf', options: GeneratePdfOptions = {}) => {
    if (!element) {
      console.error('Template element not found');
      return;
    }

    try {
      setIsGeneratingPdf(true);

      const blob = await renderElementToPdfBlob(element, filename);

      // Visualização em nova aba com URL legível (antes: blob:<uuid>)
      openViewer(
        blob,
        filename,
        options.viewerPath || `/documento/${documentSlug(filename)}`,
        options.title || filename.replace(/\.pdf$/i, ''),
      );

      // Download automático com o nome do arquivo
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);

      return true;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return { generatePdf, isGeneratingPdf };
}
