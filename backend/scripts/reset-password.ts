import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'rafaelsuzano@hotmail.com';
  const newPassword = 'Suzano30';

  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.log(`❌ Usuário não encontrado: ${email}`);
    
    // Listar todos os usuários para debug
    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true, status: true, mustChangePassword: true }
    });
    console.log('Usuários existentes no banco:');
    allUsers.forEach(u => {
      console.log(`  - ${u.email} | status: ${u.status} | mustChangePassword: ${u.mustChangePassword}`);
    });
    return;
  }

  console.log(`✅ Usuário encontrado: ${user.name} (${user.email})`);
  console.log(`   Status: ${user.status}`);
  console.log(`   mustChangePassword: ${user.mustChangePassword}`);

  const hashed = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { email },
    data: {
      password: hashed,
      mustChangePassword: false,
      status: 'ATIVO',
    }
  });

  console.log(`✅ Senha redefinida com sucesso para: ${email}`);
  console.log(`   Nova senha: ${newPassword}`);
  console.log(`   mustChangePassword: false`);
  console.log(`   status: ATIVO`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
