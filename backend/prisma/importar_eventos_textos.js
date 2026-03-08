const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function obterCriadorPadrao() {
  const moderador = await prisma.usuario.findUnique({ where: { email: 'moderador@agenda.recife' } });
  if (moderador) return moderador.id;

  const primeiro = await prisma.usuario.findFirst({ orderBy: { criadoEm: 'asc' } });
  if (!primeiro) {
    throw new Error('Nenhum usuário encontrado para ser autor dos eventos.');
  }
  return primeiro.id;
}

async function obterOuCriarLocal({ nome, endereco, bairro, cidade }) {
  const existente = await prisma.local.findFirst({
    where: {
      nome: { equals: nome, mode: 'insensitive' },
      endereco: { equals: endereco, mode: 'insensitive' }
    }
  });

  if (existente) return existente;

  const criadoPor = await obterCriadorPadrao();
  return prisma.local.create({
    data: {
      nome,
      endereco,
      bairro,
      cidade,
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

async function obterOuCriarEvento(dadosEvento, nomesArtistas, criadoPor) {
  const existente = await prisma.evento.findFirst({
    where: {
      titulo: dadosEvento.titulo,
      localId: dadosEvento.localId,
      data: dadosEvento.data
    }
  });

  const evento =
    existente ||
    (await prisma.evento.create({
      data: {
        ...dadosEvento,
        criadoPor,
        status: 'aprovado'
      }
    }));

  for (const nomeArtista of nomesArtistas) {
    const artista = await obterOuCriarArtista(nomeArtista, criadoPor);
    await prisma.eventoArtista.upsert({
      where: {
        eventoId_artistaId: {
          eventoId: evento.id,
          artistaId: artista.id
        }
      },
      update: {},
      create: {
        eventoId: evento.id,
        artistaId: artista.id,
        papel: 'Atração'
      }
    });
  }

  return { evento, criado: !existente };
}

async function main() {
  const criadoPor = await obterCriadorPadrao();

  const locais = {
    teatroDoParque: await obterOuCriarLocal({
      nome: 'Teatro do Parque',
      endereco: 'R. do Hospício, 81',
      bairro: 'Boa Vista',
      cidade: 'Recife'
    }),
    pacoDoFrevo: await obterOuCriarLocal({
      nome: 'Paço do Frevo',
      endereco: 'Praça do Arsenal da Marinha, s/n',
      bairro: 'Recife Antigo',
      cidade: 'Recife'
    }),
    caixaCultural: await obterOuCriarLocal({
      nome: 'CAIXA Cultural Recife',
      endereco: 'Av. Alfredo Lisboa, 505',
      bairro: 'Recife Antigo',
      cidade: 'Recife'
    }),
    casaLontra: await obterOuCriarLocal({
      nome: 'Casa Lontra',
      endereco: 'Recife (endereço a confirmar)',
      bairro: 'Recife',
      cidade: 'Recife'
    }),
    casaEstacao: await obterOuCriarLocal({
      nome: 'Casa Estação da Luz',
      endereco: 'Rua Prudente de Morais, 313',
      bairro: 'Carmo',
      cidade: 'Olinda'
    })
  };

  const eventos = [
    {
      titulo: 'II Recife Frevo Festival - Edição Teatro do Parque',
      descricao:
        'Festival gratuito celebrando o frevo como linguagem viva. Ingressos distribuídos na bilheteria a partir das 18h.',
      localId: locais.teatroDoParque.id,
      data: new Date('2026-03-12T00:00:00.000Z'),
      horaInicio: '19:00',
      horaFim: '22:00',
      artistas: ['II Recife Frevo Festival']
    },
    {
      titulo: 'Hora do Frevo com Lígia Fernandes Trio',
      descricao: 'Programação especial do Recife Frevo Festival no Paço do Frevo.',
      localId: locais.pacoDoFrevo.id,
      data: new Date('2026-03-13T00:00:00.000Z'),
      horaInicio: '12:00',
      horaFim: '13:30',
      artistas: ['Lígia Fernandes Trio']
    },
    {
      titulo: 'II Recife Frevo Festival - Edição Paço do Frevo',
      descricao:
        'Programação pedagógica do festival com performance "Olindina" e roda de diálogo "O Frevo é delas".',
      localId: locais.pacoDoFrevo.id,
      data: new Date('2026-03-14T00:00:00.000Z'),
      horaInicio: '16:30',
      horaFim: '19:00',
      artistas: ['Rebeca Gondim']
    },
    {
      titulo: 'Cabaré Boka da Luz - A Vida é um Cabaré',
      descricao:
        'Edição especial de produção independente com performances drag, burlesco e palco aberto. Ingressos via Sympla.',
      localId: locais.casaLontra.id,
      data: new Date('2026-03-28T00:00:00.000Z'),
      horaInicio: '21:00',
      horaFim: '23:59',
      artistas: ['Gracia Luz', 'Kali Aboka', 'Kali Saxa', 'Mei Jinlian']
    },
    {
      titulo: 'Martins - Lançamento de "Ao Vivo na Casa Estação da Luz"',
      descricao:
        'Show especial de lançamento do álbum com repertório autoral e releituras da música brasileira.',
      localId: locais.casaEstacao.id,
      data: new Date('2026-03-28T00:00:00.000Z'),
      horaInicio: '19:00',
      horaFim: '22:00',
      artistas: ['Martins']
    },
    {
      titulo: 'Xangai - 50 Anos de Cantoria com Vida',
      descricao:
        'Espetáculo comemorativo dos 50 anos de trajetória de Xangai com poesia, memória e música popular brasileira.',
      localId: locais.teatroDoParque.id,
      data: new Date('2026-04-18T00:00:00.000Z'),
      horaInicio: '20:00',
      horaFim: '22:00',
      artistas: ['Xangai']
    }
  ];

  const datasReverbo = [5, 6, 7, 12, 13, 14, 19, 20, 21];
  for (const dia of datasReverbo) {
    eventos.push({
      titulo: `Ocupação Reverbo - Outros Abraços (${String(dia).padStart(2, '0')}/03)`,
      descricao:
        'Temporada com cantautores pernambucanos. Curadoria de Juliano Holanda e Mery Lemos. Sessões com intérprete de Libras aos sábados.',
      localId: locais.caixaCultural.id,
      data: new Date(`2026-03-${String(dia).padStart(2, '0')}T00:00:00.000Z`),
      horaInicio: '20:00',
      horaFim: '22:00',
      artistas: ['Juliano Holanda', 'Mery Lemos']
    });
  }

  let criados = 0;
  let existentes = 0;

  for (const item of eventos) {
    const { criado } = await obterOuCriarEvento(
      {
        titulo: item.titulo,
        descricao: item.descricao,
        localId: item.localId,
        data: item.data,
        horaInicio: item.horaInicio,
        horaFim: item.horaFim
      },
      item.artistas,
      criadoPor
    );

    if (criado) criados += 1;
    else existentes += 1;
  }

  console.log(`Importação concluída: ${criados} eventos criados, ${existentes} já existentes.`);
  console.log('Observação: eventos sem data/hora explícita no texto não foram importados (ex.: Seu Pereira e Coletivo 401).');
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
