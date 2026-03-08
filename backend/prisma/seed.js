const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.denunciaEvento.deleteMany();
  await prisma.agendaEvento.deleteMany();
  await prisma.eventoArtista.deleteMany();
  await prisma.evento.deleteMany();
  await prisma.seguidor.deleteMany();
  await prisma.artista.deleteMany();
  await prisma.local.deleteMany();
  await prisma.usuario.deleteMany();

  const senhaHash = await bcrypt.hash('123456', 10);

  const moderador = await prisma.usuario.create({
    data: {
      nome: 'Curadoria Recife',
      email: 'moderador@agenda.recife',
      senhaHash,
      bio: 'Perfil oficial de moderação da Agenda Cultural do Recife.',
      reputacao: 300,
      verificado: true
    }
  });

  const usuario1 = await prisma.usuario.create({
    data: {
      nome: 'Ana do Recife',
      email: 'ana@agenda.recife',
      senhaHash,
      bio: 'Apaixonada por música pernambucana.',
      reputacao: 120,
      verificado: true
    }
  });

  const usuario2 = await prisma.usuario.create({
    data: {
      nome: 'João da Boa Vista',
      email: 'joao@agenda.recife',
      senhaHash,
      bio: 'Sempre em busca de shows independentes.',
      reputacao: 20
    }
  });

  const locais = await prisma.$transaction([
    prisma.local.create({
      data: {
        nome: 'Marco Zero',
        endereco: 'Praça Rio Branco, Recife Antigo',
        bairro: 'Recife Antigo',
        cidade: 'Recife',
        latitude: -8.0631,
        longitude: -34.8711,
        criadoPor: moderador.id
      }
    }),
    prisma.local.create({
      data: {
        nome: 'Rua da Moeda',
        endereco: 'Rua da Moeda, Recife Antigo',
        bairro: 'Recife Antigo',
        cidade: 'Recife',
        latitude: -8.0625,
        longitude: -34.872,
        criadoPor: moderador.id
      }
    }),
    prisma.local.create({
      data: {
        nome: 'Parque Dona Lindu',
        endereco: 'Av. Boa Viagem, s/n',
        bairro: 'Boa Viagem',
        cidade: 'Recife',
        latitude: -8.133,
        longitude: -34.9005,
        criadoPor: moderador.id
      }
    })
  ]);

  const artistas = await prisma.$transaction([
    prisma.artista.create({
      data: {
        nome: 'Orquestra de Frevo do Recife',
        descricao: 'Frevo instrumental e releituras de clássicos do carnaval.',
        instagram: '@orquestradefrevo',
        criadoPor: moderador.id
      }
    }),
    prisma.artista.create({
      data: {
        nome: 'Banda Mangue Beat Sessions',
        descricao: 'Projeto de música autoral com influências de maracatu e rock.',
        instagram: '@manguebeatsessions',
        criadoPor: moderador.id
      }
    }),
    prisma.artista.create({
      data: {
        nome: 'DJ Recife Noturno',
        descricao: 'Sets de brasilidades, funk e música eletrônica.',
        instagram: '@drecifenoturno',
        criadoPor: moderador.id
      }
    })
  ]);

  const evento1 = await prisma.evento.create({
    data: {
      titulo: 'Noite de Frevo no Marco Zero',
      descricao: 'Apresentação aberta com clássicos do frevo pernambucano.',
      localId: locais[0].id,
      data: new Date('2026-03-20T00:00:00.000Z'),
      horaInicio: '19:00',
      horaFim: '21:00',
      criadoPor: usuario1.id,
      status: 'aprovado'
    }
  });

  const evento2 = await prisma.evento.create({
    data: {
      titulo: 'Som do Mangue na Rua da Moeda',
      descricao: 'Show colaborativo com artistas da cena independente do Recife.',
      localId: locais[1].id,
      data: new Date('2026-03-22T00:00:00.000Z'),
      horaInicio: '20:00',
      horaFim: '23:00',
      criadoPor: moderador.id,
      status: 'aprovado'
    }
  });

  const evento3 = await prisma.evento.create({
    data: {
      titulo: 'Sunset Musical em Boa Viagem',
      descricao: 'Encontro musical ao ar livre com DJs e atrações locais.',
      localId: locais[2].id,
      data: new Date('2026-03-25T00:00:00.000Z'),
      horaInicio: '17:30',
      horaFim: '20:30',
      criadoPor: usuario2.id,
      status: 'pendente'
    }
  });

  await prisma.eventoArtista.createMany({
    data: [
      { eventoId: evento1.id, artistaId: artistas[0].id, papel: 'Atração principal' },
      { eventoId: evento2.id, artistaId: artistas[1].id, papel: 'Banda principal' },
      { eventoId: evento2.id, artistaId: artistas[2].id, papel: 'DJ convidado' },
      { eventoId: evento3.id, artistaId: artistas[2].id, papel: 'DJ principal' }
    ]
  });

  await prisma.agendaEvento.createMany({
    data: [
      { usuarioId: usuario1.id, eventoId: evento1.id },
      { usuarioId: usuario1.id, eventoId: evento2.id },
      { usuarioId: usuario2.id, eventoId: evento2.id }
    ]
  });

  await prisma.seguidor.create({
    data: {
      seguidorId: usuario2.id,
      seguindoId: usuario1.id
    }
  });

  console.log('Seed concluído com sucesso.');
  console.log('Usuários de teste:');
  console.log('moderador@agenda.recife / 123456');
  console.log('ana@agenda.recife / 123456');
  console.log('joao@agenda.recife / 123456');
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
