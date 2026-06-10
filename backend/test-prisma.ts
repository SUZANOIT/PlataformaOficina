import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const alert = await prisma.saaSNotification.create({
      data: {
        titulo: "teste",
        mensagem: "teste",
        tipo: "WARNING",
        prioridade: "MEDIA",
        expiraEm: new Date("2026-06-10T16:43:00.000Z")
      }
    });
    console.log("Alert created", alert);
  } catch (e) {
    console.error("Error creating alert", e);
  }
}
main().finally(() => prisma.$disconnect());
