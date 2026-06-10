"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyTipoDocumento = classifyTipoDocumento;
exports.resolveFluxoFinanceiro = resolveFluxoFinanceiro;
exports.parseFiscalXml = parseFiscalXml;
exports.inferFluxoFromRecord = inferFluxoFromRecord;
exports.inferTipoDocumentoFromRecord = inferTipoDocumentoFromRecord;
exports.mapLegacyStatus = mapLegacyStatus;
const nfe_controller_1 = require("../controllers/nfe.controller");
function tagContent(xml, tag) {
    const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
}
function blockContent(xml, blockName) {
    const regex = new RegExp(`<${blockName}>([\\s\\S]*?)</${blockName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : null;
}
function cleanCnpj(cnpj) {
    return (cnpj || '').replace(/\D/g, '');
}
function classifyTipoDocumento(xmlText, companyCnpj, items = []) {
    const companyClean = cleanCnpj(companyCnpj);
    const nfe = (0, nfe_controller_1.parseNfeXml)(xmlText);
    const emitClean = cleanCnpj(nfe.supplier?.cnpj || '');
    const ideXml = blockContent(xmlText, 'ide') || '';
    const mod = tagContent(ideXml, 'mod') || '55';
    const totalIss = items.reduce((sum, item) => sum + (item.issValor || 0), 0);
    const hasIssItems = totalIss > 0 || items.some(i => (i.issValor || 0) > 0);
    const isSaida = emitClean === companyClean && emitClean.length === 14;
    if (mod === '99' || hasIssItems) {
        return isSaida ? 'SERVICO' : 'ENTRADA';
    }
    if (isSaida) {
        return 'SAIDA';
    }
    return 'ENTRADA';
}
function resolveFluxoFinanceiro(xmlText, companyCnpj) {
    const companyClean = cleanCnpj(companyCnpj);
    const nfe = (0, nfe_controller_1.parseNfeXml)(xmlText);
    const emitClean = cleanCnpj(nfe.supplier?.cnpj || '');
    const destClean = cleanCnpj(nfe.destCnpj || '');
    if (emitClean === companyClean && emitClean.length === 14)
        return 'SAIDA';
    if (destClean === companyClean && destClean.length === 14)
        return 'ENTRADA';
    return 'ENTRADA';
}
function parseFiscalXml(xmlText, companyCnpj) {
    try {
        const nfe = (0, nfe_controller_1.parseNfeXml)(xmlText);
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
    }
    catch (error) {
        console.error('Erro ao parsear XML fiscal:', error);
        return null;
    }
}
function inferFluxoFromRecord(doc, companyCnpj) {
    const companyClean = cleanCnpj(companyCnpj);
    const emitClean = cleanCnpj(doc.emitenteCnpj);
    const destClean = cleanCnpj(doc.destinatarioCnpj);
    if (emitClean === companyClean && emitClean.length === 14)
        return 'SAIDA';
    if (destClean === companyClean && destClean.length === 14)
        return 'ENTRADA';
    return 'ENTRADA';
}
function inferTipoDocumentoFromRecord(doc, companyCnpj) {
    // Registros legados classificados como 'PECAS' são reinferidos pelo CNPJ (SAIDA/ENTRADA).
    if (doc.tipoDocumento && ['ENTRADA', 'SAIDA', 'SERVICO'].includes(doc.tipoDocumento)) {
        return doc.tipoDocumento;
    }
    const companyClean = cleanCnpj(companyCnpj);
    const emitClean = cleanCnpj(doc.emitenteCnpj);
    const destClean = cleanCnpj(doc.destinatarioCnpj);
    if (emitClean === companyClean)
        return 'SAIDA';
    if (destClean === companyClean)
        return 'ENTRADA';
    return 'ENTRADA';
}
function mapLegacyStatus(status) {
    const map = {
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
