require('dotenv').config();

module.exports = {
  porta: Number(process.env.PORTA || 3000),
  segredoJwt: process.env.JWT_SEGREDO || 'segredo-local',
  openaiKey: process.env.OPENAI_API_KEY || '',
  limiteEventosNovato24h: 3,
  reputacaoAutoAprovacao: 100,
  limiarDenunciasSinalizado: 3
};
