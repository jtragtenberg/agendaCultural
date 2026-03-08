const express = require('express');
const prisma = require('../../prisma');
const { autenticarObrigatorio } = require('../../middlewares');
const { aplicarPenalidadePorDenuncias } = require('../eventos/servicoEventos');

const rotas = express.Router();

async function validarModerador(usuarioId) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  return Boolean(usuario?.verificado || usuario?.reputacao >= 200);
}

rotas.get('/moderacao/nao-moderados', autenticarObrigatorio, async (req, res) => {
  try {
    if (!(await validarModerador(req.usuario.id))) {
      return res.status(403).json({ erro: 'Ação permitida apenas para moderadores.' });
    }

    const eventos = await prisma.evento.findMany({
      where: {
        status: {
          in: ['pendente', 'sinalizado']
        }
      },
      include: {
        local: true,
        criador: { select: { id: true, nome: true, email: true } },
        eventoArtistas: { include: { artista: true } }
      },
      orderBy: [{ data: 'asc' }, { criadoEm: 'asc' }]
    });

    return res.json(eventos);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao listar eventos não moderados.' });
  }
});

rotas.post('/:id/denunciar', autenticarObrigatorio, async (req, res) => {
  try {
    const { motivo } = req.body;
    const eventoId = req.params.id;

    if (!motivo) {
      return res.status(400).json({ erro: 'motivo é obrigatório.' });
    }

    const evento = await prisma.evento.findUnique({ where: { id: eventoId } });
    if (!evento) {
      return res.status(404).json({ erro: 'Evento não encontrado.' });
    }

    const denuncia = await prisma.denunciaEvento.create({
      data: {
        eventoId,
        denunciadoPor: req.usuario.id,
        motivo
      }
    });

    const resultado = await aplicarPenalidadePorDenuncias(eventoId);

    return res.status(201).json({ denuncia, ...resultado });
  } catch (erro) {
    if (erro.code === 'P2002') {
      return res.status(409).json({ erro: 'Você já denunciou este evento.' });
    }
    return res.status(500).json({ erro: 'Falha ao registrar denúncia.' });
  }
});

rotas.post('/:id/aprovar', autenticarObrigatorio, async (req, res) => {
  try {
    if (!(await validarModerador(req.usuario.id))) {
      return res.status(403).json({ erro: 'Ação permitida apenas para moderadores.' });
    }

    const evento = await prisma.evento.update({
      where: { id: req.params.id },
      data: { status: 'aprovado' }
    });

    await prisma.usuario.update({
      where: { id: evento.criadoPor },
      data: { reputacao: { increment: 5 } }
    });

    return res.json(evento);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao aprovar evento.' });
  }
});

rotas.post('/:id/rejeitar', autenticarObrigatorio, async (req, res) => {
  try {
    if (!(await validarModerador(req.usuario.id))) {
      return res.status(403).json({ erro: 'Ação permitida apenas para moderadores.' });
    }

    const evento = await prisma.evento.update({
      where: { id: req.params.id },
      data: { status: 'rejeitado' },
      include: { criador: true }
    });

    await prisma.usuario.update({
      where: { id: evento.criadoPor },
      data: { reputacao: Math.max(0, evento.criador.reputacao - 3) }
    });

    return res.json(evento);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao rejeitar evento.' });
  }
});

rotas.put('/:id/editar', autenticarObrigatorio, async (req, res) => {
  try {
    if (!(await validarModerador(req.usuario.id))) {
      return res.status(403).json({ erro: 'Ação permitida apenas para moderadores.' });
    }

    const { titulo, descricao, localId, data, horaInicio, horaFim, status } = req.body;

    const evento = await prisma.evento.update({
      where: { id: req.params.id },
      data: {
        titulo,
        descricao,
        localId,
        data: data ? new Date(data) : undefined,
        horaInicio,
        horaFim,
        status
      },
      include: {
        local: true,
        eventoArtistas: { include: { artista: true } }
      }
    });

    return res.json(evento);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao editar evento.' });
  }
});

rotas.delete('/:id', autenticarObrigatorio, async (req, res) => {
  try {
    if (!(await validarModerador(req.usuario.id))) {
      return res.status(403).json({ erro: 'Ação permitida apenas para moderadores.' });
    }

    const eventoId = req.params.id;

    await prisma.$transaction([
      prisma.agendaEvento.deleteMany({ where: { eventoId } }),
      prisma.eventoArtista.deleteMany({ where: { eventoId } }),
      prisma.denunciaEvento.deleteMany({ where: { eventoId } }),
      prisma.evento.delete({ where: { id: eventoId } })
    ]);

    return res.status(204).send();
  } catch (erro) {
    if (erro.code === 'P2025') {
      return res.status(404).json({ erro: 'Evento não encontrado.' });
    }
    return res.status(500).json({ erro: 'Falha ao apagar evento.' });
  }
});

