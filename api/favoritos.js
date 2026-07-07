import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method!== 'GET') return res.status(405).end();

    try {
        const auth = req.headers.authorization;
        const token = auth.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const { data, error } = await supabase
        .from('favoritos')
        .select('filme_id')
        .eq('usuario_id', userId);

        if (error) throw error;
        return res.status(200).json(data); // [{filme_id: 1}]

    } catch (e) {
        return res.status(401).json({ mensagem: 'Token inválido' });
    }
}