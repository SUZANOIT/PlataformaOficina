import { Router } from 'express';
import { PortalImpostoController } from '../controllers/PortalImpostoController';

// Importe middlewares de auth aqui (ex: authMiddleware, requireRole)
// import { authMiddleware } from '../../middlewares/auth';

import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB (conforme requisito)
  }
});

const router = Router();
const impostoController = new PortalImpostoController();

// Como as regras de permissão (RBAC) precisam ser aplicadas, você adicionaria os middlewares nas rotas.
// router.use(authMiddleware);

router.post('/', impostoController.create.bind(impostoController));
router.post('/bulk-upload', upload.array('files'), impostoController.bulkUpload.bind(impostoController));
router.get('/', impostoController.findAll.bind(impostoController));
router.get('/:id', impostoController.findById.bind(impostoController));
router.patch('/:id/status', impostoController.updateStatus.bind(impostoController));
router.post('/:id/anexos', upload.single('file'), impostoController.uploadAnexo.bind(impostoController));

export { router as portalImpostoRoutes };
