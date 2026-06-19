const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET;

// Conexão com Postgres - Supabase/Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Cria tabelas se não existir - roda 1 vez só
async function criarTabelas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      usuario TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      foto_perfil TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS filmes (
      id SERIAL PRIMARY KEY,
      titulo TEXT NOT NULL,
      imagem_url TEXT,
      video_url TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS favoritos (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id),
      filme_id INTEGER REFERENCES filmes(id),
      UNIQUE(usuario_id, filme_id)
    );
  `);

  // Insere filmes iniciais só se tabela tiver vazia
  const { rows } = await pool.query('SELECT COUNT(*) FROM filmes');
  if (rows[0].count == 0) {
    const filmesIniciais = [
      ['Vingadores: Ultimato', 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg', 'https://www.youtube.com/watch?v=TcMBFSGVi1c'],
      ['John Wick', 'https://image.tmdb.org/t/p/w500/fZPSd91yGE9fCcCe6OoQr6E3Bev.jpg', 'https://www.youtube.com/watch?v=C0BMx-qxsP4'],
      //... cola o resto dos teus filmes aqui sem o ID
    ];

    for (const f of filmesIniciais) {
      await pool.query('INSERT INTO filmes (titulo, imagem_url, video_url) VALUES ($1, $2, $3)', f);
    }
  }
}
criarTabelas().catch(console.error);

// CORS liberando teu S3
app.use(cors({
  origin: [
    'http://lisoflix-front.s3-website-sa-east-1.amazonaws.com',
    'http://localhost:5500'
  ]
}));
app.use(express.json());

// Remove upload de foto por enquanto - Vercel não salva arquivo
// Pra foto funcionar tu vai precisar do Cloudinary/S3. Me fala se quiser que já adapto

function autenticar(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ mensagem: 'Token não fornecido' });

    jwt.verify(token, JWT_SECRET, (err, usuario) => {
        if (err) return res.status(403).json({ mensagem: 'Token inválido' });
        req.usuario = usuario;
        next();
    });
}

app.get('/api', (req, res) => {
    res.json({ status: 'API Lisoflix online' });
});

app.post('/api/cadastro', async (req, res) => {
    const { usuario, email, senha } = req.body;
    if (!usuario ||!email ||!senha) {
        return res.status(400).json({ mensagem: 'Preencha todos os campos' });
    }

    try {
        const hash = await bcrypt.hash(senha, 10);
        const result = await pool.query(
          'INSERT INTO usuarios (usuario, email, senha) VALUES ($1, $2, $3) RETURNING id, usuario, email',
          [usuario, email, hash]
        );
        res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso', usuario: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ mensagem: 'Email já cadastrado' });
        }
        res.status(500).json({ mensagem: 'Erro ao cadastrar usuário' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;
    if (!email ||!senha) {
        return res.status(400).json({ mensagem: 'Preencha todos os campos' });
    }

    try {
        const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const user = rows[0];
        if (!user) return res.status(401).json({ mensagem: 'Email ou senha incorretos' });

        const senhaValida = await bcrypt.compare(senha, user.senha);
        if (!senhaValida) return res.status(401).json({ mensagem: 'Email ou senha incorretos' });

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            id: user.id,
            nome: user.usuario,
            usuario: user.usuario,
            email: user.email,
            foto_perfil: user.foto_perfil || null
        });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro no login' });
    }
});

app.get('/api/usuario', autenticar, async (req, res) => {
    try {
        const { rows } = await pool.query(
          'SELECT id, usuario as nome, email, foto_perfil FROM usuarios WHERE id = $1',
          [req.usuario.id]
        );
        if (!rows[0]) return res.status(404).json({ mensagem: 'Usuário não encontrado' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao buscar usuário' });
    }
});

app.put('/api/usuario', autenticar, async (req, res) => {
    const userId = req.usuario.id;
    const { usuario, email, senha } = req.body;

    if (!usuario ||!email) {
        return res.status(400).json({ mensagem: 'Nome e email são obrigatórios' });
    }

    try {
        let query = 'UPDATE usuarios SET usuario = $1, email = $2';
        let params = [usuario, email];
        let count = 3;

        if (senha) {
            const hash = await bcrypt.hash(senha, 10);
            query += `, senha = $${count}`;
            params.push(hash);
            count++;
        }

        query += ` WHERE id = $${count} RETURNING id, usuario as nome, email, foto_perfil`;
        params.push(userId);

        const { rows } = await pool.query(query, params);
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao atualizar perfil' });
    }
});

app.get('/api/filmes', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM filmes ORDER BY id');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao buscar filmes' });
    }
});

app.post('/api/favoritar', autenticar, async (req, res) => {
    const { filme_id } = req.body;
    const userId = req.usuario.id;
    try {
        await pool.query('INSERT INTO favoritos (usuario_id, filme_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, filme_id]);
        res.json({ mensagem: 'Favoritado com sucesso' });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao favoritar' });
    }
});

app.delete('/api/favoritar/:filme_id', autenticar, async (req, res) => {
    const { filme_id } = req.params;
    const userId = req.usuario.id;
    try {
        await pool.query('DELETE FROM favoritos WHERE usuario_id = $1 AND filme_id = $2', [userId, filme_id]);
        res.json({ mensagem: 'Removido dos favoritos' });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao desfavoritar' });
    }
});

app.get('/api/favoritos', autenticar, async (req, res) => {
    const userId = req.usuario.id;
    try {
        const { rows } = await pool.query(`
            SELECT f.* FROM filmes f
            INNER JOIN favoritos fav ON f.id = fav.filme_id
            WHERE fav.usuario_id = $1
            ORDER BY fav.id DESC
        `, [userId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao buscar favoritos' });
    }
});

module.exports = app;