const express = require('express');
const fs = require('fs');
const path = require('path');

const roteador = express.Router();

// Em Docker: INSTAGRAM_JSON_PATH=/dados/instagram_posts.json
// No host: caminho relativo ao backend
const JSON_PATH = process.env.INSTAGRAM_JSON_PATH
  || path.join(__dirname, '../../../../dados/instagram_posts.json');

roteador.get('/instagram/posts', (_req, res) => {
  if (!fs.existsSync(JSON_PATH)) {
    return res.status(404).json({
      erro: 'Arquivo de posts não encontrado. Execute scripts/buscar_instagram.py primeiro.',
    });
  }
  try {
    const conteudo = fs.readFileSync(JSON_PATH, 'utf-8');
    res.json(JSON.parse(conteudo));
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao ler arquivo de posts.' });
  }
});

module.exports = roteador;
