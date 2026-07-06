import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method!== 'GET') return res.status(405).end();

    // 1. Pega o token
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

    // 2. Busca os favoritos + dados do filme
    const { data: favoritos, error } = await supabase
       .from('favoritos')
       .select('filme_id, filmes(*)')
       .eq('usuario_id', userId);

    if (error) return res.status(500).json({ mensagem: error.message });

    // Devolve só os dados do filme
    const filmesFavoritos = favoritos.map(f => f.filmes);
    return res.status(200).json(filmesFavoritos);
}