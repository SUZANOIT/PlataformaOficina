import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Suzano30', 10);
  await prisma.user.upsert({
    where: { email: 'rafaelsuzano@hotmail.com' },
    update: { password: hashedPassword },
    create: {
      email: 'rafaelsuzano@hotmail.com',
      name: 'Rafael Suzano',
      password: hashedPassword
    }
  });
  console.log("Password updated successfully!");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
