-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "roleAdmin" BOOLEAN NOT NULL DEFAULT false,
    "roleOrcamentista" BOOLEAN NOT NULL DEFAULT false,
    "roleContasPagar" BOOLEAN NOT NULL DEFAULT false,
    "roleContasReceber" BOOLEAN NOT NULL DEFAULT false,
    "roleContabilidade" BOOLEAN NOT NULL DEFAULT false,
    "roleRh" BOOLEAN NOT NULL DEFAULT false,
    "roleColaborador" BOOLEAN NOT NULL DEFAULT false,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OFICINA',
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT NOT NULL,
    "cnpjSemMascara" TEXT NOT NULL,
    "inscricaoEstadual" TEXT,
    "endereco" TEXT,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "logo" TEXT,
    "regimeTributario" TEXT,
    "parentCompanyId" TEXT,
    "plano_id" TEXT,
    "status_assinatura" TEXT DEFAULT 'Trial',
    "data_contratacao" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "data_vencimento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "empresa" TEXT,
    "cnpj" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cep" TEXT,
    "dataSituacao" TEXT,
    "atividadePrincipal" TEXT,
    "whatsapp" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "numeroOrcamento" SERIAL NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "condicaoPagamento" TEXT NOT NULL,
    "parcelas" INTEGER,
    "valorParcela" DOUBLE PRECISION,
    "validade" TEXT NOT NULL,
    "garantia" TEXT,
    "prazoExecucao" TEXT,
    "observacao" TEXT,
    "veiculoMarca" TEXT,
    "veiculoModelo" TEXT,
    "veiculoAno" TEXT,
    "veiculoPlaca" TEXT,
    "veiculoPrefixo" TEXT,
    "veiculoAnoFabricacao" TEXT,
    "veiculoAnoModelo" TEXT,
    "veiculoChassi" TEXT,
    "veiculoRenavam" TEXT,
    "veiculoFrota" TEXT,
    "veiculoSubfrota" TEXT,
    "veiculoHodometro" TEXT,
    "veiculoTipo" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Orçamento',
    "plataformaGestaoId" TEXT,
    "osExterna" TEXT,
    "oficinaId" TEXT,
    "notaFiscalDescricao" TEXT,
    "veiculoId" TEXT,
    "isCloned" BOOLEAN NOT NULL DEFAULT false,
    "clonedFromId" TEXT,
    "mecanicoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteHistory" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" VARCHAR(255) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valorUnitario" DOUBLE PRECISION NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'Peça',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "codigo_peca" VARCHAR(100),
    "tipo_peca" VARCHAR(30),

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailConfig" (
    "id" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "user" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialPayable" (
    "id" TEXT NOT NULL,
    "numeroLancamento" SERIAL NOT NULL,
    "companyId" TEXT NOT NULL,
    "fornecedor" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "centroCusto" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "dataEmissao" TIMESTAMP(3) NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "formaPagamento" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "recorrente" BOOLEAN NOT NULL DEFAULT false,
    "tipoRecorrencia" TEXT,
    "quantidadeParcelas" INTEGER,
    "parcelaAtual" INTEGER DEFAULT 1,
    "dataFinalRecorrencia" TIMESTAMP(3),
    "pagamentoAutomatico" BOOLEAN NOT NULL DEFAULT false,
    "parentRecurrenceId" TEXT,
    "responsavel_lancamento_id" TEXT,
    "responsavel_lancamento_nome" TEXT,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialPayable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialReceivable" (
    "id" TEXT NOT NULL,
    "numeroRecebimento" SERIAL NOT NULL,
    "companyId" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "origem_tipo" TEXT,
    "origem_id" TEXT,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "dataEmissao" TIMESTAMP(3) NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "dataRecebimento" TIMESTAMP(3),
    "formaRecebimento" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "quoteId" TEXT,
    "responsavel_lancamento_id" TEXT,
    "responsavel_lancamento_nome" TEXT,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialReceivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAttachment" (
    "id" TEXT NOT NULL,
    "payableId" TEXT,
    "receivableId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAudit" (
    "id" TEXT NOT NULL,
    "payableId" TEXT,
    "receivableId" TEXT,
    "action" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "user" TEXT NOT NULL,
    "changes" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT,
    "cnpjSemMascara" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cep" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "dataSituacao" TEXT,
    "atividadePrincipal" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "renavam" TEXT,
    "chassi" TEXT,
    "vin" TEXT,
    "frota" TEXT,
    "subfrota" TEXT,
    "prefixo" TEXT,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "versao" TEXT,
    "anoFabricacao" INTEGER NOT NULL,
    "anoModelo" INTEGER NOT NULL,
    "cor" TEXT,
    "combustivel" TEXT,
    "tipoVeiculo" TEXT,
    "kmAtual" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "observacoes" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultaPlaca" (
    "id" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "retornoApi" TEXT NOT NULL,
    "dataConsulta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SUCESSO',

    CONSTRAINT "ConsultaPlaca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Oficina" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "responsavel" TEXT,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "endereco" TEXT,
    "servicosRealizados" TEXT,
    "observacoes" TEXT,
    "banco" TEXT,
    "agencia" TEXT,
    "contaCorrente" TEXT,
    "tipoConta" TEXT,
    "chavePix" TEXT,
    "favorecido" TEXT,
    "cpfCnpjFavorecido" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Oficina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrocaOleoMotor" (
    "id" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "dataTroca" TIMESTAMP(3) NOT NULL,
    "kmTroca" INTEGER NOT NULL,
    "tipoOleo" TEXT,
    "quantidade" DOUBLE PRECISION,
    "proximaTrocaKm" INTEGER NOT NULL,
    "proximaTrocaData" TIMESTAMP(3) NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrocaOleoMotor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrocaOleoCambio" (
    "id" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "tipoCambio" TEXT NOT NULL,
    "dataTroca" TIMESTAMP(3) NOT NULL,
    "kmTroca" INTEGER NOT NULL,
    "oleoUtilizado" TEXT,
    "quantidade" DOUBLE PRECISION,
    "proximaTrocaKm" INTEGER NOT NULL,
    "proximaTrocaData" TIMESTAMP(3) NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrocaOleoCambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleEvent" (
    "id" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "km" INTEGER,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION,
    "oficinaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collaborator" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "cpfSemMascara" TEXT,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "cargo" TEXT,
    "departamento" TEXT,
    "dataAdmissao" TIMESTAMP(3),
    "salario" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "observacoes" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "faltas" INTEGER NOT NULL DEFAULT 0,
    "descontoAusencia" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "observacoesFaltas" TEXT,
    "dataUltimaAtualizacao" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT,
    "oficinaId" TEXT,
    "cargaHoraria" DOUBLE PRECISION,
    "valorHora" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayableQuoteLink" (
    "id" TEXT NOT NULL,
    "payableId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "valorVinculado" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayableQuoteLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivableQuoteLink" (
    "id" TEXT NOT NULL,
    "receivableId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "valorVinculado" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceivableQuoteLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxSetting" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "aliquota" DOUBLE PRECISION NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'FATURAMENTO',
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlataformaGestao" (
    "id" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "cnpjSemMascara" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "responsavel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "observacoes" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "companyId" TEXT,
    "contratoVersao" INTEGER NOT NULL DEFAULT 1,
    "valorBaseGuincho" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorKmGuincho" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorHoraParadaGuincho" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorServicoMecanico" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorDeslocamento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorHoraTecnica" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorHoraEspecializada" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlataformaGestao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryAdvance" (
    "id" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "formaPagamento" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responsavel" TEXT NOT NULL,
    "observacoes" TEXT,
    "numeroComprovante" TEXT NOT NULL,
    "payableId" TEXT,
    "oficinaId" TEXT,
    "payment_date" TIMESTAMP(3),
    "payroll_competency" TEXT,
    "discount_status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "discounted_at" TIMESTAMP(3),
    "discounted_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryAdvancePdf" (
    "id" TEXT NOT NULL,
    "salaryAdvanceId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryAdvancePdf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalDocument" (
    "id" TEXT NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "chaveAcesso" TEXT,
    "tipo" TEXT NOT NULL,
    "tipoDocumento" TEXT,
    "serie" TEXT,
    "numeroNota" TEXT,
    "nomeArquivo" TEXT NOT NULL,
    "dataEmissao" TIMESTAMP(3),
    "valorTotal" DOUBLE PRECISION,
    "valorBruto" DOUBLE PRECISION,
    "valorLiquido" DOUBLE PRECISION,
    "valorImpostos" DOUBLE PRECISION,
    "icms" DOUBLE PRECISION DEFAULT 0,
    "ipi" DOUBLE PRECISION DEFAULT 0,
    "pis" DOUBLE PRECISION DEFAULT 0,
    "cofins" DOUBLE PRECISION DEFAULT 0,
    "iss" DOUBLE PRECISION DEFAULT 0,
    "irpj" DOUBLE PRECISION DEFAULT 0,
    "csll" DOUBLE PRECISION DEFAULT 0,
    "emitenteNome" TEXT,
    "emitenteCnpj" TEXT,
    "destinatarioNome" TEXT,
    "destinatarioCnpj" TEXT,
    "clienteNome" TEXT,
    "fornecedorNome" TEXT,
    "origemNota" TEXT DEFAULT 'UPLOAD_MANUAL',
    "usuarioResponsavelId" TEXT,
    "usuarioResponsavelNome" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IMPORTADO',
    "xmlContent" TEXT,
    "fileUrl" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalAudit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userProfile" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "ipAddress" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiscalAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "limite_usuarios" INTEGER NOT NULL,
    "limite_os_mes" INTEGER NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "descricao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Trial',
    "dataContratacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleLicense" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModuleLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "dataPagamento" TIMESTAMP(3),
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "referenciaMes" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionHistory" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "planoAnterior" TEXT,
    "planoNovo" TEXT NOT NULL,
    "statusAnterior" TEXT,
    "statusNovo" TEXT NOT NULL,
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_empresas" (
    "id" TEXT NOT NULL,
    "razao_social" TEXT NOT NULL,
    "nome_fantasia" TEXT,
    "cnpj" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "responsavel" TEXT,
    "plano_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "data_vencimento" TIMESTAMP(3),
    "limite_usuarios" INTEGER NOT NULL DEFAULT 5,
    "limite_veiculos" INTEGER NOT NULL DEFAULT 100,
    "limite_os" INTEGER NOT NULL DEFAULT 100,
    "limite_armazenamento" INTEGER NOT NULL DEFAULT 5000,
    "company_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_planos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "valor_mensal" DOUBLE PRECISION NOT NULL,
    "valor_anual" DOUBLE PRECISION NOT NULL,
    "limite_usuarios" INTEGER NOT NULL,
    "limite_veiculos" INTEGER NOT NULL,
    "limite_os" INTEGER NOT NULL,
    "limite_orcamentos" INTEGER NOT NULL,
    "limite_armazenamento" INTEGER NOT NULL,
    "possui_api" BOOLEAN NOT NULL DEFAULT false,
    "possui_integracoes" BOOLEAN NOT NULL DEFAULT false,
    "possui_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "possui_bi" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_planos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_assinaturas" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "plano_id" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVA',
    "data_contratacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_vencimento" TIMESTAMP(3) NOT NULL,
    "ultimo_pagamento" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_faturamento" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "plano_id" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "competencia" TEXT NOT NULL,
    "data_pagamento" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_faturamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_configuracoes" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_configuracoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_auditoria" (
    "id" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "tenant" TEXT,
    "ip" TEXT,
    "data_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acao" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "registro_affected" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saas_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_tenants" (
    "id" TEXT NOT NULL,
    "razao_social" TEXT NOT NULL,
    "nome_fantasia" TEXT,
    "cnpj" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "responsavel" TEXT NOT NULL,
    "plano_id" TEXT,
    "data_contratacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_vencimento" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Trial',
    "limite_usuarios" INTEGER NOT NULL DEFAULT 5,
    "limite_veiculos" INTEGER NOT NULL DEFAULT 100,
    "limite_oficinas" INTEGER NOT NULL DEFAULT 3,
    "limite_os" INTEGER NOT NULL DEFAULT 100,
    "company_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_plans" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "valor_mensal" DOUBLE PRECISION NOT NULL,
    "valor_anual" DOUBLE PRECISION NOT NULL,
    "limite_usuarios" INTEGER NOT NULL,
    "limite_veiculos" INTEGER NOT NULL,
    "limite_oficinas" INTEGER NOT NULL,
    "limite_os" INTEGER NOT NULL,
    "beneficios" TEXT,
    "tipo_plano" TEXT NOT NULL DEFAULT 'OFICINA',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plano_id" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "forma_pagamento" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Ativa',
    "data_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_renovacao" TIMESTAMP(3) NOT NULL,
    "ultimo_pagamento" TIMESTAMP(3),
    "proximo_pagamento" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_modules" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "descricao" TEXT,
    "valor_adicional" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_tenant_modules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "configuracao" TEXT,
    "valor_adicional_cobrado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_tenant_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_users" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpf" TEXT,
    "password" TEXT NOT NULL,
    "role_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "ultimo_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_roles" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_permissions" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "saas_role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "saas_audit_logs" (
    "id" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "tenant" TEXT,
    "acao" TEXT NOT NULL,
    "detalhes" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saas_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_notifications" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'INFO',
    "prioridade" TEXT NOT NULL DEFAULT 'MEDIA',
    "expira_em" TIMESTAMP(3),
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "target_company_id" TEXT,
    "target_role" TEXT,

    CONSTRAINT "saas_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_notification_reads" (
    "id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saas_notification_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_settings" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_gateway_logs" (
    "id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saas_gateway_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsenceHistory" (
    "id" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "collaboratorName" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "faltas" INTEGER NOT NULL,
    "valorDescontado" DOUBLE PRECISION NOT NULL,
    "usuarioResponsavel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "AbsenceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsenceAudit" (
    "id" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "collaboratorName" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "valorAnterior" TEXT NOT NULL,
    "valorNovo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "AbsenceAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_absences" (
    "id" TEXT NOT NULL,
    "collaborator_id" TEXT NOT NULL,
    "data_falta" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "dias_falta" INTEGER NOT NULL DEFAULT 1,
    "motivo" TEXT,
    "observacao" TEXT,
    "file_name" TEXT,
    "file_type" TEXT,
    "file_url" TEXT,
    "responsavel_id" TEXT,
    "responsavel_nome" TEXT NOT NULL,
    "company_id" TEXT,
    "oficina_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_absences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "codigo" TEXT,
    "codigoBarras" TEXT,
    "descricao" TEXT NOT NULL,
    "unidade" TEXT,
    "valorCusto" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "custoMedio" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "quantidadeEstoque" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "ncm" TEXT,
    "cest" TEXT,
    "cfopEntrada" TEXT,
    "tributacaoMunicipalId" TEXT,
    "tributacaoEstadualId" TEXT,
    "tributacaoFederalId" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "valorUnitario" DOUBLE PRECISION NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "origem" TEXT NOT NULL,
    "documentoOrigem" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NfeImport" (
    "id" TEXT NOT NULL,
    "chaveAcesso" TEXT NOT NULL,
    "numeroNf" TEXT NOT NULL,
    "serie" TEXT,
    "dataEmissao" TIMESTAMP(3) NOT NULL,
    "dataEntrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "naturezaOperacao" TEXT,
    "valorProdutos" DOUBLE PRECISION NOT NULL,
    "valorFrete" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "valorSeguro" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "valorDesconto" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "xmlOriginal" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IMPORTADO',
    "supplierId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NfeImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NfeItem" (
    "id" TEXT NOT NULL,
    "nfeImportId" TEXT NOT NULL,
    "productId" TEXT,
    "codigoProduto" TEXT NOT NULL,
    "codigoBarras" TEXT,
    "descricao" TEXT NOT NULL,
    "ncm" TEXT,
    "cest" TEXT,
    "cfop" TEXT,
    "unidade" TEXT,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "valorUnitario" DOUBLE PRECISION NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "icmsCst" TEXT,
    "icmsCsosn" TEXT,
    "icmsBaseCalculo" DOUBLE PRECISION,
    "icmsAliquota" DOUBLE PRECISION,
    "icmsValor" DOUBLE PRECISION,
    "ipiCst" TEXT,
    "ipiBaseCalculo" DOUBLE PRECISION,
    "ipiAliquota" DOUBLE PRECISION,
    "ipiValor" DOUBLE PRECISION,
    "pisCst" TEXT,
    "pisBaseCalculo" DOUBLE PRECISION,
    "pisAliquota" DOUBLE PRECISION,
    "pisValor" DOUBLE PRECISION,
    "cofinsCst" TEXT,
    "cofinsBaseCalculo" DOUBLE PRECISION,
    "cofinsAliquota" DOUBLE PRECISION,
    "cofinsValor" DOUBLE PRECISION,
    "issCodigoServico" TEXT,
    "issAliquota" DOUBLE PRECISION,
    "issValor" DOUBLE PRECISION,

    CONSTRAINT "NfeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tributacao" (
    "id" TEXT NOT NULL,
    "esfera" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "municipio" TEXT,
    "codigoServico" TEXT,
    "aliquotaIss" DOUBLE PRECISION,
    "retencaoIss" BOOLEAN NOT NULL DEFAULT false,
    "situacaoTributaria" TEXT,
    "uf" TEXT,
    "cfop" TEXT,
    "cstIcms" TEXT,
    "csosn" TEXT,
    "aliquotaIcms" DOUBLE PRECISION,
    "fcp" DOUBLE PRECISION,
    "difal" DOUBLE PRECISION,
    "observacao" TEXT,
    "cstPis" TEXT,
    "cstCofins" TEXT,
    "cstIpi" TEXT,
    "aliquotaPis" DOUBLE PRECISION,
    "aliquotaCofins" DOUBLE PRECISION,
    "aliquotaIpi" DOUBLE PRECISION,
    "naturezaReceita" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tributacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TowingDriver" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "cnh" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "validadeCnh" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TowingDriver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TowingVehicle" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT NOT NULL,
    "ano" INTEGER,
    "tipo" TEXT NOT NULL,
    "capacidade" TEXT,
    "eixos" INTEGER,
    "consumoMedio" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "towingTypeId" TEXT,
    "rntrcNumero" TEXT,
    "rntrcStatus" TEXT,
    "rntrcValidade" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TowingVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TowingRate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "plataforma_id" TEXT,
    "tipoGuincho" TEXT NOT NULL,
    "taxaSaida" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorHoraParada" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "regiao" TEXT NOT NULL DEFAULT 'Geral',
    "horario" TEXT NOT NULL DEFAULT 'DIURNO',
    "regraComercial" TEXT NOT NULL DEFAULT 'PADRAO',
    "towingTypeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TowingRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TowingType" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TowingType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TowingRateHistory" (
    "id" TEXT NOT NULL,
    "towingRateId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" VARCHAR(255) NOT NULL,
    "taxaSaidaAnterior" DOUBLE PRECISION NOT NULL,
    "taxaSaidaNova" DOUBLE PRECISION NOT NULL,
    "valorKmAnterior" DOUBLE PRECISION NOT NULL,
    "valorKmNovo" DOUBLE PRECISION NOT NULL,
    "valorHoraParadaAnterior" DOUBLE PRECISION NOT NULL,
    "valorHoraParadaNovo" DOUBLE PRECISION NOT NULL,
    "statusAnterior" TEXT,
    "statusNovo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TowingRateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TowingQuote" (
    "id" TEXT NOT NULL,
    "numeroOrcamento" SERIAL NOT NULL,
    "numeroFormatado" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Orçamento',
    "companyId" TEXT NOT NULL,
    "clientId" TEXT,
    "userId" TEXT,
    "clienteNome" TEXT,
    "clienteEmpresa" TEXT,
    "clienteTelefone" TEXT,
    "clienteEmail" TEXT,
    "clienteDoc" TEXT,
    "origemCep" TEXT,
    "origemEndereco" TEXT,
    "origemNumero" TEXT,
    "origemComplemento" TEXT,
    "origemCidade" TEXT,
    "origemEstado" TEXT,
    "destinoCep" TEXT,
    "destinoEndereco" TEXT,
    "destinoNumero" TEXT,
    "destinoComplemento" TEXT,
    "destinoCidade" TEXT,
    "destinoEstado" TEXT,
    "distanciaKm" DOUBLE PRECISION,
    "tempoEstimadoMin" INTEGER,
    "veiculoPlaca" TEXT,
    "veiculoMarca" TEXT,
    "veiculoModelo" TEXT,
    "veiculoAno" TEXT,
    "veiculoCor" TEXT,
    "veiculoChassi" TEXT,
    "veiculoValorAproximado" DOUBLE PRECISION,
    "tipoGuincho" TEXT,
    "valorVeiculo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tipoCliente" TEXT NOT NULL DEFAULT 'Particular',
    "plataformaId" TEXT,
    "regiao" TEXT DEFAULT 'Geral',
    "horario" TEXT DEFAULT 'DIURNO',
    "regraComercial" TEXT DEFAULT 'PADRAO',
    "driverId" TEXT,
    "vehicleId" TEXT,
    "taxaSaida" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasParadas" INTEGER NOT NULL DEFAULT 0,
    "valorHoraParada" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pedagios" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qtdPedagios" INTEGER NOT NULL DEFAULT 0,
    "pedagiosDetalhes" JSONB,
    "despesasExtras" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descontos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "acrescimos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impostos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "anttTipoCarga" TEXT,
    "anttEixos" INTEGER,
    "anttComposicao" BOOLEAN NOT NULL DEFAULT false,
    "anttAltoDesempenho" BOOLEAN NOT NULL DEFAULT false,
    "anttRetornoVazio" BOOLEAN NOT NULL DEFAULT false,
    "anttPisoMinimo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TowingQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guias_transporte" (
    "id" TEXT NOT NULL,
    "numeroGuia" SERIAL NOT NULL,
    "numeroFormatado" TEXT,
    "orcamentoId" TEXT NOT NULL,
    "clienteId" TEXT,
    "dataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APROVADO',
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guias_transporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guias_transporte_audits" (
    "id" TEXT NOT NULL,
    "guiaTransporteId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "detalhes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guias_transporte_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlataformaContratoHistory" (
    "id" TEXT NOT NULL,
    "plataformaId" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "valorBaseGuinchoAnt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorKmGuinchoAnt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorHoraParadaGuinchoAnt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorServicoMecanicoAnt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorDeslocamentoAnt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorHoraTecnicaAnt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorHoraEspecializadaAnt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorBaseGuinchoNovo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorKmGuinchoNovo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorHoraParadaGuinchoNovo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorServicoMecanicoNovo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorDeslocamentoNovo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorHoraTecnicaNovo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorHoraEspecializadaNovo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlataformaContratoHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreTenant" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "planId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreTenant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_cnpj_key" ON "Company"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Company_cnpjSemMascara_key" ON "Company"("cnpjSemMascara");

-- CreateIndex
CREATE INDEX "Company_cnpj_idx" ON "Company"("cnpj");

-- CreateIndex
CREATE INDEX "Company_parentCompanyId_idx" ON "Company"("parentCompanyId");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_cnpj_idx" ON "Client"("cnpj");

-- CreateIndex
CREATE INDEX "Client_companyId_idx" ON "Client"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_numeroOrcamento_key" ON "Quote"("numeroOrcamento");

-- CreateIndex
CREATE INDEX "Quote_companyId_idx" ON "Quote"("companyId");

-- CreateIndex
CREATE INDEX "Quote_clientId_idx" ON "Quote"("clientId");

-- CreateIndex
CREATE INDEX "Quote_plataformaGestaoId_idx" ON "Quote"("plataformaGestaoId");

-- CreateIndex
CREATE INDEX "Quote_oficinaId_idx" ON "Quote"("oficinaId");

-- CreateIndex
CREATE INDEX "Quote_veiculoId_idx" ON "Quote"("veiculoId");

-- CreateIndex
CREATE INDEX "Quote_mecanicoId_idx" ON "Quote"("mecanicoId");

-- CreateIndex
CREATE INDEX "QuoteHistory_quoteId_idx" ON "QuoteHistory"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteHistory_companyId_idx" ON "QuoteHistory"("companyId");

-- CreateIndex
CREATE INDEX "QuoteHistory_userId_idx" ON "QuoteHistory"("userId");

-- CreateIndex
CREATE INDEX "QuoteItem_quoteId_idx" ON "QuoteItem"("quoteId");

-- CreateIndex
CREATE INDEX "EmailConfig_companyId_idx" ON "EmailConfig"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialPayable_numeroLancamento_key" ON "FinancialPayable"("numeroLancamento");

-- CreateIndex
CREATE INDEX "FinancialPayable_companyId_idx" ON "FinancialPayable"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialReceivable_numeroRecebimento_key" ON "FinancialReceivable"("numeroRecebimento");

-- CreateIndex
CREATE INDEX "FinancialReceivable_companyId_idx" ON "FinancialReceivable"("companyId");

-- CreateIndex
CREATE INDEX "FinancialReceivable_quoteId_idx" ON "FinancialReceivable"("quoteId");

-- CreateIndex
CREATE INDEX "FinancialAttachment_payableId_idx" ON "FinancialAttachment"("payableId");

-- CreateIndex
CREATE INDEX "FinancialAttachment_receivableId_idx" ON "FinancialAttachment"("receivableId");

-- CreateIndex
CREATE INDEX "FinancialAudit_payableId_idx" ON "FinancialAudit"("payableId");

-- CreateIndex
CREATE INDEX "FinancialAudit_receivableId_idx" ON "FinancialAudit"("receivableId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_cnpj_key" ON "Supplier"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_cnpjSemMascara_key" ON "Supplier"("cnpjSemMascara");

-- CreateIndex
CREATE INDEX "Supplier_cnpj_idx" ON "Supplier"("cnpj");

-- CreateIndex
CREATE INDEX "Supplier_companyId_idx" ON "Supplier"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_placa_key" ON "Vehicle"("placa");

-- CreateIndex
CREATE INDEX "Vehicle_clienteId_idx" ON "Vehicle"("clienteId");

-- CreateIndex
CREATE INDEX "Vehicle_placa_idx" ON "Vehicle"("placa");

-- CreateIndex
CREATE INDEX "Vehicle_companyId_idx" ON "Vehicle"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultaPlaca_placa_key" ON "ConsultaPlaca"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "Oficina_cnpj_key" ON "Oficina"("cnpj");

-- CreateIndex
CREATE INDEX "TrocaOleoMotor_veiculoId_idx" ON "TrocaOleoMotor"("veiculoId");

-- CreateIndex
CREATE INDEX "TrocaOleoMotor_oficinaId_idx" ON "TrocaOleoMotor"("oficinaId");

-- CreateIndex
CREATE INDEX "TrocaOleoCambio_veiculoId_idx" ON "TrocaOleoCambio"("veiculoId");

-- CreateIndex
CREATE INDEX "TrocaOleoCambio_oficinaId_idx" ON "TrocaOleoCambio"("oficinaId");

-- CreateIndex
CREATE INDEX "VehicleEvent_veiculoId_idx" ON "VehicleEvent"("veiculoId");

-- CreateIndex
CREATE UNIQUE INDEX "Collaborator_cpf_key" ON "Collaborator"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Collaborator_cpfSemMascara_key" ON "Collaborator"("cpfSemMascara");

-- CreateIndex
CREATE UNIQUE INDEX "Collaborator_email_key" ON "Collaborator"("email");

-- CreateIndex
CREATE INDEX "Collaborator_cpf_idx" ON "Collaborator"("cpf");

-- CreateIndex
CREATE INDEX "Collaborator_email_idx" ON "Collaborator"("email");

-- CreateIndex
CREATE INDEX "Collaborator_companyId_idx" ON "Collaborator"("companyId");

-- CreateIndex
CREATE INDEX "Collaborator_oficinaId_idx" ON "Collaborator"("oficinaId");

-- CreateIndex
CREATE INDEX "PayableQuoteLink_payableId_idx" ON "PayableQuoteLink"("payableId");

-- CreateIndex
CREATE INDEX "PayableQuoteLink_quoteId_idx" ON "PayableQuoteLink"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "PayableQuoteLink_payableId_quoteId_key" ON "PayableQuoteLink"("payableId", "quoteId");

-- CreateIndex
CREATE INDEX "ReceivableQuoteLink_receivableId_idx" ON "ReceivableQuoteLink"("receivableId");

-- CreateIndex
CREATE INDEX "ReceivableQuoteLink_quoteId_idx" ON "ReceivableQuoteLink"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivableQuoteLink_receivableId_quoteId_key" ON "ReceivableQuoteLink"("receivableId", "quoteId");

-- CreateIndex
CREATE INDEX "TaxSetting_companyId_idx" ON "TaxSetting"("companyId");

-- CreateIndex
CREATE INDEX "PlataformaGestao_cnpj_idx" ON "PlataformaGestao"("cnpj");

-- CreateIndex
CREATE INDEX "PlataformaGestao_companyId_idx" ON "PlataformaGestao"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PlataformaGestao_companyId_cnpj_key" ON "PlataformaGestao"("companyId", "cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "PlataformaGestao_companyId_cnpjSemMascara_key" ON "PlataformaGestao"("companyId", "cnpjSemMascara");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryAdvance_numeroComprovante_key" ON "SalaryAdvance"("numeroComprovante");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryAdvance_payableId_key" ON "SalaryAdvance"("payableId");

-- CreateIndex
CREATE INDEX "SalaryAdvance_collaboratorId_idx" ON "SalaryAdvance"("collaboratorId");

-- CreateIndex
CREATE INDEX "SalaryAdvance_payableId_idx" ON "SalaryAdvance"("payableId");

-- CreateIndex
CREATE INDEX "SalaryAdvance_oficinaId_idx" ON "SalaryAdvance"("oficinaId");

-- CreateIndex
CREATE INDEX "SalaryAdvance_payroll_competency_idx" ON "SalaryAdvance"("payroll_competency");

-- CreateIndex
CREATE INDEX "SalaryAdvance_discount_status_idx" ON "SalaryAdvance"("discount_status");

-- CreateIndex
CREATE INDEX "SalaryAdvancePdf_salaryAdvanceId_idx" ON "SalaryAdvancePdf"("salaryAdvanceId");

-- CreateIndex
CREATE INDEX "FinancialCategory_companyId_idx" ON "FinancialCategory"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialCategory_companyId_name_type_key" ON "FinancialCategory"("companyId", "name", "type");

-- CreateIndex
CREATE INDEX "FiscalDocument_companyId_idx" ON "FiscalDocument"("companyId");

-- CreateIndex
CREATE INDEX "FiscalDocument_companyId_tipoDocumento_idx" ON "FiscalDocument"("companyId", "tipoDocumento");

-- CreateIndex
CREATE INDEX "FiscalDocument_companyId_status_idx" ON "FiscalDocument"("companyId", "status");

-- CreateIndex
CREATE INDEX "FiscalDocument_companyId_dataEmissao_idx" ON "FiscalDocument"("companyId", "dataEmissao");

-- CreateIndex
CREATE INDEX "FiscalDocument_companyId_numeroNota_idx" ON "FiscalDocument"("companyId", "numeroNota");

-- CreateIndex
CREATE INDEX "FiscalDocument_companyId_chaveAcesso_idx" ON "FiscalDocument"("companyId", "chaveAcesso");

-- CreateIndex
CREATE INDEX "FiscalAudit_companyId_idx" ON "FiscalAudit"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_nome_key" ON "Plan"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Module_chave_key" ON "Module"("chave");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_companyId_key" ON "Subscription"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleLicense_companyId_moduleId_key" ON "ModuleLicense"("companyId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "saas_empresas_cnpj_key" ON "saas_empresas"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "saas_empresas_company_id_key" ON "saas_empresas"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "saas_planos_nome_key" ON "saas_planos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "saas_configuracoes_chave_key" ON "saas_configuracoes"("chave");

-- CreateIndex
CREATE UNIQUE INDEX "saas_tenants_cnpj_key" ON "saas_tenants"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "saas_tenants_company_id_key" ON "saas_tenants"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "saas_plans_nome_key" ON "saas_plans"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "saas_modules_chave_key" ON "saas_modules"("chave");

-- CreateIndex
CREATE UNIQUE INDEX "saas_tenant_modules_tenant_id_module_id_key" ON "saas_tenant_modules"("tenant_id", "module_id");

-- CreateIndex
CREATE UNIQUE INDEX "saas_users_email_key" ON "saas_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "saas_users_cpf_key" ON "saas_users"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "saas_roles_nome_key" ON "saas_roles"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "saas_permissions_nome_key" ON "saas_permissions"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "saas_notification_reads_notification_id_company_id_key" ON "saas_notification_reads"("notification_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "saas_settings_chave_key" ON "saas_settings"("chave");

-- CreateIndex
CREATE INDEX "AbsenceHistory_collaboratorId_idx" ON "AbsenceHistory"("collaboratorId");

-- CreateIndex
CREATE INDEX "AbsenceHistory_companyId_idx" ON "AbsenceHistory"("companyId");

-- CreateIndex
CREATE INDEX "AbsenceAudit_collaboratorId_idx" ON "AbsenceAudit"("collaboratorId");

-- CreateIndex
CREATE INDEX "AbsenceAudit_companyId_idx" ON "AbsenceAudit"("companyId");

-- CreateIndex
CREATE INDEX "employee_absences_collaborator_id_idx" ON "employee_absences"("collaborator_id");

-- CreateIndex
CREATE INDEX "employee_absences_company_id_idx" ON "employee_absences"("company_id");

-- CreateIndex
CREATE INDEX "employee_absences_oficina_id_idx" ON "employee_absences"("oficina_id");

-- CreateIndex
CREATE INDEX "Product_companyId_idx" ON "Product"("companyId");

-- CreateIndex
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "NfeImport_chaveAcesso_key" ON "NfeImport"("chaveAcesso");

-- CreateIndex
CREATE INDEX "NfeImport_companyId_idx" ON "NfeImport"("companyId");

-- CreateIndex
CREATE INDEX "NfeImport_supplierId_idx" ON "NfeImport"("supplierId");

-- CreateIndex
CREATE INDEX "NfeItem_nfeImportId_idx" ON "NfeItem"("nfeImportId");

-- CreateIndex
CREATE INDEX "NfeItem_productId_idx" ON "NfeItem"("productId");

-- CreateIndex
CREATE INDEX "Tributacao_companyId_idx" ON "Tributacao"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Tributacao_companyId_esfera_codigo_key" ON "Tributacao"("companyId", "esfera", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "TowingDriver_cpf_key" ON "TowingDriver"("cpf");

-- CreateIndex
CREATE INDEX "TowingDriver_companyId_idx" ON "TowingDriver"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "TowingVehicle_placa_key" ON "TowingVehicle"("placa");

-- CreateIndex
CREATE INDEX "TowingVehicle_companyId_idx" ON "TowingVehicle"("companyId");

-- CreateIndex
CREATE INDEX "TowingRate_companyId_idx" ON "TowingRate"("companyId");

-- CreateIndex
CREATE INDEX "TowingRate_plataforma_id_idx" ON "TowingRate"("plataforma_id");

-- CreateIndex
CREATE UNIQUE INDEX "TowingRate_plataforma_id_towingTypeId_regiao_horario_regraC_key" ON "TowingRate"("plataforma_id", "towingTypeId", "regiao", "horario", "regraComercial");

-- CreateIndex
CREATE INDEX "TowingType_companyId_idx" ON "TowingType"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "TowingType_companyId_name_key" ON "TowingType"("companyId", "name");

-- CreateIndex
CREATE INDEX "TowingRateHistory_towingRateId_idx" ON "TowingRateHistory"("towingRateId");

-- CreateIndex
CREATE INDEX "TowingRateHistory_companyId_idx" ON "TowingRateHistory"("companyId");

-- CreateIndex
CREATE INDEX "TowingRateHistory_userId_idx" ON "TowingRateHistory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TowingQuote_numeroOrcamento_key" ON "TowingQuote"("numeroOrcamento");

-- CreateIndex
CREATE INDEX "TowingQuote_companyId_idx" ON "TowingQuote"("companyId");

-- CreateIndex
CREATE INDEX "TowingQuote_clientId_idx" ON "TowingQuote"("clientId");

-- CreateIndex
CREATE INDEX "TowingQuote_userId_idx" ON "TowingQuote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "guias_transporte_numeroGuia_key" ON "guias_transporte"("numeroGuia");

-- CreateIndex
CREATE UNIQUE INDEX "guias_transporte_orcamentoId_key" ON "guias_transporte"("orcamentoId");

-- CreateIndex
CREATE INDEX "PlataformaContratoHistory_plataformaId_idx" ON "PlataformaContratoHistory"("plataformaId");

-- CreateIndex
CREATE INDEX "PlataformaContratoHistory_companyId_idx" ON "PlataformaContratoHistory"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PreTenant_cnpj_key" ON "PreTenant"("cnpj");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_parentCompanyId_fkey" FOREIGN KEY ("parentCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_plataformaGestaoId_fkey" FOREIGN KEY ("plataformaGestaoId") REFERENCES "PlataformaGestao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "Oficina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_mecanicoId_fkey" FOREIGN KEY ("mecanicoId") REFERENCES "Collaborator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteHistory" ADD CONSTRAINT "QuoteHistory_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteHistory" ADD CONSTRAINT "QuoteHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteHistory" ADD CONSTRAINT "QuoteHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailConfig" ADD CONSTRAINT "EmailConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialPayable" ADD CONSTRAINT "FinancialPayable_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialReceivable" ADD CONSTRAINT "FinancialReceivable_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialReceivable" ADD CONSTRAINT "FinancialReceivable_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAttachment" ADD CONSTRAINT "FinancialAttachment_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "FinancialPayable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAttachment" ADD CONSTRAINT "FinancialAttachment_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "FinancialReceivable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAudit" ADD CONSTRAINT "FinancialAudit_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "FinancialPayable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAudit" ADD CONSTRAINT "FinancialAudit_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "FinancialReceivable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oficina" ADD CONSTRAINT "Oficina_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrocaOleoMotor" ADD CONSTRAINT "TrocaOleoMotor_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrocaOleoMotor" ADD CONSTRAINT "TrocaOleoMotor_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "Oficina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrocaOleoCambio" ADD CONSTRAINT "TrocaOleoCambio_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrocaOleoCambio" ADD CONSTRAINT "TrocaOleoCambio_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "Oficina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleEvent" ADD CONSTRAINT "VehicleEvent_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collaborator" ADD CONSTRAINT "Collaborator_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collaborator" ADD CONSTRAINT "Collaborator_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "Oficina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayableQuoteLink" ADD CONSTRAINT "PayableQuoteLink_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "FinancialPayable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayableQuoteLink" ADD CONSTRAINT "PayableQuoteLink_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivableQuoteLink" ADD CONSTRAINT "ReceivableQuoteLink_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "FinancialReceivable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivableQuoteLink" ADD CONSTRAINT "ReceivableQuoteLink_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxSetting" ADD CONSTRAINT "TaxSetting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlataformaGestao" ADD CONSTRAINT "PlataformaGestao_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryAdvance" ADD CONSTRAINT "SalaryAdvance_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryAdvance" ADD CONSTRAINT "SalaryAdvance_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "FinancialPayable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryAdvance" ADD CONSTRAINT "SalaryAdvance_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "Oficina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryAdvancePdf" ADD CONSTRAINT "SalaryAdvancePdf_salaryAdvanceId_fkey" FOREIGN KEY ("salaryAdvanceId") REFERENCES "SalaryAdvance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialCategory" ADD CONSTRAINT "FinancialCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalDocument" ADD CONSTRAINT "FiscalDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleLicense" ADD CONSTRAINT "ModuleLicense_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleLicense" ADD CONSTRAINT "ModuleLicense_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_tenants" ADD CONSTRAINT "saas_tenants_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "saas_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_subscriptions" ADD CONSTRAINT "saas_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "saas_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_subscriptions" ADD CONSTRAINT "saas_subscriptions_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "saas_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_tenant_modules" ADD CONSTRAINT "saas_tenant_modules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "saas_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_tenant_modules" ADD CONSTRAINT "saas_tenant_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "saas_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_users" ADD CONSTRAINT "saas_users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "saas_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_role_permissions" ADD CONSTRAINT "saas_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "saas_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_role_permissions" ADD CONSTRAINT "saas_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "saas_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_notification_reads" ADD CONSTRAINT "saas_notification_reads_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "saas_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_absences" ADD CONSTRAINT "employee_absences_collaborator_id_fkey" FOREIGN KEY ("collaborator_id") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_absences" ADD CONSTRAINT "employee_absences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_absences" ADD CONSTRAINT "employee_absences_oficina_id_fkey" FOREIGN KEY ("oficina_id") REFERENCES "Oficina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tributacaoMunicipalId_fkey" FOREIGN KEY ("tributacaoMunicipalId") REFERENCES "Tributacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tributacaoEstadualId_fkey" FOREIGN KEY ("tributacaoEstadualId") REFERENCES "Tributacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tributacaoFederalId_fkey" FOREIGN KEY ("tributacaoFederalId") REFERENCES "Tributacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NfeImport" ADD CONSTRAINT "NfeImport_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NfeImport" ADD CONSTRAINT "NfeImport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NfeItem" ADD CONSTRAINT "NfeItem_nfeImportId_fkey" FOREIGN KEY ("nfeImportId") REFERENCES "NfeImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NfeItem" ADD CONSTRAINT "NfeItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tributacao" ADD CONSTRAINT "Tributacao_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowingDriver" ADD CONSTRAINT "TowingDriver_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowingVehicle" ADD CONSTRAINT "TowingVehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowingVehicle" ADD CONSTRAINT "TowingVehicle_towingTypeId_fkey" FOREIGN KEY ("towingTypeId") REFERENCES "TowingType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowingRate" ADD CONSTRAINT "TowingRate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowingRate" ADD CONSTRAINT "TowingRate_plataforma_id_fkey" FOREIGN KEY ("plataforma_id") REFERENCES "PlataformaGestao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowingRate" ADD CONSTRAINT "TowingRate_towingTypeId_fkey" FOREIGN KEY ("towingTypeId") REFERENCES "TowingType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowingType" ADD CONSTRAINT "TowingType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowingRateHistory" ADD CONSTRAINT "TowingRateHistory_towingRateId_fkey" FOREIGN KEY ("towingRateId") REFERENCES "TowingRate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowingRateHistory" ADD CONSTRAINT "TowingRateHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowingRateHistory" ADD CONSTRAINT "TowingRateHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowingQuote" ADD CONSTRAINT "TowingQuote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowingQuote" ADD CONSTRAINT "TowingQuote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowingQuote" ADD CONSTRAINT "TowingQuote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowingQuote" ADD CONSTRAINT "TowingQuote_plataformaId_fkey" FOREIGN KEY ("plataformaId") REFERENCES "PlataformaGestao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowingQuote" ADD CONSTRAINT "TowingQuote_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "TowingDriver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowingQuote" ADD CONSTRAINT "TowingQuote_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TowingVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guias_transporte" ADD CONSTRAINT "guias_transporte_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "TowingQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guias_transporte" ADD CONSTRAINT "guias_transporte_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guias_transporte_audits" ADD CONSTRAINT "guias_transporte_audits_guiaTransporteId_fkey" FOREIGN KEY ("guiaTransporteId") REFERENCES "guias_transporte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlataformaContratoHistory" ADD CONSTRAINT "PlataformaContratoHistory_plataformaId_fkey" FOREIGN KEY ("plataformaId") REFERENCES "PlataformaGestao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlataformaContratoHistory" ADD CONSTRAINT "PlataformaContratoHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlataformaContratoHistory" ADD CONSTRAINT "PlataformaContratoHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
