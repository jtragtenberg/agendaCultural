const express = require('express');
const prisma = require('../../prisma');
const { autenticarObrigatorio, autenticarOpcional } = require('../../middlewares');
const { validarLimiteNovato, validarDuplicidade } = require('./servicoEventos');

const rotas = express.Router();

rotas.get('/', autenticarOpcional, async (req, res) => {
  try {
    const eventos = await prisma.evento.findMany({
      where: {
        status: { not: 'rejeitado' }
      },
      include: {
        local: true,
        eventoArtistas: {
          include: { artista: true }
        }
      },
      orderBy: [{ data: 'asc' }, { horaInicio: 'asc' }]
    });

    return res.json(eventos);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao listar eventos.' });
  }
});

rotas.get('/:id', async (req, res) => {
  try {
    const evento = await prisma.evento.findUnique({
      where: { id: req.params.id },
      include: {
        local: true,
        criador: {
          select: { id: true, nome: true, reputacao: true }
        },
        eventoArtistas: {
          include: { artista: true }
        }
      }
    });

    if (!evento) {
      return res.status(404).json({ erro: 'Evento não encontrado.' });
    }

    return res.json(evento);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao buscar evento.' });
  }
});

rotas.post('/', autenticarObrigatorio, async (req, res) => {
  try {
    const { titulo, descricao, localId, data, horaInicio, horaFim, artistas = [] } = req.body;

    if (!titulo || !descricao || !localId || !data || !horaInicio) {
      return res.status(400).json({ erro: 'Campos obrigatórios: titulo, descricao, localId, data, horaInicio.' });
    }

    const usuario = await validarLimiteNovato(req.usuario.id);
    await validarDuplicidade({ localId, data, titulo });

    const evento = await prisma.evento.create({
      data: {
        titulo,
        descricao,
        localId,
        data: new Date(data),
        horaInicio,
        horaFim,
        criadoPor: req.usuario.id,
        status: 'pendente',
        eventoArtistas: {
          create: artistas.map((artistaId) => ({ artistaId }))
        }
      },
      include: {
        local: true,
        eventoArtistas: { include: { artista: true } }
      }
    });

    return res.status(201).json(evento);
  } catch (erro) {
    const status = erro.message?.includes('Limite') || erro.message?.includes('duplicado') ? 400 : 500;
    return res.status(status).json({ erro: erro.message || 'Falha ao criar evento.' });
  }
});

module.exports = rotas;
