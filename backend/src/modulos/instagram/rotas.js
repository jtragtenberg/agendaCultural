const express = require('express');
const fs = require('fs');
const path = require('path');

const roteador = express.Router();

const JSON_PATH = process.env.INSTAGRAM_JSON_PATH
  || path.join(__dirname, '../../../../dados/instagram_posts.json');

const SESSAO_DIR = process.env.INSTAGRAM_SESSAO_DIR
  || path.join(__dirname, '../../../../dados/.sessao');

const SCRAPER_URL = process.env.SCRAPER_URL || 'http://scraper:5000';

// GET /instagram/posts
roteador.get('/instagram/posts', (_req, res) => {
  if (!fs.existsSync(JSON_PATH)) {
    return res.status(404).json({
      erro: 'Nenhum post salvo ainda. Conecte uma conta e aguarde a busca.',
    });
  }
  try {
    res.json(JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8')));
  } catch {
    res.status(500).json({ erro: 'Erro ao ler arquivo de posts.' });
  }
});

// GET /instagram/sessao — verifica se há sessão salva
roteador.get('/instagram/sessao', (_req, res) => {
  try {
    if (!fs.existsSync(SESSAO_DIR)) return res.json({ conectado: false });
    const arquivos = fs.readdirSync(SESSAO_DIR).filter(f => f.startsWith('sessao-'));
    if (arquivos.length === 0) return res.json({ conectado: false });
    const usuario = arquivos.at(-1).replace('sessao-', '');
    res.json({ conectado: true, usuario });
  } catch {
    res.json({ conectado: false });
  }
});

// POST /instagram/login — repassa credenciais ao container scraper
roteador.post('/instagram/login', async (req, res) => {
  const { usuario, senha } = req.body || {};
  if (!usuario || !senha) {
    return res.status(400).json({ erro: 'Usuário e senha são obrigatórios.' });
  }
  try {
    const resposta = await fetch(`${SCRAPER_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senha }),
      signal: AbortSignal.timeout(30000),
    });
    const dados = await resposta.json();
    res.status(resposta.status).json(dados);
  } catch {
    res.status(503).json({
      erro: 'Serviço de scraping indisponível. Verifique se o container scraper está rodando.',
    });
  }
});

module.exports = roteador;
