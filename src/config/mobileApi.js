import { CONFIGURED_API_BASE_URL, MOBILE_ENV } from './mobileEnvironment';

function normalizeApiBaseUrl(value) {
  return value.replace(/\/+$/, '');
}

const API_BASE_URL = normalizeApiBaseUrl(CONFIGURED_API_BASE_URL);
const isDev = MOBILE_ENV === 'development';

if (!isDev && !CONFIGURED_API_BASE_URL) {
  throw new Error('API_BASE_URL must be injected when building the parent mobile app for release.');
}

if (!isDev && !API_BASE_URL.startsWith('https://')) {
  throw new Error('API_BASE_URL must use HTTPS in parent mobile release builds.');
}

export { API_BASE_URL };
