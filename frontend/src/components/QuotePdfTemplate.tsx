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

  const isCurio = !!(
    company?.razaoSocial?.toLowerCase().includes('curio') || 
    company?.razaoSocial?.toLowerCase().includes('curió') || 
    company?.nomeFantasia?.toLowerCase().includes('curio') ||
    company?.nomeFantasia?.toLowerCase().includes('curió')
  );

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

  const hasClientData = data.client && (
    data.client.nome || 
    data.client.empresa || 
    data.client.cnpj || 
    data.client.email || 
    data.client.telefone || 
    data.client.logradouro || 
    data.client.cidade || 
    data.client.estado ||
    data.client.bairro ||
    data.client.cep
  );

  const hasVehicleData = !!(
    data.veiculoMarca || 
    data.veiculoModelo || 
    data.veiculoAno || 
    data.veiculoPlaca
  );

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
        <div className={`flex justify-between items-start border-b-2 ${isCurio ? 'border-indigo-900' : 'border-slate-900'} pb-6 mb-8`}>
          <div>
            <h1 className={`text-4xl font-extrabold ${isCurio ? 'text-indigo-950' : 'text-slate-900'} tracking-tight uppercase`}>
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
              <h2 className={`text-lg font-bold ${isCurio ? 'text-indigo-950' : 'text-slate-900'} leading-tight`}>
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

        {/* Seção de Dados (Cliente & Veículo) */}
        {(hasClientData || hasVehicleData) && (
          <div 
            className="mb-8 avoid-page-break"
            style={{ display: 'flex', gap: '20px', width: '100%' }}
          >
            {/* Dados do Cliente */}
            {hasClientData && (
              <div 
                className={`${isCurio ? 'bg-indigo-50/20 border border-indigo-100' : 'bg-slate-50 border border-slate-200/80'} p-4 rounded-lg`}
                style={{ flex: 1, width: hasVehicleData ? '48%' : '100%' }}
              >
                <div>
                  <h3 className={`text-[11px] font-bold uppercase tracking-wider ${isCurio ? 'text-indigo-900 bg-indigo-900/5 px-2.5 py-1.5 rounded-md mb-3' : 'text-slate-500 border-b border-slate-200/80 pb-2 mb-3'}`}>
                    Dados do Cliente
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 15px' }} className="text-[12px]">
                    {data.client?.nome && (
                      <div style={{ width: '100%' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Cliente / Razão Social</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.client.nome}</p>
                      </div>
                    )}
                    {data.client?.empresa && (
                      <div style={{ width: hasVehicleData ? '100%' : '45%', minWidth: '120px' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Nome Fantasia</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.client.empresa}</p>
                      </div>
                    )}
                    {data.client?.cnpj && (
                      <div style={{ width: hasVehicleData ? '100%' : '45%', minWidth: '120px' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">CNPJ / CPF</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.client.cnpj}</p>
                      </div>
                    )}
                    {data.client?.email && (
                      <div style={{ width: '100%' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">E-mail</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.client.email}</p>
                      </div>
                    )}
                    {data.client?.telefone && (
                      <div style={{ width: '100%' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Telefone</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.client.telefone}</p>
                      </div>
                    )}
                    {(data.client?.logradouro || data.client?.cidade || data.client?.estado || data.client?.cep) && (
                      <div style={{ width: '100%' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Endereço</span>
                        <p className="font-medium text-slate-955 leading-normal mt-0.5">
                          {data.client?.logradouro ? `${data.client.logradouro}, ${data.client.numero || 'S/N'}` : ''}
                          {data.client?.complemento ? ` - ${data.client.complemento}` : ''}
                          <br />
                          {data.client?.bairro ? `${data.client.bairro} • ` : ''}
                          {data.client?.cidade || ''}
                          {data.client?.cidade && data.client?.estado ? ` - ${data.client.estado}` : (data.client?.estado || '')}
                          {data.client?.cep ? ` • CEP: ${data.client.cep}` : ''}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Dados do Veículo */}
            {hasVehicleData && (
              <div 
                className={`${isCurio ? 'bg-indigo-50/20 border border-indigo-100' : 'bg-slate-50 border border-slate-200/80'} p-4 rounded-lg`}
                style={{ flex: 1, width: hasClientData ? '48%' : '100%' }}
              >
                <div>
                  <h3 className={`text-[11px] font-bold uppercase tracking-wider ${isCurio ? 'text-indigo-900 bg-indigo-900/5 px-2.5 py-1.5 rounded-md mb-3' : 'text-slate-500 border-b border-slate-200/80 pb-2 mb-3'}`}>
                    Dados do Veículo
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 15px' }} className="text-[12px]">
                    {data.veiculoMarca && (
                      <div style={{ width: hasClientData ? '100%' : '45%', minWidth: '120px' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Marca</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.veiculoMarca}</p>
                      </div>
                    )}
                    {data.veiculoModelo && (
                      <div style={{ width: hasClientData ? '100%' : '45%', minWidth: '120px' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Modelo</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.veiculoModelo}</p>
                      </div>
                    )}
                    {data.veiculoAno && (
                      <div style={{ width: hasClientData ? '100%' : '45%', minWidth: '120px' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Ano</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.veiculoAno}</p>
                      </div>
                    )}
                    {data.veiculoPlaca && (
                      <div style={{ width: hasClientData ? '100%' : '45%', minWidth: '120px' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Placa</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.veiculoPlaca}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Itens do Orçamento */}
        <div className="mb-8">
          <h3 className={`text-[11px] font-bold uppercase tracking-wider ${isCurio ? 'text-indigo-900 bg-indigo-900/5 px-2.5 py-1.5 rounded-md mb-3' : 'text-slate-800 border-b border-slate-900 pb-2 mb-3'}`}>
            Itens do Orçamento
          </h3>
          
          {/* Header da Tabela em Flexbox (Dark Slate Accent) */}
          <div className={`flex ${isCurio ? 'bg-indigo-950' : 'bg-slate-900'} text-white text-[10px] font-bold uppercase tracking-wider rounded-t-md`}>
            <div className="py-1.5 px-3 text-left" style={{ width: '50%' }}>Descrição do Serviço / Produto</div>
            <div className="py-1.5 px-3 text-center" style={{ width: '10%' }}>Qtd</div>
            <div className="py-1.5 px-3 text-right" style={{ width: '20%' }}>Valor Unit.</div>
            <div className="py-1.5 px-3 text-right" style={{ width: '20%' }}>Total</div>
          </div>

          {/* Corpo da Tabela em Flexbox */}
          <div className="border-x border-b border-slate-200 rounded-b-md overflow-hidden shadow-sm">
            {data.items?.map((item: any, index: number) => {
               const q = Number(item.quantidade) || 0;
               const vu = Number(item.valorUnitario) || 0;
               return (
                 <div 
                   key={index} 
                   className={`flex border-b border-slate-100 text-[12px] last:border-b-0 ${isCurio ? 'odd:bg-indigo-50/10 even:bg-white' : 'odd:bg-slate-50/50 even:bg-white'} avoid-page-break`} 
                   style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                 >
                   <div className="py-1.5 px-3 text-left break-words font-medium text-slate-800" style={{ width: '50%' }}>
                     {item.descricao}
                   </div>
                   <div className="py-1.5 px-3 text-center text-slate-600 font-medium" style={{ width: '10%' }}>
                     {q}
                   </div>
                   <div className="py-1.5 px-3 text-right text-slate-600 font-medium" style={{ width: '20%' }}>
                     {formatCurrency(vu)}
                   </div>
                   <div className={`py-1.5 px-3 text-right ${isCurio ? 'text-indigo-950' : 'text-slate-900'} font-semibold`} style={{ width: '20%' }}>
                     {formatCurrency(q * vu)}
                   </div>
                 </div>
               );
            })}
          </div>
        </div>

        {/* Totais */}
        <div className="flex justify-end mb-8 avoid-page-break">
          <div className={`w-[320px] ${isCurio ? 'bg-indigo-50/20 border border-indigo-100' : 'bg-slate-50 border border-slate-200'} p-4 rounded-lg`}>
            <div className="flex justify-between items-center mb-2 text-[12px] text-slate-500 font-medium">
              <span>Subtotal:</span>
              <span className={`font-semibold ${isCurio ? 'text-indigo-950' : 'text-slate-800'}`}>{formatCurrency(subtotal)}</span>
            </div>
            <div className={`flex justify-between items-center text-[14px] font-black border-t ${isCurio ? 'text-indigo-950 border-indigo-100' : 'text-slate-900 border-slate-200/80'} pt-2 mt-2`}>
              <span>TOTAL GERAL:</span>
              <span className={`underline decoration-double ${isCurio ? 'text-indigo-950 decoration-indigo-950' : 'text-slate-900 decoration-slate-900'} underline-offset-4`}>
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>

        {/* Condições e Observações */}
        <div className="mb-8 avoid-page-break">
          <h3 className={`text-[11px] font-bold uppercase tracking-wider ${isCurio ? 'text-indigo-900 bg-indigo-900/5 px-2.5 py-1.5 rounded-md mb-3.5' : 'text-slate-850 border-b border-slate-200 pb-2 mb-3.5'}`}>
            Condições Comerciais
          </h3>
          <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-[12px] text-slate-600">
            <div>
              <span className={`font-semibold ${isCurio ? 'text-indigo-950' : 'text-slate-800'}`}>Forma de Pagamento:</span>{' '}
              <span className="font-medium text-slate-900">
                {data.condicaoPagamento === 'Parcelado' && data.parcelas
                  ? `Parcelado em ${data.parcelas}x ${data.valorParcela ? `de ${formatCurrency(data.valorParcela)}` : ''}`
                  : data.condicaoPagamento || 'A combinar'}
              </span>
            </div>
            <div>
              <span className={`font-semibold ${isCurio ? 'text-indigo-950' : 'text-slate-800'}`}>Validade da Proposta:</span>{' '}
              <span className="font-medium text-slate-900">{data.validade || 'N/A'}</span>
            </div>
            <div>
              <span className={`font-semibold ${isCurio ? 'text-indigo-950' : 'text-slate-800'}`}>Prazo de Execução:</span>{' '}
              <span className="font-medium text-slate-900">{data.prazoExecucao || 'A combinar'}</span>
            </div>
            <div>
              <span className={`font-semibold ${isCurio ? 'text-indigo-950' : 'text-slate-800'}`}>Garantia Oferecida:</span>{' '}
              <span className="font-medium text-slate-900">{data.garantia || 'Sem garantia especificada'}</span>
            </div>
          </div>
          
          {data.observacao && (
            <div className={`text-xs text-slate-600 mt-5 p-4 ${isCurio ? 'bg-indigo-50/20 border-l-4 border-indigo-900' : 'bg-slate-50/80 border-l-4 border-slate-900'} rounded-lg whitespace-pre-wrap shadow-sm leading-relaxed`}>
              <span className={`font-bold ${isCurio ? 'text-indigo-950' : 'text-slate-900'} block mb-1.5 uppercase tracking-wide`}>Observações Gerais:</span>
              {data.observacao}
            </div>
          )}
        </div>
      </div>

      {/* Assinatura no Rodapé */}
      <div className="mt-16 text-center avoid-page-break">
        <div className={`w-[320px] mx-auto border-t ${isCurio ? 'border-indigo-900' : 'border-slate-900'} pt-2.5`}>
          <p className={`font-bold ${isCurio ? 'text-indigo-950' : 'text-slate-900'} text-sm`}>
            {company?.razaoSocial || company?.nomeFantasia || 'Empresa Emissora'}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">{getSignatureName()}</p>
        </div>
      </div>
    </div>
  );
});

QuotePdfTemplate.displayName = 'QuotePdfTemplate';
