#!/usr/bin/env python3
"""
Busca posts recentes de perfis públicos do Instagram e salva em Markdown e JSON.

Requer login salvo — execute primeiro:
    python3 scripts/instagram_login.py

Uso:
    python3 scripts/buscar_instagram.py
"""

import instaloader
import json
import os
import time
import glob
import random
from datetime import datetime

PASTA_DADOS = os.path.join(os.path.dirname(__file__), "..", "dados")
SESSAO_DIR = os.path.join(PASTA_DADOS, ".sessao")
JSON_PATH = os.path.join(PASTA_DADOS, "instagram_posts.json")
PERFIS_PATH = os.path.join(PASTA_DADOS, "perfis.json")

PERFIS_PADRAO = [
    "terra_polocultural",
    "casa.lontra",
    "caixaculturalrecife",
    "anfitriaodepernambuco",
    "agendaculturaldorecife_",
    "cabuetacultural",
]

# Limites para não disparar detecção
JANELA_VERIFICACAO = 10   # quantos posts recentes do perfil verificar por execução
MAX_NOVOS_POR_PERFIL = 5  # máx posts novos a baixar por execução (dos encontrados na janela)
PAUSA_ENTRE_POSTS = (2, 5)    # segundos entre posts (min, max)
PAUSA_ENTRE_PERFIS = (8, 20)  # segundos entre perfis (min, max)
MAX_TENTATIVAS = 3            # tentativas em caso de erro


def carregar_perfis():
    if os.path.exists(PERFIS_PATH):
        with open(PERFIS_PATH, encoding="utf-8") as f:
            return json.load(f)
    return PERFIS_PADRAO


def pausa(intervalo=PAUSA_ENTRE_POSTS):
    t = random.uniform(*intervalo)
    time.sleep(t)


def carregar_loader():
    arquivos = glob.glob(os.path.join(SESSAO_DIR, "sessao-*"))
    if not arquivos:
        print("Nenhuma sessão encontrada.")
        print("Execute primeiro: python3 scripts/instagram_login.py")
        raise SystemExit(1)

    sessao = sorted(arquivos, key=os.path.getmtime)[-1]
    usuario = os.path.basename(sessao).replace("sessao-", "")
    print(f"Usando sessão: @{usuario}")

    L = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        compress_json=False,
        quiet=True,
        # Sleeps automáticos do instaloader entre requests
        sleep=True,
        max_connection_attempts=MAX_TENTATIVAS,
    )
    L.load_session_from_file(usuario, sessao)
    return L


def carregar_salvos():
    if not os.path.exists(JSON_PATH):
        return {}, {}
    with open(JSON_PATH, encoding="utf-8") as f:
        dados = json.load(f)
    posts_por_perfil = {
        p["handle"]: {post["shortcode"]: post for post in p["posts"]}
        for p in dados.get("perfis", [])
    }
    fotos_por_perfil = {
        p["handle"]: p.get("foto")
        for p in dados.get("perfis", [])
    }
    return posts_por_perfil, fotos_por_perfil


