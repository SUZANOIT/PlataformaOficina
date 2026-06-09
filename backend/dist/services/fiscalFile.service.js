"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeBase64Content = decodeBase64Content;
exports.parsePdfText = parsePdfText;
exports.parsePdfBuffer = parsePdfBuffer;
exports.ensureFiscalUploadDir = ensureFiscalUploadDir;
exports.saveFiscalFile = saveFiscalFile;
exports.resolveFiscalFilePath = resolveFiscalFilePath;
exports.readFiscalFile = readFiscalFile;
exports.deleteFiscalFile = deleteFiscalFile;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const pdf_parse_1 = require("pdf-parse");
const FISCAL_UPLOAD_ROOT = process.env.FISCAL_UPLOAD_DIR
    || path_1.default.join(process.cwd(), 'uploads', 'fiscal');
function decodeBase64Content(content) {
    if (content.includes('base64,')) {
        return Buffer.from(content.split('base64,')[1], 'base64');
    }
    const trimmed = content.trim();
    if (/^[a-zA-Z0-9+/=\s]+$/.test(trimmed) && trimmed.length % 4 === 0) {
        return Buffer.from(trimmed.replace(/\s/g, ''), 'base64');
    }
    return Buffer.from(content, 'utf8');
}
function sanitizeFileName(fileName) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}
function formatCnpj(cnpj) {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14)
        return cnpj;
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}
function parseBrazilianNumber(value) {
    const normalized = value.trim().replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}
function parseBrazilianDate(value) {
    const brMatch = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (brMatch) {
        const [, day, month, year] = brMatch;
        const date = new Date(`${year}-${month}-${day}T12:00:00`);
        if (!Number.isNaN(date.getTime()))
            return date;
    }
    const isoMatch = value.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        const date = new Date(`${isoMatch[0]}T12:00:00`);
        if (!Number.isNaN(date.getTime()))
            return date;
    }
    return null;
}
function parsePdfText(text) {
    try {
        const normalizedText = text.replace(/\s+/g, ' ').trim();
        const digitsOnly = normalizedText.replace(/\D/g, '');
        const chaveMatch = digitsOnly.match(/(\d{44})/);
        const chaveAcesso = chaveMatch ? chaveMatch[1] : null;
        const numeroMatch = normalizedText.match(/N[ºo°.]\s*(\d{1,9})/i) ||
            normalizedText.match(/NRO\.?\s*(\d{1,9})/i) ||
            normalizedText.match(/NOTA\s+FISCAL\s*(?:N[ºo°.]?\s*)?(\d{1,9})/i);
        const numeroDocumento = numeroMatch ? `NF-${numeroMatch[1]}` : `NF-${Math.floor(100000 + Math.random() * 900000)}`;
        const cnpjMatches = normalizedText.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g) || [];
        const emitenteCnpj = cnpjMatches[0] || '00.000.000/0001-00';
        const destinatarioCnpj = cnpjMatches[1] || cnpjMatches[0] || '00.000.000/0001-99';
        const valorMatch = normalizedText.match(/VALOR\s+TOTAL\s+(?:DA\s+NOTA|DOS\s+PRODUTOS|DA\s+NFS-?E)?[\s:]*R?\$?\s*([\d.,]+)/i) ||
            normalizedText.match(/TOTAL\s+(?:DA\s+NOTA|GERAL|R?\$)?[\s:]*R?\$?\s*([\d.,]+)/i);
        const valorTotal = valorMatch ? parseBrazilianNumber(valorMatch[1]) : 0;
        const dateMatch = normalizedText.match(/DATA\s+(?:DE\s+)?EMISS[ÃA]O[\s:]*(\d{2}\/\d{2}\/\d{4})/i) ||
            normalizedText.match(/EMISS[ÃA]O[\s:]*(\d{2}\/\d{2}\/\d{4})/i);
        const dataEmissao = dateMatch ? (parseBrazilianDate(dateMatch[1]) || new Date()) : new Date();
        const emitenteBlock = normalizedText.match(/(?:EMITENTE|REMETENTE|PRESTADOR(?:\s+DE\s+SERVI[ÇC]OS)?)[:\s-]+(.{10,120}?)(?:DESTINAT|DESTINATÁRIO|TOMADOR|CNPJ)/i);
        const destinatarioBlock = normalizedText.match(/(?:DESTINAT[ÁA]RIO|TOMADOR(?:\s+DO\s+SERVI[ÇC]O)?|CLIENTE)[:\s-]+(.{10,120}?)(?:VALOR|TOTAL|PRODUTOS|DISCRIMINA)/i);
        const emitenteNome = emitenteBlock
            ? emitenteBlock[1].replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, '').trim().slice(0, 120) || 'Emitente não identificado'
            : 'Emitente não identificado';
        const destinatarioNome = destinatarioBlock
            ? destinatarioBlock[1].replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, '').trim().slice(0, 120) || 'Destinatário não identificado'
            : 'Destinatário não identificado';
        return {
            numeroDocumento,
            chaveAcesso,
            dataEmissao,
            valorTotal,
            emitenteNome,
            emitenteCnpj: formatCnpj(emitenteCnpj),
            destinatarioNome,
            destinatarioCnpj: formatCnpj(destinatarioCnpj)
        };
    }
    catch (error) {
        console.error('Erro ao extrair metadados do PDF:', error);
        return null;
    }
}
async function parsePdfBuffer(buffer) {
    if (buffer.slice(0, 5).toString() !== '%PDF-') {
        return null;
    }
    const parser = new pdf_parse_1.PDFParse({ data: buffer });
    try {
        const result = await parser.getText();
        return parsePdfText(result.text || '');
    }
    finally {
        await parser.destroy();
    }
}
async function ensureFiscalUploadDir(companyId) {
    const dir = path_1.default.join(FISCAL_UPLOAD_ROOT, companyId);
    await promises_1.default.mkdir(dir, { recursive: true });
    return dir;
}
async function saveFiscalFile(companyId, fileName, content) {
    const dir = await ensureFiscalUploadDir(companyId);
    const safeName = sanitizeFileName(fileName);
    const storedName = `${(0, crypto_1.randomUUID)()}_${safeName}`;
    const absolutePath = path_1.default.join(dir, storedName);
    await promises_1.default.writeFile(absolutePath, content);
    const fileUrl = path_1.default.join('uploads', 'fiscal', companyId, storedName).replace(/\\/g, '/');
    return { fileUrl, absolutePath };
}
function resolveFiscalFilePath(fileUrl) {
    if (path_1.default.isAbsolute(fileUrl)) {
        return fileUrl;
    }
    return path_1.default.join(process.cwd(), fileUrl);
}
async function readFiscalFile(fileUrl) {
    try {
        const absolutePath = resolveFiscalFilePath(fileUrl);
        return await promises_1.default.readFile(absolutePath);
    }
    catch {
        return null;
    }
}
async function deleteFiscalFile(fileUrl) {
    if (!fileUrl)
        return;
    try {
        const absolutePath = resolveFiscalFilePath(fileUrl);
        await promises_1.default.unlink(absolutePath);
    }
    catch {
        // Arquivo pode já ter sido removido ou nunca existido (registros legados)
    }
}
