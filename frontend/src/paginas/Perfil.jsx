import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../servicos/api';

export default function Perfil({ sessao, onEntrar }) {
  const navigate = useNavigate();
  const [modoCadastro, setModoCadastro] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState('');

  if (sessao?.usuario) {
    return <Navigate to="/" replace />;
  }

  async function autenticar(e) {
    e.preventDefault();
    setErro('');

    try {
      const resposta = modoCadastro
        ? await api.cadastro({ nome, email, senha })
        : await api.login({ email, senha });
      onEntrar(resposta);
      navigate('/');
    } catch (erroApi) {
      setErro(erroApi.message);
    }
  }

  return (
    <main className="container">
      <h2>{modoCadastro ? 'Criar conta' : 'Entrar'}</h2>

      <form onSubmit={autenticar} className="formulario-auth">
        {modoCadastro ? (
          <label>
            Nome
            <input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </label>
        ) : null}

        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>

        <label>
          Senha
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </label>

        <button type="submit">{modoCadastro ? 'Cadastrar' : 'Entrar'}</button>
      </form>

      <button className="link-botao" onClick={() => setModoCadastro((v) => !v)}>
        {modoCadastro ? 'Já tenho conta' : 'Não tenho conta'}
      </button>
      {erro ? <p className="erro">{erro}</p> : null}
    </main>
  );
}
