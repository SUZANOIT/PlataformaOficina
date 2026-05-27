import { forwardRef } from 'react';

type AdvancePdfTemplateProps = {
  advance: any;
  collaborator: any;
  company: any;
};

export const AdvancePdfTemplate = forwardRef<HTMLDivElement, AdvancePdfTemplateProps>(
  ({ advance, collaborator, company }, ref) => {
    if (!advance || !collaborator) return null;

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    const formatTime = (dateStr: string) => {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const companyName = company?.nomeFantasia || company?.razaoSocial || 'SuzanoIT Gestão';
    const initials = companyName
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase();

    return (
      <div
        ref={ref}
        className="bg-white text-slate-900 p-12 w-[718px] min-h-[1012px] flex flex-col justify-between"
        style={{ fontFamily: "'Inter', 'Arial', sans-serif" }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
          .receipt-border {
            border: 1px solid #e2e8f0;
          }
          .receipt-accent {
            background-color: #f8fafc;
          }
        `}</style>

        <div>
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight uppercase">
                COMPROVANTE DE ADIANTAMENTO
              </h1>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Número: <span className="font-mono text-slate-800 font-bold">{advance.numeroComprovante}</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Emissão: {formatDate(advance.data)} às {formatTime(advance.data)}
              </p>
            </div>

            <div className="flex gap-3 items-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {initials || 'SZ'}
              </div>
              <div className="text-right">
                <h2 className="text-sm font-bold text-slate-900 leading-tight">
                  {companyName}
                </h2>
                {company?.cnpj && (
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">CNPJ: {company.cnpj}</p>
                )}
                {company?.telefone && (
                  <p className="text-[10px] text-slate-500 font-medium">{company.telefone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Description banner */}
          <div className="receipt-accent receipt-border p-5 rounded-xl mb-8 flex justify-between items-center">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Valor do Adiantamento</span>
              <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">
                {formatCurrency(advance.valor)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Forma de Pagamento</span>
              <span className="text-sm font-bold text-slate-800 mt-1 block uppercase tracking-wider">
                {advance.formaPagamento}
              </span>
            </div>
          </div>

          {/* Collaborator Details */}
          <div className="receipt-border rounded-xl p-5 mb-8">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">
              Dados do Colaborador
            </h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-[12px]">
              <div>
                <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Nome Completo</span>
                <p className="font-bold text-slate-900 mt-0.5">{collaborator.nome}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">CPF</span>
                <p className="font-mono text-slate-900 mt-0.5">{collaborator.cpf || 'Não informado'}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Cargo / Função</span>
                <p className="font-semibold text-slate-900 mt-0.5">{collaborator.cargo || 'Não informado'}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Departamento</span>
                <p className="font-semibold text-slate-900 mt-0.5">{collaborator.departamento || 'Não informado'}</p>
              </div>
            </div>
          </div>

          {/* Details of Advance */}
          <div className="receipt-border rounded-xl p-5 mb-8">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">
              Detalhes e Status
            </h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-[12px] mb-4">
              <div>
                <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Status do Adiantamento</span>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider mt-1 ${
                  advance.status === 'DESCONTADO_EM_FOLHA' 
                    ? 'bg-emerald-500/10 text-emerald-600' 
                    : 'bg-amber-500/10 text-amber-600'
                }`}>
                  {advance.status === 'DESCONTADO_EM_FOLHA' ? 'Descontado em Folha' : 'Pendente de Desconto'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Registrado por</span>
                <p className="font-semibold text-slate-900 mt-0.5">{advance.responsavel || 'Sistema'}</p>
              </div>
              {advance.oficina && (
                <div className="col-span-2">
                  <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wide block">Oficina Vinculada</span>
                  <p className="font-bold text-slate-900 mt-0.5">{advance.oficina.nome}</p>
                </div>
              )}
            </div>
            {advance.observacoes && (
              <div className="text-[11px] text-slate-600 mt-4 p-3 bg-slate-50 border border-slate-100 rounded-lg whitespace-pre-wrap leading-relaxed">
                <span className="font-bold text-slate-800 block mb-1 uppercase tracking-wide">Observações:</span>
                {advance.observacoes}
              </div>
            )}
          </div>

          {/* Declaration Statement */}
          <p className="text-[10px] text-slate-500 leading-relaxed text-center px-4 mb-8">
            Declaro para os devidos fins que recebi a importância de <span className="font-bold text-slate-800">{formatCurrency(advance.valor)}</span>, 
            a título de adiantamento salarial, valor este que concordo expressamente que seja descontado integralmente em meu próximo demonstrativo de pagamento de salário (folha de pagamento), nos termos do Artigo 462 da CLT.
          </p>
        </div>

        {/* Dual Signature Blocks */}
        <div className="mt-16">
          <div className="grid grid-cols-2 gap-12 text-center text-xs">
            <div className="flex flex-col items-center">
              <div className="w-full border-t border-slate-400 pt-2 max-w-[240px]">
                <p className="font-bold text-slate-800">{collaborator.nome}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Assinatura do Colaborador</p>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-full border-t border-slate-400 pt-2 max-w-[240px]">
                <p className="font-bold text-slate-800">{companyName}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Assinatura da Empresa</p>
              </div>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="border-t border-slate-100 pt-4 mt-12 flex justify-between items-center text-[9px] text-slate-400 font-medium">
            <span>Comprovante gerado via Sistema SuzanoIT Gestão</span>
            <span>Impresso em: {new Date().toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </div>
    );
  }
);

AdvancePdfTemplate.displayName = 'AdvancePdfTemplate';
