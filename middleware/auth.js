const jwt = require("jsonwebtoken");

function verificarToken(req, res, next) {

    const authHeader = req.headers.authorization;

    // verifica se existe token
    if (!authHeader) {

        return res.status(401).json({
            mensagem: "Token não fornecido"
        });

    }

    // separa Bearer do token
    const token = authHeader.split(" ")[1];

    try {

        // verifica token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // salva dados do usuário
        req.usuario = decoded;

        next();

    } catch (erro) {

        return res.status(401).json({
            mensagem: "Token inválido"
        });

    }

}

module.exports = verificarToken;