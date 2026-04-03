const express = require('express');
const prisma = require('../../prisma');
const { openaiKey } = require('../../config');

const router = express.Router();

const PROMPT_SISTEMA = `Você é um assistente que extrai informações de eventos culturais a partir de textos livres (posts do Instagram, notícias, descrições curtas).

Retorne SOMENTE um JSON válido com os seguintes campos (use null para campos não encontrados):
{
  "titulo": string | null,
  "descricao": string | null,
  "data": "YYYY-MM-DD" | null,
  "horaInicio": "HH:MM" | null,
  "horaFim": "HH:MM" | null,
  "nomeLocal": string | null,
  "enderecoLocal": string | null,
  "bairroLocal": string | null,
  "cidadeLocal": "Recife",
  "nomeArtista": string | null
}

Regras:
- data deve estar no formato YYYY-MM-DD
- horaInicio e horaFim devem estar no formato HH:MM (24h)
- Se o texto mencionar apenas hora de início, deixe horaFim null
- Se o texto não mencionar data, deixe data null
- Para o campo descricao, use o texto original do evento adaptado, sem hashtags e sem mencionar preços ou links
- nomeArtista: apenas o nome principal do artista/grupo (se houver vários, o mais destacado)
- nomeLocal: nome do espaço/venue (teatro, casa de shows, bar, etc)
- Nunca invente informações que não estejam no texto
- A primeira linha da mensagem do usuário contém a data atual. Use-a para inferir o ano correto quando o texto não mencionar o ano explicitamente. Nunca use um ano anterior à data atual`;

async function chamarOpenAI(texto) {
  if (!openaiKey) {
    throw new Error('OPENAI_API_KEY não configurada no servidor.');
  }

  const resposta = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: PROMPT_SISTEMA },
        { role: 'user', content: texto },
      ],
      temperature: 0.2,
      max_tokens: 500,
    }),
  });

  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro?.error?.message || `Erro OpenAI: ${resposta.status}`);
  }

  const dados = await resposta.json();
  return JSON.parse(dados.choices[0].message.content);
}

async function buscarLocalExistente(nome) {
  if (!nome) return null;
  const termo = nome.trim().toLowerCase();
  const locais = await prisma.local.findMany({
    where: {
      nome: { contains: termo, mode: 'insensitive' },
    },
    take: 3,
    orderBy: { nome: 'asc' },
  });
  return locais;
}

async function buscarArtistaExistente(nome) {
  if (!nome) return null;
  const termo = nome.trim().toLowerCase();
  const artistas = await prisma.artista.findMany({
    where: {
      nome: { contains: termo, mode: 'insensitive' },
    },
    take: 3,
    orderBy: { nome: 'asc' },
  });
  return artistas;
}

router.post('/ia/extrair-evento', async (req, res, next) => {
  try {
    const { texto } = req.body;
    if (!texto || !texto.trim()) {
      return res.status(400).json({ erro: 'Campo "texto" é obrigatório.' });
    }

    const hoje = new Date().toLocaleDateString('pt-BR', {
      timeZone: 'America/Recife',
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
    const textoComContexto = `Data atual: ${hoje}\n\n${texto.trim()}`;
    const extraido = await chamarOpenAI(textoComContexto);

    const [locaisEncontrados, artistasEncontrados] = await Promise.all([
      buscarLocalExistente(extraido.nomeLocal),
      buscarArtistaExistente(extraido.nomeArtista),
    ]);

    res.json({
      extraido,
      locaisEncontrados: locaisEncontrados || [],
      artistasEncontrados: artistasEncontrados || [],
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
