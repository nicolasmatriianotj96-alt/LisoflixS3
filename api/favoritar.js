import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method!== 'POST') return res.status(405).end();

    try {
        const auth = req.headers.authorization;
        const token = auth.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { filme_id } = req.body;

        // Verifica se já existe
        const { data: existe } = await supabase
           .from('favoritos')
           .select('id')
           .eq('usuario_id', userId)
           .eq('filme_id', filme_id)
           .single();

        if (existe) {
            // Se existe, REMOVE
            await supabase.from('favoritos').delete().eq('id', existe.id);
            return res.status(200).json({ mensagem: 'Removido dos favoritos' });
        } else {
            // Se não existe, ADICIONA
            await supabase.from('favoritos').insert([{ usuario_id: userId, filme_id }]);
            return res.status(200).json({ mensagem: 'Adicionado aos favoritos' });
        }

    } catch (e) {
        return res.status(500).json({ mensagem: e.message });
    }
}