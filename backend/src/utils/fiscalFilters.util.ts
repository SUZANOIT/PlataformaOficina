import { Request } from 'express';
import { FiscalFilters } from '../services/fiscalDashboard.service';

export function parseFiscalFilters(req: Request, companyId: string): FiscalFilters {
  const q = req.query as any;
  const body = (req.body || {}) as any;
  const source = { ...q, ...body };

  const tiposRaw = source.tiposDocumento || source.tipoDocumento;
  let tiposDocumento: FiscalFilters['tiposDocumento'];
  if (tiposRaw) {
    const arr = Array.isArray(tiposRaw) ? tiposRaw : String(tiposRaw).split(',');
    tiposDocumento = arr.filter(Boolean) as FiscalFilters['tiposDocumento'];
  }

  const statusRaw = source.status;
  let status: string[] | undefined;
  if (statusRaw) {
    status = Array.isArray(statusRaw) ? statusRaw : String(statusRaw).split(',');
  }

  return {
    companyId,
    ano: parseInt(source.ano || new Date().getFullYear(), 10),
    mes: source.mes ? parseInt(source.mes, 10) : undefined,
    tiposDocumento,
    status,
    cliente: source.cliente || undefined,
    fornecedor: source.fornecedor || undefined,
    numeroNota: source.numeroNota || undefined,
    chaveFiscal: source.chaveFiscal || source.chaveAcesso || undefined,
    dataInicial: source.dataInicial || source.startDate || undefined,
    dataFinal: source.dataFinal || source.endDate || undefined,
    search: source.search || undefined,
    page: source.page ? parseInt(source.page, 10) : 1,
    pageSize: source.pageSize ? parseInt(source.pageSize, 10) : 20
  };
}
