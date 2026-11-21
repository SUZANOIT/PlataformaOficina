/**
 * Mascaramento de dados sensíveis nos logs (senhas, tokens, cookies, segredos).
 * Instalado uma única vez no start: todo console.log/info/warn/error/debug passa pelo filtro.
 */
const SENSITIVE_KEY = /^(password|senha|novaSenha|senhaAtual|newPassword|currentPassword|adminPassword|adminSenha|token|tempToken|accessToken|refreshToken|authorization|cookie|secret|secretKey|apiKey|privateKey|jwt)$/i;
const MASK = '[REDACTED]';

const TEXT_PATTERNS: [RegExp, string][] = [
  // Cabeçalho Authorization / Bearer
  [/(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, `$1${MASK}`],
  // JWT solto no texto
  [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, MASK],
  // "password":"..." / password=... / senha: ...
  [/("?(?:password|senha|newPassword|novaSenha|senhaAtual|token|tempToken|secret|secretKey)"?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,&}]+)/gi, `$1${MASK}`],
];

export function redactText(text: string): string {
  return TEXT_PATTERNS.reduce((acc, [re, rep]) => acc.replace(re, rep), text);
}

export function redactValue(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return redactText(value);
  if (!value || typeof value !== 'object' || depth > 6) return value;
  if (seen.has(value as object)) return value;
  seen.add(value as object);
  if (value instanceof Error) {
    const copy = new Error(redactText(value.message));
    copy.name = value.name;
    copy.stack = value.stack ? redactText(value.stack) : undefined;
    return copy;
  }
  if (Array.isArray(value)) return value.map(v => redactValue(v, depth + 1, seen));
  if (Buffer.isBuffer(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEY.test(k) ? MASK : redactValue(v, depth + 1, seen);
  }
  return out;
}

let installed = false;
export function installLogRedaction() {
  if (installed) return;
  installed = true;
  for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      try {
        original(...args.map(a => redactValue(a)));
      } catch {
        original(...args);
      }
    };
  }
}
