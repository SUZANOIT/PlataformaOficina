import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

/**
 * Varredura do código do frontend: senhas e tokens temporários não podem ir para
 * o armazenamento do navegador, para o console nem para URLs fixas sem HTTPS.
 */
const SRC = join(__dirname, '..');
const files: { path: string; text: string }[] = [];
(function walk(dir: string) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) files.push({ path: relative(SRC, p), text: readFileSync(p, 'utf8') });
  }
})(SRC);

const findAll = (re: RegExp) =>
  files.flatMap(f => (f.text.match(re) || []).map(m => `${f.path}: ${m.trim()}`));

describe('proteção de credenciais no navegador', () => {
  it('nenhuma senha é gravada em localStorage/sessionStorage', () => {
    expect(findAll(/(local|session)Storage\.setItem\([^)]*(password|senha)[^)]*\)/gi)).toEqual([]);
  });

  it('token temporário de troca de senha não fica no localStorage nem é lido da URL sem limpeza', () => {
    expect(findAll(/localStorage\.setItem\(\s*['"]tempToken['"]/g)).toEqual([]);
    const page = files.find(f => f.path.endsWith('pages/ForcePasswordChange.tsx'))!;
    expect(page.text).toContain('window.history.replaceState');
    expect(page.text).not.toMatch(/localStorage\.getItem\(\s*['"]tempToken['"]\)/);
  });

  it('senha e token não são escritos no console', () => {
    expect(findAll(/console\.(log|info|warn|error|debug)\([^)]*\b(password|senha|tempToken|token)\b[^)]*\)/g)
      .filter(l => !/Failed to parse token/.test(l))).toEqual([]);
  });

  it('API chamada pela mesma origem (HTTPS em produção), sem URL http:// fixa', () => {
    expect(findAll(/baseURL:\s*['"]http:\/\//g)).toEqual([]);
    expect(findAll(/fetch\(\s*['"`]http:\/\/(?!localhost)/g)).toEqual([]);
  });

  it('nenhum segredo de servidor no bundle (apenas variáveis VITE_ públicas)', () => {
    expect(findAll(/(JWT_SECRET|DATABASE_URL|STORAGE_SECRET|EMERGENCY_RESET_KEY|AWS_SECRET)/g)).toEqual([]);
  });
});
