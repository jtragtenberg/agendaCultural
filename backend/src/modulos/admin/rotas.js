const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../../prisma');
const { autenticarAdmin } = require('../../middlewares');

const rotas = express.Router();

// GET /admin/usuarios — todos os usuários com métricas
rotas.get('/admin/usuarios', autenticarAdmin, async (_req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        bio: true,
        reputacao: true,
        verificado: true,
        funcao: true,
        criadoEm: true,
        _count: {
          select: {
            eventosCriados: true,
            agendaEventos: true,
            eventosModerados: true,
          }
        }
      },
      orderBy: { reputacao: 'desc' }
    });

    const comScore = usuarios.map(u => ({
      ...u,
      score: u.reputacao
        + u._count.eventosCriados * 10
        + u._count.eventosModerados * 5
        + u._count.agendaEventos * 2
    }));

    comScore.sort((a, b) => b.score - a.score);

    return res.json(comScore);
  } catch {
    return res.status(500).json({ erro: 'Falha ao listar usuários.' });
  }
});

// GET /admin/usuarios/:id — perfil completo do usuário
rotas.get('/admin/usuarios/:id', autenticarAdmin, async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, nome: true, email: true, bio: true,
        reputacao: true, verificado: true, funcao: true, criadoEm: true,
        eventosCriados: {
          include: { local: true, eventoArtistas: { include: { artista: true } } },
          orderBy: { criadoEm: 'desc' }
        },
        eventosModerados: {
          select: { id: true, titulo: true, status: true, data: true, moderadoEm: true },
          orderBy: { moderadoEm: 'desc' }
        },
        locaisCriados: {
          select: { id: true, nome: true, bairro: true, criadoEm: true },
          orderBy: { criadoEm: 'desc' }
        },
        artistasCriados: {
          select: { id: true, nome: true, instagram: true, criadoEm: true },
          orderBy: { criadoEm: 'desc' }
        },
        agendaEventos: {
          include: { evento: { include: { local: true } } },
          orderBy: { criadoEm: 'desc' }
        },
        denuncias: {
          include: { evento: { select: { id: true, titulo: true } } },
          orderBy: { criadoEm: 'desc' }
        },
      }
    });
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    return res.json(usuario);
  } catch {
    return res.status(500).json({ erro: 'Falha ao carregar perfil.' });
  }
});

// GET /admin/eventos — todos os eventos
rotas.get('/admin/eventos', autenticarAdmin, async (_req, res) => {
  try {
    const eventos = await prisma.evento.findMany({
      include: {
        local: true,
        criador: { select: { id: true, nome: true, email: true } },
        eventoArtistas: { include: { artista: true } },
        _count: { select: { denuncias: true } }
      },
      orderBy: [{ data: 'desc' }, { criadoEm: 'desc' }]
    });
    return res.json(eventos);
  } catch {
    return res.status(500).json({ erro: 'Falha ao listar eventos.' });
  }
});

// PUT /admin/usuarios/:id — atualizar dados do usuário
rotas.put('/admin/usuarios/:id', autenticarAdmin, async (req, res) => {
  try {
    const { nome, funcao, verificado, reputacao } = req.body;
    const dados = {};
    if (nome !== undefined) dados.nome = nome.trim();
    if (funcao !== undefined) dados.funcao = funcao;
    if (verificado !== undefined) dados.verificado = Boolean(verificado);
    if (reputacao !== undefined) dados.reputacao = Number(reputacao);

    const usuario = await prisma.usuario.update({
      where: { id: req.params.id },
      data: dados,
      select: { id: true, nome: true, email: true, funcao: true, verificado: true, reputacao: true }
    });
    return res.json(usuario);
  } catch {
    return res.status(500).json({ erro: 'Falha ao atualizar usuário.' });
  }
});

// PUT /admin/usuarios/:id/senha — trocar senha sem precisar da atual
rotas.put('/admin/usuarios/:id/senha', autenticarAdmin, async (req, res) => {
  try {
    const { novaSenha } = req.body;
    if (!novaSenha || novaSenha.length < 6) {
      return res.status(400).json({ erro: 'novaSenha deve ter pelo menos 6 caracteres.' });
    }
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await prisma.usuario.update({ where: { id: req.params.id }, data: { senhaHash } });
    return res.json({ mensagem: 'Senha alterada com sucesso.' });
  } catch {
    return res.status(500).json({ erro: 'Falha ao alterar senha.' });
  }
});

// PUT /admin/eventos/:id — editar qualquer evento
rotas.put('/admin/eventos/:id', autenticarAdmin, async (req, res) => {
  try {
    const { titulo, descricao, localId, data, horaInicio, horaFim, status } = req.body;
    const evento = await prisma.evento.update({
      where: { id: req.params.id },
      data: {
        ...(titulo && { titulo }),
        ...(descricao && { descricao }),
        ...(localId && { localId }),
        ...(data && { data: new Date(data) }),
        ...(horaInicio && { horaInicio }),
        ...(horaFim !== undefined && { horaFim }),
        ...(status && { status }),
      },
      include: { local: true, eventoArtistas: { include: { artista: true } } }
    });
    return res.json(evento);
  } catch {
    return res.status(500).json({ erro: 'Falha ao editar evento.' });
  }
});

// DELETE /admin/eventos/:id — apagar qualquer evento
rotas.delete('/admin/eventos/:id', autenticarAdmin, async (req, res) => {
  try {
    await prisma.denunciaEvento.deleteMany({ where: { eventoId: req.params.id } });
    await prisma.agendaEvento.deleteMany({ where: { eventoId: req.params.id } });
    await prisma.eventoArtista.deleteMany({ where: { eventoId: req.params.id } });
    await prisma.evento.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ erro: 'Falha ao apagar evento.' });
  }
});

// PUT /admin/artistas/:id
rotas.put('/admin/artistas/:id', autenticarAdmin, async (req, res) => {
  try {
    const { nome, descricao, instagram, website } = req.body;
    const artista = await prisma.artista.update({
      where: { id: req.params.id },
      data: {
        ...(nome && { nome }),
        ...(descricao !== undefined && { descricao }),
        ...(instagram !== undefined && { instagram }),
        ...(website !== undefined && { website }),
      }
    });
    return res.json(artista);
  } catch {
    return res.status(500).json({ erro: 'Falha ao editar artista.' });
  }
});

// DELETE /admin/artistas/:id
rotas.delete('/admin/artistas/:id', autenticarAdmin, async (req, res) => {
  try {
    await prisma.eventoArtista.deleteMany({ where: { artistaId: req.params.id } });
    await prisma.artista.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ erro: 'Falha ao apagar artista.' });
  }
});

// PUT /admin/locais/:id
rotas.put('/admin/locais/:id', autenticarAdmin, async (req, res) => {
  try {
    const { nome, endereco, bairro, cidade, latitude, longitude } = req.body;
    const local = await prisma.local.update({
      where: { id: req.params.id },
      data: {
        ...(nome && { nome }),
        ...(endereco && { endereco }),
        ...(bairro && { bairro }),
        ...(cidade && { cidade }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
      }
    });
    return res.json(local);
  } catch {
    return res.status(500).json({ erro: 'Falha ao editar local.' });
  }
});

// DELETE /admin/locais/:id
rotas.delete('/admin/locais/:id', autenticarAdmin, async (req, res) => {
  try {
    await prisma.local.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ erro: 'Falha ao apagar local.' });
  }
});

module.exports = rotas;
