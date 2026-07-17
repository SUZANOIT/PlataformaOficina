"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientDashboardService = void 0;
const prisma_1 = require("../lib/prisma");
class ClientDashboardService {
    companyId;
    clientId;
    constructor(companyId, clientId) {
        this.companyId = companyId;
        this.clientId = clientId;
    }
    async getDashboardData(filters) {
        const { startDate, endDate, prevStartDate, prevEndDate } = filters;
        // 1. Fetch Paid Quotes (Workshop) in current period
        const quotes = await prisma_1.prisma.quote.findMany({
            where: {
                clientId: this.clientId,
                companyId: this.companyId,
                status: 'Pago',
                history: {
                    some: {
                        action: 'STATUS_ALTERADO',
                        details: { contains: '"para":"Pago"' },
                        createdAt: { gte: startDate, lte: endDate }
                    }
                }
            },
            include: {
                history: {
                    where: { action: 'STATUS_ALTERADO', details: { contains: '"para":"Pago"' } },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                items: true,
                oficina: true
            }
        });
        const quotesFallback = await prisma_1.prisma.quote.findMany({
            where: {
                clientId: this.clientId,
                companyId: this.companyId,
                status: 'Pago',
                updatedAt: { gte: startDate, lte: endDate },
                history: { none: { action: 'STATUS_ALTERADO', details: { contains: '"para":"Pago"' } } }
            },
            include: { items: true, oficina: true }
        });
        const allQuotes = [...quotes, ...quotesFallback];
        // 2. Fetch Towing Quotes in current period
        const towingQuotes = await prisma_1.prisma.towingQuote.findMany({
            where: {
                clientId: this.clientId,
                companyId: this.companyId,
                status: 'Pago',
                updatedAt: { gte: startDate, lte: endDate }
            }
        });
        // 3. Fetch Prev Period Quotes (Workshop)
        const prevQuotes = await prisma_1.prisma.quote.findMany({
            where: {
                clientId: this.clientId,
                companyId: this.companyId,
                status: 'Pago',
                history: {
                    some: {
                        action: 'STATUS_ALTERADO',
                        details: { contains: '"para":"Pago"' },
                        createdAt: { gte: prevStartDate, lte: prevEndDate }
                    }
                }
            }
        });
        const prevQuotesFallback = await prisma_1.prisma.quote.findMany({
            where: {
                clientId: this.clientId,
                companyId: this.companyId,
                status: 'Pago',
                updatedAt: { gte: prevStartDate, lte: prevEndDate },
                history: { none: { action: 'STATUS_ALTERADO', details: { contains: '"para":"Pago"' } } }
            }
        });
        const allPrevQuotes = [...prevQuotes, ...prevQuotesFallback];
        const prevTowingQuotes = await prisma_1.prisma.towingQuote.findMany({
            where: {
                clientId: this.clientId,
                companyId: this.companyId,
                status: 'Pago',
                updatedAt: { gte: prevStartDate, lte: prevEndDate }
            }
        });
        // Basic KPIs calculation
        const totalRevenue = allQuotes.reduce((sum, q) => sum + (q.total || 0), 0) + towingQuotes.reduce((sum, t) => sum + (t.valorTotal || 0), 0);
        const prevRevenue = allPrevQuotes.reduce((sum, q) => sum + (q.total || 0), 0) + prevTowingQuotes.reduce((sum, t) => sum + (t.valorTotal || 0), 0);
        const approvedCount = allQuotes.length + towingQuotes.length;
        const prevApprovedCount = allPrevQuotes.length + prevTowingQuotes.length;
        const averageTicket = approvedCount > 0 ? totalRevenue / approvedCount : 0;
        const prevAverageTicket = prevApprovedCount > 0 ? prevRevenue / prevApprovedCount : 0;
        // Highest Revenue OS
        let maxRevenueQuote = null;
        let maxRevenue = 0;
        allQuotes.forEach((q) => {
            if ((q.total || 0) > maxRevenue) {
                maxRevenue = q.total;
                maxRevenueQuote = { ...q, type: 'quote' };
            }
        });
        towingQuotes.forEach((t) => {
            if ((t.valorTotal || 0) > maxRevenue) {
                maxRevenue = t.valorTotal;
                maxRevenueQuote = { ...t, type: 'towing' };
            }
        });
        // Monthly Data Aggregation
        const monthlyDataMap = {};
        const processQuoteForMonthly = (q, type) => {
            let date = q.updatedAt;
            if (type === 'quote' && q.history && q.history.length > 0) {
                date = q.history[0].createdAt;
            }
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            if (!monthlyDataMap[key]) {
                monthlyDataMap[key] = {
                    mes: date.toLocaleString('pt-BR', { month: 'long' }),
                    ano: date.getFullYear(),
                    mesIndex: date.getMonth(),
                    receita: 0,
                    quantidade: 0
                };
            }
            monthlyDataMap[key].receita += (type === 'quote' ? q.total : q.valorTotal) || 0;
            monthlyDataMap[key].quantidade += 1;
        };
        allQuotes.forEach((q) => processQuoteForMonthly(q, 'quote'));
        towingQuotes.forEach((t) => processQuoteForMonthly(t, 'towing'));
        const monthlyData = Object.values(monthlyDataMap).sort((a, b) => {
            if (a.ano !== b.ano)
                return a.ano - b.ano;
            return a.mesIndex - b.mesIndex;
        });
        monthlyData.forEach(m => m.mes = m.mes.charAt(0).toUpperCase() + m.mes.slice(1));
        // Services (Doughnut) and Units (Bar)
        const servicesMap = {};
        const unitsMap = {};
        allQuotes.forEach((q) => {
            // Units
            const unitName = q.oficina?.nome || 'Principal';
            unitsMap[unitName] = (unitsMap[unitName] || 0) + (q.total || 0);
            // Services (Iterate items)
            if (q.items && q.items.length > 0) {
                q.items.forEach((item) => {
                    const type = item.tipo || 'Peça';
                    servicesMap[type] = (servicesMap[type] || 0) + (item.valorTotal || 0);
                });
            }
            else {
                servicesMap['Mão de Obra'] = (servicesMap['Mão de Obra'] || 0) + (q.total || 0);
            }
        });
        towingQuotes.forEach((t) => {
            unitsMap['Principal'] = (unitsMap['Principal'] || 0) + (t.valorTotal || 0);
            servicesMap['Guincho'] = (servicesMap['Guincho'] || 0) + (t.valorTotal || 0);
        });
        const revenueByService = Object.entries(servicesMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        const revenueByUnit = Object.entries(unitsMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        // Ranking
        const allClientsRevenue = await prisma_1.prisma.quote.groupBy({
            by: ['clientId'],
            where: { companyId: this.companyId, status: 'Pago', updatedAt: { gte: startDate, lte: endDate } },
            _sum: { total: true }
        });
        const allClientsTowing = await prisma_1.prisma.towingQuote.groupBy({
            by: ['clientId'],
            where: { companyId: this.companyId, status: 'Pago', updatedAt: { gte: startDate, lte: endDate } },
            _sum: { valorTotal: true }
        });
        const clientTotals = {};
        let totalCompanyRevenue = 0;
        allClientsRevenue.forEach((c) => {
            if (c.clientId) {
                const val = c._sum.total || 0;
                clientTotals[c.clientId] = (clientTotals[c.clientId] || 0) + val;
                totalCompanyRevenue += val;
            }
        });
        allClientsTowing.forEach((c) => {
            if (c.clientId) {
                const val = c._sum.valorTotal || 0;
                clientTotals[c.clientId] = (clientTotals[c.clientId] || 0) + val;
                totalCompanyRevenue += val;
            }
        });
        const rankingSorted = Object.entries(clientTotals).sort((a, b) => b[1] - a[1]);
        const clientRankIndex = rankingSorted.findIndex(r => r[0] === this.clientId);
        const rankingPosition = clientRankIndex >= 0 ? clientRankIndex + 1 : 0;
        const clientRevenuePercentage = totalCompanyRevenue > 0 ? (totalRevenue / totalCompanyRevenue) * 100 : 0;
        // Timeline and Table formatting
        const combinedQuotes = [
            ...allQuotes.map((q) => ({
                id: q.id,
                numero: `OS-${q.numeroOrcamento}`,
                tipo: 'Oficina',
                data: q.history && q.history.length > 0 ? q.history[0].createdAt : q.updatedAt,
                valor: q.total,
                status: 'Pago'
            })),
            ...towingQuotes.map((t) => ({
                id: t.id,
                numero: t.numeroFormatado || `GUI-${t.numeroOrcamento}`,
                tipo: 'Guincho',
                data: t.updatedAt,
                valor: t.valorTotal,
                status: 'Pago'
            }))
        ].sort((a, b) => b.data.getTime() - a.data.getTime()); // desc
        return {
            kpis: {
                totalRevenue,
                prevRevenue,
                revenueGrowth: prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : (totalRevenue > 0 ? 100 : 0),
                approvedCount,
                prevApprovedCount,
                countGrowth: prevApprovedCount > 0 ? ((approvedCount - prevApprovedCount) / prevApprovedCount) * 100 : (approvedCount > 0 ? 100 : 0),
                averageTicket,
                prevAverageTicket,
                ticketGrowth: prevAverageTicket > 0 ? ((averageTicket - prevAverageTicket) / prevAverageTicket) * 100 : (averageTicket > 0 ? 100 : 0),
                maxRevenueOS: maxRevenueQuote ? {
                    valor: maxRevenue,
                    numero: maxRevenueQuote.type === 'quote' ? `OS-${maxRevenueQuote.numeroOrcamento}` : (maxRevenueQuote.numeroFormatado || `GUI-${maxRevenueQuote.numeroOrcamento}`),
                    data: maxRevenueQuote.type === 'quote' ? (maxRevenueQuote.history?.length ? maxRevenueQuote.history[0].createdAt : maxRevenueQuote.updatedAt) : maxRevenueQuote.updatedAt
                } : null
            },
            monthlyData,
            revenueByService,
            revenueByUnit,
            ranking: {
                position: rankingPosition,
                percentageOfCompany: clientRevenuePercentage,
                totalClients: rankingSorted.length
            },
            tableData: combinedQuotes
        };
    }
}
exports.ClientDashboardService = ClientDashboardService;
