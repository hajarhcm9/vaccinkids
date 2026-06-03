const crypto = require('crypto');
const config = require('../config');

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
  const response = await globalThis.fetch(config.firebase.tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });

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
      if (!config.isTest) {
        console.warn(`[FCM STUB] To: ${token} | Title: ${notification.title}`);
      }
      return { success: true, mode: 'stub', message: 'Push notification logged (stub mode)' };
    }

    try {
      const accessToken = await getAccessToken();
      const response = await globalThis.fetch(
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
      );

      const responseData = await parseResponse(response);
      if (!response.ok) {
        console.error(`Firebase push error: ${JSON.stringify(responseData)}`);
        return { success: false, mode: 'api', status: response.status, error: responseData };
      }

      return { success: true, mode: 'api', data: responseData };
    } catch (error) {
      console.error(`Firebase push send error: ${error.message}`);
      return { success: false, mode: 'api', error: error.message };
    }
  },

  _resetCacheForTests() {
    cachedAccessToken = null;
    cachedAccessTokenExpiry = 0;
  },
};

module.exports = FirebaseService;
