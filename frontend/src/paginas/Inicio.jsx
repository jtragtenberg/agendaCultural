import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../servicos/api';
import CalendarioAgenda from '../componentes/CalendarioAgenda';

export default function Inicio({ token }) {
  const [agenda, setAgenda] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!token) {
      setAgenda(null);
      return;
    }

    api
      .minhaAgenda(token)
      .then((dados) => setAgenda(dados))
      .catch((e) => setErro(e.message));
  }, [token]);

  if (!token) {
    return (
      <main className="container">
        <h2>Minha agenda pessoal</h2>
        <p>Faça login para visualizar e organizar seus eventos salvos em calendário.</p>
        <p>
          Acesse <Link to="/perfil">Perfil</Link> para entrar.
        </p>
      </main>
    );
  }

  return (
    <main className="container">
      <h2>Minha agenda pessoal</h2>
      <p>Visualização mensal dos eventos que você adicionou.</p>
      {agenda ? <CalendarioAgenda agenda={agenda} /> : <p>Carregando agenda...</p>}
      {erro ? <p className="erro">{erro}</p> : null}
    </main>
  );
}
