import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { api } from '../servicos/api';

export default function PaginaEvento({ token }) {
  const { id } = useParams();
  const [evento, setEvento] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [jaNaAgenda, setJaNaAgenda] = useState(false);

  useEffect(() => {
    api
      .buscarEvento(id)
      .then(setEvento)
      .catch((e) => setErro(e.message));
  }, [id]);

  useEffect(() => {
    if (!token) {
      setJaNaAgenda(false);
      return;
    }

    api
      .minhaAgenda(token)
      .then((dados) => {
        const existe = dados.agendaPropria.some((item) => item.evento.id === id);
        setJaNaAgenda(existe);
      })
      .catch(() => setJaNaAgenda(false));
  }, [id, token]);

  async function adicionarAgenda() {
    if (!token) {
      setErro('Faça login para adicionar eventos na agenda.');
      return;
    }

    if (jaNaAgenda) {
      return;
    }

    try {
      await api.adicionarAgenda(id, token);
      setMensagem('Evento adicionado à sua agenda.');
      setJaNaAgenda(true);
    } catch (e) {
      setErro(e.message);
    }
  }

  async function removerAgenda() {
    if (!token) {
      setErro('Faça login para remover eventos da agenda.');
      return;
    }

    try {
      await api.removerAgenda(id, token);
      setMensagem('Evento removido da sua agenda.');
      setJaNaAgenda(false);
    } catch (e) {
      setErro(e.message);
    }
  }

  async function denunciar() {
    if (!token) {
      setErro('Faça login para denunciar eventos.');
      return;
    }

    try {
      await api.denunciarEvento(id, motivo || 'Possível spam', token);
      setMensagem('Denúncia enviada com sucesso.');
      setMotivo('');
    } catch (e) {
      setErro(e.message);
    }
  }

  if (!evento) {
    return <main className="container">{erro ? <p className="erro">{erro}</p> : <p>Carregando...</p>}</main>;
  }

  return (
    <main className="container">
      <h2>{evento.titulo}</h2>
      <p>{evento.descricao}</p>
      <p>
        <strong>Local:</strong>{' '}
        <Link to={`/locais/${evento.local.id}`}>{evento.local.nome}</Link> - {evento.local.endereco}
      </p>
      <p>
        <strong>Data:</strong> {new Date(evento.data).toLocaleDateString('pt-BR')}
      </p>
      <p>
        <strong>Horário:</strong> {evento.horaInicio} {evento.horaFim ? `às ${evento.horaFim}` : ''}
      </p>

      <h3>Artistas</h3>
      <ul>
        {evento.eventoArtistas.map((ea) => (
          <li key={ea.artista.id}>
            <Link to={`/artistas/${ea.artista.id}`}>{ea.artista.nome}</Link>
          </li>
        ))}
      </ul>

      {jaNaAgenda ? (
        <button onClick={removerAgenda}>Remover da minha agenda</button>
      ) : (
        <button onClick={adicionarAgenda}>Adicionar à minha agenda</button>
      )}

      <section className="bloco-denuncia">
        <h3>Denunciar evento</h3>
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo da denúncia"
        />
        <button onClick={denunciar}>Enviar denúncia</button>
      </section>

      {mensagem ? <p className="sucesso">{mensagem}</p> : null}
      {erro ? <p className="erro">{erro}</p> : null}
    </main>
  );
}
