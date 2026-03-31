import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../servicos/api';

const FUNCOES = ['usuario', 'moderador', 'administrador'];
const STATUS_OPTS = ['pendente', 'aprovado', 'rejeitado', 'sinalizado'];

// ── Ordenação ─────────────────────────────────────────────────────────────────

function useOrdenar(dados, campoInicial, direcaoInicial = 'asc') {
  const [ord, setOrd] = useState({ campo: campoInicial, direcao: direcaoInicial });

  function alternar(campo) {
    setOrd(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc'
    }));
  }

  const ordenados = [...dados].sort((a, b) => {
    let va = a[ord.campo] ?? '';
    let vb = b[ord.campo] ?? '';
    // suporte a caminhos aninhados simples (ex: "criador.nome")
    if (ord.campo.includes('.')) {
      const partes = ord.campo.split('.');
      va = partes.reduce((o, k) => o?.[k], a) ?? '';
      vb = partes.reduce((o, k) => o?.[k], b) ?? '';
    }
    const cmp = typeof va === 'number' && typeof vb === 'number'
      ? va - vb
      : String(va).localeCompare(String(vb), 'pt-BR');
    return ord.direcao === 'asc' ? cmp : -cmp;
  });

  return { ordenados, ord, alternar };
}

function Th({ campo, label, ord, alternar, style }) {
  const ativo = ord.campo === campo;
  return (
    <th
      onClick={() => alternar(campo)}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', ...style }}
      title={`Ordenar por ${label}`}
    >
      {label} <span style={{ opacity: ativo ? 1 : 0.3, fontSize: '0.7em' }}>{ativo ? (ord.direcao === 'asc' ? '↑' : '↓') : '↕'}</span>
    </th>
  );
}

// ── Métricas ──────────────────────────────────────────────────────────────────

