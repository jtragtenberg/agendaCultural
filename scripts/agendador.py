#!/usr/bin/env python3
"""
Serviço combinado:
  - Agendador diário: roda buscar_instagram.py às 16:20 (fuso America/Recife)
  - API HTTP interna: /sessao e /login (usada pelo backend Node.js)
"""

import glob
import os
import re
import subprocess
import threading
import time

import instaloader
import schedule
from flask import Flask, jsonify, request

SESSAO_DIR = os.environ.get("SESSAO_DIR", "/dados/.sessao")
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)


# ── API ────────────────────────────────────────────────────────────────────────

@app.route("/sessao")
def check_sessao():
    arquivos = sorted(glob.glob(os.path.join(SESSAO_DIR, "sessao-*")))
    if arquivos:
        usuario = os.path.basename(arquivos[-1]).replace("sessao-", "")
        return jsonify({"conectado": True, "usuario": usuario})
    return jsonify({"conectado": False})


@app.route("/login", methods=["POST"])
def fazer_login():
    dados = request.get_json() or {}
    usuario = (dados.get("usuario") or "").strip()
    senha = (dados.get("senha") or "").strip()
    if not usuario or not senha:
        return jsonify({"erro": "Usuário e senha são obrigatórios."}), 400

    os.makedirs(SESSAO_DIR, exist_ok=True)
    L = instaloader.Instaloader(quiet=True)
    try:
        L.login(usuario, senha)
        caminho = os.path.join(SESSAO_DIR, f"sessao-{usuario}")
        L.save_session_to_file(caminho)
        return jsonify({"ok": True, "usuario": usuario})
    except instaloader.exceptions.BadCredentialsException:
        return jsonify({"erro": "Usuário ou senha incorretos."}), 401
    except instaloader.exceptions.TwoFactorAuthRequiredException:
        return jsonify({"erro": "Conta com autenticação em dois fatores. Use o script manual."}), 422
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route("/post", methods=["POST"])
def buscar_post():
    """Busca dados de um post específico pelo URL do Instagram."""
    dados = request.get_json() or {}
    url = (dados.get("url") or "").strip()
    if not url:
        return jsonify({"erro": "url é obrigatório."}), 400

    # Extrai o shortcode da URL: /p/SHORTCODE/ ou /reel/SHORTCODE/
    match = re.search(r"/(?:p|reel|tv)/([A-Za-z0-9_-]+)", url)
    if not match:
        return jsonify({"erro": "URL do Instagram inválida."}), 400
    shortcode = match.group(1)

    arquivos = sorted(glob.glob(os.path.join(SESSAO_DIR, "sessao-*")))
    if not arquivos:
        return jsonify({"erro": "Nenhuma sessão do Instagram encontrada."}), 503

    usuario = os.path.basename(arquivos[-1]).replace("sessao-", "")
    L = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        quiet=True,
    )
    L.load_session_from_file(usuario, arquivos[-1])

    try:
        post = instaloader.Post.from_shortcode(L.context, shortcode)

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

        return jsonify({
            "shortcode": shortcode,
            "url": f"https://www.instagram.com/p/{shortcode}/",
            "handle": post.owner_username,
            "data": post.date_utc.strftime("%Y-%m-%d"),
            "legenda": post.caption or "",
            "thumbnail": thumbnail,
            "colaboradores": colaboradores,
        })

    except instaloader.exceptions.LoginRequiredException:
        return jsonify({"erro": "Sessão expirada. Faça login novamente."}), 503
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route("/buscar", methods=["POST"])
def iniciar_busca():
    threading.Thread(target=rodar_scraper, daemon=True).start()
    return jsonify({"ok": True, "mensagem": "Busca iniciada. Leva cerca de 1 minuto."})


# ── Agendador ──────────────────────────────────────────────────────────────────

def rodar_scraper():
    print(f"[{time.strftime('%Y-%m-%d %H:%M')}] Iniciando busca agendada...", flush=True)
    resultado = subprocess.run(
        ["python3", os.path.join(SCRIPTS_DIR, "buscar_instagram.py")],
        capture_output=True,
        text=True,
    )
    print(resultado.stdout, flush=True)
    if resultado.returncode != 0:
        print("ERRO:", resultado.stderr, flush=True)


def iniciar_agendador():
    schedule.every().day.at("16:20").do(rodar_scraper)
    print("Agendador iniciado — busca diária às 16:20 (America/Recife)", flush=True)
    while True:
        schedule.run_pending()
        time.sleep(30)


# ── Inicialização ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    threading.Thread(target=iniciar_agendador, daemon=True).start()
    app.run(host="0.0.0.0", port=5000)
