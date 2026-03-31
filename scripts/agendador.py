#!/usr/bin/env python3
"""
Serviço combinado:
  - Agendador diário: roda buscar_instagram.py às 16:20 (fuso America/Recife)
  - API HTTP interna: /sessao e /login (usada pelo backend Node.js)
"""

import glob
import os
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
