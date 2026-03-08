import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../servicos/api';

export default function Inicio({ token }) {
  const [eventos, setEventos] = useState([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api
      .listarEventos(token)
      .then((dados) => setEventos(dados))
      .catch((e) => setErro(e.message));
  }, [token]);

  return (
    <main className="container">
      <h2>Eventos musicais próximos</h2>
      {erro ? <p className="erro">{erro}</p> : null}

      <section className="lista-eventos">
        {eventos.map((evento) => (
          <article key={evento.id} className="card-evento">
            <h3>{evento.titulo}</h3>
            <p>{evento.descricao}</p>
            <p>
              <strong>Local:</strong> {evento.local.nome}
            </p>
            <p>
              <strong>Data:</strong> {new Date(evento.data).toLocaleDateString('pt-BR')} - {evento.horaInicio}
            </p>
            <p>
              <strong>Status:</strong> {evento.status}
            </p>
            <Link to={`/evento/${evento.id}`}>Ver detalhes</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
