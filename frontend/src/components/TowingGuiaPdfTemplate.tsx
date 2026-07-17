import { forwardRef } from 'react';
import { mcaLogoBase64 } from '../assets/mcaLogoBase64';

type TowingGuiaPdfTemplateProps = {
  quote: any;
  guia: any;
  company: any;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
};

export const TowingGuiaPdfTemplate = forwardRef<HTMLDivElement, TowingGuiaPdfTemplateProps>(({ quote, guia, company }, ref) => {
  if (!quote || !guia) return null;

  const isMca = company?.cnpj?.replace(/\D/g, '') === '30021766000113' || 
                company?.razaoSocial?.toLowerCase().includes('mca') || 
                company?.nomeFantasia?.toLowerCase().includes('mca') ||
                company?.inscricaoEstadual?.replace(/\D/g, '') === '119214099114';

  const originAddress = `${quote.origemEndereco || ''}, ${quote.origemNumero || ''}, ${quote.origemCidade || ''} - ${quote.origemEstado || ''}`;
  const destinationAddress = `${quote.destinoEndereco || ''}, ${quote.destinoNumero || ''}, ${quote.destinoCidade || ''} - ${quote.destinoEstado || ''}`;
  
  // Format QR Code data containing guide info
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
    `Guia: ${guia.numeroFormatado || guia.numeroGuia}\nOrçamento: ${quote.numeroFormatado || quote.numeroSequencial}\nCliente: ${quote.clienteNome || ''}\nPlaca: ${quote.veiculoPlaca || ''}\nValor: R$ ${guia.valorTotal.toFixed(2)}`
  )}`;

  return (
    <div 
      ref={ref} 
      className="bg-white text-slate-900 p-6 w-[718px] min-h-[1012px] flex flex-col justify-between" 
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
        <div className="flex flex-row justify-between items-center border-b-2 border-slate-900 pb-3 mb-4" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="w-28">
            {isMca && mcaLogoBase64 && <img src={mcaLogoBase64} alt="Logo" className="max-h-12 object-contain" />}
          </div>
          <div className="text-right">
            <h1 className="text-lg font-black uppercase tracking-wide text-slate-900">Guia de Transporte / Atendimento</h1>
            <p className="text-xs font-bold text-slate-700 mt-0.5">
              Nº GUIA: <span className="text-primary font-black">{guia.numeroFormatado || `GT-${new Date(guia.createdAt).getFullYear()}-${guia.numeroGuia.toString().padStart(6, '0')}`}</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Orçamento Ref: {quote.numeroFormatado || quote.numeroSequencial || '-'}
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5">
              Emissão: {new Date(guia.createdAt).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Dados do Prestador e Cliente */}
        <div className="mb-4 text-xs avoid-page-break" style={{ display: 'flex', flexDirection: 'row', gap: '16px', width: '100%' }}>
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-lg" style={{ flex: 1, width: '48%' }}>
            <h2 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1.5 uppercase text-[9px] tracking-wider">Prestador</h2>
            <div className="space-y-0.5 text-slate-700 text-[11px]">
              <p><span className="font-semibold text-slate-900">Empresa:</span> {company?.razaoSocial || company?.nomeFantasia || 'MCA Gestão de Frotas'}</p>
              {company?.cnpj && <p><span className="font-semibold text-slate-900">CNPJ:</span> {company.cnpj}</p>}
              {company?.endereco && <p className="truncate" title={company.endereco}><span className="font-semibold text-slate-900">Endereço:</span> {company.endereco}</p>}
              {company?.telefone && <p><span className="font-semibold text-slate-900">Contato:</span> {company.telefone}</p>}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-lg" style={{ flex: 1, width: '48%' }}>
            <h2 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1.5 uppercase text-[9px] tracking-wider">Cliente</h2>
            <div className="space-y-0.5 text-slate-700 text-[11px]">
              <p><span className="font-semibold text-slate-900">Nome/Razão:</span> {quote.clienteNome || '-'}</p>
              <p><span className="font-semibold text-slate-900">Documento:</span> {quote.clienteDoc || '-'}</p>
              <p><span className="font-semibold text-slate-900">Telefone:</span> {quote.clienteTelefone || '-'}</p>
              <p><span className="font-semibold text-slate-900">E-mail:</span> {quote.clienteEmail || '-'}</p>
            </div>
          </div>
        </div>

        {/* Dados do Veículo Transportado */}
        <div className="mb-4 border border-slate-200/80 rounded-lg p-3 text-xs avoid-page-break bg-slate-50/20">
          <h2 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-2 uppercase text-[9px] tracking-wider">Veículo Transportado</h2>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', width: '100%' }}>
            <div style={{ flex: 1, width: '48%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p className="text-slate-700 text-[11px]">Placa: <span className="font-semibold text-slate-900">{quote.veiculoPlaca || '-'}</span></p>
              <p className="text-slate-700 text-[11px]">Marca/Modelo: <span className="font-semibold text-slate-900">{quote.veiculoMarca || ''} {quote.veiculoModelo || ''}</span></p>
              <p className="text-slate-700 text-[11px]">Ano/Cor: <span className="font-semibold text-slate-900">{quote.veiculoAno || '-'} / {quote.veiculoCor || '-'}</span></p>
            </div>
            <div style={{ flex: 1, width: '48%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p className="text-slate-700 text-[11px]">Chassi: <span className="font-semibold text-slate-900">{quote.veiculoChassi || 'Não informado'}</span></p>
              <p className="text-slate-700 text-[11px]">Valor Aprox. Veículo: <span className="font-semibold text-slate-900">{quote.veiculoValorAproximado ? formatCurrency(quote.veiculoValorAproximado) : 'Não informado'}</span></p>
            </div>
          </div>
        </div>

        {/* Detalhes da Operação de Transporte */}
        <div className="mb-4 border border-slate-200/80 rounded-lg p-3 text-xs avoid-page-break bg-slate-50/20">
          <h2 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-2 uppercase text-[9px] tracking-wider">Dados da Operação</h2>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', width: '100%' }}>
            <div style={{ flex: 1, width: '48%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p className="text-slate-700 text-[11px]">Qtd. Eixos: <span className="font-semibold text-slate-900">{quote.quantidadeEixos >= 7 ? '7 ou mais eixos' : `${quote.quantidadeEixos} eixos`}</span></p>
              <p className="text-slate-700 text-[11px]">Placa Guincho: <span className="font-semibold text-slate-900">{quote.vehicle?.placa || '-'}</span></p>
              <p className="text-slate-700 text-[11px]">Motorista: <span className="font-semibold text-slate-900">{quote.driver?.nome || 'Não vinculado'}</span></p>
              <p className="text-slate-700 text-[11px]">Distância Estimada: <span className="font-semibold text-slate-900">{quote.distanciaKm || 0} km</span></p>
            </div>
            <div style={{ flex: 1, width: '48%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>
                <p className="font-semibold text-slate-500 uppercase text-[8px] tracking-wider mb-0.5">Origem:</p>
                <p className="font-medium text-slate-800 text-[11px] leading-tight">{originAddress}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-500 uppercase text-[8px] tracking-wider mb-0.5">Destino:</p>
                <p className="font-medium text-slate-800 text-[11px] leading-tight">{destinationAddress}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Informações Financeiras e QR Code */}
        <div className="mb-4 avoid-page-break flex gap-4" style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <h2 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-2 uppercase text-[9px] tracking-wider">Composição de Valores</h2>
            
            <div className="border border-slate-200 rounded-lg overflow-hidden text-[11px]">
              <div className="flex border-b border-slate-100 py-1.5 px-3 justify-between bg-slate-50/50">
                <span className="text-slate-700">Serviço de Guincho (Deslocamento + Saída)</span>
                <span className="text-slate-900 font-semibold">{formatCurrency(Number(quote.taxaSaida || 0) + (Number(quote.distanciaKm || 0) * Number(quote.valorKm || 0)))}</span>
              </div>
              <div className="flex border-b border-slate-100 py-1.5 px-3 justify-between">
                <span className="text-slate-700">Despesas com Pedágio</span>
                <span className="text-slate-900 font-semibold">{formatCurrency(quote.pedagios)}</span>
              </div>
              {Number(quote.despesasExtras || 0) > 0 && (
                <div className="flex border-b border-slate-100 py-1.5 px-3 justify-between bg-slate-50/50">
                  <span className="text-slate-700">Despesas Adicionais / Extras</span>
                  <span className="text-slate-900 font-semibold">{formatCurrency(quote.despesasExtras)}</span>
                </div>
              )}
              {Number(quote.acrescimos || 0) > 0 && (
                <div className="flex border-b border-slate-100 py-1.5 px-3 justify-between">
                  <span className="text-slate-700">Acréscimos</span>
                  <span className="text-slate-900 font-semibold">{formatCurrency(quote.acrescimos)}</span>
                </div>
              )}
              {Number(quote.descontos || 0) > 0 && (
                <div className="flex border-b border-slate-100 py-1.5 px-3 justify-between text-rose-600 bg-rose-500/5">
                  <span>Descontos Aplicados</span>
                  <span className="font-semibold">-{formatCurrency(quote.descontos)}</span>
                </div>
              )}
              
              <div className="flex bg-slate-800 text-white font-bold text-xs py-2 px-3 justify-between items-center">
                <span className="uppercase">Valor Total da Guia</span>
                <span className="text-right text-[12px]">{formatCurrency(guia.valorTotal)}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col items-center justify-center shrink-0" style={{ width: '140px' }}>
            <img src={qrCodeUrl} alt="QR Code da Guia" className="w-24 h-24 object-contain" />
            <span className="text-[8px] font-bold text-slate-400 mt-1.5 text-center uppercase tracking-wider">Validação Digital</span>
          </div>
        </div>

        {/* Observações */}
        {quote.observacoes && (
          <div className="mb-4 text-xs avoid-page-break">
            <h2 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1.5 uppercase text-[9px] tracking-wider">Instruções / Observações</h2>
            <p className="whitespace-pre-wrap text-slate-600 bg-slate-50/30 p-2.5 border border-slate-200/40 rounded-lg text-[11px] leading-relaxed">{quote.observacoes}</p>
          </div>
        )}
      </div>

      <div>
        {/* Assinaturas */}
        <div className="mt-4 pt-4 avoid-page-break" style={{ display: 'flex', flexDirection: 'row', gap: '24px', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div className="border-t border-slate-350 pt-1.5">
              <p className="font-bold uppercase text-[8px] text-slate-800 leading-tight">
                {quote.clienteNome || 'Assinatura do Cliente'}
              </p>
              <p className="text-slate-400 text-[8px] uppercase tracking-wider font-semibold">Cliente</p>
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div className="border-t border-slate-350 pt-1.5">
              <p className="font-bold uppercase text-[8px] text-slate-800 leading-tight">
                {quote.driver?.nome || 'Assinatura do Motorista'}
              </p>
              <p className="text-slate-400 text-[8px] uppercase tracking-wider font-semibold">Motorista Guincho</p>
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div className="border-t border-slate-350 pt-1.5">
              <p className="font-bold uppercase text-[8px] text-slate-800 leading-tight">
                {company?.razaoSocial || company?.nomeFantasia || 'MCA Gestão de Frotas'}
              </p>
              <p className="text-slate-400 text-[8px] uppercase tracking-wider font-semibold">Responsável MCA</p>
            </div>
          </div>
        </div>

        {/* Rodapé Institucional */}
        <div className="mt-4 border-t border-slate-200 pt-1.5 flex justify-between items-center text-[8px] text-slate-400 font-medium font-sans">
          <span>{company?.nomeFantasia || company?.razaoSocial} — Central: {company?.telefone || '—'}</span>
          <span className="text-slate-400 uppercase tracking-widest font-black">MCA Sistemas Integrados</span>
        </div>
      </div>
    </div>
  );
});

TowingGuiaPdfTemplate.displayName = 'TowingGuiaPdfTemplate';
