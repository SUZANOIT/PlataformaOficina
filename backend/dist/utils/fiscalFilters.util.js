"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFiscalFilters = parseFiscalFilters;
function parseFiscalFilters(req, companyId) {
    const q = req.query;
    const body = (req.body || {});
    const source = { ...q, ...body };
    const tiposRaw = source.tiposDocumento || source.tipoDocumento;
    let tiposDocumento;
    if (tiposRaw) {
        const arr = Array.isArray(tiposRaw) ? tiposRaw : String(tiposRaw).split(',');
        tiposDocumento = arr.filter(Boolean);
    }
    const statusRaw = source.status;
    let status;
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
