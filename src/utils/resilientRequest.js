const crypto = require('crypto');

const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const shouldRetryStatus = (status) => status === 408 || status === 429 || status >= 500;

async function resilientFetch(url, options = {}, policy = {}) {
  const timeoutMs = policy.timeoutMs || 5000;
  const retries = policy.retries || 0;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await globalThis.fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'X-Idempotency-Key': options.idempotencyKey || crypto.randomUUID(),
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!shouldRetryStatus(response.status) || attempt === retries) return response;
      lastError = new Error(`Provider returned retryable status ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === retries) throw error;
    }
    await wait(Math.min((policy.backoffMs || 200) * 2 ** attempt, policy.maxBackoffMs || 2000));
  }

  throw lastError;
}

async function retryOperation(operation, policy = {}) {
  const retries = policy.retries || 0;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries) throw error;
      await wait(Math.min((policy.backoffMs || 200) * 2 ** attempt, policy.maxBackoffMs || 2000));
    }
  }
  throw lastError;
}

module.exports = { resilientFetch, retryOperation, shouldRetryStatus };
