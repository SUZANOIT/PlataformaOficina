export const AuditLogger = {
  log(userId: string | null, companyId: string | null, action: string, details: string, status: 'SUCCESS' | 'DUPLICATE_ATTEMPT' | 'ERROR') {
    const timestamp = new Date().toISOString();
    console.log(`[AUDIT] [${timestamp}] User: ${userId || 'SYSTEM'} | Company: ${companyId || 'SYSTEM'} | Action: ${action} | Status: ${status} | Details: ${details}`);
  }
};
