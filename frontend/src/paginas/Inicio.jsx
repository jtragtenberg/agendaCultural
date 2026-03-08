import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../servicos/api';

const nomesMeses = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
];

const nomesSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function chaveData(ano, mes, dia) {
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export default function Inicio({ token }) {
  const [eventos, setEventos] = useState([]);
  const [idsMinhaAgenda, setIdsMinhaAgenda] = useState(new Set());
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [referencia, setReferencia] = useState(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  });

  useEffect(() => {
    api
      .listarEventos(token)
      .then((dados) => setEventos(dados.filter((evento) => evento.status === 'aprovado')))
      .catch((e) => setErro(e.message));
  }, [token]);

  useEffect(() => {
    if (!token) {
      setIdsMinhaAgenda(new Set());
      return;
    }

    api
      .minhaAgenda(token)
      .then((dados) => {
        const ids = new Set(dados.agendaPropria.map((item) => item.evento.id));
        setIdsMinhaAgenda(ids);
      })
      .catch(() => setIdsMinhaAgenda(new Set()));
  }, [token]);

  const eventosPorDia = useMemo(() => {
    const mapa = new Map();

    eventos.forEach((evento) => {
      const chave = evento.data.slice(0, 10);
      const atual = mapa.get(chave) || [];
      atual.push(evento);
      mapa.set(chave, atual);
    });

    return mapa;
  }, [eventos]);

  async function adicionarNaAgenda(eventoId) {
    setMensagem('');
    setErro('');

    if (!token) {
      setErro('Faça login para adicionar eventos na sua agenda pessoal.');
      return;
    }

    try {
      await api.adicionarAgenda(eventoId, token);
      setIdsMinhaAgenda((anterior) => new Set([...anterior, eventoId]));
      setMensagem('Evento adicionado à sua agenda pessoal.');
    } catch (e) {
      setErro(e.message);
    }
  }

  const ano = referencia.getFullYear();
  const mes = referencia.getMonth();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();

  const celulas = [];
  for (let i = 0; i < primeiroDiaSemana; i += 1) celulas.push(null);
  for (let dia = 1; dia <= totalDias; dia += 1) celulas.push(dia);

  return (
    <main className="container">
      <h2>Agenda pública de eventos culturais</h2>
      <p>Todos os eventos públicos em um só lugar. A partir daqui você monta sua agenda pessoal.</p>
      {!token ? (
        <p>
          Para salvar eventos: <Link to="/perfil">entre na sua conta</Link>.
        </p>
      ) : null}

      <section className="calendario-agenda">
        <div className="calendario-topo">
          <button onClick={() => setReferencia(new Date(ano, mes - 1, 1))}>Mês anterior</button>
          <h3>
            {nomesMeses[mes]} de {ano}
          </h3>
          <button onClick={() => setReferencia(new Date(ano, mes + 1, 1))}>Próximo mês</button>
        </div>

        <div className="calendario-grade calendario-semana">
          {nomesSemana.map((nome) => (
            <div key={nome} className="calendario-dia-semana">
              {nome}
            </div>
          ))}
        </div>

        <div className="calendario-grade calendario-dias">
          {celulas.map((dia, indice) => {
            if (!dia) {
              return <div key={`vazio-${indice}`} className="calendario-celula calendario-celula-vazia" />;
            }

            const chave = chaveData(ano, mes, dia);
            const eventosDia = eventosPorDia.get(chave) || [];

            return (
              <div key={chave} className="calendario-celula">
                <div className="calendario-numero">{dia}</div>
                <div className="calendario-eventos-dia">
                  {eventosDia.map((evento) => (
                    <article key={evento.id} className="evento-mini">
                      <p className="evento-mini-titulo">
                        <Link to={`/evento/${evento.id}`}>{evento.titulo}</Link>
                      </p>
                      <p>
                        {evento.horaInicio} - {evento.local.nome}
                      </p>
                      {token && !idsMinhaAgenda.has(evento.id) ? (
                        <button type="button" onClick={() => adicionarNaAgenda(evento.id)}>
                          Adicionar à minha agenda
                        </button>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {mensagem ? <p className="sucesso">{mensagem}</p> : null}
      {erro ? <p className="erro">{erro}</p> : null}
    </main>
  );
}
