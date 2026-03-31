const express = require('express');
const fs = require('fs');
const path = require('path');

const roteador = express.Router();

const JSON_PATH = process.env.INSTAGRAM_JSON_PATH
  || path.join(__dirname, '../../../../dados/instagram_posts.json');

const PERFIS_PATH = process.env.INSTAGRAM_PERFIS_PATH
  || path.join(__dirname, '../../../../dados/perfis.json');

const SESSAO_DIR = process.env.INSTAGRAM_SESSAO_DIR
  || path.join(__dirname, '../../../../dados/.sessao');

const SCRAPER_URL = process.env.SCRAPER_URL || 'http://scraper:5000';

// GET /instagram/posts?pagina=1&limite=20
// Retorna feed plano ordenado por data (mais recente primeiro) com paginação
roteador.get('/instagram/posts', (req, res) => {
  if (!fs.existsSync(JSON_PATH)) {
    return res.status(404).json({
      erro: 'Nenhum post salvo ainda. Conecte uma conta e aguarde a busca.',
    });
  }
  try {
    const dados = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

    // Achata todos os posts com info do perfil embutida
    const todos = [];
    for (const perfil of (dados.perfis || [])) {
      for (const post of (perfil.posts || [])) {
        todos.push({
          ...post,
          handle: perfil.handle,
          urlPerfil: perfil.url,
          fotoPerfil: perfil.foto || null,
        });
      }
    }

    // Ordena por data (mais recente primeiro), desempata por shortcode
    todos.sort((a, b) => {
      const d = b.data.localeCompare(a.data);
      return d !== 0 ? d : b.shortcode.localeCompare(a.shortcode);
    });

    const pagina = Math.max(1, parseInt(req.query.pagina) || 1);
    const limite = Math.min(50, Math.max(1, parseInt(req.query.limite) || 20));
    const inicio = (pagina - 1) * limite;
    const posts = todos.slice(inicio, inicio + limite);

    res.json({
      posts,
      total: todos.length,
      pagina,
      totalPaginas: Math.ceil(todos.length / limite),
      temMais: inicio + limite < todos.length,
      atualizadoEm: dados.atualizadoEm || null,
    });
  } catch {
    res.status(500).json({ erro: 'Erro ao ler arquivo de posts.' });
  }
});

// GET /instagram/perfis — lista perfis monitorados
roteador.get('/instagram/perfis', (_req, res) => {
  try {
    if (!fs.existsSync(PERFIS_PATH)) {
      return res.json([]);
    }
    res.json(JSON.parse(fs.readFileSync(PERFIS_PATH, 'utf-8')));
  } catch {
    res.status(500).json({ erro: 'Erro ao ler lista de perfis.' });
  }
});

// POST /instagram/perfis — adiciona novo perfil
roteador.post('/instagram/perfis', (req, res) => {
  const { handle } = req.body || {};
  if (!handle || typeof handle !== 'string' || !handle.trim()) {
    return res.status(400).json({ erro: 'handle é obrigatório.' });
  }
  const normalizado = handle.trim().replace(/^@/, '').toLowerCase();
  try {
    let perfis = [];
    if (fs.existsSync(PERFIS_PATH)) {
      perfis = JSON.parse(fs.readFileSync(PERFIS_PATH, 'utf-8'));
    }
    if (perfis.includes(normalizado)) {
      return res.status(409).json({ erro: 'Perfil já está na lista.' });
    }
    perfis.push(normalizado);
    fs.mkdirSync(path.dirname(PERFIS_PATH), { recursive: true });
    fs.writeFileSync(PERFIS_PATH, JSON.stringify(perfis, null, 2));
    res.status(201).json({ handle: normalizado, perfis });
  } catch {
    res.status(500).json({ erro: 'Erro ao salvar lista de perfis.' });
  }
});

// POST /instagram/atualizar — dispara busca no container scraper
roteador.post('/instagram/atualizar', async (_req, res) => {
  try {
    const resposta = await fetch(`${SCRAPER_URL}/buscar`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
    });
    const dados = await resposta.json();
    res.status(resposta.status).json(dados);
  } catch {
    res.status(503).json({
      erro: 'Serviço de scraping indisponível. Verifique se o container scraper está rodando.',
    });
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
