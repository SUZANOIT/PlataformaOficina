"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceController = void 0;
const prisma_1 = require("../../lib/prisma");
const zod_1 = require("zod");
const attendanceSchema = zod_1.z.object({
    employeeId: zod_1.z.string().uuid(),
    date: zod_1.z.string(), // YYYY-MM-DD
    entryTime: zod_1.z.string().optional().nullable(),
    intervalStart: zod_1.z.string().optional().nullable(),
    intervalEnd: zod_1.z.string().optional().nullable(),
    exitTime: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
exports.attendanceController = {
    async register(req, res) {
        try {
            const data = attendanceSchema.parse(req.body);
            // Busca employee e config
            const employee = await prisma_1.prisma.collaborator.findUnique({
                where: { id: data.employeeId },
                include: {
                    workSchedule: true,
                    salaryConfig: { include: { collectiveAgreement: true } }
                }
            });
            if (!employee)
                return res.status(404).json({ error: 'Funcionário não encontrado' });
            const attendanceDate = new Date(data.date);
            // Conversão simples para horas trabalhadas (simplificada para MVP)
            let normalHours = 0;
            let extraHours50 = 0;
            let extraHours100 = 0;
            let nightHours = 0;
            // Calculo de horas real seria complexo com datas, mas aqui deixamos a lógica base 
            // (Em um cenário real usaríamos moment.js ou date-fns para cálculos de turno noturno)
            if (data.entryTime && data.exitTime) {
                const entry = new Date(`${data.date}T${data.entryTime}:00`);
                const exit = new Date(`${data.date}T${data.exitTime}:00`);
                let workedMs = exit.getTime() - entry.getTime();
                if (data.intervalStart && data.intervalEnd) {
                    const iStart = new Date(`${data.date}T${data.intervalStart}:00`);
                    const iEnd = new Date(`${data.date}T${data.intervalEnd}:00`);
                    workedMs -= (iEnd.getTime() - iStart.getTime());
                }
                let workedHours = workedMs / (1000 * 60 * 60);
                // Mock simplificado de HE e Adicional Noturno:
                // Assumindo jornada de 8h normais
                if (workedHours > 8) {
                    normalHours = 8;
                    extraHours50 = workedHours - 8;
                }
                else {
                    normalHours = workedHours;
                }
            }
            const attendance = await prisma_1.prisma.timeAttendance.create({
                data: {
                    employeeId: data.employeeId,
                    date: attendanceDate,
                    entryTime: data.entryTime ? new Date(`${data.date}T${data.entryTime}:00`) : null,
                    intervalStart: data.intervalStart ? new Date(`${data.date}T${data.intervalStart}:00`) : null,
                    intervalEnd: data.intervalEnd ? new Date(`${data.date}T${data.intervalEnd}:00`) : null,
                    exitTime: data.exitTime ? new Date(`${data.date}T${data.exitTime}:00`) : null,
                    normalHours,
                    extraHours50,
                    extraHours100,
                    nightHours,
                    notes: data.notes
                }
            });
            return res.status(201).json(attendance);
        }
        catch (error) {
            return res.status(400).json({ error: error.message || 'Erro ao registrar ponto' });
        }
    },
    async findByEmployee(req, res) {
        try {
            const { employeeId } = req.params;
            const { month, year } = req.query;
            let whereClause = { employeeId };
            if (month && year) {
                const startDate = new Date(Number(year), Number(month) - 1, 1);
                const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
                whereClause.date = {
                    gte: startDate,
                    lte: endDate
                };
            }
            const attendances = await prisma_1.prisma.timeAttendance.findMany({
                where: whereClause,
                orderBy: { date: 'asc' }
            });
            return res.json(attendances);
        }
        catch (error) {
            return res.status(500).json({ error: 'Erro ao listar batidas de ponto' });
        }
    }
};
