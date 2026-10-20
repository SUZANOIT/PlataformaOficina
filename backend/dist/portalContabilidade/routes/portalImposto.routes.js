"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.portalImpostoRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const PortalImpostoController_1 = require("../controllers/PortalImpostoController");
const portalImposto_rules_1 = require("../portalImposto.rules");
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024,
    },
});
function runUpload(parser) {
    return (req, res, next) => {
        parser(req, res, (error) => {
            if (!error)
                return next();
            const message = error.code === 'LIMIT_FILE_SIZE'
                ? 'O arquivo excede o limite de 20 MB.'
                : error.message || 'Falha no upload.';
            return res.status(400).json({ error: message });
        });
    };
}
function flagsFrom(req) {
    const roles = req.roles || {};
    return {
        admin: !!roles.admin,
        contabilidade: !!roles.contabilidade,
        contasPagar: !!roles.contasPagar,
        contasReceber: !!roles.contasReceber,
    };
}
function requireRead(req, res, next) {
    const access = (0, portalImposto_rules_1.resolvePortalAccess)(flagsFrom(req));
    if (!access.canRead) {
        return res.status(403).json({ error: 'Acesso restrito ao portal de impostos.' });
    }
    req.portalAccess = access;
    return next();
}
function requireManage(req, res, next) {
    const access = (0, portalImposto_rules_1.resolvePortalAccess)(flagsFrom(req));
    if (!access.canManage) {
        return res.status(403).json({ error: 'Seu perfil pode consultar e baixar impostos, mas não alterá-los.' });
    }
    req.portalAccess = access;
    return next();
}
function requireContasPagar(req, res, next) {
    const flags = flagsFrom(req);
    const access = (0, portalImposto_rules_1.resolvePortalAccess)(flags);
    if (!access.canRead || !(flags.admin || flags.contasPagar)) {
        return res.status(403).json({ error: 'Apenas Contas a Pagar ou administradores podem lançar impostos.' });
    }
    req.portalAccess = access;
    return next();
}
const router = (0, express_1.Router)();
exports.portalImpostoRoutes = router;
const impostoController = new PortalImpostoController_1.PortalImpostoController();
router.get('/', requireRead, impostoController.findAll.bind(impostoController));
router.get('/resumo-mensal', requireRead, impostoController.resumoMensal.bind(impostoController));
router.post('/bulk-upload', requireManage, runUpload(upload.array('files')), impostoController.bulkUpload.bind(impostoController));
router.post('/download-lote', requireRead, impostoController.downloadLote.bind(impostoController));
router.get('/:id/arquivo', requireRead, impostoController.downloadArquivo.bind(impostoController));
router.get('/:id', requireRead, impostoController.findById.bind(impostoController));
router.post('/:id/contas-pagar', requireContasPagar, impostoController.lancarContasPagar.bind(impostoController));
router.patch('/:id/status', requireManage, impostoController.updateStatus.bind(impostoController));
router.patch('/:id', requireManage, impostoController.update.bind(impostoController));
router.delete('/:id', requireManage, impostoController.remove.bind(impostoController));
router.post('/', requireManage, impostoController.create.bind(impostoController));
router.post('/:id/anexos', requireManage, runUpload(upload.single('file')), impostoController.uploadAnexo.bind(impostoController));
