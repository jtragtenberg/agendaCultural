const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../prisma');
const { segredoJwt } = require('../../config');

function respostaAutenticacao(usuario) {
  const token = jwt.sign(
    { id: usuario.id, email: usuario.email, nome: usuario.nome, funcao: usuario.funcao },
    segredoJwt,
    { expiresIn: '7d' }
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      reputacao: usuario.reputacao,
      verificado: usuario.verificado,
      funcao: usuario.funcao
    }
  };
}

const rotas = express.Router();

rotas.post('/cadastro', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'nome, email e senha são obrigatórios.' });
    }

    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) {
      return res.status(409).json({ erro: 'E-mail já cadastrado.' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senhaHash
      }
    });

    return res.status(201).json(respostaAutenticacao(usuario));
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao cadastrar usuário.' });
  }
});

rotas.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const valido = await bcrypt.compare(senha, usuario.senhaHash);
    if (!valido) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    return res.json(respostaAutenticacao(usuario));
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao autenticar usuário.' });
  }
});

rotas.post('/login-administrador', async (req, res) => {
  try {
    const { email, senha } = req.body;

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const valido = await bcrypt.compare(senha, usuario.senhaHash);
    if (!valido || usuario.funcao !== 'administrador') {
      return res.status(403).json({ erro: 'Acesso permitido apenas para administrador.' });
    }

    return res.json(respostaAutenticacao(usuario));
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao autenticar administrador.' });
  }
});

module.exports = rotas;
