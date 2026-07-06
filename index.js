import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    let body = {};
    try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    } catch(e){}

    const url = req.url;

    // LOGIN
    if (url.includes('/api/login') && req.method === 'POST') {
        const { email, senha } = body;
        if (!email ||!senha) return res.status(400).json({ mensagem: 'Preencha email e senha' });
        
        const { data: usuario } = await supabase.from('usuarios').select('*').eq('email', email).single();
        if (!usuario) return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
        
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
        
        const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        return res.status(200).json({ mensagem: 'Login realizado', token });
    }

    // CADASTRO
    if (url.includes('/api/cadastro') && req.method === 'POST') {
        const { usuario, email, senha } = body;
        if (!usuario ||!email ||!senha) return res.status(400).json({ mensagem: 'Preencha todos os campos' });
        const senhaHash = await bcrypt.hash(senha, 10);
        const { error } = await supabase.from('usuarios').insert([{ usuario, email, senha: senhaHash }]);
        if (error) return res.status(400).json({ mensagem: error.message });
        return res.status(201).json({ mensagem: 'Usuário criado com sucesso' });
    }

    return res.status(404).json({ mensagem: 'Rota não encontrada' });
}