'use strict';

describe('Phase 1 security hardening', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('rejects malicious sync payload column names before building entity SQL', async () => {
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
    var result = await syncService.pushChanges([{
      operation: 'CREATE',
      entity_type: 'bebe',
      payload: { 'id; DROP TABLE parent;--': 'bad' }
    }], 1, 'admin');

    expect(result[0].status).toBe('REJECTED');
    expect(result[0].error).toContain('Invalid column');
    expect(queries.some(function(sql) {
      return sql.indexOf('INSERT INTO bebe') === 0 || sql.indexOf('DROP TABLE') !== -1;
    })).toBe(false);
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
});
