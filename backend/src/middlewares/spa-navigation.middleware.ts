import path from 'path';
import { Request, Response, NextFunction } from 'express';

interface NavigationLike {
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Identifica uma navegação do navegador (digitar a URL, F5, abrir link em nova aba).
 *
 * Várias rotas do frontend compartilham o prefixo com a API (/quotes, /financial,
 * /fleet, /users, /settings, /products, /rh...). Sem este desvio, atualizar a página
 * em /quotes/view/:id caía na API e devolvia 401 em JSON em vez da tela.
 *
 * Chamadas da API nunca entram aqui: usam Authorization e/ou Accept JSON e
 * não são navegações de documento.
 */
export function isSpaNavigation(req: NavigationLike): boolean {
  if (req.method !== 'GET') return false;
  if (req.headers.authorization) return false;
  if (path.extname(req.path)) return false; // arquivos estáticos (.js, .css, .png...)

  const mode = String(req.headers['sec-fetch-mode'] || '');
  const dest = String(req.headers['sec-fetch-dest'] || '');
  if (mode) return mode === 'navigate' && (!dest || dest === 'document');

  // Navegadores sem Sec-Fetch-*: navegação pede HTML explicitamente
  const accept = String(req.headers.accept || '');
  return accept.includes('text/html');
}

export function spaNavigationMiddleware(indexHtmlPath: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isSpaNavigation(req)) return res.sendFile(indexHtmlPath);
    return next();
  };
}
