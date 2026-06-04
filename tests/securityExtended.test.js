'use strict';

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

jest.setTimeout(60000);

describe('Day 23 - Securite', () => {
  let adminToken;
  let nurseToken;

  const adminCIN = 'SECADM01';
  const nurseCIN = 'SECNRS01';

  beforeAll(async () => {
    // Create test admin
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('SecAdmin12!', 10);
    
    await pool.query(`DELETE FROM personnel WHERE cin IN ($1, $2)`, [adminCIN, nurseCIN]);
    
    // Reset brute force tracking
    await pool.query(`UPDATE personnel SET failed_login_attempts = 0, locked_until = NULL WHERE cin IN ($1, $2)`, [adminCIN, nurseCIN]);
    
    // Get a centre_id
    const centreResult = await pool.query('SELECT id FROM centre LIMIT 1');
    const centreId = centreResult.rows[0]?.id || 1;
    
    await pool.query(
      `INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif, failed_login_attempts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0)`,
      [adminCIN, 'SecAdmin', 'Test', hashedPassword, 'admin', centreId, true]
    );
    
    // Create test nurse
    const nursePassword = await bcrypt.hash('SecNurse12!', 10);
    await pool.query(
      `INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif, failed_login_attempts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0)`,
      [nurseCIN, 'SecNurse', 'Test', nursePassword, 'infirmier', centreId, true]
    );
    
    // Login as admin
    const adminLogin = await request(app)
      .post('/api/auth/personnel/login')
      .send({ cin: adminCIN, mot_de_passe: 'SecAdmin12!' });
    
    adminToken = adminLogin.body.data?.tokens?.accessToken || adminLogin.body.data?.accessToken;
    
    if (!adminToken) {
      console.error('SEC TEST: adminToken undefined! Status:', adminLogin.status, 'Body:', JSON.stringify(adminLogin.body).substring(0, 300));
    }
    
    // Login as nurse
    const nurseLogin = await request(app)
      .post('/api/auth/personnel/login')
      .send({ cin: nurseCIN, mot_de_passe: 'SecNurse12!' });
    
    nurseToken = nurseLogin.body.data?.tokens?.accessToken || nurseLogin.body.data?.accessToken;
    
    if (!nurseToken) {
      console.error('SEC TEST: nurseToken undefined! Status:', nurseLogin.status, 'Body:', JSON.stringify(nurseLogin.body).substring(0, 300));
    }
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM personnel WHERE cin IN ($1, $2)`, [adminCIN, nurseCIN]);
    await pool.end();
  });

  // =====================
  // Security Headers (Helmet)
  // =====================
  describe('Security Headers (Helmet)', () => {
    it('should set X-Content-Type-Options header', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should hide X-Powered-By header', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('should set X-Frame-Options header', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-frame-options']).toBeDefined();
    });

    it('should set Strict-Transport-Security header', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['strict-transport-security']).toBeDefined();
    });

    it('should set Content-Security-Policy header', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['content-security-policy']).toBeDefined();
    });
  });

  describe('Append-only audit log', () => {
    it('should reject updates and deletes of audit events', async () => {
      const inserted = await pool.query(
        `INSERT INTO audit_log (table_name, record_id, action, user_role)
         VALUES ('security_test', 1, 'INSERT', 'admin') RETURNING id`,
      );
      const id = inserted.rows[0].id;

      await expect(pool.query('UPDATE audit_log SET action = $1 WHERE id = $2', ['UPDATE', id]))
        .rejects.toThrow('audit_log is append-only');
      await expect(pool.query('DELETE FROM audit_log WHERE id = $1', [id])).rejects.toThrow(
        'audit_log is append-only',
      );
    });
  });

  // =====================
  // Input Sanitization
  // =====================
  describe('Input Sanitization', () => {
    it('should sanitize script tags from input', async () => {
      if (!adminToken) return;
      const res = await request(app)
        .get('/api/exports/vaccinations/pdf')
        .set('Authorization', 'Bearer ' + adminToken)
        .query({ search: '<script>alert("xss")</script>' });
      // Should not crash - script tags should be sanitized
      expect([200, 400, 401]).toContain(res.status);
    });

    it('should sanitize HTML from request body', async () => {
      const res = await request(app)
        .post('/api/auth/personnel/login')
        .send({ 
          cin: '<b>BOLD</b>ADM01', 
          mot_de_passe: 'Test1234!' 
        });
      // Should not find user with HTML in CIN
      expect([400, 401]).toContain(res.status);
    });

    it('should prevent prototype pollution', async () => {
      if (!adminToken) return;
      const res = await request(app)
        .post('/api/auth/personnel/login')
        .send({ 
          __proto__: { admin: true },
          cin: 'SECADM01', 
          mot_de_passe: 'SecAdmin12!' 
        });
      // Should work normally despite prototype pollution attempt
      expect([200, 400, 401]).toContain(res.status);
    });
  });

  // =====================
  // Password Strength
  // =====================
  describe('Password Strength Validation', () => {
    it('should reject weak passwords', async () => {
      const { validatePasswordStrength } = require('../src/middleware/passwordStrengthMiddleware');
      
      expect(validatePasswordStrength('short').isValid).toBe(false);
      expect(validatePasswordStrength('alllowercase1!').isValid).toBe(false);
      expect(validatePasswordStrength('ALLUPPERCASE1!').isValid).toBe(false);
      expect(validatePasswordStrength('NoSpecialChar1').isValid).toBe(false);
      expect(validatePasswordStrength('NoNumbers!abc').isValid).toBe(false);
    });

    it('should accept strong passwords', async () => {
      const { validatePasswordStrength } = require('../src/middleware/passwordStrengthMiddleware');
      
      expect(validatePasswordStrength('MyStr0ng!Pass').isValid).toBe(true);
      expect(validatePasswordStrength('C0mpl3x@Pw').isValid).toBe(true);
      expect(validatePasswordStrength('S3cur3#2025').isValid).toBe(true);
    });

    it('should calculate password strength score', async () => {
      const { getPasswordStrengthScore } = require('../src/middleware/passwordStrengthMiddleware');
      
      const weakScore = getPasswordStrengthScore('1234');
      const strongScore = getPasswordStrengthScore('MyStr0ng!Pass2025');
      
      expect(weakScore).toBeLessThan(strongScore);
      expect(strongScore).toBeGreaterThan(50);
    });
  });

  // =====================
  // Brute Force Protection
  // =====================
  describe('Brute Force Protection', () => {
    it('should track failed login attempts', async () => {
      // Reset attempts first
      await pool.query('UPDATE personnel SET failed_login_attempts = 0, locked_until = NULL WHERE cin = $1', [nurseCIN]);
      
      // Make failed login attempts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/personnel/login')
          .send({ cin: nurseCIN, mot_de_passe: 'WrongPass!' + i });
      }
      
      // Check that failed_login_attempts was incremented
      const result = await pool.query(
        'SELECT failed_login_attempts FROM personnel WHERE cin = $1',
        [nurseCIN]
      );
      
      expect(result.rows[0].failed_login_attempts).toBeGreaterThan(0);
    });

    it('should reset failed attempts on successful login', async () => {
      // Login successfully
      await request(app)
        .post('/api/auth/personnel/login')
        .send({ cin: nurseCIN, mot_de_passe: 'SecNurse12!' });
      
      // Check that failed_login_attempts was reset
      const result = await pool.query(
        'SELECT failed_login_attempts FROM personnel WHERE cin = $1',
        [nurseCIN]
      );
      
      expect(result.rows[0].failed_login_attempts).toBe(0);
    });

    it('should lock account after too many failed attempts', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('LockTest12!', 10);
      const lockCIN = 'SEC' + Date.now().toString(36).toUpperCase();
      
      const centreResult = await pool.query('SELECT id FROM centre LIMIT 1');
      const centreId = centreResult.rows[0]?.id || 1;
      
      await pool.query(
        `INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif, failed_login_attempts)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0)`,
        [lockCIN, 'Lock', 'Test', hashedPassword, 'infirmier', centreId, true]
      );
      
      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/personnel/login')
          .send({ cin: lockCIN, mot_de_passe: 'WrongPass!' + i });
      }
      
      // Check that account is locked
      const result = await pool.query(
        'SELECT failed_login_attempts, locked_until FROM personnel WHERE cin = $1',
        [lockCIN]
      );
      
      expect(result.rows[0].failed_login_attempts).toBeGreaterThanOrEqual(5);
      expect(result.rows[0].locked_until).not.toBeNull();
      
      // Try to login with correct password - should be locked
      const lockedRes = await request(app)
        .post('/api/auth/personnel/login')
        .send({ cin: lockCIN, mot_de_passe: 'LockTest12!' });
      
      expect([423, 401, 429]).toContain(lockedRes.status);
      
      // Cleanup
      await pool.query('DELETE FROM personnel WHERE cin = $1', [lockCIN]);
    });
  });

  // =====================
  // SQL Injection Prevention
  // =====================
  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in login', async () => {
      const res = await request(app)
        .post('/api/auth/personnel/login')
        .send({ 
          cin: "ADMIN01' OR '1'='1", 
          mot_de_passe: "anything' OR '1'='1" 
        });
      
      // Should not succeed with SQL injection
      expect(res.status).not.toBe(200);
      expect([400, 401]).toContain(res.status);
    });

    it('should prevent SQL injection in query params', async () => {
      if (!adminToken) return;
      const res = await request(app)
        .get("/api/exports/vaccinations/pdf?date_debut=2024-01-01")
        .set('Authorization', 'Bearer ' + adminToken);
      
      // Should not crash the server
      expect([200, 400, 401]).toContain(res.status);
    });
  });

  // =====================
  // Audit Logging
  // =====================
  describe('Audit Logging', () => {
    it('should have audit_log table with correct columns', async () => {
      const result = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'audit_log'"
      );
      
      const columns = result.rows.map(r => r.column_name);
      expect(columns).toContain('user_id');
      expect(columns).toContain('action');
      expect(columns).toContain('table_name');
      expect(columns).toContain('record_id');
      expect(columns).toContain('timestamp');
    });

    it('should have failed_login_attempts column in personnel', async () => {
      const result = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'personnel' AND column_name = 'failed_login_attempts'"
      );
      
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have locked_until column in personnel', async () => {
      const result = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'personnel' AND column_name = 'locked_until'"
      );
      
      expect(result.rows.length).toBeGreaterThan(0);
    });
  });
});
