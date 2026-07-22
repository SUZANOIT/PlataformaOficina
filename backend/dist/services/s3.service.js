"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Service = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const uuid_1 = require("uuid");
// Utilizando variáveis de ambiente (com fallbacks para evitar erros de tipagem, mas o ideal é que estejam preenchidas)
const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT || 'https://t3.storageapi.dev';
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'adaptable-room-82ltb57u7j';
const STORAGE_ACCESS_KEY = process.env.STORAGE_ACCESS_KEY || '';
const STORAGE_SECRET_KEY = process.env.STORAGE_SECRET_KEY || '';
const s3Client = new client_s3_1.S3Client({
    endpoint: STORAGE_ENDPOINT,
    forcePathStyle: true,
    region: 'auto',
    credentials: {
        accessKeyId: STORAGE_ACCESS_KEY,
        secretAccessKey: STORAGE_SECRET_KEY,
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
     * Exclui um arquivo do S3
     */
    static async deleteFile(key) {
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket: STORAGE_BUCKET,
            Key: key,
        });
        try {
            await s3Client.send(command);
            return true;
        }
        catch (error) {
            console.error(`Erro ao deletar arquivo do S3 (Key: ${key}):`, error);
            throw error;
        }
    }
}
exports.S3Service = S3Service;