rotas.get('/moderacao/locais', autenticarObrigatorio, async (req, res) => {
  try {
    if (!(await validarModerador(req.usuario.id))) {
      return res.status(403).json({ erro: 'Ação permitida apenas para moderadores.' });
    }

    const locais = await prisma.local.findMany({
      include: {
        criador: { select: { id: true, nome: true, email: true } },
        _count: { select: { eventos: true } }
      },
      orderBy: { criadoEm: 'desc' }
    });

    return res.json(locais);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao listar locais para moderação.' });
  }
});

rotas.put('/moderacao/locais/:id', autenticarObrigatorio, async (req, res) => {
  try {
    if (!(await validarModerador(req.usuario.id))) {
      return res.status(403).json({ erro: 'Ação permitida apenas para moderadores.' });
    }

    const atualizado = await prisma.local.update({
      where: { id: req.params.id },
      data: {
        nome: req.body.nome,
        endereco: req.body.endereco,
        bairro: req.body.bairro,
        cidade: req.body.cidade,
        latitude: req.body.latitude,
        longitude: req.body.longitude
      }
    });

    return res.json(atualizado);
  } catch (erro) {
    if (erro.code === 'P2025') {
      return res.status(404).json({ erro: 'Local não encontrado.' });
    }
    return res.status(500).json({ erro: 'Falha ao editar local.' });
  }
});

rotas.delete('/moderacao/locais/:id', autenticarObrigatorio, async (req, res) => {
  try {
    if (!(await validarModerador(req.usuario.id))) {
      return res.status(403).json({ erro: 'Ação permitida apenas para moderadores.' });
    }

    const localId = req.params.id;
    const eventoRelacionado = await prisma.evento.findFirst({ where: { localId } });
    if (eventoRelacionado) {
      return res.status(400).json({ erro: 'Não é possível apagar local com eventos vinculados.' });
    }

    await prisma.local.delete({ where: { id: localId } });
    return res.status(204).send();
  } catch (erro) {
    if (erro.code === 'P2025') {
      return res.status(404).json({ erro: 'Local não encontrado.' });
    }
    return res.status(500).json({ erro: 'Falha ao apagar local.' });
  }
});

rotas.get('/moderacao/artistas', autenticarObrigatorio, async (req, res) => {
  try {
    if (!(await validarModerador(req.usuario.id))) {
      return res.status(403).json({ erro: 'Ação permitida apenas para moderadores.' });
    }

    const artistas = await prisma.artista.findMany({
      include: {
        criador: { select: { id: true, nome: true, email: true } },
        _count: { select: { eventoArtistas: true } }
      },
      orderBy: { criadoEm: 'desc' }
    });

    return res.json(artistas);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao listar artistas para moderação.' });
  }
});

rotas.put('/moderacao/artistas/:id', autenticarObrigatorio, async (req, res) => {
  try {
    if (!(await validarModerador(req.usuario.id))) {
      return res.status(403).json({ erro: 'Ação permitida apenas para moderadores.' });
    }

    const atualizado = await prisma.artista.update({
      where: { id: req.params.id },
      data: {
        nome: req.body.nome,
        descricao: req.body.descricao,
        instagram: req.body.instagram,
        website: req.body.website
      }
    });

    return res.json(atualizado);
  } catch (erro) {
    if (erro.code === 'P2025') {
      return res.status(404).json({ erro: 'Artista não encontrado.' });
    }
    return res.status(500).json({ erro: 'Falha ao editar artista.' });
  }
});

rotas.delete('/moderacao/artistas/:id', autenticarObrigatorio, async (req, res) => {
  try {
    if (!(await validarModerador(req.usuario.id))) {
      return res.status(403).json({ erro: 'Ação permitida apenas para moderadores.' });
    }

    const artistaId = req.params.id;
    const vinculo = await prisma.eventoArtista.findFirst({ where: { artistaId } });
    if (vinculo) {
      return res.status(400).json({ erro: 'Não é possível apagar artista vinculado a eventos.' });
    }

    await prisma.artista.delete({ where: { id: artistaId } });
    return res.status(204).send();
  } catch (erro) {
    if (erro.code === 'P2025') {
      return res.status(404).json({ erro: 'Artista não encontrado.' });
    }
    return res.status(500).json({ erro: 'Falha ao apagar artista.' });
  }
});

module.exports = rotas;
