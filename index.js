const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: [
    'http://lisoflix-front.s3-website.us-east-2.amazonaws.com',
    'https://lisoflix-front.s3-website.us-east-2.amazonaws.com',
    'http://localhost:5500'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Conexão Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware JWT
function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ mensagem: 'Token não fornecido' });

  jwt.verify(token, process.env.JWT_SECRET, (err, usuario) => {
    if (err) return res.status(403).json({ mensagem: 'Token inválido' });
    req.usuario = usuario;
    next();
  });
}

// Teste - ERA /api, AGORA /
app.get('/', (req, res) => {
  res.json({ status: 'API Lisoflix online' });
});

// CADASTRO - ERA /api/cadastro, AGORA /cadastro
app.post('/cadastro', async (req, res) => {
  const { usuario, email, senha } = req.body;
  if (!usuario ||!email ||!senha) {
    return res.status(400).json({ mensagem: 'Preencha todos os campos' });
  }
  if (senha.length < 8) {
    return res.status(400).json({ mensagem: 'Senha precisa ter 8+ caracteres' });
  }

  try {
    const hash = await bcrypt.hash(senha, 10);
    const { error } = await supabase
   .from('usuarios')
   .insert([{ usuario, email, senha: hash }]);

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ mensagem: 'Email já cadastrado' });
      }
      return res.status(500).json({ mensagem: 'Erro ao cadastrar' });
    }
    res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso' });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro interno' });
  }
});

// LOGIN - ERA /api/login, AGORA /login
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email ||!senha) {
    return res.status(400).json({ mensagem: 'Preencha todos os campos' });
  }

  const { data: users, error } = await supabase
 .from('usuarios')
 .select('*')
 .eq('email', email)
 .limit(1);

  if (error) return res.status(500).json({ mensagem: 'Erro no servidor' });
  if (users.length === 0) return res.status(401).json({ mensagem: 'Email ou senha incorretos' });

  const user = users[0];
  const senhaValida = await bcrypt.compare(senha, user.senha);
  if (!senhaValida) return res.status(401).json({ mensagem: 'Email ou senha incorretos' });

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    nome: user.usuario,
    email: user.email,
    foto_perfil: user.foto_perfil || null
  });
});

// BUSCAR DADOS DO USUARIO - ERA /api/usuario, AGORA /usuario
app.get('/usuario', autenticarToken, async (req, res) => {
  const { data: users, error } = await supabase
 .from('usuarios')
 .select('id, usuario, email, foto_perfil')
 .eq('id', req.usuario.id)
 .limit(1);

  if (error) return res.status(500).json({ mensagem: 'Erro no servidor' });
  if (users.length === 0) return res.status(404).json({ mensagem: 'Usuário não encontrado' });

  const user = users[0];
  res.json({
    nome: user.usuario,
    email: user.email,
    foto_perfil: user.foto_perfil
  });
});

// ATUALIZAR PERFIL - ERA /api/usuario, AGORA /usuario
app.put('/usuario', autenticarToken, upload.single('foto'), async (req, res) => {
  const { usuario, email, senha } = req.body;
  const userId = req.usuario.id;

  try {
    let updateData = { usuario, email };

    if (senha) {
      updateData.senha = await bcrypt.hash(senha, 10);
    }

    if (req.file) {
      updateData.foto_perfil = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    const { error } = await supabase
   .from('usuarios')
   .update(updateData)
   .eq('id', userId);

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ mensagem: 'Email já em uso' });
      }
      return res.status(500).json({ mensagem: 'Erro ao atualizar' });
    }

    res.json({
      mensagem: 'Perfil atualizado',
      foto_perfil: updateData.foto_perfil || null
    });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro interno' });
  }
});

// LISTAR FILMES - ERA /api/filmes, AGORA /filmes
app.get('/filmes', async (req, res) => {
  const { data, error } = await supabase
 .from('filmes')
 .select('*')
 .order('id', { ascending: false });

  if (error) return res.status(500).json({ mensagem: 'Erro ao buscar filmes' });
  res.json(data);
});

// LISTAR FAVORITOS - ERA /api/favoritos, AGORA /favoritos
app.get('/favoritos', autenticarToken, async (req, res) => {
  const { data, error } = await supabase
 .from('favoritos')
 .select('filmes(*)')
 .eq('usuario_id', req.usuario.id);

  if (error) return res.status(500).json({ mensagem: 'Erro ao buscar favoritos' });
  res.json(data.map(f => f.filmes));
});

// ADICIONAR FAVORITO - ERA /api/favoritar, AGORA /favoritar
app.post('/favoritar', autenticarToken, async (req, res) => {
  const { filme_id } = req.body;
  const { error } = await supabase
 .from('favoritos')
 .insert([{ usuario_id: req.usuario.id, filme_id }]);

  if (error) {
    if (error.code === '23505') {
      return res.status(400).json({ mensagem: 'Já favoritado' });
    }
    return res.status(500).json({ mensagem: 'Erro ao favoritar' });
  }
  res.status(201).json({ mensagem: 'Favoritado' });
});

// REMOVER FAVORITO - ERA /api/favoritar/:id, AGORA /favoritar/:id
app.delete('/favoritar/:id', autenticarToken, async (req, res) => {
  const filme_id = req.params.id;
  const { error } = await supabase
 .from('favoritos')
 .delete()
 .eq('usuario_id', req.usuario.id)
 .eq('filme_id', filme_id);

  if (error) return res.status(500).json({ mensagem: 'Erro ao remover favorito' });
  res.json({ mensagem: 'Removido dos favoritos' });
});

module.exports = app;