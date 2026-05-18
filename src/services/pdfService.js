const PDFDocument = require('pdfkit');

class PdfService {
  _formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('fr-FR', {
      day: '2digit',
      month: '2digit',
      year: 'numeric',
    });
  }

  async generateVaccinationCertificate(data) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A'',
        margin: 50,
        info: {
          Title: 'Attestation de vaccination - VacciniKids',
          Author: 'VacciniKids',
          Subject: 'Attestation de vaccination - ' + data.bebe_prenom + ' ' + data.bebe_nom,
        },
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).fillColor('#2563eb').text('VacciniKids', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(14).fillColor('#374151').text('Attestation de vaccination', { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#2563eb').lineWidth(2).stroke();
      doc.moveDown(1);

      // Child info
      doc.fontSize(12).fillColor('#1f2937').text("Informations de l\'enfant", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#374151');
      doc.text('Nom complet : ' + data.bebe_prenom + ' ' + data.bebe_nom);
      doc.text('Date de naissance : ' + this._formatDate(data.bebe_date_naissance));
      doc.text('Sexe : ' + (data.bebe_sexe === 'M' ? 'Masculin' : 'Feminin'));
      doc.moveDown(1);

      // Parent info
      doc.fontSize(12).fillColor('#1f2937').text('Parent / Tuteur', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#374151');
      doc.text('Nom complet : ' + data.parent_prenom + ' ' + data.parent_nom);
      doc.text('Telephone : ' + (data.parent_telephone || 'N/A'));
      doc.moveDown(1);

      // Vaccination info
      doc.fontSize(12).fillColor('#1f2937').text('Details de la vaccination', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#374151');
      doc.text('Vaccin : ' + data.vaccin_nom);
      doc.text('Date de vaccination : ' + this._formatDate(data.date_vaccination));
      if (data.numero_lot) doc.text('Numero de lot : ' + data.numero_lot);
      if (data.poids) doc.text('Poids : ' + data.poids + ' kg');
      if (data.taille) doc.text('Taille : ' + data.taille + ' cm');
      if (data.reactions) doc.text('Reactions observees : ' + data.reactions);
      doc.moveDown(1);

      // Centre info
      doc.fontSize(12).fillColor('#1f2937').text('Centre de vaccination', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#374151');
      doc.text('Nom : ' + data.centre_nom);
      doc.text('Adresse : ' + (data.centre_adresse || 'N/A'));
      doc.text('Telephone : ' + (data.centre_telephone || 'N/A'));
      doc.moveDown(1);

      // Healthcare professional
      doc.fontSize(12).fillColor('#1f2937').text('Professionnel de sante', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#374151');
      doc.text('Nom : ' + data.infirmier_prenom + ' ' + data.infirmier_nom);
      doc.text('Role : Infirmier(e)');
      doc.moveDown(2);

      // Signature area
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#d1d5db').lineWidth(1).stroke();
      doc.moveDown(1);
      doc.fontSize(10).fillColor('#6b7280').text('Signature et cachet du centre', { align: 'right' });
      doc.moveDown(2);

      // Footer
      doc.fontSize(8).fillColor('#9ca3af');
      doc.text('Document genere le ' + this._formatDate(new Date()) + ' par VacciniKids', { align: 'center' });
      doc.text('Reference : VK-CERT-' + data.vaccination_id + '-' + Date.now(), { align: 'center' });

      doc.end();
    });
  }

  async generateVaccinationCard(data) {
    return new Promise((resolve, reject) => {
      const doc = new PDFFö7VÖVçB‡°¢6—¦S¢tBrÀ¢Ö&v–ã¢SÀ¢–æfó¢°¢F—FÆS¢t6&æWBFRf66–æF–öâÒf66–æ”¶–G2rÀ¢WF†÷#¢uf66–æ”¶–G2rÀ¢7V&¦V7C¢t6&æWBFRf66–æF–öâÒr²FFæ&V&U÷&VæöÒ²rr²FFæ&V&UöæöÒÀ¢ÒÀ¢Ò“° ¢6öç7B'VffW'2ÒµÓ°¢Fö2æöâ‚vFFrÂ'VffW'2çW6‚æ&–æB†'VffW'2’“°¢Fö2æöâ‚vVæBrÂ‚’Óâ&W6öÇfR„'VffW"æ6öæ6B†'VffW'2’’“°¢Fö2æöâ‚vW'&÷"rÂ&V¦V7B“° ¢òò†VFW ¢Fö2æföçE6—¦Rƒ#’æf–ÆÄ6öÆ÷"‚r3#Sc6V"r’çFW‡B‚uf66–æ”¶–G2rÂ²Æ–vã¢v6VçFW"rÒ“°¢Fö2æÖ÷fTF÷vâƒã2“°¢Fö2æföçE6—¦RƒB’æf–ÆÄ6öÆ÷"‚r33sCSr’çFW‡B‚t6&æWBFRf66–æF–öârÂ²Æ–vã¢v6VçFW"rÒ“°¢Fö2æÖ÷fTF÷vâƒãR“°¢Fö2æÖ÷fUFòƒSÂFö2ç’’æÆ–æUFòƒSCRÂFö2ç’’ç7G&ö¶T6öÆ÷"‚r3#Sc6V"r’æÆ–æUv–GF‚ƒ"’ç7G&ö¶R‚“°¢Fö2æÖ÷fTF÷vâƒ“° ¢òò6†–ÆB–æfð¢Fö2æföçE6—¦Rƒ"’æf–ÆÄ6öÆ÷"‚r3c#“3rr’çFW‡B‚$–æf÷&ÖF–öç2FRÂvVæfçB"Â²VæFW&Æ–æS¢G'VRÒ“°¢Fö2æÖ÷fTF÷vâƒãR“°¢Fö2æföçE6—¦Rƒ’æf–ÆÄ6öÆ÷"‚r33sCSr“°¢Fö2çFW‡B‚tæöÒ6ö×ÆWB¢r²FFæ&V&U÷&VæöÒ²rr²FFæ&V&UöæöÒ“°¢Fö2çFW‡B‚tFFRFRæ—76æ6R¢r²F†—2åöf÷&ÖDFFR†FFæFFUöæ—76æ6R’“°¢Fö2çFW‡B‚u6W†R¢r²†FFç6W†RÓÓÒtÒròtÖ67VÆ–âr¢tfVÖ–æ–âr’“°¢–b†FFæ6öFU÷"’Fö2çFW‡B‚t6öFR"¢r²FFæ6öFU÷"“°¢Fö2æÖ÷fTF÷vâƒ“° ¢òò&VçB–æfð¢Fö2æföçE6—¦Rƒ"’æf–ÆÄ6öÆ÷"‚r3c#“3rr’çFW‡B‚u&VçBòGWFWW"rÂ²VæFW&Æ–æS¢G'VRÒ“°¢Fö2æÖ÷fTF÷vâƒãR“°¢Fö2æföçE6—¦Rƒ’æf–ÆÄ6öÆ÷"‚r33sCSr“°¢Fö2çFW‡B‚tæöÒ¢r²FFç&VçE÷&VæöÒ²rr²FFç&VçEöæöÒ“°¢Fö2çFW‡B‚uFVÆW†öæR¢r²†FFç&VçE÷FVÆW†öæRÇÂtâôr’“°¢Fö2æÖ÷fTF÷vâƒ“° ¢òòf66–æF–öâ†—7F÷'¢Fö2æföçE6—¦Rƒ"’æf–ÆÄ6öÆ÷"‚r3c#“3rr’çFW‡B‚t†—7F÷&—VRFW2f66–æF–öç2rÂ²VæFW&Æ–æS¢G'VRÒ“°¢Fö2æÖ÷fTF÷vâƒãR“° ¢–b†FFçf66–æF–öç2bbFFçf66–æF–öç2æÆVæwF‚â’°¢f"F&ÆUF÷ÒFö2ç“°¢f"6öÅv–GF‡2Ò³SÂÂÂCUÓ°¢f"†VFW'2Ò²uf66–ârÂtFFRrÂtÆ÷BrÂt–æf—&Ö–W"†R’uÓ°¢f"‚ÒS° ¢Fö2ç&V7BƒSÂF&ÆUF÷ÂC“RÂ#R’æf–ÆÂ‚r3#Sc6V"r“°¢†VFW'2æf÷$V6‚†gVæ7F–öâ††VFW"Â’’°¢Fö2æföçE6—¦Rƒ’æf–ÆÄ6öÆ÷"‚wv†—FRr’çFW‡B††VFW"Â‚²RÂF&ÆUF÷²rÂ²v–GFƒ¢6öÅv–GF‡5¶•ÒÒ“°¢‚³Ò6öÅv–GF‡5¶•Ó°¢Ò“° ¢f"’ÒF&ÆUF÷²#S°¢f"6VÆbÒF†—3°¢FFçf66–æF–öç2æf÷$V6‚†gVæ7F–öâ‡f2Â–æFW‚’°¢–b‡’âs’°¢Fö2æFEvR‚“°¢’ÒS°¢Ð¢f"&t6öÆ÷"Ò–æFW‚R"ÓÓÒòr6c–ff"r¢r6fffffbs°¢Fö2ç&V7BƒSÂ’ÂC“RÂ#’æf–ÆÂ†&t6öÆ÷"“° ¢‚ÒS°¢f"&÷tFFÒ°¢f2çf66–åöæöÒÇÂrrÀ¢6VÆbåöf÷&ÖDFFR‡f2æFFUö†WW&R’ÇÂrrÀ¢f2æçVÖW&õöÆ÷BÇÂrÒrÀ¢‡f2æ–æf—&Ö–W%÷&VæöÒÇÂrr’²rr²‡f2æ–æf—&Ö–W%öæöÒÇÂrr’À¢Ó°¢&÷tFFæf÷$V6‚†gVæ7F–öâ†6VÆÂÂ’’°¢Fö2æföçE6—¦Rƒ’’æf–ÆÄ6öÆ÷"‚r33sCSr’çFW‡B†6VÆÂÂ‚²RÂ’²RÂ²v–GFƒ¢6öÅv–GF‡5¶•ÒÒ“°¢‚³Ò6öÅv–GF‡5¶•Ó°¢Ò“°¢’³Ò#°¢Ò“°¢Fö2ç’Ò’²°¢ÒVÇ6R°¢Fö2æföçE6—¦Rƒ’æf–ÆÄ6öÆ÷"‚r3f#s#ƒr’çFW‡B‚tV7VæRf66–æF–öâVç&Vv—7G&VRâr“°¢Ð ¢Fö2æÖ÷fTF÷vâƒ“° ¢òòFVÆ–VBf66–æW0¢–b†FFç&WF&G2bbFFç&WF&G2æÆVæwF‚â’°¢–b†Fö2ç’âc’Fö2æFEvR‚“°¢Fö2æföçE6—¦Rƒ"’æf–ÆÄ6öÆ÷"‚r6F3#c#br’çFW‡B‚uf66–ç2Vâ&WF&BrÂ²VæFW&Æ–æS¢G'VRÒ“°¢Fö2æÖ÷fTF÷vâƒãR“°¢f"6VÆc"ÒF†—3°¢FFç&WF&G2æf÷$V6‚†gVæ7F–öâ‡&WF&B’°¢Fö2æföçE6—¦Rƒ’æf–ÆÄ6öÆ÷"‚r33sCSr“°¢Fö2çFW‡B‚rÒr²&WF&Bçf66–åöæöÒ²r†vR6–&ÆS¢r²&WF&BævUö6–&ÆU÷6VÖ–æW2²r6VÖ–æW2’r“°¢Ò“°¢Fö2æÖ÷fTF÷vâƒ“°¢Ð ¢òòfö÷FW ¢Fö2æföçE6—¦Rƒ‚’æf–ÆÄ6öÆ÷"‚r3–66br“°¢Fö2çFW‡B‚tFö7VÖVçBvVæW&RÆRr²F†—2åöf÷&ÖDFFR†æWrFFR‚’’²r"f66–æ”¶–G2rÂ²Æ–vã¢v6VçFW"rÒ“° ¢Fö2æVæB‚“°¢Ò“°¢Ð ¢7–æ2vVæW&FU&Gd6öæf—&ÖF–öâ†FF’°¢&WGW&âæWr&öÖ—6R‚‡&W6öÇfRÂ&V¦V7B’Óâ°¢6öç7BFö2ÒæWrDdocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'Confirmation de rendezvous-vous - VacciniKids',
          Author: 'VacciniKids',
          Subject: 'Confirmation RDV - ' + data.bebe_prenom + ' ' + data.bebe_nom,
        },
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).fillColor('#2563eb').text('VacciniKids', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(14).fillColor('#374151').text('Confirmation de rendezvous-vous', { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#2563eb').lineWidth(2).stroke();
      doc.moveDown(1);

      // Appointment details
      doc.fontSize(12).fillColor('#1f2937').text('Details du rendezvous', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#374151');
      doc.text('Enfant : ' + data.bebe_prenom + ' ' + data.bebe_nom);
      doc.text('Vaccin : ' + data.vaccin_nom);
      doc.text('Date : ' + this._formatDate(data.date_session));
      doc.text('Heure : ' + (data.heure_debut || '') + ' - ' + (data.heure_fin || ''));
      doc.text('Centre : ' + (data.centre_nom || ''));
      doc.text('Adresse : ' + (data.centre_adresse || ''));
      doc.moveDown(1);

      // Instructions
      doc.fontSize(12).fillColor('#1f2937').text('Instructions', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#374151');
      doc.text("- Veuillez vous presenter 10 minutes avant l'heire prevue");
      doc.text("- Apportez le carnet de vaccination de l'enfant");
      doc.text("- en cas d'empechement, annulez via l'application");
      doc.moveDown(2);

      // Footer
      doc.fontSize(8).fillColor('#9ca3af');
      doc.text('Document genere le ' + this._formatDate(new Date()) + ' par VacciniKids', { align: 'center' });

      doc.end();
    });
  }
}

module.exports = new PdfService();
