"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.portalImpostoRoutes = void 0;
const express_1 = require("express");
const PortalImpostoController_1 = require("../controllers/PortalImpostoController");
// Importe middlewares de auth aqui (ex: authMiddleware, requireRole)
// import { authMiddleware } from '../../middlewares/auth';
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024, // 20 MB (conforme requisito)
    }
});
const router = (0, express_1.Router)();
exports.portalImpostoRoutes = router;
const impostoController = new PortalImpostoController_1.PortalImpostoController();
// Como as regras de permissão (RBAC) precisam ser aplicadas, você adicionaria os middlewares nas rotas.
// router.use(authMiddleware);
router.post('/', impostoController.create.bind(impostoController));
router.get('/', impostoController.findAll.bind(impostoController));
router.get('/:id', impostoController.findById.bind(impostoController));
router.patch('/:id/status', impostoController.updateStatus.bind(impostoController));
router.post('/:id/anexos', upload.single('file'), impostoController.uploadAnexo.bind(impostoController));
