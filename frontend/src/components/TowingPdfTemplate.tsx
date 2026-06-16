import { forwardRef } from 'react';
import { mcaLogoBase64 } from '../assets/mcaLogoBase64';
import { googleMapsService } from '../services/google-maps.service';

type TowingPdfTemplateProps = {
  quote: any;
  company: any;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
};

export const TowingPdfTemplate = forwardRef<HTMLDivElement, TowingPdfTemplateProps>(({ quote, company }, ref) => {
  if (!quote) return null;

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
    if (isCurio) {
      return 'Robson Cruz';
    }
    return company?.razaoSocial || 'Responsável';
  };

  const originAddress = `${quote.origemEndereco || ''}, ${quote.origemNumero || ''}, ${quote.origemCidade || ''} - ${quote.origemEstado || ''}`;
  const destinationAddress = `${quote.destinoEndereco || ''}, ${quote.destinoNumero || ''}, ${quote.destinoCidade || ''} - ${quote.destinoEstado || ''}`;
  const hasRoute = !!(quote.origemEndereco && quote.destinoEndereco);
  const mapUrl = hasRoute ? googleMapsService.getStaticMapUrl(originAddress, destinationAddress) : '';

  // ----------------------------------------------------
  // CURIO LAYOUT (PREMIUM, DISTINCT DECORATION)
  // ----------------------------------------------------
  if (isCurio) {
    return (
      <div
        ref={ref}
        className="bg-white text-slate-900 p-12 w-[718px] min-h-[1012px] flex flex-col justify-between shadow-lg"
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
                  Orçamento de Guincho
                </span>
                <h1 className="text-3xl font-black text-indigo-955 mt-2.5 tracking-tight uppercase" style={{ fontFamily: "'Playfair Display', serif" }}>
                  ORÇAMENTO
                </h1>
              </div>
              <div className="mt-4 space-y-1">
                {quote.numeroFormatado ? (
                  <p className="text-[14px] font-extrabold text-indigo-700 uppercase tracking-wider">
                    ORÇAMENTO Nº {quote.numeroFormatado}
                  </p>
                ) : (
                  <p className="text-[14px] font-extrabold text-indigo-700 uppercase tracking-wider">
                    ORÇAMENTO Nº ORC-GUI-{new Date(quote.createdAt || Date.now()).getFullYear()}-{quote.numeroSequencial?.toString().padStart(6, '0')}
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
                <h2 className="text-base font-extrabold text-indigo-955 leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
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

          {/* Dados do Prestador e Cliente (Curio Style) */}
          <div className="mb-6 flex flex-row gap-4 w-full avoid-page-break">
            <div className="bg-indigo-50/20 border border-indigo-100 border-l-4 border-l-indigo-800 p-4 rounded-r-lg shadow-xs" style={{ flex: 1, width: '48%' }}>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-900 border-b border-indigo-100 pb-1.5 mb-2.5">
                Prestador de Serviço
              </h3>
              <div className="space-y-1 text-slate-700 text-[11px]">
                <p><span className="font-bold text-indigo-950">Empresa:</span> {company?.razaoSocial || company?.nomeFantasia || '-'}</p>
                {company?.cnpj && <p><span className="font-bold text-indigo-950">CNPJ:</span> {company.cnpj}</p>}
                {company?.endereco && <p className="truncate" title={company.endereco}><span className="font-bold text-indigo-950">Endereço:</span> {company.endereco}</p>}
                {company?.telefone && <p><span className="font-bold text-indigo-950">Contato:</span> {company.telefone}</p>}
              </div>
            </div>
            <div className="bg-indigo-50/20 border border-indigo-100 border-l-4 border-l-indigo-800 p-4 rounded-r-lg shadow-xs" style={{ flex: 1, width: '48%' }}>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-900 border-b border-indigo-100 pb-1.5 mb-2.5">
                Cliente
              </h3>
              <div className="space-y-1 text-slate-700 text-[11px]">
                <p><span className="font-bold text-indigo-950">Nome/Empresa:</span> {quote.clienteNome || quote.clienteEmpresa || '-'}</p>
                {quote.clienteDoc && <p><span className="font-bold text-indigo-950">Documento:</span> {quote.clienteDoc}</p>}
                {quote.clienteTelefone && <p><span className="font-bold text-indigo-950">Telefone:</span> {quote.clienteTelefone}</p>}
                {quote.clienteEmail && <p><span className="font-bold text-indigo-950">E-mail:</span> {quote.clienteEmail}</p>}
              </div>
            </div>
          </div>

          {/* Detalhes Operacionais & Mapa (Curio Style) */}
          <div className="mb-6 border border-amber-100 border-l-4 border-l-amber-600 bg-amber-50/10 p-4 rounded-r-lg shadow-xs text-xs avoid-page-break">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-900 border-b border-amber-100 pb-1.5 mb-2.5">
              Detalhes da Rota e Veículo
            </h3>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', width: '100%' }}>
              <div style={{ flex: 1, width: '48%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <p className="font-bold text-amber-900/70 uppercase text-[8px] tracking-wider mb-0.5">Origem:</p>
                  <p className="font-bold text-slate-800 text-[11px]">{quote.origemEndereco || '-'}, {quote.origemNumero || 'S/N'}</p>
                  <p className="text-slate-600 text-[11px]">{quote.origemCidade || '-'} - {quote.origemEstado || '-'} | CEP: {quote.origemCep || '-'}</p>
                </div>
                <div>
                  <p className="font-bold text-amber-900/70 uppercase text-[8px] tracking-wider mb-0.5">Métricas Estimadas:</p>
                  <p className="text-slate-600 text-[11px]">Distância Total: <span className="font-bold text-slate-800">{quote.distanciaKm || 0} km</span></p>
                  <p className="text-slate-600 text-[11px]">Tempo Viagem: <span className="font-bold text-slate-800">{quote.tempoEstimadoMin || 0} minutos</span></p>
                </div>
              </div>
              <div style={{ flex: 1, width: '48%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <p className="font-bold text-amber-900/70 uppercase text-[8px] tracking-wider mb-0.5">Destino:</p>
                  <p className="font-bold text-slate-800 text-[11px]">{quote.destinoEndereco || '-'}, {quote.destinoNumero || 'S/N'}</p>
                  <p className="text-slate-600 text-[11px]">{quote.destinoCidade || '-'} - {quote.destinoEstado || '-'} | CEP: {quote.destinoCep || '-'}</p>
                </div>
                <div>
                  <p className="font-bold text-amber-900/70 uppercase text-[8px] tracking-wider mb-0.5">Veículo e Equipamento:</p>
                  <p className="text-slate-600 text-[11px]">Veículo Transportado: <span className="font-bold text-slate-800">{quote.veiculoModelo || '-'} ({quote.veiculoPlaca || '-'})</span></p>
                  <p className="text-slate-600 text-[11px]">Tipo do Guincho: <span className="font-bold text-slate-800">{quote.tipoGuincho || '-'}</span></p>
                </div>
              </div>
            </div>
            
            {mapUrl && (
              <div className="mt-4 border border-amber-100 rounded-lg overflow-hidden shadow-xs">
                <img src={mapUrl} alt="Mapa da Rota" className="w-full h-auto object-cover" style={{ maxHeight: '200px' }} />
              </div>
            )}
          </div>

          {/* Tabela Financeira (Curio Style) */}
          <div className="mb-6 avoid-page-break">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-900 bg-indigo-900/5 px-3 py-1.5 rounded-md mb-2">
              Composição Financeira
            </h3>
            
            <div className="flex bg-indigo-900 text-white text-[9px] font-bold uppercase tracking-widest rounded-t-md">
              <div className="py-2 px-3 text-left" style={{ flex: 1 }}>Descrição do Custo</div>
              <div className="py-2 px-3 text-right" style={{ width: '120px' }}>Valor</div>
            </div>

            <div className="border-x border-b border-indigo-100 rounded-b-md overflow-hidden shadow-xs text-[11px]">
              <div className="flex border-b border-indigo-50 py-2 px-3 odd:bg-indigo-50/15 even:bg-white justify-between">
                <span className="text-slate-700 font-medium">Taxa de Saída Fixa</span>
                <span className="text-slate-900 font-bold text-right" style={{ width: '120px' }}>{formatCurrency(quote.taxaSaida)}</span>
              </div>
              
              <div className="flex border-b border-indigo-50 py-2 px-3 odd:bg-indigo-50/15 even:bg-white justify-between">
                <span className="text-slate-700 font-medium">Custo por Deslocamento ({quote.distanciaKm || 0} km x {formatCurrency(quote.valorKm)})</span>
                <span className="text-slate-900 font-bold text-right" style={{ width: '120px' }}>{formatCurrency((quote.distanciaKm || 0) * (quote.valorKm || 0))}</span>
              </div>

              {Number(quote.horasParadas) > 0 && (
                <div className="flex border-b border-indigo-50 py-2 px-3 odd:bg-indigo-50/15 even:bg-white justify-between">
                  <span className="text-slate-700 font-medium">Horas Paradas / Descarga ({quote.horasParadas}h x {formatCurrency(quote.valorHoraParada)})</span>
                  <span className="text-slate-900 font-bold text-right" style={{ width: '120px' }}>{formatCurrency((quote.horasParadas || 0) * (quote.valorHoraParada || 0))}</span>
                </div>
              )}

              {Number(quote.pedagios) > 0 && (
                <div className="flex border-b border-indigo-50 py-2 px-3 odd:bg-indigo-50/15 even:bg-white justify-between">
                  <span className="text-slate-700 font-medium">Despesas com Pedágio</span>
                  <span className="text-slate-900 font-bold text-right" style={{ width: '120px' }}>{formatCurrency(quote.pedagios)}</span>
                </div>
              )}

              {Number(quote.despesasExtras) > 0 && (
                <div className="flex border-b border-indigo-50 py-2 px-3 odd:bg-indigo-50/15 even:bg-white justify-between">
                  <span className="text-slate-700 font-medium">Despesas Extras / Adicionais</span>
                  <span className="text-slate-900 font-bold text-right" style={{ width: '120px' }}>{formatCurrency(quote.despesasExtras)}</span>
                </div>
              )}

              {Number(quote.impostos) > 0 && (
                <div className="flex border-b border-indigo-50 py-2 px-3 odd:bg-indigo-50/15 even:bg-white justify-between">
                  <span className="text-slate-700 font-medium">Impostos</span>
                  <span className="text-slate-900 font-bold text-right" style={{ width: '120px' }}>{formatCurrency(quote.impostos)}</span>
                </div>
              )}

              {Number(quote.acrescimos) > 0 && (
                <div className="flex border-b border-indigo-50 py-2 px-3 odd:bg-indigo-50/15 even:bg-white justify-between">
                  <span className="text-slate-700 font-medium">Acréscimos</span>
                  <span className="text-slate-900 font-bold text-right" style={{ width: '120px' }}>{formatCurrency(quote.acrescimos)}</span>
                </div>
              )}

              {Number(quote.descontos) > 0 && (
                <div className="flex border-b border-indigo-50 py-2 px-3 odd:bg-indigo-50/15 even:bg-white justify-between">
                  <span className="text-slate-750 font-medium">Descontos Aplicados</span>
                  <span className="text-slate-900 font-bold text-right" style={{ width: '120px' }}>-{formatCurrency(quote.descontos)}</span>
                </div>
              )}
            </div>

            <div className="flex bg-indigo-950 text-white font-black text-xs py-2.5 px-4 rounded-b-md justify-between items-center shadow-xs">
              <span className="uppercase tracking-wider">Valor Total Estimado</span>
              <span className="text-right text-[13px] underline decoration-double decoration-indigo-200 underline-offset-2" style={{ width: '120px' }}>{formatCurrency(quote.valorTotal)}</span>
            </div>
          </div>

          {/* Validação Legal ANTT (Curio Style) */}
          <div className="mb-6 border border-indigo-100 border-l-4 border-l-indigo-800 bg-indigo-50/10 rounded-r-lg p-4 text-xs avoid-page-break shadow-xs">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-900 border-b border-indigo-100 pb-1.5 mb-2.5">
              Validação Legal ANTT (Frete Mínimo)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', width: '100%' }}>
              <div style={{ flex: 1, width: '48%' }}>
                <ul className="space-y-1.5 text-slate-700 text-[11px]">
                  <li><span className="font-bold text-indigo-955">Tipo de Carga:</span> {quote.anttTipoCarga || '-'}</li>
                  <li><span className="font-bold text-indigo-955">Número de Eixos:</span> {quote.anttEixos || '-'}</li>
                  <li><span className="font-bold text-indigo-955">Operações:</span> {[quote.anttRetornoVazio && 'Retorno Vazio', quote.anttComposicao && 'Composição Veicular', quote.anttAltoDesempenho && 'Alto Desempenho'].filter(Boolean).join(', ') || 'Padrão'}</li>
                </ul>
              </div>
              <div style={{ flex: 1, width: '48%' }}>
                <div className="bg-white p-3 border border-indigo-100 rounded-lg shadow-xs text-[11px]">
                  <div className="flex justify-between mb-1 text-slate-500 font-medium">
                    <span>Piso Mínimo Legal:</span>
                    <span className="font-bold text-slate-800">{formatCurrency(quote.anttPisoMinimo)}</span>
                  </div>
                  <div className="flex justify-between mb-1 text-slate-500 font-medium">
                    <span>Orçamento do Frete:</span>
                    <span className="font-bold text-slate-800">{formatCurrency(quote.valorTotal)}</span>
                  </div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-indigo-50 font-black">
                    <span className="text-indigo-955">Resultado:</span>
                    <span className={quote.valorTotal >= quote.anttPisoMinimo ? 'text-green-700' : 'text-red-700'}>
                      {quote.valorTotal >= quote.anttPisoMinimo ? 'Compatível com o Piso' : 'Abaixo do Piso Referencial'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[9px] text-slate-400 mt-2.5 text-center italic">
              * Valor de referência calculated com base nos parâmetros informados pelo usuário.
            </p>
          </div>

          {/* Observações (Curio Style) */}
          {quote.observacoes && (
            <div className="mb-6 text-xs avoid-page-break">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-900 bg-indigo-900/5 px-2.5 py-1.5 rounded-md mb-2">
                Observações Gerais
              </h3>
              <p className="whitespace-pre-wrap text-slate-700 bg-indigo-50/10 p-3.5 border border-indigo-100/50 rounded-lg text-[11px] leading-relaxed">{quote.observacoes}</p>
            </div>
          )}
        </div>

        {/* Assinaturas (Curio Style) */}
        <div className="mt-8 pt-4 avoid-page-break" style={{ display: 'flex', flexDirection: 'row', gap: '32px', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ flex: 1, width: '45%', textAlign: 'center' }}>
            <div className="border-t border-indigo-900 pt-2 mx-4">
              <p className="font-extrabold uppercase text-[9px] text-indigo-955">{getSignatureName()}</p>
              <p className="text-slate-500 text-[8px] font-semibold">Prestador de Serviço</p>
            </div>
          </div>
          <div style={{ flex: 1, width: '45%', textAlign: 'center' }}>
            <div className="border-t border-indigo-900 pt-2 mx-4">
              <p className="font-extrabold uppercase text-[9px] text-indigo-955">
                {quote.clienteNome || quote.clienteEmpresa || 'Assinatura do Cliente'}
              </p>
              <p className="text-slate-500 text-[8px] font-semibold">Cliente Autorizado</p>
            </div>
          </div>
        </div>

        {/* Rodapé Institucional (Curio Style) */}
        <div className="mt-8 border-t border-indigo-100 pt-3 flex justify-between items-center text-[8px] text-slate-400 font-semibold uppercase tracking-wider">
          <span>{company?.nomeFantasia || company?.razaoSocial} — Central: {company?.telefone || '—'}</span>
          <span className="text-indigo-900 font-black">Curió Serviços Automotivos</span>
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
      className="bg-white text-slate-900 p-8 w-[718px] min-h-[1012px] flex flex-col justify-between" 
      style={{ fontFamily: "'Inter', 'Arial', sans-serif", margin: '0 auto', boxSizing: 'border-box' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        .avoid-page-break {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      `}</style>
      
      <div>
        {/* Cabeçalho */}
        <div className="flex flex-row justify-between items-start border-b-2 border-slate-900 pb-3 mb-4" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="w-28">
            {isMca && mcaLogoBase64 && <img src={mcaLogoBase64} alt="Logo" className="max-h-12 object-contain" />}
          </div>
          <div className="text-right">
            <h1 className="text-lg font-extrabold uppercase tracking-wide text-slate-900">Orçamento de Guincho</h1>
            <p className="text-xs font-bold text-slate-700 mt-0.5">
              Nº: {quote.numeroFormatado || (quote.numeroSequencial ? `ORC-GUI-${new Date(quote.createdAt || Date.now()).getFullYear()}-${quote.numeroSequencial.toString().padStart(6, '0')}` : '-')}
            </p>
            <p className="text-[9px] text-slate-500 mt-0.5">
              Data: {new Date(quote.createdAt || new Date()).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Dados do Prestador e Cliente */}
        <div className="mb-4 text-xs avoid-page-break" style={{ display: 'flex', flexDirection: 'row', gap: '16px', width: '100%' }}>
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-lg" style={{ flex: 1, width: '48%' }}>
            <h2 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1.5 uppercase text-[9px] tracking-wider">Prestador de Serviço</h2>
            <div className="space-y-0.5 text-slate-700 text-[11px]">
              <p><span className="font-semibold text-slate-900">Empresa:</span> {company?.razaoSocial || company?.nomeFantasia || '-'}</p>
              {company?.cnpj && <p><span className="font-semibold text-slate-900">CNPJ:</span> {company.cnpj}</p>}
              {company?.endereco && <p className="truncate" title={company.endereco}><span className="font-semibold text-slate-900">Endereço:</span> {company.endereco}</p>}
              {company?.telefone && <p><span className="font-semibold text-slate-900">Contato:</span> {company.telefone}</p>}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-lg" style={{ flex: 1, width: '48%' }}>
            <h2 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1.5 uppercase text-[9px] tracking-wider">Cliente</h2>
            <div className="space-y-0.5 text-slate-700 text-[11px]">
              <p><span className="font-semibold text-slate-900">Nome/Empresa:</span> {quote.clienteNome || quote.clienteEmpresa || '-'}</p>
              <p><span className="font-semibold text-slate-900">Documento:</span> {quote.clienteDoc || '-'}</p>
              <p><span className="font-semibold text-slate-900">Telefone:</span> {quote.clienteTelefone || '-'}</p>
              <p><span className="font-semibold text-slate-900">E-mail:</span> {quote.clienteEmail || '-'}</p>
            </div>
          </div>
        </div>

        {/* Detalhes Operacionais */}
        <div className="mb-4 border border-slate-200/80 rounded-lg p-3 text-xs avoid-page-break bg-slate-50/20">
          <h2 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2 uppercase text-[9px] tracking-wider">Detalhes da Rota e Veículo</h2>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', width: '100%' }}>
            <div style={{ flex: 1, width: '48%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>
                <p className="font-semibold text-slate-500 uppercase text-[8px] tracking-wider mb-0.5">Origem:</p>
                <p className="font-medium text-slate-800 text-[11px]">{quote.origemEndereco || '-'}, {quote.origemNumero || 'S/N'}</p>
                <p className="text-slate-650 text-[11px]">{quote.origemCidade || '-'} - {quote.origemEstado || '-'} | CEP: {quote.origemCep || '-'}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-500 uppercase text-[8px] tracking-wider mb-0.5">Métricas Estimadas:</p>
                <p className="text-slate-650 text-[11px]">Distância Total: <span className="font-semibold text-slate-800">{quote.distanciaKm || 0} km</span></p>
                <p className="text-slate-650 text-[11px]">Tempo Viagem: <span className="font-semibold text-slate-800">{quote.tempoEstimadoMin || 0} minutos</span></p>
              </div>
            </div>
            <div style={{ flex: 1, width: '48%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>
                <p className="font-semibold text-slate-500 uppercase text-[8px] tracking-wider mb-0.5">Destino:</p>
                <p className="font-medium text-slate-800 text-[11px]">{quote.destinoEndereco || '-'}, {quote.destinoNumero || 'S/N'}</p>
                <p className="text-slate-650 text-[11px]">{quote.destinoCidade || '-'} - {quote.destinoEstado || '-'} | CEP: {quote.destinoCep || '-'}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-500 uppercase text-[8px] tracking-wider mb-0.5">Veículo e Equipamento:</p>
                <p className="text-slate-650 text-[11px]">Veículo Transportado: <span className="font-semibold text-slate-800">{quote.veiculoModelo || '-'} ({quote.veiculoPlaca || '-'})</span></p>
                <p className="text-slate-650 text-[11px]">Tipo do Guincho: <span className="font-semibold text-slate-800">{quote.tipoGuincho || '-'}</span></p>
              </div>
            </div>
          </div>
          {mapUrl && (
            <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden shadow-xs">
              <img src={mapUrl} alt="Mapa da Rota" className="w-full h-auto object-cover" style={{ maxHeight: '180px' }} />
            </div>
          )}
        </div>

        {/* Tabela Financeira */}
        <div className="mb-4 avoid-page-break">
          <h2 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-2 uppercase text-[9px] tracking-wider">Composição Financeira</h2>
          
          {/* Cabeçalho da Tabela */}
          <div className="flex bg-slate-100 border-y border-slate-300 text-[10px] font-semibold text-slate-800" style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
            <div className="py-1.5 px-3 text-left" style={{ flex: 1 }}>Descrição do Custo</div>
            <div className="py-1.5 px-3 text-right" style={{ width: '120px' }}>Valor</div>
          </div>

          {/* Corpo da Tabela */}
          <div className="border-b border-slate-200 text-[11px]" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <div className="flex border-b border-slate-100 py-1.5 px-3" style={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
              <span className="text-slate-700">Taxa de Saída Fixa</span>
              <span className="text-slate-900 font-medium text-right" style={{ width: '120px' }}>{formatCurrency(quote.taxaSaida)}</span>
            </div>
            
            <div className="flex border-b border-slate-100 py-1.5 px-3" style={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
              <span className="text-slate-700">Custo por Deslocamento ({quote.distanciaKm || 0} km x {formatCurrency(quote.valorKm)})</span>
              <span className="text-slate-900 font-medium text-right" style={{ width: '120px' }}>{formatCurrency((quote.distanciaKm || 0) * (quote.valorKm || 0))}</span>
            </div>

            {Number(quote.horasParadas) > 0 && (
              <div className="flex border-b border-slate-100 py-1.5 px-3" style={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
                <span className="text-slate-700">Horas Paradas / Descarga ({quote.horasParadas}h x {formatCurrency(quote.valorHoraParada)})</span>
                <span className="text-slate-900 font-medium text-right" style={{ width: '120px' }}>{formatCurrency((quote.horasParadas || 0) * (quote.valorHoraParada || 0))}</span>
              </div>
            )}

            {Number(quote.pedagios) > 0 && (
              <div className="flex border-b border-slate-100 py-1.5 px-3" style={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
                <span className="text-slate-700">Despesas com Pedágio</span>
                <span className="text-slate-900 font-medium text-right" style={{ width: '120px' }}>{formatCurrency(quote.pedagios)}</span>
              </div>
            )}

            {Number(quote.despesasExtras) > 0 && (
              <div className="flex border-b border-slate-100 py-1.5 px-3" style={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
                <span className="text-slate-700">Despesas Extras / Adicionais</span>
                <span className="text-slate-900 font-medium text-right" style={{ width: '120px' }}>{formatCurrency(quote.despesasExtras)}</span>
              </div>
            )}

            {Number(quote.impostos) > 0 && (
              <div className="flex border-b border-slate-100 py-1.5 px-3" style={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
                <span className="text-slate-700">Impostos</span>
                <span className="text-slate-900 font-medium text-right" style={{ width: '120px' }}>{formatCurrency(quote.impostos)}</span>
              </div>
            )}

            {Number(quote.acrescimos) > 0 && (
              <div className="flex border-b border-slate-100 py-1.5 px-3" style={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
                <span className="text-slate-600">Acréscimos</span>
                <span className="text-slate-700 text-right" style={{ width: '120px' }}>{formatCurrency(quote.acrescimos)}</span>
              </div>
            )}

            {Number(quote.descontos) > 0 && (
              <div className="flex border-b border-slate-100 py-1.5 px-3" style={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
                <span className="text-slate-600">Descontos Aplicados</span>
                <span className="text-slate-700 text-right" style={{ width: '120px' }}>-{formatCurrency(quote.descontos)}</span>
              </div>
            )}
          </div>

          {/* Rodapé / Total da Tabela */}
          <div className="flex bg-slate-800 text-white font-bold text-xs py-2 px-3" style={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="uppercase">Valor Total Estimado</span>
            <span className="text-right text-[12px]" style={{ width: '120px' }}>{formatCurrency(quote.valorTotal)}</span>
          </div>
        </div>

        {/* Validação Legal ANTT */}
        <div className="mb-4 border border-slate-200/80 rounded-lg p-3 text-xs bg-slate-50/50 avoid-page-break">
          <h2 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-2 uppercase text-[9px] tracking-wider">Validação Legal ANTT (Frete Mínimo)</h2>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', width: '100%' }}>
            <div style={{ flex: 1, width: '48%' }}>
              <ul className="space-y-1 text-slate-650 text-[11px]">
                <li><span className="font-semibold text-slate-700">Tipo de Carga:</span> {quote.anttTipoCarga || '-'}</li>
                <li><span className="font-semibold text-slate-700">Número de Eixos:</span> {quote.anttEixos || '-'}</li>
                <li><span className="font-semibold text-slate-700">Operações:</span> {[quote.anttRetornoVazio && 'Retorno Vazio', quote.anttComposicao && 'Composição Veicular', quote.anttAltoDesempenho && 'Alto Desempenho'].filter(Boolean).join(', ') || 'Padrão'}</li>
              </ul>
            </div>
            <div style={{ flex: 1, width: '48%' }}>
              <div className="bg-white p-2.5 border border-slate-200/60 rounded-lg shadow-sm text-[11px]">
                <div className="flex justify-between mb-0.5 text-slate-600">
                  <span>Piso Mínimo Legal:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(quote.anttPisoMinimo)}</span>
                </div>
                <div className="flex justify-between mb-0.5 text-slate-600">
                  <span>Orçamento do Frete:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(quote.valorTotal)}</span>
                </div>
                <div className="flex justify-between mt-1.5 pt-1.5 border-t border-slate-100 font-bold">
                  <span className="text-slate-700">Resultado:</span>
                  <span className={quote.valorTotal >= quote.anttPisoMinimo ? 'text-green-700' : 'text-red-700'}>
                    {quote.valorTotal >= quote.anttPisoMinimo ? 'Compatível com o Piso' : 'Abaixo do Piso Referencial'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[9px] text-slate-400 mt-2 text-center italic">
            * Valor de referência calculado com base nos parâmetros informados pelo usuário.
          </p>
        </div>

        {/* Observações */}
        {quote.observacoes && (
          <div className="mb-4 text-xs avoid-page-break">
            <h2 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1.5 uppercase text-[9px] tracking-wider">Observações Gerais</h2>
            <p className="whitespace-pre-wrap text-slate-650 bg-slate-50/30 p-2.5 border border-slate-200/40 rounded-lg text-[11px]">{quote.observacoes}</p>
          </div>
        )}
      </div>

      <div>
        {/* Assinaturas */}
        <div className="mt-4 pt-2 avoid-page-break" style={{ display: 'flex', flexDirection: 'row', gap: '32px', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ flex: 1, width: '45%', textAlign: 'center' }}>
            <div className="border-t border-slate-300 mx-4 pt-1.5">
              <p className="font-bold uppercase text-[9px] text-slate-800">{getSignatureName()}</p>
              <p className="text-slate-500 text-[8px]">Prestador de Serviço</p>
            </div>
          </div>
          <div style={{ flex: 1, width: '45%', textAlign: 'center' }}>
            <div className="border-t border-slate-300 mx-4 pt-1.5">
              <p className="font-bold uppercase text-[9px] text-slate-800">
                {quote.clienteNome || quote.clienteEmpresa || 'Assinatura do Cliente'}
              </p>
              <p className="text-slate-500 text-[8px]">Cliente Autorizado</p>
            </div>
          </div>
        </div>

        {/* Rodapé Institucional */}
        <div className="mt-6 border-t border-slate-200 pt-2 flex justify-between items-center text-[8px] text-slate-450 font-medium font-sans">
          <span>{company?.nomeFantasia || company?.razaoSocial} — Central de Atendimento: {company?.telefone || '—'}</span>
          <span className="text-slate-400">MCA Sistemas Integrados</span>
        </div>
      </div>
    </div>
  );
});

TowingPdfTemplate.displayName = 'TowingPdfTemplate';
