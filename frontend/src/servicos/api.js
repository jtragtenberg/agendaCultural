const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function cabecalhos(token) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function requisicao(caminho, opcoes = {}) {
  const resposta = await fetch(`${API_URL}${caminho}`, opcoes);
  const isIcs = resposta.headers.get('content-type')?.includes('text/calendar');

  if (!resposta.ok) {
    const erro = isIcs ? { erro: 'Erro ao baixar calendário.' } : await resposta.json();
    throw new Error(erro.erro || 'Erro na requisição');
  }

  if (resposta.status === 204) return null;
  if (isIcs) return resposta.text();
  return resposta.json();
}

function queryBusca(texto) {
  const valor = String(texto || '').trim();
  return valor ? `?q=${encodeURIComponent(valor)}` : '';
}

export const api = {
  cadastro: (dados) =>
    requisicao('/autenticacao/cadastro', {
      method: 'POST',
      headers: cabecalhos(),
      body: JSON.stringify(dados)
    }),

  login: (dados) =>
    requisicao('/autenticacao/login', {
      method: 'POST',
      headers: cabecalhos(),
      body: JSON.stringify(dados)
    }),

  listarEventos: (token) =>
    requisicao('/eventos', {
      headers: cabecalhos(token)
    }),

  buscarEvento: (id, token) => requisicao(`/eventos/${id}`, { headers: cabecalhos(token) }),
  editarEvento: (id, dados, token) =>
    requisicao(`/eventos/${id}`, {
      method: 'PUT',
      headers: cabecalhos(token),
      body: JSON.stringify(dados)
    }),
  deletarEvento: (id, token) =>
    requisicao(`/eventos/${id}`, {
      method: 'DELETE',
      headers: cabecalhos(token)
    }),

  listarArtistas: (busca = '') => requisicao(`/artistas${queryBusca(busca)}`),
  buscarArtista: (id, token) => requisicao(`/artistas/${id}`, { headers: cabecalhos(token) }),
  criarArtista: (dados, token) =>
    requisicao('/artistas', {
      method: 'POST',
      headers: cabecalhos(token),
      body: JSON.stringify(dados)
    }),
  atualizarArtista: (id, dados, token) =>
    requisicao(`/artistas/${id}`, {
      method: 'PUT',
      headers: cabecalhos(token),
      body: JSON.stringify(dados)
    }),

  listarLocais: (busca = '') => requisicao(`/locais${queryBusca(busca)}`),
  buscarLocal: (id, token) => requisicao(`/locais/${id}`, { headers: cabecalhos(token) }),
  criarLocal: (dados, token) =>
    requisicao('/locais', {
      method: 'POST',
      headers: cabecalhos(token),
      body: JSON.stringify(dados)
    }),
  atualizarLocal: (id, dados, token) =>
    requisicao(`/locais/${id}`, {
      method: 'PUT',
      headers: cabecalhos(token),
      body: JSON.stringify(dados)
    }),

  criarEvento: (dados, token) =>
    requisicao('/eventos', {
      method: 'POST',
      headers: cabecalhos(token),
      body: JSON.stringify(dados)
    }),

  adicionarAgenda: (eventoId, token) =>
    requisicao('/agenda/adicionar', {
      method: 'POST',
      headers: cabecalhos(token),
      body: JSON.stringify({ eventoId })
    }),
  removerAgenda: (eventoId, token) =>
    requisicao(`/agenda/remover/${eventoId}`, {
      method: 'DELETE',
      headers: cabecalhos(token)
    }),

  minhaAgenda: (token) => requisicao('/agenda/minha', { headers: cabecalhos(token) }),

  meuPerfil: (id) => requisicao(`/usuarios/${id}`),
  listarUsuarios: (busca = '', token) =>
    requisicao(`/usuarios${queryBusca(busca)}`, {
      headers: cabecalhos(token)
    }),

  denunciarEvento: (id, motivo, token) =>
    requisicao(`/eventos/${id}/denunciar`, {
      method: 'POST',
      headers: cabecalhos(token),
      body: JSON.stringify({ motivo })
    }),
  listarEventosNaoModerados: (token) =>
    requisicao('/eventos/moderacao/nao-moderados', {
      headers: cabecalhos(token)
    }),
  listarTodosEventosModerados: (token, pagina = 1, q = '', incluirPassados = false, ordem = 'pendente_primeiro') =>
    requisicao(`/eventos/moderacao/eventos?pagina=${pagina}&q=${encodeURIComponent(q)}&incluirPassados=${incluirPassados}&ordem=${ordem}`, {
      headers: cabecalhos(token)
    }),
  aprovarEvento: (id, token) =>
    requisicao(`/eventos/${id}/aprovar`, {
      method: 'POST',
      headers: cabecalhos(token)
    }),
  rejeitarEvento: (id, token) =>
    requisicao(`/eventos/${id}/rejeitar`, {
      method: 'POST',
      headers: cabecalhos(token)
    }),
  editarEventoModeracao: (id, dados, token) =>
    requisicao(`/eventos/${id}/editar`, {
      method: 'PUT',
      headers: cabecalhos(token),
      body: JSON.stringify(dados)
    }),
  apagarEventoModeracao: (id, token) =>
    requisicao(`/eventos/${id}`, {
      method: 'DELETE',
      headers: cabecalhos(token)
    }),
  listarLocaisModeracao: (token) =>
    requisicao('/eventos/moderacao/locais', {
      headers: cabecalhos(token)
    }),
  editarLocalModeracao: (id, dados, token) =>
    requisicao(`/eventos/moderacao/locais/${id}`, {
      method: 'PUT',
      headers: cabecalhos(token),
      body: JSON.stringify(dados)
    }),
  apagarLocalModeracao: (id, token) =>
    requisicao(`/eventos/moderacao/locais/${id}`, {
      method: 'DELETE',
      headers: cabecalhos(token)
    }),
  listarArtistasModeracao: (token) =>
    requisicao('/eventos/moderacao/artistas', {
      headers: cabecalhos(token)
    }),
  editarArtistaModeracao: (id, dados, token) =>
    requisicao(`/eventos/moderacao/artistas/${id}`, {
      method: 'PUT',
      headers: cabecalhos(token),
      body: JSON.stringify(dados)
    }),
  apagarArtistaModeracao: (id, token) =>
    requisicao(`/eventos/moderacao/artistas/${id}`, {
      method: 'DELETE',
      headers: cabecalhos(token)
    }),

  atualizarPerfil: (dados, token) =>
    requisicao('/usuarios/me', {
      method: 'PUT',
      headers: cabecalhos(token),
      body: JSON.stringify(dados)
    }),

  alterarSenha: (dados, token) =>
    requisicao('/usuarios/me/senha', {
      method: 'PUT',
      headers: cabecalhos(token),
      body: JSON.stringify(dados)
    }),

  seguirUsuario: (usuarioId, token) =>
    requisicao(`/seguir/${usuarioId}`, {
      method: 'POST',
      headers: cabecalhos(token)
    }),

  listarSeguindo: (token) => requisicao('/seguindo', { headers: cabecalhos(token) }),

  baixarCalendario: (id) => requisicao(`/usuarios/${id}/calendario.ics`),

  adminListarUsuarios: (token) =>
    requisicao('/admin/usuarios', { headers: cabecalhos(token) }),
  adminBuscarUsuario: (id, token) =>
    requisicao(`/admin/usuarios/${id}`, { headers: cabecalhos(token) }),
  adminListarEventos: (token) =>
    requisicao('/admin/eventos', { headers: cabecalhos(token) }),
  adminAtualizarUsuario: (id, dados, token) =>
    requisicao(`/admin/usuarios/${id}`, {
      method: 'PUT',
      headers: cabecalhos(token),
      body: JSON.stringify(dados)
    }),
  adminAlterarSenhaUsuario: (id, novaSenha, token) =>
    requisicao(`/admin/usuarios/${id}/senha`, {
      method: 'PUT',
      headers: cabecalhos(token),
      body: JSON.stringify({ novaSenha })
    }),
  adminEditarEvento: (id, dados, token) =>
    requisicao(`/admin/eventos/${id}`, {
      method: 'PUT',
      headers: cabecalhos(token),
      body: JSON.stringify(dados)
    }),
  adminApagarEvento: (id, token) =>
    requisicao(`/admin/eventos/${id}`, { method: 'DELETE', headers: cabecalhos(token) }),
  adminEditarArtista: (id, dados, token) =>
    requisicao(`/admin/artistas/${id}`, {
      method: 'PUT',
      headers: cabecalhos(token),
      body: JSON.stringify(dados)
    }),
  adminApagarArtista: (id, token) =>
    requisicao(`/admin/artistas/${id}`, { method: 'DELETE', headers: cabecalhos(token) }),
  adminEditarLocal: (id, dados, token) =>
    requisicao(`/admin/locais/${id}`, {
      method: 'PUT',
      headers: cabecalhos(token),
      body: JSON.stringify(dados)
    }),
  adminApagarLocal: (id, token) =>
    requisicao(`/admin/locais/${id}`, { method: 'DELETE', headers: cabecalhos(token) }),

  atribuirDonoLocal: (id, donoPaginaId, token) =>
    requisicao(`/eventos/moderacao/locais/${id}/dono`, {
      method: 'PUT',
      headers: cabecalhos(token),
      body: JSON.stringify({ donoPaginaId })
    }),
  atribuirDonoArtista: (id, donoPaginaId, token) =>
    requisicao(`/eventos/moderacao/artistas/${id}/dono`, {
      method: 'PUT',
      headers: cabecalhos(token),
      body: JSON.stringify({ donoPaginaId })
    }),
  listarSolicitacoes: (token) =>
    requisicao('/eventos/moderacao/solicitacoes', { headers: cabecalhos(token) }),
  responderSolicitacao: (id, acao, token) =>
    requisicao(`/eventos/moderacao/solicitacoes/${id}`, {
      method: 'PUT',
      headers: cabecalhos(token),
      body: JSON.stringify({ acao })
    }),
  solicitarPropriedadeLocal: (id, token) =>
    requisicao(`/locais/${id}/solicitar-propriedade`, {
      method: 'POST',
      headers: cabecalhos(token)
    }),
  solicitarPropriedadeArtista: (id, token) =>
    requisicao(`/artistas/${id}/solicitar-propriedade`, {
      method: 'POST',
      headers: cabecalhos(token)
    }),

  extrairEvento: (texto) =>
    requisicao('/ia/extrair-evento', {
      method: 'POST',
      headers: cabecalhos(),
      body: JSON.stringify({ texto })
    })
};
