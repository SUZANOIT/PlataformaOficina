const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log("Checking database connection and quotes...");
  
  // 1. Get max quote number
  const maxQuote = await prisma.quote.findFirst({
    orderBy: { numeroOrcamento: 'desc' },
    select: { numeroOrcamento: true }
  });
  
  console.log("Max numeroOrcamento in database:", maxQuote?.numeroOrcamento);
  
  // 2. Get some details about Quote table
  const count = await prisma.quote.count();
  console.log("Total quotes count:", count);
  
  // 3. Test running a raw query to check the current sequence value
  try {
    const seqResult = await prisma.$queryRawUnsafe(`
      SELECT last_value, is_called FROM pg_sequences WHERE sequencename = 'Quote_numeroOrcamento_seq';
    `);
    console.log("Sequence details:", seqResult);
  } catch (err) {
    console.error("Error querying sequence metadata:", err.message);
  }

  // 4. Try running a raw query to check pg_get_serial_sequence
  try {
    const seqName = await prisma.$queryRawUnsafe(`
      SELECT pg_get_serial_sequence('"Quote"', 'numeroOrcamento') as seq;
    `);
    console.log("Sequence name via pg_get_serial_sequence:", seqName);
  } catch (err) {
    console.error("Error getting serial sequence name:", err.message);
  }
}

main()
  .catch(e => console.error("Error in script:", e))
  .finally(() => prisma.$disconnect());
