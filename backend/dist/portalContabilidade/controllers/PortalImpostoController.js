"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortalImpostoController = void 0;
const archiver_1 = require("archiver");
const PortalImpostoService_1 = require("../services/PortalImpostoService");
const impostoService = new PortalImpostoService_1.PortalImpostoService();
function scopeOf(req) {
    const access = req.portalAccess;
    return {
        allCompanies: access.scope === 'all',
        companyId: req.companyId,
    };
}
function userIdOf(req) {
    return req.userId;
}
function sendError(res, error, fallback = 400) {
    const status = error instanceof PortalImpostoService_1.PortalHttpError ? error.status : error.status || fallback;
    return res.status(status).json({ error: error.message || 'Erro inesperado.' });
}
class PortalImpostoController {
    async create(req, res) {
        try {
            const companyId = req.body.companyId || req.companyId;
            const createdBy = userIdOf(req);
            const imposto = await impostoService.create({ ...req.body, companyId, createdBy });
            return res.status(201).json(imposto);
        }
        catch (error) {
            return sendError(res, error);
        }
    }
    async findAll(req, res) {
        try {
            const impostos = await impostoService.findAll(scopeOf(req), {
                competencia: req.query.competencia,
                tipoImposto: req.query.tipoImposto,
                status: req.query.status,
                cnpj: req.query.cnpj,
                page: req.query.page,
                pageSize: req.query.pageSize,
                sortBy: req.query.sortBy,
                sortDir: req.query.sortDir,
            });
            return res.json(impostos);
        }
        catch (error) {
            return sendError(res, error);
        }
    }
    async findById(req, res) {
        try {
            const imposto = await impostoService.findById(req.params.id, scopeOf(req));
            return res.json(imposto);
        }
        catch (error) {
            return sendError(res, error, 404);
        }
    }
    async update(req, res) {
        try {
            const imposto = await impostoService.update(req.params.id, userIdOf(req), scopeOf(req), req.body);
            return res.json(imposto);
        }
        catch (error) {
            return sendError(res, error);
        }
    }
    async updateStatus(req, res) {
        try {
            const imposto = await impostoService.updateStatus(req.params.id, scopeOf(req), userIdOf(req), req.body);
            return res.json(imposto);
        }
        catch (error) {
            return sendError(res, error);
        }
    }
    async remove(req, res) {
        try {
            const result = await impostoService.remove(req.params.id, userIdOf(req), scopeOf(req));
            return res.json(result);
        }
        catch (error) {
            return sendError(res, error);
        }
    }
    async uploadAnexo(req, res) {
        try {
            if (!req.file)
                return res.status(400).json({ error: 'Nenhum arquivo enviado' });
            const anexo = await impostoService.uploadAnexo(req.params.id, scopeOf(req), userIdOf(req), req.file);
            return res.status(201).json(anexo);
        }
        catch (error) {
            return sendError(res, error);
        }
    }
    async downloadArquivo(req, res) {
        try {
            const arquivo = await impostoService.getArquivo(req.params.id, scopeOf(req));
            const inline = req.query.disposition === 'inline';
            res.setHeader('Content-Type', arquivo.mime);
            res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${arquivo.filename.replace(/"/g, '')}"`);
            return res.send(arquivo.buffer);
        }
        catch (error) {
            return sendError(res, error, 404);
        }
    }
    async downloadLote(req, res) {
        try {
            const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
            if (ids.length === 0)
                return res.status(400).json({ error: 'Selecione ao menos um imposto.' });
            const files = await impostoService.getArquivos(ids, scopeOf(req));
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', 'attachment; filename="impostos.zip"');
            const archive = new archiver_1.ZipArchive({ zlib: { level: 9 } });
            archive.on('error', () => {
                if (!res.headersSent)
                    res.status(500).json({ error: 'Erro ao gerar arquivo ZIP.' });
            });
            archive.pipe(res);
            const usados = new Set();
            files.forEach((file, index) => {
                let name = file.filename || `imposto-${index + 1}.pdf`;
                if (usados.has(name))
                    name = `${index + 1}-${name}`;
                usados.add(name);
                archive.append(file.buffer, { name });
            });
            await archive.finalize();
            return;
        }
        catch (error) {
            return sendError(res, error, 404);
        }
    }
    async bulkUpload(req, res) {
        try {
            const userId = userIdOf(req);
            if (!userId)
                return res.status(401).json({ error: 'Usuário não autenticado' });
            const files = req.files || [];
            if (files.length === 0)
                return res.status(400).json({ error: 'Nenhum arquivo enviado para importação' });
            const { competencia, tipoImposto, vencimento, valor } = req.body;
            const resultados = await impostoService.bulkUpload(userId, competencia, tipoImposto, vencimento, valor, files);
            return res.status(200).json(resultados);
        }
        catch (error) {
            return sendError(res, error, 500);
        }
    }
}
exports.PortalImpostoController = PortalImpostoController;
