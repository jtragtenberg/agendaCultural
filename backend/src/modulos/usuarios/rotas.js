const express = require('express');
const prisma = require('../../prisma');
const { autenticarOpcional } = require('../../middlewares');

const rotas = express.Router();

rotas.get('/', autenticarOpcional, async (req, res) => {
  try {
    const busca = String(req.query.q || '').trim();

    const usuarios = await prisma.usuario.findMany({
      where: {
        ...(busca
          ? {
              OR: [
                { nome: { contains: busca, mode: 'insensitive' } },
                { email: { contains: busca, mode: 'insensitive' } }
              ]
            }
          : {}),
        ...(req.usuario?.id ? { id: { not: req.usuario.id } } : {})
      },
      select: {
        id: true,
        nome: true,
        email: true,
        bio: true,
        avatarUrl: true,
        reputacao: true,
        verificado: true
      },
      orderBy: [{ reputacao: 'desc' }, { nome: 'asc' }],
      take: busca ? 20 : 30
    });

    return res.json(usuarios);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao buscar usuários.' });
  }
});

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
