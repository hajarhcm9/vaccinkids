'use strict';

describe('Phase 1 security hardening', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('rejects arbitrary sync fields before opening a database transaction', async () => {
    var queries = [];
    var mockPool = {
      query: jest.fn(async function(sql, params) {
        queries.push(sql);
        if (sql.indexOf('INSERT INTO sync_queue') === 0) {
          return { rows: [{ id: 1, status: params[7], error_message: params[9] }] };
        }
        return { rows: [] };
      })
    };

    jest.doMock('../src/config/database', function() {
      return { pool: mockPool };
    });

    var syncService = require('../src/services/syncService');
    await expect(syncService.pushChanges([{
      client_operation_id: 'malicious-column',
      client_timestamp: new Date().toISOString(),
      operation: 'UPDATE',
      entity_type: 'session',
      entity_id: 1,
      payload: { 'id; DROP TABLE parent;--': 'bad' }
    }], 1, 'admin')).rejects.toThrow('Only the statut field');

    expect(queries).toHaveLength(0);
  });

  it('uses a parameterized file-attente stats filter and rejects SQL text in centreId', async () => {
    var mockPool = {
      query: jest.fn(async function() {
        return { rows: [{ c: '0' }] };
      })
    };

    jest.doMock('../src/config/database', function() {
      return { pool: mockPool };
    });

    var fileAttenteService = require('../src/services/fileAttenteService');

    await expect(fileAttenteService.getStats('1 OR 1=1')).rejects.toThrow('Invalid centre_id');

    var stats = await fileAttenteService.getStats('1');
    expect(stats.total).toBe(0);
    expect(mockPool.query).toHaveBeenLastCalledWith(
      expect.stringContaining('centre_id = $1'),
      [1]
    );
  });

  it('keeps sync push disabled in production even when the environment tries to enable it', () => {
    var original = {};
    var values = {
      NODE_ENV: 'production',
      SYNC_PUSH_ENABLED: 'true',
      JWT_SECRET: 'production-jwt-secret',
      JWT_REFRESH_SECRET: 'production-refresh-secret',
      OTP_HASH_SECRET: 'production-otp-secret',
      DB_USER: 'production-db-user',
      DB_PASSWORD: 'production-db-password'
    };
    Object.keys(values).forEach(function(key) {
      original[key] = process.env[key];
      process.env[key] = values[key];
    });

    try {
      jest.resetModules();
      var config = require('../src/config');
      expect(config.sync.pushEnabled).toBe(false);
    } finally {
      Object.keys(values).forEach(function(key) {
        if (original[key] === undefined) delete process.env[key];
        else process.env[key] = original[key];
      });
    }
  });
});
