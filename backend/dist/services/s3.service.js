"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Service = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const uuid_1 = require("uuid");
// Utilizando variáveis de ambiente (com fallbacks para evitar erros de tipagem, mas o ideal é que estejam preenchidas)
const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT || 'https://t3.storageapi.dev';
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'adaptable-room-82ltb57u7j';
const STORAGE_ACCESS_KEY = process.env.STORAGE_ACCESS_KEY || '';
const STORAGE_SECRET_KEY = process.env.STORAGE_SECRET_KEY || '';
const GUIA_IMPOSTO_ENDPOINT = process.env.GUIA_IMPOSTO_STORAGE_ENDPOINT || 'https://t3.storageapi.dev';
const GUIA_IMPOSTO_BUCKET = process.env.GUIA_IMPOSTO_STORAGE_BUCKET || 'stocked-crate-y-ubqvwuxrv';
const GUIA_IMPOSTO_ACCESS_KEY = process.env.GUIA_IMPOSTO_STORAGE_ACCESS_KEY || '';
const GUIA_IMPOSTO_SECRET_KEY = process.env.GUIA_IMPOSTO_STORAGE_SECRET_KEY || '';
const GUIA_IMPOSTO_PREFIX = 'guia_imposto';
const s3Client = new client_s3_1.S3Client({
    endpoint: STORAGE_ENDPOINT,
    forcePathStyle: true,
    region: 'auto',
    credentials: {
        accessKeyId: STORAGE_ACCESS_KEY,
        secretAccessKey: STORAGE_SECRET_KEY,
    },
});
const guiaImpostoClient = new client_s3_1.S3Client({
    endpoint: GUIA_IMPOSTO_ENDPOINT,
    forcePathStyle: true,
    region: 'auto',
    credentials: {
        accessKeyId: GUIA_IMPOSTO_ACCESS_KEY,
        secretAccessKey: GUIA_IMPOSTO_SECRET_KEY,
    },
});
class S3Service {
    /**
     * Faz upload de um arquivo com retentativas
     */
    static async uploadFile(fileBuffer, originalName, mimeType, quoteNumber) {
        const uuid = (0, uuid_1.v4)();
        const safeOriginalName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_'); // Previne path traversal e caracteres inválidos
        const date = new Date();
        const ano = date.getFullYear();
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const key = `nf/${ano}/${mes}/OS-${quoteNumber}/${uuid}-${safeOriginalName}`;
        const size = fileBuffer.length;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: STORAGE_BUCKET,
            Key: key,
            Body: fileBuffer,
            ContentType: mimeType,
        });
        // Timeout e Retry mechanism (3 tentativas)
        let attempts = 0;
        const maxAttempts = 3;
        const timeoutMs = 30000;
        while (attempts < maxAttempts) {
            try {
                attempts++;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
                const response = await s3Client.send(command, { abortSignal: controller.signal });
                clearTimeout(timeoutId);
                return {
                    bucket: STORAGE_BUCKET,
                    key,
                    contentType: mimeType,
                    size,
                    etag: response.ETag,
                };
            }
            catch (error) {
                if (attempts >= maxAttempts) {
                    throw new Error(`Upload falhou após ${maxAttempts} tentativas: ${error.message}`);
                }
                console.warn(`Tentativa ${attempts} falhou, retentando upload para S3...`);
                // Opcional: sleep antes do retry
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        throw new Error('Upload falhou inesperadamente.');
    }
    /**
     * Faz upload de anexos de Impostos do Portal Contabilidade
     */
    static async uploadImpostoFile(fileBuffer, originalName, mimeType, impostoId, competencia // Ex: "07/2026"
    ) {
        const uuid = (0, uuid_1.v4)();
        const safeOriginalName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const safeCompetencia = competencia.replace(/\//g, '-');
        const key = `${GUIA_IMPOSTO_PREFIX}/${safeCompetencia}/${impostoId}/${uuid}-${safeOriginalName}`;
        const size = fileBuffer.length;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: GUIA_IMPOSTO_BUCKET,
            Key: key,
            Body: fileBuffer,
            ContentType: mimeType,
        });
        let attempts = 0;
        const maxAttempts = 3;
        const timeoutMs = 30000;
        while (attempts < maxAttempts) {
            try {
                attempts++;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
                const response = await guiaImpostoClient.send(command, { abortSignal: controller.signal });
                clearTimeout(timeoutId);
                return {
                    bucket: GUIA_IMPOSTO_BUCKET,
                    key,
                    contentType: mimeType,
                    size,
                    etag: response.ETag,
                };
            }
            catch (error) {
                if (attempts >= maxAttempts) {
                    throw new Error(`Upload falhou após ${maxAttempts} tentativas: ${error.message}`);
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        throw new Error('Upload falhou inesperadamente.');
    }
    /**
     * Exclui um arquivo do S3
     */
    static async deleteFile(key) {
        const isGuiaImposto = key.startsWith(`${GUIA_IMPOSTO_PREFIX}/`);
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket: isGuiaImposto ? GUIA_IMPOSTO_BUCKET : STORAGE_BUCKET,
            Key: key,
        });
        try {
            await (isGuiaImposto ? guiaImpostoClient : s3Client).send(command);
            return true;
        }
        catch (error) {
            console.error(`Erro ao deletar arquivo do S3 (Key: ${key}):`, error);
            throw error;
        }
    }
    /**
     * Gera uma URL pré-assinada para visualização/download de um arquivo.
     * A URL expira por padrão em 1 hora (3600 segundos).
     */
    static async getObjectBuffer(key) {
        const isGuiaImposto = key.startsWith(`${GUIA_IMPOSTO_PREFIX}/`);
        const command = new client_s3_1.GetObjectCommand({
            Bucket: isGuiaImposto ? GUIA_IMPOSTO_BUCKET : STORAGE_BUCKET,
            Key: key,
        });
        const response = await (isGuiaImposto ? guiaImpostoClient : s3Client).send(command);
        if (!response.Body) {
            throw new Error('Arquivo não encontrado no armazenamento.');
        }
        return Buffer.from(await response.Body.transformToByteArray());
    }
    static async getPresignedUrl(key, expiresIn = 3600) {
        const isGuiaImposto = key.startsWith(`${GUIA_IMPOSTO_PREFIX}/`);
        const command = new client_s3_1.GetObjectCommand({
            Bucket: isGuiaImposto ? GUIA_IMPOSTO_BUCKET : STORAGE_BUCKET,
            Key: key,
        });
        try {
            return await (0, s3_request_presigner_1.getSignedUrl)(isGuiaImposto ? guiaImpostoClient : s3Client, command, { expiresIn });
        }
        catch (error) {
            console.error(`Erro ao gerar pre-signed URL (Key: ${key}):`, error);
            throw error;
        }
    }
}
exports.S3Service = S3Service;
