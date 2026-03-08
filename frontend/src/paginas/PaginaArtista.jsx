import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../servicos/api';

export default function PaginaArtista({ token }) {
  const { id } = useParams();
  const [artista, setArtista] = useState(null);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [formulario, setFormulario] = useState({
    nome: '',
    descricao: '',
    instagram: '',
    website: ''
  });

  useEffect(() => {
    api
      .buscarArtista(id, token)
      .then((dados) => {
        setArtista(dados);
        setFormulario({
          nome: dados.nome || '',
          descricao: dados.descricao || '',
          instagram: dados.instagram || '',
          website: dados.website || ''
        });
      })
      .catch((e) => setErro(e.message));
  }, [id, token]);

  const podeEditar = useMemo(() => Boolean(artista?.podeEditar), [artista]);

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setMensagem('');

    try {
      const atualizado = await api.atualizarArtista(id, formulario, token);
      setArtista((anterior) => ({ ...anterior, ...atualizado }));
      setMensagem('Artista atualizado com sucesso.');
    } catch (e) {
      setErro(e.message);
    }
  }

  if (!artista) {
    return <main className="container">{erro ? <p className="erro">{erro}</p> : <p>Carregando artista...</p>}</main>;
  }

  return (
    <main className="container">
      <h2>{artista.nome}</h2>
      <p>{artista.descricao || 'Sem descrição.'}</p>
      {artista.instagram ? (
        <p>
          <strong>Instagram:</strong> {artista.instagram}
        </p>
      ) : null}
      {artista.website ? (
        <p>
          <strong>Website:</strong> {artista.website}
        </p>
      ) : null}
      <p>
        <strong>Criado por:</strong> {artista.criador?.nome || 'Comunidade'}
      </p>

      <h3>Eventos do artista</h3>
      <ul>
        {artista.eventos.map((evento) => (
          <li key={evento.id}>
            <Link to={`/evento/${evento.id}`}>
              {evento.titulo} - {new Date(evento.data).toLocaleDateString('pt-BR')} em {evento.local.nome}
            </Link>
          </li>
        ))}
      </ul>

      {podeEditar ? (
        <section className="bloco-edicao-publica">
          <h3>Editar artista</h3>
          <form onSubmit={salvar} className="formulario">
            <label>
              Nome
              <input value={formulario.nome} onChange={(e) => setFormulario((a) => ({ ...a, nome: e.target.value }))} />
            </label>
            <label>
              Descrição
              <textarea
                value={formulario.descricao}
                onChange={(e) => setFormulario((a) => ({ ...a, descricao: e.target.value }))}
              />
            </label>
            <label>
              Instagram
              <input
                value={formulario.instagram}
                onChange={(e) => setFormulario((a) => ({ ...a, instagram: e.target.value }))}
              />
            </label>
            <label>
              Website
              <input value={formulario.website} onChange={(e) => setFormulario((a) => ({ ...a, website: e.target.value }))} />
            </label>
            <button type="submit">Salvar alterações</button>
          </form>
        </section>
      ) : (
        <p>Esta página é pública. Edição disponível apenas para criador do artista ou moderadores.</p>
      )}

      {mensagem ? <p className="sucesso">{mensagem}</p> : null}
      {erro ? <p className="erro">{erro}</p> : null}
    </main>
  );
}
