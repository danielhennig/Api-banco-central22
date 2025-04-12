const express = require('express');
const router = express.Router();

const { Usuario, Conta, Instituicao } = require('../models');

// POST /usuarios
router.post('/', async (req, res) => {
    try {
        const { cpf, nome, email } = req.body;

        if (!cpf || !nome || !email) {
            return res.status(400).json({ mensagem: "CPF, nome e email são obrigatórios" });
        }

        const jaExiste = await Usuario.findOne({ where: { cpf } });

        if (jaExiste) {
            return res.status(409).json({ mensagem: "Usuário já cadastrado com este CPF" });
        }

        const usuario = await Usuario.create({ cpf, nome, email });
        res.status(201).json(usuario);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// GET /usuarios/com-contas
router.get('/com-contas', async (req, res) => {
    try {
        const usuarios = await Usuario.findAll({
            include: [{
                model: Conta,
                as: 'Contas',
                include: {
                    model: Instituicao,
                    as: 'Instituicao',
                    attributes: ['id', 'nome']
                }
            }]
        });

        const resultado = usuarios.map(usuario => {
            const instituicoes = usuario.Contas?.map(conta => conta.Instituicao) || [];

            return {
                cpf: usuario.cpf,
                nome: usuario.nome,
                instituicoes
            };
        });

        res.status(200).json(resultado);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// GET /usuarios/:cpf/saldo
router.get('/saldo', async (req, res) => {
    try {
        const { cpf } = req.body;

        const usuario = await Usuario.findByPk(cpf, {
            include: {
                model: Conta,
                as: 'Contas'
            }
        });

        if (!usuario) {
            return res.status(404).json({ mensagem: "Usuário não encontrado" });
        }

        const saldoTotal = usuario.Contas.reduce((acc, conta) => acc + conta.saldo, 0);

        res.status(200).json({
            cpf: usuario.cpf,
            nome: usuario.nome,
            saldoTotal
        });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});
//saldo por instituicao
router.get('/saldo/instituicao', async (req, res) => {
    try {
        const { cpf, instituicao } = req.query;

        const usuario = await Usuario.findOne({
            where: { cpf },
            include: {
                model: Conta,
                as: 'Contas',
                include: {
                    model: Instituicao,
                    as: 'Instituicao',
                    attributes: ['id', 'nome']
                }
            }
        });

        if (!usuario) {
            return res.status(404).json({ mensagem: "Usuário não encontrado" });
        }

        // Se tiver ?instituicao=NomeDoBanco na query
        if (instituicao) {
            const contasFiltradas = usuario.Contas.filter(conta =>
                conta.Instituicao.nome.toLowerCase() === instituicao.toLowerCase()
            );

            const saldo = contasFiltradas.reduce((acc, conta) => acc + conta.saldo, 0);

            return res.status(200).json({
                cpf: usuario.cpf,
                nome: usuario.nome,
                instituicao,
                saldo
            });
        }

        // Caso não tenha query, retorna saldo total (como antes)
        const saldoTotal = usuario.Contas.reduce((acc, conta) => acc + conta.saldo, 0);

        res.status(200).json({
            cpf: usuario.cpf,
            nome: usuario.nome,
            saldoTotal
        });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

router.delete('/', async (req, res) => {
    try {
        const { cpf } = req.body;

        const usuario = await Usuario.findByPk(cpf);
        if (!usuario) {
            return res.status(404).json({ mensagem: "Usuário não encontrado" });
        }

        await usuario.destroy(); // Sequelize vai apagar o usuário

        res.status(200).json({ mensagem: "Usuário e contas vinculadas foram deletados com sucesso" });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});




module.exports = router;
