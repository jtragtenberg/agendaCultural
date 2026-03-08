const express = require('express');
const prisma = require('../../prisma');
const { autenticarObrigatorio, autorizarAdministrador } = require('../../middlewares');

const rotas = express.Router();

rotas.use(autenticarObrigatorio, autorizarAdministrador);

rotas.get('/usuarios', async (_req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        funcao: true,
        reputacao: true,
        verificado: true,
        criadoEm: true,
        _count: {
          select: {
            eventosCriados: true,
            agendaEventos: true,
            eventosModerados: true
          }
        }
      },
      orderBy: [{ funcao: 'asc' }, { criadoEm: 'desc' }]
    });

    return res.json(
      usuarios.map((u) => ({
        ...u,
        uso: {
          eventosCriados: u._count.eventosCriados,
          eventosSalvos: u._count.agendaEventos,
          eventosModerados: u._count.eventosModerados
        }
      }))
    );
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao listar usuários para administração.' });
  }
});

rotas.put('/usuarios/:id/funcao', async (req, res) => {
  try {
    const { funcao } = req.body;
    const permitidas = ['usuario', 'moderador', 'administrador'];

    if (!permitidas.includes(funcao)) {
      return res.status(400).json({ erro: 'Função inválida.' });
    }

    if (req.params.id === req.usuario.id && funcao !== 'administrador') {
      return res.status(400).json({ erro: 'Administrador não pode remover a própria função administrativa.' });
    }

    const atualizado = await prisma.usuario.update({
      where: { id: req.params.id },
      data: { funcao }
    });

    return res.json({
      id: atualizado.id,
      nome: atualizado.nome,
      email: atualizado.email,
      funcao: atualizado.funcao
    });
  } catch (erro) {
    if (erro.code === 'P2025') {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }
    return res.status(500).json({ erro: 'Falha ao atualizar função do usuário.' });
  }
});

rotas.get('/moderadores', async (_req, res) => {
  try {
    const moderadores = await prisma.usuario.findMany({
      where: {
        funcao: {
          in: ['moderador', 'administrador']
        }
      },
      select: {
        id: true,
        nome: true,
        email: true,
        funcao: true,
        _count: {
          select: {
            eventosCriados: true,
            agendaEventos: true,
            eventosModerados: true
          }
        }
      },
      orderBy: [{ funcao: 'asc' }, { nome: 'asc' }]
    });

    return res.json(
      moderadores.map((u) => ({
        ...u,
        dados: {
          eventosModerados: u._count.eventosModerados,
          eventosCriados: u._count.eventosCriados,
          eventosAdicionadosAgenda: u._count.agendaEventos
        }
      }))
    );
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao listar dados dos moderadores.' });
  }
});

module.exports = rotas;
