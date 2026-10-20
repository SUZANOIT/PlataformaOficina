import assert from 'assert';
import { extractPdfText } from './pdfText';
import {
  duplicateMotivo,
  extractValidCnpj,
  extractValidCnpjsFromText,
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

test('rejeita PDF acima de 20 MB', () => {
  const grande = validateBulkFile({
    originalname: '11222333000181.pdf',
    mimetype: 'application/pdf',
    size: 21 * 1024 * 1024,
  });
  assert.strictEqual(grande.ok, false);
});

test('PDF sem CNPJ no nome segue para leitura do conteúdo', () => {
  const semCnpj = validateBulkFile({
    originalname: 'PGD8E26_TR.pdf',
    mimetype: 'application/pdf',
    size: 1200,
  });
  assert.deepStrictEqual(semCnpj, { ok: true, cnpj: null });
});

test('encontra CNPJ formatado no texto do documento', () => {
  const texto = 'Documento de Arrecadação do Simples Nacional CNPJ 11.222.333/0001-81 Razão Social X 99.999.999/9999-99';
  assert.deepStrictEqual(extractValidCnpjsFromText(texto), ['11222333000181']);
  assert.deepStrictEqual(extractValidCnpjsFromText('sem cnpj aqui'), []);
});

function buildPdf(text: string): Buffer {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

test('lê o CNPJ de dentro de um PDF real', async () => {
  const texto = await extractPdfText(buildPdf('DAS - CNPJ: 11.222.333/0001-81'));
  assert.deepStrictEqual(extractValidCnpjsFromText(texto), ['11222333000181']);
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
