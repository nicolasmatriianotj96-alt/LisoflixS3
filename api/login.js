import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') return res.status(405).end();

    let body = {};
    try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    } catch(e){}

    const { email, senha } = body;
    if (!email ||!senha) return res.status(400).json({ mensagem: 'Preencha email e senha' });
    
    const { data: usuario } = await supabase.from('usuarios').select('*').eq('email', email).single();
    if (!usuario) return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
    
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
    
    const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({ mensagem: 'Login realizado', token });
}