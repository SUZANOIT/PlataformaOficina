import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const SaaSAuthController = {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Encontrar o usuário administrativo no SaaS
      const saasUser = await prisma.saaSUser.findUnique({
        where: { email },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      });

      if (!saasUser) {
        return res.status(400).json({ error: 'Credenciais inválidas' });
      }

      if (saasUser.status !== 'ATIVO') {
        return res.status(403).json({ error: 'Sua conta administrativa está inativa.' });
      }

      const validPassword = await bcrypt.compare(password, saasUser.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'Credenciais inválidas' });
      }

      // Atualizar data de último login
      await prisma.saaSUser.update({
        where: { id: saasUser.id },
        data: { ultimoLogin: new Date() }
      });

      const permissions = saasUser.role?.permissions.map(rp => rp.permission.nome) || [];
      const roleName = saasUser.role?.nome || 'NENHUM';

      // Gerar token assinado contendo as informações administrativas e RBAC
      const token = jwt.sign(
        { 
          id: saasUser.id,
          email: saasUser.email,
          isSaaSUser: true,
          role: roleName,
          permissions
        },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1d' }
      );

      console.log(`Global SaaS Admin logged in: ${saasUser.email} (role=${roleName})`);

      return res.json({
        user: {
          id: saasUser.id,
          nome: saasUser.nome,
          email: saasUser.email,
          status: saasUser.status,
          role: roleName,
          permissions
        },
        token
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors });
      }
      console.error('Error in SaaS login:', error);
      return res.status(500).json({ error: 'Erro interno no servidor administrativo.' });
    }
  },

  async me(req: Request, res: Response) {
    try {
      const saasUserId = (req as any).saasUserId;

      if (!saasUserId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const saasUser = await prisma.saaSUser.findUnique({
        where: { id: saasUserId },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      });

      if (!saasUser) {
        return res.status(404).json({ error: 'Administrador não encontrado.' });
      }

      const permissions = saasUser.role?.permissions.map(rp => rp.permission.nome) || [];
      const roleName = saasUser.role?.nome || 'NENHUM';

      return res.json({
        id: saasUser.id,
        nome: saasUser.nome,
        email: saasUser.email,
        status: saasUser.status,
        role: roleName,
        permissions
      });
    } catch (error) {
      console.error('Error in SaaS me:', error);
      return res.status(500).json({ error: 'Erro ao verificar sessão administrativa.' });
    }
  }
};
