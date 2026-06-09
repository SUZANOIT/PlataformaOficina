import { parseNfeXml } from '../controllers/nfe.controller';

export type TipoDocumentoFiscal = 'ENTRADA' | 'SAIDA' | 'SERVICO' | 'PECAS';

export interface ParsedFiscalXml {
  numeroDocumento: string;
  numeroNota: string;
  serie: string | null;
  chaveAcesso: string | null;
  dataEmissao: Date;
  valorTotal: number;
  valorBruto: number;
  valorLiquido: number;
  valorImpostos: number;
  icms: number;
  ipi: number;
  pis: number;
  cofins: number;
  iss: number;
  irpj: number;
  csll: number;
  emitenteNome: string;
  emitenteCnpj: string;
  destinatarioNome: string;
  destinatarioCnpj: string;
  clienteNome: string | null;
  fornecedorNome: string | null;
  tipoDocumento: TipoDocumentoFiscal;
  fluxoFinanceiro: 'ENTRADA' | 'SAIDA';
  status: string;
}

function tagContent(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function blockContent(xml: string, blockName: string): string | null {
  const regex = new RegExp(`<${blockName}>([\\s\\S]*?)</${blockName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function cleanCnpj(cnpj: string | null | undefined): string {
  return (cnpj || '').replace(/\D/g, '');
}

function isPecasCfop(cfop: string | null | undefined): boolean {
  if (!cfop) return false;
  return /^(1102|2102|1403|2403|1556|2556)/.test(cfop);
}

function isVendaPecasCfop(cfop: string | null | undefined): boolean {
  if (!cfop) return false;
  return /^(5102|5405|6102|6118|6108)/.test(cfop);
}

function isPecasNcm(ncm: string | null | undefined): boolean {
  if (!ncm) return false;
  return /^(8708|4011|4013|7007|7009|8482|84)/.test(ncm);
}

export function classifyTipoDocumento(
  xmlText: string,
  companyCnpj: string,
  items: Array<{ cfop?: string | null; issValor?: number | null; ncm?: string | null }> = []
): TipoDocumentoFiscal {
  const companyClean = cleanCnpj(companyCnpj);
  const nfe = parseNfeXml(xmlText);
  const emitClean = cleanCnpj(nfe.supplier?.cnpj || '');
  const destClean = cleanCnpj(nfe.destCnpj || '');

  const ideXml = blockContent(xmlText, 'ide') || '';
  const mod = tagContent(ideXml, 'mod') || '55';

  const totalIss = items.reduce((sum, item) => sum + (item.issValor || 0), 0);
  const hasIssItems = totalIss > 0 || items.some(i => (i.issValor || 0) > 0);

  if (mod === '99' || hasIssItems) {
    return 'SERVICO';
  }

  const isEntrada = destClean === companyClean && destClean.length === 14;
  const isSaida = emitClean === companyClean && emitClean.length === 14;

  const isPecasItem = (i: { cfop?: string | null; ncm?: string | null }) =>
    isPecasCfop(i.cfop) || isVendaPecasCfop(i.cfop) || isPecasNcm(i.ncm);

  if (isSaida) {
    if (items.some(isPecasItem)) return 'PECAS';
    return 'SAIDA';
  }

  if (isEntrada) {
    const natOp = (nfe.naturezaOperacao || '').toUpperCase();
    if (items.some(isPecasItem) || natOp.includes('PEÇA') || natOp.includes('PECA')) {
      return 'PECAS';
    }
    return 'ENTRADA';
  }

  return 'ENTRADA';
}

export function resolveFluxoFinanceiro(
  xmlText: string,
  companyCnpj: string
): 'ENTRADA' | 'SAIDA' {
  const companyClean = cleanCnpj(companyCnpj);
  const nfe = parseNfeXml(xmlText);
  const emitClean = cleanCnpj(nfe.supplier?.cnpj || '');
  const destClean = cleanCnpj(nfe.destCnpj || '');
  if (emitClean === companyClean && emitClean.length === 14) return 'SAIDA';
  if (destClean === companyClean && destClean.length === 14) return 'ENTRADA';
  return 'ENTRADA';
}

export function parseFiscalXml(xmlText: string, companyCnpj: string): ParsedFiscalXml | null {
  try {
    const nfe = parseNfeXml(xmlText);
    const totalXml = blockContent(xmlText, 'total') || '';
    const icmsTotXml = blockContent(totalXml, 'ICMSTot') || '';

    const icms = parseFloat(tagContent(icmsTotXml, 'vICMS') || '0');
    const ipi = parseFloat(tagContent(icmsTotXml, 'vIPI') || '0');
    const pis = parseFloat(tagContent(icmsTotXml, 'vPIS') || '0');
    const cofins = parseFloat(tagContent(icmsTotXml, 'vCOFINS') || '0');

    const items = nfe.items || [];
    const iss = items.reduce((sum, item) => sum + (item.issValor || 0), 0);
    const valorTotal = nfe.valorTotal || 0;
    const valorImpostos = icms + ipi + pis + cofins + iss;
    const irpj = valorTotal * 0.015;
    const csll = valorTotal * 0.01;

    const tipoDocumento = classifyTipoDocumento(xmlText, companyCnpj, items);
    const fluxoFinanceiro = resolveFluxoFinanceiro(xmlText, companyCnpj);
    const emitenteNome = nfe.supplier?.razaoSocial || 'Emitente não identificado';
    const emitenteCnpj = nfe.supplier?.cnpj || '';
    const destBlock = blockContent(xmlText, 'dest') || '';
    const destinatarioNome = tagContent(destBlock, 'xNome') || 'Destinatário não identificado';
    const destinatarioCnpj = tagContent(destBlock, 'CNPJ') || tagContent(destBlock, 'CPF') || '';

    const isSaidaFluxo = fluxoFinanceiro === 'SAIDA';
    const clienteNome = isSaidaFluxo ? destinatarioNome : null;
    const fornecedorNome = isSaidaFluxo ? null : emitenteNome;

    return {
      numeroDocumento: nfe.numeroNf || `NF-${Date.now()}`,
      numeroNota: nfe.numeroNf || '',
      serie: nfe.serie,
      chaveAcesso: nfe.chaveAcesso,
      dataEmissao: nfe.dataEmissao,
      valorTotal,
      valorBruto: valorTotal,
      valorLiquido: Math.max(valorTotal - valorImpostos, 0),
      valorImpostos: valorImpostos + irpj + csll,
      icms,
      ipi,
      pis,
      cofins,
      iss,
      irpj,
      csll,
      emitenteNome,
      emitenteCnpj,
      destinatarioNome,
      destinatarioCnpj,
      clienteNome,
      fornecedorNome,
      tipoDocumento,
      fluxoFinanceiro,
      status: 'EMITIDA'
    };
  } catch (error) {
    console.error('Erro ao parsear XML fiscal:', error);
    return null;
  }
}

export function inferFluxoFromRecord(
  doc: { emitenteCnpj?: string | null; destinatarioCnpj?: string | null },
  companyCnpj: string
): 'ENTRADA' | 'SAIDA' {
  const companyClean = cleanCnpj(companyCnpj);
  const emitClean = cleanCnpj(doc.emitenteCnpj);
  const destClean = cleanCnpj(doc.destinatarioCnpj);
  if (emitClean === companyClean && emitClean.length === 14) return 'SAIDA';
  if (destClean === companyClean && destClean.length === 14) return 'ENTRADA';
  return 'ENTRADA';
}
export function inferTipoDocumentoFromRecord(
  doc: {
    tipoDocumento?: string | null;
    emitenteCnpj?: string | null;
    destinatarioCnpj?: string | null;
  },
  companyCnpj: string
): TipoDocumentoFiscal {
  if (doc.tipoDocumento && ['ENTRADA', 'SAIDA', 'SERVICO', 'PECAS'].includes(doc.tipoDocumento)) {
    return doc.tipoDocumento as TipoDocumentoFiscal;
  }

  const companyClean = cleanCnpj(companyCnpj);
  const emitClean = cleanCnpj(doc.emitenteCnpj);
  const destClean = cleanCnpj(doc.destinatarioCnpj);

  if (emitClean === companyClean) return 'SAIDA';
  if (destClean === companyClean) return 'ENTRADA';
  return 'ENTRADA';
}

export function mapLegacyStatus(status: string): string {
  const map: Record<string, string> = {
    IMPORTADO: 'EMITIDA',
    CANCELADO: 'CANCELADA',
    EMITIDA: 'EMITIDA',
    CANCELADA: 'CANCELADA',
    INUTILIZADA: 'INUTILIZADA',
    PENDENTE: 'PENDENTE',
    REJEITADA: 'REJEITADA'
  };
  return map[status] || status;
}
