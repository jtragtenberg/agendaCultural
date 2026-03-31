#!/bin/bash
# Configuração inicial do servidor — rode UMA VEZ como root
# Uso: ssh root@104.131.127.99 'bash -s' < setup-servidor.sh

set -e

REPO_URL="https://github.com/SEU_USUARIO/SEU_REPO.git"  # ajuste aqui
APP_DIR="/opt/agenda-cultural"

echo "=== Instalando Docker ==="
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

echo "=== Instalando Docker Compose ==="
apt-get install -y docker-compose-plugin 2>/dev/null \
  || curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
     -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose

echo "=== Instalando dependências básicas ==="
apt-get update -qq
apt-get install -y git ufw

echo "=== Configurando firewall ==="
ufw allow OpenSSH
ufw allow 80    # frontend
ufw allow 3000  # backend API
ufw --force enable

echo "=== Clonando repositório ==="
mkdir -p $APP_DIR
git clone $REPO_URL $APP_DIR

echo "=== Criando diretório de dados ==="
mkdir -p $APP_DIR/dados/.sessao

echo ""
echo "✅ Setup concluído!"
echo ""
echo "Próximos passos:"
echo "  1. cd $APP_DIR"
echo "  2. cp .env.prod.exemplo .env.prod"
echo "  3. nano .env.prod   # preencha as variáveis"
echo "  4. docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build"
