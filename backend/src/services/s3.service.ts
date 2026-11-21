import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

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

const s3Client = new S3Client({
  endpoint: STORAGE_ENDPOINT,
  forcePathStyle: true,
  region: 'auto',
  credentials: {
    accessKeyId: STORAGE_ACCESS_KEY,
    secretAccessKey: STORAGE_SECRET_KEY,
  },
});

const guiaImpostoClient = new S3Client({
  endpoint: GUIA_IMPOSTO_ENDPOINT,
  forcePathStyle: true,
  region: 'auto',
  credentials: {
    accessKeyId: GUIA_IMPOSTO_ACCESS_KEY,
    secretAccessKey: GUIA_IMPOSTO_SECRET_KEY,
  },
});

export class S3Service {
  /**
   * Faz upload de um arquivo com retentativas
   */
  static async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    quoteNumber: string | number,
    /** Pasta de destino (ex.: clientes/<cliente>/notas-fiscais/). Sem ela, usa nf/ como antes. */
    folderPrefix?: string
  ): Promise<{ bucket: string; key: string; contentType: string; size: number; etag?: string }> {
    const uuid = uuidv4();
    const safeOriginalName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_'); // Previne path traversal e caracteres inválidos
    const date = new Date();
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    
    const base = folderPrefix ? (folderPrefix.endsWith('/') ? folderPrefix : `${folderPrefix}/`) : 'nf/';
    const key = `${base}${ano}/${mes}/OS-${quoteNumber}/${uuid}-${safeOriginalName}`;
    const size = fileBuffer.length;

    const command = new PutObjectCommand({
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
      } catch (error: any) {
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
  static async uploadImpostoFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    impostoId: string,
    competencia: string // Ex: "07/2026"
  ): Promise<{ bucket: string; key: string; contentType: string; size: number; etag?: string }> {
    const uuid = uuidv4();
    const safeOriginalName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const safeCompetencia = competencia.replace(/\//g, '-');
    
    const key = `${GUIA_IMPOSTO_PREFIX}/${safeCompetencia}/${impostoId}/${uuid}-${safeOriginalName}`;
    const size = fileBuffer.length;

    const command = new PutObjectCommand({
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
      } catch (error: any) {
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
  static async deleteFile(key: string): Promise<boolean> {
    const isGuiaImposto = key.startsWith(`${GUIA_IMPOSTO_PREFIX}/`);
    const command = new DeleteObjectCommand({
      Bucket: isGuiaImposto ? GUIA_IMPOSTO_BUCKET : STORAGE_BUCKET,
      Key: key,
    });

    try {
      await (isGuiaImposto ? guiaImpostoClient : s3Client).send(command);
      return true;
    } catch (error) {
      console.error(`Erro ao deletar arquivo do S3 (Key: ${key}):`, error);
      throw error;
    }
  }

  /**
   * Gera uma URL pré-assinada para visualização/download de um arquivo.
   * A URL expira por padrão em 1 hora (3600 segundos).
   */
  static async getObjectBuffer(key: string): Promise<Buffer> {
    const isGuiaImposto = key.startsWith(`${GUIA_IMPOSTO_PREFIX}/`);
    const command = new GetObjectCommand({
      Bucket: isGuiaImposto ? GUIA_IMPOSTO_BUCKET : STORAGE_BUCKET,
      Key: key,
    });

    const response = await (isGuiaImposto ? guiaImpostoClient : s3Client).send(command);
    if (!response.Body) {
      throw new Error('Arquivo não encontrado no armazenamento.');
    }

    return Buffer.from(await response.Body.transformToByteArray());
  }

  /**
   * Cria uma "pasta" no armazenamento principal (objeto vazio terminado em "/"),
   * que aparece como diretório no painel do storage. Idempotente.
   */
  static async createFolder(prefix: string): Promise<void> {
    const key = prefix.endsWith('/') ? prefix : `${prefix}/`;
    await s3Client.send(new PutObjectCommand({ Bucket: STORAGE_BUCKET, Key: key, Body: new Uint8Array(0), ContentLength: 0 }));
  }

  /** Indica se as credenciais do armazenamento principal estão configuradas (STORAGE_ACCESS_KEY/SECRET_KEY). */
  static isConfigured(): boolean {
    return !!STORAGE_ACCESS_KEY && !!STORAGE_SECRET_KEY;
  }

  /**
   * Confere se o objeto existe no armazenamento principal, tentando o bucket
   * configurado e depois os buckets informados (ex.: o gravado no anexo).
   * Retorna o bucket onde o arquivo está, ou o motivo da falha.
   */
  static async locateObject(key: string, extraBuckets: (string | null | undefined)[] = []):
    Promise<{ ok: true; bucket: string } | { ok: false; reason: 'not_configured' | 'not_found' | 'error'; detail?: string }> {
    if (!S3Service.isConfigured()) return { ok: false, reason: 'not_configured' };
    const buckets = Array.from(new Set([STORAGE_BUCKET, ...extraBuckets].filter(Boolean) as string[]));
    let lastError = '';
    let sawError = false;
    for (const bucket of buckets) {
      try {
        await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return { ok: true, bucket };
      } catch (error: any) {
        const code = error?.name || error?.Code || '';
        const status = error?.$metadata?.httpStatusCode;
        lastError = `${bucket}: ${code || status || error?.message}`;
        if (!(status === 404 || ['NotFound', 'NoSuchKey', 'NoSuchBucket'].includes(code))) sawError = true;
      }
    }
    return { ok: false, reason: sawError ? 'error' : 'not_found', detail: lastError };
  }

  /** URL pré-assinada em um bucket específico do armazenamento principal. */
  static async getPresignedUrlInBucket(bucket: string, key: string, expiresIn: number = 300): Promise<string> {
    return getSignedUrl(s3Client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
  }

  static async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const isGuiaImposto = key.startsWith(`${GUIA_IMPOSTO_PREFIX}/`);
    const command = new GetObjectCommand({
      Bucket: isGuiaImposto ? GUIA_IMPOSTO_BUCKET : STORAGE_BUCKET,
      Key: key,
    });

    try {
      return await getSignedUrl(isGuiaImposto ? guiaImpostoClient : s3Client, command, { expiresIn });
    } catch (error) {
      console.error(`Erro ao gerar pre-signed URL (Key: ${key}):`, error);
      throw error;
    }
  }
}
