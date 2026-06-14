import { forwardRef } from 'react';
import { mcaLogoBase64 } from '../assets/mcaLogoBase64';

type TowingPdfTemplateProps = {
  quote: any;
  company: any;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
};


export const TowingPdfTemplate = forwardRef<HTMLDivElement, TowingPdfTemplateProps>(({ quote, company }, ref) => {
  if (!quote) return null;

  const getSignatureName = () => {
    return company?.razaoSocial || 'Responsável';
  };

  return (
    <div 
      ref={ref} 
      className="bg-white text-slate-900 p-10 w-[718px] min-h-[1012px] flex flex-col justify-between" 
      style={{ fontFamily: "'Inter', 'Arial', sans-serif", margin: '0 auto', boxSizing: 'border-box' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
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
        {/* Cabeçalho */}
        <div className="flex flex-row justify-between items-start border-b-2 border-slate-900 pb-4 mb-6" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="w-32">
            {mcaLogoBase64 && <img src={mcaLogoBase64} alt="Logo" className="max-h-16 object-contain" />}
          </div>
          <div className="text-right">
            <h1 className="text-xl font-extrabold uppercase tracking-wide text-slate-900">Orçamento de Guincho</h1>
            <p className="text-xs font-bold text-slate-700 mt-1">
              Nº: {quote.numeroFormatado || (quote.numeroSequencial ? `ORC-GUI-${new Date(quote.createdAt || Date.now()).getFullYear()}-${quote.numeroSequencial.toString().padStart(6, '0')}` : '-')}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Data: {new Date(quote.createdAt || new Date()).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Dados do Prestador e Cliente */}
        <div className="mb-6 text-xs avoid-page-break" style={{ display: 'flex', flexDirection: 'row', gap: '20px', width: '100%' }}>
          <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-lg" style={{ flex: 1, width: '48%' }}>
            <h2 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-2 uppercase text-[10px] tracking-wider">Prestador de Serviço</h2>
            <div className="space-y-1 text-slate-700">
              <p><span className="font-semibold text-slate-900">Empresa:</span> {company?.razaoSocial || company?.nomeFantasia || '-'}</p>
              {company?.cnpj && <p><span className="font-semibold text-slate-900">CNPJ:</span> {company.cnpj}</p>}
              {company?.endereco && <p><span className="font-semibold text-slate-900">Endereço:</span> {company.endereco}</p>}
              {company?.telefone && <p><span className="font-semibold text-slate-900">Contato:</span> {company.telefone}</p>}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-lg" style={{ flex: 1, width: '48%' }}>
            <h2 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-2 uppercase text-[10px] tracking-wider">Cliente</h2>
            <div className="space-y-1 text-slate-700">
              <p><span className="font-semibold text-slate-900">Nome/Empresa:</span> {quote.clienteNome || quote.clienteEmpresa || '-'}</p>
              <p><span className="font-semibold text-slate-900">Documento:</span> {quote.clienteDoc || '-'}</p>
              <p><span className="font-semibold text-slate-900">Telefone:</span> {quote.clienteTelefone || '-'}</p>
              <p><span className="font-semibold text-slate-900">E-mail:</span> {quote.clienteEmail || '-'}</p>
            </div>
          </div>
        </div>

        {/* Detalhes Operacionais */}
        <div className="mb-6 border border-slate-200/80 rounded-lg p-4 text-xs avoid-page-break bg-slate-50/20">
          <h2 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-3 uppercase text-[10px] tracking-wider">Detalhes da Rota e Veículo</h2>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', width: '100%' }}>
            <div style={{ flex: 1, width: '48%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <p className="font-semibold text-slate-500 uppercase text-[9px] tracking-wider mb-0.5">Origem:</p>
                <p className="font-medium text-slate-800">{quote.origemEndereco || '-'}, {quote.origemNumero || 'S/N'}</p>
                <p className="text-slate-650">{quote.origemCidade || '-'} - {quote.origemEstado || '-'} | CEP: {quote.origemCep || '-'}</p>
              </div>
              <div className="mt-1">
                <p className="font-semibold text-slate-500 uppercase text-[9px] tracking-wider mb-0.5">Métricas Estimadas:</p>
                <p className="text-slate-650">Distância Total: <span className="font-semibold text-slate-800">{quote.distanciaKm || 0} km</span></p>
                <p className="text-slate-650">Tempo Viagem: <span className="font-semibold text-slate-800">{quote.tempoEstimadoMin || 0} minutos</span></p>
              </div>
            </div>
            <div style={{ flex: 1, width: '48%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <p className="font-semibold text-slate-500 uppercase text-[9px] tracking-wider mb-0.5">Destino:</p>
                <p className="font-medium text-slate-800">{quote.destinoEndereco || '-'}, {quote.destinoNumero || 'S/N'}</p>
                <p className="text-slate-650">{quote.destinoCidade || '-'} - {quote.destinoEstado || '-'} | CEP: {quote.destinoCep || '-'}</p>
              </div>
              <div className="mt-1">
                <p className="font-semibold text-slate-500 uppercase text-[9px] tracking-wider mb-0.5">Veículo e Equipamento:</p>
                <p className="text-slate-650">Veículo Transportado: <span className="font-semibold text-slate-800">{quote.veiculoModelo || '-'} ({quote.veiculoPlaca || '-'})</span></p>
                <p className="text-slate-650">Tipo do Guincho: <span className="font-semibold text-slate-800">{quote.tipoGuincho || '-'}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela Financeira */}
        <div className="mb-6 avoid-page-break">
          <h2 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-2 uppercase text-[10px] tracking-wider">Composição Financeira</h2>
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-y border-slate-300">
                <th className="py-2 px-3 font-semibold text-slate-800">Descrição do Custo</th>
                <th className="py-2 px-3 font-semibold text-right text-slate-800" style={{ width: '120px' }}>Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2 px-3 text-slate-700">Taxa de Saída Fixa</td>
                <td className="py-2 px-3 text-right text-slate-900 font-medium">{formatCurrency(quote.taxaSaida)}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-700">Custo por Deslocamento ({quote.distanciaKm || 0} km x {formatCurrency(quote.valorKm)})</td>
                <td className="py-2 px-3 text-right text-slate-900 font-medium">{formatCurrency((quote.distanciaKm || 0) * (quote.valorKm || 0))}</td>
              </tr>
              {Number(quote.horasParadas) > 0 && (
                <tr>
                  <td className="py-2 px-3 text-slate-700">Horas Paradas / Descarga ({quote.horasParadas}h x {formatCurrency(quote.valorHoraParada)})</td>
                  <td className="py-2 px-3 text-right text-slate-900 font-medium">{formatCurrency((quote.horasParadas || 0) * (quote.valorHoraParada || 0))}</td>
                </tr>
              )}
              {Number(quote.pedagios) > 0 && (
                <tr>
                  <td className="py-2 px-3 text-slate-700">Despesas com Pedágio</td>
                  <td className="py-2 px-3 text-right text-slate-900 font-medium">{formatCurrency(quote.pedagios)}</td>
                </tr>
              )}
              {Number(quote.despesasExtras) > 0 && (
                <tr>
                  <td className="py-2 px-3 text-slate-700">Despesas Extras / Adicionais</td>
                  <td className="py-2 px-3 text-right text-slate-900 font-medium">{formatCurrency(quote.despesasExtras)}</td>
                </tr>
              )}
              {Number(quote.acrescimos) > 0 && (
                <tr>
                  <td className="py-2 px-3 text-slate-600">Acréscimos</td>
                  <td className="py-2 px-3 text-right text-slate-700">{formatCurrency(quote.acrescimos)}</td>
                </tr>
              )}
              {Number(quote.descontos) > 0 && (
                <tr>
                  <td className="py-2 px-3 text-slate-600">Descontos Aplicados</td>
                  <td className="py-2 px-3 text-right text-slate-700">-{formatCurrency(quote.descontos)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-800 text-white font-bold">
                <td className="py-2 px-3 uppercase text-right">Valor Total Estimado</td>
                <td className="py-2 px-3 text-right text-[13px]">{formatCurrency(quote.valorTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Validação Legal ANTT */}
        <div className="mb-6 border border-slate-200/80 rounded-lg p-4 text-xs bg-slate-50/50 avoid-page-break">
          <h2 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-3 uppercase text-[10px] tracking-wider">Validação Legal ANTT (Frete Mínimo)</h2>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', width: '100%' }}>
            <div style={{ flex: 1, width: '48%' }}>
              <ul className="space-y-1.5 text-slate-650">
                <li><span className="font-semibold text-slate-700">Tipo de Carga:</span> {quote.anttTipoCarga || '-'}</li>
                <li><span className="font-semibold text-slate-700">Número de Eixos:</span> {quote.anttEixos || '-'}</li>
                <li><span className="font-semibold text-slate-700">Operações:</span> {[quote.anttRetornoVazio && 'Retorno Vazio', quote.anttComposicao && 'Composição Veicular', quote.anttAltoDesempenho && 'Alto Desempenho'].filter(Boolean).join(', ') || 'Padrão'}</li>
              </ul>
            </div>
            <div style={{ flex: 1, width: '48%' }}>
              <div className="bg-white p-3 border border-slate-200/60 rounded-lg shadow-sm">
                <div className="flex justify-between mb-1 text-slate-600">
                  <span>Piso Mínimo Legal:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(quote.anttPisoMinimo)}</span>
                </div>
                <div className="flex justify-between mb-1 text-slate-600">
                  <span>Orçamento do Frete:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(quote.valorTotal)}</span>
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t border-slate-100 font-bold">
                  <span className="text-slate-700">Resultado:</span>
                  <span className={quote.valorTotal >= quote.anttPisoMinimo ? 'text-green-700' : 'text-red-700'}>
                    {quote.valorTotal >= quote.anttPisoMinimo ? 'Compatível com o Piso' : 'Abaixo do Piso Referencial'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2.5 text-center italic">
            * Valor de referência calculado com base nos parâmetros informados pelo usuário.
          </p>
        </div>

        {/* Observações */}
        {quote.observacoes && (
          <div className="mb-6 text-xs avoid-page-break">
            <h2 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2 uppercase text-[10px] tracking-wider">Observações Gerais</h2>
            <p className="whitespace-pre-wrap text-slate-650 bg-slate-50/30 p-3 border border-slate-200/40 rounded-lg">{quote.observacoes}</p>
          </div>
        )}
      </div>

      <div>
        {/* Assinaturas */}
        <div className="mt-8 pt-4 avoid-page-break" style={{ display: 'flex', flexDirection: 'row', gap: '32px', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ flex: 1, width: '45%', textAlign: 'center' }}>
            <div className="border-t border-slate-300 mx-4 pt-2">
              <p className="font-bold uppercase text-[10px] text-slate-800">{getSignatureName()}</p>
              <p className="text-slate-500 text-[9px]">Prestador de Serviço</p>
            </div>
          </div>
          <div style={{ flex: 1, width: '45%', textAlign: 'center' }}>
            <div className="border-t border-slate-300 mx-4 pt-2">
              <p className="font-bold uppercase text-[10px] text-slate-800">
                {quote.clienteNome || quote.clienteEmpresa || 'Assinatura do Cliente'}
              </p>
              <p className="text-slate-500 text-[9px]">Cliente Autorizado</p>
            </div>
          </div>
        </div>

        {/* Rodapé Institucional */}
        <div className="mt-8 border-t border-slate-200 pt-3 flex justify-between items-center text-[9px] text-slate-450 font-medium font-sans">
          <span>{company?.nomeFantasia || company?.razaoSocial} — Central de Atendimento: {company?.telefone || '—'}</span>
          <span className="text-slate-400">MCA Sistemas Integrados</span>
        </div>
      </div>
    </div>
  );
});

TowingPdfTemplate.displayName = 'TowingPdfTemplate';


