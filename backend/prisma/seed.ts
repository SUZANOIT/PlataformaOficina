import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // ─── Empresas ────────────────────────────────────────────────────────────────

  const empresa1 = await prisma.company.upsert({
    where: { cnpj: '12.345.678/0001-90' },
    update: {},
    create: {
      razaoSocial: 'Curio Serviços Automotivos Ltda',
      nomeFantasia: 'Curio Serviços Automotivos',
      cnpj: '12.345.678/0001-90',
      cnpjSemMascara: '12345678000190',
      inscricaoEstadual: '123.456.789.000',
    },
  });

  const empresa2 = await prisma.company.upsert({
    where: { cnpj: '98.765.432/0001-10' },
    update: {},
    create: {
      razaoSocial: 'Mca Comércio Automotivo Ltda',
      nomeFantasia: 'Mca Comércio Automotivo',
      cnpj: '98.765.432/0001-10',
      cnpjSemMascara: '98765432000110',
      inscricaoEstadual: '987.654.321.000',
    },
  });

  console.log(`✅ Empresas criadas: ${empresa1.nomeFantasia}, ${empresa2.nomeFantasia}`);

  // ─── Clientes ────────────────────────────────────────────────────────────────

  const cliente1 = await prisma.client.upsert({
    where: { id: 'seed-client-001' },
    update: {},
    create: {
      id: 'seed-client-001',
      nome: 'João Silva',
      empresa: 'Auto Peças Silva',
      cnpj: '11.222.333/0001-44',
      telefone: '(11) 99999-1111',
      email: 'joao.silva@autopecas.com.br',
      cidade: 'São Paulo',
      estado: 'SP',
      logradouro: 'Rua das Flores',
      numero: '123',
      bairro: 'Centro',
      cep: '01310-100',
    },
  });

  const cliente2 = await prisma.client.upsert({
    where: { id: 'seed-client-002' },
    update: {},
    create: {
      id: 'seed-client-002',
      nome: 'Maria Oliveira',
      empresa: 'Oficina Oliveira',
      cnpj: '55.666.777/0001-88',
      telefone: '(21) 98888-2222',
      email: 'maria@oficinaoliveira.com.br',
      cidade: 'Rio de Janeiro',
      estado: 'RJ',
      logradouro: 'Av. Brasil',
      numero: '456',
      bairro: 'Tijuca',
      cep: '20550-013',
    },
  });

  const cliente3 = await prisma.client.upsert({
    where: { id: 'seed-client-003' },
    update: {},
    create: {
      id: 'seed-client-003',
      nome: 'Carlos Mendes',
      empresa: 'Transportes Mendes',
      cnpj: '33.444.555/0001-66',
      telefone: '(31) 97777-3333',
      email: 'carlos@transportesmendes.com.br',
      cidade: 'Belo Horizonte',
      estado: 'MG',
      logradouro: 'Rua da Bahia',
      numero: '789',
      bairro: 'Lourdes',
      cep: '30160-011',
    },
  });

  console.log(`✅ Clientes criados: ${cliente1.nome}, ${cliente2.nome}, ${cliente3.nome}`);

  // ─── Orçamentos ──────────────────────────────────────────────────────────────

  // Orçamento 1 — Curio / João Silva (8 itens)
  const orcamento1 = await prisma.quote.upsert({
    where: { id: 'seed-quote-001' },
    update: {},
    create: {
      id: 'seed-quote-001',
      companyId: empresa1.id,
      clientId: cliente1.id,
      condicaoPagamento: 'À vista',
      validade: 'Proposta válida por 7 dias',
      garantia: 'Garantia de 90 dias',
      prazoExecucao: '3 dias úteis',
      observacao: 'Serviço de revisão completa com troca de óleo e filtros.',
      veiculoMarca: 'Toyota',
      veiculoModelo: 'Corolla',
      veiculoAno: '2020',
      veiculoPlaca: 'ABC-1234',
      subtotal: 1850.00,
      total: 1850.00,
      items: {
        create: [
          { descricao: 'Troca de óleo do motor (5W30 sintético)', quantidade: 1, valorUnitario: 280.00, valorTotal: 280.00 },
          { descricao: 'Filtro de óleo', quantidade: 1, valorUnitario: 45.00, valorTotal: 45.00 },
          { descricao: 'Filtro de ar', quantidade: 1, valorUnitario: 65.00, valorTotal: 65.00 },
          { descricao: 'Filtro de combustível', quantidade: 1, valorUnitario: 80.00, valorTotal: 80.00 },
          { descricao: 'Vela de ignição NGK (jogo)', quantidade: 1, valorUnitario: 320.00, valorTotal: 320.00 },
          { descricao: 'Fluido de freio DOT 4', quantidade: 1, valorUnitario: 60.00, valorTotal: 60.00 },
          { descricao: 'Alinhamento e balanceamento', quantidade: 1, valorUnitario: 150.00, valorTotal: 150.00 },
          { descricao: 'Mão de obra — revisão completa', quantidade: 1, valorUnitario: 850.00, valorTotal: 850.00 },
        ],
      },
    },
  });

  // Orçamento 2 — Mca / Maria Oliveira (8 itens)
  const orcamento2 = await prisma.quote.upsert({
    where: { id: 'seed-quote-002' },
    update: {},
    create: {
      id: 'seed-quote-002',
      companyId: empresa2.id,
      clientId: cliente2.id,
      condicaoPagamento: 'Parcelado',
      parcelas: 3,
      valorParcela: 833.33,
      validade: 'Proposta válida por 10 dias',
      garantia: 'Garantia de 6 meses',
      prazoExecucao: '5 dias úteis',
      observacao: 'Substituição de pastilhas e discos de freio dianteiros e traseiros.',
      veiculoMarca: 'Honda',
      veiculoModelo: 'Civic',
      veiculoAno: '2019',
      veiculoPlaca: 'DEF-5678',
      subtotal: 2500.00,
      total: 2500.00,
      items: {
        create: [
          { descricao: 'Pastilha de freio dianteira (par)', quantidade: 1, valorUnitario: 220.00, valorTotal: 220.00 },
          { descricao: 'Pastilha de freio traseira (par)', quantidade: 1, valorUnitario: 180.00, valorTotal: 180.00 },
          { descricao: 'Disco de freio dianteiro (par)', quantidade: 1, valorUnitario: 480.00, valorTotal: 480.00 },
          { descricao: 'Disco de freio traseiro (par)', quantidade: 1, valorUnitario: 420.00, valorTotal: 420.00 },
          { descricao: 'Fluido de freio DOT 4 (1L)', quantidade: 2, valorUnitario: 60.00, valorTotal: 120.00 },
          { descricao: 'Limpador de freios', quantidade: 1, valorUnitario: 30.00, valorTotal: 30.00 },
          { descricao: 'Graxa para freios', quantidade: 1, valorUnitario: 25.00, valorTotal: 25.00 },
          { descricao: 'Mão de obra — troca de freios completa', quantidade: 1, valorUnitario: 1025.00, valorTotal: 1025.00 },
        ],
      },
    },
  });

  // Orçamento 3 — Curio / Carlos Mendes (8 itens)
  const orcamento3 = await prisma.quote.upsert({
    where: { id: 'seed-quote-003' },
    update: {},
    create: {
      id: 'seed-quote-003',
      companyId: empresa1.id,
      clientId: cliente3.id,
      condicaoPagamento: 'Boleto 30 dias',
      validade: 'Proposta válida por 15 dias',
      garantia: 'Garantia de 1 ano',
      prazoExecucao: '7 dias úteis',
      observacao: 'Revisão de suspensão e direção com substituição de componentes desgastados.',
      veiculoMarca: 'Volkswagen',
      veiculoModelo: 'Gol',
      veiculoAno: '2018',
      veiculoPlaca: 'GHI-9012',
      subtotal: 3200.00,
      total: 3200.00,
      items: {
        create: [
          { descricao: 'Amortecedor dianteiro (par)', quantidade: 1, valorUnitario: 680.00, valorTotal: 680.00 },
          { descricao: 'Amortecedor traseiro (par)', quantidade: 1, valorUnitario: 520.00, valorTotal: 520.00 },
          { descricao: 'Batente de amortecedor dianteiro (par)', quantidade: 1, valorUnitario: 120.00, valorTotal: 120.00 },
          { descricao: 'Coxim de amortecedor dianteiro (par)', quantidade: 1, valorUnitario: 160.00, valorTotal: 160.00 },
          { descricao: 'Barra estabilizadora dianteira', quantidade: 1, valorUnitario: 280.00, valorTotal: 280.00 },
          { descricao: 'Bucha da barra estabilizadora (kit)', quantidade: 1, valorUnitario: 90.00, valorTotal: 90.00 },
          { descricao: 'Alinhamento e balanceamento 4 rodas', quantidade: 1, valorUnitario: 150.00, valorTotal: 150.00 },
          { descricao: 'Mão de obra — revisão de suspensão', quantidade: 1, valorUnitario: 1200.00, valorTotal: 1200.00 },
        ],
      },
    },
  });

  console.log(`✅ Orçamentos criados: #${orcamento1.id}, #${orcamento2.id}, #${orcamento3.id}`);

  // ─── SaaS Seed ──────────────────────────────────────────────────────────────
  console.log('🌱 Iniciando seed do SaaS...');

  // 1. Módulos do Marketplace
  const modulosSaaS = [
    { nome: 'Gestão de Oficina', chave: 'oficina', descricao: 'Controle de ordens de serviço, clientes e peças.', valorAdicional: 0 },
    { nome: 'Gestão de Frota', chave: 'frotas', descricao: 'Gestão preventiva de veículos e controle de frotas.', valorAdicional: 49.90 },
    { nome: 'Financeiro', chave: 'financeiro', descricao: 'Controle de contas a pagar, receber, caixa e faturamento.', valorAdicional: 29.90 },
    { nome: 'Relatórios BI', chave: 'bi', descricao: 'Relatórios avançados e gráficos analíticos de desempenho.', valorAdicional: 39.90 },
    { nome: 'IA para Diagnóstico', chave: 'ia', descricao: 'Inteligência artificial para auxiliar no diagnóstico de falhas.', valorAdicional: 79.90 },
    { nome: 'Emissão de NF-e', chave: 'fiscal', descricao: 'Emissão automatizada de notas fiscais de serviços (NFS-e).', valorAdicional: 19.90 },
    { nome: 'Integração FIPE', chave: 'fipe', descricao: 'Consulta em tempo real de preços de veículos na tabela FIPE.', valorAdicional: 9.90 },
    { nome: 'Integração ReceitaWS', chave: 'receitaws', descricao: 'Preenchimento automático de dados de empresas via Receita Federal.', valorAdicional: 9.90 },
    { nome: 'API Externa', chave: 'api', descricao: 'Acesso a rotas de API externas para integração com outros sistemas.', valorAdicional: 99.90 },
    { nome: 'Aplicativo Mobile', chave: 'mobile', descricao: 'Aplicativo exclusivo para mecânicos e clientes finais.', valorAdicional: 59.90 }
  ];

  for (const m of modulosSaaS) {
    await prisma.saaSModule.upsert({
      where: { chave: m.chave },
      update: { nome: m.nome, descricao: m.descricao, valorAdicional: m.valorAdicional },
      create: m
    });
  }

  // 2. Planos do SaaS
  const planosSaaS = [
    { nome: 'Starter', descricao: 'Ideal para oficinas iniciantes.', valorMensal: 99.90, valorAnual: 990.00, limiteUsuarios: 5, limiteVeiculos: 100, limiteOficinas: 1, limiteOs: 100, beneficios: 'Painel Geral, Orçamentos, Clientes básicos.', ativo: true },
    { nome: 'Professional', descricao: 'Para oficinas em crescimento.', valorMensal: 199.90, valorAnual: 1990.00, limiteUsuarios: 15, limiteVeiculos: 500, limiteOficinas: 3, limiteOs: 500, beneficios: 'Financeiro Completo, Fornecedores, Central Fiscal.', ativo: true },
    { nome: 'Enterprise', descricao: 'Para grandes redes de oficinas.', valorMensal: 399.90, valorAnual: 3990.00, limiteUsuarios: 999, limiteVeiculos: 99999, limiteOficinas: 99, limiteOs: 99999, beneficios: 'Marketplace de módulos liberado, Multiempresa, WhatsApp, BI.', ativo: true }
  ];

  for (const p of planosSaaS) {
    await prisma.saaSPlan.upsert({
      where: { nome: p.nome },
      update: { descricao: p.descricao, valorMensal: p.valorMensal, valorAnual: p.valorAnual, limiteUsuarios: p.limiteUsuarios, limiteVeiculos: p.limiteVeiculos, limiteOficinas: p.limiteOficinas, limiteOs: p.limiteOs, beneficios: p.beneficios },
      create: p
    });
  }

  // 3. Permissões de RBAC
  const permissoesSaaS = [
    { nome: 'total', descricao: 'Acesso total ao portal administrativo' },
    { nome: 'empresas', descricao: 'Gestão de Tenants (Empresas)' },
    { nome: 'planos', descricao: 'Gestão de Planos' },
    { nome: 'assinaturas', descricao: 'Gestão de Assinaturas' },
    { nome: 'financeiro', descricao: 'Financeiro SaaS' },
    { nome: 'usuarios', descricao: 'Gestão de Usuários Globais' },
    { nome: 'auditoria', descricao: 'Ver logs de Auditoria' },
    { nome: 'configuracoes', descricao: 'Configurações Globais do SaaS' },
    { nome: 'modulos', descricao: 'Marketplace de Módulos' }
  ];

  for (const perm of permissoesSaaS) {
    await prisma.saaSPermission.upsert({
      where: { nome: perm.nome },
      update: { descricao: perm.descricao },
      create: perm
    });
  }

  // 4. Perfis de RBAC (Roles)
  const perfisSaaS = [
    { nome: 'SUPER_ADMIN', descricao: 'Acesso irrestrito ao sistema', permissions: ['total'] },
    { nome: 'COMERCIAL', descricao: 'Equipe de vendas', permissions: ['empresas', 'planos', 'assinaturas'] },
    { nome: 'FINANCEIRO', descricao: 'Equipe financeira', permissions: ['financeiro', 'assinaturas'] },
    { nome: 'SUPORTE', descricao: 'Atendimento e suporte ao cliente', permissions: ['empresas', 'usuarios', 'auditoria'] },
    { nome: 'IMPLANTACAO', descricao: 'Instalação e configuração de tenants', permissions: ['empresas', 'configuracoes', 'modulos'] }
  ];

  for (const perf of perfisSaaS) {
    const role = await prisma.saaSRole.upsert({
      where: { nome: perf.nome },
      update: { descricao: perf.descricao },
      create: { nome: perf.nome, descricao: perf.descricao }
    });

    // Vincular permissões ao perfil
    for (const permName of perf.permissions) {
      const perm = await prisma.saaSPermission.findUnique({ where: { nome: permName } });
      if (perm) {
        await prisma.saaSRolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
          update: {},
          create: { roleId: role.id, permissionId: perm.id }
        });
      }
    }
  }

  // 5. Usuários Globais do SaaS
  const usuariosSaaS = [
    { nome: 'Rafael Suzano', email: 'rafael@suzanoit.com', role: 'SUPER_ADMIN', senha: 'admin123', cpf: '33176298862' },
    { nome: 'Admin Master', email: 'superadmin@suzanoit.com', role: 'SUPER_ADMIN', senha: 'admin123', cpf: '00000000000' },
    { nome: 'Vendedor Comercial', email: 'comercial@suzanoit.com', role: 'COMERCIAL', senha: 'comercial123', cpf: '11111111111' },
    { nome: 'Financeiro SaaS', email: 'financeiro@suzanoit.com', role: 'FINANCEIRO', senha: 'financeiro123', cpf: '22222222222' },
    { nome: 'Suporte Técnico', email: 'suporte@suzanoit.com', role: 'SUPORTE', senha: 'suporte123', cpf: '33333333333' },
    { nome: 'Implantador Sistema', email: 'implantacao@suzanoit.com', role: 'IMPLANTACAO', senha: 'implantacao123', cpf: '44444444444' }
  ];

  for (const u of usuariosSaaS) {
    const role = await prisma.saaSRole.findUnique({ where: { nome: u.role } });
    if (role) {
      const hashedPassword = await bcrypt.hash(u.senha, 10);
      await prisma.saaSUser.upsert({
        where: { email: u.email },
        update: { nome: u.nome, roleId: role.id, password: hashedPassword, cpf: u.cpf },
        create: { nome: u.nome, email: u.email, password: hashedPassword, roleId: role.id, status: 'ATIVO', cpf: u.cpf }
      });
    }
  }

  // 6. Configurações Iniciais do SaaS
  const configsIniciais = [
    { chave: 'nome_plataforma', valor: 'SuzanoIT Gestão de Oficina' },
    { chave: 'branding', valor: JSON.stringify({ corPrimaria: '#4f46e5', corSecundaria: '#1e1b4b', logo: '' }) },
    { chave: 'smtp', valor: JSON.stringify({ host: 'smtp.suzanoit.com', port: 587, user: 'alertas@suzanoit.com' }) },
    { chave: 'trial_days', valor: '30' }
  ];

  for (const c of configsIniciais) {
    await prisma.saaSSetting.upsert({
      where: { chave: c.chave },
      update: { valor: c.valor },
      create: c
    });
  }

  // 7. Sincronizar as empresas operacionais existentes com a tabela saas_tenants
  const companies = await prisma.company.findMany();
  const starterPlan = await prisma.saaSPlan.findUnique({ where: { nome: 'Starter' } });
  const enterprisePlan = await prisma.saaSPlan.findUnique({ where: { nome: 'Enterprise' } });

  for (const comp of companies) {
    const planoEscolhido = comp.cnpj === '12.345.678/0001-90' ? starterPlan : enterprisePlan;

    const tenant = await prisma.saaSTenant.upsert({
      where: { cnpj: comp.cnpj },
      update: {
        razaoSocial: comp.razaoSocial,
        nomeFantasia: comp.nomeFantasia || comp.razaoSocial,
        email: comp.email || 'contato@oficina.com.br',
        telefone: comp.telefone || '(11) 99999-9999',
        responsavel: 'Admin Proprietário',
        planoId: planoEscolhido?.id,
        status: 'Ativa',
        companyId: comp.id
      },
      create: {
        id: comp.id,
        razaoSocial: comp.razaoSocial,
        nomeFantasia: comp.nomeFantasia || comp.razaoSocial,
        cnpj: comp.cnpj,
        email: comp.email || 'contato@oficina.com.br',
        telefone: comp.telefone || '(11) 99999-9999',
        responsavel: 'Admin Proprietário',
        planoId: planoEscolhido?.id,
        status: 'Ativa',
        companyId: comp.id,
        limiteUsuarios: planoEscolhido?.limiteUsuarios ?? 5,
        limiteVeiculos: planoEscolhido?.limiteVeiculos ?? 100,
        limiteOficinas: planoEscolhido?.limiteOficinas ?? 3,
        limiteOs: planoEscolhido?.limiteOs ?? 100
      }
    });

    if (planoEscolhido) {
      await prisma.saaSSubscription.upsert({
        where: { id: tenant.id },
        update: {
          planoId: planoEscolhido.id,
          valor: planoEscolhido.valorMensal,
          status: 'Ativa'
        },
        create: {
          id: tenant.id,
          tenantId: tenant.id,
          planoId: planoEscolhido.id,
          valor: planoEscolhido.valorMensal,
          formaPagamento: 'Stripe',
          status: 'Ativa',
          dataInicio: new Date(),
          dataRenovacao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
    }
  }

  console.log('✅ SaaS Seed concluído!');
  console.log('');
  console.log('🎉 Seed concluído com sucesso!');
  console.log(`   • 2 empresas`);
  console.log(`   • 3 clientes`);
  console.log(`   • 3 orçamentos`);
  console.log(`   • 24 itens de orçamento`);
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
