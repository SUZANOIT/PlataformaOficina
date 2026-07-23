import { mcaLogoBase64 } from '../assets/mcaLogoBase64';

type ReportPrintHeaderProps = {
  company: any;
  title: string;
  subtitle?: string;
};

export function ReportPrintHeader({ company, title, subtitle }: ReportPrintHeaderProps) {
  const isMca = company?.cnpj?.replace(/\D/g, '') === '30021766000113' || 
                company?.razaoSocial?.toLowerCase().includes('mca') || 
                company?.nomeFantasia?.toLowerCase().includes('mca') ||
                company?.inscricaoEstadual?.replace(/\D/g, '') === '119214099114';

  const isCurio = !!(
    company?.razaoSocial?.toLowerCase().includes('curio') || 
    company?.razaoSocial?.toLowerCase().includes('curió') || 
    company?.nomeFantasia?.toLowerCase().includes('curio') ||
    company?.nomeFantasia?.toLowerCase().includes('curió')
  );

  if (isCurio) {
    return (
      <div className="hidden print:block mb-8">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
          @media print {
            body, html, #root { font-family: 'Outfit', 'Inter', sans-serif !important; background: white !important; }
            table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            th { background-color: #eef2ff !important; color: #312e81 !important; border-bottom: 2px solid #c7d2fe !important; text-transform: uppercase; font-size: 10px !important; font-weight: 800 !important; letter-spacing: 0.05em; padding: 10px 8px !important; text-align: left; }
            td { border-bottom: 1px solid #e0e7ff !important; font-size: 11px !important; color: #1e293b !important; padding: 8px !important; }
            tr:nth-child(even) td { background-color: #f8fafc !important; }
          }
        `}</style>
        <div className="flex flex-row justify-between items-stretch border-b-2 border-indigo-900 pb-6">
          <div className="flex flex-col justify-between">
            <div>
              <span className="bg-indigo-900 text-white text-[9px] font-extrabold tracking-widest px-3 py-1 rounded-full uppercase">
                Relatório Gerencial
              </span>
              <h1 className="text-3xl font-black text-indigo-950 mt-2.5 tracking-tight uppercase" style={{ fontFamily: "'Playfair Display', serif" }}>
                {title}
              </h1>
            </div>
            {subtitle && (
              <div className="mt-4">
                <p className="text-[14px] font-extrabold text-indigo-700 uppercase tracking-wider">
                  {subtitle}
                </p>
              </div>
            )}
          </div>
          
          <div className="flex gap-4 items-center">
            <div className="w-16 h-16 flex items-center justify-center bg-indigo-50 rounded-xl border border-indigo-100 shadow-xs shrink-0">
              <svg className="w-10 h-10 text-indigo-900" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="4"/>
                <circle cx="50" cy="50" r="37" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 3"/>
                <path d="M64 36C60 30 53 28 45 29C34 31 26 41 28 53C30 65 40 73 52 71C61 70 68 63 70 54" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
                <circle cx="52" cy="50" r="4" fill="currentColor"/>
              </svg>
            </div>
            
            <div className="text-right flex flex-col justify-center">
              <h2 className="text-base font-extrabold text-indigo-950 leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                {company?.nomeFantasia || company?.razaoSocial || 'Curió Serviços Automotivos'}
              </h2>
              {company?.nomeFantasia && company?.razaoSocial && (
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{company.razaoSocial}</p>
              )}
              <div className="text-[10px] text-slate-400 mt-2 space-y-0.5 font-mono">
                {company?.cnpj && <p>CNPJ: {company.cnpj}</p>}
                {company?.inscricaoEstadual && <p>I.E.: {company.inscricaoEstadual}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MCA / DEFAULT
  return (
    <div className="hidden print:block mb-8">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        @media print {
          body, html, #root { font-family: 'Inter', 'Arial', sans-serif !important; background: white !important; }
          table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          th { background-color: #f1f5f9 !important; color: #0f172a !important; border-bottom: 2px solid #cbd5e1 !important; text-transform: uppercase; font-size: 10px !important; font-weight: 700 !important; padding: 10px 8px !important; text-align: left; }
          td { border-bottom: 1px solid #e2e8f0 !important; font-size: 11px !important; color: #334155 !important; padding: 8px !important; }
        }
      `}</style>
      <div className="flex flex-row justify-between items-start border-b-2 border-slate-900 pb-6">
        <div className="text-left">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight uppercase">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[14px] font-extrabold text-slate-700 mt-2 uppercase tracking-wide">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex gap-4 items-center">
          {isMca && (
            <img 
              src={mcaLogoBase64} 
              alt="MCA Logo" 
              className="w-20 h-20 object-contain rounded-full overflow-hidden"
            />
          )}
          <div className="text-right">
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              {company?.nomeFantasia || company?.razaoSocial || 'Relatório do Sistema'}
            </h2>
            {company?.nomeFantasia && company?.razaoSocial && (
              <p className="text-xs text-slate-500 font-medium mt-0.5">{company.razaoSocial}</p>
            )}
            <div className="text-[10px] text-slate-500 mt-2 space-y-0.5 font-medium">
              {company?.cnpj && <p>CNPJ: {company.cnpj}</p>}
              {company?.inscricaoEstadual && <p>I.E.: {company.inscricaoEstadual}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
