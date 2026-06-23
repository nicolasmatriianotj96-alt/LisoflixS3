app.post('/api/favoritar', autenticarToken, async (req, res) => {
    try {
        const { filme_id } = req.body;
        const userId = req.usuario.id;

        console.log('Favoritar - userId:', userId, 'filme_id:', filme_id);

        if (!filme_id) {
            return res.status(400).json({ mensagem: 'filme_id é obrigatório' });
        }

        // Verifica se já existe
        const { data: existente } = await supabase
            .from('favoritos')
            .select('*')
            .eq('usuario_id', userId)
            .eq('filme_id', filme_id)
            .single();

        if (existente) {
            return res.status(200).json({ mensagem: 'Já favoritado' });
        }

        // Insere novo favorito
        const { data, error } = await supabase
            .from('favoritos')
            .insert([{ usuario_id: userId, filme_id: filme_id }])
            .select();

        if (error) {
            console.log('Erro Supabase favoritar:', error);
            return res.status(400).json({ mensagem: error.message });
        }

        res.status(201).json({ mensagem: 'Favoritado com sucesso', data });
    } catch (err) {
        console.log('Erro geral favoritar:', err);
        res.status(500).json({ mensagem: 'Erro interno' });
    }
});

app.delete('/api/favoritar/:filme_id', autenticarToken, async (req, res) => {
    try {
        const { filme_id } = req.params;
        const userId = req.usuario.id;

        console.log('Desfavoritar - userId:', userId, 'filme_id:', filme_id);

        const { error } = await supabase
            .from('favoritos')
            .delete()
            .eq('usuario_id', userId)
            .eq('filme_id', filme_id);

        if (error) {
            console.log('Erro Supabase desfavoritar:', error);
            return res.status(400).json({ mensagem: error.message });
        }

        res.json({ mensagem: 'Removido dos favoritos' });
    } catch (err) {
        console.log('Erro geral desfavoritar:', err);
        res.status(500).json({ mensagem: 'Erro interno' });
    }
});

app.get('/api/favoritos', autenticarToken, async (req, res) => {
    try {
        const userId = req.usuario.id;

        const { data: favs, error } = await supabase
            .from('favoritos')
            .select('filme_id')
            .eq('usuario_id', userId);

        if (error) {
            console.log('Erro buscar favoritos:', error);
            return res.status(400).json({ mensagem: error.message });
        }

        if (!favs || favs.length === 0) {
            return res.json([]);
        }

        const ids = favs.map(f => f.filme_id);

        const { data: filmes, error: errorFilmes } = await supabase
            .from('filmes')
            .select('*')
            .in('id', ids);

        if (errorFilmes) {
            console.log('Erro buscar filmes favoritos:', errorFilmes);
            return res.status(400).json({ mensagem: errorFilmes.message });
        }

        res.json(filmes);
    } catch (err) {
        console.log('Erro geral favoritos:', err);
        res.status(500).json({ mensagem: 'Erro interno' });
    }
});