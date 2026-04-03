const express = require('express');
const prisma = require('../../prisma');
const { openaiKey } = require('../../config');
const { autenticarObrigatorio } = require('../../middlewares');

const router = express.Router();
const SCRAPER_URL = process.env.SCRAPER_URL || 'http://scraper:5000';

// ── Prompt ────────────────────────────────────────────────────────────────────

const PROMPT_SISTEMA = `Você é um assistente que extrai informações de eventos culturais a partir de textos livres (posts do Instagram, notícias, descrições curtas).

Retorne SOMENTE um JSON válido com os seguintes campos (use null para campos não encontrados):
{
  "titulo": string | null,
  "descricao": string | null,
  "data": "YYYY-MM-DD" | null,
  "horaInicio": "HH:MM" | null,
  "horaFim": "HH:MM" | null,
  "ingresso": string | null,
  "linkIngresso": string | null,
  "linkDivulgacao": string | null,
  "artistas": [
    {
      "nome": string,
      "instagram": string | null,
      "descricao": string | null
    }
  ],
  "local": {
    "nome": string | null,
    "instagram": string | null,
    "endereco": string | null,
    "bairro": string | null,
    "cidade": string | null
  }
}

Regras:
- data deve estar no formato YYYY-MM-DD
- horaInicio e horaFim devem estar no formato HH:MM (24h)
- Se o texto não mencionar data, deixe data null
- descricao: texto original do evento adaptado, sem hashtags, sem mencionar preços ou links
- ingresso: texto descritivo do valor (ex: "Gratuito", "R$ 30", "R$ 20 a R$ 50", "Couvert artístico")
- linkIngresso: URL para compra de ingresso, se mencionado
- linkDivulgacao: URL de divulgação do evento (Instagram, site, etc), se mencionado
- artistas: todos os artistas/grupos que se apresentam no evento (não o local/espaço). Para cada um, extraia o nome artístico, o @instagram se mencionado, e uma breve descrição baseada no texto
- local.nome: nome do espaço/venue (teatro, casa de shows, bar, etc)
- local.instagram: @handle do espaço, se mencionado
- local.endereco, local.bairro, local.cidade: se mencionados no texto
- A primeira linha da mensagem do usuário contém a data atual. Use-a para inferir o ano correto quando o texto não mencionar o ano explicitamente. Nunca use um ano anterior à data atual
- Nunca invente informações que não estejam no texto`;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function chamarOpenAI(texto) {
  if (!openaiKey) throw new Error('OPENAI_API_KEY não configurada no servidor.');

  const resposta = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: PROMPT_SISTEMA },
        { role: 'user', content: texto },
      ],
      temperature: 0.2,
      max_tokens: 800,
    }),
  });

  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro?.error?.message || `Erro OpenAI: ${resposta.status}`);
  }

  const dados = await resposta.json();
  return JSON.parse(dados.choices[0].message.content);
}

// Busca endereço no OpenStreetMap Nominatim (gratuito, sem chave)
async function buscarEndereco(nome, cidade = 'Recife') {
  try {
    const q = encodeURIComponent(`${nome}, ${cidade}, Pernambuco, Brasil`);
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&addressdetails=1`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'AgendaCulturalRecife/1.0 (contato@agenda.rec.br)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return null;
    const dados = await resp.json();
    if (!dados.length) return null;
    const r = dados[0];
    const addr = r.address || {};
    return {
      enderecoCompleto: r.display_name,
      rua: [addr.road, addr.house_number].filter(Boolean).join(', ') || null,
      bairro: addr.suburb || addr.neighbourhood || addr.quarter || null,
      cidade: addr.city || addr.town || addr.municipality || null,
      lat: r.lat || null,
      lon: r.lon || null,
    };
  } catch {
    return null;
  }
}

// Busca artista no banco por nome (fuzzy insensitive)
async function buscarArtistaNoBanco(nome) {
  if (!nome) return null;
  const resultados = await prisma.artista.findMany({
    where: { nome: { contains: nome.trim(), mode: 'insensitive' } },
    take: 3,
    orderBy: { nome: 'asc' },
  });
  // Retorna o mais próximo (primeiro resultado alphabetically among matches)
  return resultados[0] || null;
}

// Busca local no banco por nome
async function buscarLocalNoBanco(nome) {
  if (!nome) return null;
  const resultados = await prisma.local.findMany({
    where: { nome: { contains: nome.trim(), mode: 'insensitive' } },
    take: 3,
    orderBy: { nome: 'asc' },
  });
  return resultados[0] || null;
}

// Busca post do Instagram via scraper
async function buscarPostInstagram(url) {
  const resp = await fetch(`${SCRAPER_URL}/post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(30000),
  });
  if (!resp.ok) {
    const erro = await resp.json().catch(() => ({}));
    throw new Error(erro?.erro || `Erro ao buscar post: ${resp.status}`);
  }
  return resp.json();
}

