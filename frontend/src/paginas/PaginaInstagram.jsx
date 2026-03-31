import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={estilos.loginContainer}>
      <h2 style={estilos.loginTitulo}>Conectar conta do Instagram</h2>
      <p style={estilos.loginDesc}>
        Necessário para buscar posts de perfis públicos. As credenciais não são armazenadas —
        apenas o cookie de sessão fica salvo localmente no servidor.
      </p>
      <form onSubmit={handleSubmit} style={estilos.form}>
        <input
          type="text"
          placeholder="Usuário (@handle)"
          value={usuario}
          onChange={e => setUsuario(e.target.value)}
          style={estilos.input}
          autoComplete="username"
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          style={estilos.input}
          autoComplete="current-password"
          required
        />
        {erro && <p style={estilos.erroInline}>{erro}</p>}
        <button type="submit" style={estilos.botaoLogin} disabled={carregando}>
          {carregando ? 'Conectando...' : 'Conectar'}
        </button>
      </form>
    </div>
  );
}

// ── Card de post ───────────────────────────────────────────────────────────────

function CardPost({ post }) {
  const [expandida, setExpandida] = useState(false);
  const longa = post.legenda.length > 150;

  return (
    <div style={estilos.card}>
      {post.thumbnail && (
        <a href={post.url} target="_blank" rel="noreferrer">
          <img
            src={post.thumbnail}
            alt="thumbnail"
            style={estilos.thumbnail}
            onError={e => { e.target.style.display = 'none'; }}
          />
        </a>
      )}
      <div style={estilos.cardCorpo}>
        <span style={estilos.data}>{post.dataFormatada}</span>
        {post.legenda && (
          <div style={expandida ? estilos.legendaScroll : estilos.legendaColapsada}>
            <p style={estilos.legendaTexto}>
              {expandida ? post.legenda : post.legenda.slice(0, 150)}
              {longa && !expandida && '…'}
            </p>
          </div>
        )}
        {longa && (
          <button onClick={() => setExpandida(!expandida)} style={estilos.botaoVerMais}>
            {expandida ? 'ver menos ↑' : 'ver mais ↓'}
          </button>
        )}
        <a href={post.url} target="_blank" rel="noreferrer" style={estilos.link}>
          Ver no Instagram →
        </a>
      </div>
    </div>
  );
}

// ── Seção por perfil ───────────────────────────────────────────────────────────

function SecaoPerfil({ perfil }) {
  return (
    <section style={estilos.secao}>
      <h2 style={estilos.tituloPerfil}>
        <a href={perfil.url} target="_blank" rel="noreferrer" style={estilos.linkPerfil}>
          @{perfil.handle}
        </a>
      </h2>
      {perfil.posts.length === 0 ? (
        <p style={estilos.semPosts}>Nenhum post encontrado.</p>
      ) : (
        <div style={estilos.grade}>
          {perfil.posts.map(post => <CardPost key={post.shortcode} post={post} />)}
        </div>
      )}
    </section>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function PaginaInstagram() {
  const [sessao, setSessao] = useState(null);   // null = verificando
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    fetch(`${API}/instagram/sessao`)
      .then(r => r.json())
      .then(setSessao)
      .catch(() => setSessao({ conectado: false }));
  }, []);

  useEffect(() => {
    if (!sessao?.conectado) return;
    fetch(`${API}/instagram/posts`)
      .then(r => {
        if (!r.ok) return r.json().then(e => Promise.reject(e.erro));
        return r.json();
      })
      .then(setDados)
      .catch(setErro)
      .finally(() => setCarregando(false));
  }, [sessao]);

  if (sessao === null) return <p style={estilos.status}>Verificando conexão...</p>;

  if (!sessao.conectado) {
    return (
      <main style={estilos.pagina}>
        <h1 style={estilos.titulo}>Posts do Instagram</h1>
        <FormLogin onConectado={usuario => setSessao({ conectado: true, usuario })} />
      </main>
    );
  }

  const atualizado = dados?.atualizadoEm
    ? new Date(dados.atualizadoEm).toLocaleString('pt-BR')
    : '—';

  return (
    <main style={estilos.pagina}>
      <div style={estilos.cabecalho}>
        <div>
          <h1 style={estilos.titulo}>Posts do Instagram</h1>
          <p style={estilos.subtitulo}>
            Conta: <strong>@{sessao.usuario}</strong> · Atualizado em: {atualizado}
          </p>
        </div>
      </div>

      {carregando && <p style={estilos.status}>Carregando posts...</p>}
      {erro && (
        <div style={estilos.erroBox}>
          <p>{erro}</p>
          <pre style={estilos.pre}>python3 scripts/buscar_instagram.py</pre>
        </div>
      )}
      {dados?.perfis.map(perfil => <SecaoPerfil key={perfil.handle} perfil={perfil} />)}
    </main>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────────

const estilos = {
  pagina: { maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' },
  cabecalho: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' },
  titulo: { fontSize: '1.8rem', marginBottom: '0.25rem' },
  subtitulo: { color: '#888', fontSize: '0.85rem' },
  secao: { marginBottom: '3rem' },
  tituloPerfil: { fontSize: '1.3rem', borderBottom: '2px solid #e0e0e0', paddingBottom: '0.5rem', marginBottom: '1rem' },
  linkPerfil: { color: '#E1306C', textDecoration: 'none' },
  grade: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' },
  card: { border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  thumbnail: { width: '100%', aspectRatio: '1/1', objectFit: 'cover' },
  cardCorpo: { padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', flexGrow: 1 },
  data: { fontSize: '0.75rem', color: '#888', fontWeight: 600 },
  legendaColapsada: {},
  legendaScroll: { maxHeight: 180, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 4, padding: '0.4rem 0.5rem', background: '#fafafa' },
  legendaTexto: { fontSize: '0.85rem', color: '#333', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' },
  botaoVerMais: { background: 'none', border: 'none', color: '#E1306C', cursor: 'pointer', padding: 0, fontSize: '0.8rem', textAlign: 'left' },
  link: { fontSize: '0.8rem', color: '#E1306C', textDecoration: 'none', marginTop: 'auto', paddingTop: '0.5rem' },
  semPosts: { color: '#888', fontStyle: 'italic' },
  status: { textAlign: 'center', padding: '3rem', color: '#888' },
  erroBox: { maxWidth: 600, margin: '2rem auto', padding: '1.5rem', background: '#fff3f3', borderRadius: 8, border: '1px solid #ffcccc' },
  pre: { background: '#f5f5f5', padding: '0.5rem 1rem', borderRadius: 4, fontSize: '0.85rem' },
  // Login
  loginContainer: { maxWidth: 400, margin: '3rem auto', padding: '2rem', border: '1px solid #e0e0e0', borderRadius: 12 },
  loginTitulo: { fontSize: '1.2rem', marginBottom: '0.5rem' },
  loginDesc: { fontSize: '0.85rem', color: '#666', marginBottom: '1.5rem', lineHeight: 1.5 },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  input: { padding: '0.6rem 0.75rem', border: '1px solid #ccc', borderRadius: 6, fontSize: '0.95rem' },
  botaoLogin: { padding: '0.7rem', background: '#E1306C', color: '#fff', border: 'none', borderRadius: 6, fontSize: '1rem', cursor: 'pointer' },
  erroInline: { color: '#c0392b', fontSize: '0.85rem', margin: 0 },
};
