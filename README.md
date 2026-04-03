# Agenda Cultural do Recife

MVP full-stack para cadastro colaborativo e curadoria participativa de eventos musicais em Recife.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Banco: PostgreSQL
- ORM: Prisma
- Autenticação: JWT
- IA: OpenAI API (gpt-4o-mini)
- Deploy: Docker + Nginx + Let's Encrypt

## Arquitetura

```txt
backend/
  prisma/
  src/
    modulos/
      autenticacao/
      usuarios/
      eventos/
      artistas/
      locais/
      agenda/
      seguidores/
      moderacao/
      calendario/
      instagram/
      admin/
      ia/
frontend/
nginx/             ← config do proxy reverso
scripts/           ← scraper Python do Instagram
dados/             ← posts JSON + sessão + lista de perfis
docker-compose.yml
docker-compose.prod.yml
```

## Regras implementadas

- Eventos aparecem imediatamente ao serem criados (status `pendente`); apenas `rejeitado` fica oculto.
- Moderação de evento por status: `pendente`, `aprovado`, `rejeitado`, `sinalizado`.
- Limite para usuário novo: até 3 eventos em 24h.
- Verificação de duplicidade por local + data + similaridade de título.
- Denúncia de evento com bloqueio de denúncia duplicada por usuário.
- Evento recebe status `sinalizado` ao atingir limiar de denúncias.
- Criador do evento pode editar ou apagar o próprio evento a qualquer momento.
- Criação de evento com autocomplete para `locais` e `artistas` — digitar o nome e confirmar basta para criar um novo registro sem formulário expandido.
- Páginas públicas de artistas e locais com edição restrita a criador, dono da página ou moderador.
- Qualquer evento visível no calendário (pendente, sinalizado ou aprovado) pode ser adicionado à agenda pessoal.

## Funções de usuário

| Função | Acesso |
|---|---|
| `usuario` | criar eventos, editar/apagar os próprios eventos, agenda pessoal |
| `moderador` | aprovar/rejeitar/editar/apagar qualquer evento, local e artista |
| `administrador` | painel admin completo + todas as ações de moderador |

A função é definida pelo campo `funcao` no modelo `Usuario` (enum: `usuario`, `moderador`, `administrador`).

## Modelo de dados (Prisma/PostgreSQL)

As tabelas usam nomes em português e UUID:

- `usuarios`
- `locais`
- `artistas`
- `eventos`
- `evento_artistas`
- `agenda_eventos`
- `seguidores`
- `denuncias_evento`
- `solicitacoes_propriedade`

Arquivo: `backend/prisma/schema.prisma`.

### Campos do evento

| Campo | Tipo | Descrição |
|---|---|---|
| `titulo` | String | Obrigatório |
| `descricao` | String | Obrigatório |
| `localId` | UUID | Referência ao local |
| `data` | DateTime | Meia-noite UTC (dia do evento) |
| `horaInicio` | String | Formato `HH:MM` |
| `horaFim` | String? | Formato `HH:MM` |
| `ingresso` | String? | Ex: "Gratuito", "R$ 20" |
| `links` | String? | Link de divulgação |
| `linkIngresso` | String? | Link para compra de ingresso |
| `imagemUrl` | String? | URL da imagem de capa |
| `status` | Enum | `pendente`, `aprovado`, `rejeitado`, `sinalizado` |

## Interface

### Home — calendário unificado

A home page exibe um calendário unificado com duas camadas sobrepostas, ao estilo Google Calendar / iCal:

- **Agenda Cultural Recife** (rosa) — todos os eventos não rejeitados
- **Minha Agenda** (roxo) — eventos que o usuário adicionou à sua agenda pessoal

Cada camada pode ser ativada ou desativada individualmente pela barra lateral esquerda. A busca por texto filtra apenas nos calendários visíveis.

O botão `+` no canto superior direito de cada dia (visível quando logado) abre um modal para criar um evento, com a data já preenchida e horário padrão de 19h–21h.

O modal de criação inclui:
- **Extração por IA**: cole uma descrição do evento (post do Instagram, notícia, texto curto) e clique em **Preencher formulário com IA** para pré-preencher os campos. A IA recebe a data atual como contexto para inferir o ano correto.
- **Criação rápida de local/artista**: se o local ou artista não existir, digitar o nome e clicar em "Criar [nome]" basta — sem formulário expandido.
- **Campos extras**: ingresso (valor/tipo), link de divulgação, link para compra de ingresso, URL de imagem.

Cards do calendário exibem horário, local e — quando preenchido — o valor do ingresso.

