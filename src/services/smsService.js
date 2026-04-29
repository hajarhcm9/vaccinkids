const config = require('../config');

const SmsService = {
  async sendSMS(phone, message) {
    // STUB MODE — for development
    if (!config.sms.apiKey) {
      console.warn(`📱 [SMS STUB] To: ${phone} | Message: ${message}`);
      return { success: true, mode: 'stub', message: 'SMS logged (stub mode)' };
    }

    // REAL MODE — will be connected in Week 3
    try {
      const response = await globalThis.fetch(config.sms.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.sms.apiKey}`,
        },
        body: JSON.stringify({ phone, message, sender: config.sms.senderName }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error(`❌ SMS API error: ${JSON.stringify(data)}`);
        return { success: false, mode: 'api', error: data };
      }
      return { success: true, mode: 'api', data };
    } catch (error) {
      console.error(`❌ SMS send error: ${error.message}`);
      return { success: false, mode: 'api', error: error.message };
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
