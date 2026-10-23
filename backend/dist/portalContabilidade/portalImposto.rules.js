"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_ARQUIVOS_POR_ENVIO = exports.MAX_PDF_BYTES = exports.STATUS_IMPOSTO = exports.TIPOS_IMPOSTO = void 0;
exports.resolvePortalAccess = resolvePortalAccess;
exports.parseValorBrasileiro = parseValorBrasileiro;
exports.isValidCompetencia = isValidCompetencia;
exports.competenciasEntre = competenciasEntre;
exports.competenciaDeData = competenciaDeData;
exports.competenciaAtual = competenciaAtual;
exports.linhasResumoContasPagar = linhasResumoContasPagar;
exports.montarResumoMensal = montarResumoMensal;
exports.parseBoleto = parseBoleto;
exports.validarQuantidadeArquivos = validarQuantidadeArquivos;
exports.possuiBoleto = possuiBoleto;
exports.parseVencimento = parseVencimento;
exports.isValidCnpj = isValidCnpj;
exports.extractCnpjFromFilename = extractCnpjFromFilename;
exports.validateBulkFile = validateBulkFile;
exports.validateLoteMetadata = validateLoteMetadata;
exports.duplicateMotivo = duplicateMotivo;
exports.processBatch = processBatch;
exports.TIPOS_IMPOSTO = [
    'DAS',
    'Simples Nacional',
    'FGTS',
    'INSS',
    'IRRF',
    'PIS',
    'COFINS',
    'CSLL',
    'ICMS',
    'ISS',
    'IPI',
    'DARF',
    'GPS',
    'GARE',
    'Outros',
];
exports.STATUS_IMPOSTO = [
    'Aguardando envio',
    'Enviado',
    'Recebido',
    'Pago',
    'Em atraso',
    'Reenviado',
    'Cancelado',
];
exports.MAX_PDF_BYTES = 20 * 1024 * 1024;
function resolvePortalAccess(flags) {
    const canManage = flags.admin || flags.contabilidade;
    const canRead = canManage || flags.contasPagar || flags.contasReceber;
    return {
        canRead,
        canManage,
        scope: canManage ? 'all' : 'company',
    };
}
function parseValorBrasileiro(input) {
    if (typeof input === 'number') {
        if (!Number.isFinite(input) || input <= 0)
            return null;
        return Math.round(input * 100) / 100;
    }
    if (typeof input !== 'string')
        return null;
    const trimmed = input.trim();
    if (!trimmed)
        return null;
    let normalized = trimmed.replace(/\s/g, '').replace(/^R\$\s?/i, '');
    if (normalized.includes(',')) {
        normalized = normalized.replace(/\./g, '').replace(',', '.');
    }
    else if (/^\d{1,3}(\.\d{3})+$/.test(normalized)) {
        normalized = normalized.replace(/\./g, '');
    }
    const value = Number(normalized);
    if (!Number.isFinite(value) || value <= 0)
        return null;
    return Math.round(value * 100) / 100;
}
function isValidCompetencia(value) {
    return /^(0[1-9]|1[0-2])\/\d{4}$/.test(value);
}
const MAX_MESES_FILTRO = 240;
function competenciasEntre(de, ate) {
    const inicio = de && isValidCompetencia(de) ? de : null;
    const fim = ate && isValidCompetencia(ate) ? ate : null;
    if (!inicio && !fim)
        return null;
    const toIndex = (value) => {
        const [mes, ano] = value.split('/').map(Number);
        return ano * 12 + (mes - 1);
    };
    const first = inicio ? toIndex(inicio) : toIndex(fim) - (MAX_MESES_FILTRO - 1);
    const last = fim ? toIndex(fim) : toIndex(inicio) + (MAX_MESES_FILTRO - 1);
    if (first > last)
        return [];
    const meses = [];
    for (let index = first; index <= last && meses.length < MAX_MESES_FILTRO; index += 1) {
        const mes = String((index % 12) + 1).padStart(2, '0');
        meses.push(`${mes}/${Math.floor(index / 12)}`);
    }
    return meses;
}
function competenciaDeData(value) {
    const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(value || '');
    return match ? `${match[2]}/${match[1]}` : null;
}
function competenciaAtual(offsetMeses = 0, hoje = new Date()) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() + offsetMeses, 1);
    return `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
}
const STATUS_PAGAR_NAO_APLICAVEIS = ['CANCELADA', 'REPROVADA'];
function linhasResumoContasPagar(impostos, payables) {
    const payablePorId = new Map(payables.map((payable) => [payable.id, payable]));
    const usados = new Set();
    const rows = [];
    for (const imposto of impostos) {
        if (!imposto.payableId || usados.has(imposto.payableId))
            continue;
        const payable = payablePorId.get(imposto.payableId);
        if (!payable || STATUS_PAGAR_NAO_APLICAVEIS.includes(payable.status))
            continue;
        usados.add(payable.id);
        rows.push({ competencia: imposto.competencia, tipoImposto: imposto.tipoImposto, valor: payable.valor, quantidade: 1 });
    }
    return rows;
}
function montarResumoMensal(meses, rows) {
    const tipos = Array.from(new Set(rows.map((row) => row.tipoImposto))).sort();
    const linhas = meses.map((competencia) => ({
        competencia,
        total: 0,
        quantidade: 0,
        porTipo: {},
    }));
    const porMes = new Map(linhas.map((linha) => [linha.competencia, linha]));
    const totalPorTipo = {};
    for (const row of rows) {
        const linha = porMes.get(row.competencia);
        if (!linha)
            continue;
        linha.porTipo[row.tipoImposto] = (linha.porTipo[row.tipoImposto] || 0) + row.valor;
        linha.total += row.valor;
        linha.quantidade += row.quantidade;
        totalPorTipo[row.tipoImposto] = (totalPorTipo[row.tipoImposto] || 0) + row.valor;
    }
    return {
        tipos,
        linhas,
        totalPorTipo,
        total: linhas.reduce((sum, linha) => sum + linha.total, 0),
        quantidade: linhas.reduce((sum, linha) => sum + linha.quantidade, 0),
    };
}
exports.MAX_ARQUIVOS_POR_ENVIO = 1;
function parseBoleto(value) {
    if (typeof value === 'boolean')
        return value;
    const normalized = String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (['sim', 'true', '1', 's'].includes(normalized))
        return true;
    if (['nao', 'false', '0', 'n'].includes(normalized))
        return false;
    return null;
}
function validarQuantidadeArquivos(quantidade) {
    if (quantidade === 0)
        return 'Nenhum arquivo enviado para importação';
    if (quantidade > exports.MAX_ARQUIVOS_POR_ENVIO)
        return 'Envie apenas um arquivo por vez. A importação em lote não é permitida.';
    return null;
}
function possuiBoleto(anexo) {
    if (!anexo?.arquivo)
        return false;
    return /pdf/i.test(anexo.tipo || '') || /\.pdf$/i.test(anexo.nome || '');
}
function parseVencimento(value) {
    if (!value || typeof value !== 'string')
        return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(year, month - 1, day, 12, 0, 0);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
            return null;
        return date;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}
function isValidCnpj(cnpj) {
    if (!/^\d{14}$/.test(cnpj))
        return false;
    if (/^(\d)\1{13}$/.test(cnpj))
        return false;
    const digit = (base, factors) => {
        const sum = base.split('').reduce((acc, char, index) => acc + Number(char) * factors[index], 0);
        const mod = sum % 11;
        return mod < 2 ? 0 : 11 - mod;
    };
    const first = digit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const second = digit(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return cnpj.endsWith(`${first}${second}`);
}
function extractCnpjFromFilename(filename) {
    const match = filename.replace(/[.\-/\s]/g, '').match(/\d{14}/);
    return match ? match[0] : null;
}
function validateBulkFile(file) {
    if (!file.originalname)
        return { ok: false, motivo: 'Nome do arquivo ausente.' };
    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
        return { ok: false, motivo: 'Apenas arquivos PDF são permitidos.' };
    }
    if (file.size > exports.MAX_PDF_BYTES)
        return { ok: false, motivo: 'O arquivo excede o limite de 20 MB.' };
    return { ok: true, cnpj: extractCnpjFromFilename(file.originalname) };
}
function validateLoteMetadata(input) {
    const competencia = (input.competencia || '').trim();
    const tipoImposto = (input.tipoImposto || '').trim();
    const vencimentoRaw = (input.vencimento || '').trim();
    if (!isValidCompetencia(competencia)) {
        return { ok: false, motivo: 'Competência deve estar no formato MM/AAAA.' };
    }
    if (!exports.TIPOS_IMPOSTO.includes(tipoImposto)) {
        return { ok: false, motivo: 'Tipo de imposto inválido.' };
    }
    const vencimento = parseVencimento(vencimentoRaw);
    if (!vencimento)
        return { ok: false, motivo: 'Data de vencimento inválida.' };
    const valor = parseValorBrasileiro(input.valor) ?? 0;
    return { ok: true, competencia, tipoImposto, vencimento, valor };
}
function duplicateMotivo() {
    return 'Arquivo já importado para esta empresa, competência e tipo de imposto.';
}
async function processBatch(files, handler) {
    const sucesso = [];
    const erros = [];
    for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        try {
            sucesso.push(await handler(file, index));
        }
        catch (error) {
            erros.push({
                arquivo: file.originalname,
                motivo: error?.message || 'Erro inesperado.',
            });
        }
    }
    return { sucesso, erros };
}
