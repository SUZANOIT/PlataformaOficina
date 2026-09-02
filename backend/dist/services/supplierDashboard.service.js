"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierDashboardService = void 0;
const prisma_1 = require("../lib/prisma");
class SupplierDashboardService {
    companyId;
    supplierId;
    constructor(companyId, supplierId) {
        this.companyId = companyId;
        this.supplierId = supplierId;
    }
    async getDashboardData(filters) {
        const { startDate, endDate, prevStartDate, prevEndDate } = filters;
        // First, find the supplier to get its names (Razão Social, Nome Fantasia)
        const supplier = await prisma_1.prisma.supplier.findFirst({
            where: { id: this.supplierId, companyId: this.companyId }
        });
        if (!supplier) {
            throw new Error("Fornecedor não encontrado");
        }
        const searchNames = [];
        if (supplier.razaoSocial)
            searchNames.push(supplier.razaoSocial);
        if (supplier.nomeFantasia)
            searchNames.push(supplier.nomeFantasia);
        // Fetch ALL FinancialPayables matching this supplier
        const allPayables = await prisma_1.prisma.financialPayable.findMany({
            where: {
                companyId: this.companyId,
                status: { in: ['PAGA', 'APROVADA', 'PENDENTE', 'EM ANÁLISE'] },
                fornecedor: { in: searchNames }
            },
            orderBy: { dataEmissao: 'desc' }
        });
        // Filter in memory for Current Period
        const currentPayables = allPayables.filter(p => {
            const date = p.dataEmissao;
            return date >= startDate && date <= endDate;
        });
        // Filter in memory for Previous Period
        const prevPayables = allPayables.filter(p => {
            const date = p.dataEmissao;
            return date >= prevStartDate && date <= prevEndDate;
        });
        // Basic KPIs calculation
        const totalExpenses = currentPayables.reduce((sum, p) => sum + p.valor, 0);
        const prevExpenses = prevPayables.reduce((sum, p) => sum + p.valor, 0);
        const count = currentPayables.length;
        const prevCount = prevPayables.length;
        const averageTicket = count > 0 ? totalExpenses / count : 0;
        const prevAverageTicket = prevCount > 0 ? prevExpenses / prevCount : 0;
        // Highest Expense
        let maxExpensePayable = null;
        let maxExpense = 0;
        currentPayables.forEach(p => {
            if (p.valor > maxExpense) {
                maxExpense = p.valor;
                maxExpensePayable = { ...p, type: 'payable' };
            }
        });
        // Monthly Data Aggregation
        const monthlyDataMap = {};
        const processPayableForMonthly = (p) => {
            let date = p.dataEmissao;
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            if (!monthlyDataMap[key]) {
                monthlyDataMap[key] = {
                    mes: date.toLocaleString('pt-BR', { month: 'long' }),
                    ano: date.getFullYear(),
                    mesIndex: date.getMonth(),
                    receita: 0, // Using 'receita' as key for frontend reusability, but it represents expenses here
                    quantidade: 0
                };
            }
            monthlyDataMap[key].receita += p.valor;
            monthlyDataMap[key].quantidade += 1;
        };
        currentPayables.forEach(p => processPayableForMonthly(p));
        const monthlyData = Object.values(monthlyDataMap).sort((a, b) => {
            if (a.ano !== b.ano)
                return a.ano - b.ano;
            return a.mesIndex - b.mesIndex;
        });
        monthlyData.forEach(m => m.mes = m.mes.charAt(0).toUpperCase() + m.mes.slice(1));
        // Categories (Doughnut)
        const categoriesMap = {};
        currentPayables.forEach(p => {
            const cat = p.categoria || 'Outros';
            categoriesMap[cat] = (categoriesMap[cat] || 0) + p.valor;
        });
        const categoryData = Object.entries(categoriesMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
        // Units (Cost Center)
        const costCenterMap = {};
        currentPayables.forEach(p => {
            const cc = p.centroCusto || 'Geral';
            costCenterMap[cc] = (costCenterMap[cc] || 0) + p.valor;
        });
        const costCenterData = Object.entries(costCenterMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
        const calculateGrowth = (current, previous) => {
            if (previous === 0)
                return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };
        // Calculate Heatmap Data
        const heatMapData = this.calculateHeatMap(currentPayables);
        // Flatten for table display
        const tableData = currentPayables.map(p => ({
            id: p.id,
            numero: p.numeroLancamento.toString(),
            data: p.dataEmissao.toISOString(),
            placa: p.centroCusto,
            valor: p.valor,
            status: p.status,
            tipo: p.categoria
        }));
        return {
            kpis: {
                totalRevenue: totalExpenses,
                revenueGrowth: calculateGrowth(totalExpenses, prevExpenses),
                averageTicket,
                ticketGrowth: calculateGrowth(averageTicket, prevAverageTicket),
                approvedCount: count,
                countGrowth: calculateGrowth(count, prevCount),
                maxRevenueOS: maxExpensePayable ? {
                    valor: maxExpense,
                    numero: maxExpensePayable.numeroLancamento ? maxExpensePayable.numeroLancamento.toString() : '-',
                    data: maxExpensePayable.dataEmissao
                } : null
            },
            monthlyData,
            revenueByService: categoryData,
            revenueByUnit: costCenterData,
            tableData
        };
    }
    calculateHeatMap(payables) {
        // 0 = Sunday, 1 = Monday, etc.
        // HeatMap format: { day: string, hour: string, count: number, value: number }
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
        const matrix = {};
        days.forEach(d => {
            matrix[d] = {};
            hours.forEach(h => {
                matrix[d][h] = { count: 0, value: 0 };
            });
        });
        payables.forEach(p => {
            const d = p.dataEmissao;
            const dayName = days[d.getDay()];
            const hourName = `${String(d.getHours()).padStart(2, '0')}:00`;
            if (matrix[dayName] && matrix[dayName][hourName]) {
                matrix[dayName][hourName].count += 1;
                matrix[dayName][hourName].value += p.valor;
            }
        });
        const result = [];
        days.forEach(day => {
            hours.forEach(hour => {
                result.push({
                    day,
                    hour,
                    count: matrix[day][hour].count,
                    value: matrix[day][hour].value
                });
            });
        });
        return result;
    }
}
exports.SupplierDashboardService = SupplierDashboardService;
