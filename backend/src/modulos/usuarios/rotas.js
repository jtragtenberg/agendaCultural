const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../../prisma');
const { autenticarOpcional, autenticarObrigatorio } = require('../../middlewares');

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

rotas.put('/me', autenticarObrigatorio, async (req, res) => {
  try {
    const { nome, bio } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ erro: 'Nome é obrigatório.' });
    }

    const usuario = await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { nome: nome.trim(), bio: bio || null },
      select: { id: true, nome: true, email: true, bio: true, reputacao: true, verificado: true }
    });

    return res.json(usuario);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao atualizar perfil.' });
  }
});

rotas.put('/me/senha', autenticarObrigatorio, async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ erro: 'senhaAtual e novaSenha são obrigatórios.' });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 6 caracteres.' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario.id } });
    const valido = await bcrypt.compare(senhaAtual, usuario.senhaHash);

    if (!valido) {
      return res.status(401).json({ erro: 'Senha atual incorreta.' });
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await prisma.usuario.update({ where: { id: req.usuario.id }, data: { senhaHash } });

    return res.json({ mensagem: 'Senha alterada com sucesso.' });
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao alterar senha.' });
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
