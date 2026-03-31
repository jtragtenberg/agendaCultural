# Scripts — Importação do Instagram

Busca posts recentes de perfis públicos do Instagram e os disponibiliza no backend via arquivo JSON local.

## Como funciona

O script usa [instaloader](https://instaloader.github.io/) para acessar perfis públicos com uma sessão autenticada (cookie). Os dados são salvos em `dados/instagram_posts.json` e `dados/instagram_posts.md`. O backend lê o JSON e serve via API REST. O frontend exibe os posts na rota `/instagram`.

## Com Docker (recomendado)

```bash
docker-compose up --build
```

O container `scraper` sobe automaticamente e roda a busca todo dia às **16:20 (horário de Recife)**. Para conectar uma conta, acesse `http://localhost:5173/instagram` — o formulário de login aparece se não houver sessão ativa.

## Sem Docker (local)

### Pré-requisitos

```bash
pip install instaloader flask schedule
```

### Configuração inicial (uma vez só)

```bash
python3 scripts/instagram_login.py
```

A sessão é salva em `dados/.sessao/` e ignorada pelo git.

### Executar manualmente

```bash
python3 scripts/buscar_instagram.py
```

### Agendador local

```bash
python3 scripts/agendador.py
```

Sobe a API de login na porta 5000 e agenda a busca diária às 16:20.

## Comportamento da busca

- Verifica os **últimos 10 posts** de cada perfil por execução
- Baixa no máximo **5 posts novos por perfil** por execução
- Posts já salvos (por shortcode) são ignorados — a memória só cresce
- Ordem dos perfis embaralhada e pausas aleatórias para evitar detecção

## Adicionar perfis

Edite a lista `PERFIS` no topo de `buscar_instagram.py`:

```python
PERFIS = [
    "terra_polocultural",
    "casa.lontra",
    # adicione handles aqui
]
```

## Feedbacks de segurança

| Mensagem | Causa | Solução |
|---|---|---|
| `⚠️ SEGURANÇA: Rate limit (429)` | Muitas requisições | Script aguarda automaticamente |
| `🔒 SEGURANÇA: Sessão expirada` | Cookie inválido | Reconectar via frontend ou `instagram_login.py` |
| `🚨 SEGURANÇA: Verificação manual` | Checkpoint do Instagram | Resolver no browser e refazer login |

## Arquivos gerados

| Arquivo | Conteúdo |
|---|---|
| `dados/instagram_posts.json` | Posts indexados por perfil (usado pela API) |
| `dados/instagram_posts.md` | Versão legível para revisão manual |
| `dados/.sessao/sessao-*` | Cookie de sessão (não commitado) |

## API

| Endpoint | Descrição |
|---|---|
| `GET /instagram/posts` | Lista todos os posts salvos |
| `GET /instagram/sessao` | Verifica se há conta conectada |
| `POST /instagram/login` | Conecta uma conta (proxy para o container scraper) |
