import { z } from 'zod';
const schema = z.object({
  tributacaoMunicipalId: z.string().optional().nullable()
});
console.log(schema.parse({ tributacaoMunicipalId: "" }));
