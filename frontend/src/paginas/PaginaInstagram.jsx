import { useCallback, useEffect, useRef, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const CHAVE_ULTIMO_VISTO = 'agenda-cultural-recife:instagram-ultimo-visto';

// ── Login ──────────────────────────────────────────────────────────────────────

function FormLogin({ onConectado }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const r = await fetch(`${API}/instagram/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha }),
      });
      const dados = await r.json();
      if (!r.ok) throw new Error(dados.erro || 'Erro ao fazer login.');
      onConectado(dados.usuario);
    } catch (e) {
      const url = e.message.match(/https:\/\/\S+/)?.[0];
      setErro({ texto: e.message, url });
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={estilosLogin.container}>
      <h2 style={estilosLogin.titulo}>Conectar conta do Instagram</h2>
      <p style={estilosLogin.desc}>
        Necessário para buscar posts de perfis públicos. As credenciais não são armazenadas —
        apenas o cookie de sessão fica salvo localmente no servidor.
      </p>
      <form onSubmit={handleSubmit} style={estilosLogin.form}>
        <input
          type="text"
          placeholder="Usuário (@handle)"
          value={usuario}
          onChange={e => setUsuario(e.target.value)}
          style={estilosLogin.input}
          autoComplete="username"
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          style={estilosLogin.input}
          autoComplete="current-password"
          required
        />
        {erro && (
          <div style={estilosLogin.erro}>
            {erro.url ? (
              <>
                <p style={{ margin: '0 0 0.4rem' }}>Instagram exigiu verificação de segurança.</p>
                <a href={erro.url} target="_blank" rel="noreferrer" style={estilosLogin.linkCheckpoint}>
                  Clique aqui para verificar sua conta →
                </a>
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem' }}>Depois de verificar, tente o login novamente.</p>
              </>
            ) : (
              <p style={{ margin: 0 }}>{erro.texto}</p>
            )}
          </div>
        )}
        <button type="submit" style={estilosLogin.botao} disabled={carregando}>
          {carregando ? 'Conectando...' : 'Conectar'}
        </button>
      </form>
    </div>
  );
}

// ── Card de post ───────────────────────────────────────────────────────────────

function CardPost({ post, novo, refPrimeiro }) {
  const [expandida, setExpandida] = useState(false);
  const longa = (post.legenda || '').length > 200;

  return (
    <article className="card-post-instagram" ref={refPrimeiro}>
      {novo && <span className="badge-novo-insta">novo</span>}
      <div className="post-cabecalho-perfil">
        {post.fotoPerfil ? (
          <img
            src={post.fotoPerfil}
            className="post-foto-perfil"
            alt=""
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="post-foto-perfil" style={{ background: '#e0e0e0' }} />
        )}
        <a href={post.urlPerfil} target="_blank" rel="noreferrer" className="post-handle-link">
          @{post.handle}
        </a>
        <span className="post-data-instagram">{post.dataFormatada}</span>
      </div>
      {post.thumbnail && (
        <a href={post.url} target="_blank" rel="noreferrer">
          <img
            src={post.thumbnail}
            className="post-thumbnail-instagram"
            alt="thumbnail"
            onError={e => { e.target.style.display = 'none'; }}
          />
        </a>
      )}
      {post.legenda && (
        <div className="post-legenda-instagram">
          <p>
            {expandida ? post.legenda : post.legenda.slice(0, 200)}
            {longa && !expandida && '…'}
          </p>
          {longa && (
            <button onClick={() => setExpandida(v => !v)}>
              {expandida ? 'ver menos ↑' : 'ver mais ↓'}
            </button>
          )}
        </div>
      )}
      <a href={post.url} target="_blank" rel="noreferrer" className="post-link-instagram">
        Ver no Instagram →
      </a>
    </article>
  );
}

// ── Sidebar de perfis ──────────────────────────────────────────────────────────

function SidebarPerfis({ perfis, onPerfilAdicionado }) {
  const [novoHandle, setNovoHandle] = useState('');
  const [adicionando, setAdicionando] = useState(false);
  const [erro, setErro] = useState(null);

  async function handleAdicionar(e) {
    e.preventDefault();
    const handle = novoHandle.trim().replace(/^@/, '');
    if (!handle) return;
    setErro(null);
    setAdicionando(true);
    try {
      const r = await fetch(`${API}/instagram/perfis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle }),
      });
      const dados = await r.json();
      if (!r.ok) throw new Error(dados.erro || 'Erro ao adicionar perfil.');
      setNovoHandle('');
      onPerfilAdicionado(dados.perfis);
    } catch (e) {
      setErro(e.message);
    } finally {
      setAdicionando(false);
    }
  }

  return (
    <aside className="instagram-sidebar">
      <div className="instagram-sidebar-secao">
        <h3>Perfis monitorados</h3>
        {perfis.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: '#999', margin: 0 }}>Nenhum perfil ainda.</p>
        ) : (
          <ul className="instagram-perfis-lista">
            {perfis.map(handle => (
              <li key={handle}>
                <a
                  href={`https://www.instagram.com/${handle}/`}
                  target="_blank"
                  rel="noreferrer"
                >
                  @{handle}
                </a>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleAdicionar} className="instagram-add-perfil">
          <input
            type="text"
            placeholder="@handle"
            value={novoHandle}
            onChange={e => setNovoHandle(e.target.value)}
            disabled={adicionando}
          />
          <button type="submit" disabled={adicionando || !novoHandle.trim()}>
            {adicionando ? '...' : '+'}
          </button>
        </form>
        {erro && <p className="instagram-erro-perfil">{erro}</p>}
      </div>
    </aside>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────

const LIMITE = 20;

export default function PaginaInstagram() {
  const [sessao, setSessao] = useState(null);
  const [posts, setPosts] = useState([]);
  const [pagina, setPagina] = useState(0);
  const [temMais, setTemMais] = useState(true);
  const [atualizadoEm, setAtualizadoEm] = useState(null);
  const [atualizando, setAtualizando] = useState(false);
  const [msgAtualizacao, setMsgAtualizacao] = useState(null);
  const [perfis, setPerfis] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  const sentinelaRef = useRef(null);
  const primeirNovoRef = useRef(null);
  const ultimoVistoRef = useRef(null);
  const jaRolou = useRef(false);

  // Ler último visto do localStorage ao montar
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_ULTIMO_VISTO);
      if (salvo) ultimoVistoRef.current = JSON.parse(salvo);
    } catch {
      // ignora
    }
  }, []);

  // Verificar sessão
  useEffect(() => {
    fetch(`${API}/instagram/sessao`)
      .then(r => r.json())
      .then(setSessao)
      .catch(() => setSessao({ conectado: false }));
  }, []);

  // Carregar perfis monitorados
  useEffect(() => {
    if (!sessao?.conectado) return;
    fetch(`${API}/instagram/perfis`)
      .then(r => r.json())
      .then(data => setPerfis(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [sessao]);

  const carregarPagina = useCallback(async (paginaNum) => {
    setCarregando(true);
    try {
      const r = await fetch(`${API}/instagram/posts?pagina=${paginaNum}&limite=${LIMITE}`);
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.erro || 'Erro ao carregar posts.');
      }
      const dados = await r.json();
      setPosts(prev => paginaNum === 1 ? dados.posts : [...prev, ...dados.posts]);
      setTemMais(dados.temMais);
      setPagina(paginaNum);
      if (dados.atualizadoEm) setAtualizadoEm(dados.atualizadoEm);

      // Salvar shortcode + data do post mais recente como "último visto"
      if (paginaNum === 1 && dados.posts.length > 0) {
        const maisRecente = dados.posts[0];
        localStorage.setItem(
          CHAVE_ULTIMO_VISTO,
          JSON.stringify({ shortcode: maisRecente.shortcode, data: maisRecente.data })
        );
      }
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  // Carga inicial quando sessão confirmada
  useEffect(() => {
    if (!sessao?.conectado) return;
    carregarPagina(1);
  }, [sessao]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rolar ao primeiro post novo após renderizar
  useEffect(() => {
    if (jaRolou.current || !primeirNovoRef.current) return;
    primeirNovoRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    jaRolou.current = true;
  });

  // Scroll infinito via IntersectionObserver
  useEffect(() => {
    const el = sentinelaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !carregando && temMais && pagina > 0) {
          carregarPagina(pagina + 1);
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [carregando, temMais, pagina, carregarPagina]);

  async function handleAtualizar() {
    setAtualizando(true);
    setMsgAtualizacao(null);
    try {
      const r = await fetch(`${API}/instagram/atualizar`, { method: 'POST' });
      const dados = await r.json();
      setMsgAtualizacao(dados.mensagem || 'Atualização iniciada, leva cerca de 1 minuto.');
    } catch {
      setMsgAtualizacao('Não foi possível iniciar a atualização.');
    } finally {
      setAtualizando(false);
      setTimeout(() => setMsgAtualizacao(null), 8000);
    }
  }

  // Determinar posts "novos" (não vistos desde última visita)
  const ultimoVisto = ultimoVistoRef.current;
  function eNovo(post) {
    if (!ultimoVisto) return false;
    if (post.data > ultimoVisto.data) return true;
    if (post.data === ultimoVisto.data && post.shortcode !== ultimoVisto.shortcode) return true;
    return false;
  }

  let indicePrimeiroNovo = ultimoVisto ? posts.findIndex(p => eNovo(p)) : -1;

  // ── Render ───────────────────────────────────────────────────────────────────

  if (sessao === null) {
    return <p style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>Verificando conexão...</p>;
  }

  if (!sessao.conectado) {
    return (
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>Posts do Instagram</h1>
        <FormLogin onConectado={usuario => setSessao({ conectado: true, usuario })} />
      </main>
    );
  }

  const atualizado = atualizadoEm
    ? new Date(atualizadoEm).toLocaleString('pt-BR', { timeZone: 'America/Recife' })
    : '—';

  return (
    <>
      <div className="instagram-cabecalho-pagina">
        <h1>Posts do Instagram</h1>
        <span className="instagram-atualizado">Atualizado em: {atualizado}</span>
        <button
          className="btn-atualizar-instagram"
          onClick={handleAtualizar}
          disabled={atualizando}
        >
          {atualizando ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {msgAtualizacao && (
        <p className="instagram-msg-atualizacao">{msgAtualizacao}</p>
      )}

      <div className="instagram-layout">
        <SidebarPerfis
          perfis={perfis}
          onPerfilAdicionado={novaLista => setPerfis(novaLista)}
        />

        <main className="instagram-feed">
          {erro && (
            <div style={{ background: '#fff3f3', border: '1px solid #ffcccc', borderRadius: 8, padding: '1rem' }}>
              <p style={{ margin: 0 }}>{erro}</p>
            </div>
          )}

          {posts.map((post, i) => (
            <CardPost
              key={post.shortcode}
              post={post}
              novo={eNovo(post)}
              refPrimeiro={i === indicePrimeiroNovo ? primeirNovoRef : null}
            />
          ))}

          <div ref={sentinelaRef} className="instagram-sentinela">
            {carregando && 'Carregando...'}
            {!carregando && !temMais && posts.length > 0 && 'Todos os posts carregados.'}
            {!carregando && !temMais && posts.length === 0 && 'Nenhum post encontrado.'}
          </div>
        </main>
      </div>
    </>
  );
}

// ── Estilos do formulário de login (inline para isolamento) ───────────────────

const estilosLogin = {
  container: { maxWidth: 400, margin: '3rem auto', padding: '2rem', border: '1px solid #e0e0e0', borderRadius: 12 },
  titulo: { fontSize: '1.2rem', marginBottom: '0.5rem' },
  desc: { fontSize: '0.85rem', color: '#666', marginBottom: '1.5rem', lineHeight: 1.5 },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  input: { padding: '0.6rem 0.75rem', border: '1px solid #ccc', borderRadius: 6, fontSize: '0.95rem' },
  botao: { padding: '0.7rem', background: '#E1306C', color: '#fff', border: 'none', borderRadius: 6, fontSize: '1rem', cursor: 'pointer' },
  erro: { color: '#c0392b', fontSize: '0.85rem', background: '#fff3f3', border: '1px solid #ffcccc', borderRadius: 6, padding: '0.6rem 0.75rem' },
  linkCheckpoint: { color: '#E1306C', fontWeight: 600, fontSize: '0.9rem' },
};
