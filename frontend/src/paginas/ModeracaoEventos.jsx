import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../servicos/api';

const HOJE = new Date();
HOJE.setHours(0, 0, 0, 0);

function ehPassado(dataStr) {
  return new Date(dataStr) < HOJE;
}

function badgeStatus(status) {
  return <span className={`badge-status badge-status-${status}`}>{status}</span>;
}

export default function ModeracaoEventos({ token, ehModerador }) {
  const [aba, setAba] = useState('eventos');

  // ── Eventos ──────────────────────────────────────────────
  const [eventos, setEventos] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [temMais, setTemMais] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState('');
  const [incluirPassados, setIncluirPassados] = useState(false);
  const sentinelaRef = useRef(null);

  const [editandoEventoId, setEditandoEventoId] = useState(null);
  const [formEvento, setFormEvento] = useState({
    titulo: '', descricao: '', localId: '', data: '', horaInicio: '', horaFim: '', status: 'pendente'
  });

  // ── Locais / Artistas ─────────────────────────────────────
  const [locais, setLocais] = useState([]);
  const [artistas, setArtistas] = useState([]);
  const [editandoLocalId, setEditandoLocalId] = useState(null);
  const [formLocal, setFormLocal] = useState({ nome: '', endereco: '', bairro: '', cidade: '', latitude: '', longitude: '' });
  const [editandoArtistaId, setEditandoArtistaId] = useState(null);
  const [formArtista, setFormArtista] = useState({ nome: '', descricao: '', instagram: '', website: '' });

  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  // ── Carregar eventos (paginado) ───────────────────────────
  const carregarEventos = useCallback(async (pg, q, passados, reset = false) => {
    if (!token || !ehModerador) return;
    setCarregando(true);
    try {
      const { eventos: novos, temMais: mais } = await api.listarTodosEventosModerados(token, pg, q, passados);
      setEventos((ant) => (reset ? novos : [...ant, ...novos]));
      setTemMais(mais);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, [token, ehModerador]);

  // Reset ao mudar busca ou filtro
  useEffect(() => {
    setPagina(1);
    carregarEventos(1, busca, incluirPassados, true);
  }, [busca, incluirPassados, carregarEventos]);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelaRef.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && temMais && !carregando) {
        setPagina((p) => {
          const prox = p + 1;
          carregarEventos(prox, busca, incluirPassados, false);
          return prox;
        });
      }
    }, { threshold: 0.1 });
    obs.observe(sentinelaRef.current);
    return () => obs.disconnect();
  }, [temMais, carregando, busca, incluirPassados, carregarEventos]);

  // Locais e artistas só carregam quando aba é selecionada
  useEffect(() => {
    if (!token || !ehModerador) return;
    if (aba === 'locais' && locais.length === 0) {
      api.listarLocaisModeracao(token).then(setLocais).catch((e) => setErro(e.message));
    }
    if (aba === 'artistas' && artistas.length === 0) {
      api.listarArtistasModeracao(token).then(setArtistas).catch((e) => setErro(e.message));
    }
  }, [aba, token, ehModerador]);

  function limpar() { setErro(''); setMensagem(''); }

  // ── Ações eventos ─────────────────────────────────────────
  function atualizarStatusLocal(id, novoStatus) {
    setEventos((ant) => ant.map((ev) => ev.id === id ? { ...ev, status: novoStatus } : ev));
  }

  async function aprovar(id) {
    limpar();
    try {
      await api.aprovarEvento(id, token);
      atualizarStatusLocal(id, 'aprovado');
      setMensagem('Evento aprovado.');
    } catch (e) { setErro(e.message); }
  }

  async function rejeitar(id) {
    limpar();
    try {
      await api.rejeitarEvento(id, token);
      atualizarStatusLocal(id, 'rejeitado');
      setMensagem('Evento rejeitado.');
    } catch (e) { setErro(e.message); }
  }

  async function apagarEvento(id) {
    limpar();
    if (!window.confirm('Apagar este evento?')) return;
    try {
      await api.apagarEventoModeracao(id, token);
      setEventos((ant) => ant.filter((ev) => ev.id !== id));
      setMensagem('Evento apagado.');
    } catch (e) { setErro(e.message); }
  }

  async function salvarEvento(id) {
    limpar();
    try {
      await api.editarEventoModeracao(id, { ...formEvento, data: `${formEvento.data}T00:00:00.000Z` }, token);
      setEventos((ant) => ant.map((ev) => ev.id === id ? { ...ev, ...formEvento } : ev));
      setEditandoEventoId(null);
      setMensagem('Evento atualizado.');
    } catch (e) { setErro(e.message); }
  }

  // ── Ações locais ──────────────────────────────────────────
  async function apagarLocal(id) {
    limpar();
    if (!window.confirm('Apagar este local?')) return;
    try {
      await api.apagarLocalModeracao(id, token);
      setLocais((ant) => ant.filter((l) => l.id !== id));
      setMensagem('Local apagado.');
    } catch (e) { setErro(e.message); }
  }

  async function salvarLocal(id) {
    limpar();
    try {
      await api.editarLocalModeracao(id, {
        ...formLocal,
        latitude: formLocal.latitude === '' ? null : Number(formLocal.latitude),
        longitude: formLocal.longitude === '' ? null : Number(formLocal.longitude)
      }, token);
      setLocais((ant) => ant.map((l) => l.id === id ? { ...l, ...formLocal } : l));
      setEditandoLocalId(null);
      setMensagem('Local atualizado.');
    } catch (e) { setErro(e.message); }
  }

  // ── Ações artistas ────────────────────────────────────────
  async function apagarArtista(id) {
    limpar();
    if (!window.confirm('Apagar este artista?')) return;
    try {
      await api.apagarArtistaModeracao(id, token);
      setArtistas((ant) => ant.filter((a) => a.id !== id));
      setMensagem('Artista apagado.');
    } catch (e) { setErro(e.message); }
  }

  async function salvarArtista(id) {
    limpar();
    try {
      await api.editarArtistaModeracao(id, formArtista, token);
      setArtistas((ant) => ant.map((a) => a.id === id ? { ...a, ...formArtista } : a));
      setEditandoArtistaId(null);
      setMensagem('Artista atualizado.');
    } catch (e) { setErro(e.message); }
  }

  if (!token || !ehModerador) {
    return (
      <main className="container painel-moderacao">
        <h2>Moderação de Conteúdo</h2>
        <p>Área disponível apenas para moderadores.</p>
      </main>
    );
  }

  return (
    <main className="container painel-moderacao">
      <h2>Moderação de Conteúdo</h2>

      <div className="admin-abas">
        {['eventos', 'locais', 'artistas'].map((a) => (
          <button key={a} className={`admin-aba${aba === a ? ' admin-aba-ativa' : ''}`} onClick={() => setAba(a)}>
            {a.charAt(0).toUpperCase() + a.slice(1)}
          </button>
        ))}
      </div>

      {mensagem ? <p className="sucesso">{mensagem}</p> : null}
      {erro ? <p className="erro">{erro}</p> : null}

      {/* ── ABA EVENTOS ── */}
      {aba === 'eventos' ? (
        <>
          <div className="moderacao-filtros">
            <input
              className="moderacao-busca"
              placeholder="Buscar por título ou criador..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <label className="moderacao-toggle">
              <input type="checkbox" checked={incluirPassados} onChange={(e) => setIncluirPassados(e.target.checked)} />
              Mostrar eventos passados
            </label>
          </div>

          <section className="lista-eventos">
            {eventos.map((evento) => {
              const passado = ehPassado(evento.data);
              const pendente = evento.status === 'pendente' || evento.status === 'sinalizado';
              return (
                <article
                  key={evento.id}
                  className={`card-evento${pendente ? ' moderacao-card moderacao-pendente' : ''}${passado ? ' moderacao-passado' : ''}`}
                >
                  <div className="moderacao-card-topo">
                    <h3>{evento.titulo}</h3>
                    {badgeStatus(evento.status)}
                  </div>
                  <p>{evento.descricao}</p>
                  <p><strong>Criado por:</strong> {evento.criador?.nome}</p>
                  <p>
                    <strong>Data/Hora:</strong>{' '}
                    {new Date(evento.data).toLocaleDateString('pt-BR', { timeZone: 'America/Recife' })} - {evento.horaInicio}
                  </p>
                  <p><strong>Local:</strong> {evento.local?.nome}</p>
                  {evento._count?.denuncias > 0 ? (
                    <p><strong>Denúncias:</strong> {evento._count.denuncias}</p>
                  ) : null}

                  <div className="acoes-card">
                    <button onClick={() => aprovar(evento.id)}>Aprovar</button>
                    <button onClick={() => rejeitar(evento.id)}>Rejeitar</button>
                    <button onClick={() => {
                      setEditandoEventoId(evento.id);
                      setFormEvento({
                        titulo: evento.titulo || '',
                        descricao: evento.descricao || '',
                        localId: evento.localId || '',
                        data: (evento.data || '').slice(0, 10),
                        horaInicio: evento.horaInicio || '',
                        horaFim: evento.horaFim || '',
                        status: evento.status || 'pendente'
                      });
                    }}>Editar</button>
                    <button onClick={() => apagarEvento(evento.id)}>Apagar</button>
                  </div>

                  {evento.denuncias?.length ? (
                    <section className="moderacao-denuncias">
                      <strong>Últimas denúncias</strong>
                      <ul>
                        {evento.denuncias.map((d) => (
                          <li key={d.id}>{d.denunciante?.nome || 'Usuário'}: {d.motivo}</li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {editandoEventoId === evento.id ? (
                    <section className="formulario moderacao-form">
                      <input value={formEvento.titulo} onChange={(e) => setFormEvento((a) => ({ ...a, titulo: e.target.value }))} placeholder="Título" />
                      <textarea value={formEvento.descricao} onChange={(e) => setFormEvento((a) => ({ ...a, descricao: e.target.value }))} placeholder="Descrição" />
                      <input type="date" value={formEvento.data} onChange={(e) => setFormEvento((a) => ({ ...a, data: e.target.value }))} />
                      <input type="time" value={formEvento.horaInicio} onChange={(e) => setFormEvento((a) => ({ ...a, horaInicio: e.target.value }))} />
                      <input type="time" value={formEvento.horaFim} onChange={(e) => setFormEvento((a) => ({ ...a, horaFim: e.target.value }))} />
                      <select value={formEvento.status} onChange={(e) => setFormEvento((a) => ({ ...a, status: e.target.value }))}>
                        <option value="pendente">pendente</option>
                        <option value="aprovado">aprovado</option>
                        <option value="rejeitado">rejeitado</option>
                        <option value="sinalizado">sinalizado</option>
                      </select>
                      <div className="acoes-card">
                        <button onClick={() => salvarEvento(evento.id)}>Salvar</button>
                        <button onClick={() => setEditandoEventoId(null)}>Cancelar</button>
                      </div>
                    </section>
                  ) : null}
                </article>
              );
            })}

            {carregando ? <p className="moderacao-carregando">Carregando...</p> : null}
            <div ref={sentinelaRef} style={{ height: 1 }} />
          </section>
        </>
      ) : null}

      {/* ── ABA LOCAIS ── */}
      {aba === 'locais' ? (
        <section className="lista-eventos">
          {locais.map((local) => (
            <article key={local.id} className="card-evento moderacao-card">
              <h3>{local.nome}</h3>
              <p>{local.endereco}</p>
              <p><strong>Bairro:</strong> {local.bairro} | <strong>Cidade:</strong> {local.cidade}</p>
              <p><strong>Eventos vinculados:</strong> {local._count?.eventos || 0}</p>
              <div className="acoes-card">
                <button onClick={() => {
                  setEditandoLocalId(local.id);
                  setFormLocal({ nome: local.nome || '', endereco: local.endereco || '', bairro: local.bairro || '', cidade: local.cidade || '', latitude: local.latitude ?? '', longitude: local.longitude ?? '' });
                }}>Editar</button>
                <button onClick={() => apagarLocal(local.id)}>Apagar</button>
              </div>
              {editandoLocalId === local.id ? (
                <section className="formulario moderacao-form">
                  <input value={formLocal.nome} onChange={(e) => setFormLocal((a) => ({ ...a, nome: e.target.value }))} />
                  <input value={formLocal.endereco} onChange={(e) => setFormLocal((a) => ({ ...a, endereco: e.target.value }))} />
                  <input value={formLocal.bairro} onChange={(e) => setFormLocal((a) => ({ ...a, bairro: e.target.value }))} />
                  <input value={formLocal.cidade} onChange={(e) => setFormLocal((a) => ({ ...a, cidade: e.target.value }))} />
                  <input type="number" step="0.0000001" value={formLocal.latitude} onChange={(e) => setFormLocal((a) => ({ ...a, latitude: e.target.value }))} />
                  <input type="number" step="0.0000001" value={formLocal.longitude} onChange={(e) => setFormLocal((a) => ({ ...a, longitude: e.target.value }))} />
                  <div className="acoes-card">
                    <button onClick={() => salvarLocal(local.id)}>Salvar</button>
                    <button onClick={() => setEditandoLocalId(null)}>Cancelar</button>
                  </div>
                </section>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {/* ── ABA ARTISTAS ── */}
      {aba === 'artistas' ? (
        <section className="lista-eventos">
          {artistas.map((artista) => (
            <article key={artista.id} className="card-evento moderacao-card">
              <h3>{artista.nome}</h3>
              <p>{artista.descricao || 'Sem descrição'}</p>
              <p><strong>Vínculos em eventos:</strong> {artista._count?.eventoArtistas || 0}</p>
              <div className="acoes-card">
                <button onClick={() => {
                  setEditandoArtistaId(artista.id);
                  setFormArtista({ nome: artista.nome || '', descricao: artista.descricao || '', instagram: artista.instagram || '', website: artista.website || '' });
                }}>Editar</button>
                <button onClick={() => apagarArtista(artista.id)}>Apagar</button>
              </div>
              {editandoArtistaId === artista.id ? (
                <section className="formulario moderacao-form">
                  <input value={formArtista.nome} onChange={(e) => setFormArtista((a) => ({ ...a, nome: e.target.value }))} />
                  <textarea value={formArtista.descricao} onChange={(e) => setFormArtista((a) => ({ ...a, descricao: e.target.value }))} />
                  <input value={formArtista.instagram} onChange={(e) => setFormArtista((a) => ({ ...a, instagram: e.target.value }))} />
                  <input value={formArtista.website} onChange={(e) => setFormArtista((a) => ({ ...a, website: e.target.value }))} />
                  <div className="acoes-card">
                    <button onClick={() => salvarArtista(artista.id)}>Salvar</button>
                    <button onClick={() => setEditandoArtistaId(null)}>Cancelar</button>
                  </div>
                </section>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
