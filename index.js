import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

if(!process.env.SUPABASE_URL ||!process.env.SUPABASE_KEY ||!process.env.JWT_SECRET){
    console.error("ERRO FATAL: FALTANDO VARIAVEL DE AMBIENTE")
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { url } = req;

    try {
        // CADASTRO
        if (url === '/api/cadastro' && req.method === 'POST') {
            const { usuario, email, senha } = req.body;
            if (!usuario ||!email ||!senha) return res.status(400).json({ mensagem: 'Preencha todos os campos' });

            const senhaHash = await bcrypt.hash(senha, 10);
            const { error } = await supabase.from('usuarios').insert([{ usuario, email, senha: senhaHash }]);
            if (error) return res.status(400).json({ mensagem: error.message });
            return res.status(201).json({ mensagem: 'Usuário criado com sucesso' });
        }

        // LOGIN
        if (url === '/api/login' && req.method === 'POST') {
            const { email, senha } = req.body;
            if (!email ||!senha) return res.status(400).json({ mensagem: 'Preencha email e senha' });

            const { data: usuario } = await supabase.from('usuarios').select('*').eq('email', email).single();
            if (!usuario) return res.status(401).json({ mensagem: 'Email ou senha inválidos' });

            const senhaValida = await bcrypt.compare(senha, usuario.senha);
            if (!senhaValida) return res.status(401).json({ mensagem: 'Email ou senha inválidos' });

            const token = jwt.sign({ id: usuario.id, usuario: usuario.usuario }, process.env.JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({ mensagem: 'Login realizado', token, usuario: usuario.usuario, email: usuario.email });
        }

        return res.status(404).json({ mensagem: 'Rota não encontrada' });

    } catch (err) {
        console.error("ERRO:", err);
        return res.status(500).json({ mensagem: 'Erro interno' });
    }
}