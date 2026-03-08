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

function dataParaChave(dataEntrada) {
  const data = new Date(dataEntrada);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

export default function BuscarEventos({ token }) {
  const [eventos, setEventos] = useState([]);
  const [idsMinhaAgenda, setIdsMinhaAgenda] = useState(new Set());
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [referencia, setReferencia] = useState(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  });
  const hojeChave = dataParaChave(new Date());

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

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return eventos;

    return eventos.filter((evento) => {
      const texto = `${evento.titulo} ${evento.descricao} ${evento.local.nome}`.toLowerCase();
      return texto.includes(termo);
    });
  }, [eventos, busca]);

  const eventosPorDia = useMemo(() => {
    const mapa = new Map();

    filtrados.forEach((evento) => {
      const chave = dataParaChave(evento.data);
      const atual = mapa.get(chave) || [];
      atual.push(evento);
      mapa.set(chave, atual);
    });

    return mapa;
  }, [filtrados]);

  async function adicionarNaAgenda(eventoId) {
    if (!token) {
      setErro('Faça login para adicionar eventos na agenda.');
      return;
    }

    try {
      await api.adicionarAgenda(eventoId, token);
      setIdsMinhaAgenda((anterior) => new Set([...anterior, eventoId]));
      setMensagem('Evento adicionado à sua agenda.');
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
      <h2>Buscar eventos</h2>
      <label>
        Pesquisa por título, descrição ou local
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: frevo, Recife Antigo" />
      </label>

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
            const ehHoje = chave === hojeChave;

            return (
              <div key={chave} className={`calendario-celula${ehHoje ? ' calendario-celula-hoje' : ''}`}>
                <div className="calendario-numero">{dia}</div>
                <div className="calendario-eventos-dia">
                  {eventosDia.map((evento) => (
                    <article
                      key={evento.id}
                      className={`evento-mini${dataParaChave(evento.data) < hojeChave ? ' evento-passado' : ''}`}
                    >
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
