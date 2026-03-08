const express = require('express');
const prisma = require('../../prisma');

const rotas = express.Router();

function escapeIcs(texto) {
  return (texto || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function dataParaIcsUtc(data, hora) {
  const [hh, mm] = (hora || '00:00').split(':').map(Number);
  const base = new Date(data);
  base.setHours(hh, mm, 0, 0);

  const yyyy = base.getUTCFullYear();
  const MM = String(base.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(base.getUTCDate()).padStart(2, '0');
  const HH = String(base.getUTCHours()).padStart(2, '0');
  const mmUtc = String(base.getUTCMinutes()).padStart(2, '0');
  const ss = String(base.getUTCSeconds()).padStart(2, '0');

  return `${yyyy}${MM}${dd}T${HH}${mmUtc}${ss}Z`;
}

rotas.get('/:id/calendario.ics', async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.params.id } });
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    const agenda = await prisma.agendaEvento.findMany({
      where: {
        usuarioId: req.params.id,
        evento: { status: 'aprovado' }
      },
      include: {
        evento: {
          include: { local: true }
        }
      },
      orderBy: { evento: { data: 'asc' } }
    });

    const linhas = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Agenda Cultural do Recife//PT-BR',
      'CALSCALE:GREGORIAN'
    ];

    agenda.forEach(({ evento }) => {
      linhas.push('BEGIN:VEVENT');
      linhas.push(`UID:${evento.id}@agendaculturalrecife.local`);
      linhas.push(`DTSTAMP:${dataParaIcsUtc(new Date(), '00:00')}`);
      linhas.push(`DTSTART:${dataParaIcsUtc(evento.data, evento.horaInicio)}`);
      linhas.push(`DTEND:${dataParaIcsUtc(evento.data, evento.horaFim || evento.horaInicio)}`);
      linhas.push(`SUMMARY:${escapeIcs(evento.titulo)}`);
      linhas.push(`DESCRIPTION:${escapeIcs(evento.descricao)}`);
      linhas.push(`LOCATION:${escapeIcs(`${evento.local.nome} - ${evento.local.endereco}`)}`);
      linhas.push('END:VEVENT');
    });

    linhas.push('END:VCALENDAR');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="agenda-${usuario.nome}.ics"`);
    return res.send(linhas.join('\r\n'));
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao exportar calendário.' });
  }
});

module.exports = rotas;
