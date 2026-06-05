"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantMiddleware = void 0;
const tenant_context_1 = require("../lib/tenant-context");
const tenantMiddleware = (req, res, next) => {
    const companyId = req.companyId;
    const userId = req.userId;
    if (companyId) {
        tenant_context_1.tenantContext.run({ companyId, userId }, () => {
            next();
        });
    }
    else {
        next();
    }
};
exports.tenantMiddleware = tenantMiddleware;
