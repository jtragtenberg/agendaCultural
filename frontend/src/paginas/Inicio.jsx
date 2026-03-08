import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../servicos/api';

function ordenarPorData(items) {
  return [...items].sort((a, b) => new Date(a.evento.data) - new Date(b.evento.data));
}

export default function Inicio({ token }) {
  const [agenda, setAgenda] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!token) return;

    Promise.all([api.minhaAgenda(token), api.listarEventos(token), api.listarUsuarios('', token)])
      .then(([dadosAgenda, dadosEventos, dadosUsuarios]) => {
        setAgenda(dadosAgenda);
        setEventos(dadosEventos.filter((evento) => evento.status === 'aprovado'));
        setUsuarios(dadosUsuarios);
      })
      .catch((e) => setErro(e.message));
  }, [token]);

  const proximosDaAgenda = useMemo(() => {
    if (!agenda) return [];
    return ordenarPorData([...agenda.agendaPropria, ...agenda.agendaSeguindo]).slice(0, 6);
  }, [agenda]);

  const eventosDestaque = useMemo(() => eventos.slice(0, 6), [eventos]);
  const sugestoesAmigos = useMemo(() => usuarios.slice(0, 6), [usuarios]);

  if (!token) {
    return (
      <main className="container">
        <h2>Agenda Cultural do Recife</h2>
        <p>Faça login para ver sua agenda pessoal como tela inicial.</p>
        <p>
          Acesse <Link to="/perfil">Perfil</Link> para entrar.
        </p>
      </main>
    );
  }

  return (
    <main className="container">
      <h2>Minha Agenda Cultural</h2>
      <p>Painel pessoal com sua agenda, eventos da cidade e pessoas para seguir.</p>

      <section className="painel-janelas">
        <article className="janela-mini">
          <div className="janela-mini-topo">
            <h3>Minha agenda</h3>
            <Link to="/perfil">Abrir agenda completa</Link>
          </div>
          <ul>
            {proximosDaAgenda.length === 0 ? (
              <li>Nenhum evento salvo ainda.</li>
            ) : (
              proximosDaAgenda.map((item) => (
                <li key={item.id}>
                  <Link to={`/evento/${item.evento.id}`}>
                    {item.evento.titulo} - {new Date(item.evento.data).toLocaleDateString('pt-BR')} ({item.evento.horaInicio})
                  </Link>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="janela-mini">
          <div className="janela-mini-topo">
            <h3>Buscar eventos</h3>
            <Link to="/buscar-eventos">Ir para busca</Link>
          </div>
          <ul>
            {eventosDestaque.map((evento) => (
              <li key={evento.id}>
                <Link to={`/evento/${evento.id}`}>
                  {evento.titulo} - {new Date(evento.data).toLocaleDateString('pt-BR')} ({evento.local.nome})
                </Link>
              </li>
            ))}
          </ul>
        </article>

        <article className="janela-mini">
          <div className="janela-mini-topo">
            <h3>Buscar amigos</h3>
            <Link to="/buscar-amigos">Encontrar pessoas</Link>
          </div>
          <ul>
            {sugestoesAmigos.map((usuario) => (
              <li key={usuario.id}>
                {usuario.nome} {usuario.verificado ? '(verificado)' : ''}
              </li>
            ))}
          </ul>
        </article>
      </section>

      {erro ? <p className="erro">{erro}</p> : null}
    </main>
  );
}
