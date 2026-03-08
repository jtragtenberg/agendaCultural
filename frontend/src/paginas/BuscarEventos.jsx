import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../servicos/api';

export default function BuscarEventos({ token }) {
  const [eventos, setEventos] = useState([]);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    api
      .listarEventos(token)
      .then((dados) => setEventos(dados.filter((evento) => evento.status === 'aprovado')))
      .catch((e) => setErro(e.message));
  }, [token]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return eventos;

    return eventos.filter((evento) => {
      const texto = `${evento.titulo} ${evento.descricao} ${evento.local.nome}`.toLowerCase();
      return texto.includes(termo);
    });
  }, [eventos, busca]);

  async function adicionarNaAgenda(eventoId) {
    if (!token) {
      setErro('Faça login para adicionar eventos na agenda.');
      return;
    }

    try {
      await api.adicionarAgenda(eventoId, token);
      setMensagem('Evento adicionado à sua agenda.');
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <main className="container">
      <h2>Buscar eventos</h2>
      <label>
        Pesquisa por título, descrição ou local
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: frevo, Recife Antigo" />
      </label>

      <section className="lista-eventos">
        {filtrados.map((evento) => (
          <article key={evento.id} className="card-evento">
            <h3>{evento.titulo}</h3>
            <p>{evento.descricao}</p>
            <p>
              <strong>Local:</strong> {evento.local.nome}
            </p>
            <p>
              <strong>Data:</strong> {new Date(evento.data).toLocaleDateString('pt-BR')} - {evento.horaInicio}
            </p>
            <div className="acoes-card">
              <Link to={`/evento/${evento.id}`}>Ver detalhes</Link>
              <button onClick={() => adicionarNaAgenda(evento.id)}>Adicionar à agenda</button>
            </div>
          </article>
        ))}
      </section>

      {mensagem ? <p className="sucesso">{mensagem}</p> : null}
      {erro ? <p className="erro">{erro}</p> : null}
    </main>
  );
}
