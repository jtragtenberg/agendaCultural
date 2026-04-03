import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../servicos/api';
import Toast from '../componentes/Toast';

function FormularioEdicao({ evento, token, onSalvo, onCancelar }) {
  const [formulario, setFormulario] = useState({
    titulo: evento.titulo || '',
    descricao: evento.descricao || '',
    localId: evento.local.id || '',
    data: evento.data ? evento.data.slice(0, 10) : '',
    horaInicio: evento.horaInicio || '',
    horaFim: evento.horaFim || '',
    ingresso: evento.ingresso || '',
    links: evento.links || '',
    linkIngresso: evento.linkIngresso || '',
    imagemUrl: evento.imagemUrl || '',
  });
  const [erro, setErro] = useState('');

  // Local
  const [buscaLocal, setBuscaLocal] = useState(`${evento.local.nome}${evento.local.bairro ? ` - ${evento.local.bairro}` : ''}`);
  const [sugestoesLocais, setSugestoesLocais] = useState([]);
  const [criandoLocal, setCriandoLocal] = useState(false);

  // Artistas
  const [buscaArtista, setBuscaArtista] = useState('');
  const [sugestoesArtistas, setSugestoesArtistas] = useState([]);
  const [artistasSelecionados, setArtistasSelecionados] = useState(evento.eventoArtistas.map((ea) => ea.artista));
  const [criandoArtista, setCriandoArtista] = useState(false);

  useEffect(() => {
    const termo = buscaLocal.trim();
    if (termo.length < 2 || formulario.localId) { setSugestoesLocais([]); return; }
    const t = setTimeout(() => {
      api.listarLocais(termo).then(setSugestoesLocais).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [buscaLocal, formulario.localId]);

  useEffect(() => {
    const termo = buscaArtista.trim();
    if (termo.length < 2) { setSugestoesArtistas([]); return; }
    const t = setTimeout(() => {
      api.listarArtistas(termo).then(setSugestoesArtistas).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [buscaArtista]);

  const idsArtistas = useMemo(() => artistasSelecionados.map((a) => a.id), [artistasSelecionados]);

  function selecionarLocal(local) {
    setFormulario((a) => ({ ...a, localId: local.id }));
    setBuscaLocal(`${local.nome}${local.bairro ? ` - ${local.bairro}` : ''}`);
    setSugestoesLocais([]);
  }

  function adicionarArtista(artista) {
    if (artistasSelecionados.some((a) => a.id === artista.id)) return;
    setArtistasSelecionados((ant) => [...ant, artista]);
    setBuscaArtista('');
    setSugestoesArtistas([]);
  }

  async function criarLocal() {
    const nome = buscaLocal.trim();
    if (!nome) return;
    setCriandoLocal(true);
    try {
      const criado = await api.criarLocal({ nome }, token);
      selecionarLocal(criado);
    } catch (e) { setErro(e.message); }
    finally { setCriandoLocal(false); }
  }

  async function criarArtista() {
    const nome = buscaArtista.trim();
    if (!nome) return;
    setCriandoArtista(true);
    try {
      const criado = await api.criarArtista({ nome }, token);
      adicionarArtista(criado);
    } catch (e) { setErro(e.message); }
    finally { setCriandoArtista(false); }
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    if (!formulario.localId) { setErro('Selecione ou crie um local.'); return; }
    try {
      const atualizado = await api.editarEvento(evento.id, {
        ...formulario,
        data: formulario.data ? `${formulario.data}T00:00:00.000Z` : undefined,
        artistas: idsArtistas,
      }, token);
      onSalvo(atualizado);
    } catch (e) { setErro(e.message); }
  }

  return (
    <form onSubmit={salvar} className="formulario">
      <label>
        Título
        <input value={formulario.titulo} onChange={(e) => setFormulario((a) => ({ ...a, titulo: e.target.value }))} required />
      </label>

      <label>
        Descrição
        <textarea value={formulario.descricao} onChange={(e) => setFormulario((a) => ({ ...a, descricao: e.target.value }))} rows={4} />
      </label>

      <label>
        Data
        <input type="date" value={formulario.data} onChange={(e) => setFormulario((a) => ({ ...a, data: e.target.value }))} required />
      </label>

      <div className="grade-horas">
        <label>
          Hora início
          <input type="time" value={formulario.horaInicio} onChange={(e) => setFormulario((a) => ({ ...a, horaInicio: e.target.value }))} required />
        </label>
        <label>
          Hora fim
          <input type="time" value={formulario.horaFim} onChange={(e) => setFormulario((a) => ({ ...a, horaFim: e.target.value }))} />
        </label>
      </div>

      <label>
        Ingresso
        <input value={formulario.ingresso} onChange={(e) => setFormulario((a) => ({ ...a, ingresso: e.target.value }))} placeholder="Ex: Gratuito, R$ 20..." />
      </label>

      <label>
        Link do post de divulgação
        <input value={formulario.links} onChange={(e) => setFormulario((a) => ({ ...a, links: e.target.value }))} placeholder="https://www.instagram.com/p/..." />
      </label>

      <label>
        Link para compra de ingresso
        <input value={formulario.linkIngresso} onChange={(e) => setFormulario((a) => ({ ...a, linkIngresso: e.target.value }))} placeholder="https://..." />
      </label>

      <label>
        Imagem (URL)
        <input value={formulario.imagemUrl} onChange={(e) => setFormulario((a) => ({ ...a, imagemUrl: e.target.value }))} placeholder="https://..." />
      </label>

      {/* LOCAL */}
      <div className="campo-autocomplete">
        <label>Local</label>
        <input
          value={buscaLocal}
          onChange={(e) => { setBuscaLocal(e.target.value); setFormulario((a) => ({ ...a, localId: '' })); }}
          placeholder="Digite para buscar ou criar"
          autoComplete="off"
        />
        {formulario.localId ? (
          <p className="sucesso" style={{ margin: '0.2rem 0' }}>
            Local selecionado.{' '}
            <button type="button" onClick={() => { setFormulario((a) => ({ ...a, localId: '' })); setBuscaLocal(''); }}>Trocar</button>
          </p>
        ) : (
          <>
            {sugestoesLocais.length > 0 ? (
              <ul className="lista-sugestoes">
                {sugestoesLocais.map((local) => (
                  <li key={local.id}>
                    <button type="button" onClick={() => selecionarLocal(local)}>{local.nome}{local.bairro ? ` - ${local.bairro}` : ''}</button>
                  </li>
                ))}
              </ul>
            ) : null}
            {buscaLocal.trim().length >= 2 ? (
              <button type="button" onClick={criarLocal} disabled={criandoLocal}>
                {criandoLocal ? 'Criando...' : `Criar local "${buscaLocal.trim()}"`}
              </button>
            ) : null}
          </>
        )}
      </div>

      {/* ARTISTAS */}
      <div className="campo-autocomplete">
        <label>Artistas</label>
        <input
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
      </div>

      {erro ? <p className="erro">{erro}</p> : null}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="submit">Salvar alterações</button>
        <button type="button" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

export default function PaginaEvento({ token }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [evento, setEvento] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [jaNaAgenda, setJaNaAgenda] = useState(false);
  const [editando, setEditando] = useState(false);
  const [toast, setToast] = useState({ mensagem: '', tipo: 'sucesso' });

  function mostrarToast(mensagem, tipo = 'sucesso') {
    setToast({ mensagem, tipo });
  }

  useEffect(() => {
    api.buscarEvento(id, token)
      .then(setEvento)
      .catch((e) => setErro(e.message));
  }, [id, token]);

  useEffect(() => {
    if (!token) { setJaNaAgenda(false); return; }
    api.minhaAgenda(token)
      .then((dados) => setJaNaAgenda(dados.agendaPropria.some((item) => item.evento.id === id)))
      .catch(() => setJaNaAgenda(false));
  }, [id, token]);

  async function adicionarAgenda() {
    if (!token) { mostrarToast('Faça login para adicionar eventos na agenda.', 'erro'); return; }
    if (jaNaAgenda) return;
    try {
      await api.adicionarAgenda(id, token);
      mostrarToast('Evento adicionado à sua agenda.');
      setJaNaAgenda(true);
    } catch (e) { mostrarToast(e.message, 'erro'); }
  }

  async function removerAgenda() {
    if (!token) { mostrarToast('Faça login para remover eventos da agenda.', 'erro'); return; }
    try {
      await api.removerAgenda(id, token);
      mostrarToast('Evento removido da sua agenda.');
      setJaNaAgenda(false);
    } catch (e) { mostrarToast(e.message, 'erro'); }
  }

  async function denunciar() {
    if (!token) { mostrarToast('Faça login para denunciar eventos.', 'erro'); return; }
    try {
      await api.denunciarEvento(id, motivo || 'Possível spam', token);
      mostrarToast('Denúncia enviada com sucesso.');
      setMotivo('');
    } catch (e) { mostrarToast(e.message, 'erro'); }
  }

  async function apagar() {
    if (!confirm('Tem certeza que deseja apagar este evento?')) return;
    try {
      await api.deletarEvento(id, token);
      navigate('/');
    } catch (e) { mostrarToast(e.message, 'erro'); }
  }

  if (!evento) {
    return <main className="container">{erro ? <p className="erro">{erro}</p> : <p>Carregando...</p>}</main>;
  }

  return (
    <main className="container">
      {!editando ? (
        <>
          {evento.imagemUrl ? (
            <img src={evento.imagemUrl} alt={evento.titulo} style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', borderRadius: '8px', marginBottom: '1rem' }} />
          ) : null}
          <h2>{evento.titulo}</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{evento.descricao}</p>
          <p>
            <strong>Local:</strong>{' '}
            <Link to={`/locais/${evento.local.id}`}>{evento.local.nome}</Link>
            {evento.local.endereco ? ` — ${evento.local.endereco}` : ''}
          </p>
          <p>
            <strong>Data:</strong> {new Date(evento.data).toLocaleDateString('pt-BR', { timeZone: 'America/Recife' })}
          </p>
          <p>
            <strong>Horário:</strong> {evento.horaInicio}{evento.horaFim ? ` às ${evento.horaFim}` : ''}
          </p>
          {evento.ingresso ? <p><strong>Ingresso:</strong> {evento.ingresso}</p> : null}
          {evento.links ? (
            <p>
              <strong>Divulgação:</strong>{' '}
              <a href={evento.links} target="_blank" rel="noopener noreferrer">{evento.links}</a>
            </p>
          ) : null}
          {evento.linkIngresso ? (
            <p>
              <strong>Ingresso:</strong>{' '}
              <a href={evento.linkIngresso} target="_blank" rel="noopener noreferrer">Comprar ingresso</a>
            </p>
          ) : null}

          {evento.eventoArtistas.length > 0 && (
            <>
              <h3>Artistas</h3>
              <ul>
                {evento.eventoArtistas.map((ea) => (
                  <li key={ea.artista.id}>
                    <Link to={`/artistas/${ea.artista.id}`}>{ea.artista.nome}</Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : null}

      {jaNaAgenda ? (
        <button onClick={removerAgenda}>Remover da minha agenda</button>
      ) : (
        <button onClick={adicionarAgenda}>Adicionar à minha agenda</button>
      )}

      {evento.podeEditar && (
        <section className="bloco-edicao-publica">
          {!editando ? (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setEditando(true)}>Editar evento</button>
              <button type="button" className="botao-perigo" onClick={apagar}>Apagar evento</button>
            </div>
          ) : (
            <FormularioEdicao
              evento={evento}
              token={token}
              onSalvo={(atualizado) => {
                setEvento((ant) => ({ ...ant, ...atualizado }));
                mostrarToast('Evento atualizado com sucesso.');
                setEditando(false);
              }}
              onCancelar={() => setEditando(false)}
            />
          )}
        </section>
      )}

      {!editando && (
        <section className="bloco-denuncia">
          <h3>Denunciar evento</h3>
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo da denúncia" />
          <button onClick={denunciar}>Enviar denúncia</button>
        </section>
      )}

      <Toast
        mensagem={toast.mensagem}
        tipo={toast.tipo}
        onFechar={() => setToast({ mensagem: '', tipo: 'sucesso' })}
      />
    </main>
  );
}
