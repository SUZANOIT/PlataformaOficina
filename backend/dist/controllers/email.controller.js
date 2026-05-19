"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailController = void 0;
const prisma_1 = require("../lib/prisma");
const nodemailer_1 = __importDefault(require("nodemailer"));
const zod_1 = require("zod");
const emailConfigSchema = zod_1.z.object({
    host: zod_1.z.string(),
    port: zod_1.z.number(),
    user: zod_1.z.string(),
    password: zod_1.z.string(),
    fromName: zod_1.z.string().optional(),
    fromEmail: zod_1.z.string().optional(),
});
exports.EmailController = {
    async getConfig(req, res) {
        try {
            const config = await prisma_1.prisma.emailConfig.findFirst();
            return res.json(config || {});
        }
        catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async saveConfig(req, res) {
        try {
            const data = emailConfigSchema.parse(req.body);
            const config = await prisma_1.prisma.emailConfig.findFirst();
            if (config) {
                const updated = await prisma_1.prisma.emailConfig.update({
                    where: { id: config.id },
                    data,
                });
                return res.json(updated);
            }
            else {
                const created = await prisma_1.prisma.emailConfig.create({ data });
                return res.status(201).json(created);
            }
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async sendQuote(req, res) {
        try {
            const { id } = req.params;
            const config = await prisma_1.prisma.emailConfig.findFirst();
            if (!config) {
                return res.status(400).json({ error: 'Configuração de e-mail não encontrada. Configure o SMTP primeiro.' });
            }
            const quote = await prisma_1.prisma.quote.findUnique({
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
            const transporter = nodemailer_1.default.createTransport({
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
            return res.json({ success: true, message: 'E-mail enviado com sucesso' });
        }
        catch (error) {
            return res.status(500).json({ error: 'Erro ao enviar e-mail: ' + error.message });
        }
    }
};
