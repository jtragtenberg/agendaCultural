#!/bin/bash
# Deploy para o servidor de produção
# Uso: ./deploy.sh

set -e

SERVIDOR="root@104.131.127.99"
APP_DIR="/opt/agenda-cultural"

echo "=== Deploy Agenda Cultural ==="

echo "→ Verificando sincronização do main local com origin..."
git fetch origin main --quiet
LOCAL=$(git rev-parse main)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
  echo ""
  echo "❌ O branch main local não está sincronizado com origin/main."
  echo "   Local:  $LOCAL"
  echo "   Remote: $REMOTE"
  echo ""
  echo "   Faça o merge do dev e push antes de deployar:"
  echo "   git checkout main && git merge dev && git push"
  exit 1
fi

echo "   ✓ main local está sincronizado ($(git rev-parse --short main))"
echo ""

ssh $SERVIDOR "
  set -e
  cd $APP_DIR
  echo '→ Git pull (branch: main)...'
  git checkout main
  git pull origin main
  bash scripts/executar-deploy.sh
"

echo ""
echo "✅ Deploy concluído!"
echo "   Frontend: http://104.131.127.99"
echo "   Backend:  http://104.131.127.99:3000/saude"
