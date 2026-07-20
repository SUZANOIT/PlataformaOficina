import { forwardRef } from 'react';
import { mcaLogoBase64 } from '../assets/mcaLogoBase64';

type QuotePdfTemplateProps = {
  data: any; // Using any for simplicity here, but should match form data
  company: any; // Selected company object
  workshops?: any[];
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
};

export const QuotePdfTemplate = forwardRef<HTMLDivElement, QuotePdfTemplateProps>(({ data, company, workshops }, ref) => {
  if (!data) return null;

  const oficina = data.oficina || workshops?.find((w: any) => w.id === data.oficinaId);

  const subtotal = (data.items || []).reduce((acc: number, item: any) => acc + (Number(item.quantidade) * Number(item.valorUnitario)), 0);
  const total = subtotal;

  const pecas = (data.items || []).filter((item: any) => (item.tipo || 'Peça') === 'Peça');
  const maoDeObra = (data.items || []).filter((item: any) => item.tipo === 'Mão de Obra');

  const subtotalPecas = pecas.reduce((acc: number, item: any) => acc + (Number(item.quantidade) * Number(item.valorUnitario)), 0);
  const subtotalMaoDeObra = maoDeObra.reduce((acc: number, item: any) => acc + (Number(item.quantidade) * Number(item.valorUnitario)), 0);

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
    if (isCurio) {
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
    data.veiculoPlaca ||
    data.veiculoPrefixo ||
    data.veiculoAnoFabricacao ||
    data.veiculoAnoModelo ||
    data.veiculoChassi ||
    data.veiculoRenavam ||
    data.veiculoFrota ||
    data.veiculoSubfrota ||
    data.veiculoHodometro ||
    data.veiculoTipo
  );

  // ----------------------------------------------------
  // CURIO LAYOUT (PREMIUM, DISTINCT DECORATION)
  // ----------------------------------------------------
  if (isCurio) {
    return (
      <div
        ref={ref}
        className="bg-white text-slate-900 p-12 w-[718px] shadow-lg"
        style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
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
          {/* Cabeçalho Curio */}
          <div className="flex flex-row justify-between items-stretch border-b-2 border-indigo-900 pb-6 mb-8">
            <div className="flex flex-col justify-between">
              <div>
                <span className="bg-indigo-900 text-white text-[9px] font-extrabold tracking-widest px-3 py-1 rounded-full uppercase">
                  Orçamento de Serviços
                </span>
                <h1 className="text-3xl font-black text-indigo-950 mt-2.5 tracking-tight uppercase" style={{ fontFamily: "'Playfair Display', serif" }}>
                  ORÇAMENTO
                </h1>
              </div>
              <div className="mt-4 space-y-1">
                {data.numeroOrcamento && (
                  <p className="text-[14px] font-extrabold text-indigo-700 uppercase tracking-wider">
                    ORÇAMENTO Nº ORC-{new Date(data.createdAt || Date.now()).getFullYear()}-{data.numeroOrcamento.toString().padStart(6, '0')}
                  </p>
                )}
                {data.osExterna && (
                  <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">
                    OS Externa: {data.osExterna}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex gap-4 items-center">
              {/* Elegant SVG Gear/C Logo for Curio */}
              <div className="w-16 h-16 flex items-center justify-center bg-indigo-50 rounded-xl border border-indigo-100 shadow-xs shrink-0">
                <svg className="w-10 h-10 text-indigo-900" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="4"/>
                  <circle cx="50" cy="50" r="37" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 3"/>
                  <path d="M64 36C60 30 53 28 45 29C34 31 26 41 28 53C30 65 40 73 52 71C61 70 68 63 70 54" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>
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

          {/* Seção de Dados (Cliente & Veículo) em Coluna com Estilo Premium */}
          {(hasClientData || hasVehicleData) && (
            <div className="mb-8 flex flex-col gap-4 w-full avoid-page-break">
              
              {/* Dados do Cliente */}
              {hasClientData && (
                <div className="bg-indigo-50/20 border border-indigo-100 border-l-4 border-l-indigo-800 p-4 rounded-r-lg shadow-xs">
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-900 border-b border-indigo-100 pb-1.5 mb-3">
                      Dados do Cliente
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 15px' }} className="text-[12px]">
                      {data.client?.nome && (
                        <div style={{ width: '100%' }}>
                          <span className="font-bold text-indigo-900/60 text-[9px] uppercase tracking-wider block">Cliente / Razão Social</span>
                          <p className="font-bold text-slate-900 mt-0.5">{data.client.nome}</p>
                        </div>
                      )}
                      {data.client?.empresa && (
                        <div style={{ width: '45%', minWidth: '120px' }}>
                          <span className="font-bold text-indigo-900/60 text-[9px] uppercase tracking-wider block">Nome Fantasia</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{data.client.empresa}</p>
                        </div>
                      )}
                      {data.client?.cnpj && (
                        <div style={{ width: '45%', minWidth: '120px' }}>
                          <span className="font-bold text-indigo-900/60 text-[9px] uppercase tracking-wider block">CNPJ / CPF</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{data.client.cnpj}</p>
                        </div>
                      )}
                      {data.client?.email && (
                        <div style={{ width: '45%', minWidth: '180px' }}>
                          <span className="font-bold text-indigo-900/60 text-[9px] uppercase tracking-wider block">E-mail</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{data.client.email}</p>
                        </div>
                      )}
                      {data.client?.telefone && (
                        <div style={{ width: '45%', minWidth: '120px' }}>
                          <span className="font-bold text-indigo-900/60 text-[9px] uppercase tracking-wider block">Telefone</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{data.client.telefone}</p>
                        </div>
                      )}
                      {(data.client?.logradouro || data.client?.cidade || data.client?.estado || data.client?.cep) && (
                        <div style={{ width: '100%' }}>
                          <span className="font-bold text-indigo-900/60 text-[9px] uppercase tracking-wider block">Endereço</span>
                          <p className="font-semibold text-slate-800 leading-normal mt-0.5">
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
                <div className="bg-amber-50/10 border border-amber-100 border-l-4 border-l-amber-600 p-4 rounded-r-lg shadow-xs">
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-900 border-b border-amber-100 pb-1.5 mb-3">
                      Dados do Veículo
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 15px' }} className="text-[12px]">
                      {data.veiculoMarca && (
                        <div style={{ width: '22%', minWidth: '110px' }}>
                          <span className="font-bold text-amber-900/70 text-[9px] uppercase tracking-wider block">Marca</span>
                          <p className="font-bold text-slate-800 mt-0.5">{data.veiculoMarca}</p>
                        </div>
                      )}
                      {data.veiculoModelo && (
                        <div style={{ width: '22%', minWidth: '110px' }}>
                          <span className="font-bold text-amber-900/70 text-[9px] uppercase tracking-wider block">Modelo</span>
                          <p className="font-bold text-slate-800 mt-0.5">{data.veiculoModelo}</p>
                        </div>
                      )}
                      {(data.veiculoAnoFabricacao || data.veiculoAno) && (
                        <div style={{ width: '22%', minWidth: '110px' }}>
                          <span className="font-bold text-amber-900/70 text-[9px] uppercase tracking-wider block">Ano Fabr.</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{data.veiculoAnoFabricacao || data.veiculoAno}</p>
                        </div>
                      )}
                      {data.veiculoAnoModelo && (
                        <div style={{ width: '22%', minWidth: '110px' }}>
                          <span className="font-bold text-amber-900/70 text-[9px] uppercase tracking-wider block">Ano Modelo</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{data.veiculoAnoModelo}</p>
                        </div>
                      )}
                      {data.veiculoPlaca && (
                        <div style={{ width: '22%', minWidth: '110px' }}>
                          <span className="font-bold text-amber-900/70 text-[9px] uppercase tracking-wider block">Placa</span>
                          <p className="font-bold text-indigo-900 mt-0.5">{data.veiculoPlaca}</p>
                        </div>
                      )}
                      {data.veiculoPrefixo && (
                        <div style={{ width: '22%', minWidth: '110px' }}>
                          <span className="font-bold text-amber-900/70 text-[9px] uppercase tracking-wider block">Prefixo</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{data.veiculoPrefixo}</p>
                        </div>
                      )}
                      {data.veiculoChassi && (
                        <div style={{ width: '22%', minWidth: '110px' }}>
                          <span className="font-bold text-amber-900/70 text-[9px] uppercase tracking-wider block">Chassi</span>
                          <p className="font-mono text-slate-800 mt-0.5 text-[11px]">{data.veiculoChassi}</p>
                        </div>
                      )}
                      {data.veiculoRenavam && (
                        <div style={{ width: '22%', minWidth: '110px' }}>
                          <span className="font-bold text-amber-900/70 text-[9px] uppercase tracking-wider block">Renavam</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{data.veiculoRenavam}</p>
                        </div>
                      )}
                      {data.veiculoFrota && (
                        <div style={{ width: '22%', minWidth: '110px' }}>
                          <span className="font-bold text-amber-900/70 text-[9px] uppercase tracking-wider block">Frota</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{data.veiculoFrota}</p>
                        </div>
                      )}
                      {data.veiculoSubfrota && (
                        <div style={{ width: '22%', minWidth: '110px' }}>
                          <span className="font-bold text-amber-900/70 text-[9px] uppercase tracking-wider block">Subfrota</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{data.veiculoSubfrota}</p>
                        </div>
                      )}
                      {data.veiculoHodometro && (
                        <div style={{ width: '22%', minWidth: '110px' }}>
                          <span className="font-bold text-amber-900/70 text-[9px] uppercase tracking-wider block">Hodômetro</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{data.veiculoHodometro}</p>
                        </div>
                      )}
                      {data.veiculoTipo && (
                        <div style={{ width: '22%', minWidth: '110px' }}>
                          <span className="font-bold text-amber-900/70 text-[9px] uppercase tracking-wider block">Tipo de Veículo</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{data.veiculoTipo}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Seção de Peças */}
          {pecas.length > 0 && (
            <div className="mb-6 avoid-page-break">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-900 bg-indigo-900/5 px-3 py-1.5 rounded-md mb-2">
                Peças
              </h3>
              
              <div className="flex bg-indigo-900 text-white text-[9px] font-bold uppercase tracking-widest rounded-t-md">
                <div className="py-2 px-3 text-left" style={{ width: '35%' }}>Descrição do Produto</div>
                <div className="py-2 px-3 text-left" style={{ width: '15%' }}>Código</div>
                <div className="py-2 px-3 text-left" style={{ width: '15%' }}>Tipo</div>
                <div className="py-2 px-3 text-center" style={{ width: '8%' }}>Qtd</div>
                <div className="py-2 px-3 text-right" style={{ width: '13%' }}>Valor Unit.</div>
                <div className="py-2 px-3 text-right" style={{ width: '14%' }}>Total</div>
              </div>

              <div className="border-x border-b border-indigo-100 rounded-b-md overflow-hidden shadow-xs">
                {pecas.map((item: any, index: number) => {
                   const q = Number(item.quantidade) || 0;
                   const vu = Number(item.valorUnitario) || 0;
                   return (
                     <div 
                       key={index} 
                       className="flex border-b border-indigo-50 text-[11px] last:border-b-0 odd:bg-indigo-50/15 even:bg-white avoid-page-break" 
                     >
                       <div className="py-2 px-3 text-left break-words whitespace-pre-wrap font-bold text-slate-800" style={{ width: '35%' }}>
                         {item.descricao}
                       </div>
                       <div className="py-2 px-3 text-left break-words whitespace-pre-wrap text-slate-600 font-medium" style={{ width: '15%' }}>
                         {item.codigoPeca || '-'}
                       </div>
                       <div className="py-2 px-3 text-left break-words whitespace-pre-wrap text-slate-600 font-medium" style={{ width: '15%' }}>
                         {item.tipoPeca || '-'}
                       </div>
                       <div className="py-2 px-3 text-center text-slate-600 font-medium" style={{ width: '8%' }}>
                         {q}
                       </div>
                       <div className="py-2 px-3 text-right text-slate-600 font-medium" style={{ width: '13%' }}>
                         {formatCurrency(vu)}
                       </div>
                       <div className="py-2 px-3 text-right text-indigo-950 font-bold" style={{ width: '14%' }}>
                         {formatCurrency(q * vu)}
                       </div>
                     </div>
                   );
                })}
              </div>
              <div className="flex justify-end mt-1 text-[11px] font-bold text-slate-500 mr-2">
                Subtotal Peças: <span className="ml-1.5 text-indigo-950">{formatCurrency(subtotalPecas)}</span>
              </div>
            </div>
          )}

          {/* Seção de Mão de Obra / Serviços */}
          {maoDeObra.length > 0 && (
            <div className="mb-6 avoid-page-break">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-900 bg-indigo-900/5 px-3 py-1.5 rounded-md mb-2">
                Mão de Obra / Serviços
              </h3>
              
              <div className="flex bg-indigo-900 text-white text-[9px] font-bold uppercase tracking-widest rounded-t-md">
                <div className="py-2 px-3 text-left" style={{ width: '50%' }}>Descrição do Serviço</div>
                <div className="py-2 px-3 text-center" style={{ width: '10%' }}>Qtd</div>
                <div className="py-2 px-3 text-right" style={{ width: '20%' }}>Valor Unit.</div>
                <div className="py-2 px-3 text-right" style={{ width: '20%' }}>Total</div>
              </div>

              <div className="border-x border-b border-indigo-100 rounded-b-md overflow-hidden shadow-xs">
                {maoDeObra.map((item: any, index: number) => {
                   const q = Number(item.quantidade) || 0;
                   const vu = Number(item.valorUnitario) || 0;
                   return (
                     <div 
                       key={index} 
                       className="flex border-b border-indigo-50 text-[11px] last:border-b-0 odd:bg-indigo-50/15 even:bg-white avoid-page-break" 
                     >
                       <div className="py-2 px-3 text-left break-words whitespace-pre-wrap font-bold text-slate-800" style={{ width: '50%' }}>
                         {item.descricao}
                       </div>
                       <div className="py-2 px-3 text-center text-slate-600 font-medium" style={{ width: '10%' }}>
                         {q}
                       </div>
                       <div className="py-2 px-3 text-right text-slate-600 font-medium" style={{ width: '20%' }}>
                         {formatCurrency(vu)}
                       </div>
                       <div className="py-2 px-3 text-right text-indigo-950 font-bold" style={{ width: '20%' }}>
                         {formatCurrency(q * vu)}
                       </div>
                     </div>
                   );
                })}
              </div>
              <div className="flex justify-end mt-1 text-[11px] font-bold text-slate-500 mr-2">
                Subtotal Mão de Obra: <span className="ml-1.5 text-indigo-950">{formatCurrency(subtotalMaoDeObra)}</span>
              </div>
            </div>
          )}

          {/* Totais */}
          <div className="flex justify-end mb-8 avoid-page-break">
            <div className="w-[320px] bg-indigo-900/5 border border-indigo-150 p-4 rounded-lg shadow-xs">
              {subtotalPecas > 0 && (
                <div className="flex justify-between items-center mb-1.5 text-[12px] text-slate-500 font-medium">
                  <span>Subtotal Peças:</span>
                  <span className="font-bold text-indigo-950">{formatCurrency(subtotalPecas)}</span>
                </div>
              )}
              {subtotalMaoDeObra > 0 && (
                <div className="flex justify-between items-center mb-1.5 text-[12px] text-slate-500 font-medium">
                  <span>Subtotal Mão de Obra:</span>
                  <span className="font-bold text-indigo-950">{formatCurrency(subtotalMaoDeObra)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-[14px] font-black border-t border-indigo-100 pt-2 mt-2 text-indigo-950">
                <span>TOTAL GERAL:</span>
                <span className="underline decoration-double decoration-indigo-900 underline-offset-4 text-lg">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>

          {/* Condições e Observações */}
          <div className="mb-8 avoid-page-break">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-900 bg-indigo-900/5 px-2.5 py-1.5 rounded-md mb-3.5">
              Condições Comerciais
            </h3>
            <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-[12px] text-slate-600">
              <div>
                <span className="font-bold text-indigo-950">Forma de Pagamento:</span>{' '}
                <span className="font-semibold text-slate-900">
                  {data.condicaoPagamento === 'Parcelado' && data.parcelas
                    ? `Parcelado em ${data.parcelas}x ${data.valorParcela ? `de ${formatCurrency(data.valorParcela)}` : ''}`
                    : data.condicaoPagamento || 'A combinar'}
                </span>
              </div>
              <div>
                <span className="font-bold text-indigo-950">Validade da Proposta:</span>{' '}
                <span className="font-semibold text-slate-900">{data.validade || 'N/A'}</span>
              </div>
              <div>
                <span className="font-bold text-indigo-950">Prazo de Execução:</span>{' '}
                <span className="font-semibold text-slate-900">{data.prazoExecucao || 'A combinar'}</span>
              </div>
              <div>
                <span className="font-bold text-indigo-950">Garantia Oferecida:</span>{' '}
                <span className="font-semibold text-slate-900">{data.garantia || 'Sem garantia especificada'}</span>
              </div>
            </div>

            {oficina && (
              <div className="mt-6 avoid-page-break">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-900 bg-indigo-900/5 px-2.5 py-1.5 rounded-md mb-3.5">
                  Dados para Faturamento & Pagamento (Oficina Credenciada)
                </h3>
                <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-[12px] text-slate-600">
                  <div>
                    <span className="font-bold text-indigo-950">Oficina Responsável:</span>{' '}
                    <span className="font-semibold text-slate-900">{oficina.nome}</span>
                  </div>
                  {oficina.cnpj && (
                    <div>
                      <span className="font-bold text-indigo-950">CNPJ:</span>{' '}
                      <span className="font-semibold text-slate-900">{oficina.cnpj}</span>
                    </div>
                  )}
                  {oficina.banco && (
                    <div>
                      <span className="font-bold text-indigo-950">Banco / Ag / Conta:</span>{' '}
                      <span className="font-semibold text-slate-900">
                        {oficina.banco} • Ag: {oficina.agencia || '—'} • CC: {oficina.contaCorrente || '—'}{oficina.tipoConta ? ` (${oficina.tipoConta})` : ''}
                      </span>
                    </div>
                  )}
                  {oficina.chavePix && (
                    <div>
                      <span className="font-bold text-indigo-950">Chave PIX:</span>{' '}
                      <span className="font-semibold text-slate-900">{oficina.chavePix}</span>
                    </div>
                  )}
                  {oficina.favorecido && (
                    <div className="col-span-2">
                      <span className="font-bold text-indigo-950">Favorecido:</span>{' '}
                      <span className="font-semibold text-slate-900">
                        {oficina.favorecido} {oficina.cpfCnpjFavorecido ? ` (CPF/CNPJ: ${oficina.cpfCnpjFavorecido})` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            


            {data.observacao && (
              <div className="text-xs text-slate-600 mt-6 p-4 bg-indigo-50/20 border-l-4 border-indigo-900 rounded-r-lg shadow-xs whitespace-pre-wrap leading-relaxed">
                <span className="font-bold text-indigo-950 block mb-1.5 uppercase tracking-wide">Observações Gerais:</span>
                {data.observacao}
              </div>
            )}
          </div>
        </div>

        {/* Assinatura no Rodapé */}
        <div className="mt-16 text-center avoid-page-break">
          <div className="w-[320px] mx-auto border-t border-indigo-900 pt-3">
            <p className="font-extrabold text-indigo-950 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
              {company?.razaoSocial || company?.nomeFantasia || 'Curió Serviços Automotivos'}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-semibold">{getSignatureName()}</p>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // MCA / DEFAULT LAYOUT
  // ----------------------------------------------------
  return (
    <div
      ref={ref}
      className="bg-white text-slate-900 p-12 w-[718px]"
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
        <div className="flex flex-row justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
          <div className="text-left">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight uppercase">
              ORÇAMENTO
            </h1>
            {data.numeroOrcamento && (
              <p className="text-[18px] font-extrabold text-slate-700 mt-2 uppercase tracking-wide">
                ORÇAMENTO Nº ORC-{new Date(data.createdAt || Date.now()).getFullYear()}-{data.numeroOrcamento.toString().padStart(6, '0')}
              </p>
            )}
            {data.osExterna && (
              <p className="text-[12px] font-bold text-indigo-600 mt-2 uppercase">
                OS Externa: {data.osExterna}
              </p>
            )}
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

        {/* Seção de Dados (Cliente & Veículo) */}
        {(hasClientData || hasVehicleData) && (
          <div 
            className="mb-8 avoid-page-break"
            style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              gap: '20px', 
              width: '100%' 
            }}
          >
            {/* Dados do Cliente */}
            {hasClientData && (
              <div 
                className="bg-slate-50 border border-slate-200/80 p-4 rounded-lg"
                style={{ flex: 1, width: hasVehicleData ? '48%' : '100%' }}
              >
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80 pb-2 mb-3">
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
                      <div style={{ width: '100%', minWidth: '120px' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Nome Fantasia</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.client.empresa}</p>
                      </div>
                    )}
                    {data.client?.cnpj && (
                      <div style={{ width: '100%', minWidth: '120px' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">CNPJ / CPF</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.client.cnpj}</p>
                      </div>
                    )}
                    {data.client?.email && (
                      <div style={{ width: '100%', minWidth: '180px' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">E-mail</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.client.email}</p>
                      </div>
                    )}
                    {data.client?.telefone && (
                      <div style={{ width: '100%', minWidth: '120px' }}>
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
                className="bg-slate-50 border border-slate-200/80 p-4 rounded-lg"
                style={{ flex: 1, width: hasClientData ? '48%' : '100%' }}
              >
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80 pb-2 mb-3">
                    Dados do Veículo
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 15px' }} className="text-[12px]">
                    {data.veiculoMarca && (
                      <div style={{ width: '100%', minWidth: '110px' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Marca</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.veiculoMarca}</p>
                      </div>
                    )}
                    {data.veiculoModelo && (
                      <div style={{ width: '100%', minWidth: '110px' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Modelo</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.veiculoModelo}</p>
                      </div>
                    )}
                    {(data.veiculoAnoFabricacao || data.veiculoAno) && (
                      <div style={{ width: '100%', minWidth: '110px' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Ano Fabr.</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.veiculoAnoFabricacao || data.veiculoAno}</p>
                      </div>
                    )}
                    {data.veiculoAnoModelo && (
                      <div style={{ width: '100%', minWidth: '110px' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Ano Modelo</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.veiculoAnoModelo}</p>
                      </div>
                    )}
                    {data.veiculoPlaca && (
                      <div style={{ width: '100%', minWidth: '110px' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Placa</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.veiculoPlaca}</p>
                      </div>
                    )}
                    {data.veiculoPrefixo && (
                      <div style={{ width: '100%', minWidth: '110px' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Prefixo</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.veiculoPrefixo}</p>
                      </div>
                    )}
                    {data.veiculoChassi && (
                      <div style={{ width: '100%', minWidth: '110px' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Chassi</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.veiculoChassi}</p>
                      </div>
                    )}
                    {data.veiculoRenavam && (
                      <div style={{ width: '100%', minWidth: '110px' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Renavam</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.veiculoRenavam}</p>
                      </div>
                    )}
                    {data.veiculoFrota && (
                      <div style={{ width: '100%', minWidth: '110px' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Frota</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.veiculoFrota}</p>
                      </div>
                    )}
                    {data.veiculoSubfrota && (
                      <div style={{ width: '100%', minWidth: '110px' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Subfrota</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.veiculoSubfrota}</p>
                      </div>
                    )}
                    {data.veiculoHodometro && (
                      <div style={{ width: '100%', minWidth: '110px' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Hodômetro</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.veiculoHodometro}</p>
                      </div>
                    )}
                    {data.veiculoTipo && (
                      <div style={{ width: '100%', minWidth: '110px' }}>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Tipo de Veículo</span>
                        <p className="font-medium text-slate-900 mt-0.5">{data.veiculoTipo}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Seção de Peças */}
        {pecas.length > 0 && (
          <div className="mb-6 avoid-page-break">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 border-b border-slate-900 pb-1.5 mb-2">
              Peças
            </h3>
            
            <div className="flex bg-slate-900 text-white text-[9px] font-bold uppercase tracking-wider rounded-t-md">
              <div className="py-1.5 px-3 text-left" style={{ width: '35%' }}>Descrição do Produto</div>
              <div className="py-1.5 px-3 text-left" style={{ width: '15%' }}>Código</div>
              <div className="py-1.5 px-3 text-left" style={{ width: '15%' }}>Tipo</div>
              <div className="py-1.5 px-3 text-center" style={{ width: '8%' }}>Qtd</div>
              <div className="py-1.5 px-3 text-right" style={{ width: '13%' }}>Valor Unit.</div>
              <div className="py-1.5 px-3 text-right" style={{ width: '14%' }}>Total</div>
            </div>

            <div className="border-x border-b border-slate-200 rounded-b-md overflow-hidden shadow-sm">
              {pecas.map((item: any, index: number) => {
                 const q = Number(item.quantidade) || 0;
                 const vu = Number(item.valorUnitario) || 0;
                 return (
                   <div 
                     key={index} 
                     className="flex border-b border-slate-100 text-[11px] last:border-b-0 odd:bg-slate-50/50 even:bg-white avoid-page-break" 
                   >
                     <div className="py-1 px-3 text-left break-words whitespace-pre-wrap font-medium text-slate-800" style={{ width: '35%' }}>
                       {item.descricao}
                     </div>
                     <div className="py-1 px-3 text-left break-words whitespace-pre-wrap text-slate-600 font-medium" style={{ width: '15%' }}>
                       {item.codigoPeca || '-'}
                     </div>
                     <div className="py-1 px-3 text-left break-words whitespace-pre-wrap text-slate-600 font-medium" style={{ width: '15%' }}>
                       {item.tipoPeca || '-'}
                     </div>
                     <div className="py-1 px-3 text-center text-slate-600 font-medium" style={{ width: '8%' }}>
                       {q}
                     </div>
                     <div className="py-1 px-3 text-right text-slate-600 font-medium" style={{ width: '13%' }}>
                       {formatCurrency(vu)}
                     </div>
                     <div className="py-1 px-3 text-right text-slate-900 font-semibold" style={{ width: '14%' }}>
                       {formatCurrency(q * vu)}
                     </div>
                   </div>
                 );
              })}
            </div>
            <div className="flex justify-end mt-1 text-[11px] font-semibold text-slate-500 mr-2">
              Subtotal Peças: <span className="ml-1 text-slate-800">{formatCurrency(subtotalPecas)}</span>
            </div>
          </div>
        )}

        {/* Seção de Mão de Obra / Serviços */}
        {maoDeObra.length > 0 && (
          <div className="mb-6 avoid-page-break">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 border-b border-slate-900 pb-1.5 mb-2">
              Mão de Obra / Serviços
            </h3>
            
            <div className="flex bg-slate-900 text-white text-[9px] font-bold uppercase tracking-wider rounded-t-md">
              <div className="py-1.5 px-3 text-left" style={{ width: '50%' }}>Descrição do Serviço</div>
              <div className="py-1.5 px-3 text-center" style={{ width: '10%' }}>Qtd</div>
              <div className="py-1.5 px-3 text-right" style={{ width: '20%' }}>Valor Unit.</div>
              <div className="py-1.5 px-3 text-right" style={{ width: '20%' }}>Total</div>
            </div>

            <div className="border-x border-b border-slate-200 rounded-b-md overflow-hidden shadow-sm">
              {maoDeObra.map((item: any, index: number) => {
                 const q = Number(item.quantidade) || 0;
                 const vu = Number(item.valorUnitario) || 0;
                 return (
                   <div 
                     key={index} 
                     className="flex border-b border-slate-100 text-[11px] last:border-b-0 odd:bg-slate-50/50 even:bg-white avoid-page-break" 
                   >
                     <div className="py-1 px-3 text-left break-words whitespace-pre-wrap font-medium text-slate-800" style={{ width: '50%' }}>
                       {item.descricao}
                     </div>
                     <div className="py-1 px-3 text-center text-slate-600 font-medium" style={{ width: '10%' }}>
                       {q}
                     </div>
                     <div className="py-1 px-3 text-right text-slate-600 font-medium" style={{ width: '20%' }}>
                       {formatCurrency(vu)}
                     </div>
                     <div className="py-1 px-3 text-right text-slate-900 font-semibold" style={{ width: '20%' }}>
                       {formatCurrency(q * vu)}
                     </div>
                   </div>
                 );
              })}
            </div>
            <div className="flex justify-end mt-1 text-[11px] font-semibold text-slate-500 mr-2">
              Subtotal Mão de Obra: <span className="ml-1 text-slate-800">{formatCurrency(subtotalMaoDeObra)}</span>
            </div>
          </div>
        )}

        {/* Totais */}
        <div className="flex justify-end mb-8 avoid-page-break">
          <div className="w-[320px] bg-slate-50 border border-slate-200 p-4 rounded-lg">
            {subtotalPecas > 0 && (
              <div className="flex justify-between items-center mb-1 text-[12px] text-slate-500 font-medium">
                <span>Subtotal Peças:</span>
                <span className="font-semibold text-slate-880">{formatCurrency(subtotalPecas)}</span>
              </div>
            )}
            {subtotalMaoDeObra > 0 && (
              <div className="flex justify-between items-center mb-1 text-[12px] text-slate-500 font-medium">
                <span>Subtotal Mão de Obra:</span>
                <span className="font-semibold text-slate-880">{formatCurrency(subtotalMaoDeObra)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-[14px] font-black border-t text-slate-900 border-slate-200/80 pt-2 mt-2">
              <span>TOTAL GERAL:</span>
              <span className="underline decoration-double text-slate-900 decoration-slate-900 underline-offset-4">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>

        {/* Condições e Observações */}
        <div className="mb-8 avoid-page-break">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-850 border-b border-slate-200 pb-2 mb-3.5">
            Condições Comerciais
          </h3>
          <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-[12px] text-slate-600">
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

          {oficina && (
            <div className="mt-6 avoid-page-break">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-850 border-b border-slate-200 pb-2 mb-3.5">
                Dados para Faturamento & Pagamento (Oficina Credenciada)
              </h3>
              <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-[12px] text-slate-600">
                <div>
                  <span className="font-semibold text-slate-800">Oficina Responsável:</span>{' '}
                  <span className="font-medium text-slate-900">{oficina.nome}</span>
                </div>
                {oficina.cnpj && (
                  <div>
                    <span className="font-semibold text-slate-800">CNPJ:</span>{' '}
                    <span className="font-medium text-slate-900">{oficina.cnpj}</span>
                  </div>
                )}
                {oficina.banco && (
                  <div>
                    <span className="font-semibold text-slate-800">Banco / Ag / Conta:</span>{' '}
                    <span className="font-medium text-slate-900">
                      {oficina.banco} • Ag: {oficina.agencia || '—'} • CC: {oficina.contaCorrente || '—'}{oficina.tipoConta ? ` (${oficina.tipoConta})` : ''}
                    </span>
                  </div>
                )}
                {oficina.chavePix && (
                  <div>
                    <span className="font-semibold text-slate-800">Chave PIX:</span>{' '}
                    <span className="font-medium text-slate-900">{oficina.chavePix}</span>
                  </div>
                )}
                {oficina.favorecido && (
                  <div className="col-span-2">
                    <span className="font-semibold text-slate-800">Favorecido:</span>{' '}
                    <span className="font-medium text-slate-900">
                      {oficina.favorecido} {oficina.cpfCnpjFavorecido ? ` (CPF/CNPJ: ${oficina.cpfCnpjFavorecido})` : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          


          {data.observacao && (
            <div className="text-xs text-slate-600 mt-5 p-4 bg-slate-50/80 border-l-4 border-slate-900 rounded-lg whitespace-pre-wrap shadow-sm leading-relaxed">
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
