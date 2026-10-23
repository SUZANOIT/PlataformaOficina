"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const portalImposto_rules_1 = require("./portalImposto.rules");
const tests = [];
function test(name, fn) {
    tests.push([name, fn]);
}
test('aceita valor brasileiro 1.250,50', () => {
    assert_1.default.strictEqual((0, portalImposto_rules_1.parseValorBrasileiro)('1.250,50'), 1250.5);
    assert_1.default.strictEqual((0, portalImposto_rules_1.parseValorBrasileiro)('R$ 10,00'), 10);
});
test('lê o CNPJ do nome do arquivo sem validar dígitos', () => {
    assert_1.default.strictEqual((0, portalImposto_rules_1.extractCnpjFromFilename)('boleto_11.222.333-0001-81.pdf'), '11222333000181');
    assert_1.default.strictEqual((0, portalImposto_rules_1.extractCnpjFromFilename)('DAS_12345678901234.pdf'), '12345678901234');
    assert_1.default.strictEqual((0, portalImposto_rules_1.extractCnpjFromFilename)('PGD8E26_TR.pdf'), null);
});
test('rejeita arquivo que não é PDF', () => {
    const result = (0, portalImposto_rules_1.validateBulkFile)({ originalname: '11222333000181.xml', size: 100 });
    assert_1.default.strictEqual(result.ok, false);
});
test('rejeita PDF acima de 20 MB', () => {
    const grande = (0, portalImposto_rules_1.validateBulkFile)({ originalname: '11222333000181.pdf', size: 21 * 1024 * 1024 });
    assert_1.default.strictEqual(grande.ok, false);
});
test('aceita PDF sem CNPJ no nome e sem ler o conteúdo', () => {
    assert_1.default.deepStrictEqual((0, portalImposto_rules_1.validateBulkFile)({ originalname: 'PGD8E26_TR.pdf', size: 1200 }), { ok: true, cnpj: null });
    assert_1.default.deepStrictEqual((0, portalImposto_rules_1.validateBulkFile)({ originalname: 'DAS_11222333000181.pdf', size: 2048 }), { ok: true, cnpj: '11222333000181' });
});
test('valor do lote não bloqueia a importação', () => {
    const vazio = (0, portalImposto_rules_1.validateLoteMetadata)({ competencia: '10/2026', tipoImposto: 'DAS', vencimento: '2026-10-20', valor: '' });
    assert_1.default.strictEqual(vazio.ok, true);
    if (vazio.ok)
        assert_1.default.strictEqual(vazio.valor, 0);
    const zero = (0, portalImposto_rules_1.validateLoteMetadata)({ competencia: '10/2026', tipoImposto: 'DAS', vencimento: '2026-10-20', valor: '0,00' });
    assert_1.default.strictEqual(zero.ok, true);
    const informado = (0, portalImposto_rules_1.validateLoteMetadata)({ competencia: '08/2026', tipoImposto: 'DAS', vencimento: '2026-08-31', valor: '2.000,00' });
    assert_1.default.strictEqual(informado.ok, true);
    if (informado.ok)
        assert_1.default.strictEqual(informado.valor, 2000);
});
test('financeiro consulta a própria empresa e contabilidade gerencia todos', () => {
    const financeiro = (0, portalImposto_rules_1.resolvePortalAccess)({ admin: false, contabilidade: false, contasPagar: true, contasReceber: false });
    assert_1.default.deepStrictEqual(financeiro, { canRead: true, canManage: false, scope: 'company' });
    const contabilidade = (0, portalImposto_rules_1.resolvePortalAccess)({ admin: false, contabilidade: true, contasPagar: false, contasReceber: false });
    assert_1.default.strictEqual(contabilidade.canManage, true);
    assert_1.default.strictEqual(contabilidade.scope, 'all');
    const orcamentista = (0, portalImposto_rules_1.resolvePortalAccess)({ admin: false, contabilidade: false, contasPagar: false, contasReceber: false });
    assert_1.default.strictEqual(orcamentista.canRead, false);
});
test('período de competência gera os meses entre as datas', () => {
    assert_1.default.deepStrictEqual((0, portalImposto_rules_1.competenciasEntre)('11/2025', '02/2026'), ['11/2025', '12/2025', '01/2026', '02/2026']);
    assert_1.default.deepStrictEqual((0, portalImposto_rules_1.competenciasEntre)('05/2026', '05/2026'), ['05/2026']);
    assert_1.default.deepStrictEqual((0, portalImposto_rules_1.competenciasEntre)('06/2026', '05/2026'), []);
    assert_1.default.strictEqual((0, portalImposto_rules_1.competenciasEntre)('', ''), null);
    assert_1.default.strictEqual((0, portalImposto_rules_1.competenciasEntre)('08/2026', '')?.[0], '08/2026');
});
test('resumo mensal soma por competência e tipo', () => {
    const resumo = (0, portalImposto_rules_1.montarResumoMensal)(['07/2026', '08/2026'], [
        { competencia: '07/2026', tipoImposto: 'DAS', valor: 100, quantidade: 1 },
        { competencia: '07/2026', tipoImposto: 'FGTS', valor: 50, quantidade: 2 },
        { competencia: '08/2026', tipoImposto: 'DAS', valor: 30, quantidade: 1 },
        { competencia: '09/2026', tipoImposto: 'DAS', valor: 999, quantidade: 1 },
    ]);
    assert_1.default.deepStrictEqual(resumo.tipos, ['DAS', 'FGTS']);
    assert_1.default.strictEqual(resumo.linhas[0].total, 150);
    assert_1.default.strictEqual(resumo.linhas[1].porTipo.DAS, 30);
    assert_1.default.deepStrictEqual(resumo.totalPorTipo, { DAS: 130, FGTS: 50 });
    assert_1.default.strictEqual(resumo.total, 180);
    assert_1.default.strictEqual(resumo.quantidade, 4);
});
test('converte datas do painel em competência', () => {
    assert_1.default.strictEqual((0, portalImposto_rules_1.competenciaDeData)('2026-03-15'), '03/2026');
    assert_1.default.strictEqual((0, portalImposto_rules_1.competenciaDeData)(''), null);
    assert_1.default.strictEqual((0, portalImposto_rules_1.competenciaAtual)(-11, new Date(2026, 9, 20)), '11/2025');
});
test('boleto existe apenas com PDF armazenado', () => {
    assert_1.default.strictEqual((0, portalImposto_rules_1.possuiBoleto)({ arquivo: 'guia_imposto/08-2026/x/a.pdf', tipo: 'application/pdf', nome: 'a.pdf' }), true);
    assert_1.default.strictEqual((0, portalImposto_rules_1.possuiBoleto)({ arquivo: 'guia_imposto/08-2026/x/a.pdf', tipo: '', nome: 'GUIA.PDF' }), true);
    assert_1.default.strictEqual((0, portalImposto_rules_1.possuiBoleto)({ arquivo: '', tipo: 'application/pdf', nome: 'a.pdf' }), false);
    assert_1.default.strictEqual((0, portalImposto_rules_1.possuiBoleto)({ arquivo: 'x/nota.xml', tipo: 'application/xml', nome: 'nota.xml' }), false);
    assert_1.default.strictEqual((0, portalImposto_rules_1.possuiBoleto)(undefined), false);
});
test('falha parcial preserva os arquivos processados com sucesso', async () => {
    const files = [{ originalname: 'a.pdf' }, { originalname: 'b.pdf' }, { originalname: 'c.pdf' }];
    const result = await (0, portalImposto_rules_1.processBatch)(files, async (file) => {
        if (file.originalname === 'b.pdf')
            throw new Error((0, portalImposto_rules_1.duplicateMotivo)());
        return { arquivo: file.originalname, valor: 10 };
    });
    assert_1.default.strictEqual(result.sucesso.length, 2);
    assert_1.default.strictEqual(result.erros.length, 1);
    assert_1.default.deepStrictEqual(result.sucesso.map((item) => item.arquivo), ['a.pdf', 'c.pdf']);
});
async function main() {
    let failed = 0;
    for (const [name, fn] of tests) {
        try {
            await fn();
            console.log(`ok ${name}`);
        }
        catch (error) {
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
