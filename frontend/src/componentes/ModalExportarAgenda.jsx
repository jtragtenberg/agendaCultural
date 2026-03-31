import { useEffect, useMemo, useState } from 'react';
import { api } from '../servicos/api';

const CHAVE_ULTIMA_EXPORTACAO = 'agenda-cultural-recife:ultima-exportacao';

function dataParaIcsRecife(dataIso, hora) {
  const [hh, mm] = (hora || '00:00').split(':').map(Number);
  const d = new Date(dataIso);
  const yyyy = d.getUTCFullYear();
  const MM = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}${MM}${dd}T${String(hh).padStart(2, '0')}${String(mm).padStart(2, '0')}00`;
}

function escapeIcs(texto) {
  return (texto || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function gerarIcs(itens) {
  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Agenda Cultural do Recife//PT-BR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VTIMEZONE',
    'TZID:America/Recife',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0300',
    'TZOFFSETTO:-0300',
    'TZNAME:BRT',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  itens.forEach(({ evento }) => {
    linhas.push('BEGIN:VEVENT');
    linhas.push(`UID:${evento.id}@agendaculturalrecife.local`);
    linhas.push(`DTSTAMP:${dataParaIcsRecife(new Date().toISOString(), '00:00')}`);
    linhas.push(`DTSTART;TZID=America/Recife:${dataParaIcsRecife(evento.data, evento.horaInicio)}`);
    linhas.push(`DTEND;TZID=America/Recife:${dataParaIcsRecife(evento.data, evento.horaFim || evento.horaInicio)}`);
    linhas.push(`SUMMARY:${escapeIcs(evento.titulo)}`);
    linhas.push(`DESCRIPTION:${escapeIcs(evento.descricao)}`);
    linhas.push(`LOCATION:${escapeIcs(`${evento.local.nome} - ${evento.local.endereco}`)}`);
    linhas.push('END:VEVENT');
  });

  linhas.push('END:VCALENDAR');
  return linhas.join('\r\n');
}

export default function ModalExportarAgenda({ token, onFechar }) {
  const [itens, setItens] = useState(null);
  const [selecionados, setSelecionados] = useState(new Set());
  const [erro, setErro] = useState('');

  const ultimaExportacao = useMemo(
    () => localStorage.getItem(CHAVE_ULTIMA_EXPORTACAO) || null,
    []
  );

  useEffect(() => {
    if (!token) return;
    api.minhaAgenda(token)
      .then((dados) => {
        const hoje = new Date();
        hoje.setUTCHours(0, 0, 0, 0);

        const futuros = dados.agendaPropria
          .filter((item) => new Date(item.evento.data) >= hoje)
          .sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));

        setItens(futuros);

        // seleção padrão: eventos adicionados após a última exportação (ou todos se nunca exportou)
        const padrao = new Set(
          futuros
            .filter((item) => !ultimaExportacao || new Date(item.criadoEm) > new Date(ultimaExportacao))
            .map((item) => item.id)
        );
        setSelecionados(padrao.size > 0 ? padrao : new Set(futuros.map((i) => i.id)));
      })
      .catch((e) => setErro(e.message));
  }, [token, ultimaExportacao]);

  function toggleItem(id) {
    setSelecionados((ant) => {
      const novo = new Set(ant);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  }

  function marcarTodos() {
    setSelecionados(new Set(itens.map((i) => i.id)));
  }

  function desmarcarTodos() {
    setSelecionados(new Set());
  }

  function exportar() {
    const escolhidos = itens.filter((i) => selecionados.has(i.id));
    if (escolhidos.length === 0) return;

    const ics = gerarIcs(escolhidos);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'agenda-cultural-recife.ics';
    link.click();
    window.URL.revokeObjectURL(url);

    localStorage.setItem(CHAVE_ULTIMA_EXPORTACAO, new Date().toISOString());
    onFechar();
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onFechar();
  }

  const dataFormatada = (iso) =>
    new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Recife', day: '2-digit', month: '2-digit', year: 'numeric' });

  const ultimaStr = ultimaExportacao
    ? new Date(ultimaExportacao).toLocaleString('pt-BR', { timeZone: 'America/Recife' })
    : null;

  return (
    <div className="modal-overlay" onClick={handleBackdrop}>
      <div className="modal-conteudo">
        <div className="modal-topo">
          <h2>Exportar agenda</h2>
          <button className="btn-fechar-modal" onClick={onFechar}>✕</button>
        </div>

        <p style={{ fontSize: '0.82rem', background: 'rgba(75,75,242,0.07)', border: '1px solid rgba(75,75,242,0.18)', borderRadius: 8, padding: '0.55rem 0.75rem', margin: '0 0 0.75rem', color: 'var(--texto)' }}>
          Apenas eventos da sua <strong>agenda pessoal</strong> são exportados. Para incluir um evento aqui, adicione-o à sua agenda pessoal no calendário e volte a exportar.
        </p>

        {ultimaStr ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--texto-fraco)', margin: '0 0 0.75rem' }}>
            Última exportação: {ultimaStr}. Novos eventos pré-selecionados.
          </p>
        ) : (
          <p style={{ fontSize: '0.8rem', color: 'var(--texto-fraco)', margin: '0 0 0.75rem' }}>
            Nenhuma exportação anterior. Todos os eventos futuros pré-selecionados.
          </p>
        )}

        {erro ? <p className="erro">{erro}</p> : null}

        {itens === null ? (
          <p>Carregando...</p>
        ) : itens.length === 0 ? (
          <p style={{ color: 'var(--texto-fraco)' }}>Nenhum evento futuro na sua agenda.</p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button type="button" onClick={marcarTodos}>Marcar todos</button>
              <button type="button" onClick={desmarcarTodos}>Desmarcar todos</button>
            </div>

            <ul className="lista-exportar">
              {itens.map((item) => {
                const novo = ultimaExportacao && new Date(item.criadoEm) > new Date(ultimaExportacao);
                return (
                  <li key={item.id} className="item-exportar">
                    <label>
                      <input
                        type="checkbox"
                        checked={selecionados.has(item.id)}
                        onChange={() => toggleItem(item.id)}
                        style={{ width: 'auto', padding: 0, border: 'none' }}
                      />
                      <span className="item-exportar-info">
                        <strong>{item.evento.titulo}</strong>
                        {novo ? <span className="badge-novo">novo</span> : null}
                        <span style={{ color: 'var(--texto-fraco)', fontSize: '0.78rem' }}>
                          {dataFormatada(item.evento.data)} · {item.evento.horaInicio} · {item.evento.local.nome}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--texto-fraco)' }}>
                {selecionados.size} de {itens.length} selecionados
              </span>
              <button onClick={exportar} disabled={selecionados.size === 0}>
                Exportar .ics
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
