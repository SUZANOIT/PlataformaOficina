import { Request, Response } from 'express';
import { PortalImpostoService } from '../services/PortalImpostoService';

const impostoService = new PortalImpostoService();

export class PortalImpostoController {
  async create(req: Request, res: Response) {
    try {
      // Considerando que o middleware de auth coloca o usuario no req.user e a empresa no req.companyId
      const companyId = req.body.companyId || (req as any).companyId;
      const createdBy = (req as any).user?.id;

      const data = { ...req.body, companyId, createdBy };
      
      const imposto = await impostoService.create(data);
      return res.status(201).json(imposto);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || req.query.companyId;
      if (!companyId) return res.status(400).json({ error: 'Company ID é obrigatório' });

      const filters = {
        competencia: req.query.competencia,
        tipoImposto: req.query.tipoImposto,
        status: req.query.status,
      };

      const impostos = await impostoService.findAll(companyId as string, filters);
      return res.json(impostos);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || req.query.companyId;
      const { id } = req.params;

      if (!companyId) return res.status(400).json({ error: 'Company ID é obrigatório' });

      const imposto = await impostoService.findById(id, companyId as string);
      return res.json(imposto);
    } catch (error: any) {
      return res.status(404).json({ error: error.message });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || req.body.companyId;
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!companyId || !userId) {
        return res.status(400).json({ error: 'Company ID e Usuário são obrigatórios' });
      }

      const imposto = await impostoService.updateStatus(id, companyId, userId, req.body);
      return res.json(imposto);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async uploadAnexo(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || req.body.companyId;
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!companyId || !userId) {
        return res.status(400).json({ error: 'Company ID e Usuário são obrigatórios' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const anexo = await impostoService.uploadAnexo(id, companyId, userId, req.file);
      return res.status(201).json(anexo);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
