const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

// MIDDLEWARE MANUAL DE CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://lisoflix-front.s3-website.us-east-2.amazonaws.com');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const JWT_SECRET = 'lisoflix2026seguro';

// Middleware de autenticação
function autenticarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ mensagem: 'Token não fornecido' });
    }

    jwt.verify(token, JWT_SECRET, (err, usuario) => {
        if (err) {
            return res.status(403).json({ mensagem: 'Token inválido' });
        }
        req.usuario = usuario;
        next();
    });
}

// ROTA: Cadastro
app.post('/api/cadastro', async (req, res) => {
    try {
        const { usuario, email, senha } = req.body;
        console.log('Cadastro recebido:', usuario, email);

        if (!usuario ||!email ||!senha) {
            return res.status(400).json({ mensagem: 'Preencha todos os campos' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);
        console.log('Hash gerado:', senhaHash.substring(0, 20) + '...');

        const { data, error } = await supabase
       .from('usuarios')
       .insert([{ usuario, email, senha: senhaHash }])
       .select()
       .single();

        if (error) {
            console.log('Erro cadastro Supabase:', error);
            if (error.code === '23505') {
                return res.status(400).json({ mensagem: 'Usuário ou email já existe' });
            }
            return res.status(400).json({ mensagem: error.message });
        }

        console.log('Usuario criado ID:', data.id);
        const token = jwt.sign({ id: data.id, usuario: data.usuario }, JWT_SECRET);

        res.status(201).json({
            mensagem: 'Usuário criado com sucesso',
            token,
            usuario: data.usuario,
            email: data.email
        });
    } catch (err) {
        console.log('Erro geral cadastro:', err);
        res.status(500).json({ mensagem: 'Erro interno' });
    }
});

// ROTA: Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body  // ← email
        console.log('Tentativa login:', email)

        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', email)  // ← busca por email
            .single()

        if (error || !data) {
            return res.status(401).json({ mensagem: 'Usuário ou senha inválidos' })
        }

        const senhaValida = await bcrypt.compare(senha, data.senha)

        if (!senhaValida) {
            return res.status(401).json({ mensagem: 'Usuário ou senha inválidos' })
        }

        const token = jwt.sign({ id: data.id, usuario: data.usuario }, JWT_SECRET)

        res.json({
            mensagem: 'Login realizado',
            token,
            usuario: data.usuario,  // ← vem do banco, não do req.body
            email: data.email
        })
    } catch (err) {
        console.log('Erro geral login:', err)
        res.status(500).json({ mensagem: 'Erro interno' })
    }
})

// ROTA: Buscar dados do usuário
app.get('/api/usuario', autenticarToken, async (req, res) => {
    try {
        const { data, error } = await supabase
       .from('usuarios')
       .select('id, usuario, email')
       .eq('id', req.usuario.id)
       .single();

        if (error) {
            console.log('Erro buscar usuario:', error);
            return res.status(400).json({ mensagem: error.message });
        }

        res.json(data);
    } catch (err) {
        console.log('Erro geral usuario:', err);
        res.status(500).json({ mensagem: 'Erro interno' });
    }
});

// ROTA: Atualizar perfil
app.put('/api/usuario', autenticarToken, async (req, res) => {
    try {
        const { usuario, email, senha } = req.body;
        const userId = req.usuario.id;

        const dados = { usuario, email };

        if (senha) {
            dados.senha = await bcrypt.hash(senha, 10);
        }

        const { data, error } = await supabase
       .from('usuarios')
       .update(dados)
       .eq('id', userId)
       .select('id, usuario, email')
       .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ mensagem: 'Usuário ou email já existe' });
            }
            return res.status(400).json({ mensagem: error.message });
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro interno' });
    }
});

// ROTA: Listar filmes
app.get('/api/filmes', async (req, res) => {
    try {
        console.log('Buscando filmes...');
        const { data, error } = await supabase
       .from('filmes')
       .select('*')
       .order('titulo');

        if (error) {
            console.log('Erro Supabase filmes:', error);
            return res.status(400).json({ mensagem: error.message });
        }

        console.log('Filmes encontrados:', data?.length || 0);
        res.json(data || []);
    } catch (err) {
        console.log('Erro geral filmes:', err);
        res.status(500).json({ mensagem: 'Erro interno', detalhe: err.message });
    }
});

// ROTA: Favoritar filme
app.post('/api/favoritar', autenticarToken, async (req, res) => {
    try {
        const { filme_id } = req.body;
        const userId = req.usuario.id;

        console.log('Favoritar - userId:', userId, 'filme_id:', filme_id);

        if (!filme_id) {
            return res.status(400).json({ mensagem: 'filme_id é obrigatório' });
        }

        const { data: existente, error: errorBusca } = await supabase
       .from('favoritos')
       .select('*')
       .eq('usuario_id', userId)
       .eq('filme_id', filme_id)
       .maybeSingle();

        if (errorBusca) {
            console.log('Erro buscar existente:', errorBusca);
            return res.status(400).json({ mensagem: errorBusca.message });
        }

        if (existente) {
            return res.status(200).json({ mensagem: 'Já favoritado' });
        }

        const { data, error } = await supabase
       .from('favoritos')
       .insert([{ usuario_id: userId, filme_id: filme_id }])
       .select();

        if (error) {
            console.log('Erro Supabase favoritar:', error);
            return res.status(400).json({ mensagem: error.message, detalhe: error.details });
        }

        res.status(201).json({ mensagem: 'Favoritado com sucesso', data });
    } catch (err) {
        console.log('Erro geral favoritar:', err);
        res.status(500).json({ mensagem: 'Erro interno' });
    }
});

// ROTA: Desfavoritar filme
app.delete('/api/favoritar/:filme_id', autenticarToken, async (req, res) => {
    try {
        const filme_id = req.params.filme_id;
        const userId = req.usuario.id;

        const { error } = await supabase
       .from('favoritos')
       .delete()
       .eq('usuario_id', userId)
       .eq('filme_id', filme_id);

        if (error) {
            console.log('Erro Supabase desfavoritar:', error);
            return res.status(400).json({ mensagem: error.message });
        }

        res.json({ mensagem: 'Removido dos favoritos' });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro interno' });
    }
});

// ROTA: Listar favoritos
app.get('/api/favoritos', autenticarToken, async (req, res) => {
    try {
        const userId = req.usuario.id;

        const { data: favs, error } = await supabase
       .from('favoritos')
       .select('filme_id')
       .eq('usuario_id', userId);

        if (error) {
            console.log('Erro buscar favoritos:', error);
            return res.status(400).json({ mensagem: error.message });
        }

        if (!favs || favs.length === 0) {
            return res.json([]);
        }

        const ids = favs.map(f => f.filme_id);

        const { data: filmes, error: errorFilmes } = await supabase
       .from('filmes')
       .select('*')
       .in('id', ids);

        if (errorFilmes) {
            console.log('Erro buscar filmes favoritos:', errorFilmes);
            return res.status(400).json({ mensagem: errorFilmes.message });
        }

        res.json(filmes);
    } catch (err) {
        console.log('Erro geral favoritos:', err);
        res.status(500).json({ mensagem: 'Erro interno' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;