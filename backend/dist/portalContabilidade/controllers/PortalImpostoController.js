"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortalImpostoController = void 0;
const PortalImpostoService_1 = require("../services/PortalImpostoService");
const impostoService = new PortalImpostoService_1.PortalImpostoService();
class PortalImpostoController {
    async create(req, res) {
        try {
            // Considerando que o middleware de auth coloca o usuario no req.user e a empresa no req.companyId
            const companyId = req.body.companyId || req.companyId;
            const createdBy = req.user?.id;
            const data = { ...req.body, companyId, createdBy };
            const imposto = await impostoService.create(data);
            return res.status(201).json(imposto);
        }
        catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    async findAll(req, res) {
        try {
            const companyId = req.companyId || req.query.companyId;
            if (!companyId)
                return res.status(400).json({ error: 'Company ID é obrigatório' });
            const filters = {
                competencia: req.query.competencia,
                tipoImposto: req.query.tipoImposto,
                status: req.query.status,
            };
            const impostos = await impostoService.findAll(companyId, filters);
            return res.json(impostos);
        }
        catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    async findById(req, res) {
        try {
            const companyId = (req.companyId || req.query.companyId);
            const id = req.params.id;
            if (!companyId)
                return res.status(400).json({ error: 'Company ID é obrigatório' });
            const imposto = await impostoService.findById(id, companyId);
            return res.json(imposto);
        }
        catch (error) {
            return res.status(404).json({ error: error.message });
        }
    }
    async updateStatus(req, res) {
        try {
            const companyId = (req.companyId || req.body.companyId);
            const userId = req.user?.id;
            const id = req.params.id;
            if (!companyId || !userId) {
                return res.status(400).json({ error: 'Company ID e Usuário são obrigatórios' });
            }
            const imposto = await impostoService.updateStatus(id, companyId, userId, req.body);
            return res.json(imposto);
        }
        catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    async uploadAnexo(req, res) {
        try {
            const companyId = (req.companyId || req.body.companyId);
            const userId = req.user?.id;
            const id = req.params.id;
            if (!companyId || !userId) {
                return res.status(400).json({ error: 'Company ID e Usuário são obrigatórios' });
            }
            if (!req.file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado' });
            }
            const anexo = await impostoService.uploadAnexo(id, companyId, userId, req.file);
            return res.status(201).json(anexo);
        }
        catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    async bulkUpload(req, res) {
        try {
            const userId = req.user?.id;
            const files = req.files;
            const { competencia, tipoImposto, vencimento } = req.body;
            if (!userId) {
                return res.status(401).json({ error: 'Usuário não autenticado' });
            }
            if (!files || files.length === 0) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado para importação' });
            }
            if (!competencia || !tipoImposto || !vencimento) {
                return res.status(400).json({ error: 'Parâmetros competencia, tipoImposto e vencimento são obrigatórios.' });
            }
            const resultados = await impostoService.bulkUpload(userId, competencia, tipoImposto, vencimento, files);
            return res.status(200).json(resultados);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}
exports.PortalImpostoController = PortalImpostoController;
