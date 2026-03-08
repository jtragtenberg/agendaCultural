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

  buscarEvento: (id) => requisicao(`/eventos/${id}`),

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

  seguirUsuario: (usuarioId, token) =>
    requisicao(`/seguir/${usuarioId}`, {
      method: 'POST',
      headers: cabecalhos(token)
    }),

  listarSeguindo: (token) => requisicao('/seguindo', { headers: cabecalhos(token) }),

  baixarCalendario: (id) => requisicao(`/usuarios/${id}/calendario.ics`)
};
