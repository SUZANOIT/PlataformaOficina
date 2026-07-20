"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrRoutes = void 0;
const express_1 = require("express");
const collectiveAgreement_controller_1 = require("../controllers/hr/collectiveAgreement.controller");
const employee_controller_1 = require("../controllers/hr/employee.controller");
const attendance_controller_1 = require("../controllers/hr/attendance.controller");
const payroll_controller_1 = require("../controllers/hr/payroll.controller");
const hrRoutes = (0, express_1.Router)();
exports.hrRoutes = hrRoutes;
// Collective Agreements
hrRoutes.post('/agreements', collectiveAgreement_controller_1.collectiveAgreementController.create);
hrRoutes.get('/agreements', collectiveAgreement_controller_1.collectiveAgreementController.findAll);
hrRoutes.get('/agreements/:id', collectiveAgreement_controller_1.collectiveAgreementController.findOne);
hrRoutes.put('/agreements/:id', collectiveAgreement_controller_1.collectiveAgreementController.update);
hrRoutes.delete('/agreements/:id', collectiveAgreement_controller_1.collectiveAgreementController.delete);
// Employees
hrRoutes.post('/employees', employee_controller_1.employeeController.create);
hrRoutes.get('/employees', employee_controller_1.employeeController.findAll);
hrRoutes.get('/employees/:id', employee_controller_1.employeeController.findOne);
hrRoutes.put('/employees/:id', employee_controller_1.employeeController.update);
hrRoutes.delete('/employees/:id', employee_controller_1.employeeController.delete);
// Attendances
hrRoutes.post('/attendances', attendance_controller_1.attendanceController.register);
hrRoutes.get('/attendances/employee/:employeeId', attendance_controller_1.attendanceController.findByEmployee);
// Payroll
hrRoutes.get('/payroll/:employeeId/estimate', payroll_controller_1.payrollController.getEstimate);
