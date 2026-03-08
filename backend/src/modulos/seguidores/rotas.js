const express = require('express');
const prisma = require('../../prisma');
const { autenticarObrigatorio } = require('../../middlewares');

const rotas = express.Router();

rotas.post('/seguir/:usuarioId', autenticarObrigatorio, async (req, res) => {
  try {
    const { usuarioId } = req.params;

    if (usuarioId === req.usuario.id) {
      return res.status(400).json({ erro: 'Você não pode seguir a si mesmo.' });
    }

    const alvo = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!alvo) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    const relacao = await prisma.seguidor.upsert({
      where: {
        seguidorId_seguindoId: {
          seguidorId: req.usuario.id,
          seguindoId: usuarioId
        }
      },
      create: {
        seguidorId: req.usuario.id,
        seguindoId: usuarioId
      },
      update: {}
    });

    return res.status(201).json(relacao);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao seguir usuário.' });
  }
});

rotas.get('/seguindo', autenticarObrigatorio, async (req, res) => {
  try {
    const lista = await prisma.seguidor.findMany({
      where: { seguidorId: req.usuario.id },
      include: {
        seguindo: {
          select: { id: true, nome: true, avatarUrl: true, reputacao: true }
        }
      }
    });

    return res.json(lista.map((item) => item.seguindo));
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao listar usuários seguidos.' });
  }
});

module.exports = rotas;
