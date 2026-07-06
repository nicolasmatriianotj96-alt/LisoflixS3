import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).end();

    // MUDANÇA: Vercel já faz o parse
    const { usuario, email, senha } = req.body; 

    if (!usuario || !email || !senha) return res.status(400).json({ mensagem: 'Preencha todos os campos' });
    
    const senhaHash = await bcrypt.hash(senha, 10);
    const { error } = await supabase.from('usuarios').insert([{ usuario, email, senha: senhaHash }]);
    
    if (error) {
        if (error.code === '23505') return res.status(400).json({ mensagem: 'Este email já está cadastrado' });
        return res.status(400).json({ mensagem: error.message });
    }
    
    return res.status(201).json({ mensagem: 'Usuário criado com sucesso' });
}