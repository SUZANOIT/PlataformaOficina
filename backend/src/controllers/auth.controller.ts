import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const updateUserSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6).optional().or(z.literal('')),
});

export const AuthController = {
  async register(req: Request, res: Response) {
    try {
      const { name, email, password } = registerSchema.parse(req.body);

      const userExists = await prisma.user.findUnique({ where: { email } });
      if (userExists) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      });

      console.log(`User registered: ${user.email} (id=${user.id})`);
      return res.status(201).json({ id: user.id, name: user.name, email: user.email });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return res.status(400).json({ error: 'User already exists' });
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
        user: { id: user.id, name: user.name, email: user.email },
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
      const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(users);
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

  async updateUser(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { name, email, password } = updateUserSchema.parse(req.body);

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (email !== user.email) {
        const emailCollision = await prisma.user.findUnique({ where: { email } });
        if (emailCollision) {
          return res.status(400).json({ error: 'E-mail already in use' });
        }
      }

      const updateData: any = { name, email };
      if (password && password.length >= 6) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: { id: true, name: true, email: true, createdAt: true }
      });

      console.log(`User updated: ${updatedUser.email} (id=${updatedUser.id})`);
      return res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return res.status(400).json({ error: 'E-mail already in use' });
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
  }
};
