"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class OnboardingController {
    // 1. Busca Planos
    async getPlans(req, res) {
        try {
            const plans = await prisma.saaSPlan.findMany({
                where: { ativo: true },
                orderBy: { valorMensal: 'asc' }
            });
            res.json(plans);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao buscar planos.' });
        }
    }
    // 2. Valida CNPJ
    async validateCnpj(req, res) {
        const { cnpj } = req.body;
        if (!cnpj) {
            return res.status(400).json({ error: 'CNPJ obrigatório.' });
        }
        try {
            const cleanCnpj = cnpj.replace(/\D/g, '');
            if (cleanCnpj.length !== 14) {
                return res.status(400).json({ error: 'CNPJ inválido. Deve conter 14 dígitos.' });
            }
            // 1. Verifica se o CNPJ já é de um Tenant existente (Company)
            const existingCompany = await prisma.company.findUnique({
                where: { cnpjSemMascara: cleanCnpj }
            });
            if (existingCompany) {
                return res.status(400).json({ error: 'Este CNPJ já possui uma conta ativa no sistema.' });
            }
            // 2. Verifica se já existe um PreTenant ativado (PROVISIONED)
            const existingPreTenant = await prisma.preTenant.findUnique({
                where: { cnpj: cleanCnpj }
            });
            if (existingPreTenant && existingPreTenant.status === 'PROVISIONED') {
                return res.status(400).json({ error: 'Este CNPJ já possui uma conta ativada no sistema.' });
            }
            // 3. Consulta CNPJ automática na BrasilAPI
            let companyData = {
                razaoSocial: '',
                nomeFantasia: '',
                telefone: '',
                email: ''
            };
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout
                const apiRes = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                if (apiRes.ok) {
                    const apiData = await apiRes.json();
                    companyData.razaoSocial = apiData.razao_social || '';
                    companyData.nomeFantasia = apiData.nome_fantasia || apiData.razao_social || '';
                    companyData.telefone = apiData.ddd_telefone_1 ? `(${apiData.ddd_telefone_1.substring(0, 2)}) ${apiData.ddd_telefone_1.substring(2)}` : '';
                    companyData.email = apiData.email || '';
                }
            }
            catch (apiErr) {
                console.warn('Erro ao consultar BrasilAPI (usando fallback):', apiErr);
            }
            // Se falhar ou vier em branco, usamos mocks realistas
            if (!companyData.razaoSocial) {
                companyData.razaoSocial = 'Oficina Exemplo LTDA';
                companyData.nomeFantasia = 'Oficina Exemplo';
            }
            res.json({
                message: 'CNPJ válido e disponível.',
                company: companyData
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao validar CNPJ.' });
        }
    }
    // 3. Checkout e Criação de PreTenant
    async checkout(req, res) {
        const { cnpj, razaoSocial, nomeFantasia, email, telefone, planId } = req.body;
        if (!cnpj || !email || !planId) {
            return res.status(400).json({ error: 'Dados obrigatórios faltando.' });
        }
        try {
            // Evita duplicação se o usuário tentar checkout várias vezes
            let preTenant = await prisma.preTenant.findUnique({
                where: { cnpj: cnpj.replace(/\D/g, '') }
            });
            if (preTenant) {
                if (preTenant.status === 'PROVISIONED') {
                    return res.status(400).json({ error: 'Esta conta já foi ativada.' });
                }
                // Atualiza os dados
                preTenant = await prisma.preTenant.update({
                    where: { id: preTenant.id },
                    data: { razaoSocial, nomeFantasia, email, telefone, planId, status: 'PENDING_PAYMENT' }
                });
            }
            else {
                // Cria novo
                preTenant = await prisma.preTenant.create({
                    data: {
                        cnpj: cnpj.replace(/\D/g, ''),
                        razaoSocial,
                        nomeFantasia,
                        email,
                        telefone,
                        planId,
                        status: 'PENDING_PAYMENT'
                    }
                });
            }
            // Como o pagamento é "Mockado", vamos gerar um intent fake
            const fakeClientSecret = `pi_mock_${preTenant.id}`;
            await prisma.preTenant.update({
                where: { id: preTenant.id },
                data: { paymentIntentId: fakeClientSecret }
            });
            res.json({ clientSecret: fakeClientSecret, preTenantId: preTenant.id });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao gerar checkout.' });
        }
    }
}
exports.OnboardingController = OnboardingController;
