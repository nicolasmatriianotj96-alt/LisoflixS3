import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const getBody = async (req) => {
    try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const data = Buffer.concat(chunks).toString();
        return data ? JSON.parse(data) : {};
    } catch { return {}; }
}

export default async function handler(req, res) {
    // CORS SEMPRE PRIMEIRO
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end(); // Responde preflight na hora
    }

    const { pathname } = new URL(req.url, `https://x.com`);
    const body = await getBody(req);

    try {
        // CADASTRO
        if (pathname === '/api/cadastro' && req.method === 'POST') {
            const { usuario, email, senha } = body;
            if (!usuario ||!email ||!senha) return res.status(400).json({ mensagem: 'Preencha todos os campos' });

            const senhaHash = await bcrypt.hash(senha, 10);
            const { error } = await supabase.from('usuarios').insert([{ usuario, email, senha: senhaHash }]);
            
            if (error) {
                if(error.code === '23505') return res.status(409).json({ mensagem: 'Email já cadastrado' });
                return res.status(400).json({ mensagem: error.message });
            }
            return res.status(201).json({ mensagem: 'Usuário criado com sucesso' });
        }

        // LOGIN
        if (pathname === '/api/login' && req.method === 'POST') {
            const { email, senha } = body;
            if (!email ||!senha) return res.status(400).json({ mensagem: 'Preencha email e senha' });

            const { data: usuario } = await supabase.from('usuarios').select('*').eq('email', email).single();
            if (!usuario) return res.status(401).json({ mensagem: 'Email ou senha inválidos' });

            const senhaValida = await bcrypt.compare(senha, usuario.senha);
            if (!senhaValida) return res.status(401).json({ mensagem: 'Email ou senha inválidos' });

            const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({ mensagem: 'Login realizado', token });
        }

        return res.status(404).json({ mensagem: 'Rota não encontrada' });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ mensagem: 'Erro interno', erro: err.message });
    }
}