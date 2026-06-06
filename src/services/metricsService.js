const client = require('prom-client');

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry, prefix: 'vaccinikids_' });

const httpDuration = new client.Histogram({
  name: 'vaccinikids_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route_group', 'status_class'],
  registers: [registry],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

const providerDeliveries = new client.Counter({
  name: 'vaccinikids_provider_deliveries_total',
  help: 'Outbound provider delivery results',
  labelNames: ['provider', 'channel', 'result'],
  registers: [registry],
});

const rateLimitBlocks = new client.Counter({
  name: 'vaccinikids_rate_limit_blocks_total',
  help: 'Requests blocked by rate limiter profile',
  labelNames: ['profile'],
  registers: [registry],
});

const auditResults = new client.Counter({
  name: 'vaccinikids_audit_results_total',
  help: 'Audit write and external delivery results',
  labelNames: ['target', 'result'],
  registers: [registry],
});

function routeGroup(path) {
  return path.split('?')[0].split('/').slice(0, 4).join('/') || '/';
}

module.exports = {
  registry,
  observeHttp(req, res, durationMs) {
    httpDuration.observe(
      {
        method: req.method,
        route_group: routeGroup(req.originalUrl),
        status_class: `${Math.floor(res.statusCode / 100)}xx`,
      },
      durationMs / 1000,
    );
  },
  recordProvider(provider, channel, result) {
    providerDeliveries.inc({ provider, channel, result });
  },
  recordRateLimit(profile) {
    rateLimitBlocks.inc({ profile });
  },
  recordAudit(target, result) {
    auditResults.inc({ target, result });
  },
};