// ── Rotas ─────────────────────────────────────────────────────────────────────

// POST /ia/extrair-evento
// Body: { texto?: string, urlInstagram?: string }
// Requer autenticação (para poder criar artistas/locais com o ID do usuário)
router.post('/ia/extrair-evento', autenticarObrigatorio, async (req, res, next) => {
  try {
    let { texto, urlInstagram } = req.body;
    let postData = null;

    // Se forneceu URL do Instagram, busca o post via scraper
    if (urlInstagram && urlInstagram.trim()) {
      try {
        postData = await buscarPostInstagram(urlInstagram.trim());
        // Monta o texto com todos os dados do post
        const perfis = [postData.handle, ...postData.colaboradores.map(c => c.handle)]
          .map(h => `@${h}`)
          .join(', ');
        texto = `Perfis envolvidos no post: ${perfis}\n\n${postData.legenda}`;
      } catch (e) {
        return res.status(502).json({ erro: `Falha ao buscar post do Instagram: ${e.message}` });
      }
    }

    if (!texto || !texto.trim()) {
      return res.status(400).json({ erro: 'Forneça "texto" ou "urlInstagram".' });
    }

    const hoje = new Date().toLocaleDateString('pt-BR', {
      timeZone: 'America/Recife',
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
    const textoComContexto = `Data atual: ${hoje}\n\n${texto.trim()}`;
    const extraido = await chamarOpenAI(textoComContexto);

    // Garante que artistas é sempre array
    const artistasExtraidos = Array.isArray(extraido.artistas) ? extraido.artistas : [];

    // Resolve artistas: separa encontrados no banco dos novos
    const artistasEncontrados = [];
    const artistasNovos = [];

    for (const a of artistasExtraidos) {
      if (!a.nome) continue;
      const encontrado = await buscarArtistaNoBanco(a.nome);
      if (encontrado) {
        artistasEncontrados.push(encontrado);
      } else {
        // Cria automaticamente com os dados extraídos
        const criado = await prisma.artista.create({
          data: {
            nome: a.nome,
            instagram: a.instagram || null,
            descricao: a.descricao || null,
            criadoPor: req.usuario.id,
          },
        });
        artistasNovos.push(criado);
      }
    }

    // Resolve local: busca no banco
    const localExtraido = extraido.local || {};
    let localEncontrado = null;
    let enderecoSugerido = null;

    if (localExtraido.nome) {
      localEncontrado = await buscarLocalNoBanco(localExtraido.nome);

      // Se não encontrou no banco, busca endereço no Nominatim
      if (!localEncontrado) {
        enderecoSugerido = await buscarEndereco(
          localExtraido.nome,
          localExtraido.cidade || 'Recife'
        );
      }
    }

    res.json({
      extraido: {
        titulo: extraido.titulo || null,
        descricao: extraido.descricao || null,
        data: extraido.data || null,
        horaInicio: extraido.horaInicio || null,
        horaFim: extraido.horaFim || null,
        ingresso: extraido.ingresso || null,
        linkIngresso: extraido.linkIngresso || null,
        links: extraido.linkDivulgacao || null,
        local: localExtraido,
      },
      // Artistas já resolvidos (encontrados + criados automaticamente)
      artistasResolvidos: [...artistasEncontrados, ...artistasNovos],
      // Metadados para o frontend saber quais foram criados agora
      artistasCriados: artistasNovos.map(a => a.id),
      // Local encontrado no banco (se houver)
      localEncontrado: localEncontrado || null,
      // Sugestão de endereço do Nominatim (se local não foi encontrado no banco)
      enderecoSugerido: enderecoSugerido || null,
      // Dados brutos do post do Instagram (se veio de URL)
      postInstagram: postData ? {
        thumbnail: postData.thumbnail,
        url: postData.url,
        handle: postData.handle,
        colaboradores: postData.colaboradores,
      } : null,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
