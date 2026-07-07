import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const auth = req.headers.authorization;
        if (!auth) return res.status(401).json({ mensagem: 'Token não enviado' });

        const token = auth.split(' ')[1];
        console.log("Token recebido:", token.substring(0,20)); // aparece no log da Vercel
        console.log("JWT_SECRET usado:", process.env.JWT_SECRET); // CUIDADO: só pra teste

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const { data, error } = await supabase.from('favoritos').select('filme_id').eq('usuario_id', userId);
        if (error) throw error;
        return res.status(200).json(data);

    } catch (e) {
        console.log("ERRO JWT:", e.message); // vai aparecer "invalid signature" se a chave estiver errada
        return res.status(401).json({ mensagem: 'Token inválido: ' + e.message });
    }
}