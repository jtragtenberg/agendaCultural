const jwt = require('jsonwebtoken');
const { segredoJwt } = require('./config');

function autenticarObrigatorio(req, res, next) {
  const cabecalho = req.headers.authorization;
  if (!cabecalho || !cabecalho.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token ausente.' });
  }

  const token = cabecalho.replace('Bearer ', '');

  try {
    const payload = jwt.verify(token, segredoJwt);
    req.usuario = payload;
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
