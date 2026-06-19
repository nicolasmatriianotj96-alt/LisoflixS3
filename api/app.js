const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'seu_secret_super_seguro_aqui';

const PASTA_FRONTEND = path.join(__dirname, '..', 'FrontEnd', 'public');
const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        foto_perfil TEXT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS filmes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        imagem_url TEXT,
        video_url TEXT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS favoritos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        filme_id INTEGER,
        UNIQUE(usuario_id, filme_id),
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id),
        FOREIGN KEY(filme_id) REFERENCES filmes(id)
    )`);

    const filmesIniciais = [
        [1, 'Vingadores: Ultimato', 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg', 'https://www.youtube.com/watch?v=TcMBFSGVi1c'],
        [2, 'John Wick', 'https://image.tmdb.org/t/p/w500/fZPSd91yGE9fCcCe6OoQr6E3Bev.jpg', 'https://www.youtube.com/watch?v=C0BMx-qxsP4'],
        [3, 'Batman: O Cavaleiro das Trevas', 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', 'https://www.youtube.com/watch?v=EXeTwQWrcwY'],
        [4, 'Avatar', 'https://image.tmdb.org/t/p/w500/6EiRUJpuoeQPghrs3YNktfnqOVh.jpg', 'https://www.youtube.com/watch?v=5PSNL1qE6VY'],
        [5, 'Pantera Negra', 'https://image.tmdb.org/t/p/w500/uxzzxijgPIY7slzFvMotPv8wjKA.jpg', 'https://www.youtube.com/watch?v=xjDjIWPwcPU'],
        [6, 'Mad Max: Estrada da Fúria', 'https://image.tmdb.org/t/p/w500/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg', 'https://www.youtube.com/watch?v=hEJnMQG9ev8'],
        [7, 'Thor: Ragnarok', 'https://image.tmdb.org/t/p/w500/rzRwTcFvttcN1ZpX2xv4j3tSdJu.jpg', 'https://www.youtube.com/watch?v=ue80QwXMRHg'],
        [8, 'Oppenheimer', 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', 'https://www.youtube.com/watch?v=uYPbbksJxIg'],
        [9, 'Capitã Marvel', 'https://image.tmdb.org/t/p/w500/AtsgWhDnHTq68L0lLsUrCnM7TjG.jpg', 'https://www.youtube.com/watch?v=Z1BCujX3pw8'],
        [10, 'Homem de Ferro', 'https://image.tmdb.org/t/p/w500/78lPtwv72eTNqFW9COBYI0dWDJa.jpg', 'https://www.youtube.com/watch?v=8hYlBUDl-Uo'],
        [11, 'The Batman', 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg', 'https://www.youtube.com/watch?v=rsQEor4y2hg'],
        [12, 'Parasita', 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', 'https://www.youtube.com/watch?v=5xH0HfJHsaY'],
        [13, 'Duna', 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg', 'https://www.youtube.com/watch?v=8g18jFHCLXk'],
        [14, 'Coringa', 'https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg', 'https://www.youtube.com/watch?v=t433PEQGErc'],
        [15, 'O Lobo de Wall Street', 'https://image.tmdb.org/t/p/w500/34m2tygAYBGqA9MXKhRDtzYd4MR.jpg', 'https://www.youtube.com/watch?v=iszwuX1AK6A'],
        [16, 'Django Livre', 'https://image.tmdb.org/t/p/w500/7oWY8VDWW7thTzWh3OKYRkWUlD5.jpg', 'https://www.youtube.com/watch?v=0fUCuvNlOCg'],
        [18, 'Pulp Fiction', 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', 'https://www.youtube.com/watch?v=s7EdQ4FqbhY'],
        [19, 'Interestelar', 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', 'https://www.youtube.com/watch?v=zSWdZVtXT7E'],
        [20, 'Um Sonho de Liberdade', 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', 'https://www.youtube.com/watch?v=6hB3S9bIaco'],
        [21, 'Clube da Luta', 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', 'https://www.youtube.com/watch?v=SUXWAEX2jlg'],
        [22, 'Matrix', 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', 'https://www.youtube.com/watch?v=vKQi3bBA1y8'],
        [23, 'O Poderoso Chefão', 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', 'https://www.youtube.com/watch?v=sY1S34973zA'],
        [24, 'Forrest Gump', 'https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', 'https://www.youtube.com/watch?v=bLvqoHBptjg'],
        [25, 'O Senhor dos Anéis: A Sociedade do Anel', 'https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg', 'https://www.youtube.com/watch?v=V75dMMIW2B4'],
        [26, 'Harry Potter e a Pedra Filosofal', 'https://image.tmdb.org/t/p/w500/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg', 'https://www.youtube.com/watch?v=VyHV0BRtdxo'],
        [27, 'Star Wars: Uma Nova Esperança', 'https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg', 'https://www.youtube.com/watch?v=vZ734NWnAHA'],
        [29, 'Titanic', 'https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg', 'https://www.youtube.com/watch?v=2e-eXJ6HgkQ'],
        [30, 'Gladiador', 'https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg', 'https://www.youtube.com/watch?v=owK1qxDselE']
    ];

    const stmt = db.prepare('INSERT OR IGNORE INTO filmes (id, titulo, imagem_url, video_url) VALUES (?,?,?,?)');
    filmesIniciais.forEach(f => stmt.run(f));
    stmt.finalize();

    const hash = '$2b$10$K0MrC2X5Y5Y5Y5Y5Ye5Y5Y5Y5';
    db.run(`INSERT OR IGNORE INTO usuarios (usuario, email, senha) VALUES ('Admin', 'admin@teste.com',?)`, );
});

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'perfil-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const tiposPermitidos = /jpeg|jpg|png|gif|webp/;
        const ext = tiposPermitidos.test(path.extname(file.originalname).toLowerCase());
        const mime = tiposPermitidos.test(file.mimetype);
        cb(null, ext && mime);
    }
});

app.use(cors());
app.use(express.json());
app.use(express.static(PASTA_FRONTEND));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

app.get('/', (req, res) => {
    res.sendFile(path.join(PASTA_FRONTEND, 'index.html'));
});

app.post('/cadastro', async (req, res) => {
    const { usuario, email, senha } = req.body;
    if (!usuario ||!email ||!senha) {
        return res.status(400).json({ mensagem: 'Preencha todos os campos' });
    }

    const hash = await bcrypt.hash(senha, 10);
    db.run('INSERT INTO usuarios (usuario, email, senha) VALUES (?,?,?)', [usuario, email, hash], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ mensagem: 'Email já cadastrado' });
            }
            return res.status(500).json({ mensagem: 'Erro ao cadastrar usuário' });
        }
        res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso', usuario: { id: this.lastID, usuario, email } });
    });
});

app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    if (!email ||!senha) {
        return res.status(400).json({ mensagem: 'Preencha todos os campos' });
    }

    db.get('SELECT * FROM usuarios WHERE email =?', [email], async (err, user) => {
        if (err ||!user) {
            return res.status(401).json({ mensagem: 'Email ou senha incorretos' });
        }

        const senhaValida = await bcrypt.compare(senha, user.senha);
        if (!senhaValida) {
            return res.status(401).json({ mensagem: 'Email ou senha incorretos' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            id: user.id,
            nome: user.usuario,
            usuario: user.usuario,
            email: user.email,
            foto_perfil: user.foto_perfil || null
        });
    });
});

app.get('/usuario', autenticar, (req, res) => {
    db.get('SELECT id, usuario as nome, email, foto_perfil FROM usuarios WHERE id =?', [req.usuario.id], (err, row) => {
        if (err ||!row) return res.status(404).json({ mensagem: 'Usuário não encontrado' });
        res.json(row);
    });
});

app.put('/usuario', autenticar, upload.single('foto'), async (req, res) => {
    const userId = req.usuario.id;
    const { usuario, email, senha } = req.body;
    let foto_perfil = null;

    if (!usuario ||!email) {
        return res.status(400).json({ mensagem: 'Nome e email são obrigatórios' });
    }

    if (req.file) {
        foto_perfil = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    let query = 'UPDATE usuarios SET usuario =?, email =?';
    let params = [usuario, email];

    if (senha) {
        const hash = await bcrypt.hash(senha, 10);
        query += ', senha =?';
        params.push(hash);
    }

    if (foto_perfil) {
        query += ', foto_perfil =?';
        params.push(foto_perfil);
    }

    query += ' WHERE id =?';
    params.push(userId);

    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ mensagem: 'Erro ao atualizar perfil' });
        db.get('SELECT id, usuario as nome, email, foto_perfil FROM usuarios WHERE id =?', [userId], (err, row) => {
            res.json(row);
        });
    });
});

app.get('/filmes', (req, res) => {
    db.all('SELECT * FROM filmes ORDER BY id', [], (err, rows) => {
        if (err) return res.status(500).json({ mensagem: 'Erro ao buscar filmes' });
        res.json(rows);
    });
});

app.post('/favoritar', autenticar, (req, res) => {
    const { filme_id } = req.body;
    const userId = req.usuario.id;
    db.run('INSERT OR IGNORE INTO favoritos (usuario_id, filme_id) VALUES (?,?)', [userId, filme_id], (err) => {
        if (err) return res.status(500).json({ mensagem: 'Erro ao favoritar' });
        res.json({ mensagem: 'Favoritado com sucesso' });
    });
});

app.delete('/favoritar/:filme_id', autenticar, (req, res) => {
    const { filme_id } = req.params;
    const userId = req.usuario.id;
    db.run('DELETE FROM favoritos WHERE usuario_id =? AND filme_id =?', [userId, filme_id], (err) => {
        if (err) return res.status(500).json({ mensagem: 'Erro ao desfavoritar' });
        res.json({ mensagem: 'Removido dos favoritos' });
    });
});

app.get('/favoritos', autenticar, (req, res) => {
    const userId = req.usuario.id;
    db.all(`
        SELECT f.* FROM filmes f
        INNER JOIN favoritos fav ON f.id = fav.filme_id
        WHERE fav.usuario_id =?
        ORDER BY fav.id DESC
    `, [userId], (err, rows) => {
        if (err) return res.status(500).json({ mensagem: 'Erro ao buscar favoritos' });
        res.json(rows);
    });
});

module.exports = app;