const express = require('express');
const prisma = require('../../prisma');
const { autenticarObrigatorio, autenticarOpcional } = require('../../middlewares');

const rotas = express.Router();

async function ehModerador(usuarioId) {
  if (!usuarioId) return false;
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { reputacao: true, verificado: true }
  });
  return Boolean(usuario && (usuario.verificado || usuario.reputacao >= 200));
}

rotas.get('/', async (req, res) => {
  try {
    const busca = String(req.query.q || '').trim();

    const artistas = await prisma.artista.findMany({
      where: busca
        ? {
            OR: [
              { nome: { contains: busca, mode: 'insensitive' } },
              { descricao: { contains: busca, mode: 'insensitive' } }
            ]
          }
        : undefined,
      orderBy: { nome: 'asc' },
      take: busca ? 10 : 50,
      select: {
        id: true,
        nome: true,
        descricao: true,
        instagram: true,
        website: true,
        criadoPor: true,
        criadoEm: true
      }
    });

    return res.json(artistas);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao listar artistas.' });
  }
});

rotas.get('/:id', autenticarOpcional, async (req, res) => {
  try {
    const artista = await prisma.artista.findUnique({
      where: { id: req.params.id },
      include: {
        criador: { select: { id: true, nome: true } },
        eventoArtistas: {
          include: {
            evento: {
              where: { status: 'aprovado' },
              include: { local: true }
            }
          }
        }
      }
    });

    if (!artista) {
      return res.status(404).json({ erro: 'Artista não encontrado.' });
    }

    const eventos = artista.eventoArtistas
      .map((registro) => registro.evento)
      .filter(Boolean)
      .sort((a, b) => a.data - b.data);

    const podeEditar =
      req.usuario?.id === artista.criadoPor || (await ehModerador(req.usuario?.id));

    return res.json({
      ...artista,
      eventos,
      podeEditar
    });
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao buscar artista.' });
  }
});

rotas.post('/', autenticarObrigatorio, async (req, res) => {
  try {
    const { nome, descricao, instagram, website } = req.body;

    if (!nome) {
      return res.status(400).json({ erro: 'Campo obrigatório: nome.' });
    }

    const artista = await prisma.artista.create({
      data: {
        nome,
        descricao,
        instagram,
        website,
        criadoPor: req.usuario.id
      }
    });

    return res.status(201).json(artista);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao criar artista.' });
  }
});

rotas.put('/:id', autenticarObrigatorio, async (req, res) => {
  try {
    const artista = await prisma.artista.findUnique({ where: { id: req.params.id } });
    if (!artista) {
      return res.status(404).json({ erro: 'Artista não encontrado.' });
    }

    const autorizado = req.usuario.id === artista.criadoPor || (await ehModerador(req.usuario.id));
    if (!autorizado) {
      return res.status(403).json({ erro: 'Apenas criador ou moderador pode editar.' });
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
    return res.status(500).json({ erro: 'Falha ao atualizar artista.' });
  }
});

module.exports = rotas;
