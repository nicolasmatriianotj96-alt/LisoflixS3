const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ mensagem: 'Método não permitido' });
    
    const { email, senha } = req.body;
    
    if (!email || !senha) return res.status(400).json({ mensagem: 'Preencha email e senha' });

    try {
        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !usuario) return res.status(401).json({ mensagem: 'Email ou senha inválidos' });

        const bcrypt = require('bcrypt');
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        
        if (!senhaValida) return res.status(401).json({ mensagem: 'Email ou senha inválidos' });

        const token = jwt.sign(
            { id: usuario.id, email: usuario.email }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        res.status(200).json({ 
            mensagem: 'Login realizado', 
            token, 
            usuario: usuario.usuario, 
            email: usuario.email,
            foto_perfil: usuario.foto_perfil
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ mensagem: 'Erro no servidor' });
    }
}