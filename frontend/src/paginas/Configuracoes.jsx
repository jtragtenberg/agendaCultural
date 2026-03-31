import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../servicos/api';

export default function Configuracoes({ sessao, token, onAtualizarUsuario }) {
  const [nome, setNome] = useState(sessao?.usuario?.nome || '');
  const [bio, setBio] = useState(sessao?.usuario?.bio || '');
  const [mensagemPerfil, setMensagemPerfil] = useState('');
  const [erroPerfil, setErroPerfil] = useState('');

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mensagemSenha, setMensagemSenha] = useState('');
  const [erroSenha, setErroSenha] = useState('');

  if (!sessao?.usuario) {
    return <Navigate to="/perfil" replace />;
  }

  async function salvarPerfil(e) {
    e.preventDefault();
    setMensagemPerfil('');
    setErroPerfil('');
    try {
      const atualizado = await api.atualizarPerfil({ nome, bio }, token);
      onAtualizarUsuario(atualizado);
      setMensagemPerfil('Perfil atualizado.');
    } catch (err) {
      setErroPerfil(err.message);
    }
  }

  async function alterarSenha(e) {
    e.preventDefault();
    setMensagemSenha('');
    setErroSenha('');
    if (novaSenha !== confirmarSenha) {
      setErroSenha('A nova senha e a confirmação não coincidem.');
      return;
    }
    try {
      await api.alterarSenha({ senhaAtual, novaSenha }, token);
      setMensagemSenha('Senha alterada com sucesso.');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    } catch (err) {
      setErroSenha(err.message);
    }
  }

  async function exportarCalendario() {
    try {
      const ics = await api.baixarCalendario(sessao.usuario.id);
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'agenda-cultural-recife.ics';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setErroPerfil(err.message);
    }
  }

  return (
    <main className="container">
      <h2>Configurações</h2>
      <p style={{ color: 'var(--texto-fraco)', marginBottom: '2rem' }}>
        <strong>E-mail:</strong> {sessao.usuario.email} &nbsp;·&nbsp;
        <strong>Reputação:</strong> {sessao.usuario.reputacao}
      </p>

      <section className="formulario" style={{ marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 0.5rem' }}>Editar perfil</h3>
        <form onSubmit={salvarPerfil} style={{ display: 'contents' }}>
          <label>
            Nome
            <input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </label>
          <label>
            Bio
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Uma breve descrição sobre você" />
          </label>
          <button type="submit">Salvar perfil</button>
        </form>
        {mensagemPerfil ? <p className="sucesso">{mensagemPerfil}</p> : null}
        {erroPerfil ? <p className="erro">{erroPerfil}</p> : null}
      </section>

      <section className="formulario" style={{ marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 0.5rem' }}>Trocar senha</h3>
        <form onSubmit={alterarSenha} style={{ display: 'contents' }}>
          <label>
            Senha atual
            <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} required />
          </label>
          <label>
            Nova senha
            <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required minLength={6} />
          </label>
          <label>
            Confirmar nova senha
            <input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} required />
          </label>
          <button type="submit">Alterar senha</button>
        </form>
        {mensagemSenha ? <p className="sucesso">{mensagemSenha}</p> : null}
        {erroSenha ? <p className="erro">{erroSenha}</p> : null}
      </section>

      <section className="formulario">
        <h3 style={{ margin: '0 0 0.5rem' }}>Calendário</h3>
        <p style={{ margin: '0 0 0.75rem', color: 'var(--texto-fraco)', fontSize: '0.88rem' }}>
          Exporte seus eventos salvos para Google Calendar, Apple Calendar ou Outlook.
        </p>
        <button type="button" onClick={exportarCalendario}>Exportar calendário (.ics)</button>
      </section>
    </main>
  );
}
