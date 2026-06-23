const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
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

// S3 Client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// Conexão Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
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

// Teste
app.get('/api', (req, res) => {
  res.json({ status: 'API Lisoflix online' });
});

// CADASTRO
app.post('/api/cadastro', async (req, res) => {
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
      console.log('Erro Supabase:', error);
      if (error.code === '23505') {
        return res.status(400).json({ mensagem: 'Email já cadastrado' });
      }
      return res.status(500).json({ mensagem: 'Erro ao cadastrar', detalhe: error.message });
    }
    res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso' });
  } catch (err) {
    console.log('Catch:', err);
    res.status(500).json({ mensagem: 'Erro interno', detalhe: err.message });
  }
});

// LOGIN - PADRONIZADO
app.post('/api/login', async (req, res) => {
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

  // PADRONIZEI: sempre retorna "usuario" e não "nome"
  res.json({
    token,
    usuario: user.usuario,
    email: user.email,
    foto_perfil: user.foto_perfil || null
  });
});

// BUSCAR DADOS DO USUARIO - ROTA ÚNICA
app.get('/api/usuario', autenticarToken, async (req, res) => {
  try {
    const { data: usuario, error } = await supabase
     .from('usuarios')
     .select('id, usuario, email, foto_perfil')
     .eq('id', req.usuario.id)
     .single();

    if (error ||!usuario) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado' });
    }

    res.json(usuario);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro no servidor' });
  }
});

// ATUALIZAR PERFIL COM S3
app.put('/api/usuario', autenticarToken, upload.single('foto'), async (req, res) => {
  const { usuario, email, senha } = req.body;
  const userId = req.usuario.id;

  try {
    let updateData = { usuario, email };

    if (senha) {
      updateData.senha = await bcrypt.hash(senha, 10);
    }

    // UPLOAD PRO S3 EM VEZ DE BASE64
    if (req.file) {
      const fileName = `avatars/${userId}-${Date.now()}.${req.file.mimetype.split('/')[1]}`;

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        ACL: 'public-read'
      });

      await s3.send(command);

      updateData.foto_perfil = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
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

    // Retorna os dados atualizados pra atualizar o localStorage
    const { data: userAtualizado } = await supabase
     .from('usuarios')
     .select('usuario, email, foto_perfil')
     .eq('id', userId)
     .single();

    res.json({
      mensagem: 'Perfil atualizado',
      usuario: userAtualizado.usuario,
      email: userAtualizado.email,
      foto_perfil: userAtualizado.foto_perfil
    });
  } catch (err) {
    console.log('Erro upload:', err);
    res.status(500).json({ mensagem: 'Erro interno' });
  }
});

// LISTAR FILMES
app.get('/api/filmes', async (req, res) => {
  const { data, error } = await supabase
   .from('filmes')
   .select('*')
   .order('id', { ascending: false });

  if (error) return res.status(500).json({ mensagem: 'Erro ao buscar filmes' });
  res.json(data);
});

// LISTAR FAVORITOS
app.get('/api/favoritos', autenticarToken, async (req, res) => {
  const { data, error } = await supabase
   .from('favoritos')
   .select('filmes(*)')
   .eq('usuario_id', req.usuario.id);

  if (error) return res.status(500).json({ mensagem: 'Erro ao buscar favoritos' });
  res.json(data.map(f => f.filmes));
});

// ADICIONAR FAVORITO
app.post('/api/favoritar', autenticarToken, async (req, res) => {
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

// REMOVER FAVORITO
app.delete('/api/favoritar/:id', autenticarToken, async (req, res) => {
  const filme_id = req.params.id;
  const { error } = await supabase
   .from('favoritos')
   .delete()
   .eq('usuario_id', req.usuario.id)
   .eq('filme_id', filme_id);

  if (error) return res.status(500).json({ mensagem: 'Erro ao remover favorito' });
  res.json({ mensagem: 'Removido dos favoritos' });
});

app.get('/', (req, res) => {
  res.json({ status: 'API Lisoflix online' });
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV!== 'production') {
  app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
}

module.exports = app;