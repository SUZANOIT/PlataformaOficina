import { forwardRef } from 'react';
import { mcaLogoBase64 } from '../assets/mcaLogoBase64';

type TowingRatesPdfTemplateProps = {
  rates: any[];
  company: any;
};

export const TowingRatesPdfTemplate = forwardRef<HTMLDivElement, TowingRatesPdfTemplateProps>(({ rates, company }, ref) => {
  if (!rates) return null;

  return (
    <div ref={ref} className="w-[800px] bg-white p-8 font-sans text-slate-800 text-sm hidden-print-container" style={{ margin: '0 auto' }}>
      {/* Cabeçalho */}
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-6">
        <div className="w-48">
          {mcaLogoBase64 && <img src={mcaLogoBase64} alt="Logo" className="max-h-16 object-contain" />}
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-900">Tabela de Tarifas de Frete</h1>
          <p className="text-xs text-slate-500 mt-1">
            Data de Emissão: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Dados da Empresa */}
      <div className="mb-6 text-xs bg-slate-50 p-4 border rounded">
        <h2 className="font-bold text-slate-900 border-b pb-1 mb-2 uppercase">Empresa Emissora</h2>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <p><span className="font-semibold">Razão Social:</span> {company?.razaoSocial || '—'}</p>
          <p><span className="font-semibold">CNPJ:</span> {company?.cnpj || '—'}</p>
          <p><span className="font-semibold">Endereço:</span> {company?.endereco || '—'}</p>
          <p><span className="font-semibold">Contato:</span> {company?.telefone || '—'}</p>
        </div>
      </div>

      {/* Tabela de Tarifas */}
      <div className="mb-6">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white font-semibold">
              <th className="py-2.5 px-3 uppercase text-left">Tipo de Guincho</th>
              <th className="py-2.5 px-3 uppercase text-right">Taxa de Saída</th>
              <th className="py-2.5 px-3 uppercase text-right">Valor por KM</th>
              <th className="py-2.5 px-3 uppercase text-right">Hora Parada</th>
              <th className="py-2.5 px-3 uppercase text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 border-b">
            {rates.map((r, idx) => (
              <tr key={r.id || idx} className="hover:bg-slate-50/50">
                <td className="py-2.5 px-3 font-semibold text-slate-900">{r.quantidadeEixos >= 7 ? '7 ou mais eixos' : `${r.quantidadeEixos} eixos`}</td>
                <td className="py-2.5 px-3 text-right">R$ {Number(r.taxaSaida || 0).toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right">R$ {Number(r.valorKm || 0).toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right">R$ {Number(r.valorHoraParada || 0).toFixed(2)}</td>
                <td className="py-2.5 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    r.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                  }`}>
                    {r.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
              </tr>
            ))}
            {rates.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 italic">Nenhuma tarifa cadastrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Assinatura / Responsável */}
      <div className="mt-24 pt-8 border-t border-slate-300 text-center text-xs">
        <div className="w-[300px] mx-auto">
          <p className="font-bold uppercase text-slate-800">{company?.razaoSocial || 'Responsável'}</p>
          <p className="text-slate-500">Representante Emitente</p>
        </div>
      </div>

      {/* Rodapé Institucional */}
      <div className="mt-12 text-center text-[10px] text-slate-400 uppercase tracking-widest border-t pt-4">
        MCA — SISTEMA DE GESTÃO E INTEGRAÇÃO DE ORÇAMENTOS
      </div>
    </div>
  );
});
