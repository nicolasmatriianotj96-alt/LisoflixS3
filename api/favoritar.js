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
        if (!auth) return res.status(401).json({ mensagem: 'Token não enviado' });

        const token = auth.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { filme_id } = req.body;

        if (!filme_id) return res.status(400).json({ mensagem: 'filme_id faltando' });

        // 1. Verifica se já existe
        const { data: existe, error: errBusca } = await supabase
          .from('favoritos')
          .select('id')
          .eq('usuario_id', userId)
          .eq('filme_id', filme_id)
          .maybeSingle(); // maybeSingle não quebra se não achar

        if (errBusca) throw errBusca;

        if (existe) {
            // 2. Se existe, REMOVE
            const { error: errDel } = await supabase.from('favoritos').delete().eq('id', existe.id);
            if (errDel) throw errDel;
            return res.status(200).json({ mensagem: 'Removido dos favoritos' });
        } else {
            // 3. Se não existe, ADICIONA
            const { error: errIns } = await supabase.from('favoritos').insert([{ usuario_id: userId, filme_id }]);
            if (errIns) throw errIns;
            return res.status(200).json({ mensagem: 'Adicionado aos favoritos' });
        }

    } catch (e) {
        console.log("ERRO FAVORITAR:", e); // Olha isso no log da Vercel
        return res.status(500).json({ mensagem: e.message });
    }
}