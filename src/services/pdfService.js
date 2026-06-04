const PDFDocument = require('pdfkit');

class PdfService {
  async generateVaccinationCertificate(data) {
    return new Promise(function (resolve, reject) {
      try {
        var doc = new PDFDocument({ size: 'A4', margin: 50 });
        var buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', function () {
          resolve(Buffer.concat(buffers));
        });
        doc.on('error', reject);

        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .text('ATTESTATION DE VACCINATION', { align: 'center' });
        doc.moveDown(1.5);

        doc.fontSize(12).font('Helvetica-Bold').text('Informations du bebe');
        doc
          .font('Helvetica')
          .text('Prenom: ' + (data.bebe_prenom || ''))
          .text('Nom: ' + (data.bebe_nom || ''))
          .text('Date de naissance: ' + PdfService._formatDate(data.date_naissance));
        doc.moveDown(1);

        doc.font('Helvetica-Bold').text('Informations de vaccination');
        doc
          .font('Helvetica')
          .text('Vaccin: ' + (data.vaccin_nom || ''))
          .text('Date de vaccination: ' + PdfService._formatDate(data.date_vaccination))
          .text('Numero de lot: ' + (data.numero_lot || 'N/A'))
          .text('Poids: ' + (data.poids || 'N/A') + ' kg')
          .text('Taille: ' + (data.taille || 'N/A') + ' cm');
        doc.moveDown(1);

        doc.font('Helvetica-Bold').text('Personnel de sante');
        doc
          .font('Helvetica')
          .text(
            'Infirmier(e): ' + (data.infirmier_prenom || '') + ' ' + (data.infirmier_nom || ''),
          );
        doc.moveDown(1);

        doc.font('Helvetica-Bold').text('Centre de vaccination');
        doc.font('Helvetica').text('Nom: ' + (data.centre_nom || ''));
        doc.moveDown(1);

        doc.font('Helvetica-Bold').text('Parent/Tuteur');
        doc
          .font('Helvetica')
          .text('Nom: ' + (data.parent_prenom || '') + ' ' + (data.parent_nom || ''))
          .text('Telephone: ' + (data.parent_telephone || ''));
        doc.moveDown(2);

        doc
          .fontSize(10)
          .font('Helvetica-Oblique')
          .text('Ce document est une attestation officielle de vaccination.', { align: 'center' })
          .text('Genere le ' + new Date().toLocaleDateString('fr-FR'), { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateVaccinationCard(data) {
    return new Promise(function (resolve, reject) {
      try {
        var doc = new PDFDocument({ size: 'A4', margin: 50 });
        var buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', function () {
          resolve(Buffer.concat(buffers));
        });
        doc.on('error', reject);

        doc.fontSize(20).font('Helvetica-Bold').text('CARNET DE VACCINATION', { align: 'center' });
        doc.moveDown(1.5);

        doc.fontSize(14).font('Helvetica-Bold').text("Identite de l'enfant");
        doc
          .fontSize(11)
          .font('Helvetica')
          .text('Prenom: ' + (data.bebe_prenom || ''))
          .text('Nom: ' + (data.bebe_nom || ''))
          .text('Date de naissance: ' + PdfService._formatDate(data.date_naissance))
          .text('Sexe: ' + (data.sexe === 'M' ? 'Masculin' : 'Feminin'))
          .text('Code QR: ' + (data.code_qr || ''));
        doc.moveDown(1);

        doc.fontSize(14).font('Helvetica-Bold').text('Parent/Tuteur');
        doc
          .fontSize(11)
          .font('Helvetica')
          .text('Nom: ' + (data.parent_prenom || '') + ' ' + (data.parent_nom || ''))
          .text('Telephone: ' + (data.parent_telephone || ''));
        doc.moveDown(1.5);

        doc.fontSize(14).font('Helvetica-Bold').text('Historique des vaccinations');
        doc.moveDown(0.5);

        if (data.vaccinations && data.vaccinations.length > 0) {
          data.vaccinations.forEach(function (v) {
            doc
              .fontSize(10)
              .font('Helvetica')
              .text(
                '- ' +
                  (v.vaccin_nom || '') +
                  ' | ' +
                  PdfService._formatDate(v.date_heure) +
                  ' | Lot: ' +
                  (v.numero_lot || 'N/A') +
                  ' | Infirmier: ' +
                  (v.infirmier_prenom || '') +
                  ' ' +
                  (v.infirmier_nom || ''),
              );
          });
        } else {
          doc.fontSize(10).font('Helvetica').text('Aucune vaccination enregistree');
        }
        doc.moveDown(1.5);

        if (data.retards && data.retards.length > 0) {
          doc.fontSize(14).font('Helvetica-Bold').text('Vaccinations en retard');
          doc.fontSize(10).font('Helvetica');
          data.retards.forEach(function (r) {
            doc.text(
              '- ' +
                (r.vaccin_nom || '') +
                ' (prevu: ' +
                PdfService._formatDate(r.date_prevue) +
                ')',
            );
          });
          doc.moveDown(1);
        }

        doc
          .fontSize(10)
          .font('Helvetica-Oblique')
          .text('Carnet genere le ' + new Date().toLocaleDateString('fr-FR'), { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateRdvConfirmation(data) {
    return new Promise(function (resolve, reject) {
      try {
        var doc = new PDFDocument({ size: 'A4', margin: 50 });
        var buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', function () {
          resolve(Buffer.concat(buffers));
        });
        doc.on('error', reject);

        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .text('CONFIRMATION DE RENDEZ-VOUS', { align: 'center' });
        doc.moveDown(1.5);

        doc.fontSize(14).font('Helvetica-Bold').text('Details du rendez-vous');
        doc
          .fontSize(12)
          .font('Helvetica')
          .text('Enfant: ' + (data.bebe_prenom || '') + ' ' + (data.bebe_nom || ''))
          .text('Vaccin: ' + (data.vaccin_nom || ''))
          .text('Date: ' + PdfService._formatDate(data.date_session))
          .text('Heure: ' + (data.heure_debut || '') + ' - ' + (data.heure_fin || ''));
        doc.moveDown(1);

        doc.fontSize(14).font('Helvetica-Bold').text('Centre de vaccination');
        doc
          .fontSize(12)
          .font('Helvetica')
          .text('Nom: ' + (data.centre_nom || ''))
          .text('Adresse: ' + (data.centre_adresse || ''));
        doc.moveDown(1);

        doc.fontSize(14).font('Helvetica-Bold').text('Contact parent');
        doc
          .fontSize(12)
          .font('Helvetica')
          .text('Nom: ' + (data.parent_prenom || '') + ' ' + (data.parent_nom || ''))
          .text('Telephone: ' + (data.parent_telephone || ''));
        doc.moveDown(2);

        doc.fontSize(10).font('Helvetica-Bold').text('Important:', { underline: true });
        doc
          .font('Helvetica')
          .text("Veuillez vous presenter 15 minutes avant l'heure du rendez-vous.")
          .text('Pensez a apporter le carnet de vaccination de votre enfant.')
          .text("En cas d'empechement, veuillez annuler votre rendez-vous au prealable.");

        doc.moveDown(2);
        doc
          .fontSize(10)
          .font('Helvetica-Oblique')
          .text('Confirmation generee le ' + new Date().toLocaleDateString('fr-FR'), {
            align: 'center',
          });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  _formatDate(dateStr) {
    return PdfService._formatDate(dateStr);
  }

  static _formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
      var d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (e) {
      return dateStr;
    }
  }
}

module.exports = new PdfService();
