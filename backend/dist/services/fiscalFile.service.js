"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeBase64Content = decodeBase64Content;
exports.ensureFiscalUploadDir = ensureFiscalUploadDir;
exports.saveFiscalFile = saveFiscalFile;
exports.resolveFiscalFilePath = resolveFiscalFilePath;
exports.readFiscalFile = readFiscalFile;
exports.deleteFiscalFile = deleteFiscalFile;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
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
