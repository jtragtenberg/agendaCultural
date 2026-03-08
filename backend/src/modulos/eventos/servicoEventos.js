const prisma = require('../../prisma');
const {
  limiteEventosNovato24h,
  reputacaoAutoAprovacao,
  limiarDenunciasSinalizado
} = require('../../config');

function normalizarTexto(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function similaridadeTitulos(a, b) {
  const termosA = new Set(normalizarTexto(a).split(' ').filter(Boolean));
  const termosB = new Set(normalizarTexto(b).split(' ').filter(Boolean));
  if (!termosA.size || !termosB.size) return 0;

  const intersecao = [...termosA].filter((termo) => termosB.has(termo)).length;
  const uniao = new Set([...termosA, ...termosB]).size;
  return intersecao / uniao;
}

async function validarLimiteNovato(usuarioId) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) {
    throw new Error('Usuário não encontrado.');
  }

  if (usuario.reputacao >= reputacaoAutoAprovacao || usuario.verificado) {
    return usuario;
  }

  const inicioJanela = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const criados = await prisma.evento.count({
    where: {
      criadoPor: usuarioId,
      criadoEm: {
        gte: inicioJanela
      }
    }
  });

  if (criados >= limiteEventosNovato24h) {
    throw new Error(`Limite de ${limiteEventosNovato24h} eventos por 24h para novos usuários.`);
  }

  return usuario;
}

async function validarDuplicidade({ localId, data, titulo }) {
  const inicio = new Date(data);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);

  const candidatos = await prisma.evento.findMany({
    where: {
      localId,
      data: {
        gte: inicio,
        lt: fim
      }
    },
    select: {
      id: true,
      titulo: true
    }
  });

  const duplicado = candidatos.find((evento) => similaridadeTitulos(evento.titulo, titulo) >= 0.6);
  if (duplicado) {
    throw new Error('Evento potencialmente duplicado no mesmo local e data.');
  }
}

async function aplicarPenalidadePorDenuncias(eventoId) {
  const totalDenuncias = await prisma.denunciaEvento.count({ where: { eventoId } });

  if (totalDenuncias >= limiarDenunciasSinalizado) {
    const evento = await prisma.evento.update({
      where: { id: eventoId },
      data: { status: 'sinalizado' },
      include: { criador: true }
    });

    await prisma.usuario.update({
      where: { id: evento.criadoPor },
      data: { reputacao: Math.max(0, evento.criador.reputacao - 10) }
    });

    return { sinalizado: true, totalDenuncias };
  }

  return { sinalizado: false, totalDenuncias };
}

module.exports = {
  validarLimiteNovato,
  validarDuplicidade,
  aplicarPenalidadePorDenuncias
};
