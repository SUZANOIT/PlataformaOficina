import { z } from "zod";
const schema = z.object({
  titulo: z.string(),
  mensagem: z.string(),
  tipo: z.enum(['INFO', 'WARNING', 'SUCCESS', 'ERROR']),
  prioridade: z.enum(['ALTA', 'MEDIA', 'BAIXA']).optional().default('MEDIA'),
  expiraEm: z.string().datetime().optional().nullable()
});

try {
  const parsed = schema.parse({"titulo":"teste","mensagem":"teste","tipo":"WARNING","prioridade":"MEDIA","expiraEm":"2026-06-10T16:43:00.000Z"});
  console.log("Zod parse success", parsed);
} catch (e) {
  console.log("Zod parse error", e);
}
