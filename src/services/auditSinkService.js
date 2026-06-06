const crypto = require('crypto');
const config = require('../config');
const metrics = require('./metricsService');
const { resilientFetch } = require('../utils/resilientRequest');

const AuditSinkService = {
  async deliver(entry) {
    if (!config.audit.externalUrl) return { delivered: false, mode: 'disabled' };

    const body = JSON.stringify(entry);
    const signature = crypto
      .createHmac('sha256', config.audit.externalSecret)
      .update(body)
      .digest('hex');

    try {
      const response = await resilientFetch(
        config.audit.externalUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Audit-Signature': signature,
          },
          body,
          idempotencyKey: `audit-${entry.request_id || crypto.randomUUID()}`,
        },
        {
          timeoutMs: config.providers.timeoutMs,
          retries: config.providers.retries,
          backoffMs: config.providers.retryBackoffMs,
        },
      );
      if (!response.ok) throw new Error(`Audit sink returned ${response.status}`);
      metrics.recordAudit('external', 'success');
      return { delivered: true, mode: 'external' };
    } catch (error) {
      metrics.recordAudit('external', 'failure');
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'audit_external_delivery_failed',
          requestId: entry.request_id,
          message: error.message,
        }),
      );
      throw error;
    }
  },
};

module.exports = AuditSinkService;
