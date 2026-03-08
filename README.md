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

Observação: no ambiente Docker de desenvolvimento, o backend aplica `prisma db push --force-reset` ao subir, recriando o schema e reseedando os dados.

Serviços:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- PostgreSQL: `localhost:5432`

## Observações

- O endpoint `.ics` é compatível com Google Calendar, Apple Calendar e Outlook.
- A agenda pessoal referencia eventos existentes (`agenda_eventos`), sem duplicação de evento.
- A tela de perfil mostra agenda própria e agenda de pessoas seguidas.
