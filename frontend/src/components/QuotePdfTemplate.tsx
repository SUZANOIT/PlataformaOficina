import { forwardRef } from 'react';

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

  const getSignatureName = (razaoSocial?: string) => {
    if (!razaoSocial) return 'Assinatura do Responsável';
    const cleanName = razaoSocial.toLowerCase();
    if (cleanName.includes('mca')) {
      return 'Eng. Rafael Suzano Cruz';
    }
    if (cleanName.includes('curio') || cleanName.includes('curió')) {
      return 'Robson Cruz';
    }
    return 'Assinatura do Responsável';
  };

  return (
    <div
      ref={ref}
      className="bg-white text-black p-12 w-[718px]" // Fixed width for A4 proportion (718px at 96 DPI)
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      <style>{`
        tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .avoid-page-break {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      `}</style>
      {/* Cabeçalho */}
      <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">ORÇAMENTO</h1>
          <p className="text-gray-500 mt-1">Data: {dataAtual}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-800">{company?.razaoSocial || 'Empresa Emissora'}</h2>
          {company?.cnpj && <p className="text-sm text-gray-500 mt-1">CNPJ: {company.cnpj}</p>}
        </div>
      </div>

      {/* Dados do Cliente */}
      <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg mb-8">
        <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4 uppercase text-sm tracking-wider">Dados do Cliente</h3>
        <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
          <div><span className="font-semibold text-gray-600">Cliente/Razão Social:</span> <br />{data.client?.nome || 'N/A'}</div>
          <div><span className="font-semibold text-gray-600">Nome Fantasia:</span> <br />{data.client?.empresa || 'N/A'}</div>
          <div><span className="font-semibold text-gray-600">CNPJ:</span> <br />{data.client?.cnpj || 'N/A'}</div>
          <div><span className="font-semibold text-gray-600">E-mail:</span> <br />{data.client?.email || 'N/A'}</div>
          <div><span className="font-semibold text-gray-600">Telefone:</span> <br />{data.client?.telefone || 'N/A'}</div>
          <div><span className="font-semibold text-gray-600">Endereço:</span> <br />
            {data.client?.logradouro ? `${data.client.logradouro}, ${data.client.numero || 'S/N'}` : 'N/A'}<br />
            {data.client?.bairro ? `${data.client.bairro} - ` : ''}
            {data.client?.cidade || 'N/A'} - {data.client?.estado || 'N/A'}<br />
            {data.client?.cep ? `CEP: ${data.client.cep}` : ''}
          </div>
        </div>
      </div>

      {/* Itens do Orçamento */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 border-b border-gray-800 pb-2 mb-4 uppercase text-sm tracking-wider">Itens do Orçamento</h3>
        
        {/* Header da Tabela em Flexbox */}
        <div className="flex bg-gray-100 text-gray-700 text-sm font-semibold border border-gray-200">
          <div className="p-3 text-left" style={{ width: '50%' }}>Descrição</div>
          <div className="p-3 text-center border-l border-gray-200" style={{ width: '10%' }}>Qtd</div>
          <div className="p-3 text-right border-l border-gray-200" style={{ width: '20%' }}>Valor Unit.</div>
          <div className="p-3 text-right border-l border-gray-200" style={{ width: '20%' }}>Total</div>
        </div>

        {/* Corpo da Tabela em Flexbox */}
        <div className="border-x border-b border-gray-200">
          {data.items?.map((item: any, index: number) => {
             const q = Number(item.quantidade) || 0;
             const vu = Number(item.valorUnitario) || 0;
             return (
               <div 
                 key={index} 
                 className="flex border-b border-gray-200 text-sm last:border-b-0 avoid-page-break" 
                 style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
               >
                 <div className="p-3 text-left break-words" style={{ width: '50%' }}>{item.descricao}</div>
                 <div className="p-3 text-center border-l border-gray-200" style={{ width: '10%' }}>{q}</div>
                 <div className="p-3 text-right border-l border-gray-200" style={{ width: '20%' }}>{formatCurrency(vu)}</div>
                 <div className="p-3 text-right border-l border-gray-200 font-medium" style={{ width: '20%' }}>{formatCurrency(q * vu)}</div>
               </div>
             );
          })}
        </div>
      </div>

      {/* Totais */}
      <div className="flex justify-end mb-10 avoid-page-break">
        <div className="w-1/2 bg-gray-50 border border-gray-200 p-6 rounded-lg">
          <div className="flex justify-between items-center mb-2 text-gray-600">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-xl font-black text-gray-900 border-t border-gray-200 pt-2 mt-2">
            <span>TOTAL:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Condições e Observações */}
      <div className="mb-16">
        <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4 uppercase text-sm tracking-wider">Condições e Observações</h3>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
          <div><span className="font-semibold text-gray-800">Condição de Pagamento:</span> {data.condicaoPagamento}</div>
          <div><span className="font-semibold text-gray-800">Validade da Proposta:</span> {data.validade}</div>
          <div><span className="font-semibold text-gray-800">Prazo de Execução/Entrega:</span> {data.prazoExecucao || 'A combinar'}</div>
          <div><span className="font-semibold text-gray-800">Garantia:</span> {data.garantia || 'Sem garantia especificada'}</div>
        </div>
        {data.observacao && (
          <div className="text-sm text-gray-600 mt-4 p-4 bg-gray-50 rounded-lg whitespace-pre-wrap border border-gray-100">
            <span className="font-semibold text-gray-800 block mb-1">Observações Adicionais:</span>
            {data.observacao}
          </div>
        )}
      </div>

      {/* Assinatura */}
      <div className="mt-24 text-center">
        <div className="w-64 mx-auto border-t border-gray-800 pt-2">
          <p className="font-bold text-gray-800">{company?.razaoSocial || 'Empresa Emissora'}</p>
          <p className="text-xs text-gray-500">{getSignatureName(company?.razaoSocial)}</p>
        </div>
      </div>
    </div>
  );
});
QuotePdfTemplate.displayName = 'QuotePdfTemplate';
