# Agenda Cultural do Recife

MVP full-stack para cadastro colaborativo e curadoria participativa de eventos musicais em Recife.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Banco: PostgreSQL
- ORM: Prisma
- Autenticação: JWT
- Docker opcional com `docker compose up`

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
frontend/
docker-compose.yml
```

## Regras implementadas

- Moderação de evento por status: `pendente`, `aprovado`, `rejeitado`, `sinalizado`.
- Usuários com reputação alta ou verificados podem autoaprovar eventos.
- Limite para usuário novo: até 3 eventos em 24h.
- Verificação de duplicidade por local + data + similaridade de título.
- Denúncia de evento com bloqueio de denúncia duplicada por usuário.
- Evento recebe status `sinalizado` ao atingir limiar de denúncias.
- Sistema de reputação:
  - evento aprovado: +5
  - evento rejeitado: -3
  - evento sinalizado por denúncias: -10
- Criação de evento com autocomplete para `locais` e `artistas`, incluindo criação inline de novos registros.
- Páginas públicas de artistas e locais com edição restrita a criador ou moderador.

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

Arquivo: `backend/prisma/schema.prisma`.

## Interface

A home page exibe um calendário unificado com duas camadas sobrepostas, ao estilo Google Calendar / iCal:

- **Agenda Cultural Recife** (rosa) — todos os eventos aprovados
- **Minha Agenda** (roxo) — eventos que o usuário adicionou à sua agenda pessoal

Cada camada pode ser ativada ou desativada individualmente pela barra lateral esquerda. A busca por texto filtra apenas nos calendários visíveis.

O botão `+` no canto superior direito de cada dia (visível quando logado) abre um modal para criar um evento, com a data já preenchida e horário padrão de 19h–21h.

## API principal

Autenticação:

- `POST /autenticacao/cadastro`
- `POST /autenticacao/login`

Eventos:

- `GET /eventos`
- `GET /eventos/:id`
- `POST /eventos`

Artistas:

- `GET /artistas`
- `GET /artistas/:id`
- `POST /artistas`
- `PUT /artistas/:id`

Locais:

- `GET /locais`
- `GET /locais/:id`
- `POST /locais`
- `PUT /locais/:id`

Agenda:

- `POST /agenda/adicionar`
- `GET /agenda/minha`

Seguidores:

- `POST /seguir/:usuarioId`
- `GET /seguindo`

Denúncias:

- `POST /eventos/:id/denunciar`

Calendário:

- `GET /usuarios/:id/calendario.ics`

Moderacao extra:

- `POST /eventos/:id/aprovar`
- `POST /eventos/:id/rejeitar`

## Seed de dados

Inclui:

- Locais de Recife (Marco Zero, Rua da Moeda, Parque Dona Lindu)
- Artistas
- Eventos musicais
- Usuários de teste

Credenciais seed:

- `moderador@agenda.recife / 123456`
- `ana@agenda.recife / 123456`
- `joao@agenda.recife / 123456`

## Executar local (sem Docker)

### 1) Backend

```bash
cd backend
cp .env.exemplo .env
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

Se necessário, configure `VITE_API_URL` apontando para a API.

## Executar com Docker

Na raiz do projeto:

```bash
docker compose up --build
```

Setup inicial do banco (uma vez, ou quando mudar schema):

```bash
docker compose exec backend npx prisma db push
docker compose exec backend npm run prisma:seed
```

Fluxo rápido de desenvolvimento:

- deixe `docker compose up` rodando
- backend usa `nodemon` e frontend usa `vite` com hot reload
- ao editar código, as mudanças entram sem derrubar/subir os containers
- rode `prisma db push` apenas quando alterar o schema

Serviços:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- PostgreSQL: `localhost:5432`

## Deploy em produção (VPS)

### 1. Setup inicial do servidor (uma vez só)

Na sua máquina local:

```bash
ssh root@104.131.127.99 "GITHUB_TOKEN='ghp_SEU_TOKEN' bash -s" < setup-servidor.sh
```

O script instala Docker, configura o firewall, clona o repositório e gera o `.env.prod` com senhas aleatórias automaticamente. As credenciais geradas são exibidas no terminal — salve-as num gerenciador de senhas.

O script é idempotente: pode ser rodado mais de uma vez sem problema. Variáveis já definidas no `.env.prod` são preservadas.

### 2. Deploys seguintes

Na sua máquina local, após merge do `dev` no `main`:

```bash
git checkout main && git merge dev && git push
./deploy.sh
```

O `deploy.sh` verifica se o `main` local está sincronizado com o remoto antes de prosseguir, faz `git pull` no servidor e reinicia os containers.

### 3. Fluxo de desenvolvimento

```
dev  →  testa local com docker compose  →  merge para main  →  ./deploy.sh
```

### Conectar conta do Instagram no servidor

Necessário na primeira vez ou quando a sessão expirar. O login via IP de datacenter exige verificação manual:

```bash
# Opção A — fazer login dentro do container
ssh root@104.131.127.99
docker exec -it agenda_cultural_scraper python3 /scripts/instagram_login.py

# Opção B — copiar sessão do Mac (mais fácil)
# (rode instagram_login.py localmente primeiro)
scp dados/.sessao/sessao-* root@104.131.127.99:/opt/agenda-cultural/dados/.sessao/
```

### Rodar busca do Instagram manualmente

```bash
ssh root@104.131.127.99 "docker exec agenda_cultural_scraper python3 /scripts/buscar_instagram.py"
```

A busca automática roda todo dia às 16h20 (horário de Recife) via container `scraper`.

### Portas abertas no servidor

| Porta | Serviço |
|---|---|
| 80 | Frontend (Nginx) |
| 3000 | Backend API |
| 22 | SSH |

### URLs de produção

- Frontend: `http://104.131.127.99`
- API: `http://104.131.127.99:3000/saude`
- Instagram: `http://104.131.127.99/instagram`

---

## Observações

- O endpoint `.ics` é compatível com Google Calendar, Apple Calendar e Outlook.
- A agenda pessoal referencia eventos existentes (`agenda_eventos`), sem duplicação de evento.
- A tela de perfil mostra agenda própria e agenda de pessoas seguidas.
