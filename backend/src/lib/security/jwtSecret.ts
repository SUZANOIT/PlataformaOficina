import crypto from 'crypto';

/**
 * Segredo único de assinatura dos JWT.
 *
 * Nunca usa um valor fixo no código: sem JWT_SECRET no ambiente, gera um segredo
 * aleatório por processo (os tokens deixam de valer a cada reinício, mas ninguém
 * consegue forjá-los) e registra um alerta para a variável ser configurada.
 */
let generated: string | null = null;
let warned = false;

export function getJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.trim()) {
    if (!warned && fromEnv.length < 32) {
      warned = true;
      console.warn('[Security] JWT_SECRET tem menos de 32 caracteres. Configure um segredo aleatório mais longo.');
    }
    return fromEnv;
  }
  if (!generated) {
    generated = crypto.randomBytes(48).toString('hex');
    console.error('[Security] JWT_SECRET não configurado. Usando segredo aleatório temporário: as sessões expiram a cada reinício. Configure JWT_SECRET nas variáveis do Railway.');
  }
  return generated;
}
