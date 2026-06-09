import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const FISCAL_UPLOAD_ROOT = process.env.FISCAL_UPLOAD_DIR
  || path.join(process.cwd(), 'uploads', 'fiscal');

export function decodeBase64Content(content: string): Buffer {
  if (content.includes('base64,')) {
    return Buffer.from(content.split('base64,')[1], 'base64');
  }
  const trimmed = content.trim();
  if (/^[a-zA-Z0-9+/=\s]+$/.test(trimmed) && trimmed.length % 4 === 0) {
    return Buffer.from(trimmed.replace(/\s/g, ''), 'base64');
  }
  return Buffer.from(content, 'utf8');
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function ensureFiscalUploadDir(companyId: string): Promise<string> {
  const dir = path.join(FISCAL_UPLOAD_ROOT, companyId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function saveFiscalFile(
  companyId: string,
  fileName: string,
  content: Buffer
): Promise<{ fileUrl: string; absolutePath: string }> {
  const dir = await ensureFiscalUploadDir(companyId);
  const safeName = sanitizeFileName(fileName);
  const storedName = `${randomUUID()}_${safeName}`;
  const absolutePath = path.join(dir, storedName);
  await fs.writeFile(absolutePath, content);

  const fileUrl = path.join('uploads', 'fiscal', companyId, storedName).replace(/\\/g, '/');
  return { fileUrl, absolutePath };
}

export function resolveFiscalFilePath(fileUrl: string): string {
  if (path.isAbsolute(fileUrl)) {
    return fileUrl;
  }
  return path.join(process.cwd(), fileUrl);
}

export async function readFiscalFile(fileUrl: string): Promise<Buffer | null> {
  try {
    const absolutePath = resolveFiscalFilePath(fileUrl);
    return await fs.readFile(absolutePath);
  } catch {
    return null;
  }
}

export async function deleteFiscalFile(fileUrl: string | null | undefined): Promise<void> {
  if (!fileUrl) return;

  try {
    const absolutePath = resolveFiscalFilePath(fileUrl);
    await fs.unlink(absolutePath);
  } catch {
    // Arquivo pode já ter sido removido ou nunca existido (registros legados)
  }
}
