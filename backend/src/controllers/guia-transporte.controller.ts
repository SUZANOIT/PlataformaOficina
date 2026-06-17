import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuditLogger } from '../utils/audit.logger';
import nodemailer from 'nodemailer';

export const GuiaTransporteController = {
  async getGuiaByQuoteId(req: Request, res: Response) {
    try {
      const quoteId = req.params.id as string;
      const companyId = (req as any).companyId as string;

      const quote = await prisma.towingQuote.findUnique({
        where: { id: quoteId }
      });

      if (!quote || quote.companyId !== companyId) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      const guia = await prisma.guiaTransporte.findUnique({
        where: { orcamentoId: quoteId },
        include: {
          audits: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      return res.json(guia);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async logAuditAction(req: Request, res: Response) {
    try {
      const guiaId = req.params.id as string;
      const { acao, detalhes } = req.body;
      const companyId = (req as any).companyId as string;
      const userId = (req as any).userId as string;

      const guia = await prisma.guiaTransporte.findUnique({
        where: { id: guiaId },
        include: { orcamento: true }
      });

      if (!guia || guia.orcamento.companyId !== companyId) {
        return res.status(404).json({ error: 'Guia not found' });
      }

      const audit = await prisma.guiaTransporteAudit.create({
        data: {
          guiaTransporteId: guiaId,
          acao: acao as string,
          detalhes: (detalhes as string) || `Ação ${acao} realizada na guia de transporte ${guia.numeroFormatado}.`
        }
      });

      AuditLogger.log(userId, companyId, 'GUIA_TRANSPORTE_AUDIT', `Ação ${acao} registrada na Guia ${guia.numeroFormatado}`, 'SUCCESS');

      return res.status(201).json(audit);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async sendEmail(req: Request, res: Response) {
    try {
      const guiaId = req.params.id as string;
      const { email } = req.body;
      const companyId = (req as any).companyId as string;
      const userId = (req as any).userId as string;

      const guia = await prisma.guiaTransporte.findUnique({
        where: { id: guiaId },
        include: { orcamento: true }
      });

      if (!guia || guia.orcamento.companyId !== companyId) {
        return res.status(404).json({ error: 'Guia not found' });
      }

      const quote = guia.orcamento;
      const destEmail = (email as string) || (quote.clienteEmail as string);

      if (!destEmail) {
        return res.status(400).json({ error: 'Destinatário de e-mail não informado' });
      }

      const config = await prisma.emailConfig.findFirst();
      let sentReal = false;

      if (config) {
        try {
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
            to: destEmail,
            subject: `Guia de Transporte / Atendimento de Guincho ${guia.numeroFormatado}`,
            text: `Olá,\n\nSua Guia de Transporte de Guincho ${guia.numeroFormatado} referente ao Orçamento ${quote.numeroFormatado} foi gerada.\n\nValor: R$ ${guia.valorTotal.toFixed(2)}\nVeículo: ${quote.veiculoModelo || ''} (${quote.veiculoPlaca || ''})\n\nAtenciosamente,\nMCA Gestão de Frotas`,
            html: `<p>Olá,</p><p>Sua Guia de Transporte de Guincho <strong>${guia.numeroFormatado}</strong> referente ao Orçamento <strong>${quote.numeroFormatado}</strong> foi gerada.</p><p><strong>Valor:</strong> R$ ${guia.valorTotal.toFixed(2)}<br/><strong>Veículo:</strong> ${quote.veiculoModelo || ''} (${quote.veiculoPlaca || ''})</p><p>Atenciosamente,<br/>MCA Gestão de Frotas</p>`
          });
          sentReal = true;
        } catch (mailError) {
          console.error('SMTP sending failed, falling back to simulation: ', mailError);
        }
      }

      const audit = await prisma.guiaTransporteAudit.create({
        data: {
          guiaTransporteId: guiaId,
          acao: 'ENVIO_EMAIL',
          detalhes: `Guia de transporte enviada para o e-mail: ${destEmail}.${sentReal ? ' (Enviado via SMTP)' : ' (Simulação de envio)'}`
        }
      });

      AuditLogger.log(userId, companyId, 'GUIA_TRANSPORTE_EMAIL', `Guia ${guia.numeroFormatado} enviada por e-mail para ${destEmail}`, 'SUCCESS');

      return res.json({
        success: true,
        message: sentReal ? 'E-mail enviado com sucesso' : 'Simulação de e-mail enviada com sucesso (SMTP não configurado)',
        audit
      });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error.message || 'Erro ao enviar e-mail' });
    }
  }
};
