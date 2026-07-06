import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method!== 'POST') return res.status(405).end();

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

    const { filme_id } = req.body;

    // Verifica se já é favorito
    const { data: existe } = await supabase.from('favoritos').select('id').eq('usuario_id', userId).eq('filme_id', filme_id).single();

    if (existe) {
        // Remove dos favoritos
        await supabase.from('favoritos').delete().eq('id', existe.id);
        return res.status(200).json({ mensagem: 'Removido dos favoritos' });
    } else {
        // Adiciona aos favoritos
        await supabase.from('favoritos').insert([{ usuario_id: userId, filme_id }]);
        return res.status(201).json({ mensagem: 'Adicionado aos favoritos' });
    }
}