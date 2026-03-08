const express = require('express');
const prisma = require('../../prisma');
const { autenticarObrigatorio } = require('../../middlewares');
const { aplicarPenalidadePorDenuncias } = require('../eventos/servicoEventos');

const rotas = express.Router();

async function validarModerador(usuarioId) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  return Boolean(usuario?.verificado || usuario?.reputacao >= 200);
}

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

module.exports = rotas;
