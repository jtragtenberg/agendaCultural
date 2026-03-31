#!/bin/bash
# Roda NO SERVIDOR — chamado pelo deploy.sh local via SSH
set -e

APP_DIR="/opt/agenda-cultural"
cd $APP_DIR

fix_var() {
  local key=$1
  local value=$2
  local existing
  existing=$(grep "^${key}=" .env.prod 2>/dev/null | cut -d= -f2-)
  if [ -z "$existing" ]; then
    sed -i "/^${key}=/d" .env.prod
    echo "${key}=${value}" >> .env.prod
    echo "  + $key corrigido"
  fi
}

echo "→ Verificando .env.prod..."
touch .env.prod
fix_var POSTGRES_DB       "agenda_cultural"
fix_var POSTGRES_USER     "postgres"
fix_var POSTGRES_PASSWORD "$(openssl rand -hex 16)"
fix_var JWT_SEGREDO       "$(openssl rand -hex 32)"
fix_var VITE_API_URL      "http://$(curl -s ifconfig.me):3000"

echo "→ Rebuilding e reiniciando containers..."
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

echo "→ Removendo imagens antigas..."
docker image prune -f

echo "→ Status dos containers:"
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
