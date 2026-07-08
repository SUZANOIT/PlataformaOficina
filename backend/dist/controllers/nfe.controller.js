"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NfeController = void 0;
exports.parseNfseServicoXml = parseNfseServicoXml;
exports.parseNfeXml = parseNfeXml;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const audit_logger_1 = require("../utils/audit.logger");
// Helper: Extract text from tag
function tagContent(xml, tag) {
    const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
}
// Helper: Extract tag content from a block
function blockContent(xml, blockName) {
    const regex = new RegExp(`<${blockName}>([\\s\\S]*?)</${blockName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : null;
}
// Parse NFS-e (serviço) XML - layout Barueri/SP (ConsultarNfeServPrestadoResposta) ou GissOnline (CompNfse)
function parseNfseServicoXml(xmlText) {
    try {
        const infNfse = blockContent(xmlText, 'InfNfeServPrestado') || blockContent(xmlText, 'InfNfse') || xmlText;
        const numeroNf = tagContent(infNfse, 'NumeroNfe') || tagContent(infNfse, 'Numero') || '';
        const serie = tagContent(infNfse, 'SerieNfe') || tagContent(infNfse, 'Serie');
        const codigoVerificacao = tagContent(infNfse, 'CodigoVerificacao');
        const dataEmissaoStr = tagContent(infNfse, 'DataEmissao') || '';
        const dataEmissao = dataEmissaoStr ? new Date(dataEmissaoStr) : new Date();
        const naturezaOperacao = tagContent(infNfse, 'DescricaoNfe') || tagContent(infNfse, 'DescricaoCodigoTributacaoMunicipio') || 'Prestação de Serviços';
        // NFS-e não possui chave de acesso de 44 dígitos; gera identificador único
        const prestadorXml = blockContent(infNfse, 'PrestadorServico') || '';
        const prestadorCnpjXml = blockContent(infNfse, 'Prestador') || prestadorXml;
        const emitCnpj = tagContent(prestadorCnpjXml, 'Cnpj') || tagContent(prestadorXml, 'Cnpj') || '';
        const chaveAcesso = codigoVerificacao
            ? `NFSE-${emitCnpj}-${numeroNf}-${codigoVerificacao.replace(/[^a-zA-Z0-9]/g, '')}`
            : `NFSE-${emitCnpj}-${numeroNf}`;
        // Prestador = fornecedor
        const emitRazaoSocial = tagContent(prestadorXml, 'RazaoSocial') || 'Fornecedor Desconhecido';
        const emitLogradouro = tagContent(prestadorXml, 'Endereco');
        const emitNumero = tagContent(prestadorXml, 'NumeroEndereco') || tagContent(prestadorXml, 'Numero');
        const emitComplemento = tagContent(prestadorXml, 'ComplementoEndereco') || tagContent(prestadorXml, 'Complemento');
        const emitBairro = tagContent(prestadorXml, 'Bairro');
        const emitCidade = tagContent(prestadorXml, 'Cidade');
        const emitEstado = tagContent(prestadorXml, 'Uf');
        const emitCep = tagContent(prestadorXml, 'Cep');
        const emitTelefone = tagContent(prestadorXml, 'Telefone');
        const emitEmail = tagContent(prestadorXml, 'Email');
        // Tomador = destinatário
        const tomadorXml = blockContent(infNfse, 'TomadorServico') || '';
        const destCnpj = tagContent(tomadorXml, 'Cnpj') || '';
        // Valores da nota
        const valoresNfeXml = blockContent(infNfse, 'ValoresNfe') || blockContent(infNfse, 'ValoresNfse') || '';
        const valorTotal = parseFloat(tagContent(valoresNfeXml, 'ValorLiquidoNfe') || tagContent(valoresNfeXml, 'ValorLiquidoNfse') || '0');
        // Serviço prestado (item único)
        const servicoXml = blockContent(infNfse, 'ServicoPrestado') || blockContent(infNfse, 'Servico') || '';
        const valoresServicoXml = blockContent(servicoXml, 'ValoresServicoPrestado') || blockContent(servicoXml, 'Valores') || '';
        const quantidade = parseFloat(tagContent(valoresServicoXml, 'QuantidadeServico') || '1');
        const valorUnitario = parseFloat(tagContent(valoresServicoXml, 'ValorUnitarioServico') || '0');
        const valorServicos = parseFloat(tagContent(valoresServicoXml, 'ValorServicos') || String(valorTotal));
        const pisValor = parseFloat(tagContent(valoresServicoXml, 'ValorPis') || '0');
        const cofinsValor = parseFloat(tagContent(valoresServicoXml, 'ValorCofins') || '0');
        const issValor = parseFloat(tagContent(valoresServicoXml, 'ValorIss') || tagContent(valoresNfeXml, 'ValorIss') || '0');
        const issAliquota = parseFloat(tagContent(valoresServicoXml, 'Aliquota') || tagContent(valoresNfeXml, 'Aliquota') || '0');
        const codigoServico = tagContent(servicoXml, 'CodigoServico') || tagContent(servicoXml, 'ItemListaServico') || numeroNf;
        const descricaoServico = tagContent(servicoXml, 'DescricaoServico') || tagContent(servicoXml, 'Discriminacao') || 'Serviço Sem Descrição';
        const items = [{
                codigoProduto: codigoServico,
                codigoBarras: null,
                descricao: descricaoServico,
                ncm: null,
                cest: null,
                cfop: null,
                unidade: 'SV',
                quantidade,
                valorUnitario: valorUnitario || valorServicos,
                valorTotal: valorServicos,
                icmsCst: null,
                icmsCsosn: null,
                icmsBaseCalculo: 0,
                icmsAliquota: 0,
                icmsValor: 0,
                ipiCst: null,
                ipiBaseCalculo: 0,
                ipiAliquota: 0,
                ipiValor: 0,
                pisCst: null,
                pisBaseCalculo: 0,
                pisAliquota: 0,
                pisValor,
                cofinsCst: null,
                cofinsBaseCalculo: 0,
                cofinsAliquota: 0,
                cofinsValor,
                issCodigoServico: codigoServico,
                issAliquota,
                issValor
            }];
        return {
            chaveAcesso,
            numeroNf,
            serie,
            dataEmissao,
            naturezaOperacao,
            destCnpj,
            valorProdutos: valorServicos,
            valorFrete: 0,
            valorSeguro: 0,
            valorDesconto: 0,
            valorTotal: valorTotal || valorServicos,
            supplier: {
                razaoSocial: emitRazaoSocial,
                nomeFantasia: null,
                cnpj: emitCnpj,
                telefone: emitTelefone,
                email: emitEmail,
                logradouro: emitLogradouro,
                numero: emitNumero,
                complemento: emitComplemento,
                bairro: emitBairro,
                cep: emitCep,
                cidade: emitCidade,
                estado: emitEstado
            },
            items
        };
    }
    catch (error) {
        console.error('Error parsing NFS-e XML:', error);
        throw new Error('Falha ao processar a estrutura do arquivo XML de NFS-e.');
    }
}
// Parse NFe XML using regex
function parseNfeXml(xmlText) {
    // Detecta NFS-e de serviços (layout Barueri/SP ou GissOnline)
    if (/<InfNfeServPrestado\b|<ConsultarNfeServPrestadoResposta\b|<CompNfse\b|<InfNfse\b/i.test(xmlText)) {
        return parseNfseServicoXml(xmlText);
    }
    try {
        // 1. Chave de acesso
        let chaveAcesso = tagContent(xmlText, 'chNFe');
        if (!chaveAcesso) {
            const infNfeMatch = xmlText.match(/<infNFe\b[^>]*\bId="NFe(\d+)"/i);
            if (infNfeMatch) {
                chaveAcesso = infNfeMatch[1];
            }
        }
        // 2. Identificação da nota (<ide>)
        const ideXml = blockContent(xmlText, 'ide') || '';
        const numeroNf = tagContent(ideXml, 'nNF') || '';
        const serie = tagContent(ideXml, 'serie');
        const dhEmi = tagContent(ideXml, 'dhEmi') || tagContent(ideXml, 'dEmi') || '';
        const dataEmissao = dhEmi ? new Date(dhEmi) : new Date();
        const naturezaOperacao = tagContent(ideXml, 'natOp');
        // 3. Emitente
        const emitXml = blockContent(xmlText, 'emit') || '';
        const emitCnpj = tagContent(emitXml, 'CNPJ') || '';
        const emitRazaoSocial = tagContent(emitXml, 'xNome') || 'Fornecedor Desconhecido';
        const emitNomeFantasia = tagContent(emitXml, 'xFant');
        const emitTelefone = tagContent(emitXml, 'fone');
        const emitEmail = tagContent(xmlText, 'email'); // can be at header
        const enderEmitXml = blockContent(emitXml, 'enderEmit') || '';
        const emitLogradouro = tagContent(enderEmitXml, 'xLgr');
        const emitNumero = tagContent(enderEmitXml, 'nro');
        const emitComplemento = tagContent(enderEmitXml, 'xCpl');
        const emitBairro = tagContent(enderEmitXml, 'xBairro');
        const emitCep = tagContent(enderEmitXml, 'CEP');
        const emitCidade = tagContent(enderEmitXml, 'xMun');
        const emitEstado = tagContent(enderEmitXml, 'UF');
        // 4. Destinatário
        const destXml = blockContent(xmlText, 'dest') || '';
        const destCnpj = tagContent(destXml, 'CNPJ') || '';
        // 5. Totais da Nota
        const totalXml = blockContent(xmlText, 'total') || '';
        const icmsTotXml = blockContent(totalXml, 'ICMSTot') || '';
        const valorProdutos = parseFloat(tagContent(icmsTotXml, 'vProd') || '0');
        const valorFrete = parseFloat(tagContent(icmsTotXml, 'vFrete') || '0');
        const valorSeguro = parseFloat(tagContent(icmsTotXml, 'vSeg') || '0');
        const valorDesconto = parseFloat(tagContent(icmsTotXml, 'vDesc') || '0');
        const valorTotal = parseFloat(tagContent(icmsTotXml, 'vNF') || '0');
        // 6. Itens (<det>)
        const detMatches = xmlText.match(/<det\b[^>]*>([\s\S]*?)<\/det>/gi) || [];
        const items = detMatches.map(detXml => {
            const prodXml = blockContent(detXml, 'prod') || '';
            const impXml = blockContent(detXml, 'imposto') || '';
            const codigoProduto = tagContent(prodXml, 'cProd') || '';
            const codigoBarras = tagContent(prodXml, 'cEAN');
            const descricao = tagContent(prodXml, 'xProd') || 'Item Sem Descrição';
            const ncm = tagContent(prodXml, 'NCM');
            const cest = tagContent(prodXml, 'CEST');
            const cfop = tagContent(prodXml, 'CFOP');
            const unidade = tagContent(prodXml, 'uCom');
            const quantidade = parseFloat(tagContent(prodXml, 'qCom') || '0');
            const valorUnitario = parseFloat(tagContent(prodXml, 'vUnCom') || '0');
            const itemTotal = parseFloat(tagContent(prodXml, 'vProd') || '0');
            // Impostos
            const icmsXml = blockContent(impXml, 'ICMS') || '';
            // CST/CSOSN are usually inside sub-tags like ICMS00, ICMS10, ICMSSN101 etc.
            let icmsCst = null;
            let icmsCsosn = null;
            const cstMatch = icmsXml.match(/<CST>([^<]+)<\/CST>/i);
            const csosnMatch = icmsXml.match(/<CSOSN>([^<]+)<\/CSOSN>/i);
            if (cstMatch)
                icmsCst = cstMatch[1];
            if (csosnMatch)
                icmsCsosn = csosnMatch[1];
            const icmsBaseCalculo = parseFloat(tagContent(icmsXml, 'vBC') || '0');
            const icmsAliquota = parseFloat(tagContent(icmsXml, 'pICMS') || '0');
            const icmsValor = parseFloat(tagContent(icmsXml, 'vICMS') || '0');
            const ipiXml = blockContent(impXml, 'IPI') || '';
            const ipiCst = tagContent(ipiXml, 'CST');
            const ipiBaseCalculo = parseFloat(tagContent(ipiXml, 'vBC') || '0');
            const ipiAliquota = parseFloat(tagContent(ipiXml, 'pIPI') || '0');
            const ipiValor = parseFloat(tagContent(ipiXml, 'vIPI') || '0');
            const pisXml = blockContent(impXml, 'PIS') || '';
            const pisCst = tagContent(pisXml, 'CST');
            const pisBaseCalculo = parseFloat(tagContent(pisXml, 'vBC') || '0');
            const pisAliquota = parseFloat(tagContent(pisXml, 'pPIS') || '0');
            const pisValor = parseFloat(tagContent(pisXml, 'vPIS') || '0');
            const cofinsXml = blockContent(impXml, 'COFINS') || '';
            const cofinsCst = tagContent(cofinsXml, 'CST');
            const cofinsBaseCalculo = parseFloat(tagContent(cofinsXml, 'vBC') || '0');
            const cofinsAliquota = parseFloat(tagContent(cofinsXml, 'pCOFINS') || '0');
            const cofinsValor = parseFloat(tagContent(cofinsXml, 'vCOFINS') || '0');
            const issXml = blockContent(impXml, 'ISSQN') || '';
            const issCodigoServico = tagContent(issXml, 'cServ');
            const issAliquota = parseFloat(tagContent(issXml, 'vAliq') || '0');
            const issValor = parseFloat(tagContent(issXml, 'vISSQN') || '0');
            return {
                codigoProduto,
                codigoBarras: (codigoBarras && codigoBarras.toLowerCase() !== 'sem gtin') ? codigoBarras : null,
                descricao,
                ncm,
                cest,
                cfop,
                unidade,
                quantidade,
                valorUnitario,
                valorTotal: itemTotal,
                icmsCst,
                icmsCsosn,
                icmsBaseCalculo,
                icmsAliquota,
                icmsValor,
                ipiCst,
                ipiBaseCalculo,
                ipiAliquota,
                ipiValor,
                pisCst,
                pisBaseCalculo,
                pisAliquota,
                pisValor,
                cofinsCst,
                cofinsBaseCalculo,
                cofinsAliquota,
                cofinsValor,
                issCodigoServico,
                issAliquota,
                issValor
            };
        });
        return {
            chaveAcesso,
            numeroNf,
            serie,
            dataEmissao,
            naturezaOperacao,
            destCnpj,
            valorProdutos,
            valorFrete,
            valorSeguro,
            valorDesconto,
            valorTotal,
            supplier: {
                razaoSocial: emitRazaoSocial,
                nomeFantasia: emitNomeFantasia,
                cnpj: emitCnpj,
                telefone: emitTelefone,
                email: emitEmail,
                logradouro: emitLogradouro,
                numero: emitNumero,
                complemento: emitComplemento,
                bairro: emitBairro,
                cep: emitCep,
                cidade: emitCidade,
                estado: emitEstado
            },
            items
        };
    }
    catch (error) {
        console.error('Error parsing XML regex:', error);
        throw new Error('Falha ao processar a estrutura do arquivo XML.');
    }
}
const confirmNfeSchema = zod_1.z.object({
    chaveAcesso: zod_1.z.string(),
    numeroNf: zod_1.z.string(),
    serie: zod_1.z.string().optional().nullable(),
    dataEmissao: zod_1.z.string(),
    naturezaOperacao: zod_1.z.string().optional().nullable(),
    valorProdutos: zod_1.z.number(),
    valorFrete: zod_1.z.number(),
    valorSeguro: zod_1.z.number(),
    valorDesconto: zod_1.z.number(),
    valorTotal: zod_1.z.number(),
    xmlOriginal: zod_1.z.string(),
    supplier: zod_1.z.object({
        id: zod_1.z.string().optional().nullable(),
        razaoSocial: zod_1.z.string(),
        nomeFantasia: zod_1.z.string().optional().nullable(),
        cnpj: zod_1.z.string(),
        telefone: zod_1.z.string().optional().nullable(),
        email: zod_1.z.string().optional().nullable(),
        logradouro: zod_1.z.string().optional().nullable(),
        numero: zod_1.z.string().optional().nullable(),
        complemento: zod_1.z.string().optional().nullable(),
        bairro: zod_1.z.string().optional().nullable(),
        cep: zod_1.z.string().optional().nullable(),
        cidade: zod_1.z.string().optional().nullable(),
        estado: zod_1.z.string().optional().nullable(),
    }),
    items: zod_1.z.array(zod_1.z.object({
        productId: zod_1.z.string().optional().nullable(),
        createProduct: zod_1.z.boolean().default(false),
        codigoProduto: zod_1.z.string(),
        codigoBarras: zod_1.z.string().optional().nullable(),
        descricao: zod_1.z.string(),
        ncm: zod_1.z.string().optional().nullable(),
        cest: zod_1.z.string().optional().nullable(),
        cfop: zod_1.z.string().optional().nullable(),
        unidade: zod_1.z.string().optional().nullable(),
        quantidade: zod_1.z.number(),
        valorUnitario: zod_1.z.number(),
        valorTotal: zod_1.z.number(),
        icmsCst: zod_1.z.string().optional().nullable(),
        icmsCsosn: zod_1.z.string().optional().nullable(),
        icmsBaseCalculo: zod_1.z.number().optional().nullable(),
        icmsAliquota: zod_1.z.number().optional().nullable(),
        icmsValor: zod_1.z.number().optional().nullable(),
        ipiCst: zod_1.z.string().optional().nullable(),
        ipiBaseCalculo: zod_1.z.number().optional().nullable(),
        ipiAliquota: zod_1.z.number().optional().nullable(),
        ipiValor: zod_1.z.number().optional().nullable(),
        pisCst: zod_1.z.string().optional().nullable(),
        pisBaseCalculo: zod_1.z.number().optional().nullable(),
        pisAliquota: zod_1.z.number().optional().nullable(),
        pisValor: zod_1.z.number().optional().nullable(),
        cofinsCst: zod_1.z.string().optional().nullable(),
        cofinsBaseCalculo: zod_1.z.number().optional().nullable(),
        cofinsAliquota: zod_1.z.number().optional().nullable(),
        cofinsValor: zod_1.z.number().optional().nullable(),
        issCodigoServico: zod_1.z.string().optional().nullable(),
        issAliquota: zod_1.z.number().optional().nullable(),
        issValor: zod_1.z.number().optional().nullable(),
        // UI Selected tax links for new products
        tributacaoMunicipalId: zod_1.z.string().optional().nullable(),
        tributacaoEstadualId: zod_1.z.string().optional().nullable(),
        tributacaoFederalId: zod_1.z.string().optional().nullable(),
    })),
    gerarContasPagar: zod_1.z.boolean().default(false),
});
exports.NfeController = {
    // 1. Upload & Pre-parse XML
    async upload(req, res) {
        try {
            const companyId = req.companyId || null;
            if (!companyId)
                return res.status(400).json({ error: 'Empresa não identificada.' });
            const { xmlContent } = req.body;
            if (!xmlContent) {
                return res.status(400).json({ error: 'Conteúdo do XML não enviado.' });
            }
            // Parse XML
            const nfeData = parseNfeXml(xmlContent);
            if (!nfeData.chaveAcesso) {
                return res.status(400).json({ error: 'Chave de acesso da NF-e não localizada no XML.' });
            }
            // a. Check duplicate key in both NfeImport and FiscalDocument
            const duplicateKey = await prisma_1.prisma.nfeImport.findUnique({
                where: { chaveAcesso: nfeData.chaveAcesso }
            });
            const duplicateFiscal = await prisma_1.prisma.fiscalDocument.findFirst({
                where: { chaveAcesso: nfeData.chaveAcesso, companyId }
            });
            const isDuplicate = !!duplicateKey || !!duplicateFiscal;
            // b. Verify recipient CNPJ
            const company = await prisma_1.prisma.company.findUnique({ where: { id: companyId } });
            if (!company)
                return res.status(404).json({ error: 'Tenant company não cadastrada.' });
            const destCnpjClean = nfeData.destCnpj.replace(/\D/g, '');
            const companyCnpjClean = company.cnpjSemMascara || company.cnpj.replace(/\D/g, '');
            const isCnpjMatch = destCnpjClean === companyCnpjClean;
            // c. Find Supplier in database
            const supplierCnpjClean = nfeData.supplier.cnpj.replace(/\D/g, '');
            const existingSupplier = await prisma_1.prisma.supplier.findFirst({
                where: {
                    OR: [
                        { cnpjSemMascara: supplierCnpjClean },
                        { cnpj: nfeData.supplier.cnpj }
                    ],
                    companyId
                }
            });
            const resolvedSupplier = existingSupplier
                ? { id: existingSupplier.id, ...nfeData.supplier, razaoSocial: existingSupplier.razaoSocial }
                : { id: null, ...nfeData.supplier };
            // d. Resolve items to products in database
            const resolvedItems = [];
            for (const item of nfeData.items) {
                let matchedProduct = null;
                // Try EAN/Barcode
                if (item.codigoBarras) {
                    matchedProduct = await prisma_1.prisma.product.findFirst({
                        where: { codigoBarras: item.codigoBarras, companyId }
                    });
                }
                // Try product code
                if (!matchedProduct && item.codigoProduto) {
                    matchedProduct = await prisma_1.prisma.product.findFirst({
                        where: { codigo: item.codigoProduto, companyId }
                    });
                }
                // Try exact description
                if (!matchedProduct && item.descricao) {
                    matchedProduct = await prisma_1.prisma.product.findFirst({
                        where: { descricao: { equals: item.descricao, mode: 'insensitive' }, companyId }
                    });
                }
                resolvedItems.push({
                    ...item,
                    productId: matchedProduct ? matchedProduct.id : null,
                    productDescricao: matchedProduct ? matchedProduct.descricao : null,
                    matched: !!matchedProduct
                });
            }
            return res.json({
                chaveAcesso: nfeData.chaveAcesso,
                numeroNf: nfeData.numeroNf,
                serie: nfeData.serie,
                dataEmissao: nfeData.dataEmissao,
                naturezaOperacao: nfeData.naturezaOperacao,
                valorProdutos: nfeData.valorProdutos,
                valorFrete: nfeData.valorFrete,
                valorSeguro: nfeData.valorSeguro,
                valorDesconto: nfeData.valorDesconto,
                valorTotal: nfeData.valorTotal,
                isDuplicate,
                isCnpjMatch,
                companyCnpj: company.cnpj,
                destCnpj: nfeData.destCnpj,
                supplier: resolvedSupplier,
                items: resolvedItems
            });
        }
        catch (error) {
            console.error('Error in upload XML:', error);
            return res.status(500).json({ error: error.message || 'Erro ao processar arquivo XML.' });
        }
    },
    // 2. Confirm Ingestion
    async confirm(req, res) {
        try {
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            if (!companyId)
                return res.status(400).json({ error: 'Empresa não identificada.' });
            const data = confirmNfeSchema.parse(req.body);
            // Check duplicate key again for concurrency
            const duplicateKey = await prisma_1.prisma.nfeImport.findUnique({
                where: { chaveAcesso: data.chaveAcesso }
            });
            if (duplicateKey) {
                return res.status(409).json({ error: 'Esta nota fiscal (chave de acesso) já foi importada anteriormente no módulo de Estoque.', code: 'DUPLICATE_KEY' });
            }
            const duplicateFiscal = await prisma_1.prisma.fiscalDocument.findFirst({
                where: { chaveAcesso: data.chaveAcesso, companyId }
            });
            if (duplicateFiscal) {
                return res.status(409).json({ error: 'Esta nota fiscal já foi importada anteriormente no módulo Contábil/Fiscal.', code: 'DUPLICATE_KEY_FISCAL' });
            }
            // Step 1: Supplier Resolution
            let supplierId = data.supplier.id;
            if (!supplierId) {
                const supplierCnpjClean = data.supplier.cnpj.replace(/\D/g, '');
                // Check if supplier was created concurrently
                const existingSupplier = await prisma_1.prisma.supplier.findFirst({
                    where: { cnpjSemMascara: supplierCnpjClean, companyId }
                });
                if (existingSupplier) {
                    supplierId = existingSupplier.id;
                }
                else {
                    const newSupplier = await prisma_1.prisma.supplier.create({
                        data: {
                            razaoSocial: data.supplier.razaoSocial,
                            nomeFantasia: data.supplier.nomeFantasia,
                            cnpj: data.supplier.cnpj,
                            cnpjSemMascara: supplierCnpjClean,
                            telefone: data.supplier.telefone,
                            email: data.supplier.email,
                            logradouro: data.supplier.logradouro,
                            numero: data.supplier.numero,
                            complemento: data.supplier.complemento,
                            bairro: data.supplier.bairro,
                            cep: data.supplier.cep,
                            cidade: data.supplier.cidade,
                            estado: data.supplier.estado,
                            companyId
                        }
                    });
                    supplierId = newSupplier.id;
                    audit_logger_1.AuditLogger.log(userId, companyId, 'CREATE_SUPPLIER', `Auto-registered supplier during NFe import: ${newSupplier.razaoSocial}`, 'SUCCESS');
                }
            }
            // Step 2: Create imported NFe header
            const nfeImport = await prisma_1.prisma.nfeImport.create({
                data: {
                    chaveAcesso: data.chaveAcesso,
                    numeroNf: data.numeroNf,
                    serie: data.serie,
                    dataEmissao: new Date(data.dataEmissao),
                    naturezaOperacao: data.naturezaOperacao,
                    valorProdutos: data.valorProdutos,
                    valorFrete: data.valorFrete,
                    valorSeguro: data.valorSeguro,
                    valorDesconto: data.valorDesconto,
                    valorTotal: data.valorTotal,
                    xmlOriginal: data.xmlOriginal,
                    status: 'IMPORTADO',
                    supplierId,
                    companyId
                }
            });
            // Step 3: Process items
            for (const item of data.items) {
                let finalProductId = item.productId;
                // a. Create product if requested
                if (!finalProductId && item.createProduct) {
                    const newProduct = await prisma_1.prisma.product.create({
                        data: {
                            codigo: item.codigoProduto,
                            codigoBarras: item.codigoBarras,
                            descricao: item.descricao,
                            unidade: item.unidade || 'UN',
                            valorCusto: item.valorUnitario,
                            custoMedio: item.valorUnitario,
                            quantidadeEstoque: 0.0, // stock will be incremented by movement below
                            ncm: item.ncm,
                            cest: item.cest,
                            cfopEntrada: item.cfop,
                            tributacaoMunicipalId: item.tributacaoMunicipalId || null,
                            tributacaoEstadualId: item.tributacaoEstadualId || null,
                            tributacaoFederalId: item.tributacaoFederalId || null,
                            companyId
                        }
                    });
                    finalProductId = newProduct.id;
                }
                // b. Update stock & average cost if product is linked
                if (finalProductId) {
                    const prod = await prisma_1.prisma.product.findUnique({
                        where: { id: finalProductId }
                    });
                    if (prod) {
                        const oldQty = prod.quantidadeEstoque;
                        const oldAvg = prod.custoMedio;
                        const newQty = oldQty + item.quantidade;
                        let newAvg = item.valorUnitario;
                        if (newQty > 0) {
                            newAvg = ((oldQty * oldAvg) + (item.quantidade * item.valorUnitario)) / newQty;
                        }
                        await prisma_1.prisma.product.update({
                            where: { id: finalProductId },
                            data: {
                                quantidadeEstoque: newQty,
                                valorCusto: item.valorUnitario, // latest cost
                                custoMedio: newAvg
                            }
                        });
                        // Create Stock Movement log
                        await prisma_1.prisma.stockMovement.create({
                            data: {
                                productId: finalProductId,
                                tipo: 'ENTRADA',
                                quantidade: item.quantidade,
                                valorUnitario: item.valorUnitario,
                                valorTotal: item.valorTotal,
                                origem: 'IMPORTACAO_NFE',
                                documentoOrigem: data.numeroNf,
                                userId
                            }
                        });
                    }
                }
                // c. Save NfeItem
                await prisma_1.prisma.nfeItem.create({
                    data: {
                        nfeImportId: nfeImport.id,
                        productId: finalProductId,
                        codigoProduto: item.codigoProduto,
                        codigoBarras: item.codigoBarras,
                        descricao: item.descricao,
                        ncm: item.ncm,
                        cest: item.cest,
                        cfop: item.cfop,
                        unidade: item.unidade,
                        quantidade: item.quantidade,
                        valorUnitario: item.valorUnitario,
                        valorTotal: item.valorTotal,
                        icmsCst: item.icmsCst,
                        icmsCsosn: item.icmsCsosn,
                        icmsBaseCalculo: item.icmsBaseCalculo,
                        icmsAliquota: item.icmsAliquota,
                        icmsValor: item.icmsValor,
                        ipiCst: item.ipiCst,
                        ipiBaseCalculo: item.ipiBaseCalculo,
                        ipiAliquota: item.ipiAliquota,
                        ipiValor: item.ipiValor,
                        pisCst: item.pisCst,
                        pisBaseCalculo: item.pisBaseCalculo,
                        pisAliquota: item.pisAliquota,
                        pisValor: item.pisValor,
                        cofinsCst: item.cofinsCst,
                        cofinsBaseCalculo: item.cofinsBaseCalculo,
                        cofinsAliquota: item.cofinsAliquota,
                        cofinsValor: item.cofinsValor,
                        issCodigoServico: item.issCodigoServico,
                        issAliquota: item.issAliquota,
                        issValor: item.issValor
                    }
                });
            }
            // Step 4: Optional automatic accounts payable generation
            if (data.gerarContasPagar) {
                // Create financial payable record
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 30); // 30 days default payment term
                const responsavel = req.userName || 'Importador XML';
                await prisma_1.prisma.financialPayable.create({
                    data: {
                        companyId,
                        fornecedor: data.supplier.razaoSocial,
                        categoria: 'Compra de Mercadorias',
                        centroCusto: 'Operacional',
                        descricao: `NFe Importada Nº ${data.numeroNf} - Série ${data.serie || ''}`,
                        valor: data.valorTotal,
                        dataEmissao: new Date(data.dataEmissao),
                        vencimento: dueDate,
                        formaPagamento: 'Boleto',
                        responsavel: responsavel,
                        status: 'PENDENTE',
                        observacoes: `Importação automática da NF-e chave ${data.chaveAcesso}`,
                        responsavel_lancamento_id: userId || null,
                        responsavel_lancamento_nome: responsavel,
                        data_criacao: new Date()
                    }
                });
                audit_logger_1.AuditLogger.log(userId, companyId, 'CREATE_PAYABLE', `Auto-generated financial payable for NF ${data.numeroNf}`, 'SUCCESS');
            }
            // Write audit log
            await prisma_1.prisma.fiscalAudit.create({
                data: {
                    userId: userId || 'SYSTEM',
                    userName: req.userName || 'Importador XML',
                    userEmail: req.userEmail || 'system@nfe.com',
                    userProfile: req.role || 'CONTABILIDADE',
                    action: 'IMPORTACAO_NFE',
                    details: `Imported NF-e ${data.numeroNf} (Series: ${data.serie || ''}, Access Key: ${data.chaveAcesso}, Total: R$ ${data.valorTotal.toFixed(2)})`,
                    ipAddress: req.ip || '127.0.0.1'
                }
            });
            return res.status(201).json(nfeImport);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error('Error confirming NFe import:', error);
            return res.status(500).json({ error: 'Erro ao consolidar importação de nota fiscal.' });
        }
    },
    // 3. List Imported NFes
    async list(req, res) {
        try {
            const companyId = req.companyId || null;
            if (!companyId)
                return res.status(400).json({ error: 'Empresa não identificada.' });
            const nfeList = await prisma_1.prisma.nfeImport.findMany({
                where: { companyId },
                include: {
                    supplier: {
                        select: { razaoSocial: true, cnpj: true }
                    }
                },
                orderBy: { dataEmissao: 'desc' }
            });
            return res.json(nfeList);
        }
        catch (error) {
            console.error('Error listing NFe imports:', error);
            return res.status(500).json({ error: 'Erro ao listar notas fiscais importadas.' });
        }
    },
    // 4. View Details
    async getOne(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId || null;
            const nfe = await prisma_1.prisma.nfeImport.findFirst({
                where: { id, companyId },
                include: {
                    supplier: true,
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            });
            if (!nfe)
                return res.status(404).json({ error: 'Nota fiscal não localizada.' });
            return res.json(nfe);
        }
        catch (error) {
            console.error('Error getting NFe details:', error);
            return res.status(500).json({ error: 'Erro ao carregar detalhes da nota fiscal.' });
        }
    },
    // 5. Cancel Imported NFe (Mark as CANCELADO)
    async cancel(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            const userRole = req.role || null;
            // Rule check: only admin can cancel
            const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
            if (!user || (!user.roleAdmin)) {
                return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem cancelar notas fiscais importadas.' });
            }
            const nfe = await prisma_1.prisma.nfeImport.findFirst({
                where: { id, companyId }
            });
            if (!nfe)
                return res.status(404).json({ error: 'Nota fiscal não localizada.' });
            if (nfe.status === 'CANCELADO') {
                return res.status(400).json({ error: 'Esta nota fiscal já está cancelada.' });
            }
            // Mark as CANCELADO
            const updated = await prisma_1.prisma.nfeImport.update({
                where: { id },
                data: { status: 'CANCELADO' }
            });
            // Write audit log
            await prisma_1.prisma.fiscalAudit.create({
                data: {
                    userId,
                    userName: user.name,
                    userEmail: user.email,
                    userProfile: 'ADMINISTRADOR',
                    action: 'CANCELAMENTO_NFE',
                    details: `Cancelled NF-e ${nfe.numeroNf} (Access Key: ${nfe.chaveAcesso}, Total: R$ ${nfe.valorTotal.toFixed(2)})`,
                    ipAddress: req.ip || '127.0.0.1'
                }
            });
            return res.json(updated);
        }
        catch (error) {
            console.error('Error canceling NFe import:', error);
            return res.status(500).json({ error: 'Erro ao cancelar importação de nota fiscal.' });
        }
    },
    async downloadXml(req, res) {
        try {
            const companyId = req.companyId;
            const id = req.params.id;
            const nfe = await prisma_1.prisma.nfeImport.findFirst({ where: { id, companyId } });
            if (!nfe?.xmlOriginal) {
                return res.status(404).json({ error: 'XML da nota fiscal não encontrado.' });
            }
            const fileName = nfe.chaveAcesso ? `${nfe.chaveAcesso}.xml` : `NF${nfe.numeroNf}.xml`;
            res.setHeader('Content-Type', 'application/xml');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            return res.send(Buffer.from(nfe.xmlOriginal, 'utf8'));
        }
        catch (error) {
            console.error('Error downloading NFe XML:', error);
            return res.status(500).json({ error: 'Erro ao baixar XML da nota fiscal.' });
        }
    },
    // 6. Delete Imported NFe (Admin only)
    async delete(req, res) {
        try {
            const id = req.params.id;
            const companyId = req.companyId || null;
            const userId = req.userId || null;
            // Rule check: only admin can delete
            const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
            if (!user || (!user.roleAdmin)) {
                return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem excluir notas fiscais importadas.' });
            }
            const nfe = await prisma_1.prisma.nfeImport.findFirst({
                where: { id, companyId }
            });
            if (!nfe)
                return res.status(404).json({ error: 'Nota fiscal não localizada.' });
            // Delete the NFE Import. Cascade will handle NfeItem.
            // StockMovements remain as audit trail, but you might need manual adjustments if required.
            await prisma_1.prisma.nfeImport.delete({
                where: { id }
            });
            // Write audit log
            await prisma_1.prisma.fiscalAudit.create({
                data: {
                    userId,
                    userName: user.name,
                    userEmail: user.email,
                    userProfile: 'ADMINISTRADOR',
                    action: 'EXCLUSAO_NFE',
                    details: `Deleted NF-e ${nfe.numeroNf} (Access Key: ${nfe.chaveAcesso}, Total: R$ ${nfe.valorTotal.toFixed(2)})`,
                    ipAddress: req.ip || '127.0.0.1'
                }
            });
            return res.status(204).send();
        }
        catch (error) {
            console.error('Error deleting NFe import:', error);
            return res.status(500).json({ error: 'Erro ao excluir importação de nota fiscal.' });
        }
    }
};
