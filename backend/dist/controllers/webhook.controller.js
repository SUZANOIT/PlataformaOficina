"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookController = void 0;
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
class WebhookController {
    async handleMockPaymentSuccess(req, res) {
        const { preTenantId } = req.body;
        if (!preTenantId) {
            return res.status(400).json({ error: 'preTenantId obrigatório.' });
        }
        try {
            const preTenant = await prisma.preTenant.findUnique({
                where: { id: preTenantId }
            });
            if (!preTenant) {
                return res.status(404).json({ error: 'PreTenant não encontrado.' });
            }
            if (preTenant.status === 'PROVISIONED') {
                return res.json({ message: 'Já provisionado', success: true }); // Idempotency
            }
            // Inicia a transação de criação
            await prisma.$transaction(async (tx) => {
                // 1. Criar a Company
                const company = await tx.company.create({
                    data: {
                        cnpj: preTenant.cnpj, // Precisa estar formatado corretamente se houver máscara, mas usamos sem máscara no preTenant
                        cnpjSemMascara: preTenant.cnpj,
                        razaoSocial: preTenant.razaoSocial,
                        nomeFantasia: preTenant.nomeFantasia,
                        email: preTenant.email,
                        telefone: preTenant.telefone,
                        type: 'OFICINA'
                    }
                });
                // 2. Gerar senha temporária e hash
                const tempPassword = `${preTenant.cnpj}@Suzano2026`;
                const hashedPassword = await bcrypt_1.default.hash(tempPassword, 10);
                // 3. Criar o Usuário Admin com mustChangePassword
                await tx.user.create({
                    data: {
                        name: 'Administrador Padrão',
                        email: preTenant.email, // Garantir que email seja único ou usar CNPJ
                        password: hashedPassword,
                        role: 'ADMIN',
                        companyId: company.id,
                        status: 'ATIVO',
                        mustChangePassword: true
                    }
                });
                // Criar o Collaborator vinculado
                await tx.collaborator.create({
                    data: {
                        nome: 'Administrador Padrão',
                        email: preTenant.email,
                        companyId: company.id,
                        status: 'ATIVO',
                        mustChangePassword: true
                    }
                });
                // 4. Atualizar o PreTenant
                await tx.preTenant.update({
                    where: { id: preTenant.id },
                    data: { status: 'PROVISIONED' }
                });
            });
            // Simulação do envio de e-mail aconteceria aqui
            console.log(`E-mail enviado para ${preTenant.email} com a senha: ${preTenant.cnpj}@Suzano2026`);
            res.json({ success: true, message: 'Oficina ativada com sucesso.' });
        }
        catch (error) {
            console.error('Erro no Webhook de Pagamento:', error);
            res.status(500).json({ error: 'Erro interno ao provisionar conta.' });
        }
    }
}
exports.WebhookController = WebhookController;
