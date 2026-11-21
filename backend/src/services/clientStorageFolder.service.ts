import { basePrisma } from '../lib/prisma';
import { S3Service } from './s3.service';

/**
 * Pasta de cada cliente no armazenamento de arquivos:
 *
 *   clientes/<cnpj-ou-cpf>-<nome>-<id8>/
 *     notas-fiscais/AAAA/MM/OS-<n>/<arquivo>
 *     comprovantes/AAAA/MM/OS-<n>/<arquivo>
 *
 * O caminho é definido uma única vez e gravado no cliente (pastaStorage), para
 * não mudar se o nome ou o documento forem editados depois.
 */
export const CLIENT_SUBFOLDERS = { notasFiscais: 'notas-fiscais/', comprovantes: 'comprovantes/' } as const;

const slug = (v: string) => v
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 40)
  .replace(/-+$/g, '');

export function buildClientFolder(client: { id: string; nome?: string | null; empresa?: string | null; cnpj?: string | null }) {
  const doc = (client.cnpj || '').replace(/\D/g, '');
  const name = slug(client.empresa || client.nome || '') || 'cliente';
  const parts = [doc || null, name, client.id.replace(/-/g, '').slice(0, 8)].filter(Boolean);
  return `clientes/${parts.join('-')}/`;
}

/** Subpasta do tipo de anexo da OS. */
export function attachmentSubfolder(tipo: string) {
  return tipo.startsWith('COMPROVANTE') ? CLIENT_SUBFOLDERS.comprovantes : CLIENT_SUBFOLDERS.notasFiscais;
}

/**
 * Garante a pasta do cliente: define o caminho (se ainda não tiver) e cria as
 * pastas no storage. Nunca lança erro: falha de storage só adia a criação das
 * pastas (feita de novo no próximo upload ou na inicialização do servidor).
 * Retorna o caminho da pasta, ou null se o cliente não existir.
 */
export async function ensureClientStorageFolder(clientId: string): Promise<string | null> {
  const client = await basePrisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, nome: true, empresa: true, cnpj: true, pastaStorage: true, pastaStorageCriadaEm: true },
  });
  if (!client) return null;

  let folder = client.pastaStorage;
  if (!folder) {
    folder = buildClientFolder(client);
    await basePrisma.client.update({ where: { id: client.id }, data: { pastaStorage: folder } });
  }

  if (!client.pastaStorageCriadaEm) {
    if (!S3Service.isConfigured()) return folder;
    try {
      await S3Service.createFolder(folder);
      await S3Service.createFolder(`${folder}${CLIENT_SUBFOLDERS.notasFiscais}`);
      await S3Service.createFolder(`${folder}${CLIENT_SUBFOLDERS.comprovantes}`);
      await basePrisma.client.update({ where: { id: client.id }, data: { pastaStorageCriadaEm: new Date() } });
    } catch (error: any) {
      console.error(`[Storage] Não foi possível criar a pasta do cliente ${client.id} (${folder}): ${error?.name || ''} ${error?.message || error}`);
    }
  }
  return folder;
}

/** Dispara a criação da pasta sem bloquear a resposta (cadastro de cliente). */
export function ensureClientStorageFolderInBackground(clientId: string) {
  ensureClientStorageFolder(clientId).catch(error =>
    console.error(`[Storage] Falha ao preparar a pasta do cliente ${clientId}:`, error?.message || error));
}

/**
 * Cria as pastas dos clientes que ainda não têm (clientes antigos ou criados
 * enquanto o storage estava indisponível). Executado na inicialização do servidor.
 */
export async function backfillClientStorageFolders(batchSize = 200) {
  if (!S3Service.isConfigured()) {
    console.log('[Storage] Armazenamento não configurado: criação das pastas de clientes adiada.');
    return { processados: 0 };
  }
  let processados = 0;
  let lastId: string | undefined;
  // Paginação por id para não repetir clientes que falharem
  for (;;) {
    const pending = await basePrisma.client.findMany({
      where: { pastaStorageCriadaEm: null, ...(lastId ? { id: { gt: lastId } } : {}) },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: batchSize,
    });
    if (pending.length === 0) break;
    for (const c of pending) {
      await ensureClientStorageFolder(c.id);
      processados++;
    }
    lastId = pending[pending.length - 1].id;
  }
  if (processados) console.log(`[Storage] Pastas de clientes verificadas: ${processados}`);
  return { processados };
}
