#!/bin/bash

# Exit on error
set -e

echo "=================================================="
echo "⚙️  INICIANDO O APLICATIVO EM SEGUNDO PLANO (DAEMON)"
echo "=================================================="

# 1. Parar qualquer processo existente na porta 3333
PORT_PID=$(lsof -t -i:3333 || true)
if [ ! -z "$PORT_PID" ]; then
  echo "⚠️  Encontrado processo anterior rodando na porta 3333 (PID: $PORT_PID). Finalizando..."
  kill -9 $PORT_PID || true
  sleep 1
fi

# 2. Build frontend
echo "📦 Construindo o frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
  npm install
fi
npm run build
cd ..

# 3. Build backend
echo "📦 Construindo o backend..."
cd backend
if [ ! -d "node_modules" ]; then
  npm install
fi
npm run build
cd ..

# 4. Iniciar o servidor em segundo plano (nohup)
echo "🚀 Iniciando o servidor web na porta 3333 em segundo plano..."
nohup npm start > app.log 2>&1 &
APP_PID=$!

# Salva o PID em um arquivo para facilitar futuras paradas
echo $APP_PID > app.pid

echo "=================================================="
echo "🎉 APLICATIVO INICIADO COM SUCESSO EM SEGUNDO PLANO!"
echo "📍 URL: http://localhost:3333"
echo "🔢 PID do Processo: $APP_PID"
echo "📝 Log de saída: app.log"
echo "=================================================="
echo ""
echo "Comandos úteis:"
echo "👉 Acompanhar logs em tempo real: tail -f app.log"
echo "👉 Parar a aplicação: kill $APP_PID (ou rode: ./stop.sh)"
echo "=================================================="
echo ""
echo "Você já pode fechar este terminal com segurança! A aplicação continuará ativa."
