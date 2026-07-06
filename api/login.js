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

    // MUDANÇA: Vercel já faz o parse
    const { email, senha } = req.body; 

    if (!email || !senha) return res.status(400).json({ mensagem: 'Preencha email e senha' });
    
    const { data: usuario, error } = await supabase.from('usuarios').select('*').eq('email', email).single();
    if (error || !usuario) return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
    
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
    
    const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    return res.status(200).json({ 
        mensagem: 'Login realizado', 
        token,
        usuario: usuario.usuario,
        email: usuario.email,
        foto_perfil: usuario.foto_perfil || null
    });
}