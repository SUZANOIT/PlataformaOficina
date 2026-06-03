import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();
async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  await prisma.user.update({
    where: { email: 'rafaelsuzano@hotmail.com' },
    data: { password: hashedPassword }
  });
  console.log("Password updated successfully!");
}
main().finally(() => prisma.$disconnect());
