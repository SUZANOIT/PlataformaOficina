/**
 * Pastas de clientes no storage.
 *
 * Parte 1 (sempre): regras de nome da pasta.
 * Parte 2 (com STORAGE_* e banco de teste): integração com Postgres + S3.
 *
 *   CLIENT_FOLDER_TEST_DB=1 DATABASE_URL=... STORAGE_ENDPOINT=... STORAGE_BUCKET=... \
 *   STORAGE_ACCESS_KEY=... STORAGE_SECRET_KEY=... npx ts-node --transpile-only src/services/clientStorageFolder.test.ts
 */
import assert from 'assert';
import { AddressInfo } from 'net';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { buildClientFolder, attachmentSubfolder } from './clientStorageFolder.service';

const results: { name: string; ok: boolean; err?: string }[] = [];
async function test(name: string, fn: () => Promise<void> | void) {
  try { await fn(); results.push({ name, ok: true }); } catch (e: any) { results.push({ name, ok: false, err: e?.message || String(e) }); }
}

async function main() {
  // ---------------- Regras de nome ----------------
  await test('Pasta com CNPJ, nome e id (sem acentos)', () => {
    const f = buildClientFolder({ id: '1a2b3c4d-5e6f-7a8b-9c0d-ffffffffffff', empresa: 'Transportes São João LTDA', cnpj: '12.345.678/0001-95' });
    assert.strictEqual(f, 'clientes/12345678000195-transportes-sao-joao-ltda-1a2b3c4d/');
  });
  await test('Cliente sem documento usa o nome', () => {
    assert.strictEqual(buildClientFolder({ id: 'abcdef12-0000-0000-0000-000000000000', nome: 'José da Silva' }), 'clientes/jose-da-silva-abcdef12/');
  });
  await test('Nome sem letras válidas ou longo', () => {
    assert.strictEqual(buildClientFolder({ id: 'abcdef12-0000', nome: '###' }), 'clientes/cliente-abcdef12/');
    const long = buildClientFolder({ id: 'abcdef12-0000', nome: 'a'.repeat(100) });
    assert.ok(long.length < 70 && !long.includes('/..'));
  });
  await test('Caminho não permite sair da pasta (../)', () => {
    const f = buildClientFolder({ id: 'abcdef12-0000', nome: '../../etc/passwd' });
    assert.ok(!f.includes('..') && f.split('/').length === 3, f);
  });
  await test('Subpasta por tipo de anexo', () => {
    assert.strictEqual(attachmentSubfolder('NF_PDF'), 'notas-fiscais/');
    assert.strictEqual(attachmentSubfolder('NF_XML'), 'notas-fiscais/');
    assert.strictEqual(attachmentSubfolder('NF_PECA'), 'notas-fiscais/');
    assert.strictEqual(attachmentSubfolder('COMPROVANTE_CIELO'), 'comprovantes/');
    assert.strictEqual(attachmentSubfolder('COMPROVANTE_POS'), 'comprovantes/');
  });

  // ---------------- Integração ----------------
  if (process.env.CLIENT_FOLDER_TEST_DB === '1' && process.env.STORAGE_ACCESS_KEY) {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'client-folder-test';
    const { app } = require('../app');
    const { basePrisma: db } = require('../lib/prisma');
    const { backfillClientStorageFolders } = require('./clientStorageFolder.service');
    const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({
      endpoint: process.env.STORAGE_ENDPOINT, forcePathStyle: true, region: 'auto',
      credentials: { accessKeyId: process.env.STORAGE_ACCESS_KEY, secretAccessKey: process.env.STORAGE_SECRET_KEY },
    });
    const listKeys = async (prefix: string) => ((await s3.send(new ListObjectsV2Command({ Bucket: process.env.STORAGE_BUCKET, Prefix: prefix }))).Contents || []).map((o: any) => o.Key);
    const waitFor = async (fn: () => Promise<boolean>, ms = 5000) => {
      const end = Date.now() + ms;
      while (Date.now() < end) { if (await fn()) return true; await new Promise(r => setTimeout(r, 100)); }
      return false;
    };

    const server = app.listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const sfx = Math.random().toString(36).slice(2, 8);
    const company = await db.company.create({ data: { razaoSocial: `Oficina ${sfx}`, cnpj: `F${sfx}`, cnpjSemMascara: `F${sfx}` } });
    const admin = await db.user.create({ data: { name: 'Admin', email: `admin.${sfx}@t.local`, password: await bcrypt.hash('x', 4), roleAdmin: true, companyId: company.id } });
    const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET!);
    const auth = { Authorization: `Bearer ${token}` };

    let clientId = '';
    let folder = '';
    await test('Cadastrar cliente cria a pasta no storage (com notas-fiscais/ e comprovantes/)', async () => {
      const r = await fetch(`${base}/registry/clients`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: 'Frota Teste', empresa: 'Frota Teste LTDA', cnpj: '11.222.333/0001-81' }) });
      const body = await r.text();
      assert.strictEqual(r.status, 201, body);
      clientId = JSON.parse(body).id;
      assert.ok(await waitFor(async () => !!(await db.client.findUnique({ where: { id: clientId } })).pastaStorageCriadaEm), 'pasta não criada');
      const c = await db.client.findUnique({ where: { id: clientId } });
      folder = c.pastaStorage;
      assert.ok(folder.startsWith('clientes/11222333000181-frota-teste-ltda-'), folder);
      const keys = await listKeys(folder);
      assert.ok(keys.includes(folder) && keys.includes(`${folder}notas-fiscais/`) && keys.includes(`${folder}comprovantes/`), JSON.stringify(keys));
    });

    let quoteId = '';
    await test('NF anexada na OS é gravada em notas-fiscais/ do cliente; comprovante em comprovantes/', async () => {
      const q = await db.quote.create({ data: { companyId: company.id, clientId, condicaoPagamento: 'À vista', validade: '7d', subtotal: 100, total: 100, status: 'Pago', items: { create: [{ descricao: 'Serviço', quantidade: 1, valorUnitario: 100, valorTotal: 100, tipo: 'Mão de Obra' }] } } });
      quoteId = q.id;
      const send = async (tipo: string, name: string, type: string) => {
        const fd = new FormData();
        fd.append('tipo', tipo);
        fd.append('file', new Blob(['%PDF-1.4 teste'], { type }), name);
        const r = await fetch(`${base}/quotes/${q.id}/s3-attachments`, { method: 'POST', headers: auth, body: fd });
        const body = await r.text();
        assert.strictEqual(r.status, 201, body);
        return JSON.parse(body);
      };
      const nf = await send('NF_PDF', 'nota fiscal.pdf', 'application/pdf');
      assert.ok(nf.arquivo.startsWith(`${folder}notas-fiscais/`) && nf.arquivo.includes(`/OS-${q.numeroOrcamento}/`), nf.arquivo);
      assert.strictEqual(nf.bucket, process.env.STORAGE_BUCKET);
      const comp = await send('COMPROVANTE_POS', 'comprovante.png', 'image/png');
      assert.ok(comp.arquivo.startsWith(`${folder}comprovantes/`), comp.arquivo);
      const keys = await listKeys(folder);
      assert.ok(keys.includes(nf.arquivo) && keys.includes(comp.arquivo));
    });

    await test('Cliente sem pasta (antigo ou criado com storage fora) recebe a pasta no primeiro anexo', async () => {
      const old = await db.client.create({ data: { nome: 'Cliente Antigo', cnpj: '99888777000166', companyId: company.id } });
      assert.strictEqual(old.pastaStorage, null);
      const q = await db.quote.create({ data: { companyId: company.id, clientId: old.id, condicaoPagamento: 'À vista', validade: '7d', subtotal: 1, total: 1, status: 'Pago', items: { create: [{ descricao: 'S', quantidade: 1, valorUnitario: 1, valorTotal: 1, tipo: 'Mão de Obra' }] } } });
      const fd = new FormData();
      fd.append('tipo', 'NF_XML');
      fd.append('file', new Blob(['<nfe/>'], { type: 'text/xml' }), 'nota.xml');
      const r = await fetch(`${base}/quotes/${q.id}/s3-attachments`, { method: 'POST', headers: auth, body: fd });
      const body = await r.text();
      assert.strictEqual(r.status, 201, body);
      const c = await db.client.findUnique({ where: { id: old.id } });
      assert.ok(c.pastaStorage && c.pastaStorageCriadaEm);
      assert.ok(JSON.parse(body).arquivo.startsWith(`${c.pastaStorage}notas-fiscais/`));
    });

    await test('Inicialização cria a pasta de todos os clientes existentes que ainda não têm', async () => {
      const a = await db.client.create({ data: { nome: 'Legado A', cnpj: '10101010000110', companyId: company.id } });
      const b = await db.client.create({ data: { nome: 'Legado B', companyId: company.id } });
      await backfillClientStorageFolders(1);
      for (const id of [a.id, b.id]) {
        const c = await db.client.findUnique({ where: { id } });
        assert.ok(c.pastaStorageCriadaEm, `sem pasta: ${id}`);
        assert.ok((await listKeys(c.pastaStorage)).includes(`${c.pastaStorage}notas-fiscais/`));
      }
      const again = await backfillClientStorageFolders();
      assert.ok(!(await db.client.count({ where: { companyId: company.id, pastaStorageCriadaEm: null } })));
      assert.strictEqual(typeof again.processados, 'number');
    });

    await test('Editar o nome do cliente não muda a pasta', async () => {
      const r = await fetch(`${base}/registry/clients/${clientId}`, { method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: 'Outro Nome', empresa: 'Outro Nome SA', cnpj: '11.222.333/0001-81' }) });
      assert.ok(r.status < 300, await r.text());
      assert.strictEqual((await db.client.findUnique({ where: { id: clientId } })).pastaStorage, folder);
    });

    await test('Gestor do portal baixa a NF gravada na pasta do cliente', async () => {
      const { PortalAccessController } = require('../portalGestor/portalGestor.auth.controller');
      void PortalAccessController;
      const r = await fetch(`${base}/registry/clients/${clientId}/portal-access`, { method: 'POST', headers: auth });
      assert.strictEqual(r.status, 201, await r.text());
      await db.user.updateMany({ where: { clientId }, data: { mustChangePassword: false } });
      const login = await fetch(`${base}/auth/portal-login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cnpj: '11222333000181', password: '#12345678*' }) });
      const { token: gt } = await login.json();
      const docs = await (await fetch(`${base}/portal-gestor/documentos`, { headers: { Authorization: `Bearer ${gt}` } })).json();
      const nf = docs.find((d: any) => d.nome === 'nota fiscal.pdf');
      assert.ok(nf, JSON.stringify(docs));
      const dl = await fetch(`${base}${nf.downloadPath}`, { headers: { Authorization: `Bearer ${gt}` } });
      assert.strictEqual(dl.status, 200, await dl.clone().text());
      const file = await fetch((await dl.json()).url);
      assert.strictEqual(file.status, 200);
    });

    // limpeza
    await db.quote.deleteMany({ where: { companyId: company.id } });
    await db.user.deleteMany({ where: { companyId: company.id } });
    await db.client.deleteMany({ where: { companyId: company.id } });
    await db.company.delete({ where: { id: company.id } });
    server.close();
    await db.$disconnect();
    void quoteId;
  } else {
    console.log('(integração com banco/storage não executada: defina CLIENT_FOLDER_TEST_DB=1 e STORAGE_*)');
  }

  results.forEach(r => console.log(`${r.ok ? '✔' : '✘'} ${r.name}${r.ok ? '' : `\n    ${r.err}`}`));
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} testes passaram`);
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
