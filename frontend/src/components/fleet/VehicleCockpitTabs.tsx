import {
  DollarSign, Wrench, Package, Paperclip, Clipboard, CheckSquare, FileText,
  TrendingUp, TrendingDown, Activity
} from 'lucide-react';
import { fleetDisplayValue, fleetYearLabel } from '../../pages/fleet/fleetVehicles.ui';

/**
 * Abas do cockpit do veículo (Cadastro, Orçamentos, OS, Manutenção, Peças,
 * Documentos e Finanças/DRE). Compartilhado entre a Gestão de Frotas e o
 * Portal do Gestor de Frota — os dados vêm do backend já filtrados por perfil
 * (no portal, sem contas a pagar e sem custos internos da oficina).
 */
export type VehicleCockpitTab = 'info' | 'quotes' | 'os' | 'maintenance' | 'parts' | 'docs' | 'finance';

export function InfoField({ label, value }: { label: string; value: unknown }) {
  const text = fleetDisplayValue(value);
  const empty = text === 'Não informado';
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 break-words text-sm ${empty ? 'italic text-muted-foreground' : 'font-medium text-foreground'}`}>{text}</p>
    </div>
  );
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

interface Props {
  vehicleDetails: any;
  detailsTab: VehicleCockpitTab;
  setDetailsTab: (tab: VehicleCockpitTab) => void;
  /** 'portal' = visão do cliente (Portal do Gestor de Frota): Finanças mostra o custo do veículo para a empresa. */
  audience?: 'admin' | 'portal';
}

/** Finanças do veículo sob a ótica do cliente: o que a empresa gastou com o veículo. */
function PortalVehicleFinance({ financeiro, resumo }: { financeiro: any[]; resumo?: any }) {
  // Indicadores pela mesma regra do Dashboard e de Finanças / DRE (calculados no backend)
  const r = resumo || { total: 0, pecas: 0, servicos: 0, emAberto: 0, pago: 0 };
  const cards = [
    { label: 'Custo total do veículo', value: r.total },
    { label: 'Peças', value: r.pecas },
    { label: 'Mão de obra / Serviços', value: r.servicos },
    { label: 'Em aberto', value: r.emAberto },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(c => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(c.value)}</p>
          </div>
        ))}
      </div>
      {financeiro.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nenhum lançamento para este veículo.</p>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Data</th>
                <th className="p-3 font-medium">Descrição</th>
                <th className="p-3 text-right font-medium">Valor</th>
                <th className="p-3 text-center font-medium">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {financeiro.map((f, i) => (
                <tr key={`${f.id}-${i}`}>
                  <td className="p-3 whitespace-nowrap">{new Date(f.vencimento).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3">
                    <span className="font-medium text-foreground">{f.tipo === 'RECEITA' ? 'Serviço na oficina' : 'Manutenção registrada'}{f.numero ? ` #${f.numero}` : ''}</span>
                    <span className="block text-xs text-muted-foreground">{f.descricao}</span>
                  </td>
                  <td className="p-3 text-right font-medium tabular-nums">{formatCurrency(f.valor)}</td>
                  <td className="p-3 text-center text-xs">{['RECEBIDA', 'LIQUIDADO', 'PAGA', 'PAGO'].includes(String(f.status).toUpperCase()) ? 'Pago' : String(f.status).toUpperCase() === 'PENDENTE' ? 'Em aberto' : f.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function VehicleCockpitTabs({ vehicleDetails, detailsTab, setDetailsTab, audience = 'admin' }: Props) {
  const info = vehicleDetails?.infoCadastral;
  if (!vehicleDetails || !info) return null;

  return (
    <>
        {/* ── Glassmorphic Tab Menu with Glow ── */}
        <div role="tablist" aria-label="Seções do veículo" className="flex shrink-0 overflow-x-auto border-b border-border px-2">
          {[
            { id: 'info', label: 'Cadastro', icon: <FileText size={14} /> },
            { id: 'quotes', label: 'Orçamentos', icon: <Clipboard size={14} /> },
            { id: 'os', label: 'Ordens de Serviço', icon: <CheckSquare size={14} /> },
            { id: 'maintenance', label: 'Manutenção', icon: <Wrench size={14} /> },
            { id: 'parts', label: 'Peças Utilizadas', icon: <Package size={14} /> },
            { id: 'docs', label: 'Documentos', icon: <Paperclip size={14} /> },
            { id: 'finance', label: 'Finanças DRE', icon: <DollarSign size={14} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={detailsTab === tab.id}
              onClick={() => setDetailsTab(tab.id as any)}
              className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                detailsTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Display Panel Container */}
        <div className="p-6 flex-1">

          {/* TAB 1: INFO CADASTRAL */}
          {detailsTab === 'info' && (
            <div className="space-y-8">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identificação</h3>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InfoField label="Placa" value={info.placa} />
                  <InfoField label="Chassi" value={info.chassi} />
                  <InfoField label="RENAVAM" value={info.renavam} />
                  <InfoField label="VIN" value={info.vin} />
                  <InfoField label="Prefixo" value={info.prefixo} />
                </div>
              </section>
              <section className="border-t border-border pt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dados técnicos</h3>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InfoField label="Ano de fabricação / modelo" value={fleetYearLabel(info.anoFabricacao, info.anoModelo) === 'Não informado' ? '' : fleetYearLabel(info.anoFabricacao, info.anoModelo)} />
                  <InfoField label="Cor" value={info.cor} />
                  <InfoField label="Combustível" value={info.combustivel} />
                  <InfoField label="Tipo" value={info.tipoVeiculo} />
                  <InfoField label="Quilometragem" value={info.kmAtual === null || info.kmAtual === undefined ? '' : `${Number(info.kmAtual).toLocaleString('pt-BR')} km`} />
                </div>
              </section>
              <section className="border-t border-border pt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dados administrativos</h3>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InfoField label="Proprietário" value={info.cliente?.nome} />
                  <InfoField label="Empresa" value={info.cliente?.empresa} />
                  <InfoField label="Frota" value={info.frota} />
                  <InfoField label="Subfrota" value={info.subfrota} />
                  <div className="sm:col-span-2">
                    <InfoField label="Observações" value={info.observacoes} />
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: ORÇAMENTOS VINCULADOS */}
          {detailsTab === 'quotes' && (
            <div className="space-y-4">
              {vehicleDetails.orcamentos.length === 0 ? (
                <div className="text-center py-12 text-gray-400 space-y-2">
                  <Clipboard size={32} className="mx-auto" />
                  <p className="text-xs">Nenhum orçamento pendente encontrado para este veículo.</p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto scrollbar-thin rounded-xl border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-xs text-left text-gray-600 dark:text-gray-300 table-fixed break-words">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 uppercase font-extrabold text-[10px]">
                      <tr>
                        <th className="p-3 w-3/12 md:w-2/12">Nº Orc</th>
                        <th className="p-3 w-2/12 hidden md:table-cell">Data</th>
                        <th className="p-3 w-5/12 md:w-3/12">Itens</th>
                        <th className="p-3 w-2/12 text-right hidden sm:table-cell">Valor Total</th>
                        <th className="p-3 w-4/12 md:w-3/12 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {vehicleDetails.orcamentos.map((q: any) => (
                        <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/25">
                          <td className="p-3 font-bold text-primary dark:text-primary truncate">#{q.numeroOrcamento}</td>
                          <td className="p-3 font-medium hidden md:table-cell truncate">{new Date(q.createdAt).toLocaleDateString('pt-BR')}</td>
                          <td className="p-3 font-medium truncate" title={q.items.map((i: any) => i.descricao).join(', ')}>
                            {q.items.length} {q.items.length === 1 ? 'item' : 'itens'} ({q.items.map((i: any) => i.descricao).slice(0, 2).join(', ')}...)
                          </td>
                          <td className="p-3 text-right font-bold text-gray-900 dark:text-white hidden sm:table-cell truncate">{formatCurrency(q.total)}</td>
                          <td className="p-3 text-center truncate">
                            <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase truncate block w-fit mx-auto">
                              {q.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ORDENS DE SERVIÇO VINCULADAS */}
          {detailsTab === 'os' && (
            <div className="space-y-4">
              {vehicleDetails.ordensServico.length === 0 ? (
                <div className="text-center py-12 text-gray-400 space-y-2">
                  <CheckSquare size={32} className="mx-auto" />
                  <p className="text-xs">Nenhuma ordem de serviço vinculada encontrada para este veículo.</p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto scrollbar-thin rounded-xl border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-xs text-left text-gray-600 dark:text-gray-300 table-fixed break-words">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 uppercase font-extrabold text-[10px]">
                      <tr>
                        <th className="p-3 w-3/12 md:w-2/12">OS / Orc</th>
                        <th className="p-3 w-2/12 hidden md:table-cell">Ref Externa</th>
                        <th className="p-3 w-2/12 hidden sm:table-cell">Data</th>
                        <th className="p-3 w-2/12 hidden lg:table-cell">Prazo Execução</th>
                        <th className="p-3 w-4/12 md:w-2/12 text-right">Total</th>
                        <th className="p-3 w-5/12 md:w-2/12 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {vehicleDetails.ordensServico.map((os: any) => (
                        <tr key={os.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/25">
                          <td className="p-3 font-bold text-primary dark:text-primary truncate">#{os.numeroOrcamento}</td>
                          <td className="p-3 font-bold text-gray-500 dark:text-gray-400 hidden md:table-cell truncate">{os.osExterna || '—'}</td>
                          <td className="p-3 font-medium hidden sm:table-cell truncate">{new Date(os.createdAt).toLocaleDateString('pt-BR')}</td>
                          <td className="p-3 font-medium text-gray-500 hidden lg:table-cell truncate">{os.prazoExecucao || '—'}</td>
                          <td className="p-3 text-right font-black text-gray-900 dark:text-white truncate">{formatCurrency(os.total)}</td>
                          <td className="p-3 text-center truncate">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase truncate block w-fit mx-auto ${
                              os.status === 'Pago' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                              {os.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: HISTÓRICO DE MANUTENÇÃO (Timeline) */}
          {detailsTab === 'maintenance' && (
            <div className="space-y-6 animate-fade-in-up">
              {vehicleDetails.manutencoes.length === 0 ? (
                <div className="text-center py-16 text-gray-400 space-y-3">
                  <div className="mx-auto w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                    <Wrench size={28} className="text-gray-300 dark:text-gray-500" />
                  </div>
                  <p className="text-xs font-semibold">Nenhum histórico de manutenção ou evento lançado na base de dados.</p>
                </div>
              ) : (
                <div className="flow-root relative pl-6 timeline-gradient before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:rounded-full">
                  {vehicleDetails.manutencoes.map((m: any, idx: number) => {
                    const bulletColor = m.tipo === 'TROCA_OLEO_MOTOR' ? 'border-rose-500 bg-rose-500' :
                      m.tipo === 'TROCA_OLEO_CAMBIO' ? 'border-orange-500 bg-orange-500' :
                      m.tipo === 'REVISAO' ? 'border-blue-500 bg-blue-500' :
                      'border-primary bg-primary';
                    return (
                    <div key={idx} className="relative pb-6 last:pb-0">
                      {/* Contextual bullet with pulse */}
                      <div className={`absolute -left-6 mt-1.5 flex items-center justify-center bg-white dark:bg-gray-800 border-2 ${bulletColor.split(' ')[0]} rounded-full h-5 w-5 shadow-sm`}>
                        <div className={`h-2 w-2 ${bulletColor.split(' ')[1]} rounded-full pulse-glow`}></div>
                      </div>

                      <div className="bg-gradient-to-r from-gray-50/70 to-white dark:from-gray-700/25 dark:to-gray-800/25 p-4 rounded-xl border border-gray-100/60 dark:border-gray-700/60 flex flex-col sm:flex-row justify-between items-start gap-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                        <div className="space-y-1.5 flex-1 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${
                              m.tipo === 'TROCA_OLEO_MOTOR' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40' :
                              m.tipo === 'TROCA_OLEO_CAMBIO' ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/40' :
                              m.tipo === 'REVISAO' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40' :
                              'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/40'
                            }`}>
                              {m.tipo.replace("_", " ")}
                            </span>
                            <span className="text-gray-400 font-semibold">{new Date(m.data).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <p className="text-xs font-bold text-gray-800 dark:text-white leading-relaxed">{m.descricao}</p>
                          {m.km && (
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg w-max">
                              <Activity size={10} className="inline mr-1" />Hodômetro: {m.km.toLocaleString('pt-BR')} KM
                            </span>
                          )}
                          {m.proximaTroca && (
                            <span className="text-[10px] font-bold text-indigo-650 dark:text-primary/70 block bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded-lg w-max">
                              {m.proximaTroca}
                            </span>
                          )}
                        </div>

                        {m.valor > 0 && (
                          <div className="text-right whitespace-nowrap self-start shrink-0 text-xs bg-rose-50/60 dark:bg-rose-950/20 px-3 py-2 rounded-xl border border-rose-100/50 dark:border-rose-900/30">
                            <span className="text-gray-400 block mb-0.5 text-[10px]">Custo Lançado</span>
                            <span className="font-black text-rose-600 dark:text-rose-400">{formatCurrency(m.valor)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PEÇAS UTILIZADAS */}
          {detailsTab === 'parts' && (
            <div className="space-y-4">
              {vehicleDetails.pecas.length === 0 ? (
                <div className="text-center py-12 text-gray-400 space-y-2">
                  <Package size={32} className="mx-auto" />
                  <p className="text-xs">Nenhuma peça cadastrada nas revisões/orçamentos do veículo.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-xl border border-primary/30 dark:border-primary/20 flex justify-between items-center text-xs">
                    <span className="font-bold text-indigo-750 dark:text-primary/70">Resumo de Peças Adquiridas</span>
                    <span className="font-black text-primary dark:text-primary">
                      Total Alocado: {formatCurrency(vehicleDetails.pecas.reduce((acc: number, p: any) => acc + p.valorTotal, 0))}
                    </span>
                  </div>

                  <div className="w-full overflow-x-auto scrollbar-thin rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-xs text-left text-gray-600 dark:text-gray-300 table-fixed break-words">
                      <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 uppercase font-extrabold text-[10px]">
                        <tr>
                          <th className="p-3 w-5/12 md:w-4/12">Descrição da Peça</th>
                          <th className="p-3 w-2/12 text-center hidden md:table-cell">Quantidade</th>
                          <th className="p-3 w-2/12 text-right hidden sm:table-cell">Valor Unitário</th>
                          <th className="p-3 w-4/12 md:w-2/12 text-right">Valor Total</th>
                          <th className="p-3 w-3/12 md:w-2/12 truncate">Orc / OS Origem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {vehicleDetails.pecas.map((p: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/25">
                            <td className="p-3 font-semibold text-gray-800 dark:text-white truncate">{p.descricao}</td>
                            <td className="p-3 text-center font-bold text-gray-500 hidden md:table-cell truncate">{p.quantidade}</td>
                            <td className="p-3 text-right font-medium hidden sm:table-cell truncate">{formatCurrency(p.valorUnitario)}</td>
                            <td className="p-3 text-right font-bold text-gray-900 dark:text-white truncate">{formatCurrency(p.valorTotal)}</td>
                            <td className="p-3 font-bold text-primary dark:text-primary truncate">#{p.numeroOrcamento}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: DOCUMENTOS & ANEXOS */}
          {detailsTab === 'docs' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* Left: QR Code dynamic banner (5 columns) */}
              <div className="md:col-span-5 space-y-4">
                <div className="p-6 bg-slate-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-col items-center text-center shadow-inner relative overflow-hidden select-none">
                  <div className="absolute top-0 right-0 p-2 text-primary/70 pointer-events-none">
                    <Activity size={24} className="opacity-10" />
                  </div>
                  <div className="w-36 h-36 bg-white p-3 rounded-2xl border border-gray-300/80 flex items-center justify-center relative shadow-md">
                    {/* Interactive Premium SVG QR Code */}
                    <svg className="w-32 h-32 text-slate-800" viewBox="0 0 100 100" fill="currentColor">
                      <path d="M5,5 h30 v30 h-30 z M15,15 h10 v10 h-10 z" />
                      <path d="M65,5 h30 v30 h-30 z M75,15 h10 v10 h-10 z" />
                      <path d="M5,65 h30 v30 h-30 z M15,75 h10 v10 h-10 z" />
                      <path d="M45,5 h10 v10 h-10 z M55,20 h10 v15 h-10 z M45,25 h5 v5 h-5 z" />
                      <path d="M45,45 h10 v10 h-10 z M65,45 h15 v10 h-15 z M85,45 h10 v10 h-10 z" />
                      <path d="M5,45 h20 v10 h-20 z M30,55 h10 v10 h-10 z" />
                      <path d="M55,65 h10 v15 h-10 z M70,65 h25 v10 h-25 z M80,80 h15 v15 h-15 z M45,75 h20 v10 h-20 z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 mt-4 uppercase tracking-wider">Identificador QR de Frota</span>
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-350 mt-1 uppercase font-mono">TOKEN: {vehicleDetails.infoCadastral.placa}</h4>
                  <p className="text-[9px] text-gray-400 dark:text-gray-550 mt-2 max-w-xs leading-relaxed font-medium">Aponte a câmera do dispositivo móvel para acessar instantaneamente a ficha técnica do veículo na oficina.</p>
                </div>
              </div>

              {/* Right: List of attachments from invoices/transactions (7 columns) */}
              <div className="md:col-span-7 space-y-4">
                <h3 className="text-xs font-black uppercase text-primary tracking-wider">Anexos Financeiros e Fiscais</h3>
                {vehicleDetails.documentos.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50/50 dark:bg-gray-700/10 rounded-xl border border-gray-150/40 dark:border-gray-700/60 text-gray-400 text-xs">
                    Nenhum comprovante fiscal ou documento anexado às transações deste veículo.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vehicleDetails.documentos.map((doc: any) => (
                      <div key={doc.id} className="p-3 bg-gray-50 dark:bg-gray-700/20 rounded-xl border border-gray-150/30 dark:border-gray-700/50 flex justify-between items-center text-xs">
                        <div className="space-y-0.5 overflow-hidden">
                          <span className="font-bold text-gray-800 dark:text-white block truncate">{doc.nome}</span>
                          <span className="text-[10px] text-gray-400 block truncate">{doc.origem} • {new Date(doc.data).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-primary hover:bg-primary text-white font-bold px-3 py-1.5 rounded-lg shrink-0 transition text-[10px]"
                        >
                          Visualizar
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: HISTÓRICO FINANCEIRO / DRE DO VEÍCULO */}
          {detailsTab === 'finance' && audience === 'portal' && (
            <PortalVehicleFinance financeiro={vehicleDetails.financeiro || []} resumo={vehicleDetails.resumoFinanceiro} />
          )}

          {detailsTab === 'finance' && audience !== 'portal' && (
            <div className="space-y-6 animate-fade-in-up">
              
              {/* Top KPI row of finance */}
              {(() => {
                const totalRevenues = vehicleDetails.financeiro.filter((f: any) => f.tipo === 'RECEITA').reduce((acc: number, f: any) => acc + f.valor, 0);
                const totalExpenses = vehicleDetails.financeiro.filter((f: any) => f.tipo !== 'RECEITA').reduce((acc: number, f: any) => acc + f.valor, 0);
                const netBalance = totalRevenues - totalExpenses;
                const total = totalRevenues + totalExpenses;
                const revenuePercent = total > 0 ? (totalRevenues / total) * 100 : 50;

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50/30 dark:from-emerald-950/20 dark:to-green-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-center justify-between text-xs shine-hover transition-all duration-200 hover:shadow-md">
                        <div className="space-y-1">
                          <span className="text-emerald-700 dark:text-emerald-300 font-bold block">Faturado (Receitas)</span>
                          <span className="text-xl font-black text-emerald-800 dark:text-emerald-400">{formatCurrency(totalRevenues)}</span>
                        </div>
                        <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                          <TrendingUp size={20} />
                        </div>
                      </div>

                      <div className="p-4 bg-gradient-to-br from-rose-50 to-pink-50/30 dark:from-rose-950/20 dark:to-pink-950/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-center justify-between text-xs shine-hover transition-all duration-200 hover:shadow-md">
                        <div className="space-y-1">
                          <span className="text-rose-700 dark:text-rose-300 font-bold block">Custos (Despesas)</span>
                          <span className="text-xl font-black text-rose-800 dark:text-rose-400">{formatCurrency(totalExpenses)}</span>
                        </div>
                        <div className="p-2.5 bg-rose-500/10 text-rose-600 rounded-xl">
                          <TrendingDown size={20} />
                        </div>
                      </div>

                      <div className={`p-4 border rounded-2xl flex items-center justify-between text-xs shine-hover transition-all duration-200 hover:shadow-md ${
                        netBalance >= 0 
                          ? 'bg-gradient-to-br from-primary/10 to-transparent/30 border-primary/30 dark:from-primary/10/20 dark:to-transparent/10 dark:border-primary/20' 
                          : 'bg-gradient-to-br from-amber-50 to-orange-50/30 border-amber-100 dark:from-amber-950/20 dark:to-orange-950/10 dark:border-amber-900/30'
                      }`}>
                        <div className="space-y-1">
                          <span className={`font-bold block ${netBalance >= 0 ? 'text-primary dark:text-primary/70' : 'text-amber-700 dark:text-amber-300'}`}>Saldo Líquido</span>
                          <span className={`text-xl font-black ${netBalance >= 0 ? 'text-primary dark:text-primary' : 'text-amber-800 dark:text-amber-450'}`}>{formatCurrency(netBalance)}</span>
                        </div>
                        <div className={`p-2.5 rounded-xl ${netBalance >= 0 ? 'bg-primary/10 text-indigo-650' : 'bg-amber-500/10 text-amber-600'}`}>
                          <Activity size={20} />
                        </div>
                      </div>
                    </div>

                    {/* Visual Proportion Bar */}
                    {total > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-emerald-600 dark:text-emerald-400">Receitas {revenuePercent.toFixed(0)}%</span>
                          <span className="text-rose-600 dark:text-rose-400">Despesas {(100 - revenuePercent).toFixed(0)}%</span>
                        </div>
                        <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex shadow-inner">
                          <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-l-full transition-all duration-700 ease-out" style={{ width: `${revenuePercent}%` }} />
                          <div className="bg-gradient-to-r from-rose-400 to-rose-500 rounded-r-full transition-all duration-700 ease-out flex-1" />
                        </div>
                      </div>
                    )}

                    {/* Chronological ledger table */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase text-primary dark:text-primary tracking-wider flex items-center gap-1.5"><DollarSign size={12} /> Detalhamento de Lançamentos Financeiros</h4>
                      {vehicleDetails.financeiro.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50/50 dark:bg-gray-700/10 rounded-xl border border-gray-150/40 dark:text-gray-400 text-xs">
                          Nenhuma receita ou despesa registrada para o veículo.
                        </div>
                      ) : (
                        <div className="w-full overflow-x-auto scrollbar-thin rounded-xl border border-gray-200 dark:border-gray-700">
                          <table className="w-full text-xs text-left text-gray-600 dark:text-gray-300 table-fixed break-words">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 uppercase font-extrabold text-[10px]">
                              <tr>
                                <th className="p-3 w-2/12 hidden sm:table-cell">Data</th>
                                <th className="p-3 w-6/12 md:w-5/12">Descrição / Lançamento</th>
                                <th className="p-3 w-2/12 hidden md:table-cell">Categoria</th>
                                <th className="p-3 w-3/12 md:w-2/12 text-right">Valor</th>
                                <th className="p-3 w-3/12 md:w-1/12 text-center hidden lg:table-cell">Situação</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                              {vehicleDetails.financeiro.map((fin: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/25">
                                  <td className="p-3 font-medium hidden sm:table-cell truncate">{new Date(fin.vencimento).toLocaleDateString('pt-BR')}</td>
                                  <td className="p-3 font-bold text-gray-800 dark:text-white truncate">
                                    {fin.tipo === 'RECEITA' ? 'Receita OS ' : fin.tipo === 'DESPESA' ? 'Despesa Lançamento ' : 'Custo Manutenção '}
                                    {fin.numero ? `#${fin.numero}` : ''}
                                    <span className="font-semibold block text-[10px] text-gray-400 font-normal mt-0.5 truncate">{fin.descricao}</span>
                                  </td>
                                  <td className="p-3 font-semibold text-gray-500 hidden md:table-cell truncate">{fin.tipo}</td>
                                  <td className={`p-3 text-right font-black truncate ${fin.tipo === 'RECEITA' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {fin.tipo === 'RECEITA' ? '+' : '-'}{formatCurrency(fin.valor)}
                                  </td>
                                  <td className="p-3 text-center hidden lg:table-cell truncate">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase truncate block w-fit mx-auto ${
                                      fin.status === 'RECEBIDA' || fin.status === 'PAGA' || fin.status === 'PAGO'
                                        ? 'bg-green-100 text-green-805 dark:bg-green-950/30 dark:text-green-400' 
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400'
                                    }`}>
                                      {fin.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
    </>
  );
}
