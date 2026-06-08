import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuditLogger } from '../utils/audit.logger';

// Helper: Extract text from tag
function tagContent(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

// Helper: Extract tag content from a block
function blockContent(xml: string, blockName: string): string | null {
  const regex = new RegExp(`<${blockName}>([\\s\\S]*?)</${blockName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : null;
}

// Parse NFe XML using regex
export function parseNfeXml(xmlText: string) {
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
      if (cstMatch) icmsCst = cstMatch[1];
      if (csosnMatch) icmsCsosn = csosnMatch[1];

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
  } catch (error) {
    console.error('Error parsing XML regex:', error);
    throw new Error('Falha ao processar a estrutura do arquivo XML.');
  }
}

const confirmNfeSchema = z.object({
  chaveAcesso: z.string(),
  numeroNf: z.string(),
  serie: z.string().optional().nullable(),
  dataEmissao: z.string(),
  naturezaOperacao: z.string().optional().nullable(),
  valorProdutos: z.number(),
  valorFrete: z.number(),
  valorSeguro: z.number(),
  valorDesconto: z.number(),
  valorTotal: z.number(),
  xmlOriginal: z.string(),
  
  supplier: z.object({
    id: z.string().optional().nullable(),
    razaoSocial: z.string(),
    nomeFantasia: z.string().optional().nullable(),
    cnpj: z.string(),
    telefone: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    logradouro: z.string().optional().nullable(),
    numero: z.string().optional().nullable(),
    complemento: z.string().optional().nullable(),
    bairro: z.string().optional().nullable(),
    cep: z.string().optional().nullable(),
    cidade: z.string().optional().nullable(),
    estado: z.string().optional().nullable(),
  }),
  
  items: z.array(z.object({
    productId: z.string().optional().nullable(),
    createProduct: z.boolean().default(false),
    codigoProduto: z.string(),
    codigoBarras: z.string().optional().nullable(),
    descricao: z.string(),
    ncm: z.string().optional().nullable(),
    cest: z.string().optional().nullable(),
    cfop: z.string().optional().nullable(),
    unidade: z.string().optional().nullable(),
    quantidade: z.number(),
    valorUnitario: z.number(),
    valorTotal: z.number(),
    
    icmsCst: z.string().optional().nullable(),
    icmsCsosn: z.string().optional().nullable(),
    icmsBaseCalculo: z.number().optional().nullable(),
    icmsAliquota: z.number().optional().nullable(),
    icmsValor: z.number().optional().nullable(),
    
    ipiCst: z.string().optional().nullable(),
    ipiBaseCalculo: z.number().optional().nullable(),
    ipiAliquota: z.number().optional().nullable(),
    ipiValor: z.number().optional().nullable(),
    
    pisCst: z.string().optional().nullable(),
    pisBaseCalculo: z.number().optional().nullable(),
    pisAliquota: z.number().optional().nullable(),
    pisValor: z.number().optional().nullable(),
    
    cofinsCst: z.string().optional().nullable(),
    cofinsBaseCalculo: z.number().optional().nullable(),
    cofinsAliquota: z.number().optional().nullable(),
    cofinsValor: z.number().optional().nullable(),
    
    issCodigoServico: z.string().optional().nullable(),
    issAliquota: z.number().optional().nullable(),
    issValor: z.number().optional().nullable(),
    
    // UI Selected tax links for new products
    tributacaoMunicipalId: z.string().optional().nullable(),
    tributacaoEstadualId: z.string().optional().nullable(),
    tributacaoFederalId: z.string().optional().nullable(),
  })),
  
  gerarContasPagar: z.boolean().default(false),
});

export const NfeController = {
  // 1. Upload & Pre-parse XML
  async upload(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      if (!companyId) return res.status(400).json({ error: 'Empresa não identificada.' });

      const { xmlContent } = req.body as { xmlContent: string };
      if (!xmlContent) {
        return res.status(400).json({ error: 'Conteúdo do XML não enviado.' });
      }

      // Parse XML
      const nfeData = parseNfeXml(xmlContent);

      if (!nfeData.chaveAcesso) {
        return res.status(400).json({ error: 'Chave de acesso da NF-e não localizada no XML.' });
      }

      // a. Check duplicate key
      const duplicateKey = await prisma.nfeImport.findUnique({
        where: { chaveAcesso: nfeData.chaveAcesso }
      });
      const isDuplicate = !!duplicateKey;

      // b. Verify recipient CNPJ
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      if (!company) return res.status(404).json({ error: 'Tenant company não cadastrada.' });

      const destCnpjClean = nfeData.destCnpj.replace(/\D/g, '');
      const companyCnpjClean = company.cnpjSemMascara || company.cnpj.replace(/\D/g, '');
      const isCnpjMatch = destCnpjClean === companyCnpjClean;

      // c. Find Supplier in database
      const supplierCnpjClean = nfeData.supplier.cnpj.replace(/\D/g, '');
      const existingSupplier = await prisma.supplier.findFirst({
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
          matchedProduct = await prisma.product.findFirst({
            where: { codigoBarras: item.codigoBarras, companyId }
          });
        }

        // Try product code
        if (!matchedProduct && item.codigoProduto) {
          matchedProduct = await prisma.product.findFirst({
            where: { codigo: item.codigoProduto, companyId }
          });
        }

        // Try exact description
        if (!matchedProduct && item.descricao) {
          matchedProduct = await prisma.product.findFirst({
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
    } catch (error: any) {
      console.error('Error in upload XML:', error);
      return res.status(500).json({ error: error.message || 'Erro ao processar arquivo XML.' });
    }
  },

  // 2. Confirm Ingestion
  async confirm(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;
      if (!companyId) return res.status(400).json({ error: 'Empresa não identificada.' });

      const data = confirmNfeSchema.parse(req.body);

      // Check duplicate key again for concurrency
      const duplicateKey = await prisma.nfeImport.findUnique({
        where: { chaveAcesso: data.chaveAcesso }
      });
      if (duplicateKey) {
        return res.status(409).json({ error: 'Esta nota fiscal (chave de acesso) já foi importada anteriormente.', code: 'DUPLICATE_KEY' });
      }

      // Step 1: Supplier Resolution
      let supplierId = data.supplier.id;
      if (!supplierId) {
        const supplierCnpjClean = data.supplier.cnpj.replace(/\D/g, '');
        // Check if supplier was created concurrently
        const existingSupplier = await prisma.supplier.findFirst({
          where: { cnpjSemMascara: supplierCnpjClean, companyId }
        });
        if (existingSupplier) {
          supplierId = existingSupplier.id;
        } else {
          const newSupplier = await prisma.supplier.create({
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
          AuditLogger.log(userId, companyId, 'CREATE_SUPPLIER', `Auto-registered supplier during NFe import: ${newSupplier.razaoSocial}`, 'SUCCESS');
        }
      }

      // Step 2: Create imported NFe header
      const nfeImport = await prisma.nfeImport.create({
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
          const newProduct = await prisma.product.create({
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
              tributacaoMunicipalId: item.tributacaoMunicipalId,
              tributacaoEstadualId: item.tributacaoEstadualId,
              tributacaoFederalId: item.tributacaoFederalId,
              companyId
            }
          });
          finalProductId = newProduct.id;
        }

        // b. Update stock & average cost if product is linked
        if (finalProductId) {
          const prod = await prisma.product.findUnique({
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

            await prisma.product.update({
              where: { id: finalProductId },
              data: {
                quantidadeEstoque: newQty,
                valorCusto: item.valorUnitario, // latest cost
                custoMedio: newAvg
              }
            });

            // Create Stock Movement log
            await prisma.stockMovement.create({
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
        await prisma.nfeItem.create({
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

        const responsavel = (req as any).userName || 'Importador XML';

        await prisma.financialPayable.create({
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

        AuditLogger.log(userId, companyId, 'CREATE_PAYABLE', `Auto-generated financial payable for NF ${data.numeroNf}`, 'SUCCESS');
      }

      // Write audit log
      await prisma.fiscalAudit.create({
        data: {
          userId: userId || 'SYSTEM',
          userName: (req as any).userName || 'Importador XML',
          userEmail: (req as any).userEmail || 'system@nfe.com',
          userProfile: (req as any).role || 'CONTABILIDADE',
          action: 'IMPORTACAO_NFE',
          details: `Imported NF-e ${data.numeroNf} (Series: ${data.serie || ''}, Access Key: ${data.chaveAcesso}, Total: R$ ${data.valorTotal.toFixed(2)})`,
          ipAddress: req.ip || '127.0.0.1'
        }
      });

      return res.status(201).json(nfeImport);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      console.error('Error confirming NFe import:', error);
      return res.status(500).json({ error: 'Erro ao consolidar importação de nota fiscal.' });
    }
  },

  // 3. List Imported NFes
  async list(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      if (!companyId) return res.status(400).json({ error: 'Empresa não identificada.' });

      const nfeList = await prisma.nfeImport.findMany({
        where: { companyId },
        include: {
          supplier: {
            select: { razaoSocial: true, cnpj: true }
          }
        },
        orderBy: { dataEmissao: 'desc' }
      });

      return res.json(nfeList);
    } catch (error) {
      console.error('Error listing NFe imports:', error);
      return res.status(500).json({ error: 'Erro ao listar notas fiscais importadas.' });
    }
  },

  // 4. View Details
  async getOne(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId || null;

      const nfe = await prisma.nfeImport.findFirst({
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

      if (!nfe) return res.status(404).json({ error: 'Nota fiscal não localizada.' });
      return res.json(nfe);
    } catch (error) {
      console.error('Error getting NFe details:', error);
      return res.status(500).json({ error: 'Erro ao carregar detalhes da nota fiscal.' });
    }
  },

  // 5. Cancel Imported NFe (Mark as CANCELADO)
  async cancel(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId || null;
      const userId = (req as any).userId || null;
      const userRole = (req as any).role || null;

      // Rule check: only admin can cancel
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || (!user.roleAdmin)) {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem cancelar notas fiscais importadas.' });
      }

      const nfe = await prisma.nfeImport.findFirst({
        where: { id, companyId }
      });

      if (!nfe) return res.status(404).json({ error: 'Nota fiscal não localizada.' });
      if (nfe.status === 'CANCELADO') {
        return res.status(400).json({ error: 'Esta nota fiscal já está cancelada.' });
      }

      // Mark as CANCELADO
      const updated = await prisma.nfeImport.update({
        where: { id },
        data: { status: 'CANCELADO' }
      });

      // Write audit log
      await prisma.fiscalAudit.create({
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
    } catch (error) {
      console.error('Error canceling NFe import:', error);
      return res.status(500).json({ error: 'Erro ao cancelar importação de nota fiscal.' });
    }
  }
};
