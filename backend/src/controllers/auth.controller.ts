import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuditLogger } from '../utils/audit.logger';

const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const createUserSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  roleAdmin: z.boolean().optional().default(false),
  roleOrcamentista: z.boolean().optional().default(false),
  roleContasPagar: z.boolean().optional().default(false),
  roleContasReceber: z.boolean().optional().default(false),
  roleContabilidade: z.boolean().optional().default(false),
});

const updateUserSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6).optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  roleAdmin: z.boolean().optional(),
  roleOrcamentista: z.boolean().optional(),
  roleContasPagar: z.boolean().optional(),
  roleContasReceber: z.boolean().optional(),
  roleContabilidade: z.boolean().optional(),
});

export const AuthController = {
  async register(req: Request, res: Response) {
    try {
      const { name, email, password } = registerSchema.parse(req.body);

      const userExists = await prisma.user.findUnique({ where: { email } });
      if (userExists) {
        AuditLogger.log(null, null, 'REGISTER_USER', `Attempted duplicate user email: ${email}`, 'DUPLICATE_ATTEMPT');
        return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          roleAdmin: true, // Registrations from public register are admins
          status: 'ATIVO',
        },
      });

      AuditLogger.log(user.id, null, 'REGISTER_USER', `Registered user: ${user.email} (${user.id})`, 'SUCCESS');
      return res.status(201).json({ id: user.id, name: user.name, email: user.email });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
        }
        console.error('Prisma error in register:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in register:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
      });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '1d',
      });

      console.log(`User logged in: ${user.email} (id=${user.id})`);
      return res.json({
        user: {
          id: user.id,
          nome: user.name,
          name: user.name,
          email: user.email,
          status: user.status === 'ATIVO' ? 'ACTIVE' : 'INACTIVE',
          roleAdmin: user.roleAdmin,
          roleOrcamentista: user.roleOrcamentista,
          roleContasPagar: user.roleContasPagar,
          roleContasReceber: user.roleContasReceber,
          roleContabilidade: user.roleContabilidade,
        },
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma error in login:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in login:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
      });
    }
  },

  async listUsers(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || null;
      const whereClause = companyId ? { companyId } : {};

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          roleAdmin: true,
          roleOrcamentista: true,
          roleContasPagar: true,
          roleContasReceber: true,
          roleContabilidade: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const mappedUsers = users.map(user => ({
        id: user.id,
        nome: user.name,
        name: user.name,
        email: user.email,
        status: user.status === 'ATIVO' ? 'ACTIVE' : 'INACTIVE',
        roleAdmin: user.roleAdmin,
        roleOrcamentista: user.roleOrcamentista,
        roleContasPagar: user.roleContasPagar,
        roleContasReceber: user.roleContasReceber,
        roleContabilidade: user.roleContabilidade,
        createdAt: user.createdAt,
      }));

      return res.json(mappedUsers);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma error in listUsers:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in listUsers:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
      });
    }
  },

  async createUser(req: Request, res: Response) {
    try {
      const currentUserId = (req as any).userId || null;
      const currentCompanyId = (req as any).companyId || null;

      const body = { ...req.body };
      if (body.nome) body.name = body.nome;
      if (body.senha) body.password = body.senha;

      const parsedData = createUserSchema.parse(body);

      const userExists = await prisma.user.findUnique({ where: { email: parsedData.email } });
      if (userExists) {
        AuditLogger.log(currentUserId, currentCompanyId, 'CREATE_USER', `Attempted duplicate user email: ${parsedData.email}`, 'DUPLICATE_ATTEMPT');
        return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
      }

      const hashedPassword = await bcrypt.hash(parsedData.password, 10);

      const user = await prisma.user.create({
        data: {
          name: parsedData.name,
          email: parsedData.email,
          password: hashedPassword,
          status: parsedData.status === 'ACTIVE' ? 'ATIVO' : 'INATIVO',
          roleAdmin: parsedData.roleAdmin,
          roleOrcamentista: parsedData.roleOrcamentista,
          roleContasPagar: parsedData.roleContasPagar,
          roleContasReceber: parsedData.roleContasReceber,
          roleContabilidade: parsedData.roleContabilidade,
          companyId: currentCompanyId
        },
      });

      AuditLogger.log(currentUserId, currentCompanyId, 'CREATE_USER', `Created user: ${user.email} (${user.id})`, 'SUCCESS');
      
      return res.status(201).json({
        id: user.id,
        nome: user.name,
        name: user.name,
        email: user.email,
        status: user.status === 'ATIVO' ? 'ACTIVE' : 'INACTIVE',
        roleAdmin: user.roleAdmin,
        roleOrcamentista: user.roleOrcamentista,
        roleContasPagar: user.roleContasPagar,
        roleContasReceber: user.roleContasReceber,
        roleContabilidade: user.roleContabilidade,
        createdAt: user.createdAt
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
        }
        console.error('Prisma error in createUser:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in createUser:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async updateUser(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const currentUserId = (req as any).userId || null;
      const currentCompanyId = (req as any).companyId || null;

      const body = { ...req.body };
      if (body.nome) body.name = body.nome;
      if (body.senha) body.password = body.senha;

      const parsedData = updateUserSchema.parse(body);

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (parsedData.email !== user.email) {
        const emailCollision = await prisma.user.findUnique({ where: { email: parsedData.email } });
        if (emailCollision) {
          AuditLogger.log(currentUserId, currentCompanyId, 'UPDATE_USER', `Attempted duplicate user email update: ${parsedData.email}`, 'DUPLICATE_ATTEMPT');
          return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
        }
      }

      const updateData: any = {
        name: parsedData.name,
        email: parsedData.email,
      };

      if (parsedData.status) {
        updateData.status = parsedData.status === 'ACTIVE' ? 'ATIVO' : 'INATIVO';
      }
      if (parsedData.roleAdmin !== undefined) updateData.roleAdmin = parsedData.roleAdmin;
      if (parsedData.roleOrcamentista !== undefined) updateData.roleOrcamentista = parsedData.roleOrcamentista;
      if (parsedData.roleContasPagar !== undefined) updateData.roleContasPagar = parsedData.roleContasPagar;
      if (parsedData.roleContasReceber !== undefined) updateData.roleContasReceber = parsedData.roleContasReceber;
      if (parsedData.roleContabilidade !== undefined) updateData.roleContabilidade = parsedData.roleContabilidade;

      if (parsedData.password && parsedData.password.length >= 6) {
        updateData.password = await bcrypt.hash(parsedData.password, 10);
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
      });

      AuditLogger.log(currentUserId, currentCompanyId, 'UPDATE_USER', `Updated user: ${updatedUser.email} (${updatedUser.id})`, 'SUCCESS');
      
      return res.json({
        id: updatedUser.id,
        nome: updatedUser.name,
        name: updatedUser.name,
        email: updatedUser.email,
        status: updatedUser.status === 'ATIVO' ? 'ACTIVE' : 'INACTIVE',
        roleAdmin: updatedUser.roleAdmin,
        roleOrcamentista: updatedUser.roleOrcamentista,
        roleContasPagar: updatedUser.roleContasPagar,
        roleContasReceber: updatedUser.roleContasReceber,
        roleContabilidade: updatedUser.roleContabilidade,
        createdAt: updatedUser.createdAt
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
        }
        if (error.code === 'P2025') {
          return res.status(404).json({ error: 'User not found' });
        }
        console.error('Prisma error in updateUser:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in updateUser:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
      });
    }
  },

  async deleteUser(req: Request, res: Response) {
    try {
      const id = req.params.id as string;

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await prisma.user.delete({ where: { id } });

      console.log(`User deleted: ${user.email} (id=${user.id})`);
      return res.status(204).send();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return res.status(404).json({ error: 'User not found' });
        }
        console.error('Prisma error in deleteUser:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in deleteUser:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
      });
    }
  },

  async me(req: Request, res: Response) {
    try {
      const id = (req as any).userId;
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          roleAdmin: true,
          roleOrcamentista: true,
          roleContasPagar: true,
          roleContasReceber: true,
          roleContabilidade: true,
          createdAt: true
        }
      });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      return res.json({
        id: user.id,
        nome: user.name,
        name: user.name,
        email: user.email,
        status: user.status === 'ATIVO' ? 'ACTIVE' : 'INACTIVE',
        roleAdmin: user.roleAdmin,
        roleOrcamentista: user.roleOrcamentista,
        roleContasPagar: user.roleContasPagar,
        roleContasReceber: user.roleContasReceber,
        roleContabilidade: user.roleContabilidade,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error('Error in auth.me:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};
