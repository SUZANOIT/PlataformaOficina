import { Request, Response, NextFunction } from 'express';
import { tenantContext } from '../lib/tenant-context';

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const companyId = (req as any).companyId;
  const userId = (req as any).userId;

  if (companyId) {
    tenantContext.run({ companyId, userId }, () => {
      next();
    });
  } else {
    next();
  }
};
