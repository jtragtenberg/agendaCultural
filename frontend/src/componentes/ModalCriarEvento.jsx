import { useEffect, useMemo, useState } from 'react';
import { api } from '../servicos/api';

export default function ModalCriarEvento({ dataPre, token, onFechar, onEventoCriado }) {
  const [erro, setErro] = useState('');

  const [textoIa, setTextoIa] = useState('');
  const [extraindoIa, setExtraindoIa] = useState(false);
  const [erroIa, setErroIa] = useState('');

  const [formulario, setFormulario] = useState({
    titulo: '',
    descricao: '',
    localId: '',
    data: dataPre || '',
    horaInicio: '19:00',
    horaFim: '21:00',
  });

  const [buscaLocal, setBuscaLocal] = useState('');
  const [sugestoesLocais, setSugestoesLocais] = useState([]);
  const [mostrarNovoLocal, setMostrarNovoLocal] = useState(false);
  const [novoLocal, setNovoLocal] = useState({
    nome: '', endereco: '', bairro: '', cidade: 'Recife', latitude: '', longitude: '',
  });

  const [buscaArtista, setBuscaArtista] = useState('');
  const [sugestoesArtistas, setSugestoesArtistas] = useState([]);
  const [artistasSelecionados, setArtistasSelecionados] = useState([]);
  const [mostrarNovoArtista, setMostrarNovoArtista] = useState(false);
  const [novoArtista, setNovoArtista] = useState({
    nome: '', descricao: '', instagram: '', website: '',
  });

  useEffect(() => {
    const termo = buscaLocal.trim();
    if (termo.length < 2) { setSugestoesLocais([]); return; }
    const t = setTimeout(() => {
      api.listarLocais(termo).then(setSugestoesLocais).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [buscaLocal]);

  useEffect(() => {
    const termo = buscaArtista.trim();
    if (termo.length < 2) { setSugestoesArtistas([]); return; }
    const t = setTimeout(() => {
      api.listarArtistas(termo).then(setSugestoesArtistas).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [buscaArtista]);

  const idsArtistas = useMemo(() => artistasSelecionados.map((a) => a.id), [artistasSelecionados]);

  function alterar(campo, valor) {
    setFormulario((ant) => ({ ...ant, [campo]: valor }));
  }

  function selecionarLocal(local) {
    setFormulario((ant) => ({ ...ant, localId: local.id }));
    setBuscaLocal(`${local.nome} - ${local.bairro}`);
    setSugestoesLocais([]);
    setMostrarNovoLocal(false);
  }

  function adicionarArtista(artista) {
    if (artistasSelecionados.some((a) => a.id === artista.id)) return;
    setArtistasSelecionados((ant) => [...ant, artista]);
    setBuscaArtista('');
    setSugestoesArtistas([]);
    setMostrarNovoArtista(false);
  }

  async function criarNovoLocal() {
    if (!token) { setErro('Faça login para criar um local.'); return; }
    try {
      const criado = await api.criarLocal({
        ...novoLocal,
        latitude: novoLocal.latitude === '' ? null : Number(novoLocal.latitude),
        longitude: novoLocal.longitude === '' ? null : Number(novoLocal.longitude),
      }, token);
      selecionarLocal(criado);
      setNovoLocal({ nome: '', endereco: '', bairro: '', cidade: 'Recife', latitude: '', longitude: '' });
    } catch (e) {
      setErro(e.message);
    }
  }

  async function criarNovoArtista() {
    if (!token) { setErro('Faça login para criar um artista.'); return; }
    try {
      const criado = await api.criarArtista(novoArtista, token);
      adicionarArtista(criado);
      setNovoArtista({ nome: '', descricao: '', instagram: '', website: '' });
    } catch (e) {
      setErro(e.message);
    }
  }

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    if (!token) { setErro('Faça login para criar eventos.'); return; }
    if (!formulario.localId) { setErro('Selecione um local.'); return; }
    try {
      await api.criarEvento({
        ...formulario,
        artistas: idsArtistas,
        data: `${formulario.data}T00:00:00.000Z`,
      }, token);
      onEventoCriado();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function extrairComIa() {
    if (!textoIa.trim()) return;
    setExtraindoIa(true);
    setErroIa('');
    try {
      const { extraido, locaisEncontrados, artistasEncontrados } = await api.extrairEvento(textoIa);

      setFormulario((ant) => ({
        ...ant,
        titulo: extraido.titulo || ant.titulo,
        descricao: extraido.descricao || ant.descricao,
        data: extraido.data || ant.data,
        horaInicio: extraido.horaInicio || ant.horaInicio,
        horaFim: extraido.horaFim || ant.horaFim,
      }));

      if (locaisEncontrados.length > 0) {
        selecionarLocal(locaisEncontrados[0]);
      } else if (extraido.nomeLocal) {
        setNovoLocal({
          nome: extraido.nomeLocal || '',
          endereco: extraido.enderecoLocal || '',
          bairro: extraido.bairroLocal || '',
          cidade: extraido.cidadeLocal || 'Recife',
          latitude: '',
          longitude: '',
        });
        setMostrarNovoLocal(true);
      }

      if (artistasEncontrados.length > 0) {
        adicionarArtista(artistasEncontrados[0]);
      } else if (extraido.nomeArtista) {
        setNovoArtista((ant) => ({ ...ant, nome: extraido.nomeArtista }));
        setMostrarNovoArtista(true);
      }
    } catch (e) {
      setErroIa(e.message);
    } finally {
      setExtraindoIa(false);
    }
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onFechar();
  }

  return (
    <div className="modal-overlay" onClick={handleBackdrop}>
      <div className="modal-conteudo">
        <div className="modal-topo">
          <h2>Criar evento</h2>
          <button className="btn-fechar-modal" onClick={onFechar}>✕</button>
        </div>

        <form onSubmit={enviar} className="formulario">
          <div className="ia-extracao">
            <label htmlFor="ia-texto">Extrair com IA</label>
            <textarea
              id="ia-texto"
              value={textoIa}
              onChange={(e) => setTextoIa(e.target.value)}
              placeholder="Cole aqui a descrição do evento (post do Instagram, notícia, texto curto)..."
              rows={3}
            />
            <button type="button" onClick={extrairComIa} disabled={extraindoIa || !textoIa.trim()}>
              {extraindoIa ? 'Extraindo...' : 'Preencher formulário com IA'}
            </button>
            {erroIa ? <p className="erro">{erroIa}</p> : null}
          </div>

          <hr className="ia-divisor" />

          <label>
            Título
            <input value={formulario.titulo} onChange={(e) => alterar('titulo', e.target.value)} required />
          </label>

          <label>
            Descrição
            <textarea value={formulario.descricao} onChange={(e) => alterar('descricao', e.target.value)} />
          </label>

          <label>
            Data
            <input type="date" value={formulario.data} onChange={(e) => alterar('data', e.target.value)} required />
          </label>

          <div className="grade-horas">
            <label>
              Hora início
              <input type="time" value={formulario.horaInicio} onChange={(e) => alterar('horaInicio', e.target.value)} required />
            </label>
            <label>
              Hora fim
              <input type="time" value={formulario.horaFim} onChange={(e) => alterar('horaFim', e.target.value)} />
            </label>
          </div>

          <div className="campo-autocomplete">
            <label htmlFor="modal-busca-local">Local</label>
            <input
              id="modal-busca-local"
              value={buscaLocal}
              onChange={(e) => { setBuscaLocal(e.target.value); setFormulario((a) => ({ ...a, localId: '' })); }}
              placeholder="Digite para buscar locais"
              autoComplete="off"
            />
            {formulario.localId ? (
              <p className="sucesso" style={{ margin: '0.2rem 0' }}>
                Local selecionado.{' '}
                <button type="button" onClick={() => { setFormulario((a) => ({ ...a, localId: '' })); setBuscaLocal(''); }}>
                  Trocar
                </button>
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
              {mostrarNovoLocal ? 'Cancelar novo local' : 'Novo local'}
            </button>
            {mostrarNovoLocal ? (
              <div className="bloco-inline">
                <input placeholder="Nome" value={novoLocal.nome} onChange={(e) => setNovoLocal((a) => ({ ...a, nome: e.target.value }))} />
                <input placeholder="Endereço" value={novoLocal.endereco} onChange={(e) => setNovoLocal((a) => ({ ...a, endereco: e.target.value }))} />
                <input placeholder="Bairro" value={novoLocal.bairro} onChange={(e) => setNovoLocal((a) => ({ ...a, bairro: e.target.value }))} />
                <input placeholder="Cidade" value={novoLocal.cidade} onChange={(e) => setNovoLocal((a) => ({ ...a, cidade: e.target.value }))} />
                <button type="button" onClick={criarNovoLocal}>Criar local</button>
              </div>
            ) : null}
          </div>

          <div className="campo-autocomplete">
            <label htmlFor="modal-busca-artista">Artistas</label>
            <input
              id="modal-busca-artista"
              value={buscaArtista}
              onChange={(e) => setBuscaArtista(e.target.value)}
              placeholder="Digite para buscar artistas"
              autoComplete="off"
            />
            {sugestoesArtistas.length > 0 ? (
              <ul className="lista-sugestoes">
                {sugestoesArtistas.map((artista) => (
                  <li key={artista.id}>
                    <button type="button" onClick={() => adicionarArtista(artista)}>{artista.nome}</button>
                  </li>
                ))}
              </ul>
            ) : null}
            {artistasSelecionados.length > 0 ? (
              <div className="tags-selecionadas">
                {artistasSelecionados.map((artista) => (
                  <span key={artista.id}>
                    {artista.nome}
                    <button type="button" onClick={() => setArtistasSelecionados((ant) => ant.filter((a) => a.id !== artista.id))}>x</button>
                  </span>
                ))}
              </div>
            ) : null}
            <button type="button" onClick={() => setMostrarNovoArtista((v) => !v)}>
              {mostrarNovoArtista ? 'Cancelar novo artista' : 'Novo artista'}
            </button>
            {mostrarNovoArtista ? (
              <div className="bloco-inline">
                <input placeholder="Nome" value={novoArtista.nome} onChange={(e) => setNovoArtista((a) => ({ ...a, nome: e.target.value }))} />
                <textarea placeholder="Descrição" value={novoArtista.descricao} onChange={(e) => setNovoArtista((a) => ({ ...a, descricao: e.target.value }))} />
                <input placeholder="Instagram" value={novoArtista.instagram} onChange={(e) => setNovoArtista((a) => ({ ...a, instagram: e.target.value }))} />
                <input placeholder="Website" value={novoArtista.website} onChange={(e) => setNovoArtista((a) => ({ ...a, website: e.target.value }))} />
                <button type="button" onClick={criarNovoArtista}>Criar artista</button>
              </div>
            ) : null}
          </div>

          <button type="submit">Publicar evento</button>
        </form>

        {erro ? <p className="erro">{erro}</p> : null}
      </div>
    </div>
  );
}
