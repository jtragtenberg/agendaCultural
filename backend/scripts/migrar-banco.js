#!/usr/bin/env node
/**
 * migrar-banco.js
 *
 * Protocolo seguro de reinicialização do banco:
 *  1. Exporta todos os dados para backup/snapshot-<timestamp>.json
 *  2. Reseta o banco com o schema atual (prisma db push --force-reset)
 *  3. Reimporta tudo na ordem correta, preenchendo novos campos com defaults
 *
 * Uso:
 *   node scripts/migrar-banco.js            → exporta + reseta + reimporta
 *   node scripts/migrar-banco.js --so-exportar  → só salva o backup
 *   node scripts/migrar-banco.js --so-importar <arquivo.json>  → só reimporta
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BACKUP_DIR = path.join(__dirname, '..', 'backup');

// ── Helpers ─────────────────────────────────────────────────────────────────

function log(msg) { console.log(`\n[migrar-banco] ${msg}`); }

function arquivoBackup() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return path.join(BACKUP_DIR, `snapshot-${ts}.json`);
}

// ── 1. EXPORTAR ──────────────────────────────────────────────────────────────

async function exportar(destino) {
  log('Exportando dados...');

  const [
    usuarios,
    locais,
    artistas,
    eventos,
    eventoArtistas,
    agendaEventos,
    seguidores,
    denuncias,
  ] = await Promise.all([
    prisma.usuario.findMany(),
    prisma.local.findMany(),
    prisma.artista.findMany(),
    prisma.evento.findMany(),
    prisma.eventoArtista.findMany(),
    prisma.agendaEvento.findMany(),
    prisma.seguidor.findMany(),
    prisma.denunciaEvento.findMany(),
  ]);

  const snapshot = {
    exportadoEm: new Date().toISOString(),
    totais: {
      usuarios: usuarios.length,
      locais: locais.length,
      artistas: artistas.length,
      eventos: eventos.length,
      eventoArtistas: eventoArtistas.length,
      agendaEventos: agendaEventos.length,
      seguidores: seguidores.length,
      denuncias: denuncias.length,
    },
    usuarios,
    locais,
    artistas,
    eventos,
    eventoArtistas,
    agendaEventos,
    seguidores,
    denuncias,
  };

  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.writeFileSync(destino, JSON.stringify(snapshot, null, 2), 'utf8');

  log(`Backup salvo em: ${destino}`);
  console.log('  Totais:', snapshot.totais);
  return snapshot;
}

// ── 2. RESETAR SCHEMA ────────────────────────────────────────────────────────

function resetarSchema() {
  log('Resetando banco e aplicando schema atual...');
  const cwd = path.join(__dirname, '..');
  execSync('npx prisma db push --force-reset --accept-data-loss', { cwd, stdio: 'inherit' });
  log('Schema aplicado.');
}

// ── 3. REIMPORTAR ────────────────────────────────────────────────────────────

async function reimportar(snapshot) {
  log('Reimportando dados...');

  // Defaults para campos novos que podem não existir no snapshot antigo
  function normalLocal(l) {
    return {
      id: l.id,
      nome: l.nome,
      endereco: l.endereco,
      bairro: l.bairro,
      cidade: l.cidade,
      latitude: l.latitude != null ? l.latitude : null,
      longitude: l.longitude != null ? l.longitude : null,
      fotoUrl: l.fotoUrl || null,
      criadoPor: l.criadoPor,
      donoPaginaId: l.donoPaginaId || null,
      criadoEm: new Date(l.criadoEm),
    };
  }

  function normalArtista(a) {
    return {
      id: a.id,
      nome: a.nome,
      descricao: a.descricao || null,
      instagram: a.instagram || null,
      website: a.website || null,
      fotoUrl: a.fotoUrl || null,
      criadoPor: a.criadoPor,
      donoPaginaId: a.donoPaginaId || null,
      criadoEm: new Date(a.criadoEm),
    };
  }

  function normalEvento(e) {
    return {
      id: e.id,
      titulo: e.titulo,
      descricao: e.descricao,
      localId: e.localId,
      data: new Date(e.data),
      horaInicio: e.horaInicio,
      horaFim: e.horaFim || null,
      criadoPor: e.criadoPor,
      moderadoPor: e.moderadoPor || null,
      moderadoEm: e.moderadoEm ? new Date(e.moderadoEm) : null,
      status: e.status || 'pendente',
      criadoEm: new Date(e.criadoEm),
    };
  }

  // Inserção em lotes para não estourar conexões
  async function inserirLote(model, dados, tamanho = 50) {
    for (let i = 0; i < dados.length; i += tamanho) {
      const lote = dados.slice(i, i + tamanho);
      await Promise.all(lote.map((d) => model.create({ data: d })));
    }
  }

  // 1. Usuários — senhaHash já está hashada, inserir direto
  log('  → Usuários...');
  await inserirLote(prisma.usuario, snapshot.usuarios.map((u) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    senhaHash: u.senhaHash,
    bio: u.bio || null,
    avatarUrl: u.avatarUrl || null,
    reputacao: u.reputacao ?? 0,
    verificado: u.verificado ?? false,
    funcao: u.funcao || 'usuario',
    criadoEm: new Date(u.criadoEm),
  })));

  // 2. Locais
  log('  → Locais...');
  // Primeiro sem donoPaginaId (pode referenciar usuários que ainda não foram processados em relação a FKs)
  await inserirLote(prisma.local, snapshot.locais.map((l) => ({ ...normalLocal(l), donoPaginaId: null })));

  // 3. Artistas
  log('  → Artistas...');
  await inserirLote(prisma.artista, snapshot.artistas.map((a) => ({ ...normalArtista(a), donoPaginaId: null })));

  // 4. Eventos
  log('  → Eventos...');
  await inserirLote(prisma.evento, snapshot.eventos.map(normalEvento));

  // 5. Relações (sem FKs circulares)
  log('  → EventoArtistas...');
  await inserirLote(prisma.eventoArtista, snapshot.eventoArtistas.map((ea) => ({
    eventoId: ea.eventoId,
    artistaId: ea.artistaId,
    papel: ea.papel || null,
  })));

  log('  → AgendaEventos...');
  await inserirLote(prisma.agendaEvento, snapshot.agendaEventos.map((ae) => ({
    id: ae.id,
    usuarioId: ae.usuarioId,
    eventoId: ae.eventoId,
    criadoEm: new Date(ae.criadoEm),
  })));

  log('  → Seguidores...');
  await inserirLote(prisma.seguidor, snapshot.seguidores.map((s) => ({
    seguidorId: s.seguidorId,
    seguindoId: s.seguindoId,
    criadoEm: new Date(s.criadoEm),
  })));

  log('  → Denúncias...');
  await inserirLote(prisma.denunciaEvento, snapshot.denuncias.map((d) => ({
    id: d.id,
    eventoId: d.eventoId,
    denunciadoPor: d.denunciadoPor,
    motivo: d.motivo,
    criadoEm: new Date(d.criadoEm),
  })));

  // 6. Agora aplica donoPaginaId onde existia
  const locaisComDono = snapshot.locais.filter((l) => l.donoPaginaId);
  if (locaisComDono.length > 0) {
    log('  → Restaurando donos de locais...');
    await Promise.all(locaisComDono.map((l) =>
      prisma.local.update({ where: { id: l.id }, data: { donoPaginaId: l.donoPaginaId } })
    ));
  }

  const artistasComDono = snapshot.artistas.filter((a) => a.donoPaginaId);
  if (artistasComDono.length > 0) {
    log('  → Restaurando donos de artistas...');
    await Promise.all(artistasComDono.map((a) =>
      prisma.artista.update({ where: { id: a.id }, data: { donoPaginaId: a.donoPaginaId } })
    ));
  }

  log('Reimportação concluída.');
  console.log('  Totais reinseridos:', {
    usuarios: snapshot.usuarios.length,
    locais: snapshot.locais.length,
    artistas: snapshot.artistas.length,
    eventos: snapshot.eventos.length,
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  try {
    if (args.includes('--so-exportar')) {
      const dest = arquivoBackup();
      await exportar(dest);
      return;
    }

    if (args.includes('--so-importar')) {
      const arquivo = args[args.indexOf('--so-importar') + 1];
      if (!arquivo || !fs.existsSync(arquivo)) {
        console.error('Informe o caminho do arquivo: --so-importar <arquivo.json>');
        process.exit(1);
      }
      const snapshot = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
      await reimportar(snapshot);
      return;
    }

    // Fluxo completo
    const dest = arquivoBackup();
    const snapshot = await exportar(dest);
    resetarSchema();
    await reimportar(snapshot);

    log('✅ Migração concluída com sucesso!');
    log(`   Backup em: ${dest}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('\n[migrar-banco] ERRO:', e.message);
  prisma.$disconnect();
  process.exit(1);
});
