import { Router } from 'express';
import { collectiveAgreementController } from '../controllers/hr/collectiveAgreement.controller';
import { employeeController } from '../controllers/hr/employee.controller';
import { attendanceController } from '../controllers/hr/attendance.controller';
import { payrollController } from '../controllers/hr/payroll.controller';
import { workScheduleController } from '../controllers/hr/workSchedule.controller';

const hrRoutes = Router();

// Collective Agreements
hrRoutes.post('/agreements', collectiveAgreementController.create);
hrRoutes.get('/agreements', collectiveAgreementController.findAll);
hrRoutes.get('/agreements/:id', collectiveAgreementController.findOne);
hrRoutes.put('/agreements/:id', collectiveAgreementController.update);
hrRoutes.delete('/agreements/:id', collectiveAgreementController.delete);

// Employees
hrRoutes.post('/employees', employeeController.create);
hrRoutes.get('/employees', employeeController.findAll);
hrRoutes.get('/employees/:id', employeeController.findOne);
hrRoutes.put('/employees/:id', employeeController.update);
hrRoutes.delete('/employees/:id', employeeController.delete);

// Attendances
hrRoutes.post('/attendances', attendanceController.register);
hrRoutes.get('/attendances/employee/:employeeId', attendanceController.findByEmployee);

// Payroll
hrRoutes.get('/payroll/:employeeId/estimate', payrollController.getEstimate);

// Work Schedules
hrRoutes.post('/work-schedules', workScheduleController.create);
hrRoutes.get('/work-schedules', workScheduleController.findAll);
hrRoutes.get('/work-schedules/:id', workScheduleController.findOne);
hrRoutes.put('/work-schedules/:id', workScheduleController.update);
hrRoutes.delete('/work-schedules/:id', workScheduleController.delete);

export { hrRoutes };
