"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchUnifiedDocuments = fetchUnifiedDocuments;
exports.yearFromChaveAcesso = yearFromChaveAcesso;
exports.getAvailableYears = getAvailableYears;
exports.getFiscalDashboard = getFiscalDashboard;
exports.getMonthDetails = getMonthDetails;
exports.searchClients = searchClients;
exports.searchSuppliers = searchSuppliers;
exports.documentsToCsvRows = documentsToCsvRows;
exports.resolveUnifiedDocXml = resolveUnifiedDocXml;
exports.getAccountingSummary = getAccountingSummary;
exports.buildAccountingXmlEntries = buildAccountingXmlEntries;
const prisma_1 = require("../lib/prisma");
const fiscalFile_service_1 = require("./fiscalFile.service");
const fiscalXmlParser_service_1 = require("./fiscalXmlParser.service");
function sumTaxes(values) {
    return values.reduce((acc, v) => acc + (v || 0), 0);
}
function buildDateRange(filters) {
    const range = {};
    if (filters.dataInicial) {
        range.gte = new Date(filters.dataInicial);
    }
    else if (filters.ano) {
        const month = filters.mes || 1;
        range.gte = filters.mes
            ? new Date(filters.ano, month - 1, 1)
            : new Date(filters.ano, 0, 1);
    }
    if (filters.dataFinal) {
        const end = new Date(filters.dataFinal);
        end.setHours(23, 59, 59, 999);
        range.lte = end;
    }
    else if (filters.ano) {
        if (filters.mes) {
            range.lte = new Date(filters.ano, filters.mes, 0, 23, 59, 59, 999);
        }
        else {
            range.lte = new Date(filters.ano, 11, 31, 23, 59, 59, 999);
        }
    }
    return range;
}
function mapStatusFilter(status) {
    const expanded = [...status];
    if (status.includes('EMITIDA') && !expanded.includes('IMPORTADO'))
        expanded.push('IMPORTADO');
    if (status.includes('CANCELADA') && !expanded.includes('CANCELADO'))
        expanded.push('CANCELADO');
    return expanded;
}
async function getCompanyCnpj(companyId) {
    const company = await prisma_1.basePrisma.company.findUnique({
        where: { id: companyId },
        select: { cnpj: true, cnpjSemMascara: true }
    });
    return company?.cnpjSemMascara || company?.cnpj?.replace(/\D/g, '') || '';
}
async function resolveXmlContent(doc) {
    if (doc.xmlContent)
        return doc.xmlContent;
    if (doc.fileUrl) {
        const buffer = await (0, fiscalFile_service_1.readFiscalFile)(doc.fileUrl);
        return buffer ? buffer.toString('utf8') : null;
    }
    return null;
}
function mapFiscalDocument(doc, companyCnpj, xmlText) {
    const parsed = xmlText ? (0, fiscalXmlParser_service_1.parseFiscalXml)(xmlText, companyCnpj) : null;
    const tipoDocumento = parsed?.tipoDocumento ?? (0, fiscalXmlParser_service_1.inferTipoDocumentoFromRecord)(doc, companyCnpj);
    const fluxoFinanceiro = parsed?.fluxoFinanceiro ?? (0, fiscalXmlParser_service_1.inferFluxoFromRecord)(doc, companyCnpj);
    const icms = parsed?.icms ?? doc.icms ?? 0;
    const ipi = parsed?.ipi ?? doc.ipi ?? 0;
    const pis = parsed?.pis ?? doc.pis ?? 0;
    const cofins = parsed?.cofins ?? doc.cofins ?? 0;
    const iss = parsed?.iss ?? doc.iss ?? 0;
    const irpj = parsed?.irpj ?? doc.irpj ?? 0;
    const csll = parsed?.csll ?? doc.csll ?? 0;
    const valorTotal = parsed?.valorTotal ?? doc.valorTotal ?? 0;
    const valorImpostos = parsed?.valorImpostos ?? doc.valorImpostos ?? sumTaxes([icms, ipi, pis, cofins, iss, irpj, csll]);
    const isSaidaFluxo = fluxoFinanceiro === 'SAIDA';
    return {
        id: doc.id,
        source: 'FiscalDocument',
        numeroNota: parsed?.numeroNota || doc.numeroNota || doc.numeroDocumento,
        serie: parsed?.serie ?? doc.serie ?? null,
        tipoDocumento,
        fluxoFinanceiro,
        chaveAcesso: parsed?.chaveAcesso ?? doc.chaveAcesso,
        clienteNome: parsed?.clienteNome ?? doc.clienteNome ?? (isSaidaFluxo ? doc.destinatarioNome : null),
        fornecedorNome: parsed?.fornecedorNome ?? doc.fornecedorNome ?? (!isSaidaFluxo ? doc.emitenteNome : null),
        dataEmissao: parsed?.dataEmissao ?? doc.dataEmissao,
        valorBruto: parsed?.valorBruto ?? doc.valorBruto ?? valorTotal,
        valorLiquido: parsed?.valorLiquido ?? doc.valorLiquido ?? Math.max(valorTotal - valorImpostos, 0),
        valorImpostos,
        valorTotal,
        icms,
        ipi,
        pis,
        cofins,
        iss,
        irpj,
        csll,
        status: (0, fiscalXmlParser_service_1.mapLegacyStatus)(doc.status),
        origemNota: doc.origemNota || 'UPLOAD_MANUAL',
        usuarioResponsavel: doc.usuarioResponsavelNome || null,
        xmlRecebido: !!(xmlText || doc.fileUrl),
        nomeArquivo: doc.nomeArquivo
    };
}
function mapNfeImport(nfe, companyCnpj) {
    const parsed = nfe.xmlOriginal ? (0, fiscalXmlParser_service_1.parseFiscalXml)(nfe.xmlOriginal, companyCnpj) : null;
    if (parsed) {
        return {
            id: nfe.id,
            source: 'NfeImport',
            numeroNota: parsed.numeroNota || nfe.numeroNf,
            serie: parsed.serie ?? nfe.serie,
            tipoDocumento: parsed.tipoDocumento,
            fluxoFinanceiro: parsed.fluxoFinanceiro,
            chaveAcesso: parsed.chaveAcesso ?? nfe.chaveAcesso,
            clienteNome: parsed.clienteNome,
            fornecedorNome: parsed.fornecedorNome ?? nfe.supplier?.razaoSocial ?? null,
            dataEmissao: parsed.dataEmissao ?? nfe.dataEmissao,
            valorBruto: parsed.valorBruto,
            valorLiquido: parsed.valorLiquido,
            valorImpostos: parsed.valorImpostos,
            valorTotal: parsed.valorTotal,
            icms: parsed.icms,
            ipi: parsed.ipi,
            pis: parsed.pis,
            cofins: parsed.cofins,
            iss: parsed.iss,
            irpj: parsed.irpj,
            csll: parsed.csll,
            status: (0, fiscalXmlParser_service_1.mapLegacyStatus)(nfe.status),
            origemNota: 'XML_IMPORTADO',
            usuarioResponsavel: null,
            xmlRecebido: true,
            nomeArquivo: `${nfe.numeroNf}.xml`
        };
    }
    const items = nfe.items || [];
    const icms = items.reduce((s, i) => s + (i.icmsValor || 0), 0);
    const ipi = items.reduce((s, i) => s + (i.ipiValor || 0), 0);
    const pis = items.reduce((s, i) => s + (i.pisValor || 0), 0);
    const cofins = items.reduce((s, i) => s + (i.cofinsValor || 0), 0);
    const iss = items.reduce((s, i) => s + (i.issValor || 0), 0);
    const valorTotal = nfe.valorTotal || 0;
    const irpj = valorTotal * 0.015;
    const csll = valorTotal * 0.01;
    const valorImpostos = icms + ipi + pis + cofins + iss + irpj + csll;
    return {
        id: nfe.id,
        source: 'NfeImport',
        numeroNota: nfe.numeroNf,
        serie: nfe.serie,
        tipoDocumento: 'ENTRADA',
        fluxoFinanceiro: 'ENTRADA',
        chaveAcesso: nfe.chaveAcesso,
        clienteNome: null,
        fornecedorNome: nfe.supplier?.razaoSocial || null,
        dataEmissao: nfe.dataEmissao,
        valorBruto: valorTotal,
        valorLiquido: Math.max(valorTotal - valorImpostos, 0),
        valorImpostos,
        valorTotal,
        icms,
        ipi,
        pis,
        cofins,
        iss,
        irpj,
        csll,
        status: (0, fiscalXmlParser_service_1.mapLegacyStatus)(nfe.status),
        origemNota: 'XML_IMPORTADO',
        usuarioResponsavel: null,
        xmlRecebido: !!nfe.xmlOriginal,
        nomeArquivo: `${nfe.numeroNf}.xml`
    };
}
function applyClientSideFilters(docs, filters) {
    return docs.filter(doc => {
        if (filters.tiposDocumento?.length && !filters.tiposDocumento.includes(doc.tipoDocumento))
            return false;
        if (filters.status?.length && !filters.status.includes(doc.status))
            return false;
        if (filters.cliente && !(doc.clienteNome || '').toLowerCase().includes(filters.cliente.toLowerCase()))
            return false;
        if (filters.fornecedor && !(doc.fornecedorNome || '').toLowerCase().includes(filters.fornecedor.toLowerCase()))
            return false;
        if (filters.numeroNota && !doc.numeroNota.includes(filters.numeroNota))
            return false;
        if (filters.chaveFiscal && !(doc.chaveAcesso || '').includes(filters.chaveFiscal))
            return false;
        if (filters.search) {
            const q = filters.search.toLowerCase();
            const haystack = [
                doc.numeroNota,
                doc.chaveAcesso,
                doc.clienteNome,
                doc.fornecedorNome,
                doc.nomeArquivo
            ].filter(Boolean).join(' ').toLowerCase();
            if (!haystack.includes(q))
                return false;
        }
        return true;
    });
}
async function fetchUnifiedDocuments(filters) {
    const companyCnpj = await getCompanyCnpj(filters.companyId);
    const dateRange = buildDateRange(filters);
    const fiscalWhere = {
        companyId: filters.companyId,
        tipo: 'XML'
    };
    if (Object.keys(dateRange).length > 0) {
        fiscalWhere.dataEmissao = dateRange;
    }
    if (filters.status?.length) {
        fiscalWhere.status = { in: mapStatusFilter(filters.status) };
    }
    if (filters.numeroNota) {
        fiscalWhere.OR = [
            { numeroNota: { contains: filters.numeroNota, mode: 'insensitive' } },
            { numeroDocumento: { contains: filters.numeroNota, mode: 'insensitive' } }
        ];
    }
    if (filters.chaveFiscal) {
        fiscalWhere.chaveAcesso = { contains: filters.chaveFiscal };
    }
    const nfeWhere = { companyId: filters.companyId };
    if (Object.keys(dateRange).length > 0) {
        nfeWhere.dataEmissao = dateRange;
    }
    if (filters.status?.length) {
        nfeWhere.status = { in: mapStatusFilter(filters.status) };
    }
    if (filters.numeroNota) {
        nfeWhere.numeroNf = { contains: filters.numeroNota, mode: 'insensitive' };
    }
    if (filters.chaveFiscal) {
        nfeWhere.chaveAcesso = { contains: filters.chaveFiscal };
    }
    const [fiscalDocs, nfeImports] = await Promise.all([
        prisma_1.basePrisma.fiscalDocument.findMany({
            where: fiscalWhere,
            orderBy: { dataEmissao: 'desc' }
        }),
        prisma_1.basePrisma.nfeImport.findMany({
            where: nfeWhere,
            include: { items: true, supplier: true },
            orderBy: { dataEmissao: 'desc' }
        })
    ]);
    const chavesFiscal = new Set(fiscalDocs.map(d => d.chaveAcesso).filter(Boolean));
    const mappedFiscal = await Promise.all(fiscalDocs.map(async (d) => mapFiscalDocument(d, companyCnpj, await resolveXmlContent(d))));
    const mappedNfe = nfeImports
        .filter(n => !n.chaveAcesso || !chavesFiscal.has(n.chaveAcesso))
        .map(n => mapNfeImport(n, companyCnpj));
    const unified = [...mappedFiscal, ...mappedNfe].sort((a, b) => {
        const da = a.dataEmissao ? new Date(a.dataEmissao).getTime() : 0;
        const db = b.dataEmissao ? new Date(b.dataEmissao).getTime() : 0;
        return db - da;
    });
    return applyClientSideFilters(unified, filters);
}
function yearFromChaveAcesso(chaveAcesso) {
    if (!chaveAcesso || chaveAcesso.length < 4)
        return null;
    const yy = parseInt(chaveAcesso.substring(2, 4), 10);
    if (Number.isNaN(yy))
        return null;
    return 2000 + yy;
}
async function getAvailableYears(companyId) {
    const [fiscalDates, nfeDates] = await Promise.all([
        prisma_1.basePrisma.fiscalDocument.findMany({
            where: { companyId, dataEmissao: { not: null } },
            select: { dataEmissao: true }
        }),
        prisma_1.basePrisma.nfeImport.findMany({
            where: { companyId },
            select: { dataEmissao: true }
        })
    ]);
    const years = new Set();
    for (const d of [...fiscalDates, ...nfeDates]) {
        if (d.dataEmissao)
            years.add(new Date(d.dataEmissao).getFullYear());
    }
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
}
function aggregateByType(docs, tipo) {
    const filtered = docs.filter(d => d.tipoDocumento === tipo);
    return {
        quantidade: filtered.length,
        valorTotal: filtered.reduce((s, d) => s + d.valorTotal, 0),
        icms: filtered.reduce((s, d) => s + d.icms, 0),
        ipi: filtered.reduce((s, d) => s + d.ipi, 0),
        pis: filtered.reduce((s, d) => s + d.pis, 0),
        cofins: filtered.reduce((s, d) => s + d.cofins, 0),
        iss: filtered.reduce((s, d) => s + d.iss, 0),
        impostos: filtered.reduce((s, d) => s + d.valorImpostos, 0)
    };
}
async function getFiscalDashboard(filters) {
    const [docs, availableYears] = await Promise.all([
        fetchUnifiedDocuments(filters),
        getAvailableYears(filters.companyId)
    ]);
    const entrada = aggregateByType(docs, 'ENTRADA');
    const saida = aggregateByType(docs, 'SAIDA');
    const servico = aggregateByType(docs, 'SERVICO');
    const totalImpostos = docs.reduce((s, d) => s + d.valorImpostos, 0);
    const receitas = docs.filter(d => d.fluxoFinanceiro === 'SAIDA').reduce((s, d) => s + d.valorTotal, 0);
    const compras = docs.filter(d => d.fluxoFinanceiro === 'ENTRADA').reduce((s, d) => s + d.valorTotal, 0);
    const resultadoBruto = receitas - compras;
    const impostosPainel = {
        iss: docs.reduce((s, d) => s + d.iss, 0),
        icms: docs.reduce((s, d) => s + d.icms, 0),
        ipi: docs.reduce((s, d) => s + d.ipi, 0),
        pis: docs.reduce((s, d) => s + d.pis, 0),
        cofins: docs.reduce((s, d) => s + d.cofins, 0),
        irpj: docs.reduce((s, d) => s + d.irpj, 0),
        csll: docs.reduce((s, d) => s + d.csll, 0)
    };
    const qtdServico = servico.quantidade || 0;
    const qtdSaida = saida.quantidade || 0;
    const qtdReceitas = docs.filter(d => d.fluxoFinanceiro === 'SAIDA').length || 0;
    const ticketMedioServicos = qtdServico > 0 ? servico.valorTotal / qtdServico : 0;
    const ticketMedioSaida = qtdSaida > 0 ? saida.valorTotal / qtdSaida : 0;
    const ticketMedioGeral = qtdReceitas > 0 ? receitas / qtdReceitas : 0;
    const margemBruta = resultadoBruto;
    const percentualImpostos = receitas > 0 ? (totalImpostos / receitas) * 100 : 0;
    const monthlyMap = new Map();
    for (const doc of docs) {
        if (!doc.dataEmissao)
            continue;
        const dt = new Date(doc.dataEmissao);
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap.has(key)) {
            monthlyMap.set(key, {
                ano: dt.getFullYear(),
                mes: dt.getMonth() + 1,
                mesLabel: dt.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
                entrada: { qtd: 0, valor: 0 },
                saida: { qtd: 0, valor: 0 },
                servico: { qtd: 0, valor: 0 },
                impostos: 0,
                icms: 0,
                ipi: 0,
                pis: 0,
                cofins: 0,
                iss: 0,
                irpj: 0,
                csll: 0,
                receitas: 0,
                compras: 0
            });
        }
        const row = monthlyMap.get(key);
        row.impostos += doc.valorImpostos;
        row.icms += doc.icms;
        row.ipi += doc.ipi;
        row.pis += doc.pis;
        row.cofins += doc.cofins;
        row.iss += doc.iss;
        row.irpj += doc.irpj;
        row.csll += doc.csll;
        if (doc.fluxoFinanceiro === 'SAIDA')
            row.receitas += doc.valorTotal;
        else
            row.compras += doc.valorTotal;
        if (doc.tipoDocumento === 'ENTRADA') {
            row.entrada.qtd++;
            row.entrada.valor += doc.valorTotal;
        }
        if (doc.tipoDocumento === 'SAIDA') {
            row.saida.qtd++;
            row.saida.valor += doc.valorTotal;
        }
        if (doc.tipoDocumento === 'SERVICO') {
            row.servico.qtd++;
            row.servico.valor += doc.valorTotal;
        }
        row.resultado = row.receitas - row.compras;
    }
    const resumoMensal = Array.from(monthlyMap.values()).sort((a, b) => {
        if (a.ano !== b.ano)
            return a.ano - b.ano;
        return a.mes - b.mes;
    });
    let crescimentoMensal = 0;
    if (resumoMensal.length >= 2) {
        const current = resumoMensal[resumoMensal.length - 1].receitas;
        const previous = resumoMensal[resumoMensal.length - 2].receitas;
        crescimentoMensal = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    }
    const chartFaturamento = resumoMensal.map(r => ({
        mes: r.mesLabel,
        servicos: r.servico.valor,
        saidas: r.saida.valor
    }));
    const chartCompras = resumoMensal.map(r => ({ mes: r.mesLabel, entradas: r.entrada.valor }));
    const chartImpostos = resumoMensal.map(r => ({
        mes: r.mesLabel,
        iss: r.iss,
        icms: r.icms,
        ipi: r.ipi,
        pis: r.pis,
        cofins: r.cofins,
        irpj: r.irpj,
        csll: r.csll
    }));
    const chartComparativo = resumoMensal.map(r => ({
        mes: r.mesLabel,
        receitas: r.receitas,
        compras: r.compras,
        impostos: r.impostos,
        resultado: r.resultado
    }));
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const start = (page - 1) * pageSize;
    const paginatedDocs = docs.slice(start, start + pageSize);
    return {
        cards: {
            entrada,
            saida,
            servico,
            totalImpostos,
            resultadoBruto
        },
        impostosPainel: {
            ...impostosPainel,
            total: totalImpostos,
            percentualFaturamento: receitas > 0 ? (totalImpostos / receitas) * 100 : 0
        },
        indicadores: {
            ticketMedioServicos,
            ticketMedioSaida,
            ticketMedioGeral,
            margemBruta,
            percentualImpostos,
            crescimentoMensal
        },
        resumoMensal,
        charts: {
            faturamento: chartFaturamento,
            compras: chartCompras,
            impostos: chartImpostos,
            comparativo: chartComparativo
        },
        documentos: paginatedDocs,
        pagination: {
            page,
            pageSize,
            total: docs.length,
            totalPages: Math.ceil(docs.length / pageSize)
        },
        availableYears,
        filteredAno: filters.ano
    };
}
async function getMonthDetails(filters, ano, mes) {
    const monthFilters = { ...filters, ano, mes };
    return fetchUnifiedDocuments(monthFilters);
}
async function searchClients(companyId, query) {
    return prisma_1.basePrisma.client.findMany({
        where: {
            companyId,
            OR: [
                { nome: { contains: query, mode: 'insensitive' } },
                { empresa: { contains: query, mode: 'insensitive' } },
                { cnpj: { contains: query, mode: 'insensitive' } }
            ]
        },
        take: 10,
        select: { id: true, nome: true, empresa: true, cnpj: true }
    });
}
async function searchSuppliers(companyId, query) {
    return prisma_1.basePrisma.supplier.findMany({
        where: {
            companyId,
            OR: [
                { razaoSocial: { contains: query, mode: 'insensitive' } },
                { nomeFantasia: { contains: query, mode: 'insensitive' } },
                { cnpj: { contains: query, mode: 'insensitive' } }
            ]
        },
        take: 10,
        select: { id: true, razaoSocial: true, nomeFantasia: true, cnpj: true }
    });
}
function documentsToCsvRows(docs) {
    let csv = '\uFEFF';
    csv += 'Numero;Serie;Tipo;Cliente;Fornecedor;Data Emissao;Valor Bruto;Valor Liquido;Impostos;Status;Chave Fiscal;Origem;Responsavel\r\n';
    for (const d of docs) {
        csv += [
            d.numeroNota,
            d.serie || '',
            d.tipoDocumento,
            d.clienteNome || '',
            d.fornecedorNome || '',
            d.dataEmissao ? new Date(d.dataEmissao).toLocaleDateString('pt-BR') : '',
            d.valorBruto.toFixed(2),
            d.valorLiquido.toFixed(2),
            d.valorImpostos.toFixed(2),
            d.status,
            d.chaveAcesso || '',
            d.origemNota,
            d.usuarioResponsavel || ''
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';') + '\r\n';
    }
    return csv;
}
const TIPO_PASTA = {
    ENTRADA: 'Entradas',
    SAIDA: 'Saidas',
    SERVICO: 'Servicos'
};
const MESES_NOME = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
function emptyTypeCell() {
    return { quantidade: 0, valorTotal: 0, comXml: 0 };
}
function monthFolderLabel(mes) {
    const nome = MESES_NOME[mes - 1] || String(mes);
    return `${String(mes).padStart(2, '0')}-${nome}`;
}
function buildXmlFileName(doc) {
    if (doc.chaveAcesso)
        return `${doc.chaveAcesso}.xml`;
    const serie = doc.serie ? `_serie${doc.serie}` : '';
    return `NF${doc.numeroNota}${serie}.xml`;
}
async function resolveUnifiedDocXml(doc) {
    if (doc.source === 'FiscalDocument') {
        const record = await prisma_1.basePrisma.fiscalDocument.findUnique({
            where: { id: doc.id },
            select: { xmlContent: true, fileUrl: true }
        });
        if (!record)
            return null;
        if (record.fileUrl) {
            const fromDisk = await (0, fiscalFile_service_1.readFiscalFile)(record.fileUrl);
            if (fromDisk)
                return fromDisk;
        }
        if (record.xmlContent)
            return Buffer.from(record.xmlContent, 'utf8');
        return null;
    }
    const nfe = await prisma_1.basePrisma.nfeImport.findUnique({
        where: { id: doc.id },
        select: { xmlOriginal: true }
    });
    if (nfe?.xmlOriginal)
        return Buffer.from(nfe.xmlOriginal, 'utf8');
    return null;
}
async function getAccountingSummary(companyId, ano) {
    const docs = await fetchUnifiedDocuments({
        companyId,
        ano,
        tiposDocumento: [],
        status: [],
        cliente: '',
        fornecedor: '',
        numeroNota: '',
        chaveFiscal: '',
        dataInicial: '',
        dataFinal: '',
        search: '',
        page: 1,
        pageSize: 100000
    });
    const map = new Map();
    for (const doc of docs) {
        if (!doc.dataEmissao)
            continue;
        const dt = new Date(doc.dataEmissao);
        const mes = dt.getMonth() + 1;
        if (!map.has(mes)) {
            map.set(mes, {
                ano,
                mes,
                mesLabel: `${MESES_NOME[mes - 1]}/${ano}`,
                tipos: {
                    ENTRADA: emptyTypeCell(),
                    SAIDA: emptyTypeCell(),
                    SERVICO: emptyTypeCell()
                },
                totalDocumentos: 0,
                totalComXml: 0
            });
        }
        const row = map.get(mes);
        const cell = row.tipos[doc.tipoDocumento];
        cell.quantidade += 1;
        cell.valorTotal += doc.valorTotal;
        if (doc.xmlRecebido) {
            cell.comXml += 1;
            row.totalComXml += 1;
        }
        row.totalDocumentos += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.mes - b.mes);
}
async function buildAccountingXmlEntries(filters) {
    const exportFilters = { ...filters, page: 1, pageSize: 100000 };
    const docs = await fetchUnifiedDocuments(exportFilters);
    const entries = [];
    const usedPaths = new Set();
    for (const doc of docs) {
        if (!doc.dataEmissao || !doc.xmlRecebido)
            continue;
        const dt = new Date(doc.dataEmissao);
        const mes = dt.getMonth() + 1;
        const ano = dt.getFullYear();
        const basePath = `${ano}/${monthFolderLabel(mes)}/${TIPO_PASTA[doc.tipoDocumento]}`;
        let fileName = buildXmlFileName(doc);
        let zipPath = `${basePath}/${fileName}`;
        let suffix = 1;
        while (usedPaths.has(zipPath)) {
            const ext = fileName.endsWith('.xml') ? '.xml' : '';
            const stem = ext ? fileName.slice(0, -4) : fileName;
            fileName = `${stem}_${suffix}${ext}`;
            zipPath = `${basePath}/${fileName}`;
            suffix += 1;
        }
        const buffer = await resolveUnifiedDocXml(doc);
        if (!buffer)
            continue;
        usedPaths.add(zipPath);
        entries.push({ zipPath, buffer });
    }
    return entries;
}
