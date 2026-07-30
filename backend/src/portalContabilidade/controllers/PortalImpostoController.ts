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
      const companyId = ((req as any).companyId || req.query.companyId) as string;
      const id = req.params.id as string;

      if (!companyId) return res.status(400).json({ error: 'Company ID é obrigatório' });

      const imposto = await impostoService.findById(id, companyId);
      return res.json(imposto);
    } catch (error: any) {
      return res.status(404).json({ error: error.message });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const companyId = ((req as any).companyId || req.body.companyId) as string;
      const userId = (req as any).user?.id as string;
      const id = req.params.id as string;

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
      const companyId = ((req as any).companyId || req.body.companyId) as string;
      const userId = (req as any).user?.id as string;
      const id = req.params.id as string;

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

  async bulkUpload(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id as string;
      const files = req.files as Express.Multer.File[];
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

      const resultados = await impostoService.bulkUpload(
        userId,
        competencia,
        tipoImposto,
        vencimento,
        files
      );

      return res.status(200).json(resultados);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
