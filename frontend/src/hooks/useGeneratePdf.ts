import { useState } from 'react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export function useGeneratePdf() {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const generatePdf = async (element: HTMLElement | null, filename: string = 'orcamento.pdf') => {
    if (!element) {
      console.error('Template element not found');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      
      // Save original scroll position to restore later
      const originalScrollY = window.scrollY;
      const originalScrollX = window.scrollX;
      
      // Scroll window to top to guarantee getBoundingClientRect() calculates offset relative to document origin.
      // This is crucial for html2pdf.js pagebreak algorithm to compute page boundaries correctly.
      window.scrollTo(0, 0);
      
      // A small delay helps ensure React has fully rendered the hidden component with current data
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const opt = {
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
      };

      const worker = html2pdf().set(opt).from(element);

      // Open preview in new tab
      await worker.toPdf().get('pdf').then((pdf: any) => {
        window.open(pdf.output('bloburl'), '_blank');
      });

      // Auto download
      await worker.save();
      
      // Restore scroll position
      window.scrollTo(originalScrollX, originalScrollY);
      
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
