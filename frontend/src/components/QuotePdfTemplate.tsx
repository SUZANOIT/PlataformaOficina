import { forwardRef } from 'react';
import { mcaLogoBase64 } from '../assets/mcaLogoBase64';


type QuotePdfTemplateProps = {
  data: any; // Using any for simplicity here, but should match form data
  company: any; // Selected company object
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
};

export const QuotePdfTemplate = forwardRef<HTMLDivElement, QuotePdfTemplateProps>(({ data, company }, ref) => {
  if (!data) return null;

  const subtotal = (data.items || []).reduce((acc: number, item: any) => acc + (Number(item.quantidade) * Number(item.valorUnitario)), 0);
  const total = subtotal;
  const dataAtual = new Date().toLocaleDateString('pt-BR');
  
  const isMca = company?.cnpj?.replace(/\D/g, '') === '30021766000113' || 
                company?.razaoSocial?.toLowerCase().includes('mca') || 
                company?.nomeFantasia?.toLowerCase().includes('mca') ||
                company?.inscricaoEstadual?.replace(/\D/g, '') === '119214099114';

  const getSignatureName = () => {
    if (isMca) {
      return 'Eng. Rafael Suzano Cruz';
    }
    const cleanName = company?.razaoSocial?.toLowerCase() || '';
    if (cleanName.includes('curio') || cleanName.includes('curió') || company?.nomeFantasia?.toLowerCase().includes('curio')) {
      return 'Robson Cruz';
    }
    return 'Assinatura do Responsável';
  };

  return (
    <div
      ref={ref}
      className="bg-white text-slate-900 p-12 w-[718px] min-h-[1012px] flex flex-col justify-between"
      style={{ fontFamily: "'Inter', 'Arial', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .avoid-page-break {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      `}</style>
      
      <div>
        {/* Cabeçalho Premium */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight uppercase">
              ORÇAMENTO {data.numeroOrcamento ? `#${data.numeroOrcamento}` : ''}
            </h1>
            <p className="text-sm text-slate-500 mt-1.5 font-medium">Data de Emissão: {dataAtual}</p>
          </div>
          <div className="flex gap-4 items-center">
            {isMca && (
              <img 
                src={mcaLogoBase64} 
                alt="MCA Logo" 
                className="w-24 h-24 object-contain rounded-full overflow-hidden"
              />
            )}
            <div className="text-right">
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {company?.nomeFantasia || company?.razaoSocial || 'Empresa Emissora'}
              </h2>
              {company?.nomeFantasia && company?.razaoSocial && (
                <p className="text-xs text-slate-500 font-medium mt-0.5">{company.razaoSocial}</p>
              )}
              <div className="text-xs text-slate-500 mt-2 space-y-0.5 font-medium">
                {company?.cnpj && <p>CNPJ: {company.cnpj}</p>}
                {company?.inscricaoEstadual && <p>I.E.: {company.inscricaoEstadual}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Dados do Cliente */}
        <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-lg mb-8">
          <h3 className="text-xs font-bold text-slate-500 border-b border-slate-200/80 pb-2 mb-3.5 uppercase tracking-wider">
            Dados do Cliente
          </h3>
          <div className="grid grid-cols-2 gap-y-3.5 gap-x-8 text-sm">
            <div>
              <span className="font-semibold text-slate-500 text-xs uppercase tracking-wide">Cliente / Razão Social</span>
              <p className="font-medium text-slate-900 mt-0.5">{data.client?.nome || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-500 text-xs uppercase tracking-wide">Nome Fantasia</span>
              <p className="font-medium text-slate-900 mt-0.5">{data.client?.empresa || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-500 text-xs uppercase tracking-wide">CNPJ / CPF</span>
              <p className="font-medium text-slate-900 mt-0.5">{data.client?.cnpj || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-500 text-xs uppercase tracking-wide">E-mail</span>
              <p className="font-medium text-slate-900 mt-0.5">{data.client?.email || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-500 text-xs uppercase tracking-wide">Telefone</span>
              <p className="font-medium text-slate-900 mt-0.5">{data.client?.telefone || 'N/A'}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-500 text-xs uppercase tracking-wide">Endereço</span>
              <p className="font-medium text-slate-955 leading-relaxed mt-0.5">
                {data.client?.logradouro ? `${data.client.logradouro}, ${data.client.numero || 'S/N'}` : 'N/A'}
                {data.client?.complemento ? ` - ${data.client.complemento}` : ''}<br />
                {data.client?.bairro ? `${data.client.bairro} • ` : ''}
                {data.client?.cidade || 'N/A'} - {data.client?.estado || 'N/A'}
                {data.client?.cep ? ` • CEP: ${data.client.cep}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Itens do Orçamento */}
        <div className="mb-8">
          <h3 className="text-xs font-bold text-slate-800 border-b border-slate-900 pb-2 mb-3 uppercase tracking-wider">
            Itens do Orçamento
          </h3>
          
          {/* Header da Tabela em Flexbox (Dark Slate Accent) */}
          <div className="flex bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-t-md">
            <div className="p-3 text-left" style={{ width: '50%' }}>Descrição do Serviço / Produto</div>
            <div className="p-3 text-center" style={{ width: '10%' }}>Qtd</div>
            <div className="p-3 text-right" style={{ width: '20%' }}>Valor Unit.</div>
            <div className="p-3 text-right" style={{ width: '20%' }}>Total</div>
          </div>

          {/* Corpo da Tabela em Flexbox */}
          <div className="border-x border-b border-slate-200 rounded-b-md overflow-hidden shadow-sm">
            {data.items?.map((item: any, index: number) => {
               const q = Number(item.quantidade) || 0;
               const vu = Number(item.valorUnitario) || 0;
               return (
                 <div 
                   key={index} 
                   className="flex border-b border-slate-100 text-sm last:border-b-0 odd:bg-slate-50/50 even:bg-white avoid-page-break" 
                   style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                 >
                   <div className="p-3 text-left break-words font-medium text-slate-800" style={{ width: '50%' }}>
                     {item.descricao}
                   </div>
                   <div className="p-3 text-center text-slate-600 font-medium" style={{ width: '10%' }}>
                     {q}
                   </div>
                   <div className="p-3 text-right text-slate-600 font-medium" style={{ width: '20%' }}>
                     {formatCurrency(vu)}
                   </div>
                   <div className="p-3 text-right text-slate-900 font-semibold" style={{ width: '20%' }}>
                     {formatCurrency(q * vu)}
                   </div>
                 </div>
               );
            })}
          </div>
        </div>

        {/* Totais */}
        <div className="flex justify-end mb-8 avoid-page-break">
          <div className="w-[320px] bg-slate-50 border border-slate-200 p-5 rounded-lg">
            <div className="flex justify-between items-center mb-2.5 text-sm text-slate-500 font-medium">
              <span>Subtotal:</span>
              <span className="text-slate-800">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-lg font-black text-slate-900 border-t border-slate-200/80 pt-2.5 mt-2.5">
              <span>TOTAL GERAL:</span>
              <span className="text-slate-900 underline decoration-double decoration-slate-900 underline-offset-4">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>

        {/* Condições e Observações */}
        <div className="mb-8 avoid-page-break">
          <h3 className="text-xs font-bold text-slate-850 border-b border-slate-200 pb-2 mb-3.5 uppercase tracking-wider">
            Condições Comerciais
          </h3>
          <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-sm text-slate-600">
            <div>
              <span className="font-semibold text-slate-800">Forma de Pagamento:</span>{' '}
              <span className="font-medium text-slate-900">
                {data.condicaoPagamento === 'Parcelado' && data.parcelas
                  ? `Parcelado em ${data.parcelas}x ${data.valorParcela ? `de ${formatCurrency(data.valorParcela)}` : ''}`
                  : data.condicaoPagamento || 'A combinar'}
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-800">Validade da Proposta:</span>{' '}
              <span className="font-medium text-slate-900">{data.validade || 'N/A'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-800">Prazo de Execução:</span>{' '}
              <span className="font-medium text-slate-900">{data.prazoExecucao || 'A combinar'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-800">Garantia Oferecida:</span>{' '}
              <span className="font-medium text-slate-900">{data.garantia || 'Sem garantia especificada'}</span>
            </div>
          </div>
          
          {data.observacao && (
            <div className="text-xs text-slate-600 mt-5 p-4 bg-slate-50/80 rounded-lg whitespace-pre-wrap border-l-4 border-slate-900 shadow-sm leading-relaxed">
              <span className="font-bold text-slate-900 block mb-1.5 uppercase tracking-wide">Observações Gerais:</span>
              {data.observacao}
            </div>
          )}
        </div>
      </div>

      {/* Assinatura no Rodapé */}
      <div className="mt-16 text-center avoid-page-break">
        <div className="w-[320px] mx-auto border-t border-slate-900 pt-2.5">
          <p className="font-bold text-slate-900 text-sm">
            {company?.razaoSocial || company?.nomeFantasia || 'Empresa Emissora'}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">{getSignatureName()}</p>
        </div>
      </div>
    </div>
  );
});

QuotePdfTemplate.displayName = 'QuotePdfTemplate';