def buscar_posts_novos(perfil, loader, ja_salvos):
    """Retorna (lista_de_novos_posts, foto_perfil_url)."""
    existentes = ja_salvos.get(perfil, {})
    novos = []
    foto = None
    tentativa = 0

    while tentativa < MAX_TENTATIVAS:
        try:
            profile = instaloader.Profile.from_username(loader.context, perfil)

            try:
                foto = profile.profile_pic_url
            except Exception:
                pass

            # 1. Coleta os últimos JANELA_VERIFICACAO posts do perfil
            janela = []
            for post in profile.get_posts():
                if len(janela) >= JANELA_VERIFICACAO:
                    break
                janela.append(post)

            # 2. Filtra apenas os que ainda não estão salvos
            pendentes = [p for p in janela if p.shortcode not in existentes]
            if pendentes:
                print(f"  {len(pendentes)} novo(s) nos últimos {JANELA_VERIFICACAO} posts — baixando até {MAX_NOVOS_POR_PERFIL}")
            else:
                print(f"  Nenhum post novo nos últimos {JANELA_VERIFICACAO} posts")

            # 3. Baixa até MAX_NOVOS_POR_PERFIL dos pendentes
            for post in pendentes[:MAX_NOVOS_POR_PERFIL]:
                thumbnail = None
                try:
                    thumbnail = post.url
                except Exception:
                    pass

                colaboradores = []
                try:
                    for coautor in post.coauthor_producers:
                        colaboradores.append({
                            "handle": coautor.username,
                            "url": f"https://www.instagram.com/{coautor.username}/",
                        })
                except Exception:
                    pass

                novos.append({
                    "shortcode": post.shortcode,
                    "url": f"https://www.instagram.com/p/{post.shortcode}/",
                    "data": post.date_utc.strftime("%Y-%m-%d"),
                    "dataFormatada": post.date_utc.strftime("%d/%m/%Y"),
                    "legenda": (post.caption or ""),
                    "tipo": post.typename,
                    "thumbnail": thumbnail,
                    "likes": post.likes,
                    "colaboradores": colaboradores,
                })
                pausa(PAUSA_ENTRE_POSTS)
            break  # sucesso — sai do while

        except instaloader.exceptions.TooManyRequestsException:
            tentativa += 1
            espera = 60 * tentativa + random.randint(0, 30)
            print(f"  ⚠️  SEGURANÇA: Rate limit (429) em @{perfil} — Instagram detectou muitas requisições")
            print(f"       Aguardando {espera}s antes de tentar novamente ({tentativa}/{MAX_TENTATIVAS})")
            time.sleep(espera)

        except instaloader.exceptions.LoginRequiredException:
            print(f"  🔒 SEGURANÇA: Sessão expirada ou inválida — faça login novamente:")
            print(f"       python3 scripts/instagram_login.py")
            raise SystemExit(1)

        except instaloader.exceptions.BadCredentialsException:
            print(f"  🔒 SEGURANÇA: Credenciais rejeitadas — sessão invalidada pelo Instagram")
            print(f"       Faça login novamente: python3 scripts/instagram_login.py")
            raise SystemExit(1)

        except instaloader.exceptions.ProfileNotExistsException:
            print(f"  ❌ Perfil @{perfil} não encontrado — verifique o handle")
            break

        except instaloader.exceptions.QueryReturnedBadRequestException as e:
            tentativa += 1
            print(f"  ⚠️  SEGURANÇA: Instagram bloqueou a requisição (400) em @{perfil} — {e}")
            if tentativa < MAX_TENTATIVAS:
                espera = 90 * tentativa + random.randint(0, 60)
                print(f"       Aguardando {espera}s ({tentativa}/{MAX_TENTATIVAS})")
                time.sleep(espera)

        except Exception as e:
            tentativa += 1
            msg = str(e).lower()
            if "checkpoint" in msg or "challenge" in msg:
                print(f"  🚨 SEGURANÇA: Instagram exige verificação manual (checkpoint) para a conta")
                print(f"       Acesse o Instagram no browser, resolva a verificação e refaça o login:")
                print(f"       python3 scripts/instagram_login.py")
                raise SystemExit(1)
            espera = 30 * tentativa
            print(f"  Erro em @{perfil}: {e} — aguardando {espera}s ({tentativa}/{MAX_TENTATIVAS})")
            time.sleep(espera)

    return novos, foto


def mesclar(perfil, novos, ja_salvos):
    existentes = list(ja_salvos.get(perfil, {}).values())
    return novos + existentes


def salvar_markdown(todos_posts, caminho):
    agora = datetime.now().strftime("%d/%m/%Y às %H:%M")
    linhas = ["# Posts do Instagram\n", f"_Atualizado em: {agora}_\n"]
    for perfil, dados in todos_posts.items():
        posts = dados["posts"]
        linhas.append(f"\n---\n\n## [@{perfil}](https://www.instagram.com/{perfil}/)\n")
        if not posts:
            linhas.append("_Nenhum post encontrado._\n")
            continue
        for p in posts:
            linhas.append(f"\n### {p['dataFormatada']}")
            if p["legenda"]:
                linhas.append(f"\n{p['legenda']}\n")
            linhas.append(f"\n[Abrir post no Instagram]({p['url']})\n")
    with open(caminho, "w", encoding="utf-8") as f:
        f.write("\n".join(linhas))
    print(f"Markdown salvo em: {caminho}")


def salvar_json(todos_posts, caminho):
    dados = {
        "atualizadoEm": datetime.now().isoformat(),
        "perfis": [
            {
                "handle": h,
                "url": f"https://www.instagram.com/{h}/",
                "foto": d.get("foto"),
                "posts": d["posts"],
            }
            for h, d in todos_posts.items()
        ],
    }
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)
    print(f"JSON salvo em:     {caminho}")


if __name__ == "__main__":
    os.makedirs(PASTA_DADOS, exist_ok=True)
    PERFIS = carregar_perfis()
    loader = carregar_loader()
    ja_salvos, fotos_salvas = carregar_salvos()

    # Ordem aleatória para não criar padrão previsível
    perfis_embaralhados = PERFIS[:]
    random.shuffle(perfis_embaralhados)

    todos_posts = {}
    for i, perfil in enumerate(perfis_embaralhados):
        print(f"Buscando @{perfil}...")
        novos, foto = buscar_posts_novos(perfil, loader, ja_salvos)
        todos_posts[perfil] = {
            "foto": foto or fotos_salvas.get(perfil),
            "posts": mesclar(perfil, novos, ja_salvos),
        }
        print(f"  {len(novos)} novos | {len(todos_posts[perfil]['posts'])} total")

        if i < len(perfis_embaralhados) - 1:
            pausa(PAUSA_ENTRE_PERFIS)

    # Salva na ordem original da lista PERFIS
    todos_posts_ordenados = {p: todos_posts[p] for p in PERFIS if p in todos_posts}

    md_path = os.path.join(PASTA_DADOS, "instagram_posts.md")
    salvar_markdown(todos_posts_ordenados, md_path)
    salvar_json(todos_posts_ordenados, JSON_PATH)
    print("\nConcluído!")
