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
    <div ref={ref} className="bg-white text-slate-900 p-12 w-[718px] min-h-[1012px] flex flex-col justify-between shadow-lg" style={{ fontFamily: "'Outfit', 'Inter', sans-serif", margin: '0 auto' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&display=swap');
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
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-6">
        <div className="w-48">
          {mcaLogoBase64 && <img src={mcaLogoBase64} alt="Logo" className="max-h-16 object-contain" />}
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-900">Orçamento de Guincho</h1>
          <p className="text-sm font-semibold mt-1">Nº: {quote.numeroFormatado || (quote.numeroOrcamento ? `ORC-GUI-${new Date(quote.createdAt || Date.now()).getFullYear()}-${quote.numeroOrcamento.toString().padStart(6, '0')}` : '-')}</p>
          <p className="text-xs text-slate-500 mt-1">
            Data: {new Date(quote.createdAt || new Date()).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Dados do Prestador */}
      <div className="mb-6 grid grid-cols-2 gap-4 text-xs">
        <div>
          <h2 className="font-bold text-slate-900 border-b pb-1 mb-2 uppercase">Prestador de Serviço</h2>
          <p><span className="font-semibold">Empresa:</span> {company?.razaoSocial}</p>
          <p><span className="font-semibold">CNPJ:</span> {company?.cnpj}</p>
          <p><span className="font-semibold">Endereço:</span> {company?.endereco}</p>
          <p><span className="font-semibold">Contato:</span> {company?.telefone}</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900 border-b pb-1 mb-2 uppercase">Cliente</h2>
          <p><span className="font-semibold">Nome/Empresa:</span> {quote.clienteNome || quote.clienteEmpresa || '-'}</p>
          <p><span className="font-semibold">Documento:</span> {quote.clienteDoc || '-'}</p>
          <p><span className="font-semibold">Telefone:</span> {quote.clienteTelefone || '-'}</p>
          <p><span className="font-semibold">E-mail:</span> {quote.clienteEmail || '-'}</p>
        </div>
      </div>

      {/* Detalhes Operacionais */}
      <div className="mb-6 border border-slate-200 rounded p-4 text-xs">
        <h2 className="font-bold text-slate-900 border-b pb-1 mb-3 uppercase">Detalhes da Rota e Veículo</h2>
        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
          <div>
            <p className="font-semibold text-slate-700">Origem:</p>
            <p>{quote.origemEndereco}, {quote.origemNumero}</p>
            <p>{quote.origemCidade} - {quote.origemEstado} | CEP: {quote.origemCep}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-700">Destino:</p>
            <p>{quote.destinoEndereco}, {quote.destinoNumero}</p>
            <p>{quote.destinoCidade} - {quote.destinoEstado} | CEP: {quote.destinoCep}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-700 mt-2">Métricas Estimadas:</p>
            <p>Distância Total: <span className="font-medium">{quote.distanciaKm} km</span></p>
            <p>Tempo Viagem: <span className="font-medium">{quote.tempoEstimadoMin} minutos</span></p>
          </div>
          <div>
            <p className="font-semibold text-slate-700 mt-2">Veículo e Equipamento:</p>
            <p>Veículo Transportado: {quote.veiculoModelo} ({quote.veiculoPlaca})</p>
            <p>Tipo do Guincho: <span className="font-medium">{quote.tipoGuincho}</span></p>
          </div>
        </div>
      </div>

      {/* Tabela Financeira */}
      <div className="mb-6">
        <h2 className="font-bold text-slate-900 border-b pb-1 mb-2 uppercase text-xs">Composição Financeira</h2>
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-y border-slate-300">
              <th className="py-2 px-3 font-semibold">Descrição do Custo</th>
              <th className="py-2 px-3 font-semibold text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-2 px-3">Taxa de Saída Fixa</td>
              <td className="py-2 px-3 text-right">{formatCurrency(quote.taxaSaida)}</td>
            </tr>
            <tr>
              <td className="py-2 px-3">Custo por Deslocamento ({quote.distanciaKm} km x {formatCurrency(quote.valorKm)})</td>
              <td className="py-2 px-3 text-right">{formatCurrency((quote.distanciaKm || 0) * (quote.valorKm || 0))}</td>
            </tr>
            {quote.horasParadas > 0 && (
              <tr>
                <td className="py-2 px-3">Horas Paradas / Descarga ({quote.horasParadas}h x {formatCurrency(quote.valorHoraParada)})</td>
                <td className="py-2 px-3 text-right">{formatCurrency((quote.horasParadas || 0) * (quote.valorHoraParada || 0))}</td>
              </tr>
            )}
            {quote.pedagios > 0 && (
              <tr>
                <td className="py-2 px-3">Despesas com Pedágio</td>
                <td className="py-2 px-3 text-right">{formatCurrency(quote.pedagios)}</td>
              </tr>
            )}
            {quote.despesasExtras > 0 && (
              <tr>
                <td className="py-2 px-3">Despesas Extras / Adicionais</td>
                <td className="py-2 px-3 text-right">{formatCurrency(quote.despesasExtras)}</td>
              </tr>
            )}
            {quote.acrescimos > 0 && (
              <tr>
                <td className="py-2 px-3 text-slate-600">Acréscimos</td>
                <td className="py-2 px-3 text-right text-slate-600">{formatCurrency(quote.acrescimos)}</td>
              </tr>
            )}
            {quote.descontos > 0 && (
              <tr>
                <td className="py-2 px-3 text-slate-600">Descontos Aplicados</td>
                <td className="py-2 px-3 text-right text-slate-600">-{formatCurrency(quote.descontos)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-800 text-white font-bold">
              <td className="py-3 px-3 uppercase text-right">Valor Total Estimado</td>
              <td className="py-3 px-3 text-right text-base">{formatCurrency(quote.valorTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Validação Legal ANTT */}
      <div className="mb-6 border border-slate-300 rounded p-4 text-xs bg-slate-50">
        <h2 className="font-bold text-slate-900 border-b pb-1 mb-3 uppercase">Validação Legal ANTT (Frete Mínimo)</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <ul className="space-y-1">
              <li><span className="font-semibold">Tipo de Carga:</span> {quote.anttTipoCarga || '-'}</li>
              <li><span className="font-semibold">Número de Eixos:</span> {quote.anttEixos || '-'}</li>
              <li><span className="font-semibold">Operações:</span> {[quote.anttRetornoVazio && 'Retorno Vazio', quote.anttComposicao && 'Composição Veicular', quote.anttAltoDesempenho && 'Alto Desempenho'].filter(Boolean).join(', ') || 'Padrão'}</li>
            </ul>
          </div>
          <div>
            <div className="bg-white p-3 border rounded shadow-sm">
              <div className="flex justify-between mb-1">
                <span>Piso Mínimo Legal:</span>
                <span className="font-semibold">{formatCurrency(quote.anttPisoMinimo)}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Orçamento do Frete:</span>
                <span className="font-semibold">{formatCurrency(quote.valorTotal)}</span>
              </div>
              <div className="flex justify-between mt-2 pt-2 border-t font-bold">
                <span>Resultado:</span>
                <span className={quote.valorTotal >= quote.anttPisoMinimo ? 'text-green-700' : 'text-red-700'}>
                  {quote.valorTotal >= quote.anttPisoMinimo ? 'Compatível com o Piso' : 'Abaixo do Piso Referencial'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mt-3 text-center italic">
          * Valor de referência calculado com base nos parâmetros informados pelo usuário.
        </p>
      </div>

      {/* Observações */}
      {quote.observacoes && (
        <div className="mb-8 text-xs">
          <h2 className="font-bold text-slate-900 border-b pb-1 mb-2 uppercase">Observações Gerais</h2>
          <p className="whitespace-pre-wrap">{quote.observacoes}</p>
        </div>
      )}

      </div>

      <div>
        {/* Assinaturas */}
        <div className="mt-16 pt-8 flex justify-between gap-8 text-center text-xs">
          <div className="flex-1">
            <div className="border-t border-slate-400 mx-8 pt-2">
              <p className="font-bold uppercase text-slate-800">{getSignatureName()}</p>
              <p className="text-slate-500">Prestador de Serviço</p>
            </div>
          </div>
          <div className="flex-1">
            <div className="border-t border-slate-400 mx-8 pt-2">
              <p className="font-bold uppercase text-slate-800">
                {quote.clienteNome || quote.clienteEmpresa || 'Assinatura do Cliente'}
              </p>
              <p className="text-slate-500">Cliente Autorizado</p>
            </div>
          </div>
        </div>

        {/* Rodapé Institucional */}
        <div className="mt-16 border-t border-slate-200 pt-4 flex justify-between items-center text-[10px] text-slate-450 font-medium font-sans">
          <span>{company?.nomeFantasia || company?.razaoSocial} — Central de Atendimento: {company?.telefone || '—'}</span>
          <span>MCA Sistemas Integrados</span>
        </div>
      </div>
    </div>
  );
});
