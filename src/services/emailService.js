const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.initialized = false;
    this.transporter = null;
  }

  initialize() {
    if (this.initialized) return;

    var config = require('../config');

    if (config.isTest || process.env.NODE_ENV === 'test') {
      this.transporter = {
        sendMail: async function(mailOptions) {
          return { messageId: 'test-' + Date.now(), response: 'Test mode' };
        }
      };
      this.initialized = true;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });

    this.initialized = true;
  }

  async sendEmail(opts) {
    if (!this.initialized) this.initialize();

    var to = opts.to;
    var subject = opts.subject;
    var html = opts.html;
    var text = opts.text;
    var attachments = opts.attachments;

    if (!to) {
      throw new Error('Email recipient (to) is required');
    }

    var config = require('../config');

    var mailOptions = {
      from: config.email.from || '"VacciniKids" <noreply@vaccinikids.ma>',
      to: to,
      subject: subject,
      html: html || text,
      text: text || '',
    };

    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    try {
      var info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email send error:', error.message);
      throw new Error('Failed to send email: ' + error.message);
    }
  }

  async sendAppointmentConfirmation(to, data) {
    var html = this._buildConfirmationHtml(data);
    return this.sendEmail({
      to: to,
      subject: 'Confirmation de votre rendez-vous de vaccination - VacciniKids',
      html: html,
    });
  }

  async sendAppointmentReminder(to, data) {
    var html = this._buildReminderHtml(data);
    return this.sendEmail({
      to: to,
      subject: 'Rappel: Rendez-vous de vaccination - VacciniKids',
      html: html,
    });
  }

  async sendVaccinationCertificate(to, data) {
    var html = this._buildCertificateHtml(data);
    return this.sendEmail({
      to: to,
      subject: 'Attestation de vaccination - VacciniKids',
      html: html,
    });
  }

  _buildConfirmationHtml(data) {
    return '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">'
      + '<h2 style="color: #2c5282;">Confirmation de Rendez-vous</h2>'
      + '<p>Bonjour ' + (data.parentNom || '') + ',</p>'
      + '<p>Votre rendez-vous de vaccination a bien ete confirme.</p>'
      + '<div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">'
      + '<p><strong>Enfant:</strong> ' + (data.bebePrenom || '') + ' ' + (data.bebeNom || '') + '</p>'
      + '<p><strong>Vaccin:</strong> ' + (data.vaccinNom || '') + '</p>'
      + '<p><strong>Date:</strong> ' + (data.dateSession || '') + '</p>'
      + '<p><strong>Heure:</strong> ' + (data.heureDebut || '') + ' - ' + (data.heureFin || '') + '</p>'
      + '<p><strong>Centre:</strong> ' + (data.centreNom || '') + '</p>'
      + '</div>'
      + '<p style="color: #718096; font-size: 12px;">VacciniKids - Service de vaccination</p>'
      + '</div>';
  }

  _buildReminderHtml(data) {
    return '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">'
      + '<h2 style="color: #d69e2e;">Rappel: Rendez-vous de Vaccination</h2>'
      + '<p>Bonjour ' + (data.parentNom || '') + ',</p>'
      + '<p>Nous vous rappelons que vous avez un rendez-vous de vaccination prochainement.</p>'
      + '<div style="background: #fffff0; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #d69e2e;">'
      + '<p><strong>Enfant:</strong> ' + (data.bebePrenom || '') + ' ' + (data.bebeNom || '') + '</p>'
      + '<p><strong>Vaccin:</strong> ' + (data.vaccinNom || '') + '</p>'
      + '<p><strong>Date:</strong> ' + (data.dateSession || '') + '</p>'
      + '<p><strong>Heure:</strong> ' + (data.heureDebut || '') + ' - ' + (data.heureFin || '') + '</p>'
      + '<p><strong>Centre:</strong> ' + (data.centreNom || '') + '</p>'
      + '</div>'
      + '<p>Veuillez vous presenter 15 minutes avant l\'heure prevue.</p>'
      + '<p style="color: #718096; font-size: 12px;">VacciniKids - Service de vaccination</p>'
      + '</div>';
  }

  _buildCertificateHtml(data) {
    return '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">'
      + '<h2 style="color: #2f855a;">Attestation de Vaccination</h2>'
      + '<p>Bonjour ' + (data.parentNom || '') + ',</p>'
      + '<p>Voici l\'attestation de vaccination de votre enfant.</p>'
      + '<div style="background: #f0fff4; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2f855a;">'
      + '<p><strong>Enfant:</strong> ' + (data.bebePrenom || '') + ' ' + (data.bebeNom || '') + '</p>'
      + '<p><strong>Vaccin:</strong> ' + (data.vaccinNom || '') + '</p>'
      + '<p><strong>Date de vaccination:</strong> ' + (data.dateVaccination || '') + '</p>'
      + '<p><strong>Infirmier(e):</strong> ' + (data.infirmierPrenom || '') + ' ' + (data.infirmierNom || '') + '</p>'
      + '<p><strong>Centre:</strong> ' + (data.centreNom || '') + '</p>'
      + '<p><strong>Poids:</strong> ' + (data.poids || 'N/A') + ' kg</p>'
      + '<p><strong>Taille:</strong> ' + (data.taille || 'N/A') + ' cm</p>'
      + '</div>'
      + '<p style="color: #718096; font-size: 12px;">VacciniKids - Service de vaccination</p>'
      + '</div>';
  }
}

module.exports = new EmailService();
