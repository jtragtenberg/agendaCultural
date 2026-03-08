const jwt = require('jsonwebtoken');
const { segredoJwt } = require('./config');
const prisma = require('./prisma');

async function autenticarObrigatorio(req, res, next) {
  const cabecalho = req.headers.authorization;
  if (!cabecalho || !cabecalho.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token ausente.' });
  }

  const token = cabecalho.replace('Bearer ', '');

  try {
    const payload = jwt.verify(token, segredoJwt);
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, nome: true }
    });

    if (!usuario) {
      return res.status(401).json({ erro: 'Usuário do token não existe mais. Faça login novamente.' });
    }

    req.usuario = usuario;
    return next();
  } catch (erro) {
    return res.status(401).json({ erro: 'Token inválido.' });
  }
}

function autenticarOpcional(req, _res, next) {
  const cabecalho = req.headers.authorization;
  if (!cabecalho || !cabecalho.startsWith('Bearer ')) {
    return next();
  }

  const token = cabecalho.replace('Bearer ', '');
  try {
    req.usuario = jwt.verify(token, segredoJwt);
  } catch (_erro) {
    req.usuario = null;
  }
  return next();
}

module.exports = { autenticarObrigatorio, autenticarOpcional };
