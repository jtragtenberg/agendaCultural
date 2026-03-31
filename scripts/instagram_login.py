#!/usr/bin/env python3
"""
Faz login no Instagram e salva a sessão localmente.
Execute este script UMA VEZ. Depois disso, buscar_instagram.py usará a sessão salva.

Uso:
    python3 scripts/instagram_login.py
"""

import instaloader
import os
import getpass

SESSAO_DIR = os.path.join(os.path.dirname(__file__), "..", "dados", ".sessao")


def main():
    os.makedirs(SESSAO_DIR, exist_ok=True)

    print("=== Login no Instagram ===")
    print("Use uma conta pessoal ou uma conta dummy para este script.")
    print("As credenciais NÃO são salvas — apenas a sessão (cookie) é salva localmente.\n")

    usuario = input("Usuário do Instagram: ").strip()
    senha = getpass.getpass("Senha: ")

    L = instaloader.Instaloader(quiet=False)
    try:
        L.login(usuario, senha)
        caminho_sessao = os.path.join(SESSAO_DIR, f"sessao-{usuario}")
        L.save_session_to_file(caminho_sessao)
        print(f"\nSessão salva em: {caminho_sessao}")
        print("Agora você pode executar: python3 scripts/buscar_instagram.py")
    except instaloader.exceptions.BadCredentialsException:
        print("\nErro: usuário ou senha incorretos.")
    except instaloader.exceptions.TwoFactorAuthRequiredException:
        codigo = input("Código de autenticação de dois fatores: ").strip()
        L.two_factor_login(codigo)
        caminho_sessao = os.path.join(SESSAO_DIR, f"sessao-{usuario}")
        L.save_session_to_file(caminho_sessao)
        print(f"\nSessão salva em: {caminho_sessao}")


if __name__ == "__main__":
    main()
