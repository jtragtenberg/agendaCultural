import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../servicos/api';

export default function ModalCriarEvento({ dataPre, token, onFechar, onEventoCriado, urlInstagramPre }) {
  const [erro, setErro] = useState('');

  // Extração por IA
  const [urlInstagram, setUrlInstagram] = useState(urlInstagramPre || '');
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
    ingresso: '',
    links: '',
    linkIngresso: '',
    imagemUrl: '',
  });

  // Local
  const [buscaLocal, setBuscaLocal] = useState('');
  const [sugestoesLocais, setSugestoesLocais] = useState([]);
  const [novoLocalNome, setNovoLocalNome] = useState('');
  const [novoLocalInstagram, setNovoLocalInstagram] = useState('');
  const [novoLocalEndereco, setNovoLocalEndereco] = useState('');
  const [novoLocalBairro, setNovoLocalBairro] = useState('');
  const [novoLocalCidade, setNovoLocalCidade] = useState('Recife');
  const [criandoLocal, setCriandoLocal] = useState(false);

  // Artistas existentes (já no banco)
  const [buscaArtista, setBuscaArtista] = useState('');
  const [sugestoesArtistas, setSugestoesArtistas] = useState([]);
  const [artistasSelecionados, setArtistasSelecionados] = useState([]);
  const [criandoArtista, setCriandoArtista] = useState(false);

  // Artistas sugeridos pela IA (ainda não no banco — criados ao salvar o evento)
  const [artistasSugeridos, setArtistasSugeridos] = useState([]);

  useEffect(() => {
    const termo = buscaLocal.trim();
    if (termo.length < 2 || formulario.localId) { setSugestoesLocais([]); return; }
    const t = setTimeout(() => api.listarLocais(termo).then(setSugestoesLocais).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [buscaLocal, formulario.localId]);

  useEffect(() => {
    const termo = buscaArtista.trim();
    if (termo.length < 2) { setSugestoesArtistas([]); return; }
    const t = setTimeout(() => api.listarArtistas(termo).then(setSugestoesArtistas).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [buscaArtista]);

  // Se o modal foi aberto com uma URL pré-preenchida, dispara a extração automaticamente
  useEffect(() => {
    if (urlInstagramPre) {
      extrairComIa({ urlOverride: urlInstagramPre, textoOverride: '' });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const idsArtistas = useMemo(() => artistasSelecionados.map((a) => a.id), [artistasSelecionados]);

  function alterar(campo, valor) {
    setFormulario((ant) => ({ ...ant, [campo]: valor }));
  }

  function selecionarLocal(local) {
    setFormulario((ant) => ({ ...ant, localId: local.id }));
    setBuscaLocal(`${local.nome}${local.bairro ? ` - ${local.bairro}` : ''}`);
    setSugestoesLocais([]);
    setNovoLocalNome('');
    setNovoLocalInstagram('');
    setNovoLocalEndereco('');
    setNovoLocalBairro('');
    setNovoLocalCidade('Recife');
  }

  function limparLocal() {
    setFormulario((a) => ({ ...a, localId: '' }));
    setBuscaLocal('');
    setNovoLocalInstagram('');
    setNovoLocalEndereco('');
    setNovoLocalBairro('');
    setNovoLocalCidade('Recife');
  }

  function adicionarArtista(artista) {
    if (artistasSelecionados.some((a) => a.id === artista.id)) return;
    setArtistasSelecionados((ant) => [...ant, artista]);
    setBuscaArtista('');
    setSugestoesArtistas([]);
  }

  async function criarLocal() {
    const nome = novoLocalNome.trim() || buscaLocal.trim();
    if (!nome) { setErro('Digite o nome do local.'); return; }
    setCriandoLocal(true);
    try {
      const criado = await api.criarLocal({
        nome,
        instagram: novoLocalInstagram.trim() || undefined,
        endereco: novoLocalEndereco.trim() || '',
        bairro: novoLocalBairro.trim() || '',
        cidade: novoLocalCidade.trim() || 'Recife',
      }, token);
      selecionarLocal(criado);
    } catch (e) { setErro(e.message); }
    finally { setCriandoLocal(false); }
  }

  async function criarArtista() {
    const nome = buscaArtista.trim();
    if (!nome) { setErro('Digite o nome do artista.'); return; }
    setCriandoArtista(true);
    try {
      const criado = await api.criarArtista({ nome }, token);
      adicionarArtista(criado);
    } catch (e) { setErro(e.message); }
    finally { setCriandoArtista(false); }
  }

  function atualizarArtistaSugerido(index, campo, valor) {
    setArtistasSugeridos((ant) => ant.map((a, i) => i === index ? { ...a, [campo]: valor } : a));
  }

  function ignorarArtistaSugerido(index) {
    setArtistasSugeridos((ant) => ant.filter((_, i) => i !== index));
  }

  async function extrairComIa({ urlOverride, textoOverride } = {}) {
    const url = urlOverride !== undefined ? urlOverride : urlInstagram;
    const texto = textoOverride !== undefined ? textoOverride : textoIa;
    const temUrl = url.trim().length > 0;
    const temTexto = texto.trim().length > 0;
    if (!temUrl && !temTexto) return;

    setExtraindoIa(true);
    setErroIa('');
    try {
      const payload = temUrl
        ? { urlInstagram: url.trim(), texto: texto.trim() || undefined }
        : { texto: texto.trim() };

      const { extraido, artistasEncontrados, artistasSugeridos: sugeridos, localEncontrado, enderecoSugerido, postInstagram } =
        await api.extrairEvento(payload, token);

      // Preenche campos do formulário
      setFormulario((ant) => ({
        ...ant,
        titulo: extraido.titulo || ant.titulo,
        descricao: extraido.descricao || ant.descricao,
        data: extraido.data || ant.data,
        horaInicio: extraido.horaInicio || ant.horaInicio,
        horaFim: extraido.horaFim || ant.horaFim,
        ingresso: extraido.ingresso || ant.ingresso,
        linkIngresso: extraido.linkIngresso || ant.linkIngresso,
        links: extraido.links || ant.links,
        imagemUrl: postInstagram?.thumbnail || ant.imagemUrl,
      }));

      // Artistas já no banco → auto-seleciona
      if (artistasEncontrados && artistasEncontrados.length > 0) {
        setArtistasSelecionados(artistasEncontrados);
      }
      // Artistas não cadastrados → mostra cards para revisão
      if (sugeridos && sugeridos.length > 0) {
        setArtistasSugeridos(sugeridos);
      }

      // Preenche local
      if (localEncontrado) {
        selecionarLocal(localEncontrado);
      } else if (extraido.local?.nome) {
        const nomeLocal = extraido.local.nome;
        setBuscaLocal(nomeLocal);
        setNovoLocalNome(nomeLocal);
        // Pré-preenche campos extras
        setNovoLocalInstagram(extraido.local.instagram || '');
        setNovoLocalEndereco(enderecoSugerido?.rua || extraido.local.endereco || '');
        setNovoLocalBairro(enderecoSugerido?.bairro || extraido.local.bairro || '');
        setNovoLocalCidade(enderecoSugerido?.cidade || extraido.local.cidade || 'Recife');
        // Se Nominatim encontrou, cria automaticamente
        if (enderecoSugerido) {
          setCriandoLocal(true);
          try {
            const criado = await api.criarLocal({
              nome: nomeLocal,
              instagram: extraido.local.instagram || undefined,
              endereco: enderecoSugerido.rua || '',
              bairro: enderecoSugerido.bairro || extraido.local.bairro || '',
              cidade: enderecoSugerido.cidade || extraido.local.cidade || 'Recife',
            }, token);
            selecionarLocal(criado);
          } catch { /* deixa o usuário criar manualmente */ }
          finally { setCriandoLocal(false); }
        }
      }
    } catch (e) {
      setErroIa(e.message);
    } finally {
      setExtraindoIa(false);
    }
  }

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    if (!token) { setErro('Faça login para criar eventos.'); return; }
    if (!formulario.localId) { setErro('Selecione ou crie um local.'); return; }
    try {
      // Cria artistas sugeridos que ainda não estão no banco
      const artistasNovos = [];
      for (const a of artistasSugeridos) {
        if (!a.nome.trim()) continue;
        try {
          const criado = await api.criarArtista({
            nome: a.nome.trim(),
            instagram: a.instagram || undefined,
            descricao: a.descricao || undefined,
          }, token);
          artistasNovos.push(criado);
        } catch { /* ignora erro individual */ }
      }

      await api.criarEvento({
        ...formulario,
        artistas: [...idsArtistas, ...artistasNovos.map((a) => a.id)],
        data: `${formulario.data}T00:00:00.000Z`,
      }, token);
      onEventoCriado();
    } catch (e) { setErro(e.message); }
  }

  const mousedownAlvo = useRef(null);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => { mousedownAlvo.current = e.target; }}
      onClick={(e) => { if (e.target === e.currentTarget && mousedownAlvo.current === e.currentTarget) onFechar(); }}
    >
      <div className="modal-conteudo">
        <div className="modal-topo">
          <h2>Criar evento</h2>
          <button className="btn-fechar-modal" onClick={onFechar}>✕</button>
        </div>

        <form onSubmit={enviar} className="formulario">

          {/* ── Extração por IA ── */}
          <div className="ia-extracao">
            <label htmlFor="ia-url">Link do post do Instagram</label>
            <input
              id="ia-url"
              value={urlInstagram}
              onChange={(e) => setUrlInstagram(e.target.value)}
              placeholder="https://www.instagram.com/p/..."
              autoComplete="off"
            />

            <label htmlFor="ia-texto">Ou cole o texto do evento</label>
            <textarea
              id="ia-texto"
              value={textoIa}
              onChange={(e) => setTextoIa(e.target.value)}
              placeholder="Cole aqui a descrição do evento (legenda do post, notícia, texto curto)..."
              rows={3}
            />

            <button
              type="button"
              onClick={extrairComIa}
              disabled={extraindoIa || (!urlInstagram.trim() && !textoIa.trim())}
            >
              {extraindoIa ? 'Extraindo...' : 'Preencher formulário com IA'}
            </button>
            {erroIa ? <p className="erro">{erroIa}</p> : null}
          </div>

          <hr className="ia-divisor" />

          {/* ── Campos do evento ── */}
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

          <label>
            Ingresso
            <input value={formulario.ingresso} onChange={(e) => alterar('ingresso', e.target.value)} placeholder="Ex: Gratuito, R$ 20, Couvert artístico..." />
          </label>

          <label>
            Link para compra de ingresso
            <input value={formulario.linkIngresso} onChange={(e) => alterar('linkIngresso', e.target.value)} placeholder="https://..." />
          </label>

          <label>
            Link do post de divulgação
            <input value={formulario.links} onChange={(e) => alterar('links', e.target.value)} placeholder="https://www.instagram.com/p/..." />
          </label>

          <label>
            Imagem (URL)
            <input value={formulario.imagemUrl} onChange={(e) => alterar('imagemUrl', e.target.value)} placeholder="https://..." />
          </label>

          {/* ── Local ── */}
          <div className="campo-autocomplete">
            <label htmlFor="modal-busca-local">Local</label>
            <input
              id="modal-busca-local"
              value={buscaLocal}
              onChange={(e) => {
                setBuscaLocal(e.target.value);
                setFormulario((a) => ({ ...a, localId: '' }));
                setNovoLocalNome('');
                setNovoLocalInstagram('');
                setNovoLocalEndereco('');
                setNovoLocalBairro('');
                setNovoLocalCidade('Recife');
              }}
              placeholder="Digite para buscar ou criar"
              autoComplete="off"
            />
            {formulario.localId ? (
              <p className="sucesso" style={{ margin: '0.2rem 0' }}>
                Local selecionado.{' '}
                <button type="button" onClick={limparLocal}>Trocar</button>
              </p>
            ) : (
              <>
                {sugestoesLocais.length > 0 ? (
                  <ul className="lista-sugestoes">
                    {sugestoesLocais.map((local) => (
                      <li key={local.id}>
                        <button type="button" onClick={() => selecionarLocal(local)}>
                          {local.nome}{local.bairro ? ` - ${local.bairro}` : ''}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {buscaLocal.trim().length >= 2 ? (
                  <div className="novo-local-form">
                    <div className="novo-local-campos">
                      <input
                        value={novoLocalInstagram}
                        onChange={(e) => setNovoLocalInstagram(e.target.value)}
                        placeholder="@instagram do local (opcional)"
                        autoComplete="off"
                      />
                      <input
                        value={novoLocalEndereco}
                        onChange={(e) => setNovoLocalEndereco(e.target.value)}
                        placeholder="Endereço (opcional)"
                        autoComplete="off"
                      />
                      <input
                        value={novoLocalBairro}
                        onChange={(e) => setNovoLocalBairro(e.target.value)}
                        placeholder="Bairro (opcional)"
                        autoComplete="off"
                      />
                      <input
                        value={novoLocalCidade}
                        onChange={(e) => setNovoLocalCidade(e.target.value)}
                        placeholder="Cidade"
                        autoComplete="off"
                      />
                    </div>
                    <button type="button" onClick={criarLocal} disabled={criandoLocal}>
                      {criandoLocal ? 'Criando...' : `Criar local "${buscaLocal.trim()}"`}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          {/* ── Artistas ── */}
          <div className="campo-autocomplete">
            <label htmlFor="modal-busca-artista">Artistas</label>
            <input
              id="modal-busca-artista"
              value={buscaArtista}
              onChange={(e) => setBuscaArtista(e.target.value)}
              placeholder="Digite para buscar ou criar"
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
            {buscaArtista.trim().length >= 2 ? (
              <button type="button" onClick={criarArtista} disabled={criandoArtista}>
                {criandoArtista ? 'Criando...' : `Criar artista "${buscaArtista.trim()}"`}
              </button>
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

            {/* Artistas sugeridos pela IA (serão criados ao salvar o evento) */}
            {artistasSugeridos.length > 0 ? (
              <div className="artistas-sugeridos">
                <p className="artistas-sugeridos-titulo">Sugeridos pela IA — serão cadastrados ao salvar:</p>
                {artistasSugeridos.map((a, i) => (
                  <div key={i} className="artista-sugerido-card">
                    <div className="artista-sugerido-campos">
                      <input
                        value={a.nome}
                        onChange={(e) => atualizarArtistaSugerido(i, 'nome', e.target.value)}
                        placeholder="Nome do artista"
                        autoComplete="off"
                      />
                      <input
                        value={a.instagram || ''}
                        onChange={(e) => atualizarArtistaSugerido(i, 'instagram', e.target.value)}
                        placeholder="@instagram (opcional)"
                        autoComplete="off"
                      />
                      <textarea
                        value={a.descricao || ''}
                        onChange={(e) => atualizarArtistaSugerido(i, 'descricao', e.target.value)}
                        placeholder="Descrição (opcional)"
                        rows={2}
                      />
                    </div>
                    <button type="button" className="artista-sugerido-remover" onClick={() => ignorarArtistaSugerido(i)}>✕</button>
                  </div>
                ))}
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
