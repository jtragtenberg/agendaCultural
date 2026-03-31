#!/bin/bash
# Configuração do servidor — pode ser rodado múltiplas vezes sem problema
# Uso: ssh root@104.131.127.99 "GITHUB_TOKEN='ghp_SEU_TOKEN' bash -s" < setup-servidor.sh

set -e

GITHUB_TOKEN="${GITHUB_TOKEN:?Defina GITHUB_TOKEN antes de rodar}"
REPO_URL="https://${GITHUB_TOKEN}@github.com/jtragtenberg/agendaCultural.git"
APP_DIR="/opt/agenda-cultural"

echo "=== Instalando Docker ==="
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "Docker já instalado — pulando"
fi

echo "=== Instalando Docker Compose ==="
if docker compose version &>/dev/null; then
  echo "Docker Compose já instalado — pulando"
elif apt-get install -y docker-compose-plugin 2>/dev/null; then
  echo "docker compose plugin instalado"
else
  curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
    -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi

echo "=== Instalando dependências básicas ==="
apt-get update -qq
apt-get install -y git ufw curl openssl

echo "=== Configurando firewall ==="
ufw allow OpenSSH
ufw allow 80
ufw allow 3000
ufw --force enable

echo "=== Repositório ==="
if [ -d "$APP_DIR/.git" ]; then
  echo "Repositório já existe — atualizando para main..."
  git -C $APP_DIR remote set-url origin $REPO_URL
  git -C $APP_DIR fetch origin
  git -C $APP_DIR checkout main
  git -C $APP_DIR pull origin main
else
  echo "Clonando repositório..."
  git clone $REPO_URL $APP_DIR
fi

echo "=== Criando diretório de dados ==="
mkdir -p $APP_DIR/dados/.sessao

echo "=== Gerando .env.prod ==="
if [ -f "$APP_DIR/.env.prod" ]; then
  echo ".env.prod já existe — mantendo credenciais existentes"
else
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
  echo "  ⚠️  Credenciais geradas — guarde em lugar seguro:"
  echo "  POSTGRES_PASSWORD: $POSTGRES_PASSWORD"
  echo "  JWT_SEGREDO:       $JWT_SEGREDO"
  echo "  VITE_API_URL:      http://$IP_PUBLICO:3000"
fi

echo ""
echo "✅ Setup concluído!"
echo ""
echo "Próximo passo — do seu computador local:"
echo "  ./deploy.sh"
