const express = require('express');
const prisma = require('../../prisma');

const rotas = express.Router();

rotas.get('/:id', async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        nome: true,
        email: true,
        bio: true,
        avatarUrl: true,
        reputacao: true,
        verificado: true,
        criadoEm: true
      }
    });

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    return res.json(usuario);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao carregar usuário.' });
  }
});

module.exports = rotas;
