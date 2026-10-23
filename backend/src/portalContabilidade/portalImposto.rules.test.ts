import assert from 'assert';
import {
  competenciaAtual,
  competenciaDeData,
  competenciasEntre,
  montarResumoMensal,
  possuiBoleto,
  duplicateMotivo,
  extractCnpjFromFilename,
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

test('lê o CNPJ do nome do arquivo sem validar dígitos', () => {
  assert.strictEqual(extractCnpjFromFilename('boleto_11.222.333-0001-81.pdf'), '11222333000181');
  assert.strictEqual(extractCnpjFromFilename('DAS_12345678901234.pdf'), '12345678901234');
  assert.strictEqual(extractCnpjFromFilename('PGD8E26_TR.pdf'), null);
});

test('rejeita arquivo que não é PDF', () => {
  const result = validateBulkFile({ originalname: '11222333000181.xml', size: 100 });
  assert.strictEqual(result.ok, false);
});

test('rejeita PDF acima de 20 MB', () => {
  const grande = validateBulkFile({ originalname: '11222333000181.pdf', size: 21 * 1024 * 1024 });
  assert.strictEqual(grande.ok, false);
});

test('aceita PDF sem CNPJ no nome e sem ler o conteúdo', () => {
  assert.deepStrictEqual(
    validateBulkFile({ originalname: 'PGD8E26_TR.pdf', size: 1200 }),
    { ok: true, cnpj: null }
  );
  assert.deepStrictEqual(
    validateBulkFile({ originalname: 'DAS_11222333000181.pdf', size: 2048 }),
    { ok: true, cnpj: '11222333000181' }
  );
});

test('valor do lote não bloqueia a importação', () => {
  const vazio = validateLoteMetadata({ competencia: '10/2026', tipoImposto: 'DAS', vencimento: '2026-10-20', valor: '' });
  assert.strictEqual(vazio.ok, true);
  if (vazio.ok) assert.strictEqual(vazio.valor, 0);

  const zero = validateLoteMetadata({ competencia: '10/2026', tipoImposto: 'DAS', vencimento: '2026-10-20', valor: '0,00' });
  assert.strictEqual(zero.ok, true);

  const informado = validateLoteMetadata({ competencia: '08/2026', tipoImposto: 'DAS', vencimento: '2026-08-31', valor: '2.000,00' });
  assert.strictEqual(informado.ok, true);
  if (informado.ok) assert.strictEqual(informado.valor, 2000);
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

test('período de competência gera os meses entre as datas', () => {
  assert.deepStrictEqual(competenciasEntre('11/2025', '02/2026'), ['11/2025', '12/2025', '01/2026', '02/2026']);
  assert.deepStrictEqual(competenciasEntre('05/2026', '05/2026'), ['05/2026']);
  assert.deepStrictEqual(competenciasEntre('06/2026', '05/2026'), []);
  assert.strictEqual(competenciasEntre('', ''), null);
  assert.strictEqual(competenciasEntre('08/2026', '')?.[0], '08/2026');
});

test('resumo mensal soma por competência e tipo', () => {
  const resumo = montarResumoMensal(['07/2026', '08/2026'], [
    { competencia: '07/2026', tipoImposto: 'DAS', valor: 100, quantidade: 1 },
    { competencia: '07/2026', tipoImposto: 'FGTS', valor: 50, quantidade: 2 },
    { competencia: '08/2026', tipoImposto: 'DAS', valor: 30, quantidade: 1 },
    { competencia: '09/2026', tipoImposto: 'DAS', valor: 999, quantidade: 1 },
  ]);
  assert.deepStrictEqual(resumo.tipos, ['DAS', 'FGTS']);
  assert.strictEqual(resumo.linhas[0].total, 150);
  assert.strictEqual(resumo.linhas[1].porTipo.DAS, 30);
  assert.deepStrictEqual(resumo.totalPorTipo, { DAS: 130, FGTS: 50 });
  assert.strictEqual(resumo.total, 180);
  assert.strictEqual(resumo.quantidade, 4);
});

test('converte datas do painel em competência', () => {
  assert.strictEqual(competenciaDeData('2026-03-15'), '03/2026');
  assert.strictEqual(competenciaDeData(''), null);
  assert.strictEqual(competenciaAtual(-11, new Date(2026, 9, 20)), '11/2025');
});

test('boleto existe apenas com PDF armazenado', () => {
  assert.strictEqual(possuiBoleto({ arquivo: 'guia_imposto/08-2026/x/a.pdf', tipo: 'application/pdf', nome: 'a.pdf' }), true);
  assert.strictEqual(possuiBoleto({ arquivo: 'guia_imposto/08-2026/x/a.pdf', tipo: '', nome: 'GUIA.PDF' }), true);
  assert.strictEqual(possuiBoleto({ arquivo: '', tipo: 'application/pdf', nome: 'a.pdf' }), false);
  assert.strictEqual(possuiBoleto({ arquivo: 'x/nota.xml', tipo: 'application/xml', nome: 'nota.xml' }), false);
  assert.strictEqual(possuiBoleto(undefined), false);
});

test('falha parcial preserva os arquivos processados com sucesso', async () => {
  const files = [{ originalname: 'a.pdf' }, { originalname: 'b.pdf' }, { originalname: 'c.pdf' }];
  const result = await processBatch(files, async (file) => {
    if (file.originalname === 'b.pdf') throw new Error(duplicateMotivo());
    return { arquivo: file.originalname, valor: 10 };
  });
  assert.strictEqual(result.sucesso.length, 2);
  assert.strictEqual(result.erros.length, 1);
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