function AbaMetricas({ usuarios, eventos }) {
  const totalPendentes = eventos.filter(e => e.status === 'pendente').length;
  const { ordenados, ord, alternar } = useOrdenar(usuarios, 'score', 'desc');

  return (
    <div>
      <div className="admin-cards">
        <div className="admin-card"><span>{usuarios.length}</span>Usuários</div>
        <div className="admin-card"><span>{eventos.length}</span>Eventos</div>
        <div className="admin-card"><span>{totalPendentes}</span>Pendentes</div>
        <div className="admin-card">
          <span>{new Set(eventos.map(e => e.localId)).size}</span>Locais
        </div>
      </div>

      <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem' }}>Ranking de engajamento</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-tabela">
          <thead>
            <tr>
              <th style={{ whiteSpace: 'nowrap' }}>#</th>
              <Th campo="nome" label="Nome" ord={ord} alternar={alternar} />
              <Th campo="score" label="Score" ord={ord} alternar={alternar} />
              <Th campo="_count.eventosCriados" label="Eventos criados" ord={ord} alternar={alternar} />
              <Th campo="_count.eventosModerados" label="Moderações" ord={ord} alternar={alternar} />
              <Th campo="_count.agendaEventos" label="Na agenda" ord={ord} alternar={alternar} />
              <Th campo="reputacao" label="Reputação" ord={ord} alternar={alternar} />
            </tr>
          </thead>
          <tbody>
            {ordenados.map((u, i) => (
              <tr key={u.id}>
                <td>{i + 1}</td>
                <td>{u.nome}</td>
                <td><strong>{u.score}</strong></td>
                <td>{u._count.eventosCriados}</td>
                <td>{u._count.eventosModerados}</td>
                <td>{u._count.agendaEventos}</td>
                <td>{u.reputacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Modal trocar senha ────────────────────────────────────────────────────────

function ModalSenha({ usuario, token, onFechar }) {
  const [novaSenha, setNovaSenha] = useState('');
  const [erro, setErro] = useState(null);
  const [ok, setOk] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    setErro(null);
    try {
      await api.adminAlterarSenhaUsuario(usuario.id, novaSenha, token);
      setOk(true);
      setTimeout(onFechar, 1200);
    } catch (err) {
      setErro(err.message);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="modal-conteudo" style={{ maxWidth: 380 }}>
        <div className="modal-topo">
          <h2>Trocar senha — {usuario.nome}</h2>
          <button className="btn-fechar-modal" onClick={onFechar}>✕</button>
        </div>
        {ok ? <p style={{ color: 'green' }}>Senha alterada!</p> : (
          <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input type="password" placeholder="Nova senha (mín. 6 caracteres)" value={novaSenha}
              onChange={e => setNovaSenha(e.target.value)} required minLength={6} />
            {erro && <p style={{ color: '#c0392b', margin: 0, fontSize: '0.85rem' }}>{erro}</p>}
            <button type="submit">Salvar nova senha</button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Modal editar evento ───────────────────────────────────────────────────────

function ModalEditarEvento({ evento, token, locais, onSalvo, onFechar }) {
  const [form, setForm] = useState({
    titulo: evento.titulo,
    descricao: evento.descricao,
    localId: evento.localId,
    data: evento.data ? evento.data.slice(0, 10) : '',
    horaInicio: evento.horaInicio,
    horaFim: evento.horaFim || '',
    status: evento.status,
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  function set(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const atualizado = await api.adminEditarEvento(evento.id, form, token);
      onSalvo(atualizado);
      onFechar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="modal-conteudo" style={{ maxWidth: 560 }}>
        <div className="modal-topo">
          <h2>Editar evento</h2>
          <button className="btn-fechar-modal" onClick={onFechar}>✕</button>
        </div>
        <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ fontSize: '0.8rem', color: '#666' }}>Título
            <input value={form.titulo} onChange={e => set('titulo', e.target.value)} required style={{ display: 'block', width: '100%', marginTop: '0.2rem' }} />
          </label>
          <label style={{ fontSize: '0.8rem', color: '#666' }}>Descrição
            <textarea value={form.descricao} onChange={e => set('descricao', e.target.value)} rows={3} style={{ display: 'block', width: '100%', marginTop: '0.2rem', resize: 'vertical' }} />
          </label>
          <label style={{ fontSize: '0.8rem', color: '#666' }}>Local
            <select value={form.localId} onChange={e => set('localId', e.target.value)} style={{ display: 'block', width: '100%', marginTop: '0.2rem' }}>
              {locais.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </label>
          <div className="grade-horas">
            <label style={{ fontSize: '0.8rem', color: '#666' }}>Data
              <input type="date" value={form.data} onChange={e => set('data', e.target.value)} required style={{ display: 'block', width: '100%', marginTop: '0.2rem' }} />
            </label>
            <label style={{ fontSize: '0.8rem', color: '#666' }}>Status
              <select value={form.status} onChange={e => set('status', e.target.value)} style={{ display: 'block', width: '100%', marginTop: '0.2rem' }}>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label style={{ fontSize: '0.8rem', color: '#666' }}>Hora início
              <input type="time" value={form.horaInicio} onChange={e => set('horaInicio', e.target.value)} required style={{ display: 'block', width: '100%', marginTop: '0.2rem' }} />
            </label>
            <label style={{ fontSize: '0.8rem', color: '#666' }}>Hora fim
              <input type="time" value={form.horaFim} onChange={e => set('horaFim', e.target.value)} style={{ display: 'block', width: '100%', marginTop: '0.2rem' }} />
            </label>
          </div>
          {erro && <p style={{ color: '#c0392b', margin: 0, fontSize: '0.85rem' }}>{erro}</p>}
          <button type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar alterações'}</button>
        </form>
      </div>
    </div>
  );
}

// ── Perfil de usuário (drill-down) ────────────────────────────────────────────

function PerfilUsuario({ usuarioId, token, onVoltar }) {
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api.adminBuscarUsuario(usuarioId, token)
      .then(setPerfil)
      .catch(e => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [usuarioId, token]);

  if (carregando) return <p>Carregando perfil...</p>;
  if (erro) return <p style={{ color: '#c0392b' }}>{erro}</p>;
  if (!perfil) return null;

  const dataCriacao = new Date(perfil.criadoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Recife' });

  return (
    <div>
      <button onClick={onVoltar} style={{ marginBottom: '1.25rem', background: 'transparent', border: '1px solid #ccc', color: '#555', boxShadow: 'none', fontSize: '0.85rem', padding: '0.3rem 0.75rem' }}>
        ← Voltar
      </button>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>{perfil.nome}</h2>
        <span className={`badge-funcao badge-funcao-${perfil.funcao}`}>{perfil.funcao}</span>
        {perfil.verificado && <span className="badge-funcao" style={{ background: '#d1fae5', color: '#065f46' }}>verificado</span>}
      </div>
      <p style={{ fontSize: '0.85rem', color: '#666', margin: '0 0 0.25rem' }}>{perfil.email} · desde {dataCriacao}</p>
      {perfil.bio && <p style={{ fontSize: '0.88rem', margin: '0 0 1.5rem' }}>{perfil.bio}</p>}

      <div className="admin-cards" style={{ marginBottom: '2rem' }}>
        <div className="admin-card"><span>{perfil.eventosCriados.length}</span>Eventos criados</div>
        <div className="admin-card"><span>{perfil.eventosModerados.length}</span>Moderações</div>
        <div className="admin-card"><span>{perfil.locaisCriados.length}</span>Locais criados</div>
        <div className="admin-card"><span>{perfil.artistasCriados.length}</span>Artistas criados</div>
        <div className="admin-card"><span>{perfil.agendaEventos.length}</span>Na agenda</div>
        <div className="admin-card"><span>{perfil.denuncias.length}</span>Denúncias</div>
        <div className="admin-card"><span>{perfil.reputacao}</span>Reputação</div>
      </div>

      {perfil.eventosCriados.length > 0 && (
        <SecaoPerfil titulo="Eventos criados">
          <table className="admin-tabela">
            <thead><tr><th>Título</th><th>Data</th><th>Status</th><th>Local</th></tr></thead>
            <tbody>
              {perfil.eventosCriados.map(e => (
                <tr key={e.id}>
                  <td>{e.titulo}</td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                    {new Date(e.data).toLocaleDateString('pt-BR', { timeZone: 'America/Recife' })}
                  </td>
                  <td><span className={`badge-status badge-status-${e.status}`}>{e.status}</span></td>
                  <td style={{ fontSize: '0.82rem' }}>{e.local?.nome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SecaoPerfil>
      )}

      {perfil.eventosModerados.length > 0 && (
        <SecaoPerfil titulo="Moderações realizadas">
          <table className="admin-tabela">
            <thead><tr><th>Evento</th><th>Status final</th><th>Data moderação</th></tr></thead>
            <tbody>
              {perfil.eventosModerados.map(e => (
                <tr key={e.id}>
                  <td>{e.titulo}</td>
                  <td><span className={`badge-status badge-status-${e.status}`}>{e.status}</span></td>
                  <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {e.moderadoEm ? new Date(e.moderadoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Recife' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SecaoPerfil>
      )}

      {perfil.locaisCriados.length > 0 && (
        <SecaoPerfil titulo="Locais criados">
          <table className="admin-tabela">
            <thead><tr><th>Nome</th><th>Bairro</th><th>Criado em</th></tr></thead>
            <tbody>
              {perfil.locaisCriados.map(l => (
                <tr key={l.id}>
                  <td>{l.nome}</td>
                  <td style={{ fontSize: '0.82rem' }}>{l.bairro}</td>
                  <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {new Date(l.criadoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Recife' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SecaoPerfil>
      )}

      {perfil.artistasCriados.length > 0 && (
        <SecaoPerfil titulo="Artistas criados">
          <table className="admin-tabela">
            <thead><tr><th>Nome</th><th>Instagram</th><th>Criado em</th></tr></thead>
            <tbody>
              {perfil.artistasCriados.map(a => (
                <tr key={a.id}>
                  <td>{a.nome}</td>
                  <td style={{ fontSize: '0.82rem' }}>{a.instagram || '—'}</td>
                  <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {new Date(a.criadoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Recife' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SecaoPerfil>
      )}

      {perfil.agendaEventos.length > 0 && (
        <SecaoPerfil titulo="Agenda pessoal">
          <table className="admin-tabela">
            <thead><tr><th>Evento</th><th>Data do evento</th><th>Local</th><th>Adicionado em</th></tr></thead>
            <tbody>
              {perfil.agendaEventos.map(item => (
                <tr key={item.id}>
                  <td>{item.evento.titulo}</td>
                  <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {new Date(item.evento.data).toLocaleDateString('pt-BR', { timeZone: 'America/Recife' })}
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>{item.evento.local?.nome}</td>
                  <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {new Date(item.criadoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Recife' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SecaoPerfil>
      )}

      {perfil.denuncias.length > 0 && (
        <SecaoPerfil titulo="Denúncias feitas">
          <table className="admin-tabela">
            <thead><tr><th>Evento denunciado</th><th>Motivo</th><th>Data</th></tr></thead>
            <tbody>
              {perfil.denuncias.map(d => (
                <tr key={d.id}>
                  <td style={{ fontSize: '0.85rem' }}>{d.evento.titulo}</td>
                  <td style={{ fontSize: '0.82rem' }}>{d.motivo}</td>
                  <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {new Date(d.criadoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Recife' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SecaoPerfil>
      )}
    </div>
  );
}

function SecaoPerfil({ titulo, children }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ fontSize: '0.88rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#888', marginBottom: '0.6rem' }}>{titulo}</h3>
      <div style={{ overflowX: 'auto' }}>{children}</div>
    </div>
  );
}

// ── Aba Usuários ──────────────────────────────────────────────────────────────

function AbaUsuarios({ usuarios, setUsuarios, token }) {
  const [editando, setEditando] = useState({});
  const [modalSenha, setModalSenha] = useState(null);
  const [salvando, setSalvando] = useState(null);
  const [perfilAberto, setPerfilAberto] = useState(null);
  const { ordenados, ord, alternar } = useOrdenar(usuarios, 'score', 'desc');

  function iniciarEdicao(u) {
    setEditando(prev => ({ ...prev, [u.id]: { funcao: u.funcao, verificado: u.verificado, reputacao: u.reputacao } }));
  }
  function cancelarEdicao(id) {
    setEditando(prev => { const n = { ...prev }; delete n[id]; return n; });
  }
  async function salvarEdicao(u) {
    setSalvando(u.id);
    try {
      const atualizado = await api.adminAtualizarUsuario(u.id, editando[u.id], token);
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, ...atualizado } : x));
      cancelarEdicao(u.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(null);
    }
  }

  if (perfilAberto) {
    return <PerfilUsuario usuarioId={perfilAberto} token={token} onVoltar={() => setPerfilAberto(null)} />;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      {modalSenha && <ModalSenha usuario={modalSenha} token={token} onFechar={() => setModalSenha(null)} />}
      <table className="admin-tabela">
        <thead>
          <tr>
            <Th campo="nome" label="Nome" ord={ord} alternar={alternar} />
            <Th campo="email" label="Email" ord={ord} alternar={alternar} />
            <Th campo="funcao" label="Função" ord={ord} alternar={alternar} />
            <Th campo="verificado" label="Verificado" ord={ord} alternar={alternar} />
            <Th campo="reputacao" label="Reputação" ord={ord} alternar={alternar} />
            <Th campo="score" label="Score" ord={ord} alternar={alternar} />
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {ordenados.map(u => {
            const em = editando[u.id];
            return (
              <tr key={u.id}>
                <td>
                  <button onClick={() => setPerfilAberto(u.id)} style={{ background: 'none', border: 'none', boxShadow: 'none', padding: 0, color: 'var(--primaria)', cursor: 'pointer', fontWeight: 600, textAlign: 'left' }}>
                    {u.nome}
                  </button>
                </td>
                <td style={{ fontSize: '0.8rem', color: '#666' }}>{u.email}</td>
                <td>
                  {em ? (
                    <select value={em.funcao} onChange={e => setEditando(prev => ({ ...prev, [u.id]: { ...em, funcao: e.target.value } }))}>
                      {FUNCOES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  ) : <span className={`badge-funcao badge-funcao-${u.funcao}`}>{u.funcao}</span>}
                </td>
                <td>
                  {em ? (
                    <input type="checkbox" checked={em.verificado} onChange={e => setEditando(prev => ({ ...prev, [u.id]: { ...em, verificado: e.target.checked } }))} />
                  ) : (u.verificado ? '✓' : '—')}
                </td>
                <td>
                  {em ? (
                    <input type="number" value={em.reputacao} style={{ width: 70 }} onChange={e => setEditando(prev => ({ ...prev, [u.id]: { ...em, reputacao: Number(e.target.value) } }))} />
                  ) : u.reputacao}
                </td>
                <td><strong>{u.score}</strong></td>
                <td style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {em ? (
                    <>
                      <button onClick={() => salvarEdicao(u)} disabled={salvando === u.id} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                        {salvando === u.id ? '...' : 'Salvar'}
                      </button>
                      <button onClick={() => cancelarEdicao(u.id)} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'transparent', border: '1px solid #ccc', color: '#555', boxShadow: 'none' }}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button onClick={() => iniciarEdicao(u)} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>Editar</button>
                  )}
                  <button onClick={() => setModalSenha(u)} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'transparent', border: '1px solid #ccc', color: '#555', boxShadow: 'none' }}>Senha</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Aba Eventos ───────────────────────────────────────────────────────────────

function AbaEventos({ eventos, setEventos, token }) {
  const [apagando, setApagando] = useState(null);
  const [editandoEvento, setEditandoEvento] = useState(null);
  const [locais, setLocais] = useState([]);
  const { ordenados, ord, alternar } = useOrdenar(eventos, 'data', 'desc');

  useEffect(() => {
    api.listarLocais().then(setLocais).catch(() => {});
  }, []);

  async function apagar(id) {
    if (!window.confirm('Apagar este evento permanentemente?')) return;
    setApagando(id);
    try {
      await api.adminApagarEvento(id, token);
      setEventos(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      alert(err.message);
    } finally {
      setApagando(null);
    }
  }

  function aoSalvarEvento(atualizado) {
    setEventos(prev => prev.map(e => e.id === atualizado.id ? { ...e, ...atualizado } : e));
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      {editandoEvento && (
        <ModalEditarEvento
          evento={editandoEvento}
          token={token}
          locais={locais}
          onSalvo={aoSalvarEvento}
          onFechar={() => setEditandoEvento(null)}
        />
      )}
      <table className="admin-tabela">
        <thead>
          <tr>
            <Th campo="titulo" label="Título" ord={ord} alternar={alternar} />
            <Th campo="data" label="Data" ord={ord} alternar={alternar} />
            <Th campo="status" label="Status" ord={ord} alternar={alternar} />
            <Th campo="criador.nome" label="Criador" ord={ord} alternar={alternar} />
            <Th campo="local.nome" label="Local" ord={ord} alternar={alternar} />
            <Th campo="_count.denuncias" label="Denúncias" ord={ord} alternar={alternar} style={{ textAlign: 'center' }} />
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {ordenados.map(e => (
            <tr key={e.id}>
              <td>{e.titulo}</td>
              <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                {new Date(e.data).toLocaleDateString('pt-BR', { timeZone: 'America/Recife' })}
              </td>
              <td><span className={`badge-status badge-status-${e.status}`}>{e.status}</span></td>
              <td style={{ fontSize: '0.8rem' }}>{e.criador?.nome}</td>
              <td style={{ fontSize: '0.8rem' }}>{e.local?.nome}</td>
              <td style={{ textAlign: 'center' }}>{e._count?.denuncias || 0}</td>
              <td style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  onClick={() => setEditandoEvento(e)}
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                >
                  Editar
                </button>
                <button
                  onClick={() => apagar(e.id)}
                  disabled={apagando === e.id}
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#c0392b', border: 'none', color: '#fff', boxShadow: 'none' }}
                >
                  {apagando === e.id ? '...' : 'Apagar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function PaginaAdmin({ token, ehAdmin }) {
  const [aba, setAba] = useState('usuarios');
  const [usuarios, setUsuarios] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!ehAdmin) return;
    Promise.all([api.adminListarUsuarios(token), api.adminListarEventos(token)])
      .then(([u, e]) => { setUsuarios(u); setEventos(e); })
      .catch(e => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [token, ehAdmin]);

  if (!ehAdmin) return <Navigate to="/" replace />;

  return (
    <main className="container" style={{ maxWidth: 1100 }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Painel de Administração</h1>
      {erro && <p style={{ color: '#c0392b' }}>{erro}</p>}
      {carregando ? <p>Carregando...</p> : (
        <>
          <div className="admin-abas">
            {[['usuarios', 'Usuários'], ['eventos', 'Eventos'], ['metricas', 'Métricas']].map(([id, label]) => (
              <button key={id} className={`admin-aba${aba === id ? ' admin-aba-ativa' : ''}`} onClick={() => setAba(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="admin-conteudo">
            {aba === 'usuarios' && <AbaUsuarios usuarios={usuarios} setUsuarios={setUsuarios} token={token} />}
            {aba === 'eventos' && <AbaEventos eventos={eventos} setEventos={setEventos} token={token} />}
            {aba === 'metricas' && <AbaMetricas usuarios={usuarios} eventos={eventos} />}
          </div>
        </>
      )}
    </main>
  );
}
