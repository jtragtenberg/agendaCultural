import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Cabecalho({ usuario, onSair, ehModerador, ehAdmin, onExportarAgenda }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    function fechar(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, [aberto]);

  return (
    <header className="cabecalho">
      <div>
        <h1>
          <Link to="/">Agenda Cultural do Recife</Link>
        </h1>
      </div>

      <nav />

      <div className="acoes-auth">
        {usuario ? (
          <div className="dropdown-usuario" ref={ref}>
            <button className="btn-dropdown" onClick={() => setAberto((v) => !v)}>
              {usuario.nome} ▾
            </button>
            {aberto ? (
              <div className="dropdown-menu">
                <Link to="/configuracoes" onClick={() => setAberto(false)}>Configurações</Link>
                <button onClick={() => { setAberto(false); onExportarAgenda(); }}>Exportar agenda</button>
                {ehAdmin ? (
                  <Link to="/admin" onClick={() => setAberto(false)}>Painel Admin</Link>
                ) : null}
                {ehModerador ? (
                  <Link to="/moderacao" onClick={() => setAberto(false)}>Moderação</Link>
                ) : null}
                <button onClick={() => { setAberto(false); onSair(); }}>Sair</button>
              </div>
            ) : null}
          </div>
        ) : (
          <Link to="/perfil">Entrar</Link>
        )}
      </div>
    </header>
  );
}
