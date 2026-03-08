import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../servicos/api';

export default function PaginaLocal({ token }) {
  const { id } = useParams();
  const [local, setLocal] = useState(null);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [formulario, setFormulario] = useState({
    nome: '',
    endereco: '',
    bairro: '',
    cidade: '',
    latitude: '',
    longitude: ''
  });

  useEffect(() => {
    api
      .buscarLocal(id, token)
      .then((dados) => {
        setLocal(dados);
        setFormulario({
          nome: dados.nome || '',
          endereco: dados.endereco || '',
          bairro: dados.bairro || '',
          cidade: dados.cidade || '',
          latitude: dados.latitude || '',
          longitude: dados.longitude || ''
        });
      })
      .catch((e) => setErro(e.message));
  }, [id, token]);

  const podeEditar = useMemo(() => Boolean(local?.podeEditar), [local]);

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setMensagem('');

    try {
      const atualizado = await api.atualizarLocal(
        id,
        {
          ...formulario,
          latitude: formulario.latitude === '' ? null : Number(formulario.latitude),
          longitude: formulario.longitude === '' ? null : Number(formulario.longitude)
        },
        token
      );
      setLocal((anterior) => ({ ...anterior, ...atualizado }));
      setMensagem('Local atualizado com sucesso.');
    } catch (e) {
      setErro(e.message);
    }
  }

  if (!local) {
    return <main className="container">{erro ? <p className="erro">{erro}</p> : <p>Carregando local...</p>}</main>;
  }

  return (
    <main className="container">
      <h2>{local.nome}</h2>
      <p>
        <strong>Endereço:</strong> {local.endereco}
      </p>
      <p>
        <strong>Bairro:</strong> {local.bairro}
      </p>
      <p>
        <strong>Cidade:</strong> {local.cidade}
      </p>
      <p>
        <strong>Criado por:</strong> {local.criador?.nome || 'Comunidade'}
      </p>

      <h3>Eventos neste local</h3>
      <ul>
        {local.eventos.map((evento) => (
          <li key={evento.id}>
            <Link to={`/evento/${evento.id}`}>
              {evento.titulo} - {new Date(evento.data).toLocaleDateString('pt-BR')} ({evento.horaInicio})
            </Link>
          </li>
        ))}
      </ul>

      {podeEditar ? (
        <section className="bloco-edicao-publica">
          <h3>Editar local</h3>
          <form onSubmit={salvar} className="formulario">
            <label>
              Nome
              <input value={formulario.nome} onChange={(e) => setFormulario((a) => ({ ...a, nome: e.target.value }))} />
            </label>
            <label>
              Endereço
              <input
                value={formulario.endereco}
                onChange={(e) => setFormulario((a) => ({ ...a, endereco: e.target.value }))}
              />
            </label>
            <label>
              Bairro
              <input value={formulario.bairro} onChange={(e) => setFormulario((a) => ({ ...a, bairro: e.target.value }))} />
            </label>
            <label>
              Cidade
              <input value={formulario.cidade} onChange={(e) => setFormulario((a) => ({ ...a, cidade: e.target.value }))} />
            </label>
            <label>
              Latitude
              <input
                type="number"
                step="0.0000001"
                value={formulario.latitude}
                onChange={(e) => setFormulario((a) => ({ ...a, latitude: e.target.value }))}
              />
            </label>
            <label>
              Longitude
              <input
                type="number"
                step="0.0000001"
                value={formulario.longitude}
                onChange={(e) => setFormulario((a) => ({ ...a, longitude: e.target.value }))}
              />
            </label>
            <button type="submit">Salvar alterações</button>
          </form>
        </section>
      ) : (
        <p>Esta página é pública. Edição disponível apenas para criador do local ou moderadores.</p>
      )}

      {mensagem ? <p className="sucesso">{mensagem}</p> : null}
      {erro ? <p className="erro">{erro}</p> : null}
    </main>
  );
}
