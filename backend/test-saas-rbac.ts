import { prisma } from './src/lib/prisma';

async function testSaaSRBAC() {
  console.log('=== INICIANDO TESTES E VALIDAÇÃO DO RBAC SAAS ===\n');

  try {
    // 1. Verificar se Perfis (Roles) foram cadastrados
    const roles = await prisma.saaSRole.findMany({
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });

    console.log(`[PASS] Total de perfis localizados no banco: ${roles.length}`);
    roles.forEach(role => {
      const perms = role.permissions.map(rp => rp.permission.nome);
      console.log(` - Perfil: ${role.nome} | Permissões: [${perms.join(', ')}]`);
    });

    // 2. Verificar se o Usuário Super Admin existe
    const superAdmin = await prisma.saaSUser.findFirst({
      where: {
        role: {
          nome: 'SUPER_ADMIN'
        }
      },
      include: {
        role: true
      }
    });

    if (superAdmin) {
      console.log(`\n[PASS] Usuário Super Admin localizado: ${superAdmin.nome} (${superAdmin.email})`);
    } else {
      throw new Error('Nenhum usuário com perfil SUPER_ADMIN localizado no banco de dados.');
    }

    // 3. Simular Validador de Permissões (Simula a lógica do middleware e do useSaaSAuth)
    const testCases = [
      { role: 'SUPER_ADMIN', permission: 'empresas', expected: true },
      { role: 'SUPER_ADMIN', permission: 'financeiro', expected: true },
      { role: 'SUPER_ADMIN', permission: 'configuracoes', expected: true },
      
      { role: 'FINANCEIRO', permission: 'financeiro', expected: true },
      { role: 'FINANCEIRO', permission: 'assinaturas', expected: true },
      { role: 'FINANCEIRO', permission: 'configuracoes', expected: false }, // Financeiro não edita config global
      
      { role: 'COMERCIAL', permission: 'empresas', expected: true },
      { role: 'COMERCIAL', permission: 'assinaturas', expected: true },
      { role: 'COMERCIAL', permission: 'auditoria', expected: false }, // Comercial não vê auditoria
      
      { role: 'SUPORTE', permission: 'empresas', expected: true },
      { role: 'SUPORTE', permission: 'financeiro', expected: false }, // Suporte não acessa financeiro
      { role: 'SUPORTE', permission: 'auditoria', expected: true }  // Suporte acessa logs de auditoria
    ];

    console.log('\n=== SIMULANDO VALIDAÇÕES DE RBAC (CASOS DE TESTE) ===');
    
    let failedTests = 0;

    for (const test of testCases) {
      const roleObj = roles.find(r => r.nome === test.role);
      if (!roleObj) {
        console.error(`[ERR] Perfil ${test.role} não encontrado no banco para rodar o teste.`);
        failedTests++;
        continue;
      }

      // Lógica: SUPER_ADMIN tem acesso a tudo. Caso contrário, verifica se a chave da permissão está inclusa.
      const permissionsList = roleObj.permissions.map(rp => rp.permission.nome);
      const hasAccess = test.role === 'SUPER_ADMIN' || permissionsList.includes(test.permission) || permissionsList.includes('total');
      
      const success = hasAccess === test.expected;
      if (success) {
        console.log(`[OK] Perfil: ${test.role.padEnd(12)} | Requer: ${test.permission.padEnd(14)} | Permitido? ${String(hasAccess).padEnd(5)} (Esperado: ${test.expected})`);
      } else {
        console.error(`[FAIL] Perfil: ${test.role.padEnd(12)} | Requer: ${test.permission.padEnd(14)} | Permitido? ${String(hasAccess).padEnd(5)} (Esperado: ${test.expected})`);
        failedTests++;
      }
    }

    // 4. Verificar limites operacionais de Tenants criados
    const tenantsCount = await prisma.saaSTenant.count();
    console.log(`\n[PASS] Total de Tenants cadastrados no SaaS: ${tenantsCount}`);

    if (failedTests > 0) {
      throw new Error(`Testes de RBAC concluídos com ${failedTests} falha(s).`);
    } else {
      console.log('\n[SUCCESS] Todos os testes e validações de regras RBAC passaram com sucesso!');
    }

  } catch (err: any) {
    console.error('\n[ERROR] Falha ao executar testes de auditoria de RBAC:', err.message || err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

testSaaSRBAC().catch(() => {
  // Garantir saída com erro em caso de falha
  // @ts-ignore
  if (typeof process !== 'undefined') process.exit(1);
});
