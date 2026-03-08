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

    const locais = await prisma.local.findMany({
      where: busca
        ? {
            OR: [
              { nome: { contains: busca, mode: 'insensitive' } },
              { bairro: { contains: busca, mode: 'insensitive' } },
              { endereco: { contains: busca, mode: 'insensitive' } }
            ]
          }
        : undefined,
      orderBy: { nome: 'asc' },
      take: busca ? 10 : 50,
      select: {
        id: true,
        nome: true,
        endereco: true,
        bairro: true,
        cidade: true,
        latitude: true,
        longitude: true,
        criadoPor: true,
        criadoEm: true
      }
    });

    return res.json(locais);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao listar locais.' });
  }
});

rotas.get('/:id', autenticarOpcional, async (req, res) => {
  try {
    const local = await prisma.local.findUnique({
      where: { id: req.params.id },
      include: {
        criador: { select: { id: true, nome: true } },
        eventos: {
          where: { status: 'aprovado' },
          include: {
            eventoArtistas: { include: { artista: true } }
          },
          orderBy: [{ data: 'asc' }, { horaInicio: 'asc' }]
        }
      }
    });

    if (!local) {
      return res.status(404).json({ erro: 'Local não encontrado.' });
    }

    const podeEditar =
      req.usuario?.id === local.criadoPor || (await ehModerador(req.usuario?.id));

    return res.json({ ...local, podeEditar });
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao buscar local.' });
  }
});

rotas.post('/', autenticarObrigatorio, async (req, res) => {
  try {
    const { nome, endereco, bairro, cidade, latitude, longitude } = req.body;

    if (!nome || !endereco || !bairro || !cidade) {
      return res.status(400).json({ erro: 'Campos obrigatórios: nome, endereco, bairro, cidade.' });
    }

    const local = await prisma.local.create({
      data: {
        nome,
        endereco,
        bairro,
        cidade,
        latitude,
        longitude,
        criadoPor: req.usuario.id
      }
    });

    return res.status(201).json(local);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao criar local.' });
  }
});

rotas.put('/:id', autenticarObrigatorio, async (req, res) => {
  try {
    const local = await prisma.local.findUnique({ where: { id: req.params.id } });
    if (!local) {
      return res.status(404).json({ erro: 'Local não encontrado.' });
    }

    const autorizado = req.usuario.id === local.criadoPor || (await ehModerador(req.usuario.id));
    if (!autorizado) {
      return res.status(403).json({ erro: 'Apenas criador ou moderador pode editar.' });
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
    return res.status(500).json({ erro: 'Falha ao atualizar local.' });
  }
});

module.exports = rotas;
