#!/usr/bin/env bash
# Teste de login sem expor a senha.
#
# - A senha é digitada sem eco (read -s): não aparece na tela nem no histórico do shell.
# - O JSON vai para o curl pela entrada padrão (--data @-): a senha não aparece nos
#   argumentos do processo (ps) nem em arquivos.
# - O token devolvido é mascarado na saída.
#
# Uso:
#   scripts/login-seguro.sh <email>                       # login da oficina
#   scripts/login-seguro.sh --cnpj <cnpj>                 # Portal do Gestor
#   BASE_URL=http://localhost:3333 scripts/login-seguro.sh <email>
set -euo pipefail

BASE_URL="${BASE_URL:-https://suzanoit-orcamentos.up.railway.app}"
if [[ "${1:-}" == "--cnpj" ]]; then
  FIELD="cnpj"; ROUTE="/auth/portal-login"; LOGIN="${2:?Informe o CNPJ}"
else
  FIELD="email"; ROUTE="/auth/login"; LOGIN="${1:?Informe o e-mail}"
fi
case "$BASE_URL" in https://*|http://localhost*|http://127.0.0.1*) ;; *) echo "Use HTTPS (BASE_URL=$BASE_URL)" >&2; exit 1;; esac

IFS= read -r -s -p "Senha: " PASSWORD; echo >&2

# Escapa a senha para JSON usando só builtins do bash (nada vai para argumentos de processo)
json_escape() { local s=$1; s=${s//\\/\\\\}; s=${s//\"/\\\"}; s=${s//$'\t'/\\t}; s=${s//$'\n'/\\n}; s=${s//$'\r'/\\r}; printf '%s' "$s"; }

RESPONSE=$(printf '{"%s":"%s","password":"%s"}' "$FIELD" "$(json_escape "$LOGIN")" "$(json_escape "$PASSWORD")" \
  | curl -sS -X POST "$BASE_URL$ROUTE" -H 'Content-Type: application/json' --data @- -w '\nHTTP %{http_code}')
unset PASSWORD

# Mascara tokens antes de exibir
printf '%s\n' "$RESPONSE" | sed -E 's/"(token|tempToken)":"[^"]{6}[^"]*"/"\1":"[REDACTED]"/g'
