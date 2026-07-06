import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // 1. PEGAR O TOKEN
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ mensagem: 'Token não enviado' });

    const token = auth.split(' ')[1];
    let userId;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
    } catch {
        return res.status(401).json({ mensagem: 'Token inválido' });
    }

    // 2. GET - BUSCAR DADOS DO USUARIO
    if (req.method === 'GET') {
        const { data: usuario } = await supabase
           .from('usuarios')
           .select('id, usuario, email')
           .eq('id', userId)
           .single();

        if (!usuario) return res.status(404).json({ mensagem: 'Usuário não encontrado' });
        return res.status(200).json(usuario);
    }

    // 3. PUT - ATUALIZAR PERFIL
    if (req.method === 'PUT') {
        let body = {};
        try {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
        } catch(e){}

        const { usuario, email, senha } = body;
        const updateData = { usuario, email };

        if (senha) {
            const bcrypt = await import('bcryptjs');
            updateData.senha = await bcrypt.default.hash(senha, 10);
        }

        const { data, error } = await supabase
           .from('usuarios')
           .update(updateData)
           .eq('id', userId)
           .select()
           .single();

        if (error) return res.status(400).json({ mensagem: error.message });
        return res.status(200).json(data);
    }

    return res.status(405).end();
}