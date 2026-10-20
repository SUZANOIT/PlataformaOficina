import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { PortalImpostoController } from '../controllers/PortalImpostoController';
import { PortalRoleFlags, resolvePortalAccess } from '../portalImposto.rules';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

function runUpload(parser: (req: Request, res: Response, next: NextFunction) => void) {
  return (req: Request, res: Response, next: NextFunction) => {
    parser(req, res, (error: any) => {
      if (!error) return next();
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'O arquivo excede o limite de 20 MB.'
        : error.message || 'Falha no upload.';
      return res.status(400).json({ error: message });
    });
  };
}

function flagsFrom(req: Request): PortalRoleFlags {
  const roles = (req as any).roles || {};
  return {
    admin: !!roles.admin,
    contabilidade: !!roles.contabilidade,
    contasPagar: !!roles.contasPagar,
    contasReceber: !!roles.contasReceber,
  };
}

function requireRead(req: Request, res: Response, next: NextFunction) {
  const access = resolvePortalAccess(flagsFrom(req));
  if (!access.canRead) {
    return res.status(403).json({ error: 'Acesso restrito ao portal de impostos.' });
  }
  (req as any).portalAccess = access;
  return next();
}

function requireManage(req: Request, res: Response, next: NextFunction) {
  const access = resolvePortalAccess(flagsFrom(req));
  if (!access.canManage) {
    return res.status(403).json({ error: 'Seu perfil pode consultar e baixar impostos, mas não alterá-los.' });
  }
  (req as any).portalAccess = access;
  return next();
}

const router = Router();
const impostoController = new PortalImpostoController();

router.get('/', requireRead, impostoController.findAll.bind(impostoController));
router.post('/bulk-upload', requireManage, runUpload(upload.array('files')), impostoController.bulkUpload.bind(impostoController));
router.post('/download-lote', requireRead, impostoController.downloadLote.bind(impostoController));
router.get('/:id/arquivo', requireRead, impostoController.downloadArquivo.bind(impostoController));
router.get('/:id', requireRead, impostoController.findById.bind(impostoController));
router.patch('/:id/status', requireManage, impostoController.updateStatus.bind(impostoController));
router.patch('/:id', requireManage, impostoController.update.bind(impostoController));
router.delete('/:id', requireManage, impostoController.remove.bind(impostoController));
router.post('/', requireManage, impostoController.create.bind(impostoController));
router.post('/:id/anexos', requireManage, runUpload(upload.single('file')), impostoController.uploadAnexo.bind(impostoController));

export { router as portalImpostoRoutes };
