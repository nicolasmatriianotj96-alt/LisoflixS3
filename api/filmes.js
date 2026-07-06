import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).end();

    const { data: filmes, error } = await supabase
        .from('filmes')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.log('ERRO SUPABASE:', error); // VAI APARECER NO LOG DA VERCEL
        return res.status(500).json({ mensagem: error.message });
    }

    return res.status(200).json(filmes);
}