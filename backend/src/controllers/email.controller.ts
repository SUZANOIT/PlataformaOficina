import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import nodemailer from 'nodemailer';
import { z } from 'zod';

const emailConfigSchema = z.object({
  host: z.string(),
  port: z.number(),
  user: z.string(),
  password: z.string(),
  fromName: z.string().optional(),
  fromEmail: z.string().optional(),
});

export const EmailController = {
  async getConfig(req: Request, res: Response) {
    try {
      const config = await prisma.emailConfig.findFirst();
      return res.json(config || {});
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma error in email.getConfig:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in email.getConfig:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
      });
    }
  },

  async saveConfig(req: Request, res: Response) {
    try {
      const data = emailConfigSchema.parse(req.body);
      const config = await prisma.emailConfig.findFirst();

      if (config) {
        const updated = await prisma.emailConfig.update({
          where: { id: config.id },
          data,
        });
        console.log(`Email config updated (id=${updated.id})`);
        return res.json(updated);
      } else {
        const created = await prisma.emailConfig.create({ data });
        console.log(`Email config created (id=${created.id})`);
        return res.status(201).json(created);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma error in email.saveConfig:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in email.saveConfig:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
      });
    }
  },

  async sendQuote(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const config = await prisma.emailConfig.findFirst();
      if (!config) {
        return res.status(400).json({ error: 'Configuração de e-mail não encontrada. Configure o SMTP primeiro.' });
      }

      const quote = await prisma.quote.findUnique({
        where: { id },
        include: {
          client: true,
          company: true,
        }
      });

      if (!quote) {
        return res.status(404).json({ error: 'Orçamento não encontrado' });
      }

      if (!quote.client.email) {
        return res.status(400).json({ error: 'Cliente não possui e-mail cadastrado.' });
      }

      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: {
          user: config.user,
          pass: config.password,
        },
      });

      const fromField = config.fromName && config.fromEmail 
        ? `"${config.fromName}" <${config.fromEmail}>`
        : config.user;

      await transporter.sendMail({
        from: fromField,
        to: quote.client.email,
        subject: `Novo Orçamento #${quote.numeroOrcamento} - ${quote.company.razaoSocial}`,
        text: `Olá ${quote.client.nome},\n\nO seu orçamento #${quote.numeroOrcamento} no valor de R$ ${quote.total.toFixed(2)} foi gerado.\n\nAtenciosamente,\n${quote.company.razaoSocial}`,
        html: `<p>Olá <strong>${quote.client.nome}</strong>,</p><p>O seu orçamento <strong>#${quote.numeroOrcamento}</strong> no valor de R$ ${quote.total.toFixed(2)} foi gerado.</p><p>Atenciosamente,<br/>${quote.company.razaoSocial}</p>`
      });

      console.log(`Quote email sent: quote #${quote.numeroOrcamento} to ${quote.client.email}`);
      return res.json({ success: true, message: 'E-mail enviado com sucesso' });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma error in email.sendQuote:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in email.sendQuote:', error);
      return res.status(500).json({
        error: 'Erro ao enviar e-mail',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
};
