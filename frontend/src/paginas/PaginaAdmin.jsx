import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../servicos/api';

const FUNCOES = ['usuario', 'moderador', 'administrador'];
const STATUS = ['pendente', 'aprovado', 'rejeitado', 'sinalizado'];

// ── Métricas ──────────────────────────────────────────────────────────────────

function AbaMetricas({ usuarios, eventos }) {
  const totalPendentes = eventos.filter(e => e.status === 'pendente').length;

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
      <table className="admin-tabela">
        <thead>
          <tr>
            <th>#</th>
            <th>Nome</th>
            <th>Score</th>
            <th>Eventos criados</th>
            <th>Moderações</th>
            <th>Na agenda</th>
            <th>Reputação</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u, i) => (
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
  );
}

// ── Usuários ──────────────────────────────────────────────────────────────────

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
    } catch (e) {
      setErro(e.message);
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
            <input
              type="password"
              placeholder="Nova senha (mín. 6 caracteres)"
              value={novaSenha}
              onChange={e => setNovaSenha(e.target.value)}
              required
              minLength={6}
            />
            {erro && <p style={{ color: '#c0392b', margin: 0, fontSize: '0.85rem' }}>{erro}</p>}
            <button type="submit">Salvar nova senha</button>
          </form>
        )}
      </div>
    </div>
  );
}

function AbaUsuarios({ usuarios, setUsuarios, token }) {
  const [editando, setEditando] = useState({}); // id → campos em edição
  const [modalSenha, setModalSenha] = useState(null);
  const [salvando, setSalvando] = useState(null);

  function iniciarEdicao(u) {
    setEditando(prev => ({
      ...prev,
      [u.id]: { funcao: u.funcao, verificado: u.verificado, reputacao: u.reputacao }
    }));
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
    } catch (e) {
      alert(e.message);
    } finally {
      setSalvando(null);
    }
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      {modalSenha && (
        <ModalSenha usuario={modalSenha} token={token} onFechar={() => setModalSenha(null)} />
      )}
      <table className="admin-tabela">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Função</th>
            <th>Verificado</th>
            <th>Reputação</th>
            <th>Score</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map(u => {
            const em = editando[u.id];
            return (
              <tr key={u.id}>
                <td>{u.nome}</td>
                <td style={{ fontSize: '0.8rem', color: '#666' }}>{u.email}</td>
                <td>
                  {em ? (
                    <select value={em.funcao} onChange={e => setEditando(prev => ({ ...prev, [u.id]: { ...em, funcao: e.target.value } }))}>
                      {FUNCOES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  ) : (
                    <span className={`badge-funcao badge-funcao-${u.funcao}`}>{u.funcao}</span>
                  )}
                </td>
                <td>
                  {em ? (
                    <input type="checkbox" checked={em.verificado} onChange={e => setEditando(prev => ({ ...prev, [u.id]: { ...em, verificado: e.target.checked } }))} />
                  ) : (
                    u.verificado ? '✓' : '—'
                  )}
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
                    <button onClick={() => iniciarEdicao(u)} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                      Editar
                    </button>
                  )}
                  <button onClick={() => setModalSenha(u)} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'transparent', border: '1px solid #ccc', color: '#555', boxShadow: 'none' }}>
                    Senha
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Eventos ───────────────────────────────────────────────────────────────────

function AbaEventos({ eventos, setEventos, token }) {
  const [apagando, setApagando] = useState(null);

  async function apagar(id) {
    if (!window.confirm('Apagar este evento permanentemente?')) return;
    setApagando(id);
    try {
      await api.adminApagarEvento(id, token);
      setEventos(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      alert(e.message);
    } finally {
      setApagando(null);
    }
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="admin-tabela">
        <thead>
          <tr>
            <th>Título</th>
            <th>Data</th>
            <th>Status</th>
            <th>Criador</th>
            <th>Local</th>
            <th>Denúncias</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {eventos.map(e => (
            <tr key={e.id}>
              <td>{e.titulo}</td>
              <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                {new Date(e.data).toLocaleDateString('pt-BR', { timeZone: 'America/Recife' })}
              </td>
              <td><span className={`badge-status badge-status-${e.status}`}>{e.status}</span></td>
              <td style={{ fontSize: '0.8rem' }}>{e.criador?.nome}</td>
              <td style={{ fontSize: '0.8rem' }}>{e.local?.nome}</td>
              <td style={{ textAlign: 'center' }}>{e._count?.denuncias || 0}</td>
              <td>
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
    Promise.all([
      api.adminListarUsuarios(token),
      api.adminListarEventos(token),
    ])
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
              <button
                key={id}
                className={`admin-aba${aba === id ? ' admin-aba-ativa' : ''}`}
                onClick={() => setAba(id)}
              >
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
