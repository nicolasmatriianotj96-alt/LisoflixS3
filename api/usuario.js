import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const auth = req.headers.authorization;
        const token = auth.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        if (req.method === 'GET') {
            const { data: usuario, error } = await supabase
               .from('usuarios')
               .select('id, nome, email, foto_perfil')
               .eq('id', userId)
               .single();

            if (error) throw error;
            return res.status(200).json(usuario);
        }

        if (req.method === 'PUT') {
            const { nome, email, senha } = req.body;
            const updateData = { nome, email };

            const { data, error } = await supabase
               .from('usuarios')
               .update(updateData)
               .eq('id', userId)
               .select()
               .single();

            if (error) throw error;
            return res.status(200).json({ mensagem: 'Perfil atualizado' });
        }

    } catch (e) {
        console.log("ERRO USUARIO:", e);
        return res.status(401).json({ mensagem: 'Token inválido' });
    }
}