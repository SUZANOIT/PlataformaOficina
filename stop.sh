#!/bin/bash

echo "=================================================="
echo "🛑 PARANDO O APLICATIVO EM SEGUNDO PLANO..."
echo "=================================================="

# Tenta ler o PID do arquivo app.pid
if [ -f app.pid ]; then
  APP_PID=$(cat app.pid)
  if ps -p $APP_PID > /dev/null; then
    echo "Stopping process with PID $APP_PID..."
    kill $APP_PID || kill -9 $APP_PID
    rm app.pid
    echo "✅ Aplicativo finalizado com sucesso!"
    exit 0
  fi
fi

# Fallback: mata pela porta 3333
PORT_PID=$(lsof -t -i:3333 || true)
if [ ! -z "$PORT_PID" ]; then
  echo "Stopping process running on port 3333 (PID: $PORT_PID)..."
  kill -9 $PORT_PID || true
  rm -f app.pid
  echo "✅ Aplicativo finalizado com sucesso!"
else
  echo "⚠️ Nenhum processo ativo foi encontrado rodando na porta 3333."
fi
