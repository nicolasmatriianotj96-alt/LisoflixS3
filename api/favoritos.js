import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ mensagem: 'Token não enviado' });

    try {
        const token = auth.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        console.log("Buscando favoritos do user:", userId); // aparece no log da Vercel

        const { data, error } = await supabase.from('favoritos').select('filme_id').eq('usuario_id', userId);

        if (error) {
            console.log("Erro Supabase:", error);
            return res.status(500).json({ mensagem: error.message });
        }

        console.log("Retornando:", data);
        return res.status(200).json(data); // [{filme_id: 1}]

    } catch (e) {
        console.log("Erro Token:", e.message);
        return res.status(401).json({ mensagem: 'Token inválido' });
    }
}