### Configurações do usuário

Ao fazer login, o usuário é redirecionado para a home. No cabeçalho, clicar no nome abre um dropdown com:

- **Configurações** (`/configuracoes`) — editar nome e bio, trocar senha
- **Exportar agenda** — modal para exportar eventos futuros como `.ics`, com seleção individual e memória da última exportação
- **Painel Admin** — visível apenas para administradores
- **Moderação** — visível apenas para moderadores
- **Sair**

### Feed do Instagram

A página `/instagram` exibe um feed cronológico único (mais recente primeiro) de posts coletados de perfis monitorados:

- Scroll infinito — carrega 20 posts por vez ao chegar no fim
- Cada card exibe: foto de perfil, @handle linkado, data, thumbnail, legenda (expansível) e coautores (quando houver)
- Posts novos desde a última visita recebem badge **novo** e a página rola automaticamente até o primeiro não visto (rastreado via `localStorage`)
- Barra lateral com checklist de perfis — cada usuário escolhe quais perfis quer ver (preferência salva no navegador)
- Moderadores e administradores podem remover perfis da lista de monitoramento

### Painel Admin (`/admin`)

Disponível apenas para usuários com `funcao = administrador`. Três abas:

- **Usuários** — tabela completa com edição inline de função, verificado e reputação; troca de senha sem precisar da atual; clique no nome exibe perfil detalhado com toda atividade no sistema
- **Eventos** — todos os eventos (qualquer status), com edição e exclusão
- **Métricas** — cards de totais e ranking de engajamento

## API principal

Autenticação:

- `POST /autenticacao/cadastro`
- `POST /autenticacao/login`

Eventos:

- `GET /eventos`
- `GET /eventos/:id`
- `POST /eventos`
- `PUT /eventos/:id` — criador ou moderador
- `DELETE /eventos/:id` — criador ou moderador
- `POST /eventos/:id/denunciar`

Artistas:

- `GET /artistas`
- `GET /artistas/:id`
- `POST /artistas`
- `PUT /artistas/:id`
- `POST /artistas/:id/solicitar-propriedade`

Locais:

- `GET /locais`
- `GET /locais/:id`
- `POST /locais`
- `PUT /locais/:id`
- `POST /locais/:id/solicitar-propriedade`

Agenda:

- `POST /agenda/adicionar`
- `DELETE /agenda/remover/:eventoId`
- `GET /agenda/minha`

Seguidores:

- `POST /seguir/:usuarioId`
- `GET /seguindo`

Usuários:

- `GET /usuarios/:id`
- `PUT /usuarios/me`
- `PUT /usuarios/me/senha`
- `GET /usuarios/:id/calendario.ics`

Moderação:

- `GET /moderacao/eventos`
- `PUT /moderacao/eventos/:id/status`
- `GET /moderacao/locais`
- `GET /moderacao/artistas`
- `PUT /moderacao/locais/:id/dono`
- `PUT /moderacao/artistas/:id/dono`
- `GET /moderacao/solicitacoes`
- `PUT /moderacao/solicitacoes/:id`

Admin (requer `funcao = administrador`):

- `GET /admin/usuarios`
- `GET /admin/usuarios/:id`
- `PUT /admin/usuarios/:id`
- `PUT /admin/usuarios/:id/senha`
- `GET /admin/eventos`
- `PUT /admin/eventos/:id`
- `DELETE /admin/eventos/:id`
- `PUT /admin/artistas/:id`
- `DELETE /admin/artistas/:id`
- `PUT /admin/locais/:id`
- `DELETE /admin/locais/:id`

IA:

- `POST /ia/extrair-evento` — extrai dados de evento a partir de texto livre usando gpt-4o-mini

Instagram:

- `GET /instagram/posts?pagina=1&limite=20&perfis=handle1,handle2`
- `GET /instagram/perfis`
- `POST /instagram/perfis`
- `DELETE /instagram/perfis/:handle`
- `POST /instagram/atualizar`
- `GET /instagram/sessao`
- `POST /instagram/login`

## Seed de dados

Inclui:

- Locais de Recife (Marco Zero, Rua da Moeda, Parque Dona Lindu)
- Artistas
- Eventos musicais
- Usuários de teste

Credenciais seed:

- `admin@agenda.recife / 123456` — administrador
- `moderador@agenda.recife / 123456` — moderador verificado
- `ana@agenda.recife / 123456` — usuária verificada
- `joao@agenda.recife / 123456` — usuário comum

> **Atenção:** o seed apaga todos os dados antes de recriar. Não rode em produção com dados reais.

