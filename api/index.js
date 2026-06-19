const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS LIBERADO PRO S3
app.use(cors({
  origin: [
    'http://lisoflix-front.s3-website.us-east-2.amazonaws.com',
    'http://lisoflix-front.s3-website-sa-east-1.amazonaws.com',
    'http://localhost:5500'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer pra upload em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Conexão MySQL
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

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
    const sql = 'INSERT INTO usuarios (usuario, email, senha) VALUES (?,?,?)';
    db.query(sql, [usuario, email, hash], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ mensagem: 'Email já cadastrado' });
        }
        return res.status(500).json({ mensagem: 'Erro ao cadastrar' });
      }
      res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso' });
    });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro interno' });
  }
});

// LOGIN
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;
  if (!email ||!senha) {
    return res.status(400).json({ mensagem: 'Preencha todos os campos' });
  }

  const sql = 'SELECT * FROM usuarios WHERE email =?';
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ mensagem: 'Erro no servidor' });
    if (results.length === 0) return res.status(401).json({ mensagem: 'Email ou senha incorretos' });

    const user = results[0];
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
});

// BUSCAR DADOS DO USUARIO
app.get('/api/usuario', autenticarToken, (req, res) => {
  const sql = 'SELECT id, usuario, email, foto_perfil FROM usuarios WHERE id =?';
  db.query(sql, [req.usuario.id], (err, results) => {
    if (err) return res.status(500).json({ mensagem: 'Erro no servidor' });
    if (results.length === 0) return res.status(404).json({ mensagem: 'Usuário não encontrado' });

    const user = results[0];
    res.json({
      nome: user.usuario,
      email: user.email,
      foto_perfil: user.foto_perfil
    });
  });
});

// ATUALIZAR PERFIL
app.put('/api/usuario', autenticarToken, upload.single('foto'), async (req, res) => {
  const { usuario, email, senha } = req.body;
  const userId = req.usuario.id;

  try {
    let sql = 'UPDATE usuarios SET usuario =?, email =?';
    let params = [usuario, email];

    if (senha) {
      const hash = await bcrypt.hash(senha, 10);
      sql += ', senha =?';
      params.push(hash);
    }

    if (req.file) {
      const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      sql += ', foto_perfil =?';
      params.push(base64);
    }

    sql += ' WHERE id =?';
    params.push(userId);

    db.query(sql, params, (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ mensagem: 'Email já em uso' });
        }
        return res.status(500).json({ mensagem: 'Erro ao atualizar' });
      }

      // Retorna foto nova se atualizou
      if (req.file) {
        const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        return res.json({ mensagem: 'Perfil atualizado', foto_perfil: base64 });
      }

      res.json({ mensagem: 'Perfil atualizado' });
    });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro interno' });
  }
});

// LISTAR FILMES
app.get('/api/filmes', (req, res) => {
  const sql = 'SELECT * FROM filmes ORDER BY id DESC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ mensagem: 'Erro ao buscar filmes' });
    res.json(results);
  });
});

// LISTAR FAVORITOS
app.get('/api/favoritos', autenticarToken, (req, res) => {
  const sql = `
    SELECT f.* FROM filmes f
    INNER JOIN favoritos fav ON f.id = fav.filme_id
    WHERE fav.usuario_id =?
  `;
  db.query(sql, [req.usuario.id], (err, results) => {
    if (err) return res.status(500).json({ mensagem: 'Erro ao buscar favoritos' });
    res.json(results);
  });
});

// ADICIONAR FAVORITO
app.post('/api/favoritar', autenticarToken, (req, res) => {
  const { filme_id } = req.body;
  const sql = 'INSERT INTO favoritos (usuario_id, filme_id) VALUES (?,?)';
  db.query(sql, [req.usuario.id, filme_id], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ mensagem: 'Já favoritado' });
      }
      return res.status(500).json({ mensagem: 'Erro ao favoritar' });
    }
    res.status(201).json({ mensagem: 'Favoritado' });
  });
});

// REMOVER FAVORITO
app.delete('/api/favoritar/:id', autenticarToken, (req, res) => {
  const filme_id = req.params.id;
  const sql = 'DELETE FROM favoritos WHERE usuario_id =? AND filme_id =?';
  db.query(sql, [req.usuario.id, filme_id], (err, result) => {
    if (err) return res.status(500).json({ mensagem: 'Erro ao remover favorito' });
    res.json({ mensagem: 'Removido dos favoritos' });
  });
});

module.exports = app;