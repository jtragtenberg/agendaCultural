import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../servicos/api';
import ModalCriarEvento from '../componentes/ModalCriarEvento';

const CORES = {
  recife: '#E1306C',
  minha: '#4b4bf2',
};

const nomesMeses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const nomesSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function chaveData(ano, mes, dia) {
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function dataParaChave(dataEntrada) {
  const d = new Date(dataEntrada);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export default function Home({ token }) {
  const [eventos, setEventos] = useState([]);
  const [agenda, setAgenda] = useState(null);
  const [busca, setBusca] = useState('');
  const [calendarios, setCalendarios] = useState({ recife: true, minha: true });
  const [referencia, setReferencia] = useState(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  });
  const [modalData, setModalData] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const hojeChave = dataParaChave(new Date());

  useEffect(() => {
    api.listarEventos(token)
      .then((dados) => setEventos(dados.filter((e) => e.status === 'aprovado')))
      .catch((e) => setErro(e.message));
  }, [token]);

  useEffect(() => {
    if (!token) { setAgenda(null); return; }
    api.minhaAgenda(token).then(setAgenda).catch(() => setAgenda(null));
  }, [token]);

  const idsMinhaAgenda = useMemo(() => {
    if (!agenda) return new Set();
    return new Set(agenda.agendaPropria.map((item) => item.evento.id));
  }, [agenda]);

  const eventosPorDia = useMemo(() => {
    const mapa = new Map();
    const termo = busca.trim().toLowerCase();

    function matches(titulo, descricao, localNome) {
      if (!termo) return true;
      return `${titulo} ${descricao || ''} ${localNome || ''}`.toLowerCase().includes(termo);
    }

    const adicionados = new Set();

    if (calendarios.minha && agenda) {
      agenda.agendaPropria.forEach((item) => {
        const ev = item.evento;
        if (!matches(ev.titulo, ev.descricao, ev.local?.nome)) return;
        const chave = dataParaChave(ev.data);
        if (!mapa.has(chave)) mapa.set(chave, []);
        mapa.get(chave).push({
          id: `minha-${item.id}`,
          eventoId: ev.id,
          titulo: ev.titulo,
          horaInicio: ev.horaInicio,
          local: ev.local?.nome || '',
          origem: 'minha',
        });
        adicionados.add(ev.id);
      });
    }

    if (calendarios.recife) {
      eventos.forEach((ev) => {
        if (adicionados.has(ev.id)) return;
        if (!matches(ev.titulo, ev.descricao, ev.local?.nome)) return;
        const chave = dataParaChave(ev.data);
        if (!mapa.has(chave)) mapa.set(chave, []);
        mapa.get(chave).push({
          id: `recife-${ev.id}`,
          eventoId: ev.id,
          titulo: ev.titulo,
          horaInicio: ev.horaInicio,
          local: ev.local?.nome || '',
          origem: 'recife',
        });
      });
    }

    return mapa;
  }, [eventos, agenda, busca, calendarios]);

  async function adicionarNaAgenda(eventoId) {
    if (!token) { setErro('Faça login para adicionar à agenda.'); return; }
    try {
      await api.adicionarAgenda(eventoId, token);
      const dados = await api.minhaAgenda(token);
      setAgenda(dados);
      setMensagem('Evento adicionado à sua agenda.');
    } catch (e) {
      setErro(e.message);
    }
  }

  async function onEventoCriado() {
    setModalData(null);
    setMensagem('Evento criado. Ficará visível após aprovação.');
    const dados = await api.listarEventos(token);
    setEventos(dados.filter((e) => e.status === 'aprovado'));
  }

  const ano = referencia.getFullYear();
  const mes = referencia.getMonth();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();

  const celulas = [];
  for (let i = 0; i < primeiroDiaSemana; i += 1) celulas.push(null);
  for (let dia = 1; dia <= totalDias; dia += 1) celulas.push(dia);

  return (
    <div className="home-layout">
      <aside className="home-sidebar">
        <div className="sidebar-secao">
          <p className="sidebar-titulo">Buscar</p>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Título, local..."
          />
        </div>

        <div className="sidebar-secao">
          <p className="sidebar-titulo">Calendários</p>

          <label className="camada-toggle">
            <input
              type="checkbox"
              checked={calendarios.recife}
              onChange={(e) => setCalendarios((c) => ({ ...c, recife: e.target.checked }))}
            />
            <span className="camada-cor" style={{ background: CORES.recife }} />
            <span>Agenda Recife</span>
          </label>

          {token ? (
            <label className="camada-toggle">
              <input
                type="checkbox"
                checked={calendarios.minha}
                onChange={(e) => setCalendarios((c) => ({ ...c, minha: e.target.checked }))}
              />
              <span className="camada-cor" style={{ background: CORES.minha }} />
              <span>Minha Agenda</span>
            </label>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--texto-fraco)', marginTop: '0.4rem' }}>
              <Link to="/perfil">Entre</Link> para ver sua agenda pessoal.
            </p>
          )}
        </div>
      </aside>

      <section className="home-calendario">
        <div className="calendario-topo">
          <button onClick={() => setReferencia(new Date(ano, mes - 1, 1))}>← Anterior</button>
          <h3>{nomesMeses[mes]} de {ano}</h3>
          <button onClick={() => setReferencia(new Date(ano, mes + 1, 1))}>Próximo →</button>
        </div>

        <div className="calendario-grade calendario-semana">
          {nomesSemana.map((nome) => (
            <div key={nome} className="calendario-dia-semana">{nome}</div>
          ))}
        </div>

        <div className="calendario-grade calendario-dias">
          {celulas.map((dia, indice) => {
            if (!dia) {
              return <div key={`vazio-${indice}`} className="calendario-celula calendario-celula-vazia" />;
            }

            const chave = chaveData(ano, mes, dia);
            const eventosDia = eventosPorDia.get(chave) || [];
            const ehHoje = chave === hojeChave;

            return (
              <div key={chave} className={`calendario-celula${ehHoje ? ' calendario-celula-hoje' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="calendario-numero">{dia}</span>
                  {token ? (
                    <button
                      className="btn-criar-dia"
                      onClick={() => setModalData(chave)}
                      title="Criar evento"
                    >
                      +
                    </button>
                  ) : null}
                </div>

                <div className="calendario-eventos-dia">
                  {eventosDia.map((evento) => (
                    <article
                      key={evento.id}
                      className={`evento-mini${chave < hojeChave ? ' evento-passado' : ''}`}
                      style={{ borderLeft: `3px solid ${CORES[evento.origem]}` }}
                    >
                      <p className="evento-mini-titulo">
                        <Link to={`/evento/${evento.eventoId}`}>{evento.titulo}</Link>
                      </p>
                      <p>{evento.horaInicio}{evento.local ? ` · ${evento.local}` : ''}</p>
                      {token && evento.origem === 'recife' && !idsMinhaAgenda.has(evento.eventoId) ? (
                        <button type="button" className="btn-salvar-agenda" onClick={() => adicionarNaAgenda(evento.eventoId)}>
                          + minha agenda
                        </button>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {mensagem ? <p className="sucesso" style={{ marginTop: '1rem' }}>{mensagem}</p> : null}
        {erro ? <p className="erro" style={{ marginTop: '1rem' }}>{erro}</p> : null}
      </section>

      {modalData ? (
        <ModalCriarEvento
          dataPre={modalData}
          token={token}
          onFechar={() => setModalData(null)}
          onEventoCriado={onEventoCriado}
        />
      ) : null}
    </div>
  );
}
