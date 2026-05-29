"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = void 0;
exports.AuditLogger = {
    log(userId, companyId, action, details, status) {
        const timestamp = new Date().toISOString();
        console.log(`[AUDIT] [${timestamp}] User: ${userId || 'SYSTEM'} | Company: ${companyId || 'SYSTEM'} | Action: ${action} | Status: ${status} | Details: ${details}`);
    }
};
