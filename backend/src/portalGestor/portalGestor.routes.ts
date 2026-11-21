import { Router } from 'express';
import { PortalGestorController as C } from './portalGestor.controller';
import { requirePortalUser } from './portalGestor.scope';

/**
 * Portal do Gestor de Frota — montado em /portal-gestor com authMiddleware.
 * Todas as rotas exigem usuário do portal; o escopo (oficina + cliente PJ) é
 * resolvido no authMiddleware e aplicado em cada consulta do controller.
 */
export const portalGestorRoutes = Router();

portalGestorRoutes.use(requirePortalUser);

portalGestorRoutes.get('/dashboard', C.dashboard);
portalGestorRoutes.get('/dashboard/gastos-veiculos', C.vehicleSpend);

portalGestorRoutes.get('/empresa', C.getEmpresa);
portalGestorRoutes.put('/empresa', C.updateEmpresa);

portalGestorRoutes.get('/veiculos', C.listVehicles);
portalGestorRoutes.get('/veiculos/:id', C.getVehicle);

portalGestorRoutes.get('/orcamentos', C.listQuotes);
portalGestorRoutes.get('/orcamentos/:id', C.getQuote);
portalGestorRoutes.post('/orcamentos/:id/aprovar', C.approveQuote);
portalGestorRoutes.post('/orcamentos/:id/recusar', C.rejectQuote);

portalGestorRoutes.get('/ordens-servico', C.listServiceOrders);
portalGestorRoutes.get('/manutencoes', C.listMaintenance);

portalGestorRoutes.get('/documentos', C.listDocuments);
portalGestorRoutes.get('/documentos/os/:id/download', C.downloadOsDocument);
portalGestorRoutes.get('/documentos/financeiro/:id/download', C.downloadFinancialDocument);

portalGestorRoutes.get('/financeiro', C.financial);

portalGestorRoutes.get('/motoristas', C.listDrivers);
portalGestorRoutes.post('/motoristas', C.createDriver);
portalGestorRoutes.put('/motoristas/:id', C.updateDriver);
portalGestorRoutes.delete('/motoristas/:id', C.deleteDriver);

portalGestorRoutes.get('/meu-acesso', C.myAccess);
portalGestorRoutes.post('/meu-acesso/senha', C.changePassword);

// Rotas inexistentes do portal respondem 404 em JSON (não caem na página do app)
portalGestorRoutes.use((_req, res) => res.status(404).json({ error: 'Recurso não encontrado no Portal do Gestor de Frota.' }));