## Migração segura do banco de dados

Quando o schema muda (novos campos, novas tabelas), use o script de migração para preservar os dados existentes:

```bash
# Docker local
docker compose exec backend npm run db:migrar

# VPS
docker compose -f docker-compose.prod.yml --env-file .env.prod exec backend npm run db:migrar
```

O script:
1. Exporta todos os dados para `backend/backup/snapshot-<timestamp>.json`
2. Reseta o banco e aplica o schema atual
3. Reimporta tudo, preenchendo novos campos com valores padrão (`null`, `'usuario'`, etc.)

Para só exportar um backup sem resetar:

```bash
# Docker local
docker compose exec backend npm run db:exportar

# VPS
docker compose -f docker-compose.prod.yml --env-file .env.prod exec backend npm run db:exportar
```

Para reimportar a partir de um backup específico:

```bash
docker compose exec backend node scripts/migrar-banco.js --so-importar backup/snapshot-2026-03-31T12-00-00.json
```

## Executar local (sem Docker)

### 1) Backend

```bash
cd backend
cp .env.exemplo .env
# edite .env e adicione OPENAI_API_KEY se quiser usar o preenchimento por IA
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev
```

Backend em `http://localhost:3000`.

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend em `http://localhost:5173`.

## Executar com Docker (desenvolvimento)

Na raiz do projeto:

```bash
docker compose up --build
```

Setup inicial do banco (uma vez, ou quando mudar schema):

```bash
docker compose exec backend npx prisma db push
docker compose exec backend npm run prisma:seed
```

Serviços:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- PostgreSQL: `localhost:5432`

## Deploy em produção (VPS com HTTPS)

### 1. Variáveis de ambiente

Crie o arquivo `.env` na raiz do projeto no servidor:

```env
POSTGRES_PASSWORD=senha_segura
JWT_SEGREDO=segredo_longo_aleatorio
VITE_API_URL=https://agenda.rec.br
OPENAI_API_KEY=sk-...
```

### 2. Certificado SSL (primeira vez)

Execute antes de subir os containers (porta 80 precisa estar livre):

```bash
mkdir -p certbot/conf certbot/www

docker run --rm -p 80:80 \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d agenda.rec.br -d www.agenda.rec.br \
  --agree-tos --no-eff-email -m seuemail@exemplo.com
```

### 3. Subir os containers

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 4. Inicializar o banco (primeira vez)

```bash
docker compose -f docker-compose.prod.yml exec backend npx prisma db push
docker compose -f docker-compose.prod.yml exec backend npm run prisma:seed
```

### 5. Deploys seguintes

```bash
git pull origin dev
docker compose -f docker-compose.prod.yml up -d --build
```

O container `certbot` renova o certificado automaticamente a cada 12h.

### Portas abertas no servidor

| Porta | Serviço |
|---|---|
| 80 | HTTP → redireciona para HTTPS |
| 443 | HTTPS (frontend + API) |
| 22 | SSH |

### Conectar conta do Instagram no servidor

Necessário na primeira vez ou quando a sessão expirar:

```bash
# Opção A — fazer login dentro do container
docker exec -it agenda_cultural_scraper python3 /scripts/instagram_login.py

# Opção B — copiar sessão do Mac (mais fácil)
scp dados/.sessao/sessao-* root@SEU_IP:/opt/agenda-cultural/dados/.sessao/
```

### Rodar busca do Instagram manualmente

```bash
docker exec agenda_cultural_scraper python3 /scripts/buscar_instagram.py
```

A busca automática roda todo dia às **16h20 (horário de Recife)** via container `scraper`.

---

## Feed do Instagram — scraper

Os posts são coletados pelo container `scraper` (Python + instaloader) e salvos em `dados/instagram_posts.json`. A lista de perfis monitorados fica em `dados/perfis.json`.

Para adicionar perfis: use o formulário na própria página `/instagram` ou edite `dados/perfis.json` diretamente.

---

## Observações

- O endpoint `.ics` é compatível com Google Calendar, Apple Calendar e Outlook.
- A agenda pessoal referencia eventos existentes (`agenda_eventos`), sem duplicação de evento.
- Todos os horários são armazenados em UTC no banco e exibidos no fuso de Recife (UTC-3). Datas de eventos usam meia-noite UTC; o highlight de "hoje" no calendário usa o fuso de Recife.
- A extração por IA usa `gpt-4o-mini` (OpenAI) — barato e suficiente para extração de texto estruturado. A data atual é enviada como contexto para inferência correta do ano.
