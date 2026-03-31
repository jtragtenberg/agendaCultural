import { Link } from 'react-router-dom';

export default function Cabecalho({ usuario, onSair, ehModerador }) {
  return (
    <header className="cabecalho">
      <div>
        <h1>
          <Link to="/">Agenda Cultural do Recife</Link>
        </h1>
      </div>

      <nav>
        {usuario ? (
          <>
            {ehModerador ? <Link to="/moderacao">Moderação</Link> : null}
            <Link to="/perfil">Meu perfil</Link>
          </>
        ) : null}
      </nav>

      <div className="acoes-auth">
        {usuario ? (
          <>
            <span>Olá, {usuario.nome}</span>
            <button onClick={onSair}>Sair</button>
          </>
        ) : (
          <Link to="/perfil">Entrar</Link>
        )}
      </div>
    </header>
  );
}
