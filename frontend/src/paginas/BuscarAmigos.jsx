import { useEffect, useState } from 'react';
import { api } from '../servicos/api';

export default function BuscarAmigos({ token }) {
  const [busca, setBusca] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [seguindo, setSeguindo] = useState([]);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    if (!token) return;

    Promise.all([api.listarUsuarios('', token), api.listarSeguindo(token)])
      .then(([todos, seguidos]) => {
        setUsuarios(todos);
        setSeguindo(seguidos);
      })
      .catch((e) => setErro(e.message));
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const timeout = setTimeout(() => {
      api
        .listarUsuarios(busca, token)
        .then((dados) => setUsuarios(dados))
        .catch((e) => setErro(e.message));
    }, 250);

    return () => clearTimeout(timeout);
  }, [busca, token]);

  const idsSeguindo = new Set(seguindo.map((u) => u.id));

  async function seguir(usuarioId) {
    setErro('');
    setMensagem('');

    try {
      await api.seguirUsuario(usuarioId, token);
      const atualizada = await api.listarSeguindo(token);
      setSeguindo(atualizada);
      setMensagem('Agora você está seguindo essa pessoa.');
    } catch (e) {
      setErro(e.message);
    }
  }

  if (!token) {
    return (
      <main className="container">
        <h2>Buscar amigos</h2>
        <p>Faça login para buscar pessoas e seguir a agenda delas.</p>
      </main>
    );
  }

  return (
    <main className="container">
      <h2>Buscar amigos</h2>
      <label>
        Pesquise por nome ou e-mail
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: Ana" />
      </label>

      <section className="lista-eventos">
        {usuarios.map((usuario) => (
          <article key={usuario.id} className="card-evento">
            <h3>{usuario.nome}</h3>
            <p>{usuario.bio || 'Sem bio cadastrada.'}</p>
            <p>
              <strong>Reputação:</strong> {usuario.reputacao}
            </p>
            <p>
              <strong>Status:</strong> {usuario.verificado ? 'Verificado' : 'Comunitário'}
            </p>
            <button onClick={() => seguir(usuario.id)} disabled={idsSeguindo.has(usuario.id)}>
              {idsSeguindo.has(usuario.id) ? 'Seguindo' : 'Seguir agenda'}
            </button>
          </article>
        ))}
      </section>

      {mensagem ? <p className="sucesso">{mensagem}</p> : null}
      {erro ? <p className="erro">{erro}</p> : null}
    </main>
  );
}
