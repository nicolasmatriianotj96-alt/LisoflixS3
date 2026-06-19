const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

router.post("/login", async (req, res) => {
    console.log('Body recebido no login:', req.body);
    console.log('JWT_SECRET existe?', !!process.env.JWT_SECRET);

    const { email, senha, usuario } = req.body;
    const login = email || usuario;

    if (!login || !senha) {
        console.log('Faltou login ou senha');
        return res.status(400).json({ mensagem: "Preencha email/usuário e senha" });
    }

    try {
        const result = await db.query(
            "SELECT * FROM usuarios WHERE email = $1 OR usuario = $1",
            [login]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ mensagem: "Usuário não existe" });
        }

        const usuarioBanco = result.rows[0];
        const senhaValida = await bcrypt.compare(senha, usuarioBanco.senha);

        if (!senhaValida) {
            return res.status(401).json({ mensagem: "Senha incorreta" });
        }

        const token = jwt.sign(
            { id: usuarioBanco.id, email: usuarioBanco.email },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            mensagem: "Login realizado",
            token,
            nome: usuarioBanco.usuario
        });

    } catch (erro) {
        console.error('ERRO NO LOGIN:', erro);
        res.status(500).json({ mensagem: "Erro no servidor" });
    }
});

router.get("/filmes", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM filmes");
        res.json(result.rows);
    } catch (erro) {
        console.error('ERRO FILMES:', erro);
        res.status(500).json({ mensagem: "Erro ao buscar filmes" });
    }
});

module.exports = router;