"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const clientDashboard_service_1 = require("./services/clientDashboard.service");
async function main() {
    const service = new clientDashboard_service_1.ClientDashboardService('b96e6885-8af7-49fd-84df-e2c43ae6a808', 'e1845454-a6cb-4530-a5f4-e568ebaa30d1');
    try {
        const data = await service.getDashboardData({
            startDate: new Date('2026-01-01T00:00:00.000Z'),
            endDate: new Date('2026-12-31T23:59:59.999Z'),
            prevStartDate: new Date('2025-01-01T00:00:00.000Z'),
            prevEndDate: new Date('2025-12-31T23:59:59.999Z')
        });
        console.log('Success:', data.kpis.totalRevenue);
    }
    catch (error) {
        console.error('Failed:', error);
    }
}
main();
