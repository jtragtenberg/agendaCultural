#!/bin/bash
# Configuração inicial do servidor — rode UMA VEZ como root
# Uso: ssh root@104.131.127.99 "GITHUB_TOKEN='ghp_SEU_TOKEN' bash -s" < setup-servidor.sh

set -e

GITHUB_TOKEN="${GITHUB_TOKEN:?Defina GITHUB_TOKEN antes de rodar}"
REPO_URL="https://${GITHUB_TOKEN}@github.com/jtragtenberg/agendaCultural.git"
APP_DIR="/opt/agenda-cultural"

echo "=== Instalando Docker ==="
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

echo "=== Instalando Docker Compose ==="
if apt-get install -y docker-compose-plugin 2>/dev/null; then
  echo "docker compose plugin instalado"
else
  curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
    -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi

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

echo "=== Gerando .env.prod ==="
IP_PUBLICO=$(curl -s ifconfig.me)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
JWT_SEGREDO=$(openssl rand -hex 32)

cat > $APP_DIR/.env.prod << EOF
POSTGRES_DB=agenda_cultural
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SEGREDO=$JWT_SEGREDO
VITE_API_URL=http://$IP_PUBLICO:3000
EOF

chmod 600 $APP_DIR/.env.prod

echo ""
echo "✅ Setup concluído!"
echo ""
echo "Credenciais geradas automaticamente em $APP_DIR/.env.prod"
echo "  IP detectado:  $IP_PUBLICO"
echo "  POSTGRES_PASSWORD: $POSTGRES_PASSWORD"
echo "  JWT_SEGREDO: $JWT_SEGREDO"
echo ""
echo "⚠️  Guarde essas credenciais em lugar seguro."
echo ""
echo "Próximo passo:"
echo "  ./deploy.sh"
