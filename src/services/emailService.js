const nodemailer = require('nodemailer');
const config = require('../config');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    if (process.env.NODE_ENV === 'test') {
      this.transporter = {
        sendMail: async (options) => ({
          messageId: 'test-' + Date.now(),
          response: 'Test mode - email not sent',
          test: true,
        }),
      };
    } else if (process.env.EMAIL_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT, 10) || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    } else {
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        console.log('Email ethereal configured: ' + testAccount.user);
      } catch (err) {
        console.warn('Email service: No SMTP configured, using stub mode');
        this.transporter = {
          sendMail: async (options) => ({
            messageId: 'stub-' + Date.now(),
            response: 'Stub mode - no SMTP configured',
            stub: true,
          }),
        };
      }
    }

    this.initialized = true;
  }

  async sendEmail({ to, subject, html, attachments = [] }) {
    if (!this.initialized) await this.initialize();

    if (!to) {
      throw new Error('Email recipient (to) is required');
    }

    const mailOptions = {
      from: 'VacciniKids <' + (process.env.EMAIL_FROM || 'noreply@vaccinikids.ma') + '>',
      to,
      subject,
      html,
      attachments,
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId, test: result.test || false };
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error.message);
      return { success: false, error: error.message };
    }
  }

  _appointmentConfirmationTemplate(data) {
    return '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">' +
      '<div style="background:#2563eb;color:white;padding:20px;text-align:center;"><h1>VacciniKids</h1></div>' +
      '<div style="padding:20px;">' +
      '<h2>Confirmation de rendevous-vous</h2>' +
      '<p>Bonjour ' + data.parentNom + ',</p>' +
      '<p>Votre rendezvous de vaccination a ete confirme :</p>' +
      '<table style="border-collapse:collapse;width:100%;">' +
      '<tr><td style="padding:8px;border:1px solid #dddd;"><b>Bebe</b></td><td style="padding:8px;border:1px solid #dddd;">' + data.bebePrenom + ' ' + data.bebeNom + '</td></tr>' +
      '<tr><td style="padding:8px;border:1px solid #dddd;"><b>Vaccin</b></td><td style="padding:8px;border:1px solid #dddd;">' + data.vaccinNom + '</td></tr>' +
      '<tr><td style="padding:8px;border:1px solid #dddd;"><b>Date</b></td><td style="padding:8px;border:1px solid #dddd;">' + data.dateSession + '</td></tr>' +
      '<tr><td style="padding:8px;border:1px solid #dddd;"><b>Heure</b></td><td style="padding:8px;border:1px solid #dddd;">' + data.heureDebut + ' - ' + data.heureFin + '</td></tr>' +
      '<tr><td style="padding:8px;border:1px solid #dddd;"><b>Centre</b></td><td style="padding:8px;border:1px solid #dddd;">' + data.centreNom + '</td></tr>' +
      '</table>' +
      '<p>Merci de vous presenter 10 minutes avant l'\'heure prevue.</p>' +
      '</div>' +
      '<div style="background:#f3f4f6;padding:15px;text-align:center;font-size:12px;">VacciniKids - Service de vaccination infantile</div>' +
      '</div>';
  }

  _appointmentReminderTemplate(data) {
    return '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">' +
      '<div style="background:#f59e0b;color:white;padding:20px;text-align:center;"><h1>VacciniKids - Rappel</h1></div>' +
      '<div style="padding:20px;">' +
      '<h2>Rappel de rendezvous-vous</h2>' +
      '<p>Bonjour ' + data.parentNom + ',</p>' +
      '<p>Ceci est un rappel pour votre rendezvous de vaccination :</p>' +
      '<table style="border-collapse:collapse;width:100%;">' +
      '<tr><td style="padding:8px;border:1px solid #dddd;"><b>Bebe</b></td><td style="padding:8px;border:1px solid #dddd;">' + data.bebePrenom + ' ' + data.bebeNom + '</td></tr>' +
      '<tr><td style="padding:8px;border:1px solid #dddd;"><b>Vaccin</b></td><td style="padding:8px;border:1px solid #dddd;">' + data.vaccinNom + '</td></tr>' +
      '<tr><td style="padding:8px;border:1px solid #dddd;"><b>Date</b></td><td style="padding:8px;border:1px solid #dddd;">' + data.dateSession + '</td></tr>' +
      '<tr><td style="padding:8px;border:1px solid #dddd;"><b>Heure</b></td><td style="padding:8px;border:1px solid #dddd;">' + data.heureDebut + ' - ' + data.heureFin + '</td></tr>' +
      '<tr><td style="padding:8px;border:1px solid #dddd;"><b>Centre</b></td><td style="padding:8px;border:1px solid #dddd;">' + data.centreNom + '</td></tr>' +
      '</table>' +
      '<p><em>En cas d\'empechement, veuillez annuler votre rendezvous via l\'application.</em></p>' +
      '</div>' +
      '<div style="background:#f3f4f6;padding:15px;text-align:center;font-size:12px;">VacciniKids - Service de vaccination infantile</div>' +
      '</div>';
  }

  _vaccinationCertificateTemplate(data) {
    return '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">' +
      '<div style="background:#10b981;color:white;padding:20px;text-align:center;"><h1>VacciniKids - Attestation</h1></div>' +
      '<div style="padding:20px;">' +
      '<h2>Attestation de vaccination</h2>' +
      '<p>Bonjour ' + data.parentNom + ',</p>' +
      '<p>Veuillez trouver ci-joint l'attestation de vaccination de votre enfant.</p>' +
      '<table style="border-collapse:collapse;width:100%;">' +
      '<tr><td style="padding:8px;border:1px solid #dddd;"><b>Enfant</b></td><td style="padding:8px;border:1px solid #dddd;">' + data.bebePrenom + ' ' + data.bebeNom + '</td></tr>' +
      '<tr><td style="padding:8px;border:1px solid #dddd;"><b>Vaccin</b></td><td style="padding:8px;border:1px solid #dddd;">' + data.vaccinNom + '</td></tr>' +
      '<tr><td style="padding:8px;border:1px solid #dddd;"><b>Date</b></td><td style="padding:8px;border:1px solid #dddd;">' + data.dateVaccination + '</td></tr>' +
      '<tr><td style="padding:8px;border:1px solid #dddd;"><b>Centre</b></td><td style="padding:8px;border:1px solid #dddd;">' + data.centreNom + '</td></tr>' +
      '<tr><td style="padding:8px;border:1px solid #dddd;"><b>Infirmier(e)</b></td><td style="padding:8px;border:1px solid #dddd;">' + data.infirmierNom + '</td></tr>' +
      '</table>' +
      '<p>Le certificat de vaccination est joint a cet email en format PDF.</p>' +
      '</div>' +
      '<div style="background:#f3f4f6;padding:15px;text-align:center;font-size:12px;">VacciniKids - Service de vaccination infantile</div>' +
      '</div>';
  }

  async sendAppointmentConfirmation(email, data) {
    const html = this._appointmentConfirmationTemplate(data);
    return this.sendEmail({
      to: email,
      subject: 'VacciniKids - Confirmation de rendezvous-vous',
      html,
    });
  }

  async sendAppointmentReminder(email, data) {
    const html = this._appointmentReminderTemplate(data);
    return this.sendEmail({
      to: email,
      subject: 'VacciniKids - Rappel de rendezvous-vous',
      html,
    });
  }

  async sendVaccinationCertificate(email, data, pdfBuffer) {
    const html = this._vaccinationCertificateTemplate(data);
    return this.sendEmail({
      to: email,
      subject: 'VacciniKids - Attestation de vaccination',
      html,
      attachments: [
        {
          filename: 'attestation-vaccination-' + data.bebePrenom + '-' + data.vaccinNom + '.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }
}

module.exports = new EmailService();
