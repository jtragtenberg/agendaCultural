const { PrismaClient } = require('@prisma/client');
const dados = require('./eventos-novos.json');

const prisma = new PrismaClient();

async function obterCriadorPadrao() {
  const moderador = await prisma.usuario.findUnique({
    where: { email: 'moderador@agenda.recife' }
  });

  if (moderador) return moderador.id;

  const primeiro = await prisma.usuario.findFirst({
    orderBy: { criadoEm: 'asc' }
  });

  if (!primeiro) {
    throw new Error('Nenhum usuário encontrado.');
  }

  return primeiro.id;
}

async function obterOuCriarLocal(local, criadoPor) {
  const existente = await prisma.local.findFirst({
    where: {
      nome: { equals: local.nome, mode: 'insensitive' },
      endereco: { equals: local.endereco, mode: 'insensitive' }
    }
  });

  if (existente) return existente;

  return prisma.local.create({
    data: {
      ...local,
      criadoPor
    }
  });
}

async function obterOuCriarArtista(nome, criadoPor) {
  const existente = await prisma.artista.findFirst({
    where: { nome: { equals: nome, mode: 'insensitive' } }
  });

  if (existente) return existente;

  return prisma.artista.create({
    data: { nome, criadoPor }
  });
}

async function obterOuCriarEvento(evento, artistas, criadoPor) {
  const existente = await prisma.evento.findFirst({
    where: {
      titulo: evento.titulo,
      localId: evento.localId,
      data: evento.data
    }
  });

  const registro =
    existente ||
    (await prisma.evento.create({
      data: {
        ...evento,
        criadoPor,
        status: 'aprovado'
      }
    }));

  for (const nome of artistas) {
    const artista = await obterOuCriarArtista(nome, criadoPor);

    await prisma.eventoArtista.upsert({
      where: {
        eventoId_artistaId: {
          eventoId: registro.id,
          artistaId: artista.id
        }
      },
      update: {},
      create: {
        eventoId: registro.id,
        artistaId: artista.id,
        papel: 'Atração'
      }
    });
  }

  return { criado: !existente };
}

async function main() {

  const criadoPor = await obterCriadorPadrao();

  // criar locais
  const locais = {};

  for (const chave in dados.locais) {
    locais[chave] = await obterOuCriarLocal(
      dados.locais[chave],
      criadoPor
    );
  }

  const eventos = [...dados.eventos];

  let criados = 0;
  let existentes = 0;

  for (const item of eventos) {

    const { criado } = await obterOuCriarEvento(
      {
        titulo: item.titulo,
        descricao: item.descricao,
        localId: locais[item.local].id,
        data: new Date(item.data),
        horaInicio: item.horaInicio,
        horaFim: item.horaFim
      },
      item.artistas,
      criadoPor
    );

    if (criado) criados++;
    else existentes++;
  }

  console.log(`Importação concluída: ${criados} criados, ${existentes} já existiam.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());