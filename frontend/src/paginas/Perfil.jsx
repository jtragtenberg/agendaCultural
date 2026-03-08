import { useState } from 'react';
import { api } from '../servicos/api';
import CalendarioAgenda from '../componentes/CalendarioAgenda';

export default function Perfil({ sessao, onEntrar }) {
  const [modoCadastro, setModoCadastro] = useState(false);
  const [modoAdmin, setModoAdmin] = useState(false);
  const [email, setEmail] = useState('ana@agenda.recife');
  const [senha, setSenha] = useState('123456');
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState('');
  const [agenda, setAgenda] = useState(null);

  async function autenticar(e) {
    e.preventDefault();
    setErro('');

    try {
      const resposta = modoCadastro
        ? await api.cadastro({ nome, email, senha })
        : modoAdmin
          ? await api.loginAdministrador({ email, senha })
          : await api.login({ email, senha });
      onEntrar(resposta);
    } catch (erroApi) {
      setErro(erroApi.message);
    }
  }

  async function carregarAgenda() {
    if (!sessao?.token) return;
    try {
      const dados = await api.minhaAgenda(sessao.token);
      setAgenda(dados);
    } catch (erroApi) {
      setErro(erroApi.message);
    }
  }

  async function exportarCalendario() {
    if (!sessao?.usuario?.id) return;
    const ics = await api.baixarCalendario(sessao.usuario.id);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'agenda-cultural-recife.ics';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  if (!sessao?.usuario) {
    return (
      <main className="container">
        <h2>{modoCadastro ? 'Criar conta' : modoAdmin ? 'Entrar como administrador' : 'Entrar'}</h2>

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

          <button type="submit">{modoCadastro ? 'Cadastrar' : modoAdmin ? 'Entrar como admin' : 'Entrar'}</button>
        </form>

        <button
          className="link-botao"
          onClick={() => {
            setModoCadastro((v) => !v);
            setModoAdmin(false);
          }}
        >
          {modoCadastro ? 'Já tenho conta' : 'Não tenho conta'}
        </button>
        {!modoCadastro ? (
          <button className="link-botao" onClick={() => setModoAdmin((v) => !v)}>
            {modoAdmin ? 'Entrar como usuário comum' : 'Entrar como administrador'}
          </button>
        ) : null}
        {erro ? <p className="erro">{erro}</p> : null}
      </main>
    );
  }

  return (
    <main className="container">
      <h2>Perfil do usuário</h2>
      <p>
        <strong>Nome:</strong> {sessao.usuario.nome}
      </p>
      <p>
        <strong>E-mail:</strong> {sessao.usuario.email}
      </p>
      <p>
        <strong>Reputação:</strong> {sessao.usuario.reputacao}
      </p>

      <div className="acoes-perfil">
        <button onClick={carregarAgenda}>Carregar minha agenda</button>
        <button onClick={exportarCalendario}>Exportar calendário (.ics)</button>
      </div>

      {agenda ? (
        <section>
          <h3>Minha agenda em calendário</h3>
          <p>Visualização mensal dos eventos que você salvou na sua agenda pessoal.</p>
          <CalendarioAgenda agenda={agenda} />
        </section>
      ) : null}

      {erro ? <p className="erro">{erro}</p> : null}
    </main>
  );
}
