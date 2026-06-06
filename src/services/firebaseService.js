const crypto = require('crypto');
const config = require('../config');
const { resilientFetch } = require('../utils/resilientRequest');
const metrics = require('./metricsService');

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

let cachedAccessToken = null;
let cachedAccessTokenExpiry = 0;

function hasFirebaseCredentials() {
  return Boolean(
    config.firebase.projectId &&
    config.firebase.privateKey &&
    config.firebase.privateKey.includes('BEGIN PRIVATE KEY') &&
    config.firebase.clientEmail,
  );
}

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function getPrivateKey() {
  return config.firebase.privateKey.replace(/\\n/g, '\n');
}

function createServiceAccountJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: config.firebase.clientEmail,
    scope: FCM_SCOPE,
    aud: config.firebase.tokenUri,
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(unsigned)
    .sign(getPrivateKey(), 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${unsigned}.${signature}`;
}

async function parseResponse(response) {
  const contentType = response.headers?.get?.('content-type') || '';
  if (contentType.includes('application/json')) return response.json();
  const text = await response.text?.();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_error) {
    return text;
  }
}

async function getAccessToken() {
  if (cachedAccessToken && Date.now() < cachedAccessTokenExpiry - 60000) {
    return cachedAccessToken;
  }

  const assertion = createServiceAccountJwt();
  const response = await resilientFetch(
    config.firebase.tokenUri,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
    },
    { timeoutMs: config.providers.timeoutMs, retries: config.providers.retries },
  );

  const data = await parseResponse(response);
  if (!response.ok || !data?.access_token) {
    throw new Error(`Firebase token request failed: ${JSON.stringify(data)}`);
  }

  cachedAccessToken = data.access_token;
  cachedAccessTokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedAccessToken;
}

const FirebaseService = {
  async sendPush(token, notification, data = {}) {
    if (!token) {
      return { success: false, mode: 'missing-token', error: 'No FCM token registered' };
    }

    if (!hasFirebaseCredentials()) {
      if (config.providers.allowStubs) {
        metrics.recordProvider('stub', 'push', 'success');
        return { success: true, mode: 'stub' };
      }
      metrics.recordProvider('firebase', 'push', 'disabled');
      return { success: false, mode: 'disabled', error: 'Firebase provider is not configured' };
    }

    try {
      const accessToken = await getAccessToken();
      const response = await resilientFetch(
        `https://fcm.googleapis.com/v1/projects/${config.firebase.projectId}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token,
              notification,
              data,
            },
          }),
        },
        {
          timeoutMs: config.providers.timeoutMs,
          retries: config.providers.retries,
          backoffMs: config.providers.retryBackoffMs,
        },
      );

      const responseData = await parseResponse(response);
      if (!response.ok) {
        metrics.recordProvider('firebase', 'push', 'failure');
        const providerCode = responseData?.error?.details?.find(
          (detail) => detail.errorCode,
        )?.errorCode;
        console.error(
          JSON.stringify({
            level: 'error',
            event: 'push_delivery_failed',
            provider: 'firebase',
            status: response.status,
          }),
        );
        return {
          success: false,
          mode: 'api',
          status: response.status,
          error: responseData,
          permanent:
            providerCode === 'UNREGISTERED' ||
            (providerCode === 'INVALID_ARGUMENT' && response.status === 400),
        };
      }

      metrics.recordProvider('firebase', 'push', 'success');
      return { success: true, mode: 'api', data: responseData };
    } catch (error) {
      metrics.recordProvider('firebase', 'push', 'failure');
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'push_delivery_failed',
          provider: 'firebase',
          reason: error.name === 'TimeoutError' ? 'timeout' : 'network_error',
        }),
      );
      return { success: false, mode: 'api', error: error.message };
    }
  },

  _resetCacheForTests() {
    cachedAccessToken = null;
    cachedAccessTokenExpiry = 0;
  },
};

module.exports = FirebaseService;
