import { PrismaClient } from '@prisma/client';

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
