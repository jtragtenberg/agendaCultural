import { useEffect, useState } from 'react';
import { api } from '../servicos/api';

export default function AdminUsuarios({ token, ehAdministrador }) {
  const [usuarios, setUsuarios] = useState([]);
  const [moderadores, setModeradores] = useState([]);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  async function carregar() {
    if (!token || !ehAdministrador) return;

    try {
      const [listaUsuarios, listaModeradores] = await Promise.all([
        api.listarUsuariosAdmin(token),
        api.listarModeradoresAdmin(token)
      ]);
      setUsuarios(listaUsuarios);
      setModeradores(listaModeradores);
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => {
    carregar();
  }, [token, ehAdministrador]);

  async function alterarFuncao(usuarioId, funcao) {
    setErro('');
    setMensagem('');
    try {
      await api.atualizarFuncaoUsuario(usuarioId, funcao, token);
      setMensagem('Função atualizada com sucesso.');
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  if (!token || !ehAdministrador) {
    return (
      <main className="container painel-admin">
        <h2>Painel Administrativo</h2>
        <p>Área exclusiva para perfil administrador.</p>
      </main>
    );
  }

  return (
    <main className="container painel-admin">
      <h2>Painel Administrativo</h2>
      <p>Gerencie funções de usuários e acompanhe dados de uso da plataforma.</p>

      <h3>Usuários Cadastrados</h3>
      <section className="lista-eventos">
        {usuarios.map((usuario) => (
          <article key={usuario.id} className="card-evento admin-card">
            <h4>{usuario.nome}</h4>
            <p>{usuario.email}</p>
            <p>
              <strong>Função:</strong> {usuario.funcao}
            </p>
            <p>
              <strong>Eventos criados:</strong> {usuario.uso?.eventosCriados || 0}
            </p>
            <p>
              <strong>Eventos salvos:</strong> {usuario.uso?.eventosSalvos || 0}
            </p>
            <p>
              <strong>Eventos moderados:</strong> {usuario.uso?.eventosModerados || 0}
            </p>

            <label>
              Alterar função
              <select
                value={usuario.funcao}
                onChange={(e) => alterarFuncao(usuario.id, e.target.value)}
              >
                <option value="usuario">usuário</option>
                <option value="moderador">moderador</option>
                <option value="administrador">administrador</option>
              </select>
            </label>
          </article>
        ))}
      </section>

      <h3>Dados de Moderadores</h3>
      <section className="lista-eventos">
        {moderadores.map((moderador) => (
          <article key={moderador.id} className="card-evento admin-card">
            <h4>
              {moderador.nome} ({moderador.funcao})
            </h4>
            <p>{moderador.email}</p>
            <p>
              <strong>Eventos moderados:</strong> {moderador.dados?.eventosModerados || 0}
            </p>
            <p>
              <strong>Eventos criados:</strong> {moderador.dados?.eventosCriados || 0}
            </p>
            <p>
              <strong>Eventos adicionados à agenda:</strong> {moderador.dados?.eventosAdicionadosAgenda || 0}
            </p>
          </article>
        ))}
      </section>

      {mensagem ? <p className="sucesso">{mensagem}</p> : null}
      {erro ? <p className="erro">{erro}</p> : null}
    </main>
  );
}
