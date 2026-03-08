import { useEffect, useMemo, useState } from 'react';
import { api } from '../servicos/api';

export default function CriarEvento({ token }) {
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  const [formulario, setFormulario] = useState({
    titulo: '',
    descricao: '',
    localId: '',
    data: '',
    horaInicio: '',
    horaFim: ''
  });

  const [buscaLocal, setBuscaLocal] = useState('');
  const [sugestoesLocais, setSugestoesLocais] = useState([]);
  const [mostrarNovoLocal, setMostrarNovoLocal] = useState(false);
  const [novoLocal, setNovoLocal] = useState({
    nome: '',
    endereco: '',
    bairro: '',
    cidade: 'Recife',
    latitude: '',
    longitude: ''
  });

  const [buscaArtista, setBuscaArtista] = useState('');
  const [sugestoesArtistas, setSugestoesArtistas] = useState([]);
  const [artistasSelecionados, setArtistasSelecionados] = useState([]);
  const [mostrarNovoArtista, setMostrarNovoArtista] = useState(false);
  const [novoArtista, setNovoArtista] = useState({
    nome: '',
    descricao: '',
    instagram: '',
    website: ''
  });

  useEffect(() => {
    const termo = buscaLocal.trim();
    if (termo.length < 2) {
      setSugestoesLocais([]);
      return;
    }

    const timeout = setTimeout(() => {
      api
        .listarLocais(termo)
        .then((dados) => setSugestoesLocais(dados))
        .catch((e) => setErro(e.message));
    }, 250);

    return () => clearTimeout(timeout);
  }, [buscaLocal]);

  useEffect(() => {
    const termo = buscaArtista.trim();
    if (termo.length < 2) {
      setSugestoesArtistas([]);
      return;
    }

    const timeout = setTimeout(() => {
      api
        .listarArtistas(termo)
        .then((dados) => setSugestoesArtistas(dados))
        .catch((e) => setErro(e.message));
    }, 250);

    return () => clearTimeout(timeout);
  }, [buscaArtista]);

  const idsArtistas = useMemo(() => artistasSelecionados.map((artista) => artista.id), [artistasSelecionados]);

  function alterar(campo, valor) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function selecionarLocal(local) {
    setFormulario((anterior) => ({ ...anterior, localId: local.id }));
    setBuscaLocal(`${local.nome} - ${local.bairro}`);
    setSugestoesLocais([]);
    setMostrarNovoLocal(false);
  }

  function limparLocalSelecionado() {
    setFormulario((anterior) => ({ ...anterior, localId: '' }));
    setBuscaLocal('');
  }

  function adicionarArtistaSelecionado(artista) {
    if (artistasSelecionados.some((item) => item.id === artista.id)) return;
    setArtistasSelecionados((anterior) => [...anterior, artista]);
    setBuscaArtista('');
    setSugestoesArtistas([]);
    setMostrarNovoArtista(false);
  }

  function removerArtista(artistaId) {
    setArtistasSelecionados((anterior) => anterior.filter((artista) => artista.id !== artistaId));
  }

  async function criarNovoLocal() {
    setErro('');

    if (!token) {
      setErro('Faça login para criar um novo local.');
      return;
    }

    try {
      const criado = await api.criarLocal(
        {
          ...novoLocal,
          latitude: novoLocal.latitude === '' ? null : Number(novoLocal.latitude),
          longitude: novoLocal.longitude === '' ? null : Number(novoLocal.longitude)
        },
        token
      );
      selecionarLocal(criado);
      setNovoLocal({
        nome: '',
        endereco: '',
        bairro: '',
        cidade: 'Recife',
        latitude: '',
        longitude: ''
      });
      setMensagem('Novo local criado e selecionado para o evento.');
    } catch (e) {
      setErro(e.message);
    }
  }

  async function criarNovoArtista() {
    setErro('');

    if (!token) {
      setErro('Faça login para criar um novo artista.');
      return;
    }

    try {
      const criado = await api.criarArtista(novoArtista, token);
      adicionarArtistaSelecionado(criado);
      setNovoArtista({ nome: '', descricao: '', instagram: '', website: '' });
      setMensagem('Novo artista criado e adicionado ao evento.');
    } catch (e) {
      setErro(e.message);
    }
  }

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setMensagem('');

    if (!token) {
      setErro('Faça login para criar eventos.');
      return;
    }

    if (!formulario.localId) {
      setErro('Selecione um local por sugestão ou crie um novo local.');
      return;
    }

    try {
      const payload = {
        ...formulario,
        artistas: idsArtistas,
        data: `${formulario.data}T00:00:00.000Z`
      };

      await api.criarEvento(payload, token);
      setMensagem('Evento criado com sucesso.');
      setFormulario({
        titulo: '',
        descricao: '',
        localId: '',
        data: '',
        horaInicio: '',
        horaFim: ''
      });
      setBuscaLocal('');
      setArtistasSelecionados([]);
    } catch (erroApi) {
      setErro(erroApi.message);
    }
  }

  return (
    <main className="container">
      <h2>Criar evento</h2>
      <form onSubmit={enviar} className="formulario">
        <label>
          Título
          <input value={formulario.titulo} onChange={(e) => alterar('titulo', e.target.value)} required />
        </label>

        <label>
          Descrição
          <textarea value={formulario.descricao} onChange={(e) => alterar('descricao', e.target.value)} required />
        </label>

        <div className="campo-autocomplete">
          <label htmlFor="busca-local">Local (autocomplete)</label>
          <input
            id="busca-local"
            value={buscaLocal}
            onChange={(e) => {
              setBuscaLocal(e.target.value);
              setFormulario((anterior) => ({ ...anterior, localId: '' }));
            }}
            placeholder="Digite para buscar locais"
            autoComplete="off"
          />

          {formulario.localId ? (
            <p className="sucesso">
              Local selecionado. <button type="button" onClick={limparLocalSelecionado}>Trocar local</button>
            </p>
          ) : null}

          {sugestoesLocais.length > 0 ? (
            <ul className="lista-sugestoes">
              {sugestoesLocais.map((local) => (
                <li key={local.id}>
                  <button type="button" onClick={() => selecionarLocal(local)}>
                    {local.nome} - {local.bairro}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <button type="button" onClick={() => setMostrarNovoLocal((v) => !v)}>
            {mostrarNovoLocal ? 'Cancelar novo local' : 'Adicionar novo local'}
          </button>

          {mostrarNovoLocal ? (
            <div className="bloco-inline">
              <input
                placeholder="Nome do local"
                value={novoLocal.nome}
                onChange={(e) => setNovoLocal((a) => ({ ...a, nome: e.target.value }))}
              />
              <input
                placeholder="Endereço"
                value={novoLocal.endereco}
                onChange={(e) => setNovoLocal((a) => ({ ...a, endereco: e.target.value }))}
              />
              <input
                placeholder="Bairro"
                value={novoLocal.bairro}
                onChange={(e) => setNovoLocal((a) => ({ ...a, bairro: e.target.value }))}
              />
              <input
                placeholder="Cidade"
                value={novoLocal.cidade}
                onChange={(e) => setNovoLocal((a) => ({ ...a, cidade: e.target.value }))}
              />
              <input
                placeholder="Latitude (opcional)"
                type="number"
                step="0.0000001"
                value={novoLocal.latitude}
                onChange={(e) => setNovoLocal((a) => ({ ...a, latitude: e.target.value }))}
              />
              <input
                placeholder="Longitude (opcional)"
                type="number"
                step="0.0000001"
                value={novoLocal.longitude}
                onChange={(e) => setNovoLocal((a) => ({ ...a, longitude: e.target.value }))}
              />
              <button type="button" onClick={criarNovoLocal}>Criar local</button>
            </div>
          ) : null}
        </div>

        <label>
          Data
          <input type="date" value={formulario.data} onChange={(e) => alterar('data', e.target.value)} required />
        </label>

        <label>
          Hora de início
          <input
            type="time"
            value={formulario.horaInicio}
            onChange={(e) => alterar('horaInicio', e.target.value)}
            required
          />
        </label>

        <label>
          Hora de fim
          <input type="time" value={formulario.horaFim} onChange={(e) => alterar('horaFim', e.target.value)} />
        </label>

        <div className="campo-autocomplete">
          <label htmlFor="busca-artista">Artistas (autocomplete)</label>
          <input
            id="busca-artista"
            value={buscaArtista}
            onChange={(e) => setBuscaArtista(e.target.value)}
            placeholder="Digite para buscar artistas"
            autoComplete="off"
          />

          {sugestoesArtistas.length > 0 ? (
            <ul className="lista-sugestoes">
              {sugestoesArtistas.map((artista) => (
                <li key={artista.id}>
                  <button type="button" onClick={() => adicionarArtistaSelecionado(artista)}>
                    {artista.nome}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {artistasSelecionados.length > 0 ? (
            <div className="tags-selecionadas">
              {artistasSelecionados.map((artista) => (
                <span key={artista.id}>
                  {artista.nome}
                  <button type="button" onClick={() => removerArtista(artista.id)}>
                    x
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <button type="button" onClick={() => setMostrarNovoArtista((v) => !v)}>
            {mostrarNovoArtista ? 'Cancelar novo artista' : 'Adicionar novo artista'}
          </button>

          {mostrarNovoArtista ? (
            <div className="bloco-inline">
              <input
                placeholder="Nome do artista"
                value={novoArtista.nome}
                onChange={(e) => setNovoArtista((a) => ({ ...a, nome: e.target.value }))}
              />
              <textarea
                placeholder="Descrição"
                value={novoArtista.descricao}
                onChange={(e) => setNovoArtista((a) => ({ ...a, descricao: e.target.value }))}
              />
              <input
                placeholder="Instagram"
                value={novoArtista.instagram}
                onChange={(e) => setNovoArtista((a) => ({ ...a, instagram: e.target.value }))}
              />
              <input
                placeholder="Website"
                value={novoArtista.website}
                onChange={(e) => setNovoArtista((a) => ({ ...a, website: e.target.value }))}
              />
              <button type="button" onClick={criarNovoArtista}>Criar artista</button>
            </div>
          ) : null}
        </div>

        <button type="submit">Publicar evento</button>
      </form>

      {mensagem ? <p className="sucesso">{mensagem}</p> : null}
      {erro ? <p className="erro">{erro}</p> : null}
    </main>
  );
}
