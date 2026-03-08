const express = require('express');
const prisma = require('../../prisma');
const { autenticarObrigatorio } = require('../../middlewares');

const rotas = express.Router();

rotas.post('/adicionar', autenticarObrigatorio, async (req, res) => {
  try {
    const { eventoId } = req.body;

    if (!eventoId) {
      return res.status(400).json({ erro: 'eventoId é obrigatório.' });
    }

    const evento = await prisma.evento.findUnique({ where: { id: eventoId } });
    if (!evento || evento.status !== 'aprovado') {
      return res.status(404).json({ erro: 'Evento não encontrado ou não aprovado.' });
    }

    const agendaEvento = await prisma.agendaEvento.upsert({
      where: {
        usuarioId_eventoId: {
          usuarioId: req.usuario.id,
          eventoId
        }
      },
      create: {
        usuarioId: req.usuario.id,
        eventoId
      },
      update: {}
    });

    return res.status(201).json(agendaEvento);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao adicionar evento na agenda.' });
  }
});

rotas.get('/minha', autenticarObrigatorio, async (req, res) => {
  try {
    const seguindo = await prisma.seguidor.findMany({
      where: { seguidorId: req.usuario.id },
      select: { seguindoId: true }
    });

    const idsSeguindo = seguindo.map((item) => item.seguindoId);

    const [agendaPropria, agendaSeguindo] = await Promise.all([
      prisma.agendaEvento.findMany({
        where: { usuarioId: req.usuario.id },
        include: {
          evento: {
            include: { local: true, eventoArtistas: { include: { artista: true } } }
          }
        }
      }),
      prisma.agendaEvento.findMany({
        where: { usuarioId: { in: idsSeguindo } },
        include: {
          usuario: { select: { id: true, nome: true } },
          evento: {
            include: { local: true, eventoArtistas: { include: { artista: true } } }
          }
        }
      })
    ]);

    agendaPropria.sort((a, b) => a.evento.data - b.evento.data);
    agendaSeguindo.sort((a, b) => a.evento.data - b.evento.data);

    return res.json({
      agendaPropria,
      agendaSeguindo
    });
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao carregar agenda.' });
  }
});

rotas.delete('/remover/:eventoId', autenticarObrigatorio, async (req, res) => {
  try {
    const { eventoId } = req.params;

    await prisma.agendaEvento.delete({
      where: {
        usuarioId_eventoId: {
          usuarioId: req.usuario.id,
          eventoId
        }
      }
    });

    return res.status(204).send();
  } catch (erro) {
    if (erro.code === 'P2025') {
      return res.status(404).json({ erro: 'Evento não está na sua agenda.' });
    }
    return res.status(500).json({ erro: 'Falha ao remover evento da agenda.' });
  }
});

module.exports = rotas;
