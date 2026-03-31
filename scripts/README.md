# Scripts — Importação do Instagram

Busca posts recentes de perfis públicos do Instagram e os disponibiliza no backend via arquivo JSON local.

## Como funciona

O script usa [instaloader](https://instaloader.github.io/) para acessar perfis públicos com uma sessão autenticada (cookie). Os dados são salvos em `dados/instagram_posts.json` e `dados/instagram_posts.md`. O backend lê o JSON e serve via API REST. O frontend exibe os posts na rota `/instagram`.

## Pré-requisitos

```bash
pip install instaloader
```

## Configuração inicial (uma vez só)

Faça login com uma conta do Instagram para salvar a sessão localmente. As credenciais **não ficam salvas** — apenas o cookie de sessão.

```bash
python3 scripts/instagram_login.py
```

A sessão é salva em `dados/.sessao/` e ignorada pelo git.

## Executar

```bash
python3 scripts/buscar_instagram.py
```

O script:
- Verifica os **últimos 10 posts** de cada perfil
- Baixa no máximo **5 posts novos por perfil** por execução
- Ignora posts que já estão salvos (por shortcode)
- A memória cresce sem limite — cada execução apenas acrescenta
- Embaralha a ordem dos perfis e usa pausas aleatórias para evitar bloqueio

## Adicionar perfis

Edite a lista `PERFIS` no topo de `buscar_instagram.py`:

```python
PERFIS = [
    "terra_polocultural",
    "casa.lontra",
    # adicione handles aqui
]
```

## Automação diária

Adicione ao crontab (`crontab -e`):

```
20 16 * * * cd /caminho/do/projeto && python3 scripts/buscar_instagram.py >> dados/instagram_log.txt 2>&1
```

## Feedbacks de segurança

O script exibe avisos quando o Instagram acionar proteções:

| Mensagem | Causa | Solução |
|---|---|---|
| `⚠️ SEGURANÇA: Rate limit (429)` | Muitas requisições | Script aguarda automaticamente |
| `🔒 SEGURANÇA: Sessão expirada` | Cookie inválido | Rodar `instagram_login.py` novamente |
| `🚨 SEGURANÇA: Verificação manual` | Checkpoint do Instagram | Resolver no browser e refazer login |

## Arquivos gerados

| Arquivo | Conteúdo |
|---|---|
| `dados/instagram_posts.json` | Posts indexados por perfil (usado pela API) |
| `dados/instagram_posts.md` | Versão legível para revisão manual |
| `dados/.sessao/sessao-*` | Cookie de sessão (não commitado) |

## API

`GET /instagram/posts` — retorna o JSON completo com todos os perfis e posts.
