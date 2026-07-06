import express from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://lisoflix-front.s3-website.us-east-2.amazonaws.com');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.use(express.json());

if(!process.env.SUPABASE_URL ||!process.env.SUPABASE_KEY){
    console.error("ERRO FATAL: FALTANDO SUPABASE_URL OU SUPABASE_KEY")
    process.exit(1)
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'lisoflix2026seguro';

function autenticarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ mensagem: 'Token não fornecido' });
    jwt.verify(token, JWT_SECRET, (err, usuario) => {
        if (err) return res.status(403).json({ mensagem: 'Token inválido' });
        req.usuario = usuario;
        next();
    });
}

app.post('/api/cadastro', async (req, res) => {
    try {
        const { usuario, email, senha } = req.body;
        if (!usuario ||!email ||!senha) return res.status(400).json({ mensagem: 'Preencha todos os campos' });
        const senhaHash = await bcrypt.hash(senha, 10);
        const { data, error } = await supabase.from('usuarios').insert([{ usuario, email, senha: senhaHash }]).select().single();
        if (error) return res.status(400).json({ mensagem: error.message });
        const token = jwt.sign({ id: data.id, usuario: data.usuario }, JWT_SECRET);
        res.status(201).json({ mensagem: 'Usuário criado com sucesso', token, usuario: data.usuario, email: data.email });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro interno', erro: err.message });
    }
});

//...cole o resto das rotas iguais aqui...

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

export default app;