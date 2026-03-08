const express = require('express');
const cors = require('cors');
const { porta } = require('./config');
const prisma = require('./prisma');

const rotasAutenticacao = require('./modulos/autenticacao/rotas');
const rotasEventos = require('./modulos/eventos/rotas');
const rotasArtistas = require('./modulos/artistas/rotas');
const rotasLocais = require('./modulos/locais/rotas');
const rotasAgenda = require('./modulos/agenda/rotas');
const rotasSeguidores = require('./modulos/seguidores/rotas');
const rotasModeracao = require('./modulos/moderacao/rotas');
const rotasUsuarios = require('./modulos/usuarios/rotas');
const rotasCalendario = require('./modulos/calendario/rotas');
const rotasAdmin = require('./modulos/admin/rotas');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/saude', (_req, res) => res.json({ ok: true, servico: 'agenda-cultural-recife' }));

app.use('/autenticacao', rotasAutenticacao);
app.use('/eventos', rotasEventos);
app.use('/artistas', rotasArtistas);
app.use('/locais', rotasLocais);
app.use('/agenda', rotasAgenda);
app.use('/', rotasSeguidores);
app.use('/eventos', rotasModeracao);
app.use('/usuarios', rotasCalendario);
app.use('/usuarios', rotasUsuarios);
app.use('/admin', rotasAdmin);

app.use((erro, _req, res, _next) => {
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
});

app.listen(porta, () => {
  console.log(`API rodando em http://localhost:${porta}`);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
