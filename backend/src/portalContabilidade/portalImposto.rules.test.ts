import assert from 'assert';
import {
  duplicateMotivo,
  extractValidCnpj,
  isValidCnpj,
  parseValorBrasileiro,
  processBatch,
  resolvePortalAccess,
  validateBulkFile,
  validateLoteMetadata,
} from './portalImposto.rules';

const tests: Array<[string, () => void | Promise<void>]> = [];
function test(name: string, fn: () => void | Promise<void>) {
  tests.push([name, fn]);
}

test('aceita valor brasileiro 1.250,50', () => {
  assert.strictEqual(parseValorBrasileiro('1.250,50'), 1250.5);
  assert.strictEqual(parseValorBrasileiro('R$ 10,00'), 10);
});

test('rejeita valor zero, vazio e inválido', () => {
  assert.strictEqual(parseValorBrasileiro('0,00'), null);
  assert.strictEqual(parseValorBrasileiro(''), null);
  assert.strictEqual(parseValorBrasileiro('abc'), null);
  assert.strictEqual(parseValorBrasileiro(-5), null);
});

test('valida CNPJ e extrai do nome do arquivo', () => {
  assert.strictEqual(isValidCnpj('11222333000181'), true);
  assert.strictEqual(isValidCnpj('11222333000182'), false);
  assert.strictEqual(isValidCnpj('11111111111111'), false);
  assert.strictEqual(extractValidCnpj('boleto_11.222.333-0001-81.pdf'), '11222333000181');
  assert.strictEqual(extractValidCnpj('sem-cnpj.pdf'), null);
});

test('rejeita arquivo que não é PDF', () => {
  const result = validateBulkFile({ originalname: '11222333000181.xml', mimetype: 'text/xml', size: 100 });
  assert.strictEqual(result.ok, false);
  if (!result.ok) assert.match(result.motivo, /PDF/);
});

test('rejeita PDF acima de 20 MB e arquivo sem CNPJ válido', () => {
  const grande = validateBulkFile({
    originalname: '11222333000181.pdf',
    mimetype: 'application/pdf',
    size: 21 * 1024 * 1024,
  });
  assert.strictEqual(grande.ok, false);

  const semCnpj = validateBulkFile({
    originalname: 'guia.pdf',
    mimetype: 'application/pdf',
    size: 1200,
  });
  assert.strictEqual(semCnpj.ok, false);
});

test('aceita um PDF com CNPJ válido', () => {
  const result = validateBulkFile({
    originalname: 'DAS_11222333000181.pdf',
    mimetype: 'application/pdf',
    size: 2048,
  });
  assert.deepStrictEqual(result, { ok: true, cnpj: '11222333000181' });
});

test('exige competência, tipo, vencimento e valor do lote', () => {
  const invalido = validateLoteMetadata({ competencia: '13/2026', tipoImposto: 'DAS', vencimento: '2026-10-20', valor: '10,00' });
  assert.strictEqual(invalido.ok, false);

  const semValor = validateLoteMetadata({ competencia: '10/2026', tipoImposto: 'DAS', vencimento: '2026-10-20', valor: '' });
  assert.strictEqual(semValor.ok, false);

  const ok = validateLoteMetadata({ competencia: '10/2026', tipoImposto: 'FGTS', vencimento: '2026-10-20', valor: '1.250,50' });
  assert.strictEqual(ok.ok, true);
  if (ok.ok) assert.strictEqual(ok.valor, 1250.5);
});

test('financeiro consulta a própria empresa e contabilidade gerencia todos', () => {
  const financeiro = resolvePortalAccess({ admin: false, contabilidade: false, contasPagar: true, contasReceber: false });
  assert.deepStrictEqual(financeiro, { canRead: true, canManage: false, scope: 'company' });

  const contabilidade = resolvePortalAccess({ admin: false, contabilidade: true, contasPagar: false, contasReceber: false });
  assert.strictEqual(contabilidade.canManage, true);
  assert.strictEqual(contabilidade.scope, 'all');

  const orcamentista = resolvePortalAccess({ admin: false, contabilidade: false, contasPagar: false, contasReceber: false });
  assert.strictEqual(orcamentista.canRead, false);
});

test('falha parcial preserva os arquivos processados com sucesso', async () => {
  const files = [{ originalname: 'a.pdf' }, { originalname: 'b.pdf' }, { originalname: 'c.pdf' }];
  const result = await processBatch(files, async (file) => {
    if (file.originalname === 'b.pdf') throw new Error(duplicateMotivo());
    return { arquivo: file.originalname, valor: 10 };
  });
  assert.strictEqual(result.sucesso.length, 2);
  assert.strictEqual(result.erros.length, 1);
  assert.strictEqual(result.erros[0].motivo, duplicateMotivo());
  assert.deepStrictEqual(result.sucesso.map((item) => item.arquivo), ['a.pdf', 'c.pdf']);
});

async function main() {
  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`ok ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`falhou ${name}`);
      console.error(error);
    }
  }
  if (failed > 0) {
    console.error(`${failed} teste(s) falharam`);
    process.exit(1);
  }
  console.log(`${tests.length} testes passaram`);
}

main();
