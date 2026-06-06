describe('SMS Service provider integration', () => {
  var originalFetch;
  var originalEnv;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalEnv = { ...process.env };
    jest.resetModules();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  function loadService(env) {
    process.env = { ...process.env, ...env };
    jest.resetModules();
    return require('../src/services/smsService');
  }

  it('uses stub mode when no API key is configured', async () => {
    const SmsService = loadService({ SMS_API_KEY: '' });

    const result = await SmsService.sendSMS('+212600000099', 'Test message');

    expect(result).toMatchObject({ success: true, mode: 'stub' });
    expect(globalThis.fetch).toBe(originalFetch);
  });

  it('does not report success without a provider outside development and test', async () => {
    const SmsService = loadService({
      NODE_ENV: 'staging',
      ALLOW_PROVIDER_STUBS: 'false',
      SMS_API_KEY: '',
    });

    const result = await SmsService.sendSMS('+212600000099', 'Test message');

    expect(result).toMatchObject({ success: false, mode: 'disabled' });
  });

  it('retries retryable provider failures with an idempotency key', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: { get: () => 'application/json' },
        json: async () => ({ error: 'unavailable' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ id: 'sms-retry' }),
      });
    const SmsService = loadService({
      SMS_API_KEY: 'secret-key',
      SMS_PROVIDER: 'generic',
      PROVIDER_RETRIES: '1',
      PROVIDER_RETRY_BACKOFF_MS: '1',
    });

    const result = await SmsService.sendSMS('+212600000099', 'Bonjour');

    expect(result.success).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch.mock.calls[0][1].headers['X-Idempotency-Key']).toBeDefined();
  });

  it('sends a generic JSON payload with authorization when configured', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ id: 'sms-1' }),
    });
    const SmsService = loadService({
      SMS_API_KEY: 'secret-key',
      SMS_API_URL: 'https://sms.example.test/send',
      SMS_SENDER_NAME: 'VacciniKids',
      SMS_PROVIDER: 'generic',
    });

    const result = await SmsService.sendSMS('+212600000099', 'Bonjour');

    expect(result).toEqual({ success: true, mode: 'api', provider: 'generic', data: { id: 'sms-1' } });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://sms.example.test/send',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer secret-key',
        }),
        body: JSON.stringify({
          phone: '+212600000099',
          message: 'Bonjour',
          sender: 'VacciniKids',
        }),
      })
    );
  });

  it('supports SmsPartner-style payload fields', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true }),
    });
    const SmsService = loadService({
      SMS_API_KEY: 'partner-key',
      SMS_PROVIDER: 'smspartner',
      SMS_SENDER_NAME: 'VacciniKids',
    });

    await SmsService.sendSMS('+212600000099', 'Rappel');

    const options = globalThis.fetch.mock.calls[0][1];
    expect(JSON.parse(options.body)).toEqual({
      apiKey: 'partner-key',
      phoneNumbers: '+212600000099',
      message: 'Rappel',
      sender: 'VacciniKids',
    });
  });

  it('returns a structured failure for API errors', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'rate limited' }),
    });
    const SmsService = loadService({ SMS_API_KEY: 'secret-key' });

    const result = await SmsService.sendSMS('+212600000099', 'Bonjour');

    expect(result).toEqual({
      success: false,
      mode: 'api',
      provider: 'generic',
      status: 429,
      error: { error: 'rate limited' },
    });
  });
});
