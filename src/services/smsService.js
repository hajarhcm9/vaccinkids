const config = require('../config');

function buildPayload(phone, message) {
  if (config.sms.provider === 'smspartner') {
    return {
      apiKey: config.sms.apiKey,
      phoneNumbers: phone,
      message,
      sender: config.sms.senderName,
    };
  }

  return {
    phone,
    message,
    sender: config.sms.senderName,
  };
}

function buildHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (config.sms.provider !== 'smspartner') {
    headers.Authorization = `${config.sms.authScheme} ${config.sms.apiKey}`.trim();
  }
  return headers;
}

async function parseResponseBody(response) {
  const contentType = response.headers?.get?.('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text?.();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (_error) {
    return text;
  }
}

const SmsService = {
  async sendSMS(phone, message) {
    if (!config.sms.apiKey) {
      if (!config.isTest) {
        console.warn(`[SMS STUB] To: ${phone} | Message: ${message}`);
      }
      return { success: true, mode: 'stub', message: 'SMS logged (stub mode)' };
    }

    try {
      const response = await globalThis.fetch(config.sms.apiUrl, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(buildPayload(phone, message)),
      });

      const data = await parseResponseBody(response);
      if (!response.ok) {
        console.error(`SMS API error: ${JSON.stringify(data)}`);
        return {
          success: false,
          mode: 'api',
          provider: config.sms.provider,
          status: response.status,
          error: data,
        };
      }
      return { success: true, mode: 'api', provider: config.sms.provider, data };
    } catch (error) {
      console.error(`SMS send error: ${error.message}`);
      return {
        success: false,
        mode: 'api',
        provider: config.sms.provider,
        error: error.message,
      };
    }
  },

  async sendOTP(phone, otp) {
    const message = `VacciniKids: Votre code de vérification est ${otp}. Ce code expire dans ${config.otp.expiryMinutes} minutes.`;
    return this.sendSMS(phone, message);
  },

  async sendAppointmentReminder(phone, details) {
    const message = `VacciniKids: Rappel - RDV vaccination le ${details.date} à ${details.time} pour ${details.babyName}. Centre ${details.centreName}.`;
    return this.sendSMS(phone, message);
  },

  async sendReschedulingSMS(phone, reason) {
    const message = `VacciniKids: Votre RDV a été reprogrammé. Raison: ${reason}. Répondez OUI pour confirmer ou NON pour annuler.`;
    return this.sendSMS(phone, message);
  },
};

module.exports = SmsService;
