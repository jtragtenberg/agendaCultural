import { Link } from 'react-router-dom';

export default function Cabecalho({ usuario, onSair }) {
  return (
    <header className="cabecalho">
      <div>
        <h1>Agenda Cultural do Recife</h1>
        <p>Plataforma colaborativa de eventos musicais</p>
      </div>

      <nav>
        <Link to="/">Início</Link>
        <Link to="/buscar-eventos">Buscar eventos</Link>
        <Link to="/criar-evento">Criar evento</Link>
        {usuario ? <Link to="/perfil">Meu perfil</Link> : null}
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
