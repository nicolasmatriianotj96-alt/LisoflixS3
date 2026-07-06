import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

console.log("SUPABASE_URL:", !!process.env.SUPABASE_URL);
console.log("SUPABASE_KEY:", !!process.env.SUPABASE_KEY);
console.log("JWT_SECRET:", !!process.env.JWT_SECRET);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
    // CORS LIBERADO PRA TUDO
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    
    if (req.method === 'OPTIONS') return res.status(200).end();

    let body = {};
    try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    } catch(e){}

    const { pathname } = new URL(req.url, `https://x.com`);

    try {
        if (pathname === '/api/cadastro' && req.method === 'POST') {
            const { usuario, email, senha } = body;
            if (!usuario ||!email ||!senha) return res.status(400).json({ mensagem: 'Preencha todos os campos' });
            const senhaHash = await bcrypt.hash(senha, 10);
            const { error } = await supabase.from('usuarios').insert([{ usuario, email, senha: senhaHash }]);
            if (error) return res.status(400).json({ mensagem: error.message });
            return res.status(201).json({ mensagem: 'Usuário criado com sucesso' });
        }

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
        return res.status(500).json({ mensagem: 'Erro interno', erro: err.message });
    }
